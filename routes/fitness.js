const express = require('express');
const router = express.Router();
const fitnessController = require('../controllers/fitnessController');

// 力量标准数据（完整数据库，含按体重+按年龄双维度）
router.get('/standards', fitnessController.standards);
router.get('/standards/:gender/:exercise', fitnessController.standardByExercise);

// 力量水平评估（核心接口，支持单项或多项评估）
router.post('/assess', fitnessController.assess);

module.exports = router;
