// routes/powerlifting.js
const express = require('express');
const router = express.Router();

// IPF GL 分数计算（官方公式，2020年起IPF官方评分系统）
// 公式：IPF GL Points = Total × (100 / (A - B × e^(-C × BW)))
// 分数范围：60-125，100≈世界纪录水平
// isBenchOnly: 是否为卧推单项（使用Classic Bench Press参数）
function calculateIPFGLPoints(total, bodyWeight, gender, isBenchOnly = false) {
  let A, B, C;
  if (gender === 'male') {
    if (isBenchOnly) {
      A = 320.98041; B = 281.40258; C = 0.01008;  // 男性卧推单项
    } else {
      A = 1199.72839; B = 1025.18162; C = 0.00921;  // 男性三项总和
    }
  } else {
    if (isBenchOnly) {
      A = 142.40398; B = 442.52671; C = 0.04724;  // 女性卧推单项
    } else {
      A = 610.32796; B = 1045.59282; C = 0.03048;  // 女性三项总和
    }
  }
  const denominator = A - B * Math.exp(-C * bodyWeight);
  return total * (100 / denominator);
}

// DOTS 分数计算（官方公式，Reactive Training Systems 2019）
// 公式：DOTS = Total × (500 / (a + b×BW + c×BW² + d×BW³ + e×BW⁴))
// 分数范围：300-500+
function calculateDOTSPoints(total, bodyWeight, gender) {
  let a, b, c, d, e;
  if (gender === 'male') {
    a = -307.75076; b = 24.0900756; c = -0.1918759221; d = 0.0007391293; e = -0.000001093;
  } else {
    a = -57.96288; b = 13.6175032; c = -0.1126655495; d = 0.0005158568; e = -0.0000010706;
  }
  const denominator = a + b * bodyWeight + c * Math.pow(bodyWeight, 2)
    + d * Math.pow(bodyWeight, 3) + e * Math.pow(bodyWeight, 4);
  return total * (500 / denominator);
}

// Wilks 分数计算（旧版，已被IPF GL取代，但仍广泛使用）
// 公式：Wilks = Total × (500 / (a + b×BW + ... + f×BW⁵))
// 分数范围：300-500+
function calculateWilksPoints(total, bodyWeight, gender) {
  let a, b, c, d, e, f;
  if (gender === 'male') {
    a = -216.0475144; b = 16.2606339; c = -0.002388645;
    d = -0.00113732; e = 7.01863e-6; f = -1.291e-8;
  } else {
    a = 594.31747775582; b = -27.23842536447; c = 0.82112226871;
    d = -0.00930733913; e = 4.731582e-5; f = -9.054e-8;
  }
  const denominator = a + b * bodyWeight + c * Math.pow(bodyWeight, 2)
    + d * Math.pow(bodyWeight, 3) + e * Math.pow(bodyWeight, 4) + f * Math.pow(bodyWeight, 5);
  return total * (500 / denominator);
}

// 等级判定（根据系数类型使用不同阈值，7个等级）
function getLevelFromScore(score, coefficientType) {
  if (coefficientType === 'ipf_gl') {
    // IPF GL：60-125分，100≈世界纪录
    if (score >= 100) return 'world_class';   // 世界级
    if (score >= 90) return 'master';          // 大师级
    if (score >= 80) return 'elite';           // 精英级
    if (score >= 70) return 'advanced';        // 高级
    if (score >= 60) return 'intermediate';    // 中级
    if (score >= 40) return 'novice';          // 初学者
    return 'untrained';                          // 未训练
  } else {
    // DOTS / Wilks：300-500+分
    if (score >= 500) return 'world_class';    // 世界级
    if (score >= 450) return 'master';         // 大师级
    if (score >= 400) return 'elite';          // 精英级
    if (score >= 350) return 'advanced';       // 高级
    if (score >= 300) return 'intermediate';   // 中级
    if (score >= 200) return 'novice';         // 初学者
    return 'untrained';                          // 未训练
  }
}

// 获取下一个等级的分数阈值
function getNextLevelThreshold(currentLevel, coefficientType) {
  const levels = ['untrained', 'novice', 'intermediate', 'advanced', 'elite', 'master', 'world_class'];
  const currentIndex = levels.indexOf(currentLevel);
  if (currentIndex === -1 || currentIndex >= levels.length - 1) {
    return null; // 已经是最高等级
  }
  const nextLevel = levels[currentIndex + 1];
  const thresholds = getLevelThresholds(coefficientType);
  return { level: nextLevel, score: thresholds[nextLevel] };
}

// 获取各等级的分数阈值
function getLevelThresholds(coefficientType) {
  if (coefficientType === 'ipf_gl') {
    return {
      untrained: 0,
      novice: 40,
      intermediate: 60,
      advanced: 70,
      elite: 80,
      master: 90,
      world_class: 100
    };
  } else {
    return {
      untrained: 0,
      novice: 200,
      intermediate: 300,
      advanced: 350,
      elite: 400,
      master: 450,
      world_class: 500
    };
  }
}

router.post('/evaluate', async (req, res) => {
  // 记录请求开始时间
  const startTime = Date.now();
  
  // 记录请求基本信息
  console.log('🔍 [POWERLIFTING_EVALUATE] API 调用开始');
  console.log('📋 请求参数:', JSON.stringify(req.body, null, 2));
  
  try {
    const { gender, bodyWeight, squat, bench, deadlift, coefficientType } = req.body;

    // 性别校验
    if (!gender || !['male', 'female'].includes(gender)) {
      console.log('❌ [VALIDATION_ERROR] 性别参数无效:', gender);
      return res.status(400).json({ success: false, message: '性别参数无效，应为 male 或 female' });
    }

    // 体重校验
    if (bodyWeight == null) {
      return res.status(400).json({ success: false, message: '体重为必填项' });
    }
    if (typeof bodyWeight !== 'number' || isNaN(bodyWeight)) {
      return res.status(400).json({ success: false, message: '体重必须为有效数字' });
    }
    if (bodyWeight < 10 || bodyWeight > 300) {
      return res.status(400).json({ success: false, message: '体重应在 10-300kg 范围内' });
    }

    // 成绩校验（允许输入1-3项，至少输入一项）
    const lifts = [
      { key: 'squat', label: '深蹲', value: squat },
      { key: 'bench', label: '卧推', value: bench },
      { key: 'deadlift', label: '硬拉', value: deadlift },
    ];

    const validLifts = [];
    for (const lift of lifts) {
      // 跳过未输入的项（null/undefined/空字符串/0）
      if (lift.value == null || lift.value === '' || lift.value === 0) {
        continue;
      }
      if (typeof lift.value !== 'number' || isNaN(lift.value)) {
        return res.status(400).json({ success: false, message: `${lift.label}必须为有效数字` });
      }
      if (lift.value < 0 || lift.value > 1000) {
        return res.status(400).json({ success: false, message: `${lift.label}应在 0-1000kg 范围内` });
      }
      validLifts.push(lift);
    }

    if (validLifts.length === 0) {
      return res.status(400).json({ success: false, message: '至少需要输入一项成绩（深蹲/卧推/硬拉）' });
    }

    // 系数类型校验
    if (!coefficientType || !['ipf_gl', 'dots', 'wilks'].includes(coefficientType)) {
      return res.status(400).json({ success: false, message: '系数类型无效，应为 ipf_gl、dots 或 wilks' });
    }

    // 计算已输入项的总重量
    const total = validLifts.reduce((sum, lift) => sum + lift.value, 0);
    const liftCount = validLifts.length;
    const liftNames = validLifts.map(l => l.label).join('+');
    console.log(`📊 已输入 ${liftCount} 项: ${liftNames}, 总重量: ${total}`);

    // 判断是否为纯卧推单项（仅用于卧推单项评估，主结果始终用三项总和公式）
    const isBenchOnlyInput = liftCount === 1 && validLifts[0].key === 'bench' && coefficientType === 'ipf_gl';

    // 公式类型说明（主结果始终用三项总和公式）
    let formulaType;
    if (liftCount < 3) {
      formulaType = '三项总和公式（已输入项不足3项，分数仅供参考）';
    } else {
      formulaType = '三项总和公式';
    }

    // 计算总分函数（主结果始终用三项总和公式，isBenchOnly=false）
    function calcScore(weight) {
      switch (coefficientType) {
        case 'ipf_gl': return calculateIPFGLPoints(weight, bodyWeight, gender, false);
        case 'dots': return calculateDOTSPoints(weight, bodyWeight, gender);
        case 'wilks': return calculateWilksPoints(weight, bodyWeight, gender);
        default: return 0;
      }
    }

    // 计算总和分数
    const totalScore = calcScore(total);
    const totalLevel = getLevelFromScore(totalScore, coefficientType);
    console.log('📈 总和分数:', totalScore.toFixed(2), '等级:', totalLevel, '公式:', formulaType);

    // 计算距离下一个等级的差距
    let nextLevelInfo = null;
    const nextThreshold = getNextLevelThreshold(totalLevel, coefficientType);
    if (nextThreshold) {
      const scoreDiff = nextThreshold.score - totalScore;
      // 反推需要增加的总重量（近似值：分数 = 总重量 × 系数，所以总重量 = 分数 / 系数）
      const currentCoefficient = totalScore / total;
      const neededTotal = nextThreshold.score / currentCoefficient;
      const weightDiff = neededTotal - total;
      nextLevelInfo = {
        nextLevel: nextThreshold.level,
        nextLevelScore: nextThreshold.score,
        scoreDiff: Number(scoreDiff.toFixed(2)),
        weightDiff: Number(weightDiff.toFixed(1)),
        note: '重量差值为估算值，实际因系数公式非线性略有偏差'
      };
      console.log('🎯 距离下一等级:', nextThreshold.level, '差', scoreDiff.toFixed(2), '分, 约需增加', weightDiff.toFixed(1), 'kg');
    }

    // 额外计算卧推单项分数（仅IPF GL有官方卧推单项参数，其他系数不展示）
    let benchOnlyResult = null;
    const benchLift = validLifts.find(l => l.key === 'bench');
    if (benchLift && coefficientType === 'ipf_gl') {
      // IPF GL 有卧推单项官方参数和等级标准
      const benchScore = calculateIPFGLPoints(benchLift.value, bodyWeight, gender, true);
      const benchLevel = getLevelFromScore(benchScore, coefficientType);
      // 计算卧推单项距离下一等级的差距
      let benchNextLevel = null;
      const benchNextThreshold = getNextLevelThreshold(benchLevel, coefficientType);
      if (benchNextThreshold) {
        const benchScoreDiff = benchNextThreshold.score - benchScore;
        const benchCoefficient = benchScore / benchLift.value;
        const benchNeededWeight = benchNextThreshold.score / benchCoefficient;
        const benchWeightDiff = benchNeededWeight - benchLift.value;
        benchNextLevel = {
          nextLevel: benchNextThreshold.level,
          nextLevelScore: benchNextThreshold.score,
          scoreDiff: Number(benchScoreDiff.toFixed(2)),
          weightDiff: Number(benchWeightDiff.toFixed(1)),
          note: '重量差值为估算值，实际因系数公式非线性略有偏差'
        };
      }
      benchOnlyResult = {
        weight: benchLift.value,
        score: Number(benchScore.toFixed(2)),
        level: benchLevel,
        formula: 'IPF GL 卧推单项公式（官方Classic Bench Press参数）',
        hasOfficialLevel: true,
        nextLevel: benchNextLevel
      };
      console.log('🏋️ 卧推单项分数:', benchScore.toFixed(2), '等级:', benchLevel);
    }

    const result = {
      assessments: [{
        total,
        bodyWeight,
        coefficient: coefficientType,
        normalizedScore: Number(totalScore.toFixed(2)),
        level: totalLevel,
        liftCount,
        liftNames,
        lifts: validLifts.map(l => ({ key: l.key, label: l.label, value: l.value })),
        formulaType,
        isBenchOnlyInput,
        benchOnly: benchOnlyResult,
        nextLevel: nextLevelInfo
      }],
      overallLevel: totalLevel
    };

    // 记录响应数据和处理时间
    const processingTime = Date.now() - startTime;
    console.log('✅ [POWERLIFTING_EVALUATE] API 调用成功');
    console.log('⏱️ 处理耗时:', processingTime, 'ms');
    console.log('📤 响应数据:', JSON.stringify(result, null, 2));

    res.json({ success: true, data: result });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('💥 [POWERLIFTING_EVALUATE] API 调用失败');
    console.error('⏱️ 处理耗时:', processingTime, 'ms');
    console.error('❌ 错误详情:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

module.exports = router;