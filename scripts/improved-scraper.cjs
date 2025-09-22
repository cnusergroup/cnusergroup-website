#!/usr/bin/env node

/**
 * 改进版活动行线下活动采集工具
 * 主要改进：
 * 1. 更强的分页检测和导航逻辑
 * 2. 更好的错误处理和重试机制
 * 3. 更智能的页面存在性判断
 * 4. 更稳定的元素选择器
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

class ImprovedEventScraper {
  constructor() {
    this.baseUrl = 'https://usergroup.huodongxing.com/';
    this.dataDir = './data/events';
    this.imageDir = './data/events/images';
    this.dataFile = path.join(this.dataDir, 'events.json');
    this.logFile = path.join(this.dataDir, 'scraper.log');
    
    // 确保目录存在
    this.ensureDirectories();
    
    // 加载已有数据
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
    
    // 写入日志文件
    fs.appendFileSync(this.logFile, logMessage + '\n');
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

        // 如果文件已存在，跳过下载
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
            fs.unlink(filepath, () => {}); // 删除不完整的文件
            reject(err);
          });
        }).on('error', (err) => {
          reject(err);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  extractEventId(url) {
    const match = url.match(/\/event\/(\d+)/);
    return match ? match[1] : null;
  }

  isNewEvent(eventId) {
    return !this.existingEvents.some(event => event.id === eventId);
  }

  // 改进的分页采集方法
  async scrapePageWithPlaywright(page = 1, retryCount = 0) {
    const { chromium } = require('playwright');
    
    const browser = await chromium.launch({ 
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security'
      ]
    });
    
    const browserPage = await browser.newPage();
    
    try {
      // 设置更真实的浏览器环境
      await browserPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await browserPage.setViewportSize({ width: 1920, height: 1080 });
      
      this.log(`正在采集第 ${page} 页 (重试次数: ${retryCount})...`);
      
      // 设置超时时间
      browserPage.setDefaultTimeout(45000);
      
      // 访问页面
      await browserPage.goto(this.baseUrl, { 
        waitUntil: 'networkidle',
        timeout: 60000
      });
      
      // 等待页面完全加载
      await browserPage.waitForTimeout(5000);
      
      // 等待线下活动区域加载
      try {
        await browserPage.waitForSelector('text="线下活动"', { timeout: 15000 });
        await browserPage.waitForTimeout(3000);
      } catch (error) {
        this.log(`等待线下活动区域超时: ${error.message}`);
      }
      
      // 如果不是第一页，需要导航到指定页面
      if (page > 1) {
        const navigated = await this.navigateToPage(browserPage, page);
        if (!navigated) {
          this.log(`无法导航到第 ${page} 页`);
          return [];
        }
      }

      // 等待页面内容加载
      await browserPage.waitForTimeout(8000);
      
      // 检查页面是否有活动内容
      const hasContent = await this.checkPageHasContent(browserPage);
      if (!hasContent) {
        this.log(`第 ${page} 页没有活动内容`);
        return [];
      }

      // 获取线下活动列表
      const events = await this.extractEventsFromPage(browserPage);
      
      await browser.close();
      return events;

    } catch (error) {
      await browser.close();
      throw error;
    }
  }

  // 改进的页面导航方法
  async navigateToPage(browserPage, targetPage) {
    let navigated = false;
    
    // 方法1: 直接点击页码（适用于页码在当前视图中）
    if (targetPage <= 6) {
      try {
        const pageButton = browserPage.locator(`text="${targetPage}"`).first();
        if (await pageButton.isVisible({ timeout: 5000 })) {
          await pageButton.click();
          await browserPage.waitForTimeout(5000);
          navigated = true;
          this.log(`通过页码按钮导航到第 ${targetPage} 页`);
        }
      } catch (error) {
        this.log(`页码按钮导航失败: ${error.message}`);
      }
    }
    
    // 方法2: 使用"Next 5 pages"按钮（适用于较大页码）
    if (!navigated && targetPage > 6) {
      try {
        // 先点击"Next 5 pages"按钮
        const next5Button = browserPage.locator('text="Next 5 pages"').first();
        if (await next5Button.isVisible({ timeout: 5000 })) {
          await next5Button.click();
          await browserPage.waitForTimeout(3000);
          
          // 再尝试点击具体页码
          const pageButton = browserPage.locator(`text="${targetPage}"`).first();
          if (await pageButton.isVisible({ timeout: 5000 })) {
            await pageButton.click();
            await browserPage.waitForTimeout(5000);
            navigated = true;
            this.log(`通过Next 5 pages导航到第 ${targetPage} 页`);
          }
        }
      } catch (error) {
        this.log(`Next 5 pages导航失败: ${error.message}`);
      }
    }
    
    // 方法3: 逐步点击下一页按钮（备用方案）
    if (!navigated && targetPage <= 10) {
      try {
        // 重新加载第一页
        await browserPage.goto(this.baseUrl, { 
          waitUntil: 'networkidle',
          timeout: 30000
        });
        await browserPage.waitForTimeout(3000);
        
        // 逐页点击下一页
        for (let i = 1; i < targetPage; i++) {
          const nextButton = browserPage.locator('button:has-text("Go to next page")').nth(1); // 线下活动区域的下一页按钮
          if (await nextButton.isVisible({ timeout: 5000 }) && await nextButton.isEnabled()) {
            await nextButton.click();
            await browserPage.waitForTimeout(4000);
            this.log(`点击下一页按钮到第 ${i + 1} 页`);
          } else {
            throw new Error(`第 ${i + 1} 页的下一页按钮不可用`);
          }
        }
        navigated = true;
      } catch (error) {
        this.log(`下一页按钮导航失败: ${error.message}`);
      }
    }
    
    return navigated;
  }

  // 检查页面是否有内容
  async checkPageHasContent(browserPage) {
    try {
      const hasEvents = await browserPage.evaluate(() => {
        // 查找线下活动区域
        const offlineSection = Array.from(document.querySelectorAll('*')).find(el => 
          el.textContent && el.textContent.includes('线下活动')
        );
        
        if (!offlineSection) return false;
        
        // 查找活动列表
        const eventList = offlineSection.querySelector('list, ul') || 
                         offlineSection.closest('div').querySelector('list, ul');
        
        if (!eventList) return false;
        
        // 检查是否有活动项
        const eventItems = eventList.querySelectorAll('listitem, li');
        return eventItems.length > 0;
      });
      
      return hasEvents;
    } catch (error) {
      this.log(`检查页面内容失败: ${error.message}`);
      return false;
    }
  }

  // 从页面提取活动数据
  async extractEventsFromPage(browserPage) {
    return await browserPage.evaluate(() => {
      // 数据清理函数
      function cleanEventData(event) {
        event.title = event.title.replace(/\\s+/g, ' ').trim();
        
        if (event.location) {
          event.location = event.location.trim();
          
          if (!/[\u4e00-\u9fa5]/.test(event.location) || 
              /^\d+\s+\d+/.test(event.location) ||
              event.location.length < 2) {
            
            const cityMatches = event.title.match(/(北京|上海|广州|深圳|杭州|南京|苏州|成都|重庆|武汉|西安|天津|青岛|大连|厦门|福州|济南|郑州|长沙|合肥|南昌|太原|石家庄|哈尔滨|长春|沈阳|呼和浩特|银川|西宁|兰州|乌鲁木齐|拉萨|昆明|贵阳|南宁|海口|三亚|台北|香港|澳门|福建|浙江|江苏|广东|山东|河南|湖北|湖南|四川|陕西|河北|山西|辽宁|吉林|黑龙江|内蒙古|新疆|西藏|云南|贵州|广西|海南|宁夏|青海|甘肃|台湾)/);
            
            if (cityMatches) {
              event.location = cityMatches[1];
            } else {
              event.location = '';
            }
          }
        }
        
        if (event.time && !/\d{2}\/\d{2}\s+\d{2}:\d{2}/.test(event.time)) {
          event.time = '';
        }
        
        return event;
      }

      // 查找线下活动区域
      const offlineSection = Array.from(document.querySelectorAll('*')).find(el => 
        el.textContent && el.textContent.includes('线下活动')
      );
      
      if (!offlineSection) {
        console.log('未找到线下活动区域');
        return [];
      }

      // 查找活动列表
      const eventList = offlineSection.querySelector('list, ul') || 
                       offlineSection.closest('div').querySelector('list, ul');
      
      if (!eventList) {
        console.log('未找到活动列表');
        return [];
      }

      const eventItems = eventList.querySelectorAll('listitem, li');
      const events = [];

      eventItems.forEach(item => {
        try {
          // 必须包含活动链接才是有效的活动项
          const linkElement = item.querySelector('a[href*="/event/"]');
          if (!linkElement) return;

          const eventUrl = linkElement.getAttribute('href');
          const fullUrl = eventUrl.startsWith('http') ? eventUrl : `https://usergroup.huodongxing.com${eventUrl}`;
          
          // 提取事件ID
          const idMatch = eventUrl.match(/\/event\/(\d+)/);
          if (!idMatch) return;
          const eventId = idMatch[1];

          // 获取标题
          const titleElement = item.querySelector('heading, h1, h2, h3, h4');
          const title = titleElement ? titleElement.textContent.trim() : '';

          // 获取时间和地点 - 改进的解析逻辑
          const allDivs = item.querySelectorAll('generic, div, span, p');
          let time = '';
          let location = '';
          
          allDivs.forEach(element => {
            const text = element.textContent.trim();
            
            // 时间格式：09/21 14:00 或 08/02 13:30
            if (/\d{2}\/\d{2}\s+\d{2}:\d{2}/.test(text) && !time) {
              time = text;
            }
            // 地点格式：改进的地点识别
            else if (text && 
                     !text.includes('查看详情') && 
                     !text.includes('已结束') && 
                     !text.includes('活动') &&
                     !text.includes('报名') &&
                     !text.includes('免费') &&
                     !text.includes('¥') &&
                     !text.match(/^\d+$/) && 
                     !text.match(/\d{2}\/\d{2}/) &&
                     !text.match(/^\d+\s+\d+/) &&
                     text.length >= 2 && 
                     text.length <= 15 &&
                     !location) {
              
              // 检查是否包含中文字符或是常见地名格式
              if (/[\u4e00-\u9fa5]/.test(text) && 
                  !/^\d/.test(text) &&
                  !text.includes('http') &&
                  !text.includes('www')) {
                location = text;
              }
            }
          });

          // 获取图片URL
          const imgElement = item.querySelector('img');
          let imageUrl = '';
          if (imgElement) {
            imageUrl = imgElement.src || imgElement.getAttribute('data-src') || '';
            if (imageUrl && !imageUrl.startsWith('http')) {
              imageUrl = `https://usergroup.huodongxing.com${imageUrl}`;
            }
          }

          // 获取活动状态 - 检查按钮文字
          let status = 'unknown';
          const applyDiv = item.querySelector('.apply, div.apply');
          if (applyDiv) {
            const buttonText = applyDiv.textContent.trim();
            if (buttonText.includes('立即报名')) {
              status = 'upcoming'; // 即将开始
            } else if (buttonText.includes('查看详情')) {
              status = 'ended'; // 已结束
            }
          }
          
          // 如果没找到 .apply div，尝试其他方式查找按钮
          if (status === 'unknown') {
            const allButtons = item.querySelectorAll('a, button');
            for (const button of allButtons) {
              const buttonText = button.textContent.trim();
              if (buttonText.includes('立即报名')) {
                status = 'upcoming';
                break;
              } else if (buttonText.includes('查看详情')) {
                status = 'ended';
                break;
              }
            }
          }

          if (title && eventId) {
            const eventData = {
              id: eventId,
              title,
              time,
              location,
              url: fullUrl,
              imageUrl,
              status, // 添加状态字段
              scrapedAt: new Date().toISOString()
            };
            
            // 应用数据清理
            const cleanedEvent = cleanEventData(eventData);
            events.push(cleanedEvent);
          }
        } catch (error) {
          console.error('解析活动项失败:', error);
        }
      });

      return events;
    });
  }

  // 改进的主采集方法
  async scrapeAllPages() {
    let allEvents = [];
    let currentPage = 1;
    let consecutiveEmptyPages = 0;
    const maxEmptyPages = 3; // 连续3页没有新活动就停止
    const maxPages = 20; // 最大页数限制

    this.log('开始采集活动数据...');

    while (currentPage <= maxPages && consecutiveEmptyPages < maxEmptyPages) {
      let pageEvents = [];
      let retryCount = 0;
      const maxRetries = 3;

      // 重试机制
      while (retryCount < maxRetries) {
        try {
          pageEvents = await this.scrapePageWithPlaywright(currentPage, retryCount);
          break; // 成功则跳出重试循环
        } catch (error) {
          retryCount++;
          this.log(`第 ${currentPage} 页采集失败 (重试 ${retryCount}/${maxRetries}): ${error.message}`);
          
          if (retryCount >= maxRetries) {
            this.log(`第 ${currentPage} 页重试次数已达上限，跳过此页`);
            break;
          }
          
          // 重试前等待
          await new Promise(resolve => setTimeout(resolve, 5000 * retryCount));
        }
      }
      
      if (pageEvents.length === 0) {
        consecutiveEmptyPages++;
        this.log(`第 ${currentPage} 页没有找到活动 (连续空页: ${consecutiveEmptyPages}/${maxEmptyPages})`);
        
        if (consecutiveEmptyPages >= maxEmptyPages) {
          this.log(`连续 ${maxEmptyPages} 页没有活动，停止采集`);
          break;
        }
      } else {
        consecutiveEmptyPages = 0; // 重置连续空页计数
        
        // 检查是否有新活动
        const newEvents = pageEvents.filter(event => this.isNewEvent(event.id));
        
        if (newEvents.length === 0) {
          this.log(`第 ${currentPage} 页没有新活动`);
        } else {
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
      }

      currentPage++;

      // 添加页面间延迟
      await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
    }

    return allEvents;
  }

  saveEvents(newEvents) {
    if (newEvents.length === 0) {
      this.log('没有新活动需要保存');
      return;
    }

    // 合并新活动和已有活动
    const allEvents = [...this.existingEvents, ...newEvents];
    
    // 按时间排序（最新的在前面）
    allEvents.sort((a, b) => new Date(b.scrapedAt) - new Date(a.scrapedAt));

    // 保存到文件
    fs.writeFileSync(this.dataFile, JSON.stringify(allEvents, null, 2), 'utf8');
    
    this.log(`保存了 ${newEvents.length} 个新活动，总计 ${allEvents.length} 个活动`);
    
    // 生成统计报告
    this.generateReport(newEvents, allEvents);
  }

  generateReport(newEvents, allEvents) {
    const reportFile = path.join(this.dataDir, 'report.json');
    
    const stats = {
      totalEvents: allEvents.length,
      newEventsThisRun: newEvents.length,
      lastUpdate: new Date().toISOString(),
      locationStats: {},
      timeStats: {},
      statusStats: {
        upcoming: 0,
        ended: 0,
        unknown: 0
      },
      dataQuality: {
        eventsWithLocation: 0,
        eventsWithTime: 0,
        eventsWithImage: 0,
        eventsWithStatus: 0
      }
    };

    allEvents.forEach(event => {
      if (event.location) {
        stats.locationStats[event.location] = (stats.locationStats[event.location] || 0) + 1;
        stats.dataQuality.eventsWithLocation++;
      }
      
      if (event.time) {
        const month = event.time.substring(0, 5);
        stats.timeStats[month] = (stats.timeStats[month] || 0) + 1;
        stats.dataQuality.eventsWithTime++;
      }
      
      if (event.imageUrl || event.localImage) {
        stats.dataQuality.eventsWithImage++;
      }
      
      // 统计活动状态
      if (event.status) {
        stats.statusStats[event.status] = (stats.statusStats[event.status] || 0) + 1;
        stats.dataQuality.eventsWithStatus++;
      }
    });

    fs.writeFileSync(reportFile, JSON.stringify(stats, null, 2), 'utf8');
    this.log(`统计报告已保存到: ${reportFile}`);
  }

  async run() {
    try {
      this.log('=== 改进版活动采集开始 ===');
      
      const newEvents = await this.scrapeAllPages();
      this.saveEvents(newEvents);
      
      this.log(`=== 采集完成，共采集到 ${newEvents.length} 个新活动 ===`);
      
      // 输出统计信息
      if (newEvents.length > 0) {
        console.log('\\n新采集的活动:');
        newEvents.slice(0, 10).forEach((event, index) => {
          const statusText = event.status === 'upcoming' ? '即将开始' : 
                           event.status === 'ended' ? '已结束' : '状态未知';
          console.log(`${index + 1}. ${event.title}`);
          console.log(`   时间: ${event.time}`);
          console.log(`   地点: ${event.location}`);
          console.log(`   状态: ${statusText}`);
          console.log(`   链接: ${event.url}`);
          console.log(`   图片: ${event.localImage || '无'}`);
          console.log('');
        });
        
        if (newEvents.length > 10) {
          console.log(`... 还有 ${newEvents.length - 10} 个活动`);
        }
      }

    } catch (error) {
      this.log(`采集失败: ${error.message}`);
      console.error(error);
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const scraper = new ImprovedEventScraper();
  scraper.run().catch(console.error);
}

module.exports = ImprovedEventScraper;