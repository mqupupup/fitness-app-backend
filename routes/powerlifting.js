// routes/powerlifting.js
const express = require('express');
const router = express.Router();

// IPF GL 系数计算（完整准确的公式）
function calculateIPFGL(bodyWeight, gender) {
  if (gender === 'male') {
    return 610.32847 / Math.pow(1 + Math.pow(bodyWeight / 168.598, 18.1554), 0.54307);
  } else {
    return 461.47468 / Math.pow(1 + Math.pow(bodyWeight / 123.737, 14.7272), 0.52716);
  }
}

// DOTS 系数计算
function calculateDOTS(bodyWeight, gender) {
  if (gender === 'male') {
    const a = -307.3634;
    const b = 24.0851;
    const c = -0.191372;
    const d = 0.000521;
    return 500 / (a + b * bodyWeight + c * Math.pow(bodyWeight, 2) + d * Math.pow(bodyWeight, 3));
  } else {
    const a = -197.1536;
    const b = 16.0455;
    const c = -0.1267;
    const d = 0.000356;
    return 500 / (a + b * bodyWeight + c * Math.pow(bodyWeight, 2) + d * Math.pow(bodyWeight, 3));
  }
}

// Wilks 系数计算
function calculateWilks(bodyWeight, gender) {
  if (gender === 'male') {
    const a = -216.0475144;
    const b = 16.2606339;
    const c = -0.002388645;
    const d = -0.00113732;
    const e = 7.01863e-6;
    const f = -1.291e-8;
    return 500 / (a + b * bodyWeight + c * Math.pow(bodyWeight, 2) + d * Math.pow(bodyWeight, 3) + e * Math.pow(bodyWeight, 4) + f * Math.pow(bodyWeight, 5));
  } else {
    const a = 594.31747775582;
    const b = -27.23842536447;
    const c = 0.82112226871;
    const d = -0.00930733913;
    const e = 4.731582e-5;
    const f = -9.054e-8;
    return 500 / (a + b * bodyWeight + c * Math.pow(bodyWeight, 2) + d * Math.pow(bodyWeight, 3) + e * Math.pow(bodyWeight, 4) + f * Math.pow(bodyWeight, 5));
  }
}

// 等级判定
function getLevelFromScore(score, gender) {
  if (gender === 'male') {
    if (score >= 500) return 'elite';
    if (score >= 400) return 'advanced';
    if (score >= 300) return 'intermediate';
    if (score >= 200) return 'novice';
    return 'beginner';
  } else {
    if (score >= 400) return 'elite';
    if (score >= 320) return 'advanced';
    if (score >= 240) return 'intermediate';
    if (score >= 160) return 'novice';
    return 'beginner';
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

    // 三项成绩校验（力量举评估要求三项都必须输入）
    const lifts = [
      { key: 'squat', label: '深蹲', value: squat },
      { key: 'bench', label: '卧推', value: bench },
      { key: 'deadlift', label: '硬拉', value: deadlift },
    ];

    for (const lift of lifts) {
      if (lift.value == null) {
        return res.status(400).json({ success: false, message: `${lift.label}为必填项` });
      }
      if (typeof lift.value !== 'number' || isNaN(lift.value)) {
        return res.status(400).json({ success: false, message: `${lift.label}必须为有效数字` });
      }
      if (lift.value <= 0 || lift.value > 1000) {
        return res.status(400).json({ success: false, message: `${lift.label}应在 0-1000kg 范围内且大于0` });
      }
    }

    // 系数类型校验
    if (!coefficientType || !['ipf_gl', 'dots', 'wilks'].includes(coefficientType)) {
      console.log('❌ [VALIDATION_ERROR] 系数类型无效:', coefficientType);
      return res.status(400).json({ success: false, message: '系数类型无效，应为 ipf_gl、dots 或 wilks' });
    }

    // 计算总重量
    const total = squat + bench + deadlift;
    console.log('📊 计算总重量:', total);

    // 根据选择的系数类型计算
    let coefficientValue;
    switch (coefficientType) {
      case 'ipf_gl':
        coefficientValue = calculateIPFGL(bodyWeight, gender);
        console.log('🧮 使用 IPF GL 系数计算，结果:', coefficientValue);
        break;
      case 'dots':
        coefficientValue = calculateDOTS(bodyWeight, gender);
        console.log('🧮 使用 DOTS 系数计算，结果:', coefficientValue);
        break;
      case 'wilks':
        coefficientValue = calculateWilks(bodyWeight, gender);
        console.log('🧮 使用 Wilks 系数计算，结果:', coefficientValue);
        break;
      default:
        console.log('❌ [VALIDATION_ERROR] 系数类型无效:', coefficientType);
        return res.status(400).json({ success: false, error: 'Invalid coefficient type' });
    }

    // 计算标准化分数
    const normalizedScore = total * coefficientValue;
    console.log('📈 标准化分数计算结果:', normalizedScore);

    // 确定等级
    const level = getLevelFromScore(normalizedScore, gender);
    console.log('🏆 确定等级:', level);

    const result = {
      assessments: [{
        total,
        bodyWeight,
        coefficient: coefficientType,
        coefficientValue,
        normalizedScore,
        level
      }],
      overallLevel: level
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