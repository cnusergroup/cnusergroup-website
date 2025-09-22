#!/usr/bin/env node

/**
 * 部署状态检查脚本
 * 验证部署后的网站是否正常工作
 */

import https from 'https';
import http from 'http';
import { URL } from 'url';

// 配置
const config = {
  // 默认 GitHub Pages URL（用户需要替换为实际 URL）
  baseUrl: process.env.SITE_URL || 'https://yourusername.github.io/cnusergroup',
  timeout: 10000, // 10秒超时
  retries: 3,     // 重试次数
  delay: 2000     // 重试间隔（毫秒）
};

console.log('🌐 检查部署状态');
console.log('================\n');
console.log(`🔗 目标网站: ${config.baseUrl}\n`);

let totalChecks = 0;
let passedChecks = 0;
const results = [];

// 辅助函数
function logResult(test, passed, message = '') {
  totalChecks++;
  if (passed) {
    passedChecks++;
    console.log(`✅ ${test}`);
  } else {
    console.log(`❌ ${test}${message ? ` - ${message}` : ''}`);
  }
  results.push({ test, passed, message });
}

// HTTP 请求函数
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      timeout: config.timeout,
      headers: {
        'User-Agent': 'CNUserGroup-Deploy-Checker/1.0',
        ...options.headers
      }
    };
    
    const req = client.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          url: url
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

// 带重试的请求
async function requestWithRetry(url, options = {}) {
  let lastError;
  
  for (let i = 0; i < config.retries; i++) {
    try {
      return await makeRequest(url, options);
    } catch (error) {
      lastError = error;
      if (i < config.retries - 1) {
        console.log(`⏳ 重试 ${i + 1}/${config.retries - 1} - ${url}`);
        await new Promise(resolve => setTimeout(resolve, config.delay));
      }
    }
  }
  
  throw lastError;
}

// 1. 基本连通性测试
async function testConnectivity() {
  console.log('🔌 测试网站连通性...');
  
  try {
    const response = await requestWithRetry(config.baseUrl);
    logResult('网站可访问', response.statusCode === 200, `状态码: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      // 检查响应时间
      const startTime = Date.now();
      await requestWithRetry(config.baseUrl);
      const responseTime = Date.now() - startTime;
      
      logResult('响应时间正常', responseTime < 5000, `${responseTime}ms`);
      
      return response;
    }
  } catch (error) {
    logResult('网站可访问', false, error.message);
    return null;
  }
  
  console.log('');
}

// 2. 页面内容测试
async function testPageContent(baseResponse) {
  console.log('📄 测试页面内容...');
  
  if (!baseResponse) {
    logResult('首页内容检查', false, '无法获取页面');
    console.log('');
    return;
  }
  
  const html = baseResponse.body;
  
  // 检查基本 HTML 结构
  logResult('HTML 文档结构', html.includes('<!DOCTYPE html>'));
  logResult('页面标题存在', html.includes('<title>') && html.includes('</title>'));
  logResult('Meta 标签存在', html.includes('<meta'));
  
  // 检查关键内容
  logResult('包含中国用户组内容', html.includes('中国用户组') || html.includes('CNUserGroup'));
  logResult('包含城市信息', html.includes('城市') || html.includes('city') || html.includes('cities'));
  logResult('包含事件信息', html.includes('活动') || html.includes('event') || html.includes('events'));
  
  // 检查 CSS 和 JS
  logResult('CSS 样式加载', html.includes('.css') || html.includes('<style>'));
  logResult('JavaScript 加载', html.includes('.js') || html.includes('<script>'));
  
  console.log('');
}

// 3. 关键页面测试
async function testKeyPages() {
  console.log('🔗 测试关键页面...');
  
  const keyPages = [
    { path: '/', name: '首页' },
    { path: '/cities/', name: '城市页面' },
    { path: '/events/', name: '事件页面' },
    { path: '/about/', name: '关于页面' },
    { path: '/en/', name: '英文首页' },
    { path: '/en/cities/', name: '英文城市页面' },
    { path: '/en/events/', name: '英文事件页面' },
    { path: '/en/about/', name: '英文关于页面' }
  ];
  
  for (const page of keyPages) {
    try {
      const url = config.baseUrl + page.path;
      const response = await requestWithRetry(url);
      logResult(`${page.name} (${page.path})`, response.statusCode === 200, `状态码: ${response.statusCode}`);
    } catch (error) {
      logResult(`${page.name} (${page.path})`, false, error.message);
    }
  }
  
  console.log('');
}

// 4. 静态资源测试
async function testStaticResources() {
  console.log('📦 测试静态资源...');
  
  const resources = [
    { path: '/favicon.ico', name: 'Favicon' },
    { path: '/robots.txt', name: 'Robots.txt' },
    { path: '/sitemap.xml', name: 'Sitemap' }
  ];
  
  for (const resource of resources) {
    try {
      const url = config.baseUrl + resource.path;
      const response = await requestWithRetry(url);
      logResult(`${resource.name}`, response.statusCode === 200, `状态码: ${response.statusCode}`);
    } catch (error) {
      logResult(`${resource.name}`, false, error.message);
    }
  }
  
  console.log('');
}

// 5. 性能测试
async function testPerformance() {
  console.log('⚡ 测试性能指标...');
  
  try {
    const startTime = Date.now();
    const response = await requestWithRetry(config.baseUrl);
    const loadTime = Date.now() - startTime;
    
    logResult('首屏加载时间', loadTime < 3000, `${loadTime}ms`);
    
    // 检查响应头
    const headers = response.headers;
    logResult('启用 Gzip 压缩', headers['content-encoding'] === 'gzip' || headers['content-encoding'] === 'br');
    logResult('设置缓存头', !!headers['cache-control'] || !!headers['expires']);
    
    // 检查内容大小
    const contentLength = headers['content-length'];
    if (contentLength) {
      const sizeKB = parseInt(contentLength) / 1024;
      logResult('页面大小合理', sizeKB < 500, `${sizeKB.toFixed(2)} KB`);
    }
    
  } catch (error) {
    logResult('性能测试', false, error.message);
  }
  
  console.log('');
}

// 6. SEO 检查
async function testSEO() {
  console.log('🔍 测试 SEO 优化...');
  
  try {
    const response = await requestWithRetry(config.baseUrl);
    const html = response.body;
    
    // 检查基本 SEO 元素
    logResult('Meta Description', html.includes('<meta name="description"'));
    logResult('Meta Keywords', html.includes('<meta name="keywords"'));
    logResult('Open Graph 标签', html.includes('og:title') || html.includes('og:description'));
    logResult('Twitter Card', html.includes('twitter:card'));
    logResult('Canonical URL', html.includes('<link rel="canonical"'));
    
    // 检查结构化数据
    logResult('JSON-LD 结构化数据', html.includes('application/ld+json'));
    
  } catch (error) {
    logResult('SEO 检查', false, error.message);
  }
  
  console.log('');
}

// 7. 事件系统测试
async function testEventSystem() {
  console.log('📅 测试事件系统...');
  
  try {
    // 测试事件列表页面
    const eventsResponse = await requestWithRetry(config.baseUrl + '/events/');
    logResult('事件列表页面可访问', eventsResponse.statusCode === 200, `状态码: ${eventsResponse.statusCode}`);
    
    if (eventsResponse.statusCode === 200) {
      const html = eventsResponse.body;
      
      // 检查事件页面内容
      logResult('包含事件列表', html.includes('event') || html.includes('活动'));
      logResult('包含事件卡片', html.includes('event-card') || html.includes('EventCard'));
      logResult('包含分页功能', html.includes('pagination') || html.includes('page'));
      logResult('包含筛选功能', html.includes('filter') || html.includes('筛选'));
      
      // 检查事件结构化数据
      logResult('事件结构化数据', html.includes('application/ld+json') && html.includes('Event'));
      
      // 检查事件统计
      logResult('事件统计信息', html.includes('stats') || html.includes('统计'));
    }
    
    // 测试英文事件页面
    const enEventsResponse = await requestWithRetry(config.baseUrl + '/en/events/');
    logResult('英文事件页面可访问', enEventsResponse.statusCode === 200, `状态码: ${enEventsResponse.statusCode}`);
    
    // 测试城市页面中的事件集成
    const cityResponse = await requestWithRetry(config.baseUrl + '/cities/beijing/');
    if (cityResponse.statusCode === 200) {
      const cityHtml = cityResponse.body;
      logResult('城市页面包含事件', cityHtml.includes('event') || cityHtml.includes('活动') || cityHtml.includes('近期活动'));
    }
    
  } catch (error) {
    logResult('事件系统测试', false, error.message);
  }
  
  console.log('');
}

// 8. 移动端适配测试
async function testMobileCompatibility() {
  console.log('📱 测试移动端适配...');
  
  try {
    const response = await requestWithRetry(config.baseUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      }
    });
    
    const html = response.body;
    
    logResult('Viewport Meta 标签', html.includes('<meta name="viewport"'));
    logResult('响应式设计', html.includes('responsive') || html.includes('@media'));
    logResult('移动端优化', html.includes('mobile') || html.includes('touch'));
    
  } catch (error) {
    logResult('移动端测试', false, error.message);
  }
  
  console.log('');
}

// 生成测试报告
function generateReport() {
  console.log('📊 部署检查报告');
  console.log('================');
  
  const successRate = Math.round((passedChecks / totalChecks) * 100);
  
  console.log(`✅ 通过测试: ${passedChecks}/${totalChecks} (${successRate}%)`);
  console.log(`❌ 失败测试: ${totalChecks - passedChecks}`);
  
  if (successRate >= 90) {
    console.log('\n🎉 部署状态优秀！网站运行正常。');
  } else if (successRate >= 70) {
    console.log('\n⚠️  部署状态良好，但有一些问题需要关注。');
  } else {
    console.log('\n❌ 部署状态不佳，需要修复多个问题。');
  }
  
  // 显示失败的测试
  const failedTests = results.filter(r => !r.passed);
  if (failedTests.length > 0) {
    console.log('\n🔧 需要修复的问题:');
    failedTests.forEach(test => {
      console.log(`   • ${test.test}${test.message ? ` - ${test.message}` : ''}`);
    });
  }
  
  console.log('\n📋 建议检查项目:');
  console.log('   • GitHub Pages 设置是否正确');
  console.log('   • 域名配置是否生效');
  console.log('   • 构建输出是否完整');
  console.log('   • 静态资源路径是否正确');
  
  return {
    totalChecks,
    passedChecks,
    successRate,
    failedTests: failedTests.map(t => ({ test: t.test, message: t.message }))
  };
}

// 主函数
async function main() {
  try {
    console.log(`⏰ 开始时间: ${new Date().toLocaleString()}\n`);
    
    // 执行所有测试
    const baseResponse = await testConnectivity();
    await testPageContent(baseResponse);
    await testKeyPages();
    await testStaticResources();
    await testPerformance();
    await testSEO();
    await testEventSystem();
    await testMobileCompatibility();
    
    // 生成报告
    const report = generateReport();
    
    console.log(`\n⏰ 完成时间: ${new Date().toLocaleString()}`);
    
    // 如果成功率低于 70%，退出码为 1
    if (report.successRate < 70) {
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 检查过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 运行检查
main();