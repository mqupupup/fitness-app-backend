/**
 * 手动修复 EZ 杆相关动作的低质量翻译
 */
const mongoose = require('mongoose');
require('dotenv').config();
const Exercise = require('../models/Exercise');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/gym-fitness-app';

const MANUAL_FIXES = {
  'ez barbell jm bench press': 'EZ杆JM卧推',
  'ez-bar biceps curl (with arm blaster)': 'EZ杆二头弯举（带臂托）',
  'ez bar reverse grip bent over row': 'EZ杆反握俯身划船',
  'ez bar seated close grip concentration curl': 'EZ杆坐姿窄握集中弯举',
  'ez barbell curl': 'EZ杆杠铃弯举',
  'ez bar french press on exercise ball': 'EZ杆健身球法式推举',
  'ez bar standing french press': 'EZ杆站姿法式推举',
  'ez-bar close-grip bench press': 'EZ杆窄距卧推',
  'ez barbell spider curl': 'EZ杆蜘蛛弯举',
  'ez bar lying close grip triceps extension behind head': 'EZ杆仰卧窄握颈后三头伸展',
  'ez-barbell standing wide grip biceps curl': 'EZ杆站姿宽握二头弯举',
  'ez bar lying bent arms pullover': 'EZ杆仰卧屈臂上拉',
  'ez barbell decline triceps extension': 'EZ杆下斜三头伸展',
  'ez barbell decline close grip face press': 'EZ杆下斜窄握面部推举',
  'ez barbell reverse grip preacher curl': 'EZ杆反握牧师凳弯举',
  'ez barbell reverse grip curl': 'EZ杆反握弯举',
  'ez barbell anti gravity press': 'EZ杆反重力推举',
  'ez barbell seated triceps extension': 'EZ杆坐姿三头伸展',
  'ez barbell seated curls': 'EZ杆坐姿弯举',
  'ez barbell incline triceps extension': 'EZ杆上斜三头伸展',
  'ez barbell close grip preacher curl': 'EZ杆窄握牧师凳弯举',
  'ez barbell close-grip curl': 'EZ杆窄握弯举',
};

async function main() {
  console.log('🔗 连接 MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ 连接成功');

  let updated = 0;
  for (const [nameEn, nameZh] of Object.entries(MANUAL_FIXES)) {
    const result = await Exercise.updateMany(
      { nameEn: nameEn },
      { $set: { nameZh } }
    );
    if (result.modifiedCount > 0) {
      console.log(`✅ ${nameEn} → ${nameZh} (${result.modifiedCount}条)`);
      updated += result.modifiedCount;
    } else {
      console.log(`⚠️  未找到: ${nameEn}`);
    }
  }

  // 检查是否还有英文残留
  const remaining = await Exercise.find({ nameZh: /[a-zA-Z]{2,}/ });
  console.log(`\n仍有英文残留的动作: ${remaining.length} 个`);
  remaining.forEach(ex => console.log('  -', ex.nameEn, '→', ex.nameZh));

  console.log(`\n🎉 手动修复完成! 共更新 ${updated} 条记录`);
  mongoose.disconnect();
}

main().catch(console.error);
