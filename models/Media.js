const mongoose = require('mongoose');

/**
 * 媒体资产模型 - Media
 *
 * 设计原则:
 * 1. 与 Exercise 解耦, 一个动作可有多套媒体 (不同供应商/不同风格)
 * 2. 完整记录授权信息, 避免商用版权风险
 * 3. 支持版本号, 配合 media_manifest.json 实现热更新
 */
const mediaSchema = new mongoose.Schema({
  mediaId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    description: '业务唯一ID, 如 bench_press_thumb_v1'
  },
  exerciseId: {
    type: String,
    required: true,
    index: true,
    description: '关联的动作业务ID (非 ObjectId, 便于 manifest 同步)'
  },

  // ---- 媒体类型与格式 ----
  type: {
    type: String,
    required: true,
    enum: ['thumbnail', 'start_pose', 'peak_pose', 'animation', 'video'],
    index: true
  },
  format: {
    type: String,
    required: true,
    enum: ['webp', 'jpg', 'png', 'mp4', 'webm', 'gif', 'svg'],
    index: true
  },

  // ---- 资源定位 ----
  url: {
    type: String,
    required: true,
    description: 'CDN 完整 URL 或相对路径 (相对路径由 baseUrl + path 拼接)'
  },
  path: {
    type: String,
    default: '',
    description: '相对 baseUrl 的路径, 如 barbell_bench_press/thumb.webp'
  },

  // ---- 元数据 ----
  width: { type: Number, default: null },
  height: { type: Number, default: null },
  duration: { type: Number, default: null, description: '视频时长(秒), 静态图为 null' },
  fileSize: { type: Number, default: null, description: '文件大小(bytes)' },
  checksum: { type: String, default: '', description: '文件哈希, 用于更新检测' },

  // ---- 授权追踪 (商用合规核心) ----
  provider: {
    type: String,
    required: true,
    enum: ['repdb', 'exercisedb', 'gymvisual', 'self_made', 'purchased', 'other'],
    index: true
  },
  licenseType: {
    type: String,
    required: true,
    enum: ['cc_by', 'cc0', 'commercial', 'proprietary', 'research_only', 'unknown'],
    index: true,
    description: 'cc_by=需署名商用, cc0=无限制, commercial=已购商用, research_only=仅研究不可商用'
  },
  attributionRequired: { type: Boolean, default: false },
  attributionText: { type: String, default: '', description: '署名文案, 如 "Image courtesy of RepDB"' },
  licenseExpiry: { type: Date, default: null, description: '授权到期日, 付费素材需填写' },

  // ---- 版本与状态 ----
  version: { type: Number, default: 1, description: '媒体版本号, manifest 同步时比对' },
  isActive: { type: Boolean, default: true, index: true },
  isPrimary: { type: Boolean, default: false, description: '是否为该类型的首选素材 (一个动作一种类型只有一个 primary)' }

}, {
  timestamps: true
});

// 复合索引: 动作+类型+激活, 加速查询某动作的所有可用媒体
mediaSchema.index({ exerciseId: 1, type: 1, isActive: 1 });
// 授权审计索引: 快速找出需要署名或即将到期的素材
mediaSchema.index({ attributionRequired: 1, licenseExpiry: 1 });

module.exports = mongoose.model('Media', mediaSchema);
