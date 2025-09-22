#!/usr/bin/env node

/**
 * 简化版改进活动采集工具
 * 专注于解决分页问题
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

class SimpleImprovedScraper {
  constructor() {
    this.baseUrl = 'https://usergroup.huodongxing.com/';
    this.dataDir = './data/events';
    this.imageDir = './data/events/images';
    this.dataFile = path.join(this.dataDir, 'events.json');
    this.logFile = path.join(this.dataDir, 'scraper.log');
    
    this.ensureDirectories();
    this.existingEvents = this.loadExistingEvents();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    if (!fs.existsSync(this.imageDir)) {
      fs.mkdirSync(this.imageDir, { recursive: true });
    }
  }

  loadExistingEvents() {
    if (fs.existsSync(this.dataFile)) {
      try {
        const data = fs.readFileSync(this.dataFile, 'utf8');
        return JSON.parse(data);
      } catch (error) {
        this.log(`加载已有数据失败: ${error.message}`);
        return [];
      }
    }
    return [];
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    fs.appendFileSync(this.logFile, logMessage + '\\n');
  }

  isNewEvent(eventId) {
    return !this.existingEvents.some(event => event.id === eventId);
  }

  async downloadImage(imageUrl, eventId) {
    return new Promise((resolve, reject) => {
      if (!imageUrl) {
        resolve(null);
        return;
      }

      try {
        const url = new URL(imageUrl);
        const ext = path.extname(url.pathname) || '.jpg';
        const filename = `${eventId}${ext}`;
        const filepath = path.join(this.imageDir, filename);

        if (fs.existsSync(filepath)) {
          resolve(filename);
          return;
        }

        const protocol = url.protocol === 'https:' ? https : http;
        const file = fs.createWriteStream(filepath);

        protocol.get(imageUrl, (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`HTTP ${response.statusCode}`));
            return;
          }

          response.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve(filename);
          });
          file.on('error', (err) => {
            fs.unlink(filepath, () => {});
            reject(err);
          });
        }).on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  // 改进的分页采集方法
  async scrapePageWithPlaywright(page = 1) {
    const { chromium } = require('playwright');
    
    const browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const browserPage = await browser.newPage();
    
    try {
      this.log(`正在采集第 ${page} 页...`);
      
      // 设置超时
      browserPage.setDefaultTimeout(60000);
      
      // 访问页面
      await browserPage.goto(this.baseUrl, { 
        waitUntil: 'networkidle',
        timeout: 60000
      });
      
      // 等待页面加载
      await browserPage.waitForTimeout(5000);
      
      // 如果不是第一页，需要导航
      if (page > 1) {
        const navigated = await this.navigateToPage(browserPage, page);
        if (!navigated) {
          this.log(`无法导航到第 ${page} 页`);
          return [];
        }
        
        // 导航后等待页面加载
        await browserPage.waitForTimeout(8000);
      }
      
      // 提取活动数据
      const events = await this.extractEvents(browserPage);
      
      await browser.close();
      return events;

    } catch (error) {
      await browser.close();
      throw error;
    }
  }

  // 改进的导航方法
  async navigateToPage(browserPage, targetPage) {
    try {
      // 方法1: 直接点击页码（适用于页码可见的情况）
      if (targetPage <= 6) {
        const pageButton = browserPage.locator(`text="${targetPage}"`).nth(1); // 选择线下活动区域的页码
        if (await pageButton.isVisible({ timeout: 5000 })) {
          await pageButton.click();
          await browserPage.waitForTimeout(5000);
          this.log(`通过页码按钮导航到第 ${targetPage} 页`);
          return true;
        }
      }
      
      // 方法2: 使用"Next 5 pages"按钮
      if (targetPage > 6 && targetPage <= 16) {
        // 先点击"Next 5 pages"
        const next5Button = browserPage.locator('text="Next 5 pages"').nth(1);
        if (await next5Button.isVisible({ timeout: 5000 })) {
          await next5Button.click();
          await browserPage.waitForTimeout(3000);
          
          // 再点击具体页码
          const pageButton = browserPage.locator(`text="${targetPage}"`).nth(1);
          if (await pageButton.isVisible({ timeout: 5000 })) {
            await pageButton.click();
            await browserPage.waitForTimeout(5000);
            this.log(`通过Next 5 pages导航到第 ${targetPage} 页`);
            return true;
          }
        }
      }
      
      // 方法3: 逐步点击下一页（备用方案）
      if (targetPage <= 10) {
        // 重新加载页面
        await browserPage.goto(this.baseUrl, { 
          waitUntil: 'networkidle',
          timeout: 30000
        });
        await browserPage.waitForTimeout(3000);
        
        // 逐页点击
        for (let i = 1; i < targetPage; i++) {
          const nextButton = browserPage.locator('button:has-text("Go to next page")').nth(1);
          if (await nextButton.isVisible({ timeout: 5000 }) && await nextButton.isEnabled()) {
            await nextButton.click();
            await browserPage.waitForTimeout(4000);
            this.log(`点击下一页到第 ${i + 1} 页`);
          } else {
            this.log(`第 ${i + 1} 页的下一页按钮不可用`);
            return false;
          }
        }
        return true;
      }
      
      return false;
    } catch (error) {
      this.log(`导航到第 ${targetPage} 页失败: ${error.message}`);
      return false;
    }
  }

  // 提取活动数据
  async extractEvents(browserPage) {
    return await browserPage.evaluate(() => {
      const events = [];
      
      // 查找线下活动区域
      const sections = document.querySelectorAll('generic');
      let offlineSection = null;
      
      for (let section of sections) {
        const text = section.textContent || '';
        if (text.includes('线下活动')) {
          // 找到包含活动列表的父容器
          const list = section.querySelector('list') || 
                      section.parentElement?.querySelector('list') ||
                      section.closest('div')?.querySelector('list');
          if (list) {
            offlineSection = list;
            break;
          }
        }
      }
      
      if (!offlineSection) {
        console.log('未找到线下活动区域');
        return [];
      }

      const eventItems = offlineSection.querySelectorAll('listitem');
      
      eventItems.forEach(item => {
        try {
          // 查找活动链接
          const linkElement = item.querySelector('link[href*="/event/"]');
          if (!linkElement) return;

          const eventUrl = linkElement.getAttribute('href');
          if (!eventUrl) return;
          
          const fullUrl = eventUrl.startsWith('http') ? eventUrl : `https://usergroup.huodongxing.com${eventUrl}`;
          
          // 提取事件ID
          const idMatch = eventUrl.match(/\/event\/(\d+)/);
          if (!idMatch) return;
          const eventId = idMatch[1];

          // 获取标题
          const headingElement = item.querySelector('heading');
          const title = headingElement ? headingElement.textContent.trim() : '';

          // 获取时间和地点
          const generics = item.querySelectorAll('generic');
          let time = '';
          let location = '';
          
          generics.forEach(generic => {
            const text = generic.textContent.trim();
            
            // 时间格式检测
            if (/\d{2}\/\d{2}\s+\d{2}:\d{2}/.test(text) && !time) {
              time = text;
            }
            // 地点检测（改进版）
            else if (text && 
                     !text.includes('查看详情') && 
                     !text.includes('已结束') &&
                     !text.match(/^\d+$/) && 
                     !text.match(/\d{2}\/\d{2}/) &&
                     text.length >= 2 && 
                     text.length <= 15 &&
                     /[\u4e00-\u9fa5]/.test(text) &&
                     !location) {
              location = text;
            }
          });

          // 获取图片
          const imgElement = item.querySelector('img');
          let imageUrl = '';
          if (imgElement) {
            imageUrl = imgElement.getAttribute('src') || '';
            if (imageUrl && !imageUrl.startsWith('http')) {
              imageUrl = `https://usergroup.huodongxing.com${imageUrl}`;
            }
          }

          if (title && eventId) {
            events.push({
              id: eventId,
              title,
              time,
              location,
              url: fullUrl,
              imageUrl,
              scrapedAt: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('解析活动项失败:', error);
        }
      });

      return events;
    });
  }

  // 主采集方法
  async scrapeAllPages() {
    let allEvents = [];
    let currentPage = 1;
    let consecutiveEmptyPages = 0;
    const maxEmptyPages = 2;
    const maxPages = 18; // 增加到18页以确保覆盖所有页面

    this.log('开始改进版活动采集...');

    while (currentPage <= maxPages && consecutiveEmptyPages < maxEmptyPages) {
      try {
        const pageEvents = await this.scrapePageWithPlaywright(currentPage);
        
        if (pageEvents.length === 0) {
          consecutiveEmptyPages++;
          this.log(`第 ${currentPage} 页没有活动 (连续空页: ${consecutiveEmptyPages}/${maxEmptyPages})`);
        } else {
          consecutiveEmptyPages = 0;
          
          const newEvents = pageEvents.filter(event => this.isNewEvent(event.id));
          this.log(`第 ${currentPage} 页找到 ${pageEvents.length} 个活动，其中 ${newEvents.length} 个是新活动`);
          
          // 下载图片
          for (const event of newEvents) {
            if (event.imageUrl) {
              try {
                const imageName = await this.downloadImage(event.imageUrl, event.id);
                if (imageName) {
                  event.localImage = imageName;
                  this.log(`下载图片成功: ${imageName}`);
                }
              } catch (error) {
                this.log(`下载图片失败 ${event.id}: ${error.message}`);
              }
            }
          }

          allEvents = allEvents.concat(newEvents);
        }

        currentPage++;
        
        // 页面间延迟
        await new Promise(resolve => setTimeout(resolve, 3000));

      } catch (error) {
        this.log(`第 ${currentPage} 页采集失败: ${error.message}`);
        consecutiveEmptyPages++;
        currentPage++;
        
        if (consecutiveEmptyPages >= maxEmptyPages) {
          this.log(`连续失败页面过多，停止采集`);
          break;
        }
      }
    }

    return allEvents;
  }

  saveEvents(newEvents) {
    if (newEvents.length === 0) {
      this.log('没有新活动需要保存');
      return;
    }

    const allEvents = [...this.existingEvents, ...newEvents];
    allEvents.sort((a, b) => new Date(b.scrapedAt) - new Date(a.scrapedAt));

    fs.writeFileSync(this.dataFile, JSON.stringify(allEvents, null, 2), 'utf8');
    this.log(`保存了 ${newEvents.length} 个新活动，总计 ${allEvents.length} 个活动`);
  }

  async run() {
    try {
      this.log('=== 简化版改进采集开始 ===');
      
      const newEvents = await this.scrapeAllPages();
      this.saveEvents(newEvents);
      
      this.log(`=== 采集完成，共采集到 ${newEvents.length} 个新活动 ===`);
      
      if (newEvents.length > 0) {
        console.log('\\n新采集的活动:');
        newEvents.slice(0, 5).forEach((event, index) => {
          console.log(`${index + 1}. ${event.title}`);
          console.log(`   时间: ${event.time}`);
          console.log(`   地点: ${event.location}`);
          console.log('');
        });
        
        if (newEvents.length > 5) {
          console.log(`... 还有 ${newEvents.length - 5} 个活动`);
        }
      }

    } catch (error) {
      this.log(`采集失败: ${error.message}`);
      console.error(error);
    }
  }
}

if (require.main === module) {
  const scraper = new SimpleImprovedScraper();
  scraper.run().catch(console.error);
}

module.exports = SimpleImprovedScraper;