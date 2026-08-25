const mongoose = require('mongoose');

/**
 * 动作库模型 - Exercise
 *
 * 数据来源: RepDB 免费层 (250动作, exercise-dataset.com)
 * 设计原则:
 * 1. 动作元数据与媒体资产解耦 (media 引用 Media 集合, 不内嵌)
 * 2. AI 分析配置独立字段, 与训练记录/计划互不影响
 * 3. exerciseId 为业务主键, 用于训练记录 WorkoutExercise 关联
 * 4. 完整保留 RepDB 字段: forceType/mechanic/goals/met/isUnilateral/isBodyweight
 */
const exerciseSchema = new mongoose.Schema({
  // ---- 基础标识 ----
  exerciseId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    description: '业务唯一ID, 如 barbell_bench_press, 训练记录通过此字段关联'
  },
  repdbId: {
    type: String,
    default: '',
    index: true,
    description: 'RepDB 原始ID, 如 bench-press, 用于数据同步溯源'
  },
  nameZh: { type: String, required: true, index: true },
  nameEn: { type: String, required: true },
  aliases: {
    type: [String],
    default: [],
    description: '别名/俗称, 用于搜索匹配'
  },
  description: {
    type: String,
    default: '',
    description: '中文一句话描述'
  },
  descriptionEn: {
    type: String,
    default: '',
    description: '英文描述 (RepDB 原始)'
  },

  // ---- 分类 ----
  category: {
    type: String,
    required: true,
    index: true,
    enum: ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio', 'other']
  },
  bodyPart: {
    type: String,
    default: '',
    description: 'RepDB body_part, 更细的部位分类'
  },
  movementPattern: {
    type: String,
    index: true,
    enum: ['push', 'pull', 'hinge', 'squat', 'lunge', 'carry', 'rotation', 'isolation', 'other'],
    default: 'other',
    description: '动作模式, 用于 AI 分析路由'
  },
  forceType: {
    type: String,
    index: true,
    enum: ['push', 'pull', 'static', 'dynamic', 'other'],
    default: 'other',
    description: 'RepDB force_type: 推/拉/静态/动态'
  },
  mechanic: {
    type: String,
    index: true,
    enum: ['compound', 'isolation', 'other'],
    default: 'other',
    description: 'RepDB mechanic: 复合/孤立'
  },
  equipment: {
    type: String,
    index: true,
    enum: ['barbell', 'dumbbell', 'machine', 'bodyweight', 'cable', 'kettlebell', 'band', 'smith', 'ez_bar', 'ab_wheel', 'other'],
    default: 'other'
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'intermediate'
  },

  // ---- RepDB 扩展属性 ----
  goals: {
    type: [String],
    default: [],
    description: '训练目标, 如 hypertrophy, strength, endurance'
  },
  met: {
    type: Number,
    default: null,
    description: '代谢当量, 用于卡路里估算'
  },
  isUnilateral: {
    type: Boolean,
    default: false,
    description: '是否单侧动作'
  },
  isBodyweight: {
    type: Boolean,
    default: false,
    description: '是否自重动作'
  },

  // ---- 肌群 ----
  primaryMuscles: {
    type: [String],
    default: [],
    description: '目标肌群'
  },
  secondaryMuscles: {
    type: [String],
    default: [],
    description: '协同肌群'
  },

  // ---- 教学内容 ----
  instructions: {
    type: [String],
    default: [],
    description: '分步动作要点'
  },
  instructionsEn: {
    type: [String],
    default: [],
    description: '英文分步说明 (RepDB 原始)'
  },
  tips: {
    type: [String],
    default: [],
    description: '技巧提示'
  },
  tipsEn: {
    type: [String],
    default: [],
    description: '英文技巧提示 (RepDB 原始)'
  },

  // ---- 媒体资产 (引用 Media 集合, 不内嵌) ----
  media: {
    thumbnail: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', default: null },
    startPose: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', default: null },
    peakPose: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', default: null },
    animation: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', default: null },
    video: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', default: null }
  },

  // ---- AI 分析配置 (与媒体完全独立, 可单独迭代) ----
  trackingConfig: {
    enabled: { type: Boolean, default: false },
    movementPattern: { type: String, default: '' },
    primaryJoints: { type: [String], default: [] },
    rom: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    phases: {
      type: [String],
      default: [],
    },
    repDetector: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    techniqueRules: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    feedbackRules: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    }
  },

  // ---- 状态 ----
  isActive: { type: Boolean, default: true, index: true },
  sortOrder: { type: Number, default: 0 }

}, {
  timestamps: true
});

exerciseSchema.index({ category: 1, isActive: 1, sortOrder: 1 });
exerciseSchema.index({ nameZh: 'text', nameEn: 'text', aliases: 'text' });
exerciseSchema.index({ forceType: 1, mechanic: 1 });

module.exports = mongoose.model('Exercise', exerciseSchema);
