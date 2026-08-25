/**
 * 清理动作名中的空格和英文残留
 * 1. 去掉所有空格
 * 2. 标记有英文残留的动作（需要重新翻译）
 */
const mongoose = require('mongoose');
require('dotenv').config();
const Exercise = require('../models/Exercise');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/gym-fitness-app';

function hasEnglish(text) {
  return /[a-zA-Z]{2,}/.test(text);
}

async function main() {
  console.log('🔗 连接 MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ 连接成功');

  const exercises = await Exercise.find({});
  let cleaned = 0, needRetranslate = 0;

  for (const ex of exercises) {
    if (!ex.nameZh) continue;

    const original = ex.nameZh;
    // 去掉所有空格
    const noSpaces = original.replace(/\s+/g, '');

    if (noSpaces !== original) {
      ex.nameZh = noSpaces;
      await ex.save();
      cleaned++;
    }

    // 检查是否有英文残留（2个以上连续英文字母）
    if (hasEnglish(noSpaces)) {
      needRetranslate++;
    }
  }

  console.log(`\n✅ 清理空格: ${cleaned} 个动作`);
  console.log(`⚠️  仍有英文残留需重新翻译: ${needRetranslate} 个动作`);

  // 列出前20个有英文残留的动作
  const withEnglish = await Exercise.find({ nameZh: { $regex: /[a-zA-Z]{2,}/ } }).limit(20);
  console.log('\n--- 有英文残留的动作 (前20) ---');
  withEnglish.forEach(ex => console.log(`  ${ex.nameEn} → ${ex.nameZh}`));

  await mongoose.disconnect();
}

main().catch(err => { console.error('❌', err); process.exit(1); });
