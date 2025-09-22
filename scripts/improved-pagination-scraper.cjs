#!/usr/bin/env node

/**
 * 活动行线下活动分页采集工具
 * 自动遍历所有分页，采集完整的活动数据
 * 支持增量更新和图片下载
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

class EventPaginationScraper {
  constructor(options = {}) {
    this.baseUrl = 'https://usergroup.huodongxing.com/';
    this.dataDir = './data/events';
    this.imageDir = './data/events/images';
    this.dataFile = path.join(this.dataDir, 'events.json');
    this.logFile = path.join(this.dataDir, 'scraper.log');

    // 增量采集配置
    this.incrementalMode = options.incremental !== false; // 默认启用增量模式
    this.earlyStopThreshold = options.earlyStopThreshold || 2; // 连续N页无新增时停止
    this.maxEmptyPages = options.maxEmptyPages || 3; // 最大允许连续空页数

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
    fs.appendFileSync(this.logFile, logMessage + '\n');
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
            fs.unlink(filepath, () => { });
            reject(err);
          });
        }).on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  // 提取当前页面的活动数据
  async extractEventsFromPage(browserPage) {
    return await browserPage.evaluate(() => {
      const events = [];

      // 查找线下活动区域
      const offlineActivitiesUl = document.querySelector('ul#offlineActivities');
      if (!offlineActivitiesUl) {
        return events;
      }

      // 提取活动项 - 使用更通用的选择器
      const eventItems = offlineActivitiesUl.querySelectorAll('li');

      eventItems.forEach((item, index) => {
        try {
          // 提取活动ID
          const linkElement = item.querySelector('a[href*="/event/"]');
          if (!linkElement) return;

          const href = linkElement.getAttribute('href');
          const idMatch = href.match(/\/event\/(\d+)/);
          if (!idMatch) return;

          const eventId = idMatch[1];

          // 提取标题 - 使用更灵活的选择器
          const titleElement = item.querySelector('h3');
          const title = titleElement ? titleElement.textContent.trim() : '';

          // 提取时间和地点 - 改进的解析逻辑
          const allTextElements = item.querySelectorAll('div, span, p, td, li');
          let time = '';
          let location = '';

          allTextElements.forEach(element => {
            const text = element.textContent.trim();

            // 时间格式：09/21 14:00 或 08/02 13:30 或 2024/09/21 14:00
            if (/\d{2,4}\/\d{2}\/?\d{0,2}\s+\d{2}:\d{2}/.test(text) && !time) {
              // 提取标准格式的时间
              const timeMatch = text.match(/(\d{2}\/\d{2}\s+\d{2}:\d{2})/);
              if (timeMatch) {
                time = timeMatch[1];
              }
            }

            // 地点格式：中文城市名
            if (!location && text && text.length >= 2 && text.length <= 20) {
              // 排除明显不是地点的文本
              const excludePatterns = [
                '查看详情', '已结束', '报名', '免费', '活动', '参与', '人数',
                '¥', '元', '价格', '费用', 'http', 'www', '点击',
                '更多', '详情', '链接', '网址', '邮箱', '@', '.com', '.cn'
              ];

              const isExcluded = excludePatterns.some(pattern => text.includes(pattern));
              const isNumber = /^\d+$/.test(text) || /^\d+\s+\d+/.test(text);
              const isTime = /\d{2}\/\d{2}/.test(text) || /\d{2}:\d{2}/.test(text);

              if (!isExcluded && !isNumber && !isTime && /[\u4e00-\u9fa5]/.test(text)) {
                // 检查是否看起来像中国城市名
                const cityPattern = /(北京|上海|广州|深圳|杭州|南京|苏州|成都|重庆|武汉|西安|天津|青岛|大连|厦门|福州|济南|郑州|长沙|合肥|南昌|太原|石家庄|哈尔滨|长春|沈阳|呼和浩特|银川|西宁|兰州|乌鲁木齐|拉萨|昆明|贵阳|南宁|海口|三亚|台北|香港|澳门|福建|浙江|江苏|广东|山东|河南|湖北|湖南|四川|陕西|河北|山西|辽宁|吉林|黑龙江|内蒙古|新疆|西藏|云南|贵州|广西|海南|宁夏|青海|甘肃|台湾|朝阳|海淀|浦东|渝北|徐汇|东城)/;

                if (cityPattern.test(text)) {
                  location = text;
                }
              }
            }
          });

          // 提取图片URL
          const imgElement = item.querySelector('img');
          let imageUrl = '';
          if (imgElement) {
            imageUrl = imgElement.src || imgElement.getAttribute('data-src') || imgElement.getAttribute('data-original') || '';
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

          // 提取浏览量和收藏数 - 改进的解析逻辑
          let views = 0;
          let favorites = 0;
          
          // 优先从 .apply div 中的 .card-img-box 提取
          if (applyDiv) {
            const cardImgBox = applyDiv.querySelector('.card-img-box');
            if (cardImgBox) {
              const spans = cardImgBox.querySelectorAll('span');
              if (spans.length >= 2) {
                views = parseInt(spans[0].textContent.trim()) || 0;
                favorites = parseInt(spans[1].textContent.trim()) || 0;
              }
            }
          }
          
          // 如果没有从 .apply div 中找到，尝试其他方式
          if (views === 0 && favorites === 0) {
            const statsElements = item.querySelectorAll('div');
            statsElements.forEach(stat => {
              const text = stat.textContent.trim();
              // 查找数字模式，通常浏览量和收藏数会在一起显示
              const numbers = text.match(/\d+/g);
              if (numbers && numbers.length >= 2) {
                views = parseInt(numbers[0]) || 0;
                favorites = parseInt(numbers[1]) || 0;
              }
            });
          }

          // 构建完整URL
          const fullUrl = href.startsWith('http') ? href : `https://usergroup.huodongxing.com${href}`;

          const event = {
            id: eventId,
            title,
            time,
            location,
            url: fullUrl,
            imageUrl,
            status, // 添加状态字段
            views,
            favorites,
            scrapedAt: new Date().toISOString()
          };

          events.push(event);

        } catch (error) {
          // 静默处理提取错误
        }
      });

      return events;
    });
  }

  // 检查下一页按钮是否可点击
  async isNextPageAvailable(browserPage) {
    return await browserPage.evaluate(() => {
      // 直接查找所有下一页按钮，选择第二个（线下活动的）
      const allNextButtons = document.querySelectorAll('button[aria-label="Go to next page"]');
      
      if (allNextButtons.length < 2) {
        return false;
      }

      // 选择第二个按钮（线下活动的分页）
      const nextButton = allNextButtons[1];

      if (!nextButton) {
        return false;
      }

      // 修复的按钮状态检查 - 只检查真正的禁用状态，忽略 is-last 类
      const isDisabled = 
        nextButton.disabled ||                           // HTML disabled 属性
        nextButton.hasAttribute('disabled') ||           // disabled 属性存在
        nextButton.getAttribute('aria-disabled') === 'true' ||  // aria-disabled 属性
        nextButton.classList.contains('disabled') ||     // disabled 类
        nextButton.classList.contains('is-disabled');    // is-disabled 类
        // 注意：不检查 is-last 类，因为它可能不准确

      return !isDisabled;
    });
  }

  // 点击下一页按钮
  async clickNextPage(browserPage) {
    return await browserPage.evaluate(() => {
      // 直接查找所有下一页按钮，选择第二个（线下活动的）
      const allNextButtons = document.querySelectorAll('button[aria-label="Go to next page"]');
      
      if (allNextButtons.length < 2) {
        return false;
      }

      // 选择第二个按钮（线下活动的分页）
      const nextButton = allNextButtons[1];

      if (!nextButton) {
        return false;
      }

      // 检查按钮是否可点击 - 只检查真正的禁用状态
      const isDisabled = 
        nextButton.disabled ||
        nextButton.hasAttribute('disabled') ||
        nextButton.getAttribute('aria-disabled') === 'true' ||
        nextButton.classList.contains('disabled') ||
        nextButton.classList.contains('is-disabled');

      if (isDisabled) {
        return false;
      }

      nextButton.click();
      return true;
    });
  }

  // 分页采集方法
  async scrapeAllPages() {
    const { chromium } = require('playwright');
    let browser = null;
    let allEvents = [];
    let currentPage = 1;
    let globalSortIndex = 1; // 全局sort索引，按网站显示顺序递增

    try {
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

      const browserPage = await browser.newPage();
      browserPage.setDefaultTimeout(60000);

      // 访问首页
      this.log('访问首页...');
      await browserPage.goto(this.baseUrl, {
        waitUntil: 'networkidle',
        timeout: 60000
      });

      await browserPage.waitForTimeout(5000);

      // 增量采集状态跟踪
      let consecutiveEmptyPages = 0;
      let consecutivePagesWithoutNew = 0;
      let totalNewEvents = 0;

      // 开始分页采集
      while (true) {
        this.log(`正在采集第 ${currentPage} 页...`);

        try {
          // 提取当前页面的活动
          const pageEvents = await this.extractEventsFromPage(browserPage);

          if (pageEvents.length === 0) {
            consecutiveEmptyPages++;
            this.log(`第 ${currentPage} 页没有找到活动 (连续空页: ${consecutiveEmptyPages})`);
            
            if (consecutiveEmptyPages >= this.maxEmptyPages) {
              this.log(`连续 ${this.maxEmptyPages} 页没有活动，可能已到达最后一页`);
              break;
            }
          } else {
            consecutiveEmptyPages = 0; // 重置连续空页计数
          }

          // 为页面上的每个活动分配sort字段（按网站显示顺序）
          pageEvents.forEach(event => {
            event.sort = globalSortIndex++;
          });

          const newEvents = pageEvents.filter(event => this.isNewEvent(event.id));
          this.log(`第 ${currentPage} 页找到 ${pageEvents.length} 个活动，其中 ${newEvents.length} 个是新活动`);

          // 增量采集逻辑：检查是否应该提前停止
          if (this.incrementalMode && newEvents.length === 0) {
            consecutivePagesWithoutNew++;
            this.log(`连续 ${consecutivePagesWithoutNew} 页无新增活动`);
            
            if (consecutivePagesWithoutNew >= this.earlyStopThreshold) {
              this.log(`🚀 增量采集模式：连续 ${this.earlyStopThreshold} 页无新增，提前结束采集`);
              this.log(`📊 本次增量采集统计：总计新增 ${totalNewEvents} 个活动`);
              break;
            }
          } else if (newEvents.length > 0) {
            consecutivePagesWithoutNew = 0; // 重置连续无新增计数
            totalNewEvents += newEvents.length;
          }

          // 下载图片
          for (const event of newEvents) {
            if (event.imageUrl) {
              try {
                const imageName = await this.downloadImage(event.imageUrl, event.id);
                if (imageName) {
                  event.localImage = imageName;
                }
              } catch (error) {
                this.log(`下载图片失败 ${event.id}: ${error.message}`);
              }
            }
          }

          allEvents = allEvents.concat(newEvents);

          // 检查是否有下一页
          const hasNextPage = await this.isNextPageAvailable(browserPage);
          if (!hasNextPage) {
            this.log(`第 ${currentPage} 页是最后一页，采集完成`);
            break;
          }

          // 点击下一页
          const nextClicked = await this.clickNextPage(browserPage);
          if (!nextClicked) {
            this.log('无法点击下一页按钮，采集结束');
            break;
          }

          // 等待页面加载
          await browserPage.waitForTimeout(6000);
          currentPage++;

          // 添加随机延迟，避免被反爬
          const delay = 3000 + Math.random() * 2000;
          await new Promise(resolve => setTimeout(resolve, delay));

        } catch (error) {
          this.log(`第 ${currentPage} 页采集失败: ${error.message}`);
          break;
        }
      }

    } catch (error) {
      this.log(`采集过程中发生错误: ${error.message}`);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }

    return allEvents;
  }

  saveEvents(newEvents) {
    if (newEvents.length === 0) {
      this.log('没有新活动需要保存');
      return;
    }

    // 合并新旧数据
    const allEvents = [...this.existingEvents, ...newEvents];

    // 按ID去重
    const uniqueEvents = allEvents.reduce((acc, event) => {
      if (!acc.find(e => e.id === event.id)) {
        acc.push(event);
      }
      return acc;
    }, []);

    // 不进行排序，保持网站原始顺序
    // 添加sort字段，从1开始顺序递增，按照抓取顺序（即网站显示顺序）
    uniqueEvents.forEach((event, index) => {
      event.sort = index + 1;
    });

    // 保存到文件
    fs.writeFileSync(this.dataFile, JSON.stringify(uniqueEvents, null, 2));
    this.log(`保存了 ${newEvents.length} 个新活动，总计 ${uniqueEvents.length} 个活动`);

    // 生成统计报告
    this.generateReport(newEvents, uniqueEvents);
  }

  generateReport(newEvents, allEvents) {
    const report = {
      scrapedAt: new Date().toISOString(),
      newEventsThisRun: newEvents.length,
      totalEvents: allEvents.length,
      lastUpdate: new Date().toISOString(),
      statusStats: {
        upcoming: allEvents.filter(e => e.status === 'upcoming').length,
        ended: allEvents.filter(e => e.status === 'ended').length,
        unknown: allEvents.filter(e => e.status === 'unknown').length
      }
    };

    const reportFile = path.join(this.dataDir, 'report.json');
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    this.log(`统计报告已保存到: ${reportFile}`);

    // 计算engagement统计
    const totalViews = allEvents.reduce((sum, e) => sum + (e.views || 0), 0);
    const totalFavorites = allEvents.reduce((sum, e) => sum + (e.favorites || 0), 0);
    const avgViews = Math.round(totalViews / allEvents.length);
    const avgFavorites = Math.round(totalFavorites / allEvents.length);

    this.log(`Engagement统计: 总浏览量=${totalViews}, 总收藏量=${totalFavorites}`);
    this.log(`平均浏览量=${avgViews}, 平均收藏量=${avgFavorites}`);
    this.log(`=== 采集完成，共采集到 ${newEvents.length} 个新活动 ===`);

    // 显示新采集的活动
    if (newEvents.length > 0) {
      console.log('\n新采集的活动:');
      newEvents.forEach((event, index) => {
        const statusText = event.status === 'upcoming' ? '即将开始' : 
                         event.status === 'ended' ? '已结束' : '状态未知';
        console.log(`${index + 1}. ${event.title}`);
        console.log(`   时间: ${event.time}`);
        console.log(`   地点: ${event.location}`);
        console.log(`   状态: ${statusText}`);
        console.log(`   浏览量: ${event.views}, 收藏量: ${event.favorites}`);
        console.log('');
      });

      console.log('\n本次采集Engagement统计:');
      const newTotalViews = newEvents.reduce((sum, e) => sum + (e.views || 0), 0);
      const newTotalFavorites = newEvents.reduce((sum, e) => sum + (e.favorites || 0), 0);
      console.log(`总浏览量: ${newTotalViews}, 总收藏量: ${newTotalFavorites}`);

      console.log('\n活动状态统计:');
      const upcomingCount = newEvents.filter(e => e.status === 'upcoming').length;
      const endedCount = newEvents.filter(e => e.status === 'ended').length;
      const unknownCount = newEvents.filter(e => e.status === 'unknown').length;
      console.log(`即将开始: ${upcomingCount} 个`);
      console.log(`已结束: ${endedCount} 个`);
      console.log(`状态未知: ${unknownCount} 个`);

      console.log('\n最受欢迎活动 (浏览量):');
      const topViewed = newEvents
        .filter(e => e.views > 0)
        .sort((a, b) => b.views - a.views)
        .slice(0, 3);

      topViewed.forEach((event, index) => {
        const statusText = event.status === 'upcoming' ? '即将开始' : 
                         event.status === 'ended' ? '已结束' : '状态未知';
        console.log(`${index + 1}. ${event.title} (${event.views} 浏览, ${statusText})`);
      });
    }
  }

  // 设置采集模式
  setIncrementalMode(enabled = true, options = {}) {
    this.incrementalMode = enabled;
    this.earlyStopThreshold = options.earlyStopThreshold || this.earlyStopThreshold;
    this.maxEmptyPages = options.maxEmptyPages || this.maxEmptyPages;
    
    if (enabled) {
      this.log(`🔄 启用增量采集模式 (连续${this.earlyStopThreshold}页无新增时停止)`);
    } else {
      this.log('📖 使用完整采集模式 (遍历所有页面)');
    }
  }

  // 快速增量采集（更激进的停止条件）
  async runIncremental(options = {}) {
    const incrementalOptions = {
      earlyStopThreshold: options.earlyStopThreshold || 1, // 1页无新增就停止
      maxEmptyPages: options.maxEmptyPages || 2,
      ...options
    };
    
    this.setIncrementalMode(true, incrementalOptions);
    return this.run();
  }

  // 完整采集（遍历所有页面）
  async runFull() {
    this.setIncrementalMode(false);
    return this.run();
  }

  async run() {
    try {
      const modeText = this.incrementalMode ? '增量采集' : '完整采集';
      this.log(`=== ${modeText}开始 ===`);
      
      if (this.incrementalMode) {
        this.log(`📋 增量采集配置: 连续${this.earlyStopThreshold}页无新增时停止, 最大空页数${this.maxEmptyPages}`);
      }

      const newEvents = await this.scrapeAllPages();
      this.saveEvents(newEvents);

    } catch (error) {
      this.log(`采集失败: ${error.message}`);
      throw error;
    }
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const mode = args[0] || 'incremental'; // 默认使用增量模式
  
  const scraper = new EventPaginationScraper();
  
  switch (mode) {
    case 'full':
    case '--full':
      console.log('🔄 启动完整采集模式...');
      scraper.runFull().catch(console.error);
      break;
      
    case 'quick':
    case '--quick':
      console.log('⚡ 启动快速增量采集模式...');
      scraper.runIncremental({ earlyStopThreshold: 1 }).catch(console.error);
      break;
      
    case 'incremental':
    case '--incremental':
    default:
      console.log('📊 启动标准增量采集模式...');
      scraper.run().catch(console.error);
      break;
  }
}

module.exports = EventPaginationScraper;