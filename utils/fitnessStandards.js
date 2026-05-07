// utils/fitness-standards.js

/**
 * 力量标准数据库 (24-39岁 1RM)
 * 数据来源：用户提供的 Strength Standard 图表
 */

const standards = {
  male: {
    bench_press: [
      { bodyweight: 50, Beginner: 23, Novice: 37, Intermediate: 55, Advanced: 77, Elite: 102 },
      { bodyweight: 55, Beginner: 28, Novice: 43, Intermediate: 63, Advanced: 86, Elite: 112 },
      { bodyweight: 60, Beginner: 33, Novice: 49, Intermediate: 70, Advanced: 95, Elite: 121 },
      { bodyweight: 65, Beginner: 38, Novice: 55, Intermediate: 77, Advanced: 103, Elite: 130 },
      { bodyweight: 70, Beginner: 43, Novice: 61, Intermediate: 84, Advanced: 110, Elite: 139 },
      { bodyweight: 75, Beginner: 47, Novice: 67, Intermediate: 91, Advanced: 118, Elite: 147 },
      { bodyweight: 80, Beginner: 52, Novice: 72, Intermediate: 97, Advanced: 125, Elite: 155 },
      { bodyweight: 85, Beginner: 57, Novice: 78, Intermediate: 103, Advanced: 132, Elite: 163 },
      { bodyweight: 90, Beginner: 61, Novice: 83, Intermediate: 109, Advanced: 139, Elite: 171 },
      { bodyweight: 95, Beginner: 65, Novice: 88, Intermediate: 115, Advanced: 145, Elite: 178 },
      { bodyweight: 100, Beginner: 70, Novice: 93, Intermediate: 121, Advanced: 152, Elite: 185 },
      { bodyweight: 105, Beginner: 74, Novice: 98, Intermediate: 126, Advanced: 158, Elite: 192 },
      { bodyweight: 110, Beginner: 78, Novice: 102, Intermediate: 131, Advanced: 164, Elite: 199 },
      { bodyweight: 115, Beginner: 82, Novice: 107, Intermediate: 137, Advanced: 170, Elite: 205 },
      { bodyweight: 120, Beginner: 86, Novice: 112, Intermediate: 142, Advanced: 176, Elite: 211 },
      { bodyweight: 125, Beginner: 90, Novice: 116, Intermediate: 147, Advanced: 181, Elite: 217 },
      { bodyweight: 130, Beginner: 94, Novice: 120, Intermediate: 152, Advanced: 187, Elite: 223 },
      { bodyweight: 135, Beginner: 98, Novice: 125, Intermediate: 156, Advanced: 192, Elite: 229 },
      { bodyweight: 140, Beginner: 101, Novice: 129, Intermediate: 161, Advanced: 197, Elite: 235 },
    ],
    squat: [
      { bodyweight: 50, Beginner: 33, Novice: 51, Intermediate: 75, Advanced: 103, Elite: 134 },
      { bodyweight: 55, Beginner: 39, Novice: 59, Intermediate: 84, Advanced: 114, Elite: 147 },
      { bodyweight: 60, Beginner: 46, Novice: 67, Intermediate: 94, Advanced: 125, Elite: 159 },
      { bodyweight: 65, Beginner: 52, Novice: 75, Intermediate: 103, Advanced: 136, Elite: 171 },
      { bodyweight: 70, Beginner: 58, Novice: 82, Intermediate: 112, Advanced: 146, Elite: 183 },
      { bodyweight: 75, Beginner: 65, Novice: 90, Intermediate: 120, Advanced: 156, Elite: 194 },
      { bodyweight: 80, Beginner: 71, Novice: 97, Intermediate: 129, Advanced: 165, Elite: 204 },
      { bodyweight: 85, Beginner: 77, Novice: 104, Intermediate: 137, Advanced: 174, Elite: 214 },
      { bodyweight: 90, Beginner: 83, Novice: 111, Intermediate: 145, Advanced: 183, Elite: 224 },
      { bodyweight: 95, Beginner: 88, Novice: 117, Intermediate: 152, Advanced: 192, Elite: 233 },
      { bodyweight: 100, Beginner: 94, Novice: 124, Intermediate: 160, Advanced: 200, Elite: 242 },
      { bodyweight: 105, Beginner: 99, Novice: 130, Intermediate: 167, Advanced: 208, Elite: 251 },
      { bodyweight: 110, Beginner: 105, Novice: 136, Intermediate: 174, Advanced: 216, Elite: 260 },
      { bodyweight: 115, Beginner: 110, Novice: 142, Intermediate: 181, Advanced: 223, Elite: 268 },
      { bodyweight: 120, Beginner: 115, Novice: 148, Intermediate: 187, Advanced: 231, Elite: 276 },
      { bodyweight: 125, Beginner: 120, Novice: 154, Intermediate: 194, Advanced: 238, Elite: 284 },
      { bodyweight: 130, Beginner: 125, Novice: 160, Intermediate: 200, Advanced: 245, Elite: 292 },
      { bodyweight: 135, Beginner: 130, Novice: 165, Intermediate: 206, Advanced: 252, Elite: 299 },
      { bodyweight: 140, Beginner: 135, Novice: 171, Intermediate: 212, Advanced: 258, Elite: 307 },
    ],
    deadlift: [
      { bodyweight: 50, Beginner: 43, Novice: 64, Intermediate: 91, Advanced: 123, Elite: 158 },
      { bodyweight: 55, Beginner: 50, Novice: 73, Intermediate: 102, Advanced: 136, Elite: 173 },
      { bodyweight: 60, Beginner: 57, Novice: 82, Intermediate: 113, Advanced: 148, Elite: 186 },
      { bodyweight: 65, Beginner: 65, Novice: 91, Intermediate: 123, Advanced: 159, Elite: 199 },
      { bodyweight: 70, Beginner: 72, Novice: 99, Intermediate: 132, Advanced: 170, Elite: 211 },
      { bodyweight: 75, Beginner: 79, Novice: 107, Intermediate: 142, Advanced: 181, Elite: 223 },
      { bodyweight: 80, Beginner: 85, Novice: 115, Intermediate: 151, Advanced: 191, Elite: 234 },
      { bodyweight: 85, Beginner: 92, Novice: 123, Intermediate: 159, Advanced: 201, Elite: 245 },
      { bodyweight: 90, Beginner: 98, Novice: 130, Intermediate: 168, Advanced: 211, Elite: 256 },
      { bodyweight: 95, Beginner: 105, Novice: 137, Intermediate: 176, Advanced: 220, Elite: 266 },
      { bodyweight: 100, Beginner: 111, Novice: 144, Intermediate: 184, Advanced: 229, Elite: 276 },
      { bodyweight: 105, Beginner: 117, Novice: 151, Intermediate: 192, Advanced: 237, Elite: 285 },
      { bodyweight: 110, Beginner: 123, Novice: 158, Intermediate: 199, Advanced: 246, Elite: 294 },
      { bodyweight: 115, Beginner: 129, Novice: 164, Intermediate: 207, Advanced: 254, Elite: 303 },
      { bodyweight: 120, Beginner: 134, Novice: 171, Intermediate: 214, Advanced: 262, Elite: 312 },
      { bodyweight: 125, Beginner: 140, Novice: 177, Intermediate: 221, Advanced: 269, Elite: 320 },
      { bodyweight: 130, Beginner: 145, Novice: 183, Intermediate: 228, Advanced: 277, Elite: 328 },
      { bodyweight: 135, Beginner: 151, Novice: 189, Intermediate: 234, Advanced: 284, Elite: 336 },
      { bodyweight: 140, Beginner: 156, Novice: 195, Intermediate: 241, Advanced: 291, Elite: 344 },
    ]
  },
  female: {
    bench_press: [
      { bodyweight: 40, Beginner: 8, Novice: 18, Intermediate: 31, Advanced: 49, Elite: 69 },
      { bodyweight: 45, Beginner: 10, Novice: 21, Intermediate: 35, Advanced: 54, Elite: 75 },
      { bodyweight: 50, Beginner: 13, Novice: 24, Intermediate: 39, Advanced: 58, Elite: 80 },
      { bodyweight: 55, Beginner: 15, Novice: 26, Intermediate: 43, Advanced: 63, Elite: 85 },
      { bodyweight: 60, Beginner: 17, Novice: 29, Intermediate: 46, Advanced: 67, Elite: 90 },
      { bodyweight: 65, Beginner: 19, Novice: 32, Intermediate: 49, Advanced: 71, Elite: 95 },
      { bodyweight: 70, Beginner: 21, Novice: 34, Intermediate: 52, Advanced: 74, Elite: 99 },
      { bodyweight: 75, Beginner: 22, Novice: 37, Intermediate: 55, Advanced: 78, Elite: 103 },
      { bodyweight: 80, Beginner: 24, Novice: 39, Intermediate: 58, Advanced: 81, Elite: 107 },
      { bodyweight: 85, Beginner: 26, Novice: 41, Intermediate: 61, Advanced: 85, Elite: 111 },
      { bodyweight: 90, Beginner: 28, Novice: 44, Intermediate: 64, Advanced: 88, Elite: 114 },
      { bodyweight: 95, Beginner: 30, Novice: 46, Intermediate: 66, Advanced: 91, Elite: 118 },
      { bodyweight: 100, Beginner: 31, Novice: 48, Intermediate: 69, Advanced: 94, Elite: 121 },
      { bodyweight: 105, Beginner: 33, Novice: 50, Intermediate: 71, Advanced: 97, Elite: 124 },
      { bodyweight: 110, Beginner: 34, Novice: 52, Intermediate: 74, Advanced: 99, Elite: 127 },
      { bodyweight: 115, Beginner: 36, Novice: 54, Intermediate: 76, Advanced: 102, Elite: 130 },
      { bodyweight: 120, Beginner: 38, Novice: 56, Intermediate: 78, Advanced: 105, Elite: 133 },
    ],
    squat: [
      { bodyweight: 40, Beginner: 18, Novice: 32, Intermediate: 51, Advanced: 75, Elite: 101 },
      { bodyweight: 45, Beginner: 21, Novice: 36, Intermediate: 56, Advanced: 81, Elite: 109 },
      { bodyweight: 50, Beginner: 24, Novice: 40, Intermediate: 61, Advanced: 87, Elite: 115 },
      { bodyweight: 55, Beginner: 27, Novice: 43, Intermediate: 65, Advanced: 92, Elite: 122 },
      { bodyweight: 60, Beginner: 29, Novice: 47, Intermediate: 70, Advanced: 97, Elite: 127 },
      { bodyweight: 65, Beginner: 32, Novice: 50, Intermediate: 74, Advanced: 102, Elite: 133 },
      { bodyweight: 70, Beginner: 34, Novice: 53, Intermediate: 78, Advanced: 106, Elite: 138 },
      { bodyweight: 75, Beginner: 37, Novice: 56, Intermediate: 81, Advanced: 111, Elite: 143 },
      { bodyweight: 80, Beginner: 39, Novice: 59, Intermediate: 85, Advanced: 115, Elite: 148 },
      { bodyweight: 85, Beginner: 42, Novice: 62, Intermediate: 88, Advanced: 119, Elite: 152 },
      { bodyweight: 90, Beginner: 44, Novice: 65, Intermediate: 92, Advanced: 123, Elite: 156 },
      { bodyweight: 95, Beginner: 46, Novice: 68, Intermediate: 95, Advanced: 126, Elite: 161 },
      { bodyweight: 100, Beginner: 48, Novice: 70, Intermediate: 98, Advanced: 130, Elite: 164 },
      { bodyweight: 105, Beginner: 50, Novice: 73, Intermediate: 101, Advanced: 133, Elite: 168 },
      { bodyweight: 110, Beginner: 52, Novice: 75, Intermediate: 103, Advanced: 136, Elite: 172 },
      { bodyweight: 115, Beginner: 54, Novice: 77, Intermediate: 106, Advanced: 139, Elite: 175 },
      { bodyweight: 120, Beginner: 56, Novice: 80, Intermediate: 109, Advanced: 143, Elite: 179 },
    ],
    deadlift: [
      { bodyweight: 40, Beginner: 24, Novice: 40, Intermediate: 62, Advanced: 89, Elite: 119 },
      { bodyweight: 45, Beginner: 27, Novice: 45, Intermediate: 68, Advanced: 96, Elite: 127 },
      { bodyweight: 50, Beginner: 31, Novice: 49, Intermediate: 73, Advanced: 102, Elite: 134 },
      { bodyweight: 55, Beginner: 34, Novice: 53, Intermediate: 78, Advanced: 108, Elite: 141 },
      { bodyweight: 60, Beginner: 37, Novice: 57, Intermediate: 83, Advanced: 113, Elite: 147 },
      { bodyweight: 65, Beginner: 40, Novice: 61, Intermediate: 88, Advanced: 119, Elite: 153 },
      { bodyweight: 70, Beginner: 43, Novice: 65, Intermediate: 92, Advanced: 124, Elite: 158 },
      { bodyweight: 75, Beginner: 46, Novice: 68, Intermediate: 96, Advanced: 128, Elite: 164 },
      { bodyweight: 80, Beginner: 49, Novice: 71, Intermediate: 100, Advanced: 133, Elite: 169 },
      { bodyweight: 85, Beginner: 51, Novice: 74, Intermediate: 103, Advanced: 137, Elite: 173 },
      { bodyweight: 90, Beginner: 54, Novice: 77, Intermediate: 107, Advanced: 141, Elite: 178 },
      { bodyweight: 95, Beginner: 56, Novice: 80, Intermediate: 110, Advanced: 145, Elite: 182 },
      { bodyweight: 100, Beginner: 59, Novice: 83, Intermediate: 114, Advanced: 149, Elite: 187 },
      { bodyweight: 105, Beginner: 61, Novice: 86, Intermediate: 117, Advanced: 152, Elite: 191 },
      { bodyweight: 110, Beginner: 63, Novice: 88, Intermediate: 120, Advanced: 156, Elite: 195 },
      { bodyweight: 115, Beginner: 65, Novice: 91, Intermediate: 123, Advanced: 159, Elite: 198 },
      { bodyweight: 120, Beginner: 67, Novice: 93, Intermediate: 126, Advanced: 162, Elite: 202 },
    ]
  }
};

/**
 * 获取最接近的体重档位标准
 * 逻辑：如果用户体重在两个档位之间，取较大的那个档位（保守估计）
 * 例如：用户72kg，取75kg的标准；用户48kg，取50kg的标准
 */
function findClosestStandard(gender, exercise, bodyWeight) {
  const genderData = standards[gender];
  if (!genderData) return null;

  const exerciseData = genderData[exercise];
  if (!exerciseData) return null;

  // 查找第一个体重大于等于用户体重的标准
  let found = exerciseData.find((item) => item.bodyweight >= bodyWeight);

  // 如果用户体重超过了表格最大值，返回最后一行（最大值）
  if (!found) {
    return exerciseData[exerciseData.length - 1];
  }

  return found;
}

/**
 * 评估单项力量等级
 */
function assessExercise(gender, exercise, bodyWeight, oneRepMax) {
  const standard = findClosestStandard(gender, exercise, bodyWeight);
  if (!standard) return null;

  // 判定等级
  if (oneRepMax >= standard.Elite) return { level: 'elite', standard };
  if (oneRepMax >= standard.Advanced) return { level: 'advanced', standard };
  if (oneRepMax >= standard.Intermediate) return { level: 'intermediate', standard };
  if (oneRepMax >= standard.Novice) return { level: 'novice', standard };
  return { level: 'beginner', standard };
}

/**
 * 主函数：综合评估
 */
function getFitnessAssessment({ gender, bodyWeight, benchPress1RM, squat1RM, deadlift1RM }) {
  // 1. 单项评估
  const benchAssessment = assessExercise(gender, 'bench_press', bodyWeight, benchPress1RM);
  const squatAssessment = assessExercise(gender, 'squat', bodyWeight, squat1RM);
  const deadliftAssessment = assessExercise(gender, 'deadlift', bodyWeight, deadlift1RM);

  // 2. 等级分值映射 (用于计算综合分)
  const levelScoreMap = {
    beginner: 1,
    novice: 2,
    intermediate: 3,
    advanced: 4,
    elite: 5
  };

  // 3. 计算综合等级 (取平均值)
  const totalScore =
    levelScoreMap[benchAssessment.level] +
    levelScoreMap[squatAssessment.level] +
    levelScoreMap[deadliftAssessment.level];
  const avgScore = totalScore / 3;

  // 简单的综合评级逻辑：
  // 2.5以下 -> 新手; 2.5-3.5 -> 中级; 3.5以上 -> 高级 (仅作示例，可调整)
  let overallLevel = 'novice';
  if (avgScore >= 4.5) overallLevel = 'elite';
  else if (avgScore >= 3.5) overallLevel = 'advanced';
  else if (avgScore >= 2.5) overallLevel = 'intermediate';
  else overallLevel = 'beginner'; // 如果很弱，归为初学者

  return {
    bench_press: benchAssessment,
    squat: squatAssessment,
    deadlift: deadliftAssessment,
    overallLevel: overallLevel,
    score: avgScore.toFixed(1)
  };
}

module.exports = { getFitnessAssessment };