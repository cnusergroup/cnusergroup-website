#!/usr/bin/env node

/**
 * 重新下载缺失的活动图片
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const dataFile = './data/events/events.json';
const imageDir = './data/events/images';

// 确保图片目录存在
if (!fs.existsSync(imageDir)) {
  fs.mkdirSync(imageDir, { recursive: true });
}

// 读取活动数据
const events = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

console.log(`总共 ${events.length} 个活动`);

// 下载图片函数
async function downloadImage(imageUrl, eventId) {
  return new Promise((resolve, reject) => {
    if (!imageUrl) {
      resolve(null);
      return;
    }

    try {
      const url = new URL(imageUrl);
      const ext = path.extname(url.pathname) || '.jpg';
      const filename = `${eventId}${ext}`;
      const filepath = path.join(imageDir, filename);

      // 如果文件已存在，跳过
      if (fs.existsSync(filepath)) {
        resolve({ filename, skipped: true });
        return;
      }

      const protocol = url.protocol === 'https:' ? https : http;
      const file = fs.createWriteStream(filepath);

      // 添加请求头以绕过防盗链
      const options = {
        headers: {
          'Referer': 'https://usergroup.huodongxing.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      };

      protocol.get(imageUrl, options, (response) => {
        // 处理重定向
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            file.close();
            fs.unlinkSync(filepath);
            downloadImage(redirectUrl, eventId).then(resolve).catch(reject);
            return;
          }
        }

        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(filepath);
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }

        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve({ filename, skipped: false });
        });
        file.on('error', (err) => {
          fs.unlink(filepath, () => { });
          reject(err);
        });
      }).on('error', (err) => {
        file.close();
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}

// 主函数
async function main() {
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  let updated = 0;

  for (const event of events) {
    if (!event.imageUrl) {
      continue;
    }

    try {
      const result = await downloadImage(event.imageUrl, event.id);

      if (result) {
        if (result.skipped) {
          skipped++;
        } else {
          downloaded++;
          console.log(`✅ 下载成功: ${event.id} - ${event.title}`);

          // 更新事件数据中的 localImage 字段
          if (!event.localImage) {
            event.localImage = result.filename;
            updated++;
          }
        }
      }

      // 添加延迟避免请求过快
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      failed++;
      console.error(`❌ 下载失败: ${event.id} - ${error.message}`);
    }
  }

  // 如果有更新，保存数据
  if (updated > 0) {
    fs.writeFileSync(dataFile, JSON.stringify(events, null, 2));
    console.log(`\n📝 已更新 ${updated} 个活动的 localImage 字段`);
  }

  console.log('\n=== 下载完成 ===');
  console.log(`✅ 成功下载: ${downloaded} 个`);
  console.log(`⏭️  已存在跳过: ${skipped} 个`);
  console.log(`❌ 下载失败: ${failed} 个`);
  console.log(`📊 总计: ${events.length} 个活动`);
}

main().catch(console.error);
