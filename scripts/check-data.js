// scripts/check-data.js
// 检查数据库中的比赛数据情况
const mongoose = require('mongoose');
require('dotenv').config();

const CompetitionMeet = require('../models/CompetitionMeet');
const CompetitionResult = require('../models/CompetitionResult');

async function checkData() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fitness-app';
  await mongoose.connect(mongoUri);
  console.log('✅ MongoDB 连接成功\n');

  // 统计比赛数量
  const meetCount = await CompetitionMeet.countDocuments();
  console.log(`📊 比赛总数: ${meetCount}`);

  // 统计成绩总数
  const resultCount = await CompetitionResult.countDocuments();
  console.log(`📊 成绩总数: ${resultCount}`);

  // 统计有效成绩
  const validCount = await CompetitionResult.countDocuments({ status: 'Valid', total: { $gt: 0 } });
  console.log(`📊 有效成绩数: ${validCount}`);

  if (resultCount > 0) {
    // 查看federation分布
    console.log('\n📋 Federation 分布:');
    const federations = await CompetitionResult.aggregate([
      { $group: { _id: '$federation', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    federations.forEach(f => console.log(`  ${f._id}: ${f.count}`));

    // 查看equipment分布
    console.log('\n📋 Equipment 分布:');
    const equipments = await CompetitionResult.aggregate([
      { $group: { _id: '$equipment', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    equipments.forEach(e => console.log(`  ${e._id}: ${e.count}`));

    // 查看sex分布
    console.log('\n📋 Sex 分布:');
    const sexes = await CompetitionResult.aggregate([
      { $group: { _id: '$sex', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    sexes.forEach(s => console.log(`  ${s._id}: ${s.count}`));

    // 查看weightClass分布
    console.log('\n📋 WeightClass 分布（前10）:');
    const weightClasses = await CompetitionResult.aggregate([
      { $group: { _id: '$weightClass', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    weightClasses.forEach(w => console.log(`  ${w._id}: ${w.count}`));

    // 查看division分布
    console.log('\n📋 Division 分布（前10）:');
    const divisions = await CompetitionResult.aggregate([
      { $group: { _id: '$division', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    divisions.forEach(d => console.log(`  ${d._id}: ${d.count}`));

    // 查看一条样例数据
    console.log('\n📋 样例数据:');
    const sample = await CompetitionResult.findOne({ status: 'Valid', total: { $gt: 0 } });
    if (sample) {
      console.log(JSON.stringify(sample.toObject(), null, 2));
    }
  }

  await mongoose.disconnect();
  console.log('\n✅ 检查完成');
}

checkData().catch(err => {
  console.error('❌ 检查失败:', err);
  process.exit(1);
});
