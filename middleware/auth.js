const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    // 从请求头获取token
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '未提供认证token'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // 验证token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'token已过期，请重新登录'
        });
      }
      throw error;
    }
    
    // 查找用户
    const user = await User.findOne({ userId: decoded.userId }).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 更新最后登录时间（可选）
    if (Date.now() - user.lastLogin.getTime() > 24 * 60 * 60 * 1000) {
      user.lastLogin = new Date();
      await user.save();
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('认证中间件错误:', error);
    res.status(401).json({
      success: false,
      message: '无效或过期的token'
    });
  }
};

// 可选：角色中间件
const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: '需要管理员权限'
    });
  }
  next();
};

module.exports = {
  authMiddleware,
  adminMiddleware
};