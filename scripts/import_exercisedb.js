/**
 * 导入 ExerciseDB 数据集 (hasaneyldrm/exercises-dataset / Johnson-Jia 中文备份)
 *
 * 数据源:
 *   - JSON: https://cdn.jsdelivr.net/gh/Johnson-Jia/exercises-dataset@main/data/exercises.json
 *   - GIF:  https://cdn.jsdelivr.net/gh/Johnson-Jia/exercises-dataset@main/media/{media_id}.gif
 *
 * 功能:
 *   1. 拉取 1324 个动作的完整元数据 (含中文说明)
 *   2. 下载所有 GIF 到 public/exercises/{exerciseId}/animation.gif
 *   3. 映射到 Exercise 模型, 清空旧数据批量导入
 *   4. 支持断点续传 (已下载的 GIF 跳过)
 *
 * 用法: node scripts/import_exercisedb.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const mongoose = require('mongoose');
require('dotenv').config();

const Exercise = require('../models/Exercise');
const Media = require('../models/Media');

// ---- 配置 ----
const JSON_URL = 'https://cdn.jsdelivr.net/gh/Johnson-Jia/exercises-dataset@main/data/exercises.json';
const GIF_BASE = 'https://cdn.jsdelivr.net/gh/Johnson-Jia/exercises-dataset@main/media';
const PUBLIC_DIR = path.join(__dirname, '..', 'public', 'exercises');
const CONCURRENCY = 8; // 并发下载数
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/gym-fitness-app';

// ---- 分类映射 ----
const CATEGORY_MAP = {
  'waist': 'core',
  'upper arms': 'arms',
  'upper legs': 'legs',
  'chest': 'chest',
  'back': 'back',
  'shoulders': 'shoulders',
  'lower legs': 'legs',
  'forearms': 'arms',
  'cardio': 'cardio',
  'neck': 'other',
  'hips': 'legs',
  'glutes': 'legs',
};

// ---- 器械映射 ----
const EQUIPMENT_MAP = {
  'body weight': 'bodyweight',
  'dumbbell': 'dumbbell',
  'barbell': 'barbell',
  'cable': 'cable',
  'kettlebell': 'kettlebell',
  'band': 'band',
  'smith machine': 'smith',
  'ez barbell': 'ez_bar',
  'lever machine': 'machine',
  'machine': 'machine',
  'stability ball': 'other',
  'weighted': 'other',
  'other': 'other',
};

// ---- 工具函数 ----
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 80);
}

// 生成唯一 exerciseId, 冲突时加 _2 _3 后缀
const usedIds = new Set();
function uniqueExerciseId(name) {
  let base = slugify(name) || 'exercise';
  let id = base;
  let n = 2;
  while (usedIds.has(id)) {
    id = `${base}_${n}`;
    n++;
  }
  usedIds.add(id);
  return id;
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJSON(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function downloadFile(url, destPath, retries = 3) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      const file = fs.createWriteStream(destPath);
      https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          fs.unlink(destPath, () => {});
          return downloadFile(res.headers.location, destPath, n).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          file.close();
          fs.unlink(destPath, () => {});
          if (n > 0) return setTimeout(() => attempt(n - 1), 1000);
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve()));
      }).on('error', (err) => {
        file.close();
        fs.unlink(destPath, () => {});
        if (n > 0) setTimeout(() => attempt(n - 1), 1000);
        else reject(err);
      });
    };
    attempt(retries);
  });
}

async function downloadWithConcurrency(items, concurrency, worker) {
  const results = [];
  let index = 0;
  async function workerLoop() {
    while (index < items.length) {
      const i = index++;
      try {
        results[i] = await worker(items[i], i);
      } catch (e) {
        results[i] = { error: e.message };
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => workerLoop()));
  return results;
}

// ---- 主流程 ----
async function main() {
  console.log('📥 拉取 ExerciseDB exercises.json...');
  const exercises = await fetchJSON(JSON_URL);
  console.log(`✅ 共 ${exercises.length} 个动作`);

  console.log('🔗 连接 MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ 连接成功');

  // 确保目录存在
  if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

  // 统计
  let downloaded = 0, skipped = 0, failed = 0;
  const exerciseDocs = [];
  const mediaDocs = [];

  console.log(`\n⬇️  开始下载 GIF (并发 ${CONCURRENCY})...`);

  await downloadWithConcurrency(exercises, CONCURRENCY, async (ex, idx) => {
    const exerciseId = uniqueExerciseId(ex.name);
    const dir = path.join(PUBLIC_DIR, exerciseId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const gifPath = path.join(dir, 'animation.gif');
    const gifUrl = `${GIF_BASE}/${ex.media_id}.gif`;

    // 下载 GIF
    if (fs.existsSync(gifPath) && fs.statSync(gifPath).size > 1000) {
      skipped++;
    } else {
      try {
        await downloadFile(gifUrl, gifPath);
        downloaded++;
      } catch (e) {
        failed++;
        console.log(`  ❌ [${idx + 1}/${exercises.length}] ${ex.name}: ${e.message}`);
        return;
      }
    }

    // 映射分类
    const category = CATEGORY_MAP[ex.category?.toLowerCase()] || 'other';
    const equipment = EQUIPMENT_MAP[ex.equipment?.toLowerCase()] || 'other';

    // 中文说明
    const instructionsZh = ex.instruction_steps?.zh ||
      (ex.instructions?.zh ? ex.instructions.zh.split(/[。.!?！？]/).filter(s => s.trim()) : []);
    const instructionsEn = ex.instruction_steps?.en || [];

    // 肌群
    const primaryMuscles = ex.target ? [ex.target.toLowerCase().replace(/\s+/g, '_')] : [];
    const secondary = new Set();
    if (ex.muscle_group) secondary.add(ex.muscle_group.toLowerCase().replace(/\s+/g, '_'));
    (ex.secondary_muscles || []).forEach(m => secondary.add(m.toLowerCase().replace(/\s+/g, '_')));
    const secondaryMuscles = [...secondary].filter(m => !primaryMuscles.includes(m));

    // 创建 Media 记录
    const media = new Media({
      mediaId: `${exerciseId}_animation_v1`,
      exerciseId,
      type: 'animation',
      format: 'gif',
      url: `/exercises/${exerciseId}/animation.gif`,
      path: `exercises/${exerciseId}/animation.gif`,
      provider: 'exercisedb',
      licenseType: 'proprietary',
      attributionRequired: true,
      attributionText: '© Gym visual — https://gymvisual.com/',
      width: 180,
      height: 180,
      fileSize: fs.existsSync(gifPath) ? fs.statSync(gifPath).size : 0,
      isPrimary: true,
    });
    mediaDocs.push(media);

    // 创建 Exercise 记录
    const doc = {
      exerciseId,
      repdbId: ex.media_id, // 复用字段存 media_id
      nameZh: ex.name, // 先用英文名, 后续补中文映射
      nameEn: ex.name,
      aliases: [],
      description: ex.instructions?.zh?.substring(0, 200) || '',
      descriptionEn: ex.instructions?.en?.substring(0, 200) || '',
      category,
      bodyPart: ex.body_part || ex.category || '',
      movementPattern: 'other',
      forceType: 'other',
      mechanic: 'other',
      equipment,
      difficulty: 'intermediate',
      goals: [],
      met: null,
      isUnilateral: false,
      isBodyweight: equipment === 'bodyweight',
      primaryMuscles,
      secondaryMuscles,
      instructions: instructionsZh,
      instructionsEn,
      tips: [],
      tipsEn: [],
      media: {
        thumbnail: media._id,
        startPose: null,
        peakPose: null,
        animation: media._id,
        video: null,
      },
      trackingConfig: { enabled: false },
      isActive: true,
      sortOrder: idx,
    };
    exerciseDocs.push(doc);

    if ((idx + 1) % 100 === 0) {
      console.log(`  [${idx + 1}/${exercises.length}] 已处理, 下载 ${downloaded}, 跳过 ${skipped}, 失败 ${failed}`);
    }
  });

  console.log(`\n✅ GIF 下载完成: 新下载 ${downloaded}, 已存在 ${skipped}, 失败 ${failed}`);

  // 清空旧数据
  console.log('🗑️  清空旧动作和媒体数据...');
  await Exercise.deleteMany({});
  await Media.deleteMany({});
  console.log('✅ 已清空');

  // 批量插入
  console.log(`💾 写入 ${mediaDocs.length} 条媒体记录...`);
  await Media.insertMany(mediaDocs);

  console.log(`💾 写入 ${exerciseDocs.length} 条动作记录...`);
  await Exercise.insertMany(exerciseDocs);

  // 统计
  const catStats = {};
  exerciseDocs.forEach(d => { catStats[d.category] = (catStats[d.category] || 0) + 1; });

  console.log('\n' + '='.repeat(60));
  console.log('🎉 ExerciseDB 导入完成!');
  console.log(`   动作总数: ${exerciseDocs.length}`);
  console.log(`   媒体总数: ${mediaDocs.length}`);
  console.log(`   GIF 下载: ${downloaded} 新下载, ${skipped} 已存在, ${failed} 失败`);
  console.log(`   分类统计:`);
  Object.entries(catStats).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`     ${k}: ${v}`);
  });
  console.log(`⚠️  署名: 请在 App 关于页添加 "Exercise media © Gym visual (gymvisual.com)"`);
  console.log('='.repeat(60));

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('❌ 导入失败:', err);
  process.exit(1);
});
