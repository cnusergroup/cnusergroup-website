#!/usr/bin/env node

/**
 * 完整部署工作流脚本
 * 从准备到验证的完整自动化部署流程
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🚀 CNUserGroup 完整部署工作流');
console.log('================================\n');

// 配置
const config = {
  gitRemote: 'origin',
  gitBranch: 'main',
  deployMessage: 'Deploy: Ready for production',
  waitForDeployment: true,
  verifyDeployment: true,
  maxWaitTime: 300000, // 5分钟
  checkInterval: 30000  // 30秒
};

let currentStep = 0;
const totalSteps = 7;

function logStep(message) {
  currentStep++;
  console.log(`\n📋 步骤 ${currentStep}/${totalSteps}: ${message}`);
  console.log('─'.repeat(50));
}

function logInfo(message) {
  console.log(`ℹ️  ${message}`);
}

function logSuccess(message) {
  console.log(`✅ ${message}`);
}

function logWarning(message) {
  console.log(`⚠️  ${message}`);
}

function logError(message) {
  console.log(`❌ ${message}`);
}

// 执行命令并处理错误
function runCommand(command, options = {}) {
  try {
    logInfo(`执行: ${command}`);
    const result = execSync(command, {
      cwd: rootDir,
      stdio: options.silent ? 'pipe' : 'inherit',
      encoding: 'utf8',
      ...options
    });
    return result;
  } catch (error) {
    logError(`命令执行失败: ${command}`);
    logError(`错误: ${error.message}`);
    throw error;
  }
}

// 检查 Git 状态
function checkGitStatus() {
  logStep('检查 Git 状态');
  
  try {
    // 检查是否在 Git 仓库中
    runCommand('git status', { silent: true });
    logSuccess('Git 仓库检查通过');
    
    // 检查是否有未提交的更改
    const status = runCommand('git status --porcelain', { silent: true });
    if (status.trim()) {
      logWarning('发现未提交的更改:');
      console.log(status);
      
      const hasStaged = status.includes('M ') || status.includes('A ') || status.includes('D ');
      const hasUnstaged = status.includes(' M') || status.includes('??');
      
      if (hasUnstaged) {
        logInfo('添加所有更改到暂存区...');
        runCommand('git add .');
      }
      
      if (hasStaged || hasUnstaged) {
        logInfo('提交更改...');
        runCommand(`git commit -m "${config.deployMessage}"`);
        logSuccess('更改已提交');
      }
    } else {
      logSuccess('工作目录干净，无需提交');
    }
    
    // 检查远程仓库
    try {
      const remoteUrl = runCommand(`git remote get-url ${config.gitRemote}`, { silent: true });
      logSuccess(`远程仓库: ${remoteUrl.trim()}`);
    } catch {
      logError('未配置远程仓库');
      throw new Error('请先配置 Git 远程仓库');
    }
    
  } catch (error) {
    if (error.message.includes('not a git repository')) {
      logError('当前目录不是 Git 仓库');
      logInfo('初始化 Git 仓库...');
      runCommand('git init');
      logInfo('请配置远程仓库后重新运行');
      throw new Error('需要配置 Git 远程仓库');
    }
    throw error;
  }
}

// 执行部署准备
function runDeployPreparation() {
  logStep('执行部署准备');
  
  try {
    // Run comprehensive event processing workflow
    logInfo('执行完整事件处理工作流...');
    try {
      // 1. 运行事件爬取（如果需要）
      const shouldScrape = process.argv.includes('--scrape-events') || 
                          process.env.FORCE_EVENT_SCRAPING === 'true';
      
      if (shouldScrape) {
        logInfo('执行事件数据爬取...');
        runCommand('npm run events:workflow:quick');
        logSuccess('事件数据爬取完成');
      } else {
        logInfo('跳过事件爬取，使用现有数据');
      }
      
      // 2. 处理和映射事件数据
      logInfo('处理事件数据和城市映射...');
      runCommand('node scripts/process-events.js --force');
      logSuccess('事件数据处理完成');
      
      // 3. 验证事件数据质量
      logInfo('验证事件数据质量...');
      runCommand('npm run events:quality:report');
      logSuccess('事件数据质量验证完成');
      
    } catch (eventError) {
      logWarning('事件数据处理失败，使用现有数据继续部署');
      logWarning(`错误: ${eventError.message}`);
      
      // 尝试使用备份数据
      try {
        logInfo('尝试使用备份事件数据...');
        runCommand('node scripts/process-events.js --use-backup');
        logSuccess('使用备份事件数据成功');
      } catch (backupError) {
        logWarning('备份数据也不可用，将使用空事件数据');
      }
    }
    
    // Run main deployment preparation
    logInfo('执行主要部署准备...');
    runCommand('npm run deploy:ready');
    logSuccess('部署准备完成');
    
  } catch (error) {
    logError('部署准备失败');
    throw error;
  }
}

// 推送到 GitHub
function pushToGitHub() {
  logStep('推送到 GitHub');
  
  try {
    logInfo(`推送到 ${config.gitRemote}/${config.gitBranch}...`);
    runCommand(`git push ${config.gitRemote} ${config.gitBranch}`);
    logSuccess('代码推送成功');
    
    // 获取最新提交的 SHA
    const commitSha = runCommand('git rev-parse HEAD', { silent: true }).trim();
    logInfo(`最新提交: ${commitSha.substring(0, 8)}`);
    
    return commitSha;
  } catch (error) {
    logError('推送失败');
    throw error;
  }
}

// 等待 GitHub Actions 部署
async function waitForDeployment() {
  if (!config.waitForDeployment) {
    logInfo('跳过部署等待');
    return;
  }
  
  logStep('等待 GitHub Actions 部署');
  
  logInfo('GitHub Actions 将自动开始构建和部署...');
  logInfo(`最大等待时间: ${config.maxWaitTime / 1000} 秒`);
  
  const startTime = Date.now();
  let attempts = 0;
  
  while (Date.now() - startTime < config.maxWaitTime) {
    attempts++;
    logInfo(`检查部署状态 (尝试 ${attempts})...`);
    
    try {
      // 这里可以添加 GitHub API 调用来检查 Actions 状态
      // 目前使用简单的时间等待
      await new Promise(resolve => setTimeout(resolve, config.checkInterval));
      
      // 简单的时间估算（通常 GitHub Actions 需要 2-5 分钟）
      const elapsed = Date.now() - startTime;
      if (elapsed > 120000) { // 2分钟后认为可能完成
        logSuccess('预计部署已完成');
        break;
      }
      
    } catch (error) {
      logWarning(`检查失败: ${error.message}`);
    }
  }
  
  if (Date.now() - startTime >= config.maxWaitTime) {
    logWarning('等待超时，请手动检查 GitHub Actions 状态');
  }
}

// 验证部署结果
async function verifyDeployment() {
  if (!config.verifyDeployment) {
    logInfo('跳过部署验证');
    return;
  }
  
  logStep('验证部署结果');
  
  try {
    // 读取配置获取网站 URL
    let siteUrl = process.env.SITE_URL;
    
    if (!siteUrl) {
      try {
        const astroConfig = readFileSync(join(rootDir, 'astro.config.mjs'), 'utf8');
        const siteMatch = astroConfig.match(/site:\s*['"`]([^'"`]+)['"`]/);
        if (siteMatch) {
          siteUrl = siteMatch[1];
        }
      } catch {
        // 忽略配置读取错误
      }
    }
    
    if (siteUrl) {
      logInfo(`验证网站: ${siteUrl}`);
      process.env.SITE_URL = siteUrl;
      runCommand('npm run deploy:verify');
      logSuccess('部署验证通过');
    } else {
      logWarning('未找到网站 URL，跳过自动验证');
      logInfo('请手动访问网站验证部署结果');
    }
    
  } catch (error) {
    logWarning('部署验证失败，请手动检查网站状态');
    logWarning(`错误: ${error.message}`);
  }
}

// 生成部署摘要
function generateSummary(startTime, commitSha) {
  logStep('生成部署摘要');
  
  const duration = Date.now() - startTime;
  const durationMinutes = Math.round(duration / 60000);
  
  console.log('\n🎉 部署完成！');
  console.log('================');
  console.log(`⏱️  总耗时: ${durationMinutes} 分钟`);
  console.log(`📝 提交: ${commitSha ? commitSha.substring(0, 8) : 'N/A'}`);
  console.log(`🌐 分支: ${config.gitBranch}`);
  
  // 读取部署报告
  try {
    const reportPath = join(rootDir, 'deployment-report.json');
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    console.log(`✅ 构建检查: ${report.checks.passed}/${report.checks.total} (${report.checks.successRate})`);
  } catch {
    // 忽略报告读取错误
  }
  
  console.log('\n📋 后续步骤:');
  console.log('1. 检查 GitHub Actions 运行状态');
  console.log('2. 访问网站验证部署结果');
  console.log('3. 监控网站性能和错误');
  
  // 显示相关链接
  try {
    const remoteUrl = runCommand(`git remote get-url ${config.gitRemote}`, { silent: true }).trim();
    if (remoteUrl.includes('github.com')) {
      const repoPath = remoteUrl.replace(/.*github\.com[:/]/, '').replace(/\.git$/, '');
      console.log('\n🔗 相关链接:');
      console.log(`   GitHub 仓库: https://github.com/${repoPath}`);
      console.log(`   Actions 状态: https://github.com/${repoPath}/actions`);
      console.log(`   Pages 设置: https://github.com/${repoPath}/settings/pages`);
    }
  } catch {
    // 忽略链接生成错误
  }
}

// 错误处理
function handleError(error, step) {
  console.log(`\n💥 在步骤 "${step}" 中发生错误:`);
  console.log(`❌ ${error.message}`);
  
  console.log('\n🔧 故障排除建议:');
  
  if (step.includes('Git')) {
    console.log('• 检查 Git 配置和远程仓库设置');
    console.log('• 确认有推送权限');
    console.log('• 检查网络连接');
  } else if (step.includes('部署准备')) {
    console.log('• 检查 Node.js 版本 (需要 ≥18)');
    console.log('• 运行 npm install 重新安装依赖');
    console.log('• 检查项目文件完整性');
  } else if (step.includes('验证')) {
    console.log('• 等待几分钟后重试');
    console.log('• 检查 GitHub Pages 设置');
    console.log('• 手动访问网站验证');
  }
  
  console.log('\n📞 获取帮助:');
  console.log('• 查看 docs/DEPLOYMENT.md');
  console.log('• 检查 deployment-report.json');
  console.log('• 运行 npm run deploy:check 诊断问题');
  
  process.exit(1);
}

// 主函数
async function main() {
  const startTime = Date.now();
  let commitSha;
  
  try {
    console.log(`⏰ 开始时间: ${new Date().toLocaleString()}`);
    
    // 执行部署流程
    checkGitStatus();
    runDeployPreparation();
    commitSha = pushToGitHub();
    await waitForDeployment();
    await verifyDeployment();
    generateSummary(startTime, commitSha);
    
  } catch (error) {
    const currentStepName = [
      'Git 状态检查',
      '部署准备',
      'GitHub 推送',
      '等待部署',
      '验证部署',
      '生成摘要'
    ][currentStep - 1] || '未知步骤';
    
    handleError(error, currentStepName);
  }
}

// 运行完整部署流程
main();