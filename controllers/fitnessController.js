const express = require('express');
const router = express.Router();
const standards = require('../utils/fitnessStandards'); // 引入数据

// 核心算法：根据用户成绩和体重，查找对应的等级
const assessLevel = (gender, exercise, userWeight, userOneRepMax) => {
  // 1. 获取该性别和动作的标准表
  const exerciseStandards = standards[gender]?.[exercise];
  if (!exerciseStandards) return null;

  // 2. 找到最接近用户体重的标准行
  // 简单策略：找小于等于用户体重的最大值，或者直接找最接近的
  // 这里为了演示，我们找最接近的体重档位
  let closestStandard = exerciseStandards[0];
  let minDiff = Math.abs(exerciseStandards[0].weight - userWeight);

  for (let row of exerciseStandards) {
    const diff = Math.abs(row.weight - userWeight);
    if (diff < minDiff) {
      minDiff = diff;
      closestStandard = row;
    }
  }

  // 3. 对比成绩，判断等级
  const { beginner, novice, intermediate, advanced, elite } = closestStandard;
  
  if (userOneRepMax >= elite) return { level: 'elite', standard: closestStandard };
  if (userOneRepMax >= advanced) return { level: 'advanced', standard: closestStandard };
  if (userOneRepMax >= intermediate) return { level: 'intermediate', standard: closestStandard };
  if (userOneRepMax >= novice) return { level: 'novice', standard: closestStandard };
  return { level: 'beginner', standard: closestStandard };
};

// 接口：获取所有标准数据（供前端展示或缓存）
router.get('/standards', (req, res) => {
  res.json({ success: true, data: standards });
});

// 接口：评估力量水平（核心功能）
router.post('/assess', (req, res) => {
  const { gender, bodyWeight, benchPress, squat, deadlift } = req.body;

  // 1. 分别评估三项
  const benchResult = assessLevel(gender, 'bench_press', bodyWeight, benchPress);
  const squatResult = assessLevel(gender, 'squat', bodyWeight, squat);
  const deadliftResult = assessLevel(gender, 'deadlift', bodyWeight, deadlift);

  // 2. 组装返回数据
  res.json({
    success: true,
    message: "力量水平评估成功",
    data: {
      assessments: [
        {
          exercise: "bench_press",
          oneRepMax: benchPress,
          level: benchResult.level,
          standard: benchResult.standard
        },
        {
          exercise: "squat",
          oneRepMax: squat,
          level: squatResult.level,
          standard: squatResult.standard
        },
        {
          exercise: "deadlift",
          oneRepMax: deadlift,
          level: deadliftResult.level,
          standard: deadliftResult.standard
        }
      ]
    }
  });
});

module.exports = router;