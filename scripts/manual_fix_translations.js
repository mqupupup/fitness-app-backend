/**
 * 手动修复剩余低质量翻译
 */
const mongoose = require('mongoose');
require('dotenv').config();
const Exercise = require('../models/Exercise');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/gym-fitness-app';

// 手动翻译映射（专业健身术语）
const MANUAL_FIXES = {
  '45° side bend': '45度侧屈',
  'bodyweight squatting row (with towel)': '徒手毛巾深蹲划船',
  'cable low fly': '绳索低位飞鸟',
  'cable rear delt row (stirrups)': '绳索后束划船（马镫把手）',
  'cable rear delt row (with rope)': '绳索后束划船（绳索把手）',
  'cable rear drive': '绳索后踢',
  'cable reverse-grip straight back seated high row': '绳索反握直背坐姿高位划船',
  'cable rope crossover seated row': '绳索交叉坐姿划船',
  'cable rope elevated seated row': '绳索高位坐姿划船',
  'cable rope extension incline bench row': '绳索上斜板凳划船',
  'cable rope hammer preacher curl': '绳索锤式牧师凳弯举',
  'cable squatting curl': '绳索深蹲弯举',
  'cable standing cross-over high reverse fly': '绳索站姿交叉高位反握飞鸟',
  'cable standing inner curl': '绳索站姿内侧弯举',
  'ez barbell curl': 'EZ杆杠铃弯举',
  'ez barbell jm bench press': 'EZ杆JM卧推',
  'ez barbell spider curl': 'EZ杆蜘蛛弯举',
  'landmine 180': '地雷管180度转体',
  'swing 360': '360度摇摆',
  'bottoms-up': '底部推举',
  'body-up': '双杠撑起',
};

async function main() {
  console.log('🔗 连接 MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ 连接成功');

  let updated = 0;
  for (const [nameEn, nameZh] of Object.entries(MANUAL_FIXES)) {
    const result = await Exercise.updateOne(
      { nameEn: nameEn },
      { $set: { nameZh } }
    );
    if (result.modifiedCount > 0) {
      console.log(`✅ ${nameEn} → ${nameZh}`);
      updated++;
    } else {
      console.log(`⚠️  未找到: ${nameEn}`);
    }
  }

  console.log(`\n🎉 手动修复完成! 共更新 ${updated} 个动作`);
  mongoose.disconnect();
}

main().catch(console.error);
