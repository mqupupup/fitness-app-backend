/**
 * 清理动作名中的英文残留和格式问题
 * 1. y- → Y字, t- → T字, v- → V字
 * 2. 去掉中文字符之间的连字符
 * 3. 去掉常见英文缩写
 * 4. 去掉 (male)、(female)、v.2 等括号注释
 */
const mongoose = require('mongoose');
require('dotenv').config();
const Exercise = require('../models/Exercise');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/gym-fitness-app';

function cleanName(name) {
  if (!name) return name;
  let cleaned = name;

  // 1. 字母+连字符 → X字
  cleaned = cleaned.replace(/\by-/gi, 'Y字');
  cleaned = cleaned.replace(/\bt-/gi, 'T字');
  cleaned = cleaned.replace(/\bv-/gi, 'V字');
  cleaned = cleaned.replace(/\bl-/gi, 'L字');
  cleaned = cleaned.replace(/\bx-/gi, 'X字');

  // 2. 去掉中文字符之间的连字符
  cleaned = cleaned.replace(/([\u4e00-\u9fff])-([\u4e00-\u9fff])/g, '$1$2');

  // 3. 去掉括号注释 (male)、(female)、(with towel)、v.2、v.3 等
  cleaned = cleaned.replace(/\([^)]*\)/g, '');
  cleaned = cleaned.replace(/v\.\d+/gi, '');
  cleaned = cleaned.replace(/v\d+/gi, '');

  // 4. 去掉末尾的连字符
  cleaned = cleaned.replace(/-+$/g, '');

  // 5. 去掉多余空格
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

async function main() {
  console.log('🔗 连接 MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ 连接成功');

  const exercises = await Exercise.find({});
  let cleaned = 0;

  for (const ex of exercises) {
    if (!ex.nameZh) continue;
    const original = ex.nameZh;
    const cleanedName = cleanName(original);
    if (cleanedName !== original) {
      console.log(`  ${original} → ${cleanedName}`);
      ex.nameZh = cleanedName;
      await ex.save();
      cleaned++;
    }
  }

  console.log(`\n✅ 共清理 ${cleaned} 个动作名`);
  await mongoose.disconnect();
}

main().catch(err => { console.error('❌', err); process.exit(1); });
