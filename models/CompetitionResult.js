// models/CompetitionResult.js
// 比赛成绩模型
const mongoose = require('mongoose');

const competitionResultSchema = new mongoose.Schema({
  // 关联比赛ID
  meetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CompetitionMeet',
    required: true,
    index: true
  },
  // 赛事体系（冗余，方便查询）
  federation: {
    type: String,
    required: true,
    index: true
  },
  // 运动员姓名
  athleteName: {
    type: String,
    default: ''
  },
  // 性别：M / F
  sex: {
    type: String,
    required: true,
    enum: ['M', 'F'],
    index: true
  },
  // 年龄
  age: {
    type: Number,
    default: null
  },
  // 年龄组：Open, Juniors, Masters, Sub-Juniors 等
  division: {
    type: String,
    default: 'Open',
    index: true
  },
  // 装备：Classic, Raw, Wraps, Equipped, Single-ply, Multi-ply 等
  // 保留原始值，不做统一映射
  equipment: {
    type: String,
    required: true,
    index: true
  },
  // 体重级别：如 59, 66, 74, 83, 93, 105, 120, 120+ 等
  weightClass: {
    type: String,
    required: true,
    index: true
  },
  // 实际体重（kg）
  bodyweight: {
    type: Number,
    default: null
  },
  // 深蹲（kg）
  squat: {
    type: Number,
    default: null
  },
  // 卧推（kg）
  bench: {
    type: Number,
    default: null
  },
  // 硬拉（kg）
  deadlift: {
    type: Number,
    default: null
  },
  // 总成绩（kg）
  total: {
    type: Number,
    default: null,
    index: true
  },
  // IPF GL 分数
  ipfGl: {
    type: Number,
    default: null
  },
  // Wilks 分数
  wilks: {
    type: Number,
    default: null
  },
  // 名次
  placement: {
    type: Number,
    default: null
  },
  // 状态：Valid（有效）, DQ（取消资格）, DNS（未参赛）, DNF（未完赛）
  status: {
    type: String,
    required: true,
    enum: ['Valid', 'DQ', 'DNS', 'DNF', 'Unknown'],
    default: 'Valid',
    index: true
  },
  // 数据来源URL
  sourceUrl: {
    type: String,
    default: ''
  },
  // 数据源中的唯一记录ID（用于去重）
  sourceRecordId: {
    type: String,
    default: ''
  },
  // 数据版本
  dataVersion: {
    type: String,
    default: 'v1'
  },
  // 导入时间
  importedAt: {
    type: Date,
    default: Date.now
  }
});

// 复合索引：用于参赛评估查询
competitionResultSchema.index({
  federation: 1,
  sex: 1,
  equipment: 1,
  weightClass: 1,
  division: 1,
  status: 1,
  total: 1
});

// 唯一索引：用于去重（meetId + athleteName + division + equipment + weightClass）
competitionResultSchema.index(
  { meetId: 1, athleteName: 1, division: 1, equipment: 1, weightClass: 1 },
  { unique: true }
);

module.exports = mongoose.model('CompetitionResult', competitionResultSchema);
