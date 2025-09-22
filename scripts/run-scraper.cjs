#!/usr/bin/env node

/**
 * 活动采集工具运行脚本
 * 提供命令行参数支持
 */

const EventScraper = require('./event-scraper.cjs');

async function main() {
  const args = process.argv.slice(2);
  
  // 解析命令行参数
  const options = {
    help: args.includes('--help') || args.includes('-h'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    force: args.includes('--force') || args.includes('-f'),
  };

  if (options.help) {
    console.log(`
活动行线下活动采集工具

用法:
  node scripts/run-scraper.js [选项]

选项:
  -h, --help     显示帮助信息
  -v, --verbose  显示详细输出
  -f, --force    强制重新采集所有活动（忽略增量更新）

示例:
  node scripts/run-scraper.js              # 正常采集
  node scripts/run-scraper.js --verbose    # 详细输出
  node scripts/run-scraper.js --force      # 强制重新采集
`);
    return;
  }

  try {
    console.log('🚀 启动活动采集工具...\n');
    
    const scraper = new EventScraper();
    
    // 如果是强制模式，清空已有数据
    if (options.force) {
      console.log('⚠️  强制模式：将重新采集所有活动\n');
      scraper.existingEvents = [];
    }
    
    await scraper.run();
    
    console.log('\n✅ 采集完成！');
    console.log('\n📁 查看采集结果:');
    console.log('   数据文件: ./data/events/events.json');
    console.log('   图片目录: ./data/events/images/');
    console.log('   日志文件: ./data/events/scraper.log');
    
  } catch (error) {
    console.error('\n❌ 采集失败:', error.message);
    
    if (options.verbose) {
      console.error('\n详细错误信息:');
      console.error(error);
    }
    
    console.log('\n💡 故障排除建议:');
    console.log('1. 检查网络连接');
    console.log('2. 确认 Playwright 已正确安装: npx playwright install chromium');
    console.log('3. 查看日志文件: cat ./data/events/scraper.log');
    
    process.exit(1);
  }
}

main().catch(console.error);