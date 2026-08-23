const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// 公开接口（不需要登录）
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/wechat-login', authController.wechatLogin);

// 需要登录的接口
router.get('/profile', authMiddleware, authController.getProfile);
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;
