#!/usr/bin/env node

/**
 * 活动行线下活动采集工具
 * 功能：
 * 1. 采集线下活动信息（标题、时间、地点、详情URL）
 * 2. 下载活动图片到本地
 * 3. 支持分页采集
 * 4. 增量更新（只采集新活动）
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

class EventScraper {
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
            fs.unlink(filepath, () => { }); // 删除不完整的文件
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
    // 从URL中提取事件ID，例如：/event/3825656249900?qd=8839540364256
    const match = url.match(/\/event\/(\d+)/);
    return match ? match[1] : null;
  }

  isNewEvent(eventId) {
    return !this.existingEvents.some(event => event.id === eventId);
  }

  // 数据清理和验证
  cleanEventData(event) {
    // 清理标题
    event.title = event.title.replace(/\s+/g, ' ').trim();

    // 验证和清理地点
    if (event.location) {
      event.location = event.location.trim();

      // 如果地点看起来不像真实地名，尝试从标题中提取
      if (!/[\u4e00-\u9fa5]/.test(event.location) ||
        /^\d+\s+\d+/.test(event.location) ||
        event.location.length < 2) {

        // 从标题中提取可能的城市名
        const cityMatches = event.title.match(/(北京|上海|广州|深圳|杭州|南京|苏州|成都|重庆|武汉|西安|天津|青岛|大连|厦门|福州|济南|郑州|长沙|合肥|南昌|太原|石家庄|哈尔滨|长春|沈阳|呼和浩特|银川|西宁|兰州|乌鲁木齐|拉萨|昆明|贵阳|南宁|海口|三亚|台北|香港|澳门|福建|浙江|江苏|广东|山东|河南|湖北|湖南|四川|陕西|河北|山西|辽宁|吉林|黑龙江|内蒙古|新疆|西藏|云南|贵州|广西|海南|宁夏|青海|甘肃|台湾)/);

        if (cityMatches) {
          event.location = cityMatches[1];
        } else {
          event.location = ''; // 清空无效地点
        }
      }
    }

    // 验证时间格式
    if (event.time && !/\d{2}\/\d{2}\s+\d{2}:\d{2}/.test(event.time)) {
      event.time = ''; // 清空无效时间
    }

    return event;
  }

  async scrapePageWithPlaywright(page = 1, retryCount = 0) {
    const { chromium } = require('playwright');

    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });
    const browserPage = await browser.newPage();

    // 设置更真实的浏览器环境
    try {
      await browserPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await browserPage.setViewportSize({ width: 1920, height: 1080 });

      // 设置额外的请求头
      await browserPage.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      });
    } catch (error) {
      this.log(`设置浏览器环境失败: ${error.message}`);
    }

    try {
      this.log(`正在采集第 ${page} 页...`);

      // 设置更长的超时时间
      browserPage.setDefaultTimeout(30000);

      // 访问页面，增加随机延迟
      const randomDelay = 2000 + Math.random() * 3000; // 2-5秒随机延迟
      await new Promise(resolve => setTimeout(resolve, randomDelay));

      await browserPage.goto(this.baseUrl, {
        waitUntil: 'networkidle',
        timeout: 45000
      });

      // 模拟人类行为：随机滚动
      await browserPage.evaluate(() => {
        window.scrollTo(0, Math.random() * 500);
      });

      // 等待更长时间让页面完全加载
      await browserPage.waitForTimeout(5000 + Math.random() * 3000);

      // 等待线下活动区域加载
      await browserPage.waitForSelector('#offlineActivities', {
        timeout: 15000
      }).catch(() => {
        this.log('等待线下活动区域超时，继续执行...');
      });

      // 如果不是第一页，需要导航到指定页面
      if (page > 1) {
        let navigated = false;

        // 方法1: 在线下活动区域查找并点击页码
        try {
          // 等待分页元素加载
          await browserPage.waitForTimeout(2000);

          // 查找线下活动区域的分页
          const pageClicked = await browserPage.evaluate((targetPage) => {
            // 查找所有 pagination-box，取第2个（线下活动的分页）
            const paginationBoxes = document.querySelectorAll('.pagination-box');
            if (paginationBoxes.length < 2) return false;
            
            const paginationBox = paginationBoxes[1]; // 第2个分页区域
            
            // 在分页区域查找目标页码
            const allPaginationElements = paginationBox.querySelectorAll('*');
            
            for (let element of allPaginationElements) {
              if (element.textContent && element.textContent.trim() === targetPage.toString()) {
                // 检查是否是可点击的分页按钮
                if (element.click) {
                  element.click();
                  console.log(`点击了页码 ${targetPage}`);
                  return true;
                }
              }
            }
            return false;
          }, page);

          if (pageClicked) {
            // 增加更长的等待时间
            await browserPage.waitForTimeout(6000 + Math.random() * 2000);
            navigated = true;
            this.log(`通过页码按钮导航到第 ${page} 页`);
          }
        } catch (error) {
          this.log(`页码按钮导航失败: ${error.message}`);
        }

        // 方法2: 使用下一页按钮逐步导航
        if (!navigated && page <= 16) {
          try {
            // 重新加载第一页
            await browserPage.goto(this.baseUrl, {
              waitUntil: 'networkidle',
              timeout: 30000
            });
            await browserPage.waitForTimeout(3000);

            // 逐页点击下一页按钮
            for (let i = 1; i < page; i++) {
              const nextClicked = await browserPage.evaluate(() => {
                // 查找所有 pagination-box，取第2个（线下活动的分页）
                const paginationBoxes = document.querySelectorAll('.pagination-box');
                if (paginationBoxes.length < 2) return false;
                
                const paginationBox = paginationBoxes[1]; // 第2个分页区域
                const nextButton = paginationBox.querySelector('button[aria-label="Go to next page"]');
                
                if (nextButton && !nextButton.disabled) {
                  nextButton.click();
                  console.log('点击了下一页按钮');
                  return true;
                }
                
                return false;
              });

              if (nextClicked) {
                // 增加更长的等待时间和随机性
                await browserPage.waitForTimeout(5000 + Math.random() * 3000);
                this.log(`通过下一页按钮导航到第 ${i + 1} 页`);
              } else {
                throw new Error(`无法点击下一页按钮到第 ${i + 1} 页`);
              }
            }

            navigated = true;
          } catch (error) {
            this.log(`下一页按钮导航失败: ${error.message}`);
          }
        }

        if (!navigated) {
          this.log(`无法导航到第 ${page} 页，但继续尝试提取当前页面内容`);
          // 不直接返回空数组，而是尝试提取当前页面的内容
        }
      }

      // 等待页面加载完成，增加更长的等待时间
      await browserPage.waitForTimeout(8000 + Math.random() * 4000);

      // 模拟人类行为：随机滚动页面
      await browserPage.evaluate(() => {
        const scrollHeight = document.body.scrollHeight;
        const randomScroll = Math.random() * scrollHeight * 0.3;
        window.scrollTo(0, randomScroll);
      });

      await browserPage.waitForTimeout(2000);

      // 验证页面是否正确加载
      const pageInfo = await browserPage.evaluate(() => {
        let eventCount = 0;

        // 查找 id="offlineActivities" 下的 ul 中的 li 元素
        const offlineActivities = document.getElementById('offlineActivities');
        if (offlineActivities) {
          const ul = offlineActivities.querySelector('ul');
          if (ul) {
            const eventItems = ul.querySelectorAll('li');
            eventItems.forEach(item => {
              if (item.querySelector('a[href*="/event/"]')) {
                eventCount++;
              }
            });
          }
        }

        return {
          eventCount,
          hasOfflineSection: !!offlineActivities
        };
      });

      this.log(`第 ${page} 页验证结果: 找到 ${pageInfo.eventCount} 个活动项，线下区域: ${pageInfo.hasOfflineSection ? '是' : '否'}`);

      if (pageInfo.eventCount === 0) {
        this.log(`第 ${page} 页没有找到活动内容`);
        return [];
      }

      // 获取线下活动列表
      const events = await browserPage.evaluate(() => {
        // 数据清理函数（在浏览器环境中定义）
        function cleanEventData(event) {
          // 清理标题
          event.title = event.title.replace(/\s+/g, ' ').trim();

          // 验证和清理地点
          if (event.location) {
            event.location = event.location.trim();

            // 如果地点看起来不像真实地名，尝试从标题中提取
            if (!/[\u4e00-\u9fa5]/.test(event.location) ||
              /^\d+\s+\d+/.test(event.location) ||
              event.location.length < 2) {

              // 从标题中提取可能的城市名
              const cityMatches = event.title.match(/(北京|上海|广州|深圳|杭州|南京|苏州|成都|重庆|武汉|西安|天津|青岛|大连|厦门|福州|济南|郑州|长沙|合肥|南昌|太原|石家庄|哈尔滨|长春|沈阳|呼和浩特|银川|西宁|兰州|乌鲁木齐|拉萨|昆明|贵阳|南宁|海口|三亚|台北|香港|澳门|福建|浙江|江苏|广东|山东|河南|湖北|湖南|四川|陕西|河北|山西|辽宁|吉林|黑龙江|内蒙古|新疆|西藏|云南|贵州|广西|海南|宁夏|青海|甘肃|台湾)/);

              if (cityMatches) {
                event.location = cityMatches[1];
              } else {
                event.location = ''; // 清空无效地点
              }
            }
          }

          // 验证时间格式
          if (event.time && !/\d{2}\/\d{2}\s+\d{2}:\d{2}/.test(event.time)) {
            event.time = ''; // 清空无效时间
          }

          return event;
        }

        // 基于准确页面结构的活动项查找逻辑
        function findEventItems() {
          console.log('开始查找活动项...');

          // 查找 id="offlineActivities" 的元素
          const offlineActivities = document.getElementById('offlineActivities');
          if (!offlineActivities) {
            console.log('未找到 id="offlineActivities" 的元素');
            return [];
          }

          // 查找其下的 ul 元素
          const ul = offlineActivities.querySelector('ul');
          if (!ul) {
            console.log('未找到 offlineActivities 下的 ul 元素');
            return [];
          }

          // 查找 ul 下的所有 li 元素
          const eventItems = ul.querySelectorAll('li');
          console.log(`在 #offlineActivities ul 下找到 ${eventItems.length} 个 li 元素`);
          
          return Array.from(eventItems);
        }
        // 使用改进的活动项查找逻辑
        const eventItems = findEventItems();
        const events = [];

        eventItems.forEach((item, index) => {
          try {
            // 获取活动链接和ID
            const linkElement = item.querySelector('a[href*="/event/"]');
            if (!linkElement) {
              console.log(`活动项 ${index + 1}: 没有找到活动链接`);
              return;
            }

            const eventUrl = linkElement.getAttribute('href');
            const fullUrl = eventUrl.startsWith('http') ? eventUrl : `https://usergroup.huodongxing.com${eventUrl}`;

            // 提取事件ID
            const idMatch = eventUrl.match(/\/event\/(\d+)/);
            if (!idMatch) {
              console.log(`活动项 ${index + 1}: 无法提取事件ID from ${eventUrl}`);
              return;
            }
            const eventId = idMatch[1];

            // 获取标题 - 优先从活动链接获取
            let title = '';

            // 首先尝试从活动链接的文本获取标题
            if (linkElement && linkElement.textContent.trim()) {
              const linkText = linkElement.textContent.trim();
              // 检查链接文本是否看起来像活动标题（长度合理且包含中文）
              if (linkText.length > 5 && linkText.length < 200 && /[\u4e00-\u9fa5]/.test(linkText)) {
                title = linkText;
              }
            }

            // 如果链接文本不合适，尝试其他选择器
            if (!title) {
              const titleSelectors = [
                'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                '.title', '[class*="title"]', '[class*="name"]'
              ];

              for (const selector of titleSelectors) {
                const titleElement = item.querySelector(selector);
                if (titleElement && titleElement.textContent.trim()) {
                  const candidateTitle = titleElement.textContent.trim();
                  // 验证标题的合理性
                  if (candidateTitle.length > 5 &&
                    candidateTitle.length < 200 &&
                    /[\u4e00-\u9fa5]/.test(candidateTitle) &&
                    !candidateTitle.includes('微信用户') &&
                    !candidateTitle.includes('个月前') &&
                    !candidateTitle.includes('顶')) {
                    title = candidateTitle;
                    break;
                  }
                }
              }
            }

            if (!title) {
              console.log(`活动项 ${index + 1}: 无法获取标题`);
              return;
            }

            // 获取时间和地点 - 改进的解析逻辑
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
                  '¥', '$', '元', '价格', '费用', 'http', 'www', '点击',
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

            // 获取图片URL
            const imgElement = item.querySelector('img');
            let imageUrl = '';
            if (imgElement) {
              imageUrl = imgElement.src || imgElement.getAttribute('data-src') || imgElement.getAttribute('data-original') || '';
              if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = `https://usergroup.huodongxing.com${imageUrl}`;
              }
            }

            const eventData = {
              id: eventId,
              title,
              time,
              location,
              url: fullUrl,
              imageUrl,
              scrapedAt: new Date().toISOString()
            };

            // 应用数据清理
            const cleanedEvent = cleanEventData(eventData);
            events.push(cleanedEvent);

            console.log(`成功解析活动 ${index + 1}: ${title} (${location})`);

          } catch (error) {
            console.error(`解析活动项 ${index + 1} 失败:`, error);
          }
        });

        return events;
      });

      await browser.close();
      return events;

    } catch (error) {
      await browser.close();
      throw error;
    }
  }

  async scrapeAllPages() {
    let allEvents = [];
    let currentPage = 1;
    let consecutiveEmptyPages = 0;
    let maxPages = 25; // 增加最大页数以确保覆盖所有页面

    this.log('开始采集活动数据...');

    // 首先尝试获取总页数
    try {
      const totalPages = await this.getTotalPages();
      if (totalPages > 0) {
        maxPages = totalPages; // 根据实际页数设置
        this.log(`检测到总页数: ${totalPages}，将采集 ${maxPages} 页`);
      }
    } catch (error) {
      maxPages = 16; // 根据MCP验证，设置为16页
      this.log(`获取总页数失败: ${error.message}，使用已知页数 ${maxPages}`);
    }

    while (currentPage <= maxPages) {
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
          this.log(`采集第 ${currentPage} 页失败 (重试 ${retryCount}/${maxRetries}): ${error.message}`);

          if (retryCount < maxRetries) {
            // 等待更长时间后重试，避免触发保护机制
            const retryDelay = 15000 + (retryCount * 10000) + Math.random() * 5000;
            this.log(`等待 ${Math.round(retryDelay / 1000)} 秒后重试...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          } else {
            this.log(`第 ${currentPage} 页重试次数已用完，跳过此页`);
            break;
          }
        }
      }

      if (pageEvents.length === 0) {
        consecutiveEmptyPages++;
        this.log(`第 ${currentPage} 页没有找到活动 (连续空页: ${consecutiveEmptyPages})`);

        // 增加连续空页的容忍度，因为网站可能有16页
        if (consecutiveEmptyPages >= 5) {
          this.log('连续5页没有活动，停止采集');
          break;
        }
      } else {
        consecutiveEmptyPages = 0; // 重置连续空页计数

        // 检查是否有新活动
        const newEvents = pageEvents.filter(event => this.isNewEvent(event.id));

        this.log(`第 ${currentPage} 页找到 ${pageEvents.length} 个活动，其中 ${newEvents.length} 个是新活动`);

        // 即使没有新活动，也继续采集下一页，因为可能后面还有新活动
        if (newEvents.length > 0) {
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

      // 添加更长的随机延迟避免请求过快
      const pageDelay = 8000 + Math.random() * 7000; // 8-15秒随机延迟
      this.log(`等待 ${Math.round(pageDelay / 1000)} 秒后继续下一页...`);
      await new Promise(resolve => setTimeout(resolve, pageDelay));
    }

    this.log(`采集完成，共处理 ${currentPage - 1} 页，获得 ${allEvents.length} 个新活动`);
    return allEvents;
  }

  // 新增：获取总页数的方法
  async getTotalPages() {
    const { chromium } = require('playwright');

    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled'
      ]
    });
    const browserPage = await browser.newPage();

    // 设置真实的浏览器环境
    try {
      await browserPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    } catch (error) {
      // 忽略设置错误，继续执行
    }

    try {
      // 添加随机延迟
      await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));

      await browserPage.goto(this.baseUrl, {
        waitUntil: 'networkidle',
        timeout: 45000
      });

      await browserPage.waitForTimeout(8000 + Math.random() * 3000);

      const totalPages = await browserPage.evaluate(() => {
        // 专门查找线下活动区域的分页
        let maxPage = 1;

        // 查找所有 pagination-box，取第2个（线下活动的分页）
        const paginationBoxes = document.querySelectorAll('.pagination-box');
        
        if (paginationBoxes.length >= 2) {
          const paginationBox = paginationBoxes[1]; // 第2个分页区域
          console.log('找到线下活动的 pagination-box 分页容器');
          
          // 在分页容器中查找所有页码
          const pageElements = paginationBox.querySelectorAll('*');

          pageElements.forEach(element => {
            const text = element.textContent.trim();
            const pageNum = parseInt(text);

            // 查找数字页码，特别关注最大的页码
            if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= 50) {
              if (pageNum > maxPage) {
                maxPage = pageNum;
                console.log(`找到页码: ${pageNum}`);
              }
            }
          });
        }

        // 备用方案：根据调试结果，我们知道有16页
        if (maxPage < 16) {
          maxPage = 16;
          console.log('使用已知的总页数: 16');
        }

        console.log(`最终检测到最大页码: ${maxPage}`);
        return maxPage;
      });

      await browser.close();

      // 根据已知信息，如果检测失败则返回16
      return totalPages > 1 ? totalPages : 16;

    } catch (error) {
      await browser.close();
      this.log(`获取总页数失败: ${error.message}，使用默认值16`);
      return 16; // 根据MCP验证结果，默认返回16页
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

    // 生成统计报告
    this.generateReport(newEvents, allEvents);
  }

  generateReport(newEvents, allEvents) {
    const reportFile = path.join(this.dataDir, 'report.json');

    // 统计信息
    const stats = {
      totalEvents: allEvents.length,
      newEventsThisRun: newEvents.length,
      lastUpdate: new Date().toISOString(),
      locationStats: {},
      timeStats: {},
      dataQuality: {
        eventsWithLocation: 0,
        eventsWithTime: 0,
        eventsWithImage: 0
      }
    };

    // 统计地点分布
    allEvents.forEach(event => {
      if (event.location) {
        stats.locationStats[event.location] = (stats.locationStats[event.location] || 0) + 1;
        stats.dataQuality.eventsWithLocation++;
      }

      if (event.time) {
        const month = event.time.substring(0, 5); // 提取月/日部分
        stats.timeStats[month] = (stats.timeStats[month] || 0) + 1;
        stats.dataQuality.eventsWithTime++;
      }

      if (event.imageUrl || event.localImage) {
        stats.dataQuality.eventsWithImage++;
      }
    });

    // 保存报告
    fs.writeFileSync(reportFile, JSON.stringify(stats, null, 2), 'utf8');
    this.log(`统计报告已保存到: ${reportFile}`);
  }

  async run() {
    try {
      this.log('=== 活动采集开始 ===');

      const newEvents = await this.scrapeAllPages();
      this.saveEvents(newEvents);

      this.log(`=== 采集完成，共采集到 ${newEvents.length} 个新活动 ===`);

      // 输出统计信息
      if (newEvents.length > 0) {
        console.log('\n新采集的活动:');
        newEvents.forEach((event, index) => {
          console.log(`${index + 1}. ${event.title}`);
          console.log(`   时间: ${event.time}`);
          console.log(`   地点: ${event.location}`);
          console.log(`   链接: ${event.url}`);
          console.log(`   图片: ${event.localImage || '无'}`);
          console.log('');
        });
      }

    } catch (error) {
      this.log(`采集失败: ${error.message}`);
      console.error(error);
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const scraper = new EventScraper();
  scraper.run().catch(console.error);
}

module.exports = EventScraper;