const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'your_strong_jwt_secret_here_123!@#';
const SALT_ROUNDS = 10;

// 生成用户ID
const generateUserId = () => {
  return 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
};

// 生成 token
const generateToken = (user) => {
  return jwt.sign(
    { userId: user.userId, phone: user.phone },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// 格式化用户信息（不返回密码）
const formatUser = (user) => {
  return {
    userId: user.userId,
    phone: user.phone,
    nickname: user.nickname,
    avatarUrl: user.avatarUrl,
    gender: user.gender,
    age: user.age,
    height: user.height,
    weight: user.weight,
    loginType: user.loginType,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin
  };
};

// 手机号注册
exports.register = async (req, res) => {
  try {
    console.log('📝 处理注册请求');
    const { phone, password, nickname, gender, age, height, weight } = req.body;

    // 验证必填字段
    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: '手机号和密码为必填项'
      });
    }

    // 手机号格式验证
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: '手机号格式不正确'
      });
    }

    // 密码长度验证
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: '密码长度至少6位'
      });
    }

    // 检查用户是否已存在
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: '该手机号已注册，请直接登录'
      });
    }

    // 密码加密
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // 创建新用户
    const userId = generateUserId();
    const user = new User({
      userId,
      phone,
      password: hashedPassword,
      nickname: nickname || `用户${userId.slice(-4)}`,
      gender: gender || 'male',
      age: age || null,
      height: height || null,
      weight: weight || null,
      loginType: 'phone'
    });

    await user.save();
    console.log('✅ 新用户注册成功:', user.phone);

    // 生成 token
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        token,
        user: formatUser(user)
      }
    });

  } catch (error) {
    console.error('❌ 注册错误:', error.message);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
};

// 手机号登录
exports.login = async (req, res) => {
  try {
    console.log('🔐 处理登录请求');
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: '手机号和密码为必填项'
      });
    }

    // 查找用户
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '该手机号未注册，请先注册'
      });
    }

    // 验证密码（兼容旧版明文密码）
    let passwordValid = false;
    if (user.password.startsWith('$2')) {
      // bcrypt 加密密码
      passwordValid = await bcrypt.compare(password, user.password);
    } else {
      // 旧版明文密码（兼容）
      passwordValid = (password === user.password);
      // 如果匹配，自动升级为加密密码
      if (passwordValid) {
        user.password = await bcrypt.hash(password, SALT_ROUNDS);
        await user.save();
        console.log('🔄 密码已自动升级为加密存储');
      }
    }

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: '密码错误'
      });
    }

    // 更新最后登录时间
    user.lastLogin = new Date();
    await user.save();

    console.log('✅ 用户登录成功:', user.phone);

    // 生成 token
    const token = generateToken(user);

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: formatUser(user)
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

// 微信登录
exports.wechatLogin = async (req, res) => {
  try {
    console.log('💬 处理微信登录请求');
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: '微信授权 code 为必填项'
      });
    }

    const WECHAT_APPID = process.env.WECHAT_APPID;
    const WECHAT_SECRET = process.env.WECHAT_SECRET;

    // 开发模式：未配置微信 AppID 时，使用模拟登录
    if (!WECHAT_APPID || !WECHAT_SECRET) {
      console.log('⚠️ 微信登录未配置，使用开发模式模拟登录');
      // 使用完整的 code 作为 mockOpenid，确保唯一性
      const mockOpenid = `mock_${code}`;
      const mockUserInfo = {
        nickname: '微信用户(开发模式)',
        headimgurl: '',
        sex: 0
      };

      // 查找或创建模拟用户
      let user = await User.findOne({ wechatOpenId: mockOpenid });

      if (!user) {
        const userId = generateUserId();
        const randomPassword = await bcrypt.hash(generateUserId(), SALT_ROUNDS);

        user = new User({
          userId,
          // 微信用户不设置 phone，稀疏索引会忽略 undefined
          password: randomPassword,
          nickname: mockUserInfo.nickname,
          avatarUrl: mockUserInfo.headimgurl,
          gender: 'male',
          wechatOpenId: mockOpenid,
          wechatUnionId: null,
          loginType: 'wechat'
        });

        await user.save();
        console.log('✅ 开发模式：微信新用户注册成功:', mockOpenid);
      } else {
        user.lastLogin = new Date();
        await user.save();
        console.log('✅ 开发模式：微信用户登录成功:', mockOpenid);
      }

      const token = generateToken(user);

      return res.json({
        success: true,
        message: '登录成功（开发模式）',
        data: {
          token,
          user: formatUser(user),
          isMock: true
        }
      });
    }

    // 1. 用 code 换取 access_token 和 openid
    const tokenUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${WECHAT_APPID}&secret=${WECHAT_SECRET}&code=${code}&grant_type=authorization_code`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.errcode) {
      console.error('❌ 微信获取 access_token 失败:', tokenData);
      return res.status(400).json({
        success: false,
        message: '微信授权失败: ' + (tokenData.errmsg || '未知错误')
      });
    }

    const { openid, unionid, access_token } = tokenData;
    console.log('✅ 微信获取 access_token 成功, openid:', openid);

    // 2. 获取用户信息
    let wechatUserInfo = null;
    try {
      const userInfoUrl = `https://api.weixin.qq.com/sns/userinfo?access_token=${access_token}&openid=${openid}&lang=zh_CN`;
      const userInfoRes = await fetch(userInfoUrl);
      wechatUserInfo = await userInfoRes.json();

      if (wechatUserInfo.errcode) {
        console.warn('⚠️ 微信获取用户信息失败:', wechatUserInfo);
        wechatUserInfo = null;
      }
    } catch (err) {
      console.warn('⚠️ 微信获取用户信息异常:', err.message);
      wechatUserInfo = null;
    }

    // 3. 查找或创建用户
    let user = await User.findOne({ wechatOpenId: openid });

    if (!user) {
      // 新用户，创建账号
      const userId = generateUserId();
      const randomPassword = await bcrypt.hash(generateUserId(), SALT_ROUNDS);

      user = new User({
        userId,
        // 微信用户不设置 phone，稀疏索引会忽略 undefined，可后续绑定
        password: randomPassword,
        nickname: wechatUserInfo?.nickname || `微信用户${userId.slice(-4)}`,
        avatarUrl: wechatUserInfo?.headimgurl || '',
        gender: wechatUserInfo?.sex === 1 ? 'male' : (wechatUserInfo?.sex === 2 ? 'female' : 'male'),
        wechatOpenId: openid,
        wechatUnionId: unionid || null,
        loginType: 'wechat'
      });

      await user.save();
      console.log('✅ 微信新用户注册成功:', openid);
    } else {
      // 更新用户信息（如果微信返回了新的用户信息）
      if (wechatUserInfo) {
        if (wechatUserInfo.nickname) user.nickname = wechatUserInfo.nickname;
        if (wechatUserInfo.headimgurl) user.avatarUrl = wechatUserInfo.headimgurl;
      }
      user.lastLogin = new Date();
      await user.save();
      console.log('✅ 微信用户登录成功:', openid);
    }

    // 4. 生成 token
    const token = generateToken(user);

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: formatUser(user)
      }
    });

  } catch (error) {
    console.error('❌ 微信登录错误:', error.message);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
};

// 获取用户信息（从 token 中获取）
exports.getProfile = async (req, res) => {
  try {
    console.log('👤 获取用户信息');

    // 从 auth 中间件获取用户信息
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '未登录或登录已过期'
      });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      data: formatUser(user)
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

// 退出登录（JWT 无状态，前端清除 token 即可，此接口仅做记录）
exports.logout = async (req, res) => {
  try {
    console.log('🚪 用户退出登录');
    res.json({
      success: true,
      message: '退出登录成功'
    });
  } catch (error) {
    console.error('❌ 退出登录错误:', error.message);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};
