#!/usr/bin/env node

/**
 * 清空活动数据脚本
 * 清空上次抓取的活动数据，但保留图片文件
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🧹 清空活动数据');
console.log('================\n');

function clearEventData() {
  try {
    // 确保目录存在
    const eventsDir = join(rootDir, 'src/data/events');
    if (!existsSync(eventsDir)) {
      mkdirSync(eventsDir, { recursive: true });
      console.log('📁 创建事件数据目录');
    }
    
    // 清空处理后的事件数据
    const emptyEvents = [];
    const processedEventsPath = join(eventsDir, 'processed-events.json');
    writeFileSync(processedEventsPath, JSON.stringify(emptyEvents, null, 2));
    console.log('✅ 清空 processed-events.json');
    
    // 清空城市映射数据
    const emptyMappings = {};
    const cityMappingsPath = join(eventsDir, 'city-mappings.json');
    writeFileSync(cityMappingsPath, JSON.stringify(emptyMappings, null, 2));
    console.log('✅ 清空 city-mappings.json');
    
    // 重置事件统计数据
    const emptyStats = {
      totalEvents: 0,
      upcomingEvents: 0,
      pastEvents: 0,
      cityDistribution: {},
      engagementMetrics: {
        totalViews: 0,
        totalFavorites: 0,
        averageViews: 0,
        averageFavorites: 0,
        topViewedEvents: [],
        topFavoritedEvents: []
      },
      mappingStats: {
        mappedEvents: 0,
        unmappedEvents: 0,
        mappingSuccessRate: 0
      },
      timeDistribution: {},
      lastUpdated: new Date().toISOString(),
      status: 'cleared'
    };
    const eventStatsPath = join(eventsDir, 'event-stats.json');
    writeFileSync(eventStatsPath, JSON.stringify(emptyStats, null, 2));
    console.log('✅ 重置 event-stats.json');
    
    // 清空原始事件数据（如果存在）
    const rawEventsDir = join(rootDir, 'data/events');
    const rawEventsPath = join(rawEventsDir, 'events.json');
    if (existsSync(rawEventsPath)) {
      writeFileSync(rawEventsPath, JSON.stringify([], null, 2));
      console.log('✅ 清空 data/events/events.json');
    }
    
    // 清空质量报告（如果存在）
    const qualityReportPath = join(rawEventsDir, 'quality-report.json');
    if (existsSync(qualityReportPath)) {
      const emptyReport = {
        timestamp: new Date().toISOString(),
        totalEvents: 0,
        issues: [],
        summary: {
          criticalIssues: 0,
          warnings: 0,
          suggestions: 0
        },
        status: 'cleared'
      };
      writeFileSync(qualityReportPath, JSON.stringify(emptyReport, null, 2));
      console.log('✅ 重置 quality-report.json');
    }
    
    console.log('\n🎉 活动数据清空完成！');
    console.log('💡 现在可以运行 npm run scrape:events 重新抓取数据');
    
  } catch (error) {
    console.error('❌ 清空数据时发生错误:', error.message);
    process.exit(1);
  }
}

// 运行清空函数
clearEventData();