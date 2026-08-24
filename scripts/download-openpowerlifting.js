// scripts/download-openpowerlifting.js
// 自动从 OpenPowerlifting 下载最新数据并解压
// 用法：node scripts/download-openpowerlifting.js

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ZIP_PATH = path.join(DATA_DIR, 'openipf-latest.zip');
const CSV_PATH = path.join(DATA_DIR, 'openipf.csv');
const RENAMED_PATH = path.join(DATA_DIR, 'ipf-china.csv');
const DOWNLOAD_URL = 'https://openpowerlifting.gitlab.io/opl-csv/files/openipf-latest.zip';

// 确保data目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 清理旧文件
for (const f of [ZIP_PATH, CSV_PATH]) {
  if (fs.existsSync(f)) {
    try { fs.unlinkSync(f); } catch(e) {}
  }
}

console.log('📥 开始下载 OpenPowerlifting 数据...');
console.log(`🌐 下载地址: ${DOWNLOAD_URL}`);
console.log(`📁 保存路径: ${ZIP_PATH}`);
console.log('⏳ 数据文件约64MB，请耐心等待...\n');

// 下载文件（绕过SSL证书验证）
const file = fs.createWriteStream(ZIP_PATH);
let downloadedBytes = 0;
let lastProgress = 0;

const options = {
  headers: { 'User-Agent': 'Mozilla/5.0' },
  rejectUnauthorized: false  // 绕过SSL证书验证
};

https.get(DOWNLOAD_URL, options, (response) => {
  // 处理重定向
  if (response.statusCode === 301 || response.statusCode === 302) {
    const redirectUrl = response.headers.location;
    console.log(`🔄 重定向到: ${redirectUrl}`);
    https.get(redirectUrl, options, (res2) => {
      downloadStream(res2);
    }).on('error', (err) => {
      handleError(err);
    });
    return;
  }

  if (response.statusCode !== 200) {
    console.error(`❌ HTTP 状态码: ${response.statusCode}`);
    console.error('   可能是下载地址变更或网络问题');
    process.exit(1);
  }

  downloadStream(response);
}).on('error', (err) => {
  handleError(err);
});

function downloadStream(response) {
  const totalBytes = parseInt(response.headers['content-length']) || 0;
  const totalMB = totalBytes > 0 ? (totalBytes / 1024 / 1024).toFixed(1) : '未知';

  console.log(`📊 文件大小: ${totalMB}MB`);

  response.on('data', (chunk) => {
    downloadedBytes += chunk.length;
    const downloadedMB = (downloadedBytes / 1024 / 1024).toFixed(1);
    const progress = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0;

    if (progress >= lastProgress + 10) {
      lastProgress = progress;
      console.log(`  ⏳ 已下载 ${downloadedMB}MB / ${totalMB}MB (${progress}%)`);
    }
  });

  response.pipe(file);

  file.on('finish', () => {
    file.close(() => {
      const finalMB = (downloadedBytes / 1024 / 1024).toFixed(1);
      console.log(`\n✅ 下载完成: ${finalMB}MB`);

      // 检查文件大小
      if (downloadedBytes < 1000000) {
        console.error('❌ 下载文件太小，可能不是有效的zip文件');
        process.exit(1);
      }

      // 解压
      console.log('\n📦 正在解压...');
      try {
        // 等待文件完全关闭
        setTimeout(() => {
          try {
            execSync(`powershell -Command "Expand-Archive -Path '${ZIP_PATH}' -DestinationPath '${DATA_DIR}' -Force"`, {
              stdio: 'inherit'
            });
            console.log('✅ 解压完成');

            // 检查解压后的文件
            if (fs.existsSync(CSV_PATH)) {
              // 重命名为 ipf-china.csv
              if (fs.existsSync(RENAMED_PATH)) {
                fs.unlinkSync(RENAMED_PATH);
              }
              fs.renameSync(CSV_PATH, RENAMED_PATH);
              const csvSize = (fs.statSync(RENAMED_PATH).size / 1024 / 1024).toFixed(1);
              console.log(`✅ 数据文件已准备好: ${RENAMED_PATH} (${csvSize}MB)`);

              // 删除zip文件
              try { fs.unlinkSync(ZIP_PATH); } catch(e) {}
              console.log('🗑️  已删除临时zip文件');

              console.log('\n🎉 下一步：运行同步脚本导入数据');
              console.log('   node scripts/sync-openpowerlifting.js ./data/ipf-china.csv');
            } else {
              console.error('❌ 解压后未找到 openipf.csv');
              console.log('📁 data目录下的文件:');
              fs.readdirSync(DATA_DIR).forEach(f => console.log(`   - ${f}`));
            }
          } catch (extractErr) {
            console.error('❌ 解压失败:', extractErr.message);
          }
        }, 500);
      } catch (err) {
        console.error('❌ 解压失败:', err.message);
      }
    });
  });

  file.on('error', (err) => {
    handleError(err);
  });
}

function handleError(err) {
  console.error('\n❌ 下载失败:', err.message);
  console.error('\n💡 如果自动下载失败，请手动下载：');
  console.error('  1. 访问 https://openpowerlifting.gitlab.io/opl-csv/bulk-csv.html');
  console.error('  2. 下载 openipf-latest.zip（64M）');
  console.error('  3. 解压得到 openipf.csv');
  console.error('  4. 放到 data/ 目录，重命名为 ipf-china.csv');
  console.error('  5. 运行: node scripts/sync-openpowerlifting.js ./data/ipf-china.csv');
  process.exit(1);
}
