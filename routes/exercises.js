const express = require('express');
const router = express.Router();
const exerciseController = require('../controllers/exerciseController');

// 公开接口
router.get('/', exerciseController.listExercises);
router.get('/categories', exerciseController.getCategories);
router.get('/:exerciseId', exerciseController.getExercise);
router.get('/:exerciseId/media', exerciseController.getExerciseMedia);

// 管理接口 (后续加 auth middleware)
router.post('/', exerciseController.createExercise);
router.put('/:exerciseId', exerciseController.updateExercise);

module.exports = router;
