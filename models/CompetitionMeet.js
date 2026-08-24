// models/CompetitionMeet.js
// 比赛信息模型
const mongoose = require('mongoose');

const competitionMeetSchema = new mongoose.Schema({
  // 赛事体系：IPF-China, WP-China, ChinaPA 等
  federation: {
    type: String,
    required: true,
    index: true
  },
  // 数据来源：openpowerlifting, openipf, official 等
  source: {
    type: String,
    required: true,
    default: 'openpowerlifting'
  },
  // 数据源中的唯一比赛ID
  sourceId: {
    type: String,
    required: true,
    index: true
  },
  // 比赛名称
  name: {
    type: String,
    required: true
  },
  // 比赛日期
  date: {
    type: Date,
    required: true,
    index: true
  },
  // 比赛地点
  location: {
    type: String,
    default: ''
  },
  // 国家
  country: {
    type: String,
    default: 'China'
  },
  // 数据来源URL
  sourceUrl: {
    type: String,
    default: ''
  },
  // 导入时间
  importedAt: {
    type: Date,
    default: Date.now
  },
  // 数据版本（用于增量同步）
  dataVersion: {
    type: String,
    default: 'v1'
  }
});

// 唯一索引：federation + sourceId
competitionMeetSchema.index({ federation: 1, sourceId: 1 }, { unique: true });

module.exports = mongoose.model('CompetitionMeet', competitionMeetSchema);
