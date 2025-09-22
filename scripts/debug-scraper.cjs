#!/usr/bin/env node

/**
 * 调试版采集器 - 用于分析页面结构
 */

const { chromium } = require('playwright');

async function debugPageStructure() {
  console.log('🔍 开始调试页面结构...');
  
  const browser = await chromium.launch({ headless: false }); // 显示浏览器窗口
  const page = await browser.newPage();
  
  try {
    console.log('📄 访问页面...');
    await page.goto('https://usergroup.huodongxing.com/', { 
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    // 等待页面加载
    await page.waitForTimeout(5000);
    
    console.log('🔍 分析页面结构...');
    
    // 分析线下活动区域
    const offlineInfo = await page.evaluate(() => {
      // 查找包含"线下活动"的元素
      const allElements = document.querySelectorAll('*');
      let offlineElements = [];
      
      for (let element of allElements) {
        if (element.textContent && element.textContent.includes('线下活动')) {
          offlineElements.push({
            tagName: element.tagName,
            className: element.className,
            textContent: element.textContent.substring(0, 100),
            hasListChild: !!element.querySelector('list, ul, ol'),
            listItemCount: element.querySelectorAll('listitem, li').length
          });
        }
      }
      
      return offlineElements;
    });
    
    console.log('📋 线下活动区域信息:');
    offlineInfo.forEach((info, index) => {
      console.log(`  ${index + 1}. ${info.tagName} (${info.className})`);
      console.log(`     文本: ${info.textContent}...`);
      console.log(`     有列表子元素: ${info.hasListChild}`);
      console.log(`     列表项数量: ${info.listItemCount}`);
      console.log('');
    });
    
    // 分析活动项结构
    const eventInfo = await page.evaluate(() => {
      // 查找活动链接
      const eventLinks = document.querySelectorAll('a[href*="/event/"], link[href*="/event/"]');
      const events = [];
      
      for (let link of eventLinks) {
        const parent = link.closest('listitem, li, div');
        if (parent) {
          events.push({
            url: link.getAttribute('href'),
            parentTag: parent.tagName,
            parentClass: parent.className,
            hasHeading: !!parent.querySelector('heading, h1, h2, h3, h4'),
            hasGeneric: !!parent.querySelector('generic'),
            genericCount: parent.querySelectorAll('generic').length,
            textContent: parent.textContent.substring(0, 200)
          });
        }
      }
      
      return events.slice(0, 5); // 只返回前5个
    });
    
    console.log('🎯 活动项结构信息:');
    eventInfo.forEach((info, index) => {
      console.log(`  ${index + 1}. URL: ${info.url}`);
      console.log(`     父元素: ${info.parentTag} (${info.parentClass})`);
      console.log(`     有标题: ${info.hasHeading}`);
      console.log(`     有generic: ${info.hasGeneric} (数量: ${info.genericCount})`);
      console.log(`     文本: ${info.textContent}...`);
      console.log('');
    });
    
    // 分析分页结构
    const paginationInfo = await page.evaluate(() => {
      const paginationElements = [];
      
      // 查找分页相关元素
      const buttons = document.querySelectorAll('button, listitem');
      
      for (let element of buttons) {
        const text = element.textContent.trim();
        if (text.match(/^\\d+$/) || text.includes('next') || text.includes('page')) {
          paginationElements.push({
            tagName: element.tagName,
            textContent: text,
            className: element.className,
            isDisabled: element.disabled || element.classList.contains('disabled'),
            parentTag: element.parentElement?.tagName
          });
        }
      }
      
      return paginationElements;
    });
    
    console.log('📄 分页元素信息:');
    paginationInfo.forEach((info, index) => {
      console.log(`  ${index + 1}. ${info.tagName}: "${info.textContent}"`);
      console.log(`     类名: ${info.className}`);
      console.log(`     禁用: ${info.isDisabled}`);
      console.log(`     父元素: ${info.parentTag}`);
      console.log('');
    });
    
    console.log('✅ 调试完成，浏览器将保持打开状态供检查...');
    console.log('按任意键关闭浏览器...');
    
    // 等待用户输入
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', () => {
      process.exit();
    });
    
  } catch (error) {
    console.error('❌ 调试失败:', error);
    await browser.close();
  }
}

if (require.main === module) {
  debugPageStructure();
}

module.exports = debugPageStructure;