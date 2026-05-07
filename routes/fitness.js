const express = require('express');
const router = express.Router();

// ==========================================
// 1. 直接在文件中定义数据
// ==========================================
const STANDARDS = {
  male: {
    bench_press: [
      // 完整的男性卧推标准 (体重范围 59kg - 125kg+)
      { weight: 59, beginner: 34, novice: 49, intermediate: 68, advanced: 90, elite: 114 },
      { weight: 66, beginner: 40, novice: 57, intermediate: 79, advanced: 104, elite: 132 },
      { weight: 74, beginner: 46, novice: 65, intermediate: 90, advanced: 119, elite: 151 },
      { weight: 83, beginner: 52, novice: 73, intermediate: 101, advanced: 133, elite: 169 },
      { weight: 93, beginner: 59, novice: 82, intermediate: 114, advanced: 150, elite: 190 },
      { weight: 105, beginner: 66, novice: 91, intermediate: 126, advanced: 166, elite: 210 },
      { weight: 118, beginner: 72, novice: 99, intermediate: 138, advanced: 182, elite: 230 },
      { weight: 125, beginner: 76, novice: 104, intermediate: 144, advanced: 190, elite: 240 },
      { weight: 130, beginner: 78, novice: 107, intermediate: 148, advanced: 195, elite: 247 },
      { weight: 140, beginner: 82, novice: 113, intermediate: 156, advanced: 206, elite: 261 },
      { weight: 150, beginner: 86, novice: 118, intermediate: 163, advanced: 215, elite: 272 }
    ],
    squat: [
      // 完整的男性深蹲标准
      { weight: 59, beginner: 51, novice: 73, intermediate: 101, advanced: 133, elite: 168 },
      { weight: 66, beginner: 58, novice: 83, intermediate: 115, advanced: 151, elite: 191 },
      { weight: 74, beginner: 65, novice: 92, intermediate: 128, advanced: 168, elite: 213 },
      { weight: 83, beginner: 73, novice: 103, intermediate: 143, advanced: 188, elite: 238 },
      { weight: 93, beginner: 82, novice: 115, intermediate: 159, advanced: 209, elite: 265 },
      { weight: 105, beginner: 91, novice: 128, intermediate: 177, advanced: 233, elite: 295 },
      { weight: 118, beginner: 100, novice: 141, intermediate: 195, advanced: 257, elite: 325 },
      { weight: 125, beginner: 105, novice: 148, intermediate: 205, advanced: 270, elite: 342 },
      { weight: 130, beginner: 108, novice: 152, intermediate: 210, advanced: 277, elite: 351 },
      { weight: 140, beginner: 114, novice: 160, intermediate: 221, advanced: 291, elite: 369 },
      { weight: 150, beginner: 120, novice: 168, intermediate: 232, advanced: 306, elite: 387 }
    ],
    deadlift: [
      // 完整的男性硬拉标准
      { weight: 59, beginner: 62, novice: 85, intermediate: 117, advanced: 154, elite: 195 },
      { weight: 66, beginner: 70, novice: 96, intermediate: 133, advanced: 175, elite: 221 },
      { weight: 74, beginner: 79, novice: 108, intermediate: 150, advanced: 197, elite: 250 },
      { weight: 83, beginner: 88, novice: 121, intermediate: 168, advanced: 221, elite: 280 },
      { weight: 93, beginner: 98, novice: 135, intermediate: 187, advanced: 246, elite: 312 },
      { weight: 105, beginner: 110, novice: 151, intermediate: 209, advanced: 275, elite: 349 },
      { weight: 118, beginner: 122, novice: 168, intermediate: 233, advanced: 307, elite: 389 },
      { weight: 125, beginner: 129, novice: 177, intermediate: 245, advanced: 323, elite: 409 },
      { weight: 130, beginner: 133, novice: 183, intermediate: 253, advanced: 333, elite: 422 },
      { weight: 140, beginner: 140, novice: 193, intermediate: 267, advanced: 352, elite: 446 },
      { weight: 150, beginner: 148, novice: 203, intermediate: 281, advanced: 370, elite: 469 }
    ]
  },
  female: {
  bench_press: [
    // 完整的女性卧推标准 (体重范围 47kg - 100kg+)
    { weight: 47, beginner: 16, novice: 23, intermediate: 32, advanced: 42, elite: 53 },
    { weight: 52, beginner: 19, novice: 27, intermediate: 37, advanced: 49, elite: 62 },
    { weight: 57, beginner: 22, novice: 31, intermediate: 43, advanced: 57, elite: 72 },
    { weight: 63, beginner: 25, novice: 35, intermediate: 49, advanced: 65, elite: 82 },
    { weight: 69, beginner: 28, novice: 39, intermediate: 54, advanced: 72, elite: 91 },
    { weight: 77, beginner: 31, novice: 43, intermediate: 60, advanced: 79, elite: 100 },
    { weight: 86, beginner: 34, novice: 47, intermediate: 66, advanced: 87, elite: 110 },
    { weight: 97, beginner: 37, novice: 51, intermediate: 71, advanced: 94, elite: 119 },
    { weight: 100, beginner: 38, novice: 52, intermediate: 73, advanced: 96, elite: 122 }
  ],
  squat: [
    // 完整的女性深蹲标准
    { weight: 47, beginner: 31, novice: 44, intermediate: 61, advanced: 80, elite: 101 },
    { weight: 52, beginner: 35, novice: 49, intermediate: 68, advanced: 90, elite: 114 },
    { weight: 57, beginner: 39, novice: 55, intermediate: 76, advanced: 100, elite: 127 },
    { weight: 63, beginner: 43, novice: 61, intermediate: 84, advanced: 111, elite: 140 },
    { weight: 69, beginner: 48, novice: 67, intermediate: 93, advanced: 122, elite: 155 },
    { weight: 77, beginner: 53, novice: 74, intermediate: 103, advanced: 135, elite: 171 },
    { weight: 86, beginner: 59, novice: 82, intermediate: 114, advanced: 150, elite: 190 },
    { weight: 97, beginner: 65, novice: 91, intermediate: 126, advanced: 166, elite: 210 },
    { weight: 100, beginner: 67, novice: 93, intermediate: 129, advanced: 170, elite: 215 }
  ],
  deadlift: [
    // 完整的女性硬拉标准
    { weight: 47, beginner: 38, novice: 52, intermediate: 72, advanced: 95, elite: 120 },
    { weight: 52, beginner: 42, novice: 58, intermediate: 80, advanced: 105, elite: 133 },
    { weight: 57, beginner: 47, novice: 65, intermediate: 90, advanced: 118, elite: 150 },
    { weight: 63, beginner: 52, novice: 72, intermediate: 100, advanced: 132, elite: 167 },
    { weight: 69, beginner: 57, novice: 79, intermediate: 110, advanced: 145, elite: 183 },
    { weight: 77, beginner: 63, novice: 87, intermediate: 121, advanced: 160, elite: 202 },
    { weight: 86, beginner: 70, novice: 97, intermediate: 135, advanced: 178, elite: 225 },
    { weight: 97, beginner: 77, novice: 107, intermediate: 148, advanced: 195, elite: 247 },
    { weight: 100, beginner: 79, novice: 110, intermediate: 152, advanced: 201, elite: 255 }
  ]
}
};

// ==========================================
// 2. 输入清洗和验证工具函数
// ==========================================

/**
 * 清洗数字输入 - 处理 "75kg", "75 kg", "75.5" 等情况
 */
function cleanNumber(input) {
  if (typeof input === 'number') {
    return isNaN(input) ? null : input;
  }
  
  if (typeof input === 'string') {
    const cleaned = input.toLowerCase()
      .replace(/kg|lbs|lb|公斤|斤/g, '')
      .replace(/\s/g, '')
      .trim();
    
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
  
  return null;
}

/**
 * 验证并清洗请求数据 - 支持部分字段
 */
function validateAndCleanData(data) {
  const errors = [];
  const cleaned = {};
  
  // 验证性别（必需）
  const gender = data.gender ? data.gender.toLowerCase().trim() : '';
  if (gender === 'male' || gender === 'female') {
    cleaned.gender = gender;
  } else {
    errors.push('性别必须为 male 或 female');
  }
  
  // 验证体重（必需）
  const weight = cleanNumber(data.bodyWeight);
  if (weight !== null && weight > 0 && weight < 300) {
    cleaned.bodyWeight = weight;
  } else {
    errors.push('体重必须是 0-300 之间的有效数字');
  }
  
  // 验证三大项（可选，至少提供一项）
  const exercises = {
    benchPress1RM: { value: cleanNumber(data.benchPress1RM), name: '卧推', max: 500 },
    squat1RM: { value: cleanNumber(data.squat1RM), name: '深蹲', max: 600 },
    deadlift1RM: { value: cleanNumber(data.deadlift1RM), name: '硬拉', max: 700 }
  };
  
  let hasValidExercise = false;
  
  for (const [key, exercise] of Object.entries(exercises)) {
    if (exercise.value !== null && exercise.value >= 0 && exercise.value <= exercise.max) {
      cleaned[key] = exercise.value;
      hasValidExercise = true;
    } else if (data[key] !== undefined && data[key] !== '') {
      // 如果用户提供了该字段但值无效
      errors.push(`${exercise.name}必须是 0-${exercise.max} 之间的有效数字`);
    }
  }
  
  // 检查是否至少有一项有效数据
  if (!hasValidExercise) {
    errors.push('至少需要提供卧推、深蹲或硬拉中的一项有效数据');
  }
  
  // 可选的userId
  if (data.userId) {
    cleaned.userId = String(data.userId).trim();
  }
  
  return { cleaned, errors };
}

// ==========================================
// 3. 辅助函数：查找标准
// ==========================================
function findStandard(gender, exercise, bodyWeight) {
  if (!STANDARDS[gender] || !STANDARDS[gender][exercise]) {
    return null;
  }

  const exerciseData = STANDARDS[gender][exercise];
  if (exerciseData.length === 0) return null;

  const targetWeight = Number(bodyWeight);

  // 优先精确匹配
  const exactMatch = exerciseData.find(d => Number(d.weight) === targetWeight);
  if (exactMatch) return exactMatch;

  // 找最接近的
  let closest = exerciseData[0];
  let minDiff = Math.abs(Number(exerciseData[0].weight) - targetWeight);

  for (let d of exerciseData) {
    const diff = Math.abs(Number(d.weight) - targetWeight);
    if (diff < minDiff) {
      minDiff = diff;
      closest = d;
    }
  }

  return closest;
}

// ==========================================
// 4. 辅助函数：判断等级
// ==========================================
function getLevel(value, std) {
  if (!std) return 'beginner';

  if (value >= std.elite) return 'elite';
  if (value >= std.advanced) return 'advanced';
  if (value >= std.intermediate) return 'intermediate';
  if (value >= std.novice) return 'novice';
  return 'beginner';
}

// ==========================================
// 5. GET 路由 - 显示使用说明
// ==========================================
router.get('/assess', (req, res) => {
  res.json({
    success: false,
    message: '这个API端点只接受POST请求',
    documentation: {
      endpoint: '/api/fitness/assess',
      method: 'POST',
      description: '评估用户的力量训练水平（支持单项或多项评估）',
      requestBody: {
        required: ['gender', 'bodyWeight'],
        optional: ['userId', 'benchPress1RM', 'squat1RM', 'deadlift1RM'],
        note: '至少需要提供卧推、深蹲或硬拉中的一项数据',
        examples: [
          {
            description: "三项完整评估",
            data: {
              userId: "test_user_001",
              gender: "male",
              bodyWeight: 75,
              benchPress1RM: 120,
              squat1RM: 110,
              deadlift1RM: 130
            }
          },
          {
            description: "仅评估卧推",
            data: {
              gender: "male",
              bodyWeight: "75kg",
              benchPress1RM: "100 kg"
            }
          },
          {
            description: "评估深蹲和硬拉",
            data: {
              gender: "female",
              bodyWeight: 60,
              squat1RM: 80,
              deadlift1RM: "100公斤"
            }
          }
        ]
      }
    }
  });
});

// ==========================================
// 6. POST 路由 - 实际的评估逻辑
// ==========================================
router.post('/assess', (req, res) => {
  try {
    console.log('🚀 收到评估请求:');
    console.log('原始请求体:', JSON.stringify(req.body, null, 2));
    
    // 1. 验证和清洗数据
    const { cleaned, errors } = validateAndCleanData(req.body);
    
    // 2. 如果有错误，返回详细的错误信息
    if (errors.length > 0) {
      console.log('❌ 验证失败:', errors);
      return res.status(400).json({
        success: false,
        message: '输入数据验证失败',
        errors: errors,
        hint: '请检查输入的数据格式是否正确'
      });
    }
    
    const { gender, bodyWeight, userId } = cleaned;
    
    // 3. 定义要评估的项目
    const exerciseConfigs = [
      { key: 'benchPress1RM', name: '卧推', exercise: 'bench_press' },
      { key: 'squat1RM', name: '深蹲', exercise: 'squat' },
      { key: 'deadlift1RM', name: '硬拉', exercise: 'deadlift' }
    ];
    
    const assessments = [];
    const scoreMap = { beginner: 1, novice: 2, intermediate: 3, advanced: 4, elite: 5 };
    const levelMap = { 
      beginner: '初学者', 
      novice: '入门', 
      intermediate: '中级', 
      advanced: '高级', 
      elite: '精英' 
    };
    
    let totalScore = 0;
    let assessmentCount = 0;

    // 4. 动态评估用户提供的项目
    for (const config of exerciseConfigs) {
      if (cleaned[config.key] !== undefined) {
        const value = cleaned[config.key];
        const std = findStandard(gender, config.exercise, bodyWeight);
        const level = getLevel(value, std);
        const levelCode = level;
        
        assessments.push({
          exercise: config.exercise,
          exerciseName: config.name,
          oneRepMax: value,
          level: levelMap[level],
          levelCode: levelCode,
          standard: std
        });
        
        totalScore += scoreMap[level];
        assessmentCount++;
        
        console.log(`✅ ${config.name}评估完成: ${value}kg -> ${levelMap[level]}`);
      }
    }

    // 5. 计算总体等级
    const avgScore = totalScore / assessmentCount;
    
    let overallLevel = 'beginner';
    if (avgScore >= 4.5) overallLevel = 'elite';
    else if (avgScore >= 3.5) overallLevel = 'advanced';
    else if (avgScore >= 2.5) overallLevel = 'intermediate';
    else if (avgScore >= 1.5) overallLevel = 'novice';

    // 6. 返回结果
    const result = {
      success: true,
      message: `成功评估 ${assessmentCount} 个项目`,
      data: {
        assessments: assessments,
        overallLevel: levelMap[overallLevel],
        overallLevelCode: overallLevel,
        overallScore: avgScore.toFixed(1),
        assessmentCount: assessmentCount,
        evaluatedExercises: assessments.map(a => a.exerciseName)
      }
    };

    console.log('✅ 评估完成，返回结果:');
    console.log(JSON.stringify(result, null, 2));
    
    res.json(result);

  } catch (error) {
    console.error('🔥 服务器错误:', error);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: '服务器错误: ' + error.message 
    });
  }
});

module.exports = router;