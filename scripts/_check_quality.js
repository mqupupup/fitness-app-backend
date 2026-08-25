const mongoose = require('mongoose');
require('dotenv').config();
const Exercise = require('../models/Exercise');

function chineseRatio(name) {
  if (!name) return 0;
  const chineseChars = (name.match(/[\u4e00-\u9fff]/g) || []).length;
  const total = name.replace(/\s/g, '').length;
  return total > 0 ? chineseChars / total : 0;
}

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/gym-fitness-app').then(async () => {
  const all = await Exercise.find({}).sort({ sortOrder: 1 });
  let highQuality = 0, lowQuality = 0, untranslated = 0;
  const lowQualityList = [], untranslatedList = [];

  for (const ex of all) {
    const ratio = chineseRatio(ex.nameZh);
    if (!ex.nameZh || ex.nameZh === ex.nameEn) {
      untranslated++;
      untranslatedList.push(`[${ex.category}] ${ex.nameEn}`);
    } else if (ratio >= 0.7) {
      highQuality++;
    } else {
      lowQuality++;
      lowQualityList.push(`[${ex.category}] ${ex.nameEn} → ${ex.nameZh} (中文比例: ${(ratio*100).toFixed(0)}%)`);
    }
  }

  console.log('=== 翻译质量统计 (70% 阈值) ===');
  console.log(`总数: ${all.length}`);
  console.log(`✅ 高质量翻译: ${highQuality}`);
  console.log(`⚠️  低质量翻译: ${lowQuality}`);
  console.log(`❌ 未翻译: ${untranslated}`);
  console.log('');

  if (lowQualityList.length > 0) {
    console.log(`--- 低质量翻译 (前30) ---`);
    lowQualityList.slice(0, 30).forEach(l => console.log('  ' + l));
    console.log('');
  }

  if (untranslatedList.length > 0) {
    console.log(`--- 未翻译 (前30) ---`);
    untranslatedList.slice(0, 30).forEach(l => console.log('  ' + l));
  }

  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
