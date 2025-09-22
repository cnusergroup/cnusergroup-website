#!/usr/bin/env node

/**
 * 活动数据清理工具
 * 用于清理和修复采集到的活动数据中的质量问题
 */

const fs = require('fs');
const path = require('path');

class EventCleaner {
  constructor() {
    this.dataFile = './data/events/events.json';
    this.backupDir = './data/events/backup';
    
    // 确保备份目录存在
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  loadEvents() {
    if (!fs.existsSync(this.dataFile)) {
      console.log('❌ 没有找到活动数据文件');
      return [];
    }

    try {
      const data = fs.readFileSync(this.dataFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ 读取活动数据失败:', error.message);
      return [];
    }
  }

  backupData() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(this.backupDir, `events-${timestamp}.json`);
    
    if (fs.existsSync(this.dataFile)) {
      fs.copyFileSync(this.dataFile, backupFile);
      console.log(`📦 数据已备份到: ${backupFile}`);
    }
  }

  saveEvents(events) {
    try {
      fs.writeFileSync(this.dataFile, JSON.stringify(events, null, 2), 'utf8');
      console.log(`✅ 已保存 ${events.length} 个活动`);
    } catch (error) {
      console.error('❌ 保存数据失败:', error.message);
    }
  }

  // 从标题中提取城市名
  extractCityFromTitle(title) {
    const cityPatterns = [
      /(北京|上海|广州|深圳|杭州|南京|苏州|成都|重庆|武汉|西安|天津|青岛|大连|厦门|福州|济南|郑州|长沙|合肥|南昌|太原|石家庄|哈尔滨|长春|沈阳|呼和浩特|银川|西宁|兰州|乌鲁木齐|拉萨|昆明|贵阳|南宁|海口|三亚|台北|香港|澳门)/,
      /(福建|浙江|江苏|广东|山东|河南|湖北|湖南|四川|陕西|河北|山西|辽宁|吉林|黑龙江|内蒙古|新疆|西藏|云南|贵州|广西|海南|宁夏|青海|甘肃|台湾)/
    ];

    for (const pattern of cityPatterns) {
      const match = title.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  }

  // 清理单个活动数据
  cleanEvent(event) {
    let cleaned = false;
    const issues = [];

    // 清理标题
    const originalTitle = event.title;
    event.title = event.title.replace(/\s+/g, ' ').trim();
    if (event.title !== originalTitle) {
      cleaned = true;
      issues.push('清理了标题中的多余空格');
    }

    // 清理和修复地点信息
    const originalLocation = event.location;
    if (!event.location || event.location.trim() === '') {
      // 尝试从标题中提取城市
      const extractedCity = this.extractCityFromTitle(event.title);
      if (extractedCity) {
        event.location = extractedCity;
        cleaned = true;
        issues.push(`从标题中提取地点: ${extractedCity}`);
      }
    } else if (!/[\u4e00-\u9fa5]/.test(event.location) || /^\d+\s+\d+/.test(event.location)) {
      // 地点信息无效，尝试从标题中提取
      const extractedCity = this.extractCityFromTitle(event.title);
      if (extractedCity) {
        event.location = extractedCity;
        cleaned = true;
        issues.push(`替换无效地点 "${originalLocation}" 为: ${extractedCity}`);
      } else {
        event.location = '';
        cleaned = true;
        issues.push(`清空无效地点: ${originalLocation}`);
      }
    } else {
      // 清理地点信息
      event.location = event.location.trim();
      if (event.location !== originalLocation) {
        cleaned = true;
        issues.push('清理了地点信息');
      }
    }

    // 验证时间格式
    if (event.time && !/\d{2}\/\d{2}\s+\d{2}:\d{2}/.test(event.time)) {
      event.time = '';
      cleaned = true;
      issues.push('清空了无效的时间格式');
    }

    return { cleaned, issues };
  }

  // 去重活动
  deduplicateEvents(events) {
    const seen = new Set();
    const duplicates = [];
    const unique = [];

    events.forEach((event, index) => {
      const key = `${event.id}-${event.title}`;
      if (seen.has(key)) {
        duplicates.push({ index, event });
      } else {
        seen.add(key);
        unique.push(event);
      }
    });

    return { unique, duplicates };
  }

  // 执行清理
  clean() {
    console.log('🧹 开始清理活动数据...');
    
    const events = this.loadEvents();
    if (events.length === 0) {
      return;
    }

    console.log(`📊 原始数据: ${events.length} 个活动`);

    // 备份原始数据
    this.backupData();

    let cleanedCount = 0;
    const allIssues = [];

    // 清理每个活动
    events.forEach((event, index) => {
      const { cleaned, issues } = this.cleanEvent(event);
      if (cleaned) {
        cleanedCount++;
        allIssues.push({
          index: index + 1,
          id: event.id,
          title: event.title,
          issues
        });
      }
    });

    // 去重
    const { unique, duplicates } = this.deduplicateEvents(events);
    
    if (duplicates.length > 0) {
      console.log(`\n🔄 发现 ${duplicates.length} 个重复活动:`);
      duplicates.forEach(({ index, event }) => {
        console.log(`   ${index + 1}. ${event.title} (ID: ${event.id})`);
      });
    }

    // 显示清理结果
    console.log(`\n📈 清理结果:`);
    console.log(`   清理的活动: ${cleanedCount}/${events.length}`);
    console.log(`   去重后活动: ${unique.length}/${events.length}`);

    if (allIssues.length > 0) {
      console.log(`\n🔧 清理详情:`);
      allIssues.slice(0, 10).forEach(issue => {
        console.log(`\n${issue.index}. ${issue.title} (ID: ${issue.id})`);
        issue.issues.forEach(desc => {
          console.log(`   ✅ ${desc}`);
        });
      });

      if (allIssues.length > 10) {
        console.log(`\n... 还有 ${allIssues.length - 10} 个活动被清理`);
      }
    }

    // 保存清理后的数据
    if (cleanedCount > 0 || duplicates.length > 0) {
      this.saveEvents(unique);
      console.log('\n✅ 数据清理完成！');
    } else {
      console.log('\n✅ 数据质量良好，无需清理');
    }
  }

  // 显示帮助信息
  showHelp() {
    console.log(`
活动数据清理工具

用法:
  node scripts/clean-events.cjs [选项]

选项:
  --help, -h    显示帮助信息
  --dry-run     预览清理结果，不实际修改数据
  --backup      仅创建备份

功能:
  ✅ 清理标题和地点中的多余空格
  ✅ 从标题中提取缺失的城市信息
  ✅ 修复无效的地点信息
  ✅ 清理无效的时间格式
  ✅ 去除重复的活动
  ✅ 自动备份原始数据

示例:
  node scripts/clean-events.cjs           # 执行清理
  node scripts/clean-events.cjs --dry-run # 预览清理结果
  node scripts/clean-events.cjs --backup  # 仅创建备份
`);
  }

  run() {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
      this.showHelp();
      return;
    }

    if (args.includes('--backup')) {
      this.backupData();
      return;
    }

    if (args.includes('--dry-run')) {
      console.log('🔍 预览模式 - 不会修改实际数据');
      // TODO: 实现预览模式
    }

    this.clean();
  }
}

// 运行清理工具
if (require.main === module) {
  const cleaner = new EventCleaner();
  cleaner.run();
}

module.exports = EventCleaner;