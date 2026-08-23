const standards = require('../utils/fitnessStandards');

/**
 * 等级定义（与 strengthlevel.com 一致）
 * beginner: 前5% (强于5%的训练者)
 * novice: 前20%
 * intermediate: 前50%
 * advanced: 前80%
 * elite: 前95%
 */
const LEVEL_ORDER = ['beginner', 'novice', 'intermediate', 'advanced', 'elite'];
const LEVEL_LABELS = {
  beginner: '初级',
  novice: '入门',
  intermediate: '中级',
  advanced: '高级',
  elite: '精英',
};

/**
 * 从有序数组中找到最接近目标值的行
 */
const findClosestRow = (arr, key, target) => {
  if (!arr || arr.length === 0) return null;
  let closest = arr[0];
  let minDiff = Math.abs(arr[0][key] - target);
  for (const row of arr) {
    const diff = Math.abs(row[key] - target);
    if (diff < minDiff) {
      minDiff = diff;
      closest = row;
    }
  }
  return closest;
};

/**
 * 根据标准行和用户成绩判断等级
 */
const determineLevel = (standardRow, userOneRepMax) => {
  if (!standardRow) return 'beginner';
  const { beginner, novice, intermediate, advanced, elite } = standardRow;
  if (userOneRepMax >= elite) return 'elite';
  if (userOneRepMax >= advanced) return 'advanced';
  if (userOneRepMax >= intermediate) return 'intermediate';
  if (userOneRepMax >= novice) return 'novice';
  return 'beginner';
};

/**
 * 核心评估函数：根据性别、动作、体重、年龄、1RM成绩，评估等级
 */
const assessLevel = (gender, exercise, bodyWeight, age, userOneRepMax) => {
  const exerciseData = standards[gender]?.[exercise];
  if (!exerciseData) return null;

  // 按体重评定等级
  const weightStandard = findClosestRow(exerciseData.byBodyweight, 'bodyweight', bodyWeight);
  const weightLevel = determineLevel(weightStandard, userOneRepMax);

  // 按年龄评定等级（若输入了年龄）
  const ageStandard = age ? findClosestRow(exerciseData.byAge, 'age', age) : null;
  const ageLevel = ageStandard ? determineLevel(ageStandard, userOneRepMax) : null;

  // 综合等级：取两个维度中更严格的等级（等级索引更小的那个）
  let level = weightLevel;
  if (ageLevel && LEVEL_ORDER.indexOf(ageLevel) < LEVEL_ORDER.indexOf(weightLevel)) {
    level = ageLevel;
  }

  const levelIndex = LEVEL_ORDER.indexOf(level);
  const percentileMap = [5, 20, 50, 80, 95];
  const percentile = percentileMap[levelIndex] || 5;

  return {
    level,
    levelLabel: LEVEL_LABELS[level],
    percentile,
    weightStandard,
    weightLevel,
    weightLevelLabel: LEVEL_LABELS[weightLevel],
    ageStandard,
    ageLevel,
    ageLevelLabel: ageLevel ? LEVEL_LABELS[ageLevel] : null,
    average: exerciseData.average,
  };
};

// ============== API 处理函数 ==============

/**
 * GET /api/fitness/standards
 * 获取完整力量标准数据库
 */
const standardsHandler = (req, res) => {
  res.json({
    success: true,
    data: standards,
    meta: {
      source: 'strengthlevel.com',
      unit: 'kg',
      levels: LEVEL_ORDER.map(l => ({ key: l, label: LEVEL_LABELS[l] })),
      exercises: ['squat', 'bench_press', 'deadlift'],
      genders: ['male', 'female'],
    },
  });
};

/**
 * GET /api/fitness/standards/:gender/:exercise
 * 获取指定性别和动作的标准数据
 */
const standardByExerciseHandler = (req, res) => {
  const { gender, exercise } = req.params;
  const data = standards[gender]?.[exercise];
  if (!data) {
    return res.status(404).json({ success: false, message: '未找到对应标准数据' });
  }
  res.json({ success: true, data });
};

/**
 * POST /api/fitness/assess
 * 评估力量水平（核心功能）
 * Body: { gender, bodyWeight, age?, squat, benchPress, deadlift }
 * 支持单项或多项评估：输入几项就评估几项，三项都输入则额外返回三项总和
 */
const assessHandler = (req, res) => {
  const { gender, bodyWeight, age, squat, benchPress, deadlift } = req.body;

  if (!gender || !bodyWeight) {
    return res.status(400).json({ success: false, message: '性别和体重为必填项' });
  }
  if (!standards[gender]) {
    return res.status(400).json({ success: false, message: '性别参数无效，应为 male 或 female' });
  }

  const assessments = [];
  const exercises = [
    { key: 'squat', label: '深蹲', value: squat },
    { key: 'bench_press', label: '卧推', value: benchPress },
    { key: 'deadlift', label: '硬拉', value: deadlift },
  ];

  let totalLevelIndex = 0;
  let assessedCount = 0;

  for (const ex of exercises) {
    if (ex.value != null && ex.value > 0) {
      const result = assessLevel(gender, ex.key, bodyWeight, age, ex.value);
      if (result) {
        assessments.push({
          exercise: ex.key,
          exerciseLabel: ex.label,
          oneRepMax: ex.value,
          level: result.level,
          levelLabel: result.levelLabel,
          percentile: result.percentile,
          weightStandard: result.weightStandard,
          weightLevel: result.weightLevel,
          weightLevelLabel: result.weightLevelLabel,
          ageStandard: result.ageStandard,
          ageLevel: result.ageLevel,
          ageLevelLabel: result.ageLevelLabel,
          average: result.average,
        });
        totalLevelIndex += LEVEL_ORDER.indexOf(result.level);
        assessedCount++;
      }
    }
  }

  if (assessments.length === 0) {
    return res.status(400).json({ success: false, message: '至少需要提供一项成绩（深蹲/卧推/硬拉）' });
  }

  // 综合等级（已评估项的平均）
  const avgLevelIndex = Math.round(totalLevelIndex / assessedCount);
  const overallLevel = LEVEL_ORDER[avgLevelIndex];

  // 三项总和（仅当三项都提供时，用官方 powerlifting total 标准评定）
  let total = null;
  let totalLevel = null;
  let totalLevelLabel = null;
  let totalStandard = null;
  if (squat > 0 && benchPress > 0 && deadlift > 0) {
    total = squat + benchPress + deadlift;
    const totalStdData = standards[gender]?.powerlifting_total;
    if (totalStdData) {
      totalStandard = findClosestRow(totalStdData.byBodyweight, 'bodyweight', bodyWeight);
      totalLevel = determineLevel(totalStandard, total);
      totalLevelLabel = LEVEL_LABELS[totalLevel];
    }
  }

  res.json({
    success: true,
    message: `成功评估 ${assessedCount} 项`,
    data: {
      gender,
      bodyWeight,
      age: age || null,
      overallLevel,
      overallLevelLabel: LEVEL_LABELS[overallLevel],
      total,
      totalLevel,
      totalLevelLabel,
      totalStandard,
      assessments,
    },
  });
};

module.exports = {
  standards: standardsHandler,
  standardByExercise: standardByExerciseHandler,
  assess: assessHandler,
};
