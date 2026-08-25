const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/gym-fitness-app').then(async () => {
  const Exercise = require('../models/Exercise');
  
  // 修复所有 ez barbell spider curl
  const r1 = await Exercise.updateMany(
    { nameEn: 'ez barbell spider curl' },
    { $set: { nameZh: 'EZ杆蜘蛛弯举' } }
  );
  console.log('ez barbell spider curl:', r1.modifiedCount, '条已更新');
  
  // 检查是否还有英文残留的（排除 EZ杆 这种约定俗成的）
  const remaining = await Exercise.find({ nameZh: /[a-zA-Z]{2,}/ });
  console.log('仍有英文残留的动作:', remaining.length, '个');
  remaining.forEach(ex => console.log('  -', ex.nameEn, '→', ex.nameZh));
  
  mongoose.disconnect();
});
