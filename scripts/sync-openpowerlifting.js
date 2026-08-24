// scripts/sync-openpowerlifting.js
// 从 OpenPowerlifting CSV 同步比赛数据到 MongoDB（流式读取，避免内存溢出）
// 用法：node scripts/sync-openpowerlifting.js <csv文件路径>

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config();

const CompetitionMeet = require('../models/CompetitionMeet');
const CompetitionResult = require('../models/CompetitionResult');

// 批量插入大小
const BATCH_SIZE = 500;

// ==================== CSV 行解析 ====================

/**
 * 解析单行CSV（处理引号包裹、逗号转义）
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}

// ==================== 数据清洗 ====================

/**
 * 判断是否为有效三项成绩
 */
function isValidTotalResult(row) {
  // 检查状态
  const place = row['Place'] || row['place'] || '';
  if (place === 'DQ' || place === 'DD' || place === 'DNS' || place === 'DNF') {
    return false;
  }

  // 检查Total
  const total = parseFloat(row['TotalKg'] || row['Total'] || row['total'] || '');
  if (!total || total <= 0 || isNaN(total)) {
    return false;
  }

  // 检查三项是否都有有效成绩
  const squat = parseFloat(row['Best3SquatKg'] || row['Squat'] || '');
  const bench = parseFloat(row['Best3BenchKg'] || row['Bench'] || '');
  const deadlift = parseFloat(row['Best3DeadliftKg'] || row['Deadlift'] || '');

  if ((!squat || squat <= 0) && (!bench || bench <= 0) && (!deadlift || deadlift <= 0)) {
    return false;
  }

  return true;
}

/**
 * 从行提取比赛信息
 */
function extractMeetInfo(row) {
  const meetName = row['MeetName'] || row['Meet'] || row['Competition'] || 'Unknown Meet';
  const meetDate = row['MeetDate'] || row['Date'] || '';
  const meetTown = row['MeetTown'] || '';
  const meetState = row['MeetState'] || '';
  const meetCountry = row['MeetCountry'] || '';
  const federation = row['Federation'] || row['Fed'] || 'IPF';

  const sourceId = `${federation}-${meetName}-${meetDate}`.replace(/\s+/g, '-').toLowerCase();

  return {
    federation,
    source: 'openpowerlifting',
    sourceId,
    name: meetName,
    date: meetDate ? new Date(meetDate) : new Date(),
    location: [meetTown, meetState].filter(Boolean).join(', '),
    country: meetCountry,
    sourceUrl: ''
  };
}

/**
 * 从行提取成绩信息
 */
function extractResultInfo(row, meetId) {
  const sex = (row['Sex'] || '').toUpperCase();
  const age = parseInt(row['Age'] || '0') || null;
  const division = row['Division'] || row['Event'] || 'Open';
  const equipment = row['Equipment'] || 'Raw';
  const weightClass = row['WeightClassKg'] || row['WeightClass'] || '';
  const bodyweight = parseFloat(row['BodyweightKg'] || row['Bodyweight'] || '') || null;
  const squat = parseFloat(row['Best3SquatKg'] || row['Squat'] || '') || null;
  const bench = parseFloat(row['Best3BenchKg'] || row['Bench'] || '') || null;
  const deadlift = parseFloat(row['Best3DeadliftKg'] || row['Deadlift'] || '') || null;
  const total = parseFloat(row['TotalKg'] || row['Total'] || '') || null;
  const ipfGl = parseFloat(row['GLP'] || row['IPFPoints'] || row['IPFGL'] || '') || null;
  const wilks = parseFloat(row['Wilks'] || row['Wilks2020'] || '') || null;
  const placement = parseInt(row['Place'] || '0') || null;
  const athleteName = row['Name'] || row['Lifter'] || '';

  const placeStr = (row['Place'] || '').toString();
  let status = 'Valid';
  if (placeStr === 'DQ' || placeStr === 'DD') status = 'DQ';
  else if (placeStr === 'DNS') status = 'DNS';
  else if (placeStr === 'DNF') status = 'DNF';

  return {
    meetId,
    federation: row['Federation'] || 'IPF',
    athleteName,
    sex: sex === 'M' || sex === 'F' ? sex : 'M',
    age,
    division,
    equipment,
    weightClass: weightClass.toString(),
    bodyweight,
    squat,
    bench,
    deadlift,
    total,
    ipfGl,
    wilks,
    placement,
    status,
    sourceRecordId: ''
  };
}

// ==================== 主同步逻辑 ====================

async function syncFromCSV(csvFilePath) {
  // 连接数据库
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fitness-app';
  await mongoose.connect(mongoUri);
  console.log('✅ MongoDB 连接成功');

  // 检查文件
  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ 文件不存在: ${csvFilePath}`);
    process.exit(1);
  }

  const fileSize = (fs.statSync(csvFilePath).size / 1024 / 1024).toFixed(1);
  console.log(`📖 读取CSV文件: ${csvFilePath} (${fileSize}MB)`);
  console.log('⏳ 流式处理中，请耐心等待...\n');

  // 创建流式读取
  const fileStream = fs.createReadStream(csvFilePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let headers = null;
  let lineCount = 0;
  let validCount = 0;
  let meetBatch = [];
  let resultBatch = [];
  const meetsMap = new Map(); // sourceId -> meet document

  // 批量写入比赛
  async function flushMeets() {
    if (meetBatch.length === 0) return;
    const ops = meetBatch.map(meet => ({
      updateOne: {
        filter: { federation: meet.federation, sourceId: meet.sourceId },
        update: { $set: meet },
        upsert: true
      }
    }));
    try {
      await CompetitionMeet.bulkWrite(ops, { ordered: false });
    } catch (err) {
      // 忽略重复键错误
    }
    meetBatch = [];
  }

  // 批量写入成绩
  async function flushResults() {
    if (resultBatch.length === 0) return;
    const ops = resultBatch.map(result => ({
      updateOne: {
        filter: {
          meetId: result.meetId,
          athleteName: result.athleteName,
          division: result.division,
          equipment: result.equipment,
          weightClass: result.weightClass
        },
        update: { $set: result },
        upsert: true
      }
    }));
    try {
      await CompetitionResult.bulkWrite(ops, { ordered: false });
    } catch (err) {
      // 忽略重复键错误
    }
    resultBatch = [];
  }

  // 逐行处理
  for await (const line of rl) {
    lineCount++;

    if (!line.trim()) continue;

    const values = parseCSVLine(line);

    // 第一行作为表头
    if (!headers) {
      headers = values.map(h => h.trim());
      console.log(`📋 表头: ${headers.length} 列`);
      console.log(`📋 前几列: ${headers.slice(0, 10).join(', ')}\n`);
      continue;
    }

    // 构建行对象
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ? values[index].trim() : '';
    });

    // 过滤：只保留IPF相关或中国的比赛
    const federation = row['Federation'] || row['Fed'] || '';
    const country = row['MeetCountry'] || '';
    if (!federation.toLowerCase().includes('ipf') && !country.toLowerCase().includes('china')) {
      continue;
    }

    // 数据清洗：只保留有效三项成绩
    if (!isValidTotalResult(row)) {
      continue;
    }

    validCount++;

    // 提取比赛信息
    const meetInfo = extractMeetInfo(row);
    if (!meetsMap.has(meetInfo.sourceId)) {
      meetsMap.set(meetInfo.sourceId, meetInfo);
      meetBatch.push(meetInfo);
    }

    // 先批量写入比赛（需要先有meetId）
    if (meetBatch.length >= BATCH_SIZE) {
      await flushMeets();
    }

    // 查询比赛ID
    let meet = meetsMap.get(meetInfo.sourceId);
    if (!meet._id) {
      const found = await CompetitionMeet.findOne({
        federation: meetInfo.federation,
        sourceId: meetInfo.sourceId
      });
      if (found) {
        meet._id = found._id;
        meetsMap.set(meetInfo.sourceId, meet);
      } else {
        // 立即写入这条比赛
        await flushMeets();
        const found2 = await CompetitionMeet.findOne({
          federation: meetInfo.federation,
          sourceId: meetInfo.sourceId
        });
        if (found2) {
          meet._id = found2._id;
          meetsMap.set(meetInfo.sourceId, meet);
        } else {
          continue;
        }
      }
    }

    // 提取成绩信息
    const resultInfo = extractResultInfo(row, meet._id);
    resultBatch.push(resultInfo);

    // 批量写入成绩
    if (resultBatch.length >= BATCH_SIZE) {
      await flushResults();
    }

    // 进度输出
    if (validCount % 1000 === 0) {
      console.log(`  ⏳ 已处理 ${lineCount} 行，有效成绩 ${validCount} 条...`);
    }
  }

  // 写入剩余数据
  await flushMeets();
  await flushResults();

  console.log(`\n✅ 处理完成!`);
  console.log(`  总行数: ${lineCount}`);
  console.log(`  有效成绩: ${validCount} 条`);

  // 统计
  const totalMeets = await CompetitionMeet.countDocuments();
  const totalResults = await CompetitionResult.countDocuments();
  const validResults = await CompetitionResult.countDocuments({ status: 'Valid', total: { $gt: 0 } });

  console.log(`\n📊 数据库统计:`);
  console.log(`  比赛总数: ${totalMeets}`);
  console.log(`  成绩总数: ${totalResults}`);
  console.log(`  有效成绩: ${validResults}`);

  await mongoose.disconnect();
  console.log('\n✅ 同步完成，数据库连接已关闭');
}

// 主入口
const csvFilePath = process.argv[2];
if (!csvFilePath) {
  console.error('❌ 请指定CSV文件路径');
  console.error('用法: node scripts/sync-openpowerlifting.js <csv文件路径>');
  process.exit(1);
}

syncFromCSV(csvFilePath).catch(err => {
  console.error('❌ 同步失败:', err);
  process.exit(1);
});
