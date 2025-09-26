#!/usr/bin/env node

/**
 * 本地模拟 GitHub Action 更新流程
 * 完整复现 CI/CD 流程，用于本地测试和验证
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

class GitHubActionSimulator {
  constructor() {
    this.startTime = Date.now();
    this.steps = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '🔵',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      step: '📋'
    }[type] || '🔵';

    const logMessage = `${prefix} [${timestamp}] ${message}`;
    console.log(logMessage);
    
    this.steps.push({
      timestamp,
      type,
      message,
      duration: Date.now() - this.startTime
    });
  }

  runCommand(command, description, options = {}) {
    this.log(`执行: ${description}`, 'step');
    
    try {
      const result = execSync(command, {
        cwd: rootDir,
        stdio: options.silent ? 'pipe' : 'inherit',
        encoding: 'utf8',
        timeout: options.timeout || 300000, // 5 minutes default
        ...options
      });
      
      this.log(`✓ ${description} 完成`, 'success');
      return { success: true, output: result };
    } catch (error) {
      this.log(`✗ ${description} 失败: ${error.message}`, 'error');
      return { success: false, error: error.message, output: error.stdout };
    }
  }

  checkFile(filePath, description) {
    const fullPath = join(rootDir, filePath);
    if (existsSync(fullPath)) {
      this.log(`✓ ${description} 存在`, 'success');
      return true;
    } else {
      this.log(`✗ ${description} 不存在`, 'error');
      return false;
    }
  }

  validateJSON(filePath, description) {
    const fullPath = join(rootDir, filePath);
    if (!existsSync(fullPath)) {
      this.log(`✗ ${description} 文件不存在`, 'error');
      return false;
    }

    try {
      const content = readFileSync(fullPath, 'utf8');
      const data = JSON.parse(content);
      this.log(`✓ ${description} JSON 格式正确`, 'success');
      return data;
    } catch (error) {
      this.log(`✗ ${description} JSON 格式错误: ${error.message}`, 'error');
      return false;
    }
  }

  // 步骤 1: 环境准备
  async setupEnvironment() {
    this.log('=== 步骤 1: 环境准备 ===', 'step');
    
    // 检查 Node.js 版本
    const nodeResult = this.runCommand('node --version', '检查 Node.js 版本', { silent: true });
    if (nodeResult.success) {
      this.log(`Node.js 版本: ${nodeResult.output.trim()}`);
    }

    // 检查 npm 版本
    const npmResult = this.runCommand('npm --version', '检查 npm 版本', { silent: true });
    if (npmResult.success) {
      this.log(`npm 版本: ${npmResult.output.trim()}`);
    }

    // 安装依赖
    this.runCommand('npm ci', '安装项目依赖');

    // 安装 Playwright
    this.runCommand('npx playwright install chromium', '安装 Playwright 浏览器');
    this.runCommand('npx playwright install-deps chromium', '安装 Playwright 系统依赖');

    return true;
  }

  // 步骤 2: 清空之前的事件数据
  async clearPreviousData() {
    this.log('=== 步骤 2: 清空之前的事件数据 ===', 'step');

    // 确保目录存在
    const srcDataDir = join(rootDir, 'src/data/events');
    if (!existsSync(srcDataDir)) {
      mkdirSync(srcDataDir, { recursive: true });
      this.log('创建 src/data/events 目录');
    }

    // 清空处理后的事件数据
    const filesToClear = [
      'src/data/events/processed-events.json',
      'src/data/events/city-mappings.json',
      'src/data/events/event-stats.json'
    ];

    filesToClear.forEach(file => {
      const filePath = join(rootDir, file);
      if (existsSync(filePath)) {
        if (file.includes('processed-events.json')) {
          writeFileSync(filePath, '[]', 'utf8');
        } else {
          writeFileSync(filePath, '{}', 'utf8');
        }
        this.log(`清空 ${file}`);
      }
    });

    // 清空原始数据文件
    const rawDataFile = join(rootDir, 'data/events/events.json');
    if (existsSync(rawDataFile)) {
      writeFileSync(rawDataFile, '[]', 'utf8');
      this.log('清空原始事件数据');
    }

    this.log('事件数据清空完成', 'success');
    return true;
  }

  // 步骤 3: 抓取事件数据
  async scrapeEventData() {
    this.log('=== 步骤 3: 抓取事件数据 ===', 'step');

    // 运行事件抓取 - 使用正确的 improved-pagination-scraper.cjs
    const scrapeResult = this.runCommand(
      'npm run scrape:events',
      '执行事件数据抓取 (增量模式)',
      { timeout: 600000 } // 10 minutes
    );

    if (!scrapeResult.success) {
      this.log('事件抓取失败，但继续流程', 'warning');
      return false;
    }

    // 验证抓取结果
    const rawDataFile = join(rootDir, 'data/events/events.json');
    const rawData = this.validateJSON('data/events/events.json', '原始事件数据');
    
    if (rawData && Array.isArray(rawData)) {
      this.log(`抓取到 ${rawData.length} 个事件`, 'success');
      return true;
    } else {
      this.log('抓取的数据格式不正确', 'error');
      return false;
    }
  }

  // 步骤 4: 处理事件数据
  async processEventData() {
    this.log('=== 步骤 4: 处理事件数据 ===', 'step');

    // 运行事件处理
    const processResult = this.runCommand(
      'node scripts/process-events.js --force',
      '处理和验证事件数据',
      { timeout: 300000 } // 5 minutes
    );

    if (!processResult.success) {
      this.log('事件处理失败', 'error');
      return false;
    }

    // 验证处理结果
    const processedData = this.validateJSON('src/data/events/processed-events.json', '处理后的事件数据');
    const cityMappings = this.validateJSON('src/data/events/city-mappings.json', '城市映射数据');
    const eventStats = this.validateJSON('src/data/events/event-stats.json', '事件统计数据');

    if (processedData && cityMappings && eventStats) {
      if (Array.isArray(processedData)) {
        this.log(`处理完成，共 ${processedData.length} 个有效事件`, 'success');
      }
      return true;
    } else {
      this.log('处理后的数据格式不正确', 'error');
      return false;
    }
  }

  // 步骤 5: 构建项目
  async buildProject() {
    this.log('=== 步骤 5: 构建项目 ===', 'step');

    // 运行 TypeScript 检查
    this.runCommand('npx astro check', 'TypeScript 类型检查');

    // 运行构建
    const buildResult = this.runCommand('npm run build:ci', '构建 Astro 项目');

    if (!buildResult.success) {
      this.log('项目构建失败', 'error');
      return false;
    }

    // 验证构建输出
    const distExists = this.checkFile('dist/index.html', '构建输出主页');
    const keyPages = [
      'dist/cities/index.html',
      'dist/about/index.html',
      'dist/en/index.html'
    ];

    let validPages = 0;
    keyPages.forEach(page => {
      if (this.checkFile(page, `关键页面 ${page}`)) {
        validPages++;
      }
    });

    if (distExists) {
      this.log(`构建完成，${validPages}/${keyPages.length} 关键页面生成成功`, 'success');
      return true;
    } else {
      this.log('构建输出验证失败', 'error');
      return false;
    }
  }

  // 步骤 6: 验证构建质量
  async validateBuild() {
    this.log('=== 步骤 6: 验证构建质量 ===', 'step');

    const distDir = join(rootDir, 'dist');
    if (!existsSync(distDir)) {
      this.log('构建目录不存在', 'error');
      return false;
    }

    // 检查主页文件大小
    const indexPath = join(distDir, 'index.html');
    if (existsSync(indexPath)) {
      const stats = readFileSync(indexPath, 'utf8');
      const size = Buffer.byteLength(stats, 'utf8');
      this.log(`主页大小: ${Math.round(size / 1024)} KB`);
      
      if (size < 1000) {
        this.log('主页文件过小，可能构建有问题', 'warning');
      } else {
        this.log('主页大小正常', 'success');
      }
    }

    // 检查是否包含事件数据
    const indexContent = readFileSync(indexPath, 'utf8');
    if (indexContent.includes('events') || indexContent.includes('活动')) {
      this.log('页面包含事件相关内容', 'success');
    } else {
      this.log('页面可能缺少事件内容', 'warning');
    }

    return true;
  }

  // 步骤 7: 生成部署报告
  async generateDeploymentReport() {
    this.log('=== 步骤 7: 生成部署报告 ===', 'step');

    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      steps: this.steps,
      files: {
        rawEvents: existsSync(join(rootDir, 'data/events/events.json')),
        processedEvents: existsSync(join(rootDir, 'src/data/events/processed-events.json')),
        cityMappings: existsSync(join(rootDir, 'src/data/events/city-mappings.json')),
        eventStats: existsSync(join(rootDir, 'src/data/events/event-stats.json')),
        buildOutput: existsSync(join(rootDir, 'dist/index.html'))
      },
      statistics: {}
    };

    // 收集统计信息
    try {
      const processedEvents = JSON.parse(readFileSync(join(rootDir, 'src/data/events/processed-events.json'), 'utf8'));
      const eventStats = JSON.parse(readFileSync(join(rootDir, 'src/data/events/event-stats.json'), 'utf8'));
      
      report.statistics = {
        totalEvents: Array.isArray(processedEvents) ? processedEvents.length : 0,
        upcomingEvents: eventStats.upcomingEvents || 0,
        pastEvents: eventStats.pastEvents || 0,
        totalViews: eventStats.engagementMetrics?.totalViews || 0,
        totalFavorites: eventStats.engagementMetrics?.totalFavorites || 0
      };
    } catch (error) {
      this.log(`收集统计信息失败: ${error.message}`, 'warning');
    }

    // 保存报告
    const reportPath = join(rootDir, 'deployment-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    this.log(`部署报告已保存到 ${reportPath}`, 'success');

    return report;
  }

  // 主流程
  async run() {
    this.log('🚀 开始模拟 GitHub Action 更新流程', 'step');
    this.log(`工作目录: ${rootDir}`);

    try {
      // 执行所有步骤
      await this.setupEnvironment();
      await this.clearPreviousData();
      const scrapeSuccess = await this.scrapeEventData();
      const processSuccess = await this.processEventData();
      const buildSuccess = await this.buildProject();
      await this.validateBuild();
      const report = await this.generateDeploymentReport();

      // 生成总结
      const duration = Math.round((Date.now() - this.startTime) / 1000);
      
      console.log('\n' + '='.repeat(60));
      this.log('🎉 GitHub Action 模拟流程完成！', 'success');
      console.log('='.repeat(60));
      
      console.log(`⏱️  总耗时: ${duration} 秒`);
      console.log(`📊 处理事件: ${report.statistics.totalEvents || 0} 个`);
      console.log(`🔄 数据抓取: ${scrapeSuccess ? '✅ 成功' : '❌ 失败'}`);
      console.log(`⚙️  数据处理: ${processSuccess ? '✅ 成功' : '❌ 失败'}`);
      console.log(`🔨 项目构建: ${buildSuccess ? '✅ 成功' : '❌ 失败'}`);
      
      if (report.statistics.totalEvents > 0) {
        console.log(`📈 即将开始: ${report.statistics.upcomingEvents || 0} 个活动`);
        console.log(`📅 已结束: ${report.statistics.pastEvents || 0} 个活动`);
      }

      console.log('\n📁 生成的文件:');
      Object.entries(report.files).forEach(([key, exists]) => {
        console.log(`   ${exists ? '✅' : '❌'} ${key}`);
      });

      console.log('\n🔗 下一步:');
      if (buildSuccess) {
        console.log('   ✅ 可以部署到 GitHub Pages');
        console.log('   📦 构建产物位于 ./dist/ 目录');
      } else {
        console.log('   ❌ 需要修复构建问题');
      }

      return report;

    } catch (error) {
      this.log(`💥 流程执行失败: ${error.message}`, 'error');
      console.log('\n🔧 故障排除建议:');
      console.log('   • 检查网络连接');
      console.log('   • 确保所有依赖已正确安装');
      console.log('   • 查看详细错误日志');
      console.log('   • 尝试单独运行失败的步骤');
      
      throw error;
    }
  }
}

// CLI 接口
async function main() {
  const simulator = new GitHubActionSimulator();
  
  try {
    await simulator.run();
    process.exit(0);
  } catch (error) {
    console.error('\n💥 模拟流程失败');
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (process.argv[1] && process.argv[1].includes('simulate-github-action.js')) {
  main();
}

export { GitHubActionSimulator };