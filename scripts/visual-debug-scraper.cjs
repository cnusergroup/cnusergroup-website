#!/usr/bin/env node

/**
 * 可视化调试采集器 - 打开浏览器窗口方便观察
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class VisualDebugScraper {
  constructor() {
    this.baseUrl = 'https://usergroup.huodongxing.com/';
    this.dataDir = './data/events';
    this.logFile = path.join(this.dataDir, 'debug.log');
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    if (fs.existsSync(this.dataDir)) {
      fs.appendFileSync(this.logFile, logMessage + '\n');
    }
  }

  async debugWithVisualBrowser() {
    console.log('🔍 启动可视化调试模式...');
    console.log('浏览器窗口将保持打开，你可以手动观察页面结构');
    
    const browser = await chromium.launch({ 
      headless: false, // 显示浏览器窗口
      slowMo: 1000,    // 减慢操作速度
      args: ['--start-maximized'] // 最大化窗口
    });
    
    const page = await browser.newPage();
    
    try {
      this.log('访问活动行网站...');
      await page.goto(this.baseUrl, { 
        waitUntil: 'networkidle',
        timeout: 60000
      });
      
      // 等待页面完全加载
      await page.waitForTimeout(5000);
      
      this.log('开始分析页面结构...');
      
      // 高亮显示线下活动区域
      await page.evaluate(() => {
        // 查找线下活动区域
        const elements = document.querySelectorAll('*');
        for (let element of elements) {
          if (element.textContent && element.textContent.includes('线下活动')) {
            // 查找包含活动列表的容器
            const parent = element.closest('div');
            if (parent && parent.querySelector('a[href*="/event/"]')) {
              parent.style.border = '3px solid red';
              parent.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
              console.log('找到线下活动区域:', parent);
              
              // 高亮显示活动项
              const eventLinks = parent.querySelectorAll('a[href*="/event/"]');
              eventLinks.forEach((link, index) => {
                const eventContainer = link.closest('div');
                if (eventContainer) {
                  eventContainer.style.border = '2px solid blue';
                  eventContainer.style.margin = '2px';
                  console.log(`活动项 ${index + 1}:`, eventContainer);
                }
              });
              
              break;
            }
          }
        }
      });
      
      // 分析并提取活动数据
      const events = await this.extractEventsFromPage(page);
      this.log(`第1页提取到 ${events.length} 个活动`);
      
      if (events.length > 0) {
        console.log('\n📋 提取到的活动:');
        events.slice(0, 5).forEach((event, index) => {
          console.log(`${index + 1}. ${event.title}`);
          console.log(`   时间: ${event.time}`);
          console.log(`   地点: ${event.location}`);
          console.log(`   ID: ${event.id}`);
          console.log('');
        });
      }
      
      // 测试分页导航
      console.log('\n🔄 测试分页导航...');
      await this.testPagination(page);
      
      console.log('\n✅ 调试完成！');
      console.log('浏览器窗口将保持打开，你可以手动检查页面');
      console.log('按 Ctrl+C 退出程序');
      
      // 保持程序运行
      await new Promise(() => {}); // 永远等待，直到手动退出
      
    } catch (error) {
      console.error('❌ 调试失败:', error);
    } finally {
      // 不自动关闭浏览器，让用户手动观察
      // await browser.close();
    }
  }

  // 基于调试发现的正确页面结构提取活动
  async extractEventsFromPage(page) {
    return await page.evaluate(() => {
      const events = [];
      
      // 基于调试发现：查找包含"线下活动"的区域
      const allDivs = document.querySelectorAll('div');
      let offlineContainer = null;
      
      for (let div of allDivs) {
        // 查找包含"线下活动"文本且有活动链接的容器
        if (div.textContent && div.textContent.includes('线下活动')) {
          const eventLinks = div.querySelectorAll('a[href*="/event/"]');
          if (eventLinks.length > 0) {
            offlineContainer = div;
            console.log('找到线下活动容器，包含', eventLinks.length, '个活动链接');
            break;
          }
        }
      }
      
      if (!offlineContainer) {
        console.log('未找到线下活动容器');
        return [];
      }

      // 提取活动链接
      const eventLinks = offlineContainer.querySelectorAll('a[href*="/event/"]');
      
      eventLinks.forEach((link, index) => {
        try {
          const eventUrl = link.getAttribute('href');
          if (!eventUrl) return;
          
          const fullUrl = eventUrl.startsWith('http') ? eventUrl : `https://usergroup.huodongxing.com${eventUrl}`;
          
          // 提取事件ID
          const idMatch = eventUrl.match(/\/event\/(\d+)/);
          if (!idMatch) return;
          const eventId = idMatch[1];

          // 查找活动容器（链接的父容器）
          const eventContainer = link.closest('div');
          if (!eventContainer) return;

          // 提取标题 - 从链接文本或容器中的标题元素
          let title = link.textContent.trim();
          if (!title) {
            const titleElements = eventContainer.querySelectorAll('h1, h2, h3, h4, h5, .title, [class*="title"]');
            if (titleElements.length > 0) {
              title = titleElements[0].textContent.trim();
            }
          }

          // 提取时间和地点 - 查找容器中的所有文本元素
          const allTextElements = eventContainer.querySelectorAll('*');
          let time = '';
          let location = '';
          
          allTextElements.forEach(element => {
            const text = element.textContent.trim();
            
            // 时间格式：09/21 14:00
            if (/\d{2}\/\d{2}\s+\d{2}:\d{2}/.test(text) && !time) {
              time = text;
            }
            // 地点格式：中文地名
            else if (text && 
                     !text.includes('查看详情') && 
                     !text.includes('已结束') &&
                     !text.includes('报名') &&
                     !text.match(/^\d+$/) && 
                     !text.match(/\d{2}\/\d{2}/) &&
                     text.length >= 2 && 
                     text.length <= 15 &&
                     /[\u4e00-\u9fa5]/.test(text) &&
                     !location &&
                     text !== title) { // 不要把标题当作地点
              location = text;
            }
          });

          // 提取图片
          const imgElement = eventContainer.querySelector('img');
          let imageUrl = '';
          if (imgElement) {
            imageUrl = imgElement.getAttribute('src') || imgElement.getAttribute('data-src') || '';
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
            
            console.log(`提取活动 ${index + 1}: ${title} (${time}, ${location})`);
          }
        } catch (error) {
          console.error(`解析活动项 ${index + 1} 失败:`, error);
        }
      });

      return events;
    });
  }

  // 测试分页导航
  async testPagination(page) {
    try {
      // 查找分页元素
      const paginationInfo = await page.evaluate(() => {
        const pagination = [];
        
        // 查找所有可能的分页按钮
        const allElements = document.querySelectorAll('*');
        
        for (let element of allElements) {
          const text = element.textContent.trim();
          
          // 查找页码按钮
          if (/^\d+$/.test(text) && parseInt(text) <= 20) {
            pagination.push({
              type: 'page',
              text: text,
              tagName: element.tagName,
              className: element.className,
              clickable: element.tagName === 'A' || element.tagName === 'BUTTON' || element.onclick
            });
          }
          
          // 查找下一页按钮
          if (text.includes('下一页') || text.includes('next') || text.includes('Next')) {
            pagination.push({
              type: 'next',
              text: text,
              tagName: element.tagName,
              className: element.className,
              clickable: element.tagName === 'A' || element.tagName === 'BUTTON' || element.onclick
            });
          }
        }
        
        return pagination;
      });
      
      console.log('📄 分页元素分析:');
      paginationInfo.forEach((info, index) => {
        console.log(`  ${index + 1}. ${info.type}: "${info.text}" (${info.tagName})`);
        console.log(`     可点击: ${info.clickable}`);
        console.log(`     类名: ${info.className}`);
      });
      
      // 尝试点击第2页
      console.log('\n🔄 尝试导航到第2页...');
      
      const navigated = await page.evaluate(() => {
        // 查找页码2的按钮
        const allElements = document.querySelectorAll('*');
        
        for (let element of allElements) {
          if (element.textContent.trim() === '2') {
            // 检查是否可点击
            if (element.tagName === 'A' || element.tagName === 'BUTTON' || element.onclick) {
              element.click();
              console.log('点击了页码2');
              return true;
            }
          }
        }
        
        return false;
      });
      
      if (navigated) {
        await page.waitForTimeout(5000);
        console.log('✅ 成功导航到第2页');
        
        // 提取第2页的活动
        const page2Events = await this.extractEventsFromPage(page);
        console.log(`第2页提取到 ${page2Events.length} 个活动`);
        
        if (page2Events.length > 0) {
          console.log('第2页活动示例:');
          console.log(`1. ${page2Events[0].title} (${page2Events[0].time}, ${page2Events[0].location})`);
        }
      } else {
        console.log('❌ 无法导航到第2页');
      }
      
    } catch (error) {
      console.error('分页测试失败:', error);
    }
  }
}

// 运行可视化调试
if (require.main === module) {
  const scraper = new VisualDebugScraper();
  scraper.debugWithVisualBrowser().catch(console.error);
}

module.exports = VisualDebugScraper;