#!/usr/bin/env node

/**
 * 调试网站结构脚本
 * 用于检查活动行网站的当前DOM结构
 */

const { chromium } = require('playwright');

async function debugWebsiteStructure() {
  console.log('🔍 开始调试网站结构...');
  
  let browser = null;
  
  try {
    browser = await chromium.launch({
      headless: false, // 显示浏览器窗口便于调试
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });

    const page = await browser.newPage();
    
    // 设置浏览器环境
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewportSize({ width: 1920, height: 1080 });

    console.log('📱 访问活动行网站...');
    await page.goto('https://usergroup.huodongxing.com/', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    // 等待页面加载
    await page.waitForTimeout(5000);

    console.log('🔍 分析页面结构...');
    
    const analysis = await page.evaluate(() => {
      const result = {
        title: document.title,
        url: window.location.href,
        offlineActivitiesExists: false,
        offlineActivitiesContent: '',
        allUlElements: [],
        eventLinks: [],
        possibleEventContainers: []
      };

      // 检查 ul#offlineActivities
      const offlineUl = document.querySelector('ul#offlineActivities');
      if (offlineUl) {
        result.offlineActivitiesExists = true;
        result.offlineActivitiesContent = offlineUl.innerHTML.substring(0, 500) + '...';
      }

      // 查找所有 ul 元素
      const allUls = document.querySelectorAll('ul');
      allUls.forEach((ul, index) => {
        result.allUlElements.push({
          index,
          id: ul.id || '',
          className: ul.className || '',
          childrenCount: ul.children.length,
          innerHTML: ul.innerHTML.substring(0, 200) + '...'
        });
      });

      // 查找所有活动链接
      const eventLinks = document.querySelectorAll('a[href*="/event/"]');
      eventLinks.forEach((link, index) => {
        result.eventLinks.push({
          index,
          href: link.href,
          text: link.textContent.trim().substring(0, 100),
          parentTag: link.parentElement?.tagName,
          parentClass: link.parentElement?.className || ''
        });
      });

      // 查找可能的活动容器
      const possibleContainers = document.querySelectorAll('div[class*="event"], div[class*="activity"], section[class*="event"], ul[class*="event"], li[class*="event"]');
      possibleContainers.forEach((container, index) => {
        if (index < 10) { // 只取前10个
          result.possibleEventContainers.push({
            index,
            tagName: container.tagName,
            className: container.className || '',
            id: container.id || '',
            innerHTML: container.innerHTML.substring(0, 300) + '...'
          });
        }
      });

      return result;
    });

    console.log('\n📊 网站结构分析结果:');
    console.log('='.repeat(50));
    console.log(`页面标题: ${analysis.title}`);
    console.log(`当前URL: ${analysis.url}`);
    console.log(`ul#offlineActivities 存在: ${analysis.offlineActivitiesExists}`);
    
    if (analysis.offlineActivitiesExists) {
      console.log('\n📋 offlineActivities 内容预览:');
      console.log(analysis.offlineActivitiesContent);
    }

    console.log(`\n📝 找到 ${analysis.allUlElements.length} 个 ul 元素:`);
    analysis.allUlElements.forEach(ul => {
      console.log(`  - ul[${ul.index}]: id="${ul.id}", class="${ul.className}", children=${ul.childrenCount}`);
    });

    console.log(`\n🔗 找到 ${analysis.eventLinks.length} 个活动链接:`);
    analysis.eventLinks.slice(0, 5).forEach(link => {
      console.log(`  - ${link.href} (${link.text})`);
    });

    console.log(`\n📦 找到 ${analysis.possibleEventContainers.length} 个可能的活动容器:`);
    analysis.possibleEventContainers.forEach(container => {
      console.log(`  - ${container.tagName}.${container.className}#${container.id}`);
    });

    // 截图保存
    await page.screenshot({ path: 'debug-website-screenshot.png', fullPage: true });
    console.log('\n📸 已保存网站截图: debug-website-screenshot.png');

    // 保持浏览器打开10秒供手动检查
    console.log('\n⏳ 浏览器将保持打开10秒供手动检查...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('❌ 调试过程中发生错误:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// 运行调试
debugWebsiteStructure().catch(console.error);