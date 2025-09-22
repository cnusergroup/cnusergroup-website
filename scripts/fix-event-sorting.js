/**
 * Fix Event Sorting Script
 * Corrects event date processing and sorting issues
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load raw events
const eventsPath = path.join(__dirname, '../data/events/events.json');
const processedEventsPath = path.join(__dirname, '../src/data/events/processed-events.json');

console.log('🔧 修复事件排序问题...');

// Read raw events
let rawEvents = [];
try {
  const eventsData = fs.readFileSync(eventsPath, 'utf8');
  rawEvents = JSON.parse(eventsData);
  console.log(`📊 加载了 ${rawEvents.length} 个原始事件`);
} catch (error) {
  console.error('❌ 无法读取事件数据:', error);
  process.exit(1);
}

/**
 * Parse event time string and return Date object with correct year assignment
 */
function parseEventTime(timeStr) {
  if (!timeStr) return null;
  
  try {
    // Parse time format like "09/21 14:00" or "12/25 19:30"
    const match = timeStr.match(/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/);
    if (!match) return null;
    
    const [, month, day, hour, minute] = match;
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11
    
    // Create date object for current year first
    let eventDate = new Date(currentYear, parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
    
    // Smart year assignment logic:
    // If event month is significantly in the past (more than 3 months ago), assume it's next year
    // This handles the case where we're in September 2025 but see events in March 2025
    const monthDiff = currentMonth - parseInt(month);
    
    if (monthDiff > 3) {
      // Event is more than 3 months in the past, likely next year
      eventDate.setFullYear(currentYear + 1);
    } else if (monthDiff < -6) {
      // Event is more than 6 months in the future, likely this year but we missed it
      // Keep current year
    }
    
    return eventDate;
  } catch {
    return null;
  }
}

/**
 * Check if event is upcoming based on time string
 */
function isEventUpcoming(timeStr) {
  const eventDate = parseEventTime(timeStr);
  if (!eventDate) return false;
  
  const now = new Date();
  return eventDate > now;
}

/**
 * Format event date for display
 */
function formatEventDate(timeStr, locale = 'zh') {
  if (!timeStr) return '';
  
  try {
    const eventDate = parseEventTime(timeStr);
    if (!eventDate) return timeStr;
    
    const year = eventDate.getFullYear();
    const match = timeStr.match(/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/);
    if (!match) return timeStr;
    
    const [, month, day, hour, minute] = match;
    
    if (locale === 'en') {
      return eventDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      return `${month}月${day}日 ${hour}:${minute} (${year}年${month}月${day}日)`;
    }
  } catch {
    return timeStr;
  }
}

/**
 * Generate SEO-friendly slug from event title
 */
function generateEventSlug(title, id) {
  const slug = title
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9\s-]/g, '') // Keep Chinese, English, numbers, spaces, hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  
  // Ensure slug is not empty and add ID for uniqueness
  return slug ? `${slug}-${id}` : `event-${id}`;
}

/**
 * Extract tags from event title and location
 */
function extractEventTags(event) {
  const tags = [];
  const text = `${event.title} ${event.location}`.toLowerCase();
  
  // Technology tags
  const techKeywords = [
    'ai', 'artificial intelligence', '人工智能',
    'aws', 'amazon', 'cloud', '云计算',
    'bedrock', 'genai', '生成式ai',
    'machine learning', 'ml', '机器学习',
    'deep learning', 'deepseek', '深度学习',
    'reinvent', 're:invent',
    'serverless', '无服务器',
    'kubernetes', 'k8s',
    'docker', '容器',
    'microservices', '微服务',
    'devops', '开发运维'
  ];
  
  techKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      tags.push(keyword);
    }
  });
  
  // Event type tags
  if (text.includes('meetup') || text.includes('聚会')) tags.push('meetup');
  if (text.includes('workshop') || text.includes('工作坊')) tags.push('workshop');
  if (text.includes('conference') || text.includes('大会')) tags.push('conference');
  if (text.includes('community') || text.includes('社区')) tags.push('community');
  if (text.includes('hackathon') || text.includes('黑客马拉松')) tags.push('hackathon');
  
  return [...new Set(tags)]; // Remove duplicates
}

// Process events with corrected logic
const processedEvents = rawEvents.map(event => {
  const isUpcoming = isEventUpcoming(event.time);
  const eventDate = parseEventTime(event.time);
  
  console.log(`📅 事件: ${event.title.substring(0, 30)}... - ${event.time} - ${isUpcoming ? '即将举行' : '已结束'} - 解析日期: ${eventDate ? eventDate.toISOString().substring(0, 10) : 'N/A'}`);
  
  return {
    ...event,
    cityMappings: [], // Will be populated by city mapping system
    slug: generateEventSlug(event.title, event.id),
    tags: extractEventTags(event),
    isUpcoming,
    formattedDate: formatEventDate(event.time)
  };
});

// Sort events by date (newest first)
const sortedEvents = processedEvents.sort((a, b) => {
  const dateA = parseEventTime(a.time);
  const dateB = parseEventTime(b.time);
  
  if (!dateA && !dateB) return 0;
  if (!dateA) return 1; // Put events without dates at the end
  if (!dateB) return -1;
  
  // Sort by actual date - newer dates first (desc order)
  return dateB.getTime() - dateA.getTime();
});

// Statistics
const upcomingCount = sortedEvents.filter(e => e.isUpcoming).length;
const pastCount = sortedEvents.length - upcomingCount;

console.log(`\n📊 处理结果:`);
console.log(`   总事件数: ${sortedEvents.length}`);
console.log(`   即将举行: ${upcomingCount}`);
console.log(`   已结束: ${pastCount}`);

// Show top 10 events by date
console.log(`\n📅 按日期排序的前10个事件:`);
sortedEvents.slice(0, 10).forEach((event, index) => {
  const eventDate = parseEventTime(event.time);
  const dateStr = eventDate ? eventDate.toISOString().substring(0, 10) : 'N/A';
  console.log(`   ${index + 1}. ${event.time} (${dateStr}) - ${event.isUpcoming ? '即将举行' : '已结束'} - ${event.title.substring(0, 40)}...`);
});

// Write processed events
try {
  fs.writeFileSync(processedEventsPath, JSON.stringify(sortedEvents, null, 2));
  console.log(`\n✅ 已保存处理后的事件到: ${processedEventsPath}`);
} catch (error) {
  console.error('❌ 保存处理后的事件失败:', error);
  process.exit(1);
}

console.log('\n🎉 事件排序修复完成！');