#!/usr/bin/env node

/**
 * 活动数据查看工具
 * 用于查看和分析采集到的活动数据
 */

const fs = require('fs');
const path = require('path');

class EventViewer {
  constructor() {
    this.dataFile = './data/events/events.json';
    this.imageDir = './data/events/images';
  }

  loadEvents() {
    // 优先尝试加载处理后的事件数据
    const processedEventsFile = './src/data/events/processed-events.json';
    if (fs.existsSync(processedEventsFile)) {
      try {
        const data = fs.readFileSync(processedEventsFile, 'utf8');
        const events = JSON.parse(data);
        console.log(`✅ 加载了 ${events.length} 个处理后的活动数据`);
        return events;
      } catch (error) {
        console.log('⚠️  处理后的活动数据读取失败，尝试原始数据:', error.message);
      }
    }

    // 回退到原始事件数据
    if (!fs.existsSync(this.dataFile)) {
      console.log('❌ 没有找到活动数据文件');
      console.log('   请先运行: npm run scrape:events 或 node scripts/process-events.js');
      return [];
    }

    try {
      const data = fs.readFileSync(this.dataFile, 'utf8');
      const events = JSON.parse(data);
      console.log(`✅ 加载了 ${events.length} 个原始活动数据`);
      return events;
    } catch (error) {
      console.error('❌ 读取活动数据失败:', error.message);
      return [];
    }
  }

  formatDate(dateString) {
    try {
      return new Date(dateString).toLocaleString('zh-CN');
    } catch {
      return dateString;
    }
  }

  showStatistics(events) {
    console.log('📊 活动统计信息');
    console.log('='.repeat(50));
    console.log(`总活动数量: ${events.length}`);
    
    if (events.length === 0) return;

    // 按地点统计
    const locationStats = {};
    events.forEach(event => {
      if (event.location) {
        locationStats[event.location] = (locationStats[event.location] || 0) + 1;
      }
    });

    console.log('\n📍 按地点分布:');
    Object.entries(locationStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([location, count]) => {
        console.log(`   ${location}: ${count} 个活动`);
      });

    // 按月份统计
    const monthStats = {};
    events.forEach(event => {
      if (event.time) {
        const month = event.time.substring(0, 5); // 提取 MM/DD 部分
        monthStats[month] = (monthStats[month] || 0) + 1;
      }
    });

    console.log('\n📅 按时间分布:');
    Object.entries(monthStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 10)
      .forEach(([month, count]) => {
        console.log(`   ${month}: ${count} 个活动`);
      });

    // 图片统计
    const withImages = events.filter(event => event.localImage).length;
    console.log(`\n🖼️  图片下载情况: ${withImages}/${events.length} (${((withImages/events.length)*100).toFixed(1)}%)`);

    // 最新活动
    const latestEvent = events[0];
    if (latestEvent) {
      console.log('\n🆕 最新活动:');
      console.log(`   ${latestEvent.title}`);
      console.log(`   时间: ${latestEvent.time}`);
      console.log(`   地点: ${latestEvent.location}`);
    }
  }

  showEventList(events, limit = 10) {
    console.log(`\n📋 活动列表 (显示前 ${Math.min(limit, events.length)} 个)`);
    console.log('='.repeat(80));

    events.slice(0, limit).forEach((event, index) => {
      console.log(`\n${index + 1}. ${event.title}`);
      console.log(`   🕒 时间: ${event.time || '未知'}`);
      console.log(`   📍 地点: ${event.location || '未知'}`);
      console.log(`   🔗 链接: ${event.url}`);
      console.log(`   🖼️  图片: ${event.localImage ? `✅ ${event.localImage}` : '❌ 无'}`);
      console.log(`   📅 采集时间: ${this.formatDate(event.scrapedAt)}`);
    });

    if (events.length > limit) {
      console.log(`\n... 还有 ${events.length - limit} 个活动`);
    }
  }

  searchEvents(events, keyword) {
    const results = events.filter(event => 
      event.title.toLowerCase().includes(keyword.toLowerCase()) ||
      (event.location && event.location.toLowerCase().includes(keyword.toLowerCase()))
    );

    console.log(`\n🔍 搜索结果: "${keyword}" (找到 ${results.length} 个活动)`);
    console.log('='.repeat(50));

    if (results.length === 0) {
      console.log('没有找到匹配的活动');
      return;
    }

    this.showEventList(results, 20);
  }

  analyzeDataQuality(events) {
    console.log('\n🔍 数据质量分析');
    console.log('='.repeat(50));
    
    const issues = [];
    let validLocationCount = 0;
    let validTimeCount = 0;
    let imageCount = 0;
    
    events.forEach((event, index) => {
      const eventIssues = [];
      
      // 检查地点信息
      if (!event.location || event.location.trim() === '') {
        eventIssues.push('缺少地点信息');
      } else if (!/[\u4e00-\u9fa5]/.test(event.location)) {
        eventIssues.push('地点信息可能无效（无中文字符）');
      } else if (/^\d+\s+\d+/.test(event.location)) {
        eventIssues.push('地点信息异常（纯数字）');
      } else {
        validLocationCount++;
      }
      
      // 检查时间信息
      if (!event.time || event.time.trim() === '') {
        eventIssues.push('缺少时间信息');
      } else if (!/\d{2}\/\d{2}\s+\d{2}:\d{2}/.test(event.time)) {
        eventIssues.push('时间格式异常');
      } else {
        validTimeCount++;
      }
      
      // 检查图片信息
      if (!event.imageUrl && !event.localImage) {
        eventIssues.push('缺少图片');
      } else if (event.localImage) {
        imageCount++;
      }
      
      if (eventIssues.length > 0) {
        issues.push({
          index: index + 1,
          id: event.id,
          title: event.title,
          issues: eventIssues
        });
      }
    });
    
    // 显示质量统计
    console.log('📈 数据完整性统计:');
    console.log(`   📍 有效地点信息: ${validLocationCount}/${events.length} (${(validLocationCount/events.length*100).toFixed(1)}%)`);
    console.log(`   ⏰ 有效时间信息: ${validTimeCount}/${events.length} (${(validTimeCount/events.length*100).toFixed(1)}%)`);
    console.log(`   🖼️  已下载图片: ${imageCount}/${events.length} (${(imageCount/events.length*100).toFixed(1)}%)`);
    
    if (issues.length === 0) {
      console.log('\n✅ 所有活动数据质量良好！');
    } else {
      console.log(`\n⚠️ 发现 ${issues.length} 个活动存在数据质量问题:`);
      console.log('='.repeat(50));
      
      issues.slice(0, 10).forEach(issue => {
        console.log(`\n${issue.index}. ${issue.title} (ID: ${issue.id})`);
        issue.issues.forEach(problemDesc => {
          console.log(`   ❌ ${problemDesc}`);
        });
      });
      
      if (issues.length > 10) {
        console.log(`\n... 还有 ${issues.length - 10} 个问题未显示`);
        console.log('使用 --quality --all 查看所有问题');
      }
    }
  }

  exportToCSV(events) {
    const csvFile = './data/events/events.csv';
    
    // 检查是否是处理后的事件数据（包含新字段）
    const isProcessedData = events.length > 0 && events[0].hasOwnProperty('cityMappings');
    
    const headers = isProcessedData ? [
      'ID', '标题', '时间', '地点', '链接', '图片URL', '本地图片', 
      '浏览量', '收藏量', '城市映射', '标签', '是否即将举行', '格式化日期', '采集时间'
    ] : [
      'ID', '标题', '时间', '地点', '链接', '图片URL', '本地图片', '采集时间'
    ];
    
    const rows = events.map(event => {
      const baseRow = [
        event.id,
        `"${event.title.replace(/"/g, '""')}"`,
        event.time || '',
        event.location || '',
        event.url,
        event.imageUrl || '',
        event.localImage || '',
      ];
      
      if (isProcessedData) {
        return [
          ...baseRow,
          event.views || 0,
          event.favorites || 0,
          (event.cityMappings || []).join(';'),
          (event.tags || []).join(';'),
          event.isUpcoming ? '是' : '否',
          event.formattedDate || '',
          event.scrapedAt
        ];
      } else {
        return [
          ...baseRow,
          event.scrapedAt
        ];
      }
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    fs.writeFileSync(csvFile, csvContent, 'utf8');
    console.log(`\n📄 CSV文件已导出: ${csvFile}`);
    console.log(`   包含 ${events.length} 个活动，${headers.length} 个字段`);
    
    if (isProcessedData) {
      console.log(`   数据类型: 处理后的事件数据（包含城市映射和标签）`);
    } else {
      console.log(`   数据类型: 原始事件数据`);
    }
  }

  run() {
    const args = process.argv.slice(2);
    const events = this.loadEvents();

    if (events.length === 0) {
      return;
    }

    // 解析命令行参数
    if (args.includes('--help') || args.includes('-h')) {
      console.log(`
活动数据查看工具

用法:
  node scripts/view-events.js [选项] [搜索关键词]

选项:
  -h, --help      显示帮助信息
  -s, --stats     显示统计信息
  -l, --list      显示活动列表
  -a, --all       显示所有活动
  -q, --quality   数据质量分析
  --csv           导出为CSV文件
  --search <关键词>  搜索活动

示例:
  node scripts/view-events.js --stats           # 显示统计信息
  node scripts/view-events.js --list            # 显示活动列表
  node scripts/view-events.js --quality         # 数据质量分析
  node scripts/view-events.js --search Kiro     # 搜索包含"Kiro"的活动
  node scripts/view-events.js --csv             # 导出CSV文件
`);
      return;
    }

    // 默认显示统计信息
    if (args.length === 0 || args.includes('--stats') || args.includes('-s')) {
      this.showStatistics(events);
    }

    // 显示活动列表
    if (args.includes('--list') || args.includes('-l')) {
      const limit = args.includes('--all') || args.includes('-a') ? events.length : 10;
      this.showEventList(events, limit);
    }

    // 搜索功能
    const searchIndex = args.findIndex(arg => arg === '--search');
    if (searchIndex !== -1 && args[searchIndex + 1]) {
      this.searchEvents(events, args[searchIndex + 1]);
    }

    // 如果没有选项，但有参数，当作搜索关键词
    if (!args.some(arg => arg.startsWith('--')) && args.length > 0) {
      this.searchEvents(events, args[0]);
    }

    // 数据质量分析
    if (args.includes('--quality') || args.includes('-q')) {
      this.analyzeDataQuality(events);
    }

    // 导出CSV
    if (args.includes('--csv')) {
      this.exportToCSV(events);
    }
  }
}

// 运行查看器
if (require.main === module) {
  const viewer = new EventViewer();
  viewer.run();
}

module.exports = EventViewer;