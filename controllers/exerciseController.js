const Exercise = require('../models/Exercise');
const Media = require('../models/Media');

/**
 * 动作库 Controller
 * 提供动作列表、详情、搜索、分类筛选等接口
 * 媒体资产通过 populate 关联返回, 不内嵌
 */

// GET /api/exercises - 动作列表 (支持分类筛选+搜索+分页)
exports.listExercises = async (req, res) => {
  try {
    const {
      category,
      equipment,
      movementPattern,
      difficulty,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const filter = { isActive: true };

    if (category) filter.category = category;
    if (equipment) filter.equipment = equipment;
    if (movementPattern) filter.movementPattern = movementPattern;
    if (difficulty) filter.difficulty = difficulty;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    let exercises, total;

    if (search) {
      // 搜索模式: 用聚合管道按相关性排序
      const searchLower = search.toLowerCase().trim();
      const searchWords = searchLower.split(/\s+/).filter(w => w.length > 0);
      const searchRegex = new RegExp(search, 'i');

      // 构建单词匹配条件
      const wordMatchConditions = searchWords.map(word => ({
        $regexMatch: { input: { $toLower: '$nameEn' }, regex: `\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, options: 'i' }
      }));

      const matchFilter = {
        ...filter,
        $or: [
          { nameZh: searchRegex },
          { nameEn: searchRegex },
          { aliases: searchRegex },
        ],
      };

      const pipeline = [
        { $match: matchFilter },
        {
          $addFields: {
            relevanceScore: {
              $sum: [
                // nameEn 精确匹配
                { $cond: [{ $eq: [{ $toLower: '$nameEn' }, searchLower] }, 200, 0] },
                // nameZh 精确匹配
                { $cond: [{ $eq: ['$nameZh', search] }, 180, 0] },
                // 单词匹配数量 (每个匹配的单词 +30)
                ...wordMatchConditions.map(cond => ({ $cond: [cond, 30, 0] })),
                // 短语连续匹配 (搜索词作为完整短语出现在名字中)
                { $cond: [{ $regexMatch: { input: { $toLower: '$nameEn' }, regex: searchLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), options: 'i' } }, 25, 0] },
                // 名字较短的加分 (越短越可能是核心动作)
                { $cond: [{ $lte: [{ $strLenCP: '$nameEn' }, 25] }, 10, 0] },
                // nameEn 前缀匹配
                { $cond: [{ $regexMatch: { input: '$nameEn', regex: `^${search}`, options: 'i' } }, 50, 0] },
                // nameZh 前缀匹配
                { $cond: [{ $regexMatch: { input: '$nameZh', regex: `^${search}` } }, 40, 0] },
                // nameEn 包含匹配
                { $cond: [{ $regexMatch: { input: '$nameEn', regex: search, options: 'i' } }, 20, 0] },
                // nameZh 包含匹配
                { $cond: [{ $regexMatch: { input: '$nameZh', regex: search } }, 15, 0] },
                // aliases 匹配
                { $cond: [{ $gt: [{ $size: { $filter: { input: '$aliases', as: 'a', cond: { $regexMatch: { input: '$$a', regex: search, options: 'i' } } } } }, 0] }, 10, 0] },
              ],
            },
          },
        },
        { $sort: { relevanceScore: -1, nameZh: 1 } },
        { $skip: skip },
        { $limit: limitNum },
        {
          $lookup: {
            from: 'media',
            localField: 'media.thumbnail',
            foreignField: '_id',
            as: 'thumbnailMedia',
          },
        },
        {
          $addFields: {
            'media.thumbnail': { $arrayElemAt: ['$thumbnailMedia', 0] },
          },
        },
        {
          $project: {
            trackingConfig: 0,
            instructions: 0,
            tips: 0,
            __v: 0,
            thumbnailMedia: 0,
          },
        },
      ];

      [exercises, total] = await Promise.all([
        Exercise.aggregate(pipeline),
        Exercise.countDocuments(matchFilter),
      ]);
    } else {
      // 非搜索模式: 按 sortOrder 排序
      [exercises, total] = await Promise.all([
        Exercise.find(filter)
          .sort({ sortOrder: 1, nameZh: 1 })
          .skip(skip)
          .limit(limitNum)
          .populate('media.thumbnail', 'url path format width height')
          .select('-trackingConfig -instructions -tips -__v')
          .lean(),
        Exercise.countDocuments(filter),
      ]);
    }

    res.json({
      success: true,
      data: exercises,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('获取动作列表失败:', error);
    res.status(500).json({ success: false, message: '获取动作列表失败' });
  }
};

// GET /api/exercises/:exerciseId - 动作详情 (含全部媒体和教学内容)
exports.getExercise = async (req, res) => {
  try {
    const { exerciseId } = req.params;

    const exercise = await Exercise.findOne({ exerciseId, isActive: true })
      .populate('media.thumbnail', 'url path format width height duration')
      .populate('media.startPose', 'url path format width height')
      .populate('media.peakPose', 'url path format width height')
      .populate('media.animation', 'url path format width height duration')
      .populate('media.video', 'url path format width height duration')
      .lean();

    if (!exercise) {
      return res.status(404).json({ success: false, message: '动作不存在' });
    }

    res.json({ success: true, data: exercise });
  } catch (error) {
    console.error('获取动作详情失败:', error);
    res.status(500).json({ success: false, message: '获取动作详情失败' });
  }
};

// GET /api/exercises/categories - 获取所有分类及动作数量
exports.getCategories = async (req, res) => {
  try {
    const categories = await Exercise.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const categoryLabels = {
      chest: '胸部',
      back: '背部',
      legs: '腿部',
      shoulders: '肩部',
      arms: '手臂',
      core: '核心',
      cardio: '有氧',
      other: '其他',
    };

    const result = categories.map((c) => ({
      key: c._id,
      label: categoryLabels[c._id] || c._id,
      count: c.count,
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('获取分类失败:', error);
    res.status(500).json({ success: false, message: '获取分类失败' });
  }
};

// POST /api/exercises - 新建动作 (管理用)
exports.createExercise = async (req, res) => {
  try {
    const exercise = new Exercise(req.body);
    await exercise.save();
    res.status(201).json({ success: true, data: exercise });
  } catch (error) {
    console.error('创建动作失败:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /api/exercises/:exerciseId - 更新动作 (管理用)
exports.updateExercise = async (req, res) => {
  try {
    const exercise = await Exercise.findOneAndUpdate(
      { exerciseId: req.params.exerciseId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!exercise) {
      return res.status(404).json({ success: false, message: '动作不存在' });
    }
    res.json({ success: true, data: exercise });
  } catch (error) {
    console.error('更新动作失败:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// GET /api/exercises/:exerciseId/media - 获取动作的全部媒体资产 (含授权信息)
exports.getExerciseMedia = async (req, res) => {
  try {
    const media = await Media.find({
      exerciseId: req.params.exerciseId,
      isActive: true,
    }).sort({ type: 1, version: -1 });

    res.json({ success: true, data: media });
  } catch (error) {
    console.error('获取媒体失败:', error);
    res.status(500).json({ success: false, message: '获取媒体失败' });
  }
};
