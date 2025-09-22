#!/usr/bin/env node

/**
 * 简化版活动采集器
 * 专门针对活动行网站优化，避免复杂的分页导航
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

class SimpleScraper {
  constructor() {
    this.baseUrl = 'https://usergroup.huodongxing.com/';
    this.dataDir = './data/events';
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
    fs.appendFileSync(this.logFile, logMessage + '\\n');
  }

  isNewEvent(eventId) {
    return !this.existingEvents.some(event => event.id === eventId);
  }

  async scrapeWithPlaywright() {
    const { chromium } = require('playwright');
    
    this.log('启动浏览器...');
    const browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    try {
      // 设置较长的超时时间
      page.setDefaultTimeout(60000);
      
      this.log('访问网站首页...');
      await page.goto(this.baseUrl, { 
        waitUntil: 'networkidle',
        timeout: 60000
      });
      
      // 等待页面完全加载
      await page.waitForTimeout(10000);
      
      let allEvents = [];
      let currentPage = 1;
      const maxPages = 16; // 根据MCP验证结果设置
      
      while (currentPage <= maxPages) {
        this.log(`正在采集第 ${currentPage} 页...`);
        
        // 等待页面稳定
        await page.waitForTimeout(5000);
        
        // 提取当前页面的活动
        const pageEvents = await page.evaluate(() => {
          const events = [];
          
          // 查找所有活动链接
          const eventLinks = document.querySelectorAll('a[href*="/event/"]');
          
          eventLinks.forEach((link, index) => {
            try {
              const href = link.getAttribute('href');
              const eventId = href.match(/\\/event\\/(\\d+)/)?.[1];
              
              if (!eventId) return;
              
              // 获取活动标题
              let title = link.textContent.trim();
              
              // 如果链接文本太短，尝试从父元素获取
              if (title.length < 10) {
                const parent = link.closest('li, div');
                if (parent) {
                  const headings = parent.querySelectorAll('h1, h2, h3, h4, h5, h6');
                  if (headings.length > 0) {
                    title = headings[0].textContent.trim();
                  }
                }
              }
              
              // 验证标题合理性
              if (title.length > 5 && 
                  title.length < 200 && 
                  /[\\u4e00-\\u9fa5]/.test(title) &&
                  !title.includes('微信用户') &&
                  !title.includes('个月前')) {
                
                // 查找时间和地点信息
                const container = link.closest('li, div');
                let time = '';
                let location = '';
                
                if (container) {
                  const allText = container.textContent;
                  
                  // 提取时间
                  const timeMatch = allText.match(/(\\d{2}\\/\\d{2}\\s+\\d{2}:\\d{2})/);
                  if (timeMatch) {
                    time = timeMatch[1];
                  }
                  
                  // 提取地点
                  const locationMatch = allText.match(/(北京|上海|广州|深圳|杭州|南京|苏州|成都|重庆|武汉|西安|天津|青岛|大连|厦门|福州|济南|郑州|长沙|合肥|南昌|太原|石家庄|哈尔滨|长春|沈阳|呼和浩特|银川|西宁|兰州|乌鲁木齐|拉萨|昆明|贵阳|南宁|海口|三亚|台北|香港|澳门|福建|浙江|江苏|广东|山东|河南|湖北|湖南|四川|陕西|河北|山西|辽宁|吉林|黑龙江|内蒙古|新疆|西藏|云南|贵州|广西|海南|宁夏|青海|甘肃|台湾|朝阳|海淀|浦东|渝北|徐汇|东城)[\\u4e00-\\u9fa5]*?/);
                  if (locationMatch) {
                    location = locationMatch[0];
                  }
                }
                
                const fullUrl = href.startsWith('http') ? href : `https://usergroup.huodongxing.com${href}`;
                
                events.push({
                  id: eventId,
                  title: title,
                  time: time,
                  location: location,
                  url: fullUrl,
                  imageUrl: '',
                  scrapedAt: new Date().toISOString()
                });
              }
            } catch (error) {
              console.error(`解析活动 ${index} 失败:`, error);
            }
          });
          
          // 去重
          const uniqueEvents = [];
          const seenIds = new Set();
          
          events.forEach(event => {
            if (!seenIds.has(event.id)) {
              seenIds.add(event.id);
              uniqueEvents.push(event);
            }
          });
          
          console.log(`页面解析完成，找到 ${uniqueEvents.length} 个唯一活动`);
          return uniqueEvents;
        });
        
        // 过滤新活动
        const newEvents = pageEvents.filter(event => this.isNewEvent(event.id));
        this.log(`第 ${currentPage} 页找到 ${pageEvents.length} 个活动，其中 ${newEvents.length} 个是新活动`);
        
        allEvents = allEvents.concat(newEvents);
        
        // 尝试导航到下一页
        if (currentPage < maxPages) {
          try {
            // 查找并点击下一页按钮
            const nextPageClicked = await page.evaluate(() => {
              // 查找线下活动区域的下一页按钮
              const buttons = document.querySelectorAll('button, a');
              
              for (let button of buttons) {
                const text = button.textContent.toLowerCase();
                if ((text.includes('next') || text.includes('下一页') || text.includes('›')) && 
                    !button.disabled && 
                    !button.classList.contains('disabled')) {
                  
                  // 检查是否在线下活动区域
                  const offlineSection = button.closest('div');
                  if (offlineSection && offlineSection.textContent.includes('线下活动')) {
                    button.click();
                    return true;
                  }
                }
              }
              
              return false;
            });
            
            if (nextPageClicked) {
              this.log(`成功点击下一页按钮`);
              await page.waitForTimeout(8000); // 等待页面加载
            } else {
              this.log(`未找到下一页按钮，尝试直接跳转`);
              
              // 尝试直接点击页码
              const pageClicked = await page.evaluate((targetPage) => {
                const pageButtons = document.querySelectorAll('a, button, span');
                
                for (let button of pageButtons) {
                  if (button.textContent.trim() === (targetPage + 1).toString()) {
                    if (button.tagName === 'A' || button.tagName === 'BUTTON') {
                      button.click();
                      return true;
                    }
                  }
                }
                
                return false;
              }, currentPage);
              
              if (pageClicked) {
                this.log(`成功点击页码 ${currentPage + 1}`);
                await page.waitForTimeout(8000);
              } else {
                this.log(`无法导航到第 ${currentPage + 1} 页，停止采集`);
                break;
              }
            }
          } catch (error) {
            this.log(`导航到第 ${currentPage + 1} 页失败: ${error.message}`);
            break;
          }
        }
        
        currentPage++;
        
        // 添加页面间延迟
        await page.waitForTimeout(10000 + Math.random() * 5000);
      }
      
      await browser.close();
      return allEvents;
      
    } catch (error) {
      await browser.close();
      throw error;
    }
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
  }

  async run() {
    try {
      this.log('=== 简化版活动采集开始 ===');
      
      const newEvents = await this.scrapeWithPlaywright();
      this.saveEvents(newEvents);
      
      this.log(`=== 采集完成，共采集到 ${newEvents.length} 个新活动 ===`);
      
      return {
        newEvents: newEvents.length,
        totalEvents: this.existingEvents.length + newEvents.length
      };
      
    } catch (error) {
      this.log(`采集失败: ${error.message}`);
      console.error(error);
      throw error;
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const scraper = new SimpleScraper();
  scraper.run().catch(console.error);
}

module.exports = SimpleScraper;