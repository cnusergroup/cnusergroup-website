#!/usr/bin/env node

/**
 * 修复版活动采集工具
 * 基于MCP验证的页面结构进行优化
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

class FixedEventScraper {
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

  // 修复版分页采集方法 - 增强重试机制
  async scrapePageWithPlaywright(page = 1, retryCount = 0) {
    const maxRetries = 3;
    const { chromium } = require('playwright');
    
    let browser = null;
    
    try {
      this.log(`正在采集第 ${page} 页... (尝试 ${retryCount + 1}/${maxRetries + 1})`);
      
      browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const browserPage = await browser.newPage();
      browserPage.setDefaultTimeout(60000);
      
      // 访问页面 - 增加重试逻辑
      let pageLoaded = false;
      for (let i = 0; i < 3; i++) {
        try {
          await browserPage.goto(this.baseUrl, { 
            waitUntil: 'networkidle',
            timeout: 60000
          });
          pageLoaded = true;
          break;
        } catch (gotoError) {
          this.log(`页面加载失败 (尝试 ${i + 1}/3): ${gotoError.message}`);
          if (i < 2) {
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
      }
      
      if (!pageLoaded) {
        throw new Error('页面加载失败 - 所有重试都失败');
      }
      
      await browserPage.waitForTimeout(5000);
      
      // 如果不是第一页，进行导航
      if (page > 1) {
        const navigated = await this.navigateToPage(browserPage, page);
        if (!navigated) {
          this.log(`导航到第 ${page} 页失败，但尝试提取当前页面内容`);
        } else {
          await browserPage.waitForTimeout(8000); // 导航成功后等待更长时间
        }
      }
      
      // 提取活动数据
      const events = await this.extractEventsFromPage(browserPage);
      
      await browser.close();
      
      // 验证提取的数据质量
      if (events.length === 0 && page === 1) {
        throw new Error('第一页没有提取到任何活动 - 可能页面结构发生变化');
      }
      
      return events;

    } catch (error) {
      if (browser) {
        await browser.close();
      }
      
      // 实现指数退避重试
      if (retryCount < maxRetries) {
        const backoffDelay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
        this.log(`第 ${page} 页采集失败，${backoffDelay.toFixed(0)}ms后重试: ${error.message}`);
        
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        return this.scrapePageWithPlaywright(page, retryCount + 1);
      }
      
      this.log(`第 ${page} 页采集最终失败 (已重试${maxRetries}次): ${error.message}`);
      throw error;
    }
  }

  // 基于新el-pagination结构的导航方法
  async navigateToPage(browserPage, targetPage) {
    try {
      // 等待分页区域加载
      await browserPage.waitForTimeout(3000);
      
      // 查找与线下活动相关的分页容器
      const paginationFound = await browserPage.evaluate(() => {
        // 查找所有分页容器
        const paginationBoxes = document.querySelectorAll('.pagination-box');
        console.log(`找到 ${paginationBoxes.length} 个分页容器`);
        
        // 查找线下活动区域
        const offlineActivitiesUl = document.querySelector('ul#offlineActivities');
        if (!offlineActivitiesUl) {
          console.log('未找到线下活动区域');
          return false;
        }
        
        // 查找与线下活动最近的分页容器
        let targetPagination = null;
        let minDistance = Infinity;
        
        paginationBoxes.forEach(box => {
          // 计算分页容器与线下活动区域的距离
          const boxRect = box.getBoundingClientRect();
          const ulRect = offlineActivitiesUl.getBoundingClientRect();
          const distance = Math.abs(boxRect.top - ulRect.bottom);
          
          if (distance < minDistance) {
            minDistance = distance;
            targetPagination = box;
          }
        });
        
        if (targetPagination) {
          // 将目标分页容器标记为活动分页
          targetPagination.setAttribute('data-offline-pagination', 'true');
          console.log('找到并标记了线下活动的分页容器');
          return true;
        }
        
        return false;
      });
      
      if (!paginationFound) {
        this.log('未找到线下活动的分页容器');
        return false;
      }
      
      // 方法1: 直接点击页码（适用于页码1-6）
      if (targetPage <= 6) {
        const pageClicked = await browserPage.evaluate((page) => {
          const targetPagination = document.querySelector('[data-offline-pagination="true"]');
          if (!targetPagination) return false;
          
          // 在目标分页容器中查找页码按钮
          const pageNumbers = targetPagination.querySelectorAll('.el-pager li.number');
          
          for (let pageElement of pageNumbers) {
            if (pageElement.textContent.trim() === page.toString()) {
              pageElement.click();
              console.log(`点击了页码 ${page}`);
              return true;
            }
          }
          return false;
        }, targetPage);
        
        if (pageClicked) {
          await browserPage.waitForTimeout(6000);
          this.log(`通过页码按钮导航到第 ${targetPage} 页`);
          return true;
        }
      }
      
      // 方法2: 使用"Next 5 pages"按钮（适用于页码7-16）
      if (targetPage > 6) {
        const next5Clicked = await browserPage.evaluate(() => {
          const targetPagination = document.querySelector('[data-offline-pagination="true"]');
          if (!targetPagination) return false;
          
          // 查找"Next 5 pages"按钮
          const nextFiveButton = targetPagination.querySelector('.el-pager li.more.btn-quicknext');
          if (nextFiveButton) {
            nextFiveButton.click();
            console.log('点击了Next 5 pages');
            return true;
          }
          return false;
        });
        
        if (next5Clicked) {
          await browserPage.waitForTimeout(4000);
          
          // 再次尝试点击具体页码
          const pageClicked = await browserPage.evaluate((page) => {
            const targetPagination = document.querySelector('[data-offline-pagination="true"]');
            if (!targetPagination) return false;
            
            const pageNumbers = targetPagination.querySelectorAll('.el-pager li.number');
            
            for (let pageElement of pageNumbers) {
              if (pageElement.textContent.trim() === page.toString()) {
                pageElement.click();
                console.log(`点击了页码 ${page}`);
                return true;
              }
            }
            return false;
          }, targetPage);
          
          if (pageClicked) {
            await browserPage.waitForTimeout(6000);
            this.log(`通过Next 5 pages导航到第 ${targetPage} 页`);
            return true;
          }
        }
      }
      
      // 方法3: 逐步点击下一页按钮（备用方案）
      if (targetPage <= 16) {
        // 重新加载页面
        await browserPage.goto(this.baseUrl, { 
          waitUntil: 'networkidle',
          timeout: 30000
        });
        await browserPage.waitForTimeout(3000);
        
        // 重新标记分页容器
        await browserPage.evaluate(() => {
          const paginationBoxes = document.querySelectorAll('.pagination-box');
          const offlineActivitiesUl = document.querySelector('ul#offlineActivities');
          if (!offlineActivitiesUl) return false;
          
          let targetPagination = null;
          let minDistance = Infinity;
          
          paginationBoxes.forEach(box => {
            const boxRect = box.getBoundingClientRect();
            const ulRect = offlineActivitiesUl.getBoundingClientRect();
            const distance = Math.abs(boxRect.top - ulRect.bottom);
            
            if (distance < minDistance) {
              minDistance = distance;
              targetPagination = box;
            }
          });
          
          if (targetPagination) {
            targetPagination.setAttribute('data-offline-pagination', 'true');
          }
        });
        
        // 逐页点击
        for (let i = 1; i < targetPage; i++) {
          const nextClicked = await browserPage.evaluate(() => {
            const targetPagination = document.querySelector('[data-offline-pagination="true"]');
            if (!targetPagination) return false;
            
            const nextButton = targetPagination.querySelector('button.btn-next');
            if (nextButton && !nextButton.hasAttribute('disabled') && !nextButton.classList.contains('is-last')) {
              nextButton.click();
              console.log('点击了下一页按钮');
              return true;
            }
            return false;
          });
          
          if (nextClicked) {
            await browserPage.waitForTimeout(5000);
            this.log(`通过下一页按钮导航到第 ${i + 1} 页`);
          } else {
            this.log(`第 ${i + 1} 页的下一页按钮不可用`);
            return false;
          }
        }
        return true;
      }
      
      return false;
    } catch (error) {
      this.log(`导航失败: ${error.message}`);
      return false;
    }
  }

  // 基于新HTML结构提取活动数据 - 增强错误处理和弹性
  async extractEventsFromPage(browserPage) {
    return await browserPage.evaluate(() => {
      const events = [];
      
      // 查找线下活动区域 - 使用多个回退选择器
      let offlineActivitiesUl = document.querySelector('ul#offlineActivities');
      
      // 回退选择器1: 通过class查找
      if (!offlineActivitiesUl) {
        offlineActivitiesUl = document.querySelector('ul.event-horizontal-list-new');
        console.log('使用回退选择器1: ul.event-horizontal-list-new');
      }
      
      // 回退选择器2: 通过包含"线下活动"文本的元素查找
      if (!offlineActivitiesUl) {
        const allElements = document.querySelectorAll('*');
        for (let element of allElements) {
          if (element.textContent && element.textContent.includes('线下活动')) {
            const parentDiv = element.closest('div');
            if (parentDiv) {
              const ul = parentDiv.querySelector('ul');
              if (ul && ul.querySelectorAll('li').length > 0) {
                offlineActivitiesUl = ul;
                console.log('使用回退选择器2: 通过"线下活动"文本查找');
                break;
              }
            }
          }
        }
      }
      
      if (!offlineActivitiesUl) {
        console.log('未找到线下活动区域 - 所有选择器都失败');
        return [];
      }

      // 查找活动项 - 新结构中的li元素
      const eventItems = offlineActivitiesUl.querySelectorAll('li');
      console.log(`找到 ${eventItems.length} 个活动项`);
      
      eventItems.forEach((item, index) => {
        try {
          // 查找活动链接 - 使用多个回退选择器
          let titleLinkElement = item.querySelector('h3 a[href*="/event/"]');
          
          // 回退选择器: 任何包含/event/的链接
          if (!titleLinkElement) {
            titleLinkElement = item.querySelector('a[href*="/event/"]');
            if (titleLinkElement) {
              console.log(`活动项 ${index + 1}: 使用回退链接选择器`);
            }
          }
          
          if (!titleLinkElement) {
            console.log(`活动项 ${index + 1}: 未找到活动链接`);
            return;
          }

          const eventUrl = titleLinkElement.getAttribute('href');
          if (!eventUrl) {
            console.log(`活动项 ${index + 1}: 链接URL为空`);
            return;
          }
          
          const fullUrl = eventUrl.startsWith('http') ? eventUrl : `https://usergroup.huodongxing.com${eventUrl}`;
          
          // 提取事件ID
          const idMatch = eventUrl.match(/\/event\/(\d+)/);
          if (!idMatch) {
            console.log(`活动项 ${index + 1}: 无法提取事件ID from ${eventUrl}`);
            return;
          }
          const eventId = idMatch[1];

          // 获取标题 - 使用多个回退方法
          let title = titleLinkElement.textContent.trim();
          
          // 回退方法: 从h3元素获取标题
          if (!title) {
            const h3Element = item.querySelector('h3');
            if (h3Element) {
              title = h3Element.textContent.trim();
              console.log(`活动项 ${index + 1}: 使用h3回退获取标题`);
            }
          }
          
          if (!title) {
            console.log(`活动项 ${index + 1}: 无法获取标题`);
            return;
          }

          // 获取时间和地点 - 从div元素获取，增强错误处理
          const divElements = item.querySelectorAll('div');
          let time = '';
          let location = '';
          
          // 遍历div元素查找时间和地点
          divElements.forEach((div, divIndex) => {
            try {
              const text = div.textContent.trim();
              
              // 时间格式：09/21 14:00
              if (/\d{2}\/\d{2}\s+\d{2}:\d{2}/.test(text) && !time) {
                time = text;
                console.log(`活动项 ${index + 1}: 找到时间 "${time}" 在div ${divIndex + 1}`);
              }
              // 地点格式：福建福州、上海浦东等 (排除包含特定关键词的div)
              else if (text && 
                       !text.includes('查看详情') && 
                       !text.includes('已结束') &&
                       !text.includes('apply') &&
                       !text.match(/^\d+$/) && 
                       !text.match(/\d{2}\/\d{2}/) &&
                       text.length >= 2 && 
                       text.length <= 15 &&
                       /[\u4e00-\u9fa5]/.test(text) &&
                       !location) {
                location = text;
                console.log(`活动项 ${index + 1}: 找到地点 "${location}" 在div ${divIndex + 1}`);
              }
            } catch (divError) {
              console.error(`活动项 ${index + 1}, div ${divIndex + 1} 解析失败:`, divError);
            }
          });

          // 获取图片 - 使用多个回退选择器
          let imageUrl = '';
          let imgElement = item.querySelector('a img');
          
          // 回退选择器: 任何img元素
          if (!imgElement) {
            imgElement = item.querySelector('img');
            if (imgElement) {
              console.log(`活动项 ${index + 1}: 使用回退图片选择器`);
            }
          }
          
          if (imgElement) {
            imageUrl = imgElement.getAttribute('src') || '';
            if (imageUrl && !imageUrl.startsWith('http')) {
              imageUrl = `https://usergroup.huodongxing.com${imageUrl}`;
            }
          } else {
            console.log(`活动项 ${index + 1}: 未找到图片`);
          }

          // 获取浏览量和收藏量 - 增强错误处理
          let views = 0;
          let favorites = 0;
          
          try {
            const cardImgBox = item.querySelector('.card-img-box');
            if (cardImgBox) {
              const spans = cardImgBox.querySelectorAll('span');
              if (spans.length >= 2) {
                // 第一个span是浏览量
                const viewText = spans[0].textContent.trim();
                const viewMatch = viewText.match(/\d+/);
                if (viewMatch) {
                  views = parseInt(viewMatch[0], 10);
                }
                
                // 第二个span是收藏量
                const favoriteText = spans[1].textContent.trim();
                const favoriteMatch = favoriteText.match(/\d+/);
                if (favoriteMatch) {
                  favorites = parseInt(favoriteMatch[0], 10);
                }
                
                console.log(`活动项 ${index + 1}: 浏览量=${views}, 收藏量=${favorites}`);
              } else {
                console.log(`活动项 ${index + 1}: card-img-box中span数量不足 (${spans.length})`);
              }
            } else {
              console.log(`活动项 ${index + 1}: 未找到.card-img-box`);
            }
          } catch (metricsError) {
            console.error(`活动项 ${index + 1}: 提取指标失败:`, metricsError);
          }

          // 数据质量检查
          const missingFields = [];
          if (!time) missingFields.push('时间');
          if (!location) missingFields.push('地点');
          if (!imageUrl) missingFields.push('图片');
          
          if (missingFields.length > 0) {
            console.log(`活动项 ${index + 1}: 缺少字段: ${missingFields.join(', ')}`);
          }

          if (title && eventId) {
            events.push({
              id: eventId,
              title,
              time,
              location,
              url: fullUrl,
              imageUrl,
              views,
              favorites,
              scrapedAt: new Date().toISOString()
            });
            console.log(`活动项 ${index + 1}: 成功提取 "${title}"`);
          } else {
            console.log(`活动项 ${index + 1}: 跳过 - 缺少必要字段 (title: ${!!title}, eventId: ${!!eventId})`);
          }
        } catch (error) {
          console.error(`活动项 ${index + 1} 解析失败:`, error);
        }
      });

      console.log(`从ul#offlineActivities提取到 ${events.length} 个活动`);
      return events;
    });
  }

  // 主采集方法 - 修复版
  async scrapeAllPages() {
    let allEvents = [];
    let currentPage = 1;
    let consecutiveFailures = 0;
    const maxFailures = 3; // 连续失败3次才停止
    const maxPages = 18; // 基于MCP验证，网站有16页，设置18页确保覆盖

    this.log('开始修复版活动采集...');

    while (currentPage <= maxPages && consecutiveFailures < maxFailures) {
      try {
        const pageEvents = await this.scrapePageWithPlaywright(currentPage);
        
        if (pageEvents.length === 0) {
          consecutiveFailures++;
          this.log(`第 ${currentPage} 页没有活动 (连续失败: ${consecutiveFailures}/${maxFailures})`);
        } else {
          consecutiveFailures = 0; // 重置失败计数
          
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
        const delay = 4000 + Math.random() * 2000;
        await new Promise(resolve => setTimeout(resolve, delay));

      } catch (error) {
        consecutiveFailures++;
        this.log(`第 ${currentPage} 页采集失败 (连续失败: ${consecutiveFailures}/${maxFailures}): ${error.message}`);
        
        if (consecutiveFailures < maxFailures) {
          currentPage++;
          // 失败后等待更长时间
          await new Promise(resolve => setTimeout(resolve, 10000));
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
    
    // 生成报告
    this.generateReport(newEvents, allEvents);
  }

  generateReport(newEvents, allEvents) {
    const reportFile = path.join(this.dataDir, 'report.json');
    
    // 保持向后兼容的基础统计结构
    const stats = {
      totalEvents: allEvents.length,
      newEventsThisRun: newEvents.length,
      lastUpdate: new Date().toISOString(),
      locationStats: {},
      timeStats: {},
      dataQuality: {
        eventsWithLocation: 0,
        eventsWithTime: 0,
        eventsWithImage: 0,
        // 新增字段 - 可选的engagement metrics
        eventsWithViews: 0,
        eventsWithFavorites: 0
      },
      // 新增engagement统计 - 向后兼容
      engagementStats: {
        totalViews: 0,
        totalFavorites: 0,
        averageViews: 0,
        averageFavorites: 0,
        topViewedEvents: [],
        topFavoritedEvents: []
      }
    };

    // 用于计算engagement统计的临时数组
    const eventsWithViews = [];
    const eventsWithFavorites = [];

    allEvents.forEach(event => {
      // 原有的统计逻辑 - 保持向后兼容
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

      // 新增的engagement统计 - 向后兼容处理
      if (typeof event.views === 'number' && event.views > 0) {
        stats.dataQuality.eventsWithViews++;
        stats.engagementStats.totalViews += event.views;
        eventsWithViews.push({
          id: event.id,
          title: event.title,
          views: event.views
        });
      }

      if (typeof event.favorites === 'number' && event.favorites > 0) {
        stats.dataQuality.eventsWithFavorites++;
        stats.engagementStats.totalFavorites += event.favorites;
        eventsWithFavorites.push({
          id: event.id,
          title: event.title,
          favorites: event.favorites
        });
      }
    });

    // 计算平均值
    if (eventsWithViews.length > 0) {
      stats.engagementStats.averageViews = Math.round(stats.engagementStats.totalViews / eventsWithViews.length);
    }

    if (eventsWithFavorites.length > 0) {
      stats.engagementStats.averageFavorites = Math.round(stats.engagementStats.totalFavorites / eventsWithFavorites.length);
    }

    // 获取top 5最受欢迎的活动
    stats.engagementStats.topViewedEvents = eventsWithViews
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    stats.engagementStats.topFavoritedEvents = eventsWithFavorites
      .sort((a, b) => b.favorites - a.favorites)
      .slice(0, 5);

    fs.writeFileSync(reportFile, JSON.stringify(stats, null, 2), 'utf8');
    this.log(`统计报告已保存到: ${reportFile}`);
    
    // 输出engagement统计摘要
    if (stats.engagementStats.totalViews > 0 || stats.engagementStats.totalFavorites > 0) {
      this.log(`Engagement统计: 总浏览量=${stats.engagementStats.totalViews}, 总收藏量=${stats.engagementStats.totalFavorites}`);
      this.log(`平均浏览量=${stats.engagementStats.averageViews}, 平均收藏量=${stats.engagementStats.averageFavorites}`);
    }
  }

  async run() {
    try {
      this.log('=== 修复版活动采集开始 ===');
      
      const newEvents = await this.scrapeAllPages();
      this.saveEvents(newEvents);
      
      this.log(`=== 采集完成，共采集到 ${newEvents.length} 个新活动 ===`);
      
      if (newEvents.length > 0) {
        console.log('\\n新采集的活动:');
        newEvents.slice(0, 10).forEach((event, index) => {
          console.log(`${index + 1}. ${event.title}`);
          console.log(`   时间: ${event.time}`);
          console.log(`   地点: ${event.location}`);
          
          // 显示engagement metrics (如果可用) - 向后兼容
          if (typeof event.views === 'number' || typeof event.favorites === 'number') {
            const views = event.views || 0;
            const favorites = event.favorites || 0;
            console.log(`   浏览量: ${views}, 收藏量: ${favorites}`);
          }
          
          console.log('');
        });
        
        if (newEvents.length > 10) {
          console.log(`... 还有 ${newEvents.length - 10} 个活动`);
        }
        
        // 显示engagement统计摘要
        const totalViews = newEvents.reduce((sum, event) => sum + (event.views || 0), 0);
        const totalFavorites = newEvents.reduce((sum, event) => sum + (event.favorites || 0), 0);
        
        if (totalViews > 0 || totalFavorites > 0) {
          console.log(`\\n本次采集Engagement统计:`);
          console.log(`总浏览量: ${totalViews}, 总收藏量: ${totalFavorites}`);
          
          // 显示最受欢迎的活动
          const topViewed = newEvents
            .filter(event => event.views > 0)
            .sort((a, b) => b.views - a.views)
            .slice(0, 3);
            
          if (topViewed.length > 0) {
            console.log(`\\n最受欢迎活动 (浏览量):`);
            topViewed.forEach((event, index) => {
              console.log(`${index + 1}. ${event.title} (${event.views} 浏览)`);
            });
          }
        }
      }

    } catch (error) {
      this.log(`采集失败: ${error.message}`);
      console.error(error);
    }
  }
}

if (require.main === module) {
  const scraper = new FixedEventScraper();
  scraper.run().catch(console.error);
}

module.exports = FixedEventScraper;