const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  tiejiId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  phone: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    index: true
  },
  password: {
    type: String,
    required: true
  },
  nickname: {
    type: String,
    default: '',
    maxlength: 12
  },
  avatarUrl: {
    type: String,
    default: ''
  },
  gender: {
    type: String,
    enum: ['male', 'female'],
    default: 'male'
  },
  age: {
    type: Number,
    default: null
  },
  height: {
    type: Number,
    default: null
  },
  weight: {
    type: Number,
    default: null
  },
  // 微信登录相关
  wechatOpenId: {
    type: String,
    default: null,
    index: true
  },
  wechatUnionId: {
    type: String,
    default: null
  },
  // 登录方式
  loginType: {
    type: String,
    enum: ['phone', 'wechat'],
    default: 'phone'
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
