const User = require('../models/User');
const jwt = require('jsonwebtoken');

// 生成用户ID
const generateUserId = () => {
  return 'user_' + Math.random().toString(36).substr(2, 9);
};

// 注册/登录用户
exports.registerUser = async (req, res) => {
  try {
    console.log('📝 处理注册/登录请求');
    
    const { phone, password, gender, age, height, weight, nickname } = req.body;
    let avatarUrl = '';
    
    // 处理头像上传
    if (req.file) {
      avatarUrl = `/uploads/${req.file.filename}`;
      console.log('🖼️ 头像上传成功:', avatarUrl);
    }

    // 验证必填字段
    if (!phone || !password || !gender || !age || !height) {
      return res.status(400).json({
        success: false,
        message: '手机号、密码、性别、年龄、身高为必填项'
      });
    }

    // 检查用户是否已存在
    let user = await User.findOne({ phone });
    
    if (user) {
      // 验证密码
      if (password !== user.password) {
        return res.status(401).json({
          success: false,
          message: '密码错误'
        });
      }
      
      console.log('✅ 用户登录成功:', user.phone);
    } else {
      // 创建新用户
      const userId = generateUserId();
      
      user = new User({
        userId,
        phone,
        password, // 实际项目中应该加密
        gender,
        age,
        height,
        weight: weight || 70, // 默认体重
        nickname: nickname || `用户${userId.slice(-4)}`,
        avatarUrl
      });

      await user.save();
      console.log('✅ 新用户注册成功:', user.phone);
    }

    // 生成token
    const token = jwt.sign(
      { userId: user.userId, phone: user.phone },
      process.env.JWT_SECRET || 'your_strong_jwt_secret_here_123!@#',
      { expiresIn: '30d' }
    );

    res.status(201).json({
      success: true,
      message: user.isNew ? '注册成功' : '登录成功',
      data: {
        token,
        user: {
          userId: user.userId,
          phone: user.phone,
          gender: user.gender,
          age: user.age,
          height: user.height,
          weight: user.weight,
          nickname: user.nickname,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt,
          lastLogin: new Date()
        }
      }
    });

  } catch (error) {
    console.error('❌ 注册/登录错误:', error.message);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
};

// 登录用户（简化版）
exports.loginUser = async (req, res) => {
  try {
    const { phone, password } = req.body;
    
    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: '手机号和密码为必填项'
      });
    }

    const user = await User.findOne({ phone });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 简单密码验证（实际项目应加密）
    if (password !== user.password) {
      return res.status(401).json({
        success: false,
        message: '密码错误'
      });
    }
    
    // 生成token
    const token = jwt.sign(
      { userId: user.userId, phone: user.phone },
      process.env.JWT_SECRET || 'your_strong_jwt_secret_here_123!@#',
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          userId: user.userId,
          phone: user.phone,
          gender: user.gender,
          age: user.age,
          height: user.height,
          weight: user.weight,
          nickname: user.nickname,
          avatarUrl: user.avatarUrl,
          lastLogin: new Date()
        }
      }
    });

  } catch (error) {
    console.error('❌ 登录错误:', error.message);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
};

// 获取用户信息
exports.getUserProfile = async (req, res) => {
  try {
    console.log('👤 获取用户信息');
    
    // 临时：返回测试数据
    res.json({
      success: true,
      data: {
        userId: 'user_123456',
        phone: '138****1234',
        gender: 'male',
        age: 25,
        height: 175,
        weight: 70,
        nickname: '健身达人',
        avatarUrl: '/uploads/default-avatar.png',
        fitnessLevel: 'intermediate',
        trainingExperience: 2,
        lastLogin: new Date()
      }
    });
    
  } catch (error) {
    console.error('❌ 获取用户信息错误:', error.message);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
};