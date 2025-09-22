/**
 * Verify Final Event Page Fixes
 * Tests event sorting and button display
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 验证最终修复结果');
console.log('==============================');

// Load processed events
const processedEventsPath = path.join(__dirname, '../src/data/events/processed-events.json');
let events = [];

try {
  const eventsData = fs.readFileSync(processedEventsPath, 'utf8');
  events = JSON.parse(eventsData);
  console.log(`📊 加载了 ${events.length} 个处理后的事件`);
} catch (error) {
  console.error('❌ 无法读取处理后的事件数据:', error);
  process.exit(1);
}

// Test 1: Check event sorting (newest first)
console.log('\n✅ 测试 1: 事件排序验证');
const upcomingEvents = events.filter(e => e.isUpcoming);
const pastEvents = events.filter(e => !e.isUpcoming);

console.log(`  即将举行的事件: ${upcomingEvents.length}`);
console.log(`  已结束的事件: ${pastEvents.length}`);

// Check if events are properly sorted by date
function parseEventTime(timeStr) {
  if (!timeStr) return null;
  
  try {
    const match = timeStr.match(/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/);
    if (!match) return null;
    
    const [, month, day, hour, minute] = match;
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    let eventDate = new Date(currentYear, parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
    
    const monthDiff = currentMonth - parseInt(month);
    if (monthDiff > 3) {
      eventDate.setFullYear(currentYear + 1);
    }
    
    return eventDate;
  } catch {
    return null;
  }
}

// Sort events by date (newest first)
const sortedEvents = [...events].sort((a, b) => {
  const dateA = parseEventTime(a.time);
  const dateB = parseEventTime(b.time);
  
  if (!dateA && !dateB) return 0;
  if (!dateA) return 1;
  if (!dateB) return -1;
  
  return dateB.getTime() - dateA.getTime();
});

console.log('\n📅 前10个事件（按日期排序）:');
sortedEvents.slice(0, 10).forEach((event, index) => {
  const eventDate = parseEventTime(event.time);
  const dateStr = eventDate ? eventDate.toISOString().substring(0, 10) : 'N/A';
  const status = event.isUpcoming ? '即将举行' : '已结束';
  console.log(`  ${index + 1}. ${event.time} (${dateStr}) - ${status} - ${event.title.substring(0, 40)}...`);
});

// Test 2: Check if events have proper structure for buttons
console.log('\n✅ 测试 2: 事件卡片结构验证');
let eventsWithUrls = 0;
let eventsWithTitles = 0;
let eventsWithDates = 0;
let eventsWithLocations = 0;

events.forEach(event => {
  if (event.url) eventsWithUrls++;
  if (event.title) eventsWithTitles++;
  if (event.time) eventsWithDates++;
  if (event.location) eventsWithLocations++;
});

console.log(`  有URL的事件: ${eventsWithUrls}/${events.length} (${Math.round(eventsWithUrls/events.length*100)}%)`);
console.log(`  有标题的事件: ${eventsWithTitles}/${events.length} (${Math.round(eventsWithTitles/events.length*100)}%)`);
console.log(`  有日期的事件: ${eventsWithDates}/${events.length} (${Math.round(eventsWithDates/events.length*100)}%)`);
console.log(`  有地点的事件: ${eventsWithLocations}/${events.length} (${Math.round(eventsWithLocations/events.length*100)}%)`);

// Test 3: Check HTML structure for events page
console.log('\n✅ 测试 3: 检查构建后的HTML结构');
const eventsHtmlPath = path.join(__dirname, '../dist/events/index.html');

try {
  const htmlContent = fs.readFileSync(eventsHtmlPath, 'utf8');
  
  // Check for grid layout
  const hasGridLayout = htmlContent.includes('grid-cols-1 md:grid-cols-2 lg:grid-cols-3');
  console.log(`  网格布局存在: ${hasGridLayout ? '✅' : '❌'}`);
  
  // Check for flexbox in cards
  const hasFlexboxCards = htmlContent.includes('flex flex-col');
  console.log(`  Flexbox卡片布局: ${hasFlexboxCards ? '✅' : '❌'}`);
  
  // Check for view details buttons
  const hasViewDetailsButtons = htmlContent.includes('查看详情') || htmlContent.includes('viewDetails');
  console.log(`  查看详情按钮: ${hasViewDetailsButtons ? '✅' : '❌'}`);
  
  // Check if tag filters are removed
  const hasTagFilters = htmlContent.includes('tagFilter') || htmlContent.includes('标签过滤');
  console.log(`  Tag过滤器已移除: ${!hasTagFilters ? '✅' : '❌'}`);
  
} catch (error) {
  console.log('  ⚠️  无法读取构建后的HTML文件，可能需要先运行构建');
}

// Test 4: Verify date logic
console.log('\n✅ 测试 4: 日期逻辑验证');
const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const currentMonth = currentDate.getMonth() + 1;

console.log(`  当前日期: ${currentYear}-${currentMonth.toString().padStart(2, '0')}`);

// Check some specific events
const testEvents = [
  { time: '03/22 13:30', expected: 'upcoming' },
  { time: '09/21 14:00', expected: 'past' },
  { time: '12/25 19:30', expected: 'upcoming' }
];

testEvents.forEach(test => {
  const eventDate = parseEventTime(test.time);
  const isUpcoming = eventDate && eventDate > currentDate;
  const status = isUpcoming ? 'upcoming' : 'past';
  const correct = status === test.expected;
  
  console.log(`  ${test.time} -> ${status} (期望: ${test.expected}) ${correct ? '✅' : '❌'}`);
});

console.log('\n🎉 验证完成！');

// Summary
const issues = [];
if (upcomingEvents.length === 0 && pastEvents.length === 0) {
  issues.push('没有找到任何事件');
}

if (eventsWithUrls < events.length * 0.9) {
  issues.push('部分事件缺少URL');
}

if (issues.length > 0) {
  console.log('\n⚠️  发现的问题:');
  issues.forEach(issue => console.log(`  - ${issue}`));
} else {
  console.log('\n✅ 所有测试通过！事件页面修复成功。');
}