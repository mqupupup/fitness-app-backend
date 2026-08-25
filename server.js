require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// 数据库连接（添加错误处理）
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB 连接成功');
  } catch (error) {
    console.error('❌ MongoDB 连接失败:', error.message);
    process.exit(1);
  }
};

connectDB();

// 中间件
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:19006',
  credentials: true
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务
const uploadDir = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadDir));

// 动作库图片静态服务 (RepDB 素材)
const exercisesDir = path.join(__dirname, 'public', 'exercises');
app.use('/exercises', express.static(exercisesDir));

// 确保上传目录存在
const fs = require('fs');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 路由 - 确保正确导入
try {
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/fitness', require('./routes/fitness'));
  app.use('/api/powerlifting', require('./routes/powerlifting'));
  app.use('/api/exercises', require('./routes/exercises'));

} catch (error) {
  console.error('❌ 路由导入失败:', error.message);
  process.exit(1);
}

// 健康检查
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: '健身App API服务正常运行',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth/register, /api/auth/login, /api/auth/profile',
      fitness: '/api/fitness/standards, /api/fitness/assess',
      powerlifting: '/api/powerlifting/evaluate, /api/powerlifting/level'
    }
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '请求的资源不存在',
    path: req.originalUrl
  });
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('🚨 全局错误:', err.stack || err.message);
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 启动服务器
// const server = app.listen(port, () => {
  // console.log(`🚀 健身App API服务启动在 http://localhost:${port}`);
  // console.log(`🔐 认证接口: http://localhost:${port}/api/auth`);
  // console.log(`💪 健身接口: http://localhost:${port}/api/fitness`);
  // console.log(`🏋️  力量举接口: http://localhost:${port}/api/powerlifting/evaluate`);
  const server = app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 健身App API服务启动在 http://0.0.0.0:${port}`);
  console.log(`🔐 认证接口: http://0.0.0.0:${port}/api/auth`);
  console.log(`💪 健身接口: http://0.0.0.0:${port}/api/fitness`);
  console.log(`🏋️  力量举接口: http://0.0.0.0:${port}/api/powerlifting/evaluate`);
});

// 优雅关闭
process.on('SIGINT', () => {
  server.close(() => {
    console.log('🛑 服务器已关闭');
    mongoose.connection.close(() => {
      console.log('🛑 MongoDB 连接已关闭');
      process.exit(0);
    });
  });
});