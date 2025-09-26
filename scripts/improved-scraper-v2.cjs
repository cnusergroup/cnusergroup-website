#!/usr/bin/env node

/**
 * 改进的活动抓取脚本 v2
 * 使用更灵活的选择器和更好的错误处理
 */

const fs = require('fs');
const path = require('path');

class ImprovedEventScraper {
  constructor() {
    this.baseUrl = 'https://usergroup.huodongxing.com/';
    this.dataDir = './data/events';
    this.dataFile = path.join(this.dataDir, 'events.json');
    this.logFile = path.join(this.dataDir, 'scraper.log');
    
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    
    try {
      fs.appendFileSync(this.logFile, logMessage + '\n');
    } catch (error) {
      // 忽略日志写入错误
    }
  }

  // 使用多种策略提取活动数据
  async extractEventsFromPage(page) {
    return await page.evaluate(() => {
      const events = [];
      
      // 策略1: 查找 ul#offlineActivities
      let eventItems = [];
      const offlineUl = document.querySelector('ul#offlineActivities');
      if (offlineUl) {
        eventItems = Array.from(offlineUl.querySelectorAll('li'));
      }
      
      // 策略2: 如果策略1失败，查找所有包含活动链接的容器
      if (eventItems.length === 0) {
        const eventLinks = document.querySelectorAll('a[href*="/event/"]');
        eventItems = Array.from(eventLinks).map(link => {
          // 找到包含链接的最近的 li 或 div 容器
          let container = link.closest('li') || link.closest('div[class*="event"]') || link.closest('div[class*="card"]');
          return container;
        }).filter(Boolean);
      }
      
      // 策略3: 查找常见的活动容器类名
      if (eventItems.length === 0) {
        const selectors = [
          'div[class*="event-item"]',
          'div[class*="activity-item"]', 
          'li[class*="event"]',
          'div[class*="card"]',
          '.event-list li',
          '.activity-list li'
        ];
        
        for (const selector of selectors) {
          eventItems = Array.from(document.querySelectorAll(selector));
          if (eventItems.length > 0) break;
        }
      }

      console.log(`找到 ${eventItems.length} 个潜在活动项`);

      eventItems.forEach((item, index) => {
        if (!item) return;
        
        try {
          // 提取活动链接
          const linkElement = item.querySelector('a[href*="/event/"]') || 
                             (item.tagName === 'A' && item.href.includes('/event/') ? item : null);
          
          if (!linkElement) return;

          const href = linkElement.getAttribute('href') || linkElement.href;
          const idMatch = href.match(/\/event\/(\d+)/);
          if (!idMatch) return;

          const eventId = idMatch[1];

          // 提取标题 - 多种策略
          let title = '';
          const titleSelectors = ['h3', 'h2', 'h4', '.title', '.event-title', '.name'];
          for (const selector of titleSelectors) {
            const titleEl = item.querySelector(selector);
            if (titleEl && titleEl.textContent.trim()) {
              title = titleEl.textContent.trim();
              break;
            }
          }
          
          // 如果还没找到标题，使用链接文本
          if (!title) {
            title = linkElement.textContent.trim();
          }

          if (!title) return; // 没有标题的跳过

          // 提取时间和地点
          let time = '';
          let location = '';
          
          const textElements = item.querySelectorAll('div, span, p, td, li');
          textElements.forEach(el => {
            const text = el.textContent.trim();
            
            // 时间匹配
            if (!time && (text.includes('年') || text.includes('月') || text.includes('日') || 
                         text.match(/\d{4}-\d{2}-\d{2}/) || text.match(/\d{2}:\d{2}/))) {
              time = text;
            }
            
            // 地点匹配
            if (!location && (text.includes('市') || text.includes('区') || text.includes('路') || 
                             text.includes('大厦') || text.includes('中心') || text.includes('园区'))) {
              location = text;
            }
          });

          // 提取图片
          let imageUrl = '';
          const imgElement = item.querySelector('img');
          if (imgElement) {
            imageUrl = imgElement.src || imgElement.getAttribute('data-src') || '';
            if (imageUrl && !imageUrl.startsWith('http')) {
              imageUrl = new URL(imageUrl, window.location.origin).href;
            }
          }

          // 提取状态
          let status = 'unknown';
          const statusTexts = item.textContent.toLowerCase();
          if (statusTexts.includes('报名中') || statusTexts.includes('立即报名')) {
            status = 'open';
          } else if (statusTexts.includes('已结束') || statusTexts.includes('已截止')) {
            status = 'closed';
          } else if (statusTexts.includes('即将开始')) {
            status = 'upcoming';
          }

          // 提取统计数据
          let views = 0;
          let favorites = 0;
          
          const statsText = item.textContent;
          const viewMatch = statsText.match(/(\d+)\s*人浏览|浏览\s*(\d+)/);
          const favMatch = statsText.match(/(\d+)\s*人收藏|收藏\s*(\d+)/);
          
          if (viewMatch) {
            views = parseInt(viewMatch[1] || viewMatch[2]) || 0;
          }
          if (favMatch) {
            favorites = parseInt(favMatch[1] || favMatch[2]) || 0;
          }

          const event = {
            id: eventId,
            title: title,
            time: time,
            location: location,
            status: status,
            views: views,
            favorites: favorites,
            imageUrl: imageUrl,
            url: href.startsWith('http') ? href : `https://usergroup.huodongxing.com${href}`,
            extractedAt: new Date().toISOString(),
            sort: index + 1
          };

          events.push(event);
          
        } catch (error) {
          console.error(`处理活动项 ${index} 时出错:`, error.message);
        }
      });

      return events;
    });
  }

  async scrapeEvents() {
    const { chromium } = require('playwright');
    let browser = null;
    
    try {
      this.log('=== 活动采集开始 ===');
      this.log('启动浏览器...');
      
      browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-web-security'
        ]
      });

      const page = await browser.newPage();
      page.setDefaultTimeout(60000);

      // 设置浏览器环境
      try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewportSize({ width: 1920, height: 1080 });
        this.log('浏览器环境设置完成');
      } catch (error) {
        this.log(`设置浏览器环境失败: ${error.message}`);
      }

      this.log('访问活动行网站...');
      await page.goto(this.baseUrl, {
        waitUntil: 'networkidle',
        timeout: 60000
      });

      // 等待页面加载
      await page.waitForTimeout(5000);

      this.log('开始提取活动数据...');
      const events = await this.extractEventsFromPage(page);

      this.log(`提取到 ${events.length} 个活动`);

      if (events.length > 0) {
        // 保存数据
        fs.writeFileSync(this.dataFile, JSON.stringify(events, null, 2));
        this.log(`活动数据已保存到: ${this.dataFile}`);
        
        // 显示前几个活动的信息
        events.slice(0, 3).forEach((event, index) => {
          this.log(`活动 ${index + 1}: ${event.title} (ID: ${event.id})`);
        });
      } else {
        this.log('⚠️ 没有提取到任何活动数据');
        
        // 保存空数组
        fs.writeFileSync(this.dataFile, JSON.stringify([], null, 2));
      }

      this.log('=== 活动采集完成 ===');
      return events;

    } catch (error) {
      this.log(`采集过程中发生错误: ${error.message}`);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const scraper = new ImprovedEventScraper();
  scraper.scrapeEvents()
    .then(events => {
      console.log(`\n✅ 采集完成！共获取 ${events.length} 个活动`);
      console.log('📁 查看采集结果:');
      console.log(`数据文件: ${scraper.dataFile}`);
      console.log(`日志文件: ${scraper.logFile}`);
    })
    .catch(error => {
      console.error('\n❌ 采集失败:', error.message);
      process.exit(1);
    });
}

module.exports = ImprovedEventScraper;