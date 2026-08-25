/**
 * DeepSeek API 批量翻译健身动作名
 * 用专业 prompt 翻译有英文残留或未翻译的动作
 */
const mongoose = require('mongoose');
require('dotenv').config();
const Exercise = require('../models/Exercise');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OXALPHA_MODEL = 'stealth/ox-alpha';
const BATCH_SIZE = 10;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/gym-fitness-app';

const SYSTEM_PROMPT = `你是健身领域专业翻译。将英文健身动作名翻译成中文健身圈约定俗成的标准译名。

【核心术语对照表（必须严格遵守）】
器械：Barbell=杠铃, Dumbbell=哑铃, Kettlebell=壶铃, Cable=绳索, Machine=器械, Bodyweight=徒手, Smith=史密斯, EZ Bar=EZ杆, Band=弹力带, Trap Bar=六角杠, Landmine=地雷管, Ab Wheel=健腹轮, Exercise Ball=健身球, Stability Ball=瑞士球, Bosu Ball=波速球, Foam Roller=泡沫轴, Roller=滚轮, Towel=毛巾, Tennis Ball=网球, Wall=墙, Bench=板凳, Parallel Bar=双杠, Rings=吊环, Rope=绳索, Sled=雪橇, Sandbag=沙袋, Medicine Ball=药球, Sledgehammer=大锤, Battling Ropes=战绳, Battle Ropes=战绳

动作模式：Press=推举, Push=推, Pull=拉, Row=划船, Curl=弯举, Extension=伸展, Raise=平举, Fly=飞鸟, Squat=深蹲, Deadlift=硬拉, Lunge=箭步蹲, Pushdown=下压, Pulldown=下拉, Crunch=卷腹, Sit-up=仰卧起坐, Plank=平板支撑, Stretch=拉伸, Bridge=桥, Thrust=推, Kickback=后踢, Shrug=耸肩, Rollout=轮推出, Clean=高翻, Snatch=抓举, Jerk=挺, Swing=摇摆, Jump=跳, Hold=保持, Twist=转体, Rotation=旋转, Bend=屈, Dip=臂屈伸, Pull-up=引体向上, Chin-up=反握引体向上, Muscle-up=双力臂, Handstand=手倒立, Planche=俄挺, Front Lever=前水平, Back Lever=后水平, L-sit=L字支撑, Wall Sit=靠墙静蹲, Walk=行走, Crawl=爬行, Carry=携带, Farmer's Walk=农夫行走, Turkish Get Up=土耳其起立, Windmill=风车, Get Up=起立, Press-up=俯卧撑, Press up=俯卧撑, Pullover=上拉

修饰语：Incline=上斜, Decline=下斜, Flat=平板, Seated=坐姿, Standing=站姿, Lying=仰卧, Prone=俯卧, Supine=仰卧, Bent Over=俯身, Bent-over=俯身, Bent Arm=屈臂, Bent-arm=屈臂, Straight Arm=直臂, Straight-arm=直臂, Stiff Leg=直腿, Stiff-leg=直腿, Single Leg=单腿, Single-leg=单腿, One Leg=单腿, One Arm=单臂, Single Arm=单臂, Double=双, Alternating=交替, Alternate=交替, Reverse=反握, Reverse Grip=反握, Close Grip=窄握, Close-grip=窄握, Wide Grip=宽握, Wide-grip=宽握, Neutral Grip=对握, Underhand=反握, Overhand=正握, Hammer=锤式, Cheat=借力, Concentration=集中, Preacher=牧师凳, Spider=蜘蛛, Cross Body=跨体, Skull Crusher=碎颅者, Face Pull=面拉, Lat Pulldown=高位下拉, Upright Row=直立划船, Front Raise=前平举, Lateral Raise=侧平举, Rear Delt Fly=俯身飞鸟, Shoulder Press=肩推, Overhead Press=站姿肩推, Military Press=军推, Arnold Press=阿诺德推举, Push Press=借力推, Behind The Neck Press=颈后推举, Landmine Press=地雷管推举, Front Squat=前蹲, Back Squat=颈后深蹲, Goblet Squat=高脚杯深蹲, Box Squat=箱式深蹲, Hack Squat=哈克深蹲, Bulgarian Split Squat=保加利亚分腿蹲, Reverse Lunge=反向箭步蹲, Walking Lunge=行走箭步蹲, Side Lunge=侧箭步蹲, Romanian Deadlift=罗马尼亚硬拉, Sumo Deadlift=相扑硬拉, Conventional Deadlift=传统硬拉, Deficit Deadlift=赤字硬拉, Pause Deadlift=停顿硬拉, Trap Bar Deadlift=六角杠硬拉, Stiff Leg Deadlift=直腿硬拉, Good Morning=早安式, Hip Thrust=臀推, Glute Bridge=臀桥, Leg Press=腿举, Leg Extension=腿屈伸, Leg Curl=腿弯举, Calf Raise=提踵, Standing Calf Raise=站姿提踵, Seated Calf Raise=坐姿提踵, Donkey Calf Raise=驴式提踵, Nordic Hamstring Curl=北欧腿弯举, Bench Press=卧推, Dumbbell Bench Press=哑铃卧推, Incline Bench Press=上斜卧推, Decline Bench Press=下斜卧推, Close Grip Bench Press=窄距卧推, Wide Grip Bench Press=宽距卧推, Floor Press=地板卧推, Dumbbell Fly=哑铃飞鸟, Cable Fly=绳索夹胸, Chest Press Machine=器械推胸, Push Up=俯卧撑, Dip=双杠臂屈伸, Barbell Curl=杠铃弯举, Dumbbell Curl=哑铃弯举, Bicep Curl=哑铃弯举, Hammer Curl=锤式弯举, Preacher Curl=牧师凳弯举, Concentration Curl=集中弯举, Reverse Curl=反握弯举, Spider Curl=蜘蛛弯举, Cheat Curl=借力弯举, Incline Dumbbell Curl=上斜哑铃弯举, Tricep Pushdown=绳索下压, Tricep Extension=三头伸展, Tricep Kickback=哑铃臂屈伸, Overhead Tricep Extension=颈后臂屈伸, Lying Tricep Extension=仰卧臂屈伸, Russian Twist=俄罗斯转体, Leg Raise=仰卧举腿, Hanging Leg Raise=悬垂举腿, Hanging Knee Raise=悬垂提膝, Flutter Kick=打水踢腿, Dead Bug=死虫式, Bird Dog=鸟狗式, Superman=超人式, Dragon Flag=龙旗, Side Bend=侧屈, Ab Wheel Rollout=健腹轮, Back Extension=山羊挺身, Hyperextension=山羊挺身, Clean And Jerk=挺举, Thruster=火箭推, Kettlebell Swing=壶铃摇摆, Kettlebell Snatch=壶铃抓举, Burpee=波比跳, Mountain Climber=登山跑, Jumping Jack=开合跳, Box Jump=跳箱, Jump Squat=跳蹲, Glute Kickback=臀后踢, Hip Abduction=髋外展, Hip Adduction=髋内收, Wrist Curl=腕弯举, Wrist Extension=腕伸展, Finger Curl=指弯举, Pin Press=锁定推举, French Press=法式推举, Iron Cross=铁十字, Body-up=双杠撑起, Bottoms-up=底部推举, Butt-up=臀桥, Flag=人体旗帜, Otis Up=奥蒂斯仰卧起坐, Inchworm=尺蠖爬行, Quick Feet=快速脚步, Crossover=夹胸, Hug=抱球, Pike=折刀, Step-up=踏板, Step Up=踏板, Pull Through=拉穿, Internal Rotation=内旋, External Rotation=外旋, Circular=环绕, Toe Touch=触趾, Heel Touch=触踵, Throw Down=下砸, Motion=动态, Parallel=平行, Fixed=固定, Under Both Legs=双腿下, Full=全程, High Bar=高杠, Low Bar=低杠, Rack=架上, Guillotine=断头台, Jefferson=杰斐逊, Zercher=泽奇, JM=JM, Pov=视角, Back Pov=背面视角, Side Pov=侧面视角, Male=男性, Female=女性, With Arm Blaster=带臂式爆破器, v.2=第二式, v. 2=第二式

【翻译规则】
1. 严格使用上方术语对照表，不要直译
2. 器械在前，修饰语在中，动作在后（如 Incline Dumbbell Curl → 上斜哑铃弯举）
3. 输出必须是100%纯中文，绝对不能包含任何英文字母（a-z, A-Z）
4. 不能保留任何英文单词、缩写、括号里的英文
5. 去掉所有括号注释（如 (male)、(female)、(with towel)、v.2、(back pov) 等）
6. 输出不要有空格，中文动作名不需要空格
7. 如果术语对照表中有完整对应，直接使用（如 Lat Pulldown → 高位下拉）
8. EZ杆可以保留，因为是约定俗成的器械名

请翻译以下动作，每行一个，格式为 "英文原名|中文译名"，不要输出其他内容：`;

async function translateBatch(names) {
  const prompt = SYSTEM_PROMPT + '\n' + names.join('\n');
  const url = 'https://openrouter.ai/api/v1/chat/completions';

  for (let attempt = 0; attempt < 3; attempt++) {
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
          temperature: 0.2,
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
        if (orig.toLowerCase() === en || orig.toLowerCase().includes(en) || en.includes(orig.toLowerCase())) {
          result[orig] = zh;
          break;
        }
      }
    }
  }
  return result;
}

function hasGoodChinese(name) {
  if (!name) return false;
  const chineseChars = (name.match(/[\u4e00-\u9fff]/g) || []).length;
  const total = name.replace(/\s/g, '').length;
  return total > 0 && chineseChars / total >= 0.7;
}

function hasEnglish(text) {
  return /[a-zA-Z]{2,}/.test(text);
}

async function main() {
  console.log('🔗 连接 MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ 连接成功');

  const allExercises = await Exercise.find({}).sort({ sortOrder: 1 });
  console.log(`📋 共 ${allExercises.length} 个动作`);

  // 筛选需要翻译的动作：中文比例低于70% 或 有英文残留 或 未翻译
  const toTranslate = allExercises.filter(ex => {
    if (!ex.nameZh || ex.nameZh === ex.nameEn) return true;
    if (!hasGoodChinese(ex.nameZh)) return true;
    if (hasEnglish(ex.nameZh)) return true;
    return false;
  });

  console.log(`🔄 需要翻译: ${toTranslate.length} 个\n`);

  let success = 0, failed = 0;

  for (let i = 0; i < toTranslate.length; i += BATCH_SIZE) {
    const batch = toTranslate.slice(i, i + BATCH_SIZE);
    const names = batch.map(ex => ex.nameEn);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(toTranslate.length / BATCH_SIZE);

    console.log(`[${batchNum}/${totalBatches}] 翻译 ${names.length} 个动作 (${i + 1}-${i + names.length})...`);

    const rawText = await translateBatch(names);
    if (!rawText) {
      console.log(`  ❌ 批次翻译失败`);
      failed += names.length;
      continue;
    }

    const translations = parseTranslation(rawText, names);

    for (const ex of batch) {
      const zh = translations[ex.nameEn];
      if (zh && hasGoodChinese(zh) && !hasEnglish(zh)) {
        ex.nameZh = zh;
        await ex.save();
        success++;
      } else {
        failed++;
        if (zh) console.log(`  ⚠️  ${ex.nameEn} → ${zh} (质量不达标)`);
      }
    }

    console.log(`  ✅ 本批成功: ${Object.keys(translations).filter(n => hasGoodChinese(translations[n]) && !hasEnglish(translations[n])).length}/${names.length}`);

    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 DeepSeek 批量翻译完成!');
  console.log(`   成功: ${success}`);
  console.log(`   失败: ${failed}`);
  console.log('='.repeat(60));

  await mongoose.disconnect();
}

main().catch(err => { console.error('❌', err); process.exit(1); });
