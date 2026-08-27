/**
 * 修复低质量机翻的动作名
 * 1. 用黑名单词筛出低级直译机翻（印刷机/苍蝇/卷发/打嗝等）
 * 2. 用 ox-alpha + 完整健身术语表重翻
 * 3. 翻译结果过双重校验：黑名单 + 英文残留
 * 4. 固化到 data/exercise_zh_map.json 作为长期资产
 */
const mongoose = require('mongoose');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Exercise = require('./../models/Exercise');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OXALPHA_MODEL = 'z-ai/glm-5.3-flash';
const BATCH_SIZE = 5;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/gym-fitness-app';
const MAP_FILE = path.join(__dirname, '..', 'data', 'exercise_zh_map.json');

// 低级机翻特征词黑名单（专业健身翻译绝不该出现的完整词组）
const BAD_WORDS = [
  '印刷机', '压力机', '出版社', '印刷', '按压器',
  '苍蝇', '飞在', '飞上', '飞翔',
  '卷发', '卷发器', '卷曲', '卷曲器',
  '打嗝', '清洁', '升降机', '耸耸肩', '回扣', '弓步', '蘸酱',
  '农民', '传教士', '蜷缩', '蜷',
  '斜排', '凸起', '提犊', '长凳', '凳子', '僵腿', '抓握',
  '压机', '压床', '举升', '斜凳', '后蝇', '前凸', '锤压',
  '倒转', '反转', '躺着', '躺式', '横锤', '横身', '浓缩', '高卷',
  '蹲在', '弯曲在', '弓步与', '躺在地', '坐锤', '站锤', '中性握',
  '满罐', '侧升', '横举', '斜倾', '臂式爆破器', '爆破器',
  '步进', '举起', '上扬', '升压', '加速',
];

// 硬伤词（用于报告）
const HARD_BAD = ['印刷机', '压力机', '苍蝇', '卷发', '打嗝', '清洁', '升降机', '耸耸肩', '回扣', '弓步', '蘸酱', '农民', '传教士', '出版社', '长凳', '躺', '凸起', '提犊'];

const SYSTEM_PROMPT = `你是健身领域专业翻译。将英文健身动作名翻译成中文健身圈约定俗成的标准译名。

【核心术语对照表（必须严格遵守）】
器械：Barbell=杠铃, Dumbbell=哑铃, Kettlebell=壶铃, Cable=绳索, Machine=器械, Bodyweight=徒手, Smith=史密斯, EZ Bar=EZ杆, Band=弹力带, Trap Bar=六角杠, Landmine=地雷管, Ab Wheel=健腹轮, Exercise Ball=健身球, Stability Ball=瑞士球, Bosu Ball=波速球, Foam Roller=泡沫轴, Roller=滚轮, Towel=毛巾, Tennis Ball=网球, Wall=墙, Bench=板凳, Parallel Bar=双杠, Rings=吊环, Rope=绳索, Sled=雪橇, Sandbag=沙袋, Medicine Ball=药球, Sledgehammer=大锤, Battling Ropes=战绳, Battle Ropes=战绳, Arm Blaster=臂托

动作模式：Press=推举, Push=推, Pull=拉, Row=划船, Curl=弯举, Extension=伸展, Raise=平举, Fly=飞鸟, Squat=深蹲, Deadlift=硬拉, Lunge=箭步蹲, Pushdown=下压, Pulldown=下拉, Crunch=卷腹, Sit-up=仰卧起坐, Plank=平板支撑, Stretch=拉伸, Bridge=桥, Thrust=推, Kickback=后踢, Shrug=耸肩, Rollout=轮推出, Clean=高翻, Snatch=抓举, Jerk=挺, Swing=摇摆, Jump=跳, Hold=保持, Twist=转体, Rotation=旋转, Bend=屈, Dip=臂屈伸, Pull-up=引体向上, Chin-up=反握引体向上, Muscle-up=双力臂, Handstand=手倒立, Planche=俄挺, Front Lever=前水平, Back Lever=后水平, L-sit=L字支撑, Wall Sit=靠墙静蹲, Walk=行走, Crawl=爬行, Carry=携带, Farmer's Walk=农夫行走, Turkish Get Up=土耳其起立, Windmill=风车, Get Up=起立, Press-up=俯卧撑, Press up=俯卧撑, Pullover=上拉, Hip Lift=臀桥, Hip Extension=髋伸展, Hip Flexor=髋屈肌, Glute Bridge=臀桥, Step-up=踏板/登阶, Clean and Press=高翻推举, Pin Press=锁定推举, Rack Pull=架上拉, Rollout=轮推出

修饰语：Incline=上斜, Decline=下斜, Flat=平板, Seated=坐姿, Standing=站姿, Lying=仰卧, Prone=俯卧, Supine=仰卧, Bent Over=俯身, Bent-over=俯身, Bent Arm=屈臂, Bent-arm=屈臂, Straight Arm=直臂, Straight-arm=直臂, Stiff Leg=直腿, Stiff-leg=直腿, Single Leg=单腿, Single-leg=单腿, One Leg=单腿, One Arm=单臂, Single Arm=单臂, Double=双, Alternating=交替, Alternate=交替, Reverse=反握, Reverse Grip=反握, Close Grip=窄握, Close-grip=窄握, Wide Grip=宽握, Wide-grip=宽握, Neutral Grip=对握, Underhand=反握, Overhand=正握, Hammer=锤式, Cheat=借力, Concentration=集中, Preacher=牧师凳, Spider=蜘蛛, Cross Body=跨体, Skull Crusher=碎颅者, Face Pull=面拉, Lat Pulldown=高位下拉, Upright Row=直立划船, Front Raise=前平举, Lateral Raise=侧平举, Rear Delt Fly=俯身飞鸟, Shoulder Press=肩推, Overhead Press=站姿肩推, Military Press=军推, Arnold Press=阿诺德推举, Push Press=借力推, Behind The Neck Press=颈后推举, Landmine Press=地雷管推举, Front Squat=前蹲, Back Squat=颈后深蹲, Goblet Squat=高脚杯深蹲, Box Squat=箱式深蹲, Hack Squat=哈克深蹲, Bulgarian Split Squat=保加利亚分腿蹲, Reverse Lunge=反向箭步蹲, Walking Lunge=行走箭步蹲, Side Lunge=侧箭步蹲, Romanian Deadlift=罗马尼亚硬拉, Sumo Deadlift=相扑硬拉, Conventional Deadlift=传统硬拉, Deficit Deadlift=赤字硬拉, Pause Deadlift=停顿硬拉, Trap Bar Deadlift=六角杠硬拉, Stiff Leg Deadlift=直腿硬拉, Good Morning=早安式, Hip Thrust=臀推, Leg Press=腿举, Leg Extension=腿屈伸, Leg Curl=腿弯举, Calf Raise=提踵, Standing Calf Raise=站姿提踵, Seated Calf Raise=坐姿提踵, Donkey Calf Raise=驴式提踵, Nordic Hamstring Curl=北欧腿弯举, Bench Press=卧推, Dumbbell Bench Press=哑铃卧推, Incline Bench Press=上斜卧推, Decline Bench Press=下斜卧推, Close Grip Bench Press=窄距卧推, Wide Grip Bench Press=宽距卧推, Floor Press=地板卧推, Dumbbell Fly=哑铃飞鸟, Cable Fly=绳索夹胸, Chest Press Machine=器械推胸, Push Up=俯卧撑, Dip=双杠臂屈伸, Barbell Curl=杠铃弯举, Dumbbell Curl=哑铃弯举, Bicep Curl=哑铃弯举, Hammer Curl=锤式弯举, Preacher Curl=牧师凳弯举, Concentration Curl=集中弯举, Reverse Curl=反握弯举, Spider Curl=蜘蛛弯举, Cheat Curl=借力弯举, Incline Dumbbell Curl=上斜哑铃弯举, Tricep Pushdown=绳索下压, Tricep Extension=三头伸展, Tricep Kickback=哑铃臂屈伸, Overhead Tricep Extension=颈后臂屈伸, Lying Tricep Extension=仰卧臂屈伸, Russian Twist=俄罗斯转体, Leg Raise=仰卧举腿, Hanging Leg Raise=悬垂举腿, Hanging Knee Raise=悬垂提膝, Flutter Kick=打水踢腿, Dead Bug=死虫式, Bird Dog=鸟狗式, Superman=超人式, Dragon Flag=龙旗, Side Bend=侧屈, Ab Wheel Rollout=健腹轮, Back Extension=山羊挺身, Hyperextension=山羊挺身, Clean And Jerk=挺举, Thruster=火箭推, Kettlebell Swing=壶铃摇摆, Kettlebell Snatch=壶铃抓举, Burpee=波比跳, Mountain Climber=登山跑, Jumping Jack=开合跳, Box Jump=跳箱, Jump Squat=跳蹲, Glute Kickback=臀后踢, Hip Abduction=髋外展, Hip Adduction=髋内收, Wrist Curl=腕弯举, Wrist Extension=腕伸展, Finger Curl=指弯举, Jefferson Squat=杰弗逊深蹲, Zercher Squat=泽奇深蹲, Bradford Press=布拉德福德推举, Cuban Press=古巴推举, Tate Press=泰特推举, Scott Press=斯科特推举, Zottman Curl=佐特曼弯举, Pendlay Row=潘德雷划船, JM Press=JM卧推, Spoto Press=斯波托卧推, Guillotine Press=断头台推举, Bradford Rocky Press=布拉德福德摇式推举, Plate Pinch=夹片, Incline Row=上斜划船, Rear Delt Row=后束划船, Kayak Row=皮划艇划船, Judo Flip=柔道翻转, Pallof Press=帕洛夫推举, Thibaudeau Kayak Row=蒂博多皮划艇划船, Anti Gravity Press=反重力推举, Face Press=面部推举, V-up=两头起/V字卷腹, Jack Knife=折刀, Cocoons=茧式卷腹, Butt-ups=臀桥, Body-up=双杠撑起, Bottoms-up=底部推举, Iron Cross=铁十字, Otis Up=奥蒂斯仰卧起坐, Inchworm=尺蠖爬行, Quick Feet=快速脚步, Crossover=夹胸, Hug=抱球, Pike=折刀, Step-up=踏板, Pull Through=拉穿, Internal Rotation=内旋, External Rotation=外旋, Circular=环绕, Toe Touch=触趾, Heel Touch=触踵, Throw Down=下砸, Motion=动态, Parallel=平行, Fixed=固定, Under Both Legs=双腿下, Full=全程, High Bar=高杠, Low Bar=低杠, Rack=架上, Jefferson=杰斐逊, Zercher=泽奇, JM=JM, Pov=视角, Back Pov=背面视角, Side Pov=侧面视角, Male=男性, Female=女性, With Arm Blaster=带臂托, v.2=第二式, v. 2=第二式

【翻译规则】
1. 严格使用上方术语对照表，不要直译
2. 器械在前，修饰语在中，动作在后（如 Incline Dumbbell Curl → 上斜哑铃弯举）
3. 输出必须是100%纯中文，绝对不能包含任何英文字母（a-z, A-Z）
4. 不能保留任何英文单词、缩写、括号里的英文
5. 去掉所有括号注释（如 (male)、(female)、(with towel)、v.2、(back pov) 等）
6. 输出不要有空格，中文动作名不需要空格
7. 如果术语对照表中有完整对应，直接使用（如 Lat Pulldown → 高位下拉）
8. EZ杆可以保留，因为是约定俗成的器械名
9. 严禁使用以下错误译法（务必用正确术语替换）：Press=推举/卧推（绝不是印刷机/压力机/按压）, Curl=弯举（绝不是卷发/卷曲）, Fly=飞鸟（绝不是苍蝇）, Deadlift=硬拉（绝不是升降机/举重）, Burpee=波比跳（绝不是打嗝）, Clean=高翻（绝不是清洁）, Dip=臂屈伸（绝不是蘸酱）, Shrug=耸肩（绝不是耸耸肩）, Kickback=后踢（绝不是回扣）, Lunge=箭步蹲（绝不是弓步）, Preacher=牧师凳（绝不是传教士）, Farmer's Walk=农夫行走（绝不是农民漫步）, Row=划船（绝不是排）, Bench=板凳/卧推凳（绝不是长凳）, Raise=平举（绝不是凸起/抬）, Calf Raise=提踵（绝不是提犊）

请翻译以下动作，每行一个，格式为 "英文原名|中文译名"，不要输出其他内容：`;

async function translateBatch(names) {
  const prompt = SYSTEM_PROMPT + '\n' + names.join('\n');
  const url = 'https://openrouter.ai/api/v1/chat/completions';

  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`
        },
        body: JSON.stringify({
          model: OXALPHA_MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 2048
        })
      });
      const data = await res.json();
      if (data.choices?.[0]?.message?.content) {
        return data.choices[0].message.content.trim();
      }
      if (data.error) {
        console.error(`  API 错误: ${data.error.message}`);
        if (data.error.code === 429 || data.error.status === 429) {
          await new Promise(r => setTimeout(r, 10000));
          continue;
        }
      }
    } catch (e) {
      console.error(`  请求失败 (尝试 ${attempt + 1}/3): ${e.message}`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  return null;
}

function parseTranslation(text, originalNames) {
  const result = {};
  const lines = text.split('\n').map(l => l.trim()).filter(l => l && l.includes('|'));
  for (const line of lines) {
    const parts = line.split('|').map(p => p.trim());
    if (parts.length >= 2) {
      const en = parts[0].toLowerCase();
      const zh = parts.slice(1).join('|').trim();
      for (const orig of originalNames) {
        if (orig.toLowerCase() === en) {
          result[orig] = zh;
          break;
        }
      }
    }
  }
  return result;
}

// 质量校验：通过黑名单 + 英文残留 + 中文占比
// 约定俗成缩写（EZ杆/JM卧推/V字/L字/T杠）不算英文残留，数字不影响质量
function normalizeForCheck(text) {
  return (text || '')
    .replace(/EZ杆|ez杆/gi, '')
    .replace(/EZ|ez/gi, '')
    .replace(/JM/gi, '')
    .replace(/V字/gi, '')
    .replace(/L字/gi, '')
    .replace(/T杠/gi, '')
    .replace(/\d+/g, '')
    .trim();
}
function hasEnglish(text) {
  return /[a-zA-Z]{2,}/.test(normalizeForCheck(text));
}
function hasBadWord(text) {
  return BAD_WORDS.some(w => (text || '').includes(w));
}
function zhRatio(text) {
  const t = normalizeForCheck(text);
  const zh = (t.match(/[\u4e00-\u9fff]/g) || []).length;
  const total = t.replace(/\s/g, '').length;
  return total > 0 ? zh / total : 0;
}
function isGood(zh) {
  if (!zh) return false;
  if (hasEnglish(zh)) return false;
  if (hasBadWord(zh)) return false;
  if (zhRatio(zh) < 0.7) return false;
  return true;
}

async function main() {
  console.log('🔗 连接 MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ 连接成功');

  const allExercises = await Exercise.find({}).sort({ sortOrder: 1 });
  console.log(`📋 共 ${allExercises.length} 个动作`);

  // 筛选：命中黑名单 或 有英文残留 或 中文占比低
  const toFix = allExercises.filter(ex => {
    const zh = ex.nameZh;
    if (!zh) return true;
    if (hasEnglish(zh)) return true;
    if (hasBadWord(zh)) return true;
    if (zhRatio(zh) < 0.7) return true;
    return false;
  });

  console.log(`🔍 需修复: ${toFix.length} 个\n`);

  // 报告黑名单命中的
  const hardHit = toFix.filter(ex => HARD_BAD.some(w => (ex.nameZh || '').includes(w)));
  console.log(`   其中硬伤机翻: ${hardHit.length} 个`);

  // 加载已有映射（复用资产）
  let zhMap = {};
  if (fs.existsSync(MAP_FILE)) {
    try { zhMap = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8')); } catch (e) { zhMap = {}; }
  }
  console.log(`   已加载映射资产: ${Object.keys(zhMap).length} 条\n`);

  let success = 0, failed = 0;

  for (let i = 0; i < toFix.length; i += BATCH_SIZE) {
    const batch = toFix.slice(i, i + BATCH_SIZE);
    const names = batch.map(ex => ex.nameEn);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(toFix.length / BATCH_SIZE);

    // 跳过已有合格映射
    const todo = names.filter(n => !(zhMap[n] && isGood(zhMap[n])));
    if (todo.length === 0) {
      for (const ex of batch) {
        if (zhMap[ex.nameEn] && isGood(zhMap[ex.nameEn])) {
          ex.nameZh = zhMap[ex.nameEn];
          await ex.save();
          success++;
        }
      }
      continue;
    }

    console.log(`[${batchNum}/${totalBatches}] 翻译 ${todo.length} 个 (${i + 1}-${i + names.length})...`);

    const rawText = await translateBatch(todo);
    if (!rawText) {
      console.log(`  ❌ 批次翻译失败`);
      failed += todo.length;
      continue;
    }

    const translations = parseTranslation(rawText, todo);

    for (const ex of batch) {
      const zh = translations[ex.nameEn];
      if (zh && isGood(zh)) {
        ex.nameZh = zh;
        zhMap[ex.nameEn] = zh;
        await ex.save();
        success++;
        console.log(`  ✅ ${ex.nameEn} → ${zh}`);
      } else {
        // 尝试用已有映射
        if (zhMap[ex.nameEn] && isGood(zhMap[ex.nameEn])) {
          ex.nameZh = zhMap[ex.nameEn];
          await ex.save();
          success++;
          console.log(`  ♻️ 复用映射 ${ex.nameEn} → ${zhMap[ex.nameEn]}`);
        } else {
          failed++;
          if (zh) console.log(`  ⚠️ 质量不达标: ${ex.nameEn} → ${zh}`);
        }
      }
    }

    await new Promise(r => setTimeout(r, 800));
  }

  // 固化映射资产
  fs.writeFileSync(MAP_FILE, JSON.stringify(zhMap, null, 2), 'utf8');
  console.log(`\n💾 映射资产已保存: ${MAP_FILE} (${Object.keys(zhMap).length} 条)`);

  console.log('\n' + '='.repeat(60));
  console.log('🎉 修复完成!');
  console.log(`   成功: ${success}`);
  console.log(`   失败: ${failed}`);
  console.log('='.repeat(60));

  await mongoose.disconnect();
}

main().catch(err => { console.error('❌', err); process.exit(1); });
