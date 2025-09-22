#!/usr/bin/env node

/**
 * 活动数据完整工作流程
 * 集成采集、清理、分析和报告功能
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class EventsWorkflow {
  constructor() {
    this.dataFile = './data/events/events.json';
    this.reportFile = './data/events/report.json';
  }

  async runCommand(command, args = []) {
    return new Promise((resolve, reject) => {
      console.log(`🚀 执行: ${command} ${args.join(' ')}`);
      
      const process = spawn(command, args, {
        stdio: 'inherit',
        shell: true
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`命令执行失败，退出码: ${code}`));
        }
      });

      process.on('error', reject);
    });
  }

  async getEventCount() {
    if (!fs.existsSync(this.dataFile)) {
      return 0;
    }

    try {
      const data = fs.readFileSync(this.dataFile, 'utf8');
      const events = JSON.parse(data);
      return events.length;
    } catch {
      return 0;
    }
  }

  async getReport() {
    if (!fs.existsSync(this.reportFile)) {
      return null;
    }

    try {
      const data = fs.readFileSync(this.reportFile, 'utf8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async fullWorkflow() {
    console.log('🎯 开始完整的活动数据工作流程');
    console.log('='.repeat(50));

    try {
      // 1. 显示当前状态
      const initialCount = await this.getEventCount();
      console.log(`📊 当前活动数量: ${initialCount}`);

      // 2. 备份现有数据
      if (initialCount > 0) {
        console.log('\n📦 备份现有数据...');
        await this.runCommand('npm', ['run', 'events:backup']);
      }

      // 3. 运行完整的事件处理流程（包括采集、处理、城市映射）
      console.log('\n🔄 运行事件处理流程...');
      await this.runCommand('node', ['scripts/process-events.js', '--force']);

      // 4. 数据清理（如果需要额外清理）
      console.log('\n🧹 清理数据...');
      await this.runCommand('npm', ['run', 'events:clean']);

      // 5. 导出CSV
      console.log('\n📄 导出CSV文件...');
      await this.runCommand('npm', ['run', 'events:csv']);

      // 6. 显示最终结果
      const finalCount = await this.getEventCount();
      const report = await this.getReport();

      console.log('\n🎉 工作流程完成！');
      console.log('='.repeat(50));
      console.log(`📈 结果统计:`);
      console.log(`   初始活动数: ${initialCount}`);
      console.log(`   最终活动数: ${finalCount}`);
      
      if (report) {
        console.log(`   本次新增: ${report.newEventsThisRun}`);
        console.log(`   最后更新: ${new Date(report.lastUpdate).toLocaleString()}`);
      }

    } catch (error) {
      console.error('\n❌ 工作流程失败:', error.message);
      process.exit(1);
    }
  }

  async quickScrape() {
    console.log('⚡ 快速采集模式');
    console.log('='.repeat(30));

    try {
      // 运行事件处理流程（自动检测是否需要刷新）
      await this.runCommand('node', ['scripts/process-events.js']);
      
      console.log('\n✅ 快速采集完成！');
    } catch (error) {
      console.error('\n❌ 快速采集失败:', error.message);
      process.exit(1);
    }
  }

  async testMode() {
    console.log('🧪 测试模式');
    console.log('='.repeat(20));

    try {
      await this.runCommand('npm', ['run', 'scrape:test']);
      console.log('\n✅ 测试完成！');
    } catch (error) {
      console.error('\n❌ 测试失败:', error.message);
      process.exit(1);
    }
  }

  showHelp() {
    console.log(`
活动数据工作流程管理工具

用法:
  node scripts/events-workflow.cjs [模式]

模式:
  full      完整工作流程 (默认)
            - 备份数据
            - 采集新活动
            - 清理数据
            - 质量分析
            - 生成报告
            - 导出CSV

  quick     快速模式
            - 采集新活动
            - 清理数据
            - 显示统计

  test      测试模式
            - 仅测试采集功能

  help      显示帮助信息

示例:
  node scripts/events-workflow.cjs           # 完整工作流程
  node scripts/events-workflow.cjs quick     # 快速模式
  node scripts/events-workflow.cjs test      # 测试模式
`);
  }

  async run() {
    const args = process.argv.slice(2);
    const mode = args[0] || 'full';

    switch (mode) {
      case 'full':
        await this.fullWorkflow();
        break;
      case 'quick':
        await this.quickScrape();
        break;
      case 'test':
        await this.testMode();
        break;
      case 'help':
      case '--help':
      case '-h':
        this.showHelp();
        break;
      default:
        console.log(`❌ 未知模式: ${mode}`);
        this.showHelp();
        process.exit(1);
    }
  }
}

// 运行工作流程
if (require.main === module) {
  const workflow = new EventsWorkflow();
  workflow.run().catch(console.error);
}

module.exports = EventsWorkflow;