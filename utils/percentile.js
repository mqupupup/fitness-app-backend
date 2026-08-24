// utils/percentile.js
// 统计工具：百分位、分位数、中位数、差距计算

/**
 * 计算百分位（使用线性插值法）
 * @param {number[]} sortedValues - 已排序的数值数组（升序）
 * @param {number} value - 要计算百分位的数值
 * @returns {number} 百分位（0-100）
 */
function calculatePercentile(sortedValues, value) {
  if (!sortedValues || sortedValues.length === 0) return 0;

  // 找到第一个大于等于value的位置
  let count = 0;
  for (let i = 0; i < sortedValues.length; i++) {
    if (sortedValues[i] <= value) {
      count++;
    } else {
      break;
    }
  }

  return (count / sortedValues.length) * 100;
}

/**
 * 计算分位数（使用线性插值法）
 * @param {number[]} sortedValues - 已排序的数值数组（升序）
 * @param {number} q - 分位数（0-1，如0.5表示中位数，0.75表示75分位）
 * @returns {number} 分位数值
 */
function calculateQuantile(sortedValues, q) {
  if (!sortedValues || sortedValues.length === 0) return null;
  if (q <= 0) return sortedValues[0];
  if (q >= 1) return sortedValues[sortedValues.length - 1];

  const position = (sortedValues.length - 1) * q;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  const weight = position - lowerIndex;

  if (lowerIndex === upperIndex) {
    return sortedValues[lowerIndex];
  }

  return sortedValues[lowerIndex] * (1 - weight) + sortedValues[upperIndex] * weight;
}

/**
 * 计算中位数
 * @param {number[]} sortedValues - 已排序的数值数组（升序）
 * @returns {number} 中位数
 */
function calculateMedian(sortedValues) {
  return calculateQuantile(sortedValues, 0.5);
}

/**
 * 计算阈值（达到某个百分位需要的数值）
 * @param {number[]} sortedValues - 已排序的数值数组（升序）
 * @param {number} percentile - 百分位（0-100）
 * @returns {number} 阈值
 */
function calculateThreshold(sortedValues, percentile) {
  return calculateQuantile(sortedValues, percentile / 100);
}

/**
 * 计算与目标值的差距
 * @param {number} current - 当前值
 * @param {number} target - 目标值
 * @returns {number} 差距（正数表示还差多少，负数表示已超过）
 */
function calculateGap(current, target) {
  if (current === null || current === undefined || target === null || target === undefined) {
    return null;
  }
  return target - current;
}

/**
 * 构建比赛成绩分布
 * @param {number[]} totals - 总成绩数组
 * @param {number} userTotal - 用户的总成绩
 * @returns {Object} 分布结果
 */
function buildCompetitionDistribution(totals, userTotal) {
  if (!totals || totals.length === 0) {
    return {
      percentile: 0,
      median: null,
      p25: null,  // 前25%（即75分位）
      p10: null,  // 前10%（即90分位）
      p5: null,   // 前5%（即95分位，精英级门槛）
      gapToMedian: null,
      gapToP25: null,
      gapToP10: null,
      gapToP5: null,
      sampleSize: 0
    };
  }

  // 排序（升序）
  const sortedTotals = [...totals].sort((a, b) => a - b);

  const percentile = calculatePercentile(sortedTotals, userTotal);
  const median = calculateMedian(sortedTotals);
  const p25 = calculateQuantile(sortedTotals, 0.75); // 前25% = 75分位
  const p10 = calculateQuantile(sortedTotals, 0.90); // 前10% = 90分位
  const p5 = calculateQuantile(sortedTotals, 0.95);  // 前5% = 95分位（精英级门槛）

  return {
    percentile: Math.round(percentile * 10) / 10, // 保留一位小数
    median: Math.round(median * 10) / 10,
    p25: Math.round(p25 * 10) / 10,
    p10: Math.round(p10 * 10) / 10,
    p5: Math.round(p5 * 10) / 10,
    gapToMedian: calculateGap(userTotal, median),
    gapToP25: calculateGap(userTotal, p25),
    gapToP10: calculateGap(userTotal, p10),
    gapToP5: calculateGap(userTotal, p5),
    sampleSize: sortedTotals.length
  };
}

/**
 * 根据百分位获取等级分类（6级体系）
 * @param {number} percentile - 百分位（0-100）
 * @returns {Object} 等级信息
 */
function getClassification(percentile) {
  // 四舍五入到整数，用于描述
  const p = Math.round(percentile);

  if (percentile >= 95) {
    return {
      key: 'elite',
      label: '精英级',
      percentileLabel: '同级别前5%',
      description: `你的力量水平超过约${p}%的同级别训练者，处于顶尖水平`
    };
  } else if (percentile >= 90) {
    return {
      key: 'high',
      label: '高水平',
      percentileLabel: '同级别前10%',
      description: `你的力量水平超过约${p}%的同级别训练者`
    };
  } else if (percentile >= 75) {
    return {
      key: 'upper_mid',
      label: '中上游',
      percentileLabel: '同级别前25%',
      description: `你的力量水平超过约${p}%的同级别训练者`
    };
  } else if (percentile >= 50) {
    return {
      key: 'mid',
      label: '中游',
      percentileLabel: '同级别前50%',
      description: `你的力量水平高于同级别大多数训练者（超过约${p}%）`
    };
  } else if (percentile >= 25) {
    return {
      key: 'advanced',
      label: '进阶级',
      percentileLabel: '同级别前75%',
      description: `已具备扎实训练基础，超过约${p}%的同级别训练者，持续提升中`
    };
  } else {
    return {
      key: 'beginner',
      label: '入门级',
      percentileLabel: '同级别后25%',
      description: `正在建立力量基础，超过约${p}%的同级别训练者，潜力很大`
    };
  }
}

module.exports = {
  calculatePercentile,
  calculateQuantile,
  calculateMedian,
  calculateThreshold,
  calculateGap,
  buildCompetitionDistribution,
  getClassification
};
