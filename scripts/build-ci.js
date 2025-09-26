#!/usr/bin/env node

/**
 * CI 专用构建脚本
 * 简化的构建流程，适用于 GitHub Actions
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🔨 CI 构建流程开始');
console.log('==================\n');

// 辅助函数
function logStep(step, message) {
  console.log(`${step} ${message}`);
}

function runCommand(command, description) {
  try {
    logStep('🔄', `${description}...`);
    execSync(command, { stdio: 'inherit', cwd: rootDir });
    logStep('✅', `${description} 完成`);
    return true;
  } catch (error) {
    logStep('❌', `${description} 失败: ${error.message}`);
    return false;
  }
}

// 1. 验证环境
function validateEnvironment() {
  logStep('🔍', '验证构建环境...');
  
  // 检查必需文件
  const requiredFiles = [
    'package.json',
    'astro.config.mjs',
    'src/pages/index.astro'
  ];
  
  for (const file of requiredFiles) {
    if (!existsSync(join(rootDir, file))) {
      logStep('❌', `缺少必需文件: ${file}`);
      process.exit(1);
    }
  }
  
  // 检查数据文件
  const dataFiles = [
    'src/data/cities.json',
    'src/data/translations/zh.json',
    'src/data/translations/en.json'
  ];
  
  for (const file of dataFiles) {
    const filePath = join(rootDir, file);
    if (existsSync(filePath)) {
      try {
        JSON.parse(readFileSync(filePath, 'utf8'));
        logStep('✅', `${file} 格式正确`);
      } catch {
        logStep('❌', `${file} JSON 格式错误`);
        process.exit(1);
      }
    } else {
      logStep('⚠️', `${file} 不存在`);
    }
  }
  
  logStep('✅', '环境验证完成');
}

// 2. 验证事件数据
function validateEventData() {
  logStep('📅', '验证事件数据...');
  
  const eventFiles = [
    'src/data/events/processed-events.json',
    'src/data/events/city-mappings.json',
    'src/data/events/event-stats.json'
  ];
  
  let hasValidData = false;
  
  for (const file of eventFiles) {
    const filePath = join(rootDir, file);
    if (existsSync(filePath)) {
      try {
        const data = JSON.parse(readFileSync(filePath, 'utf8'));
        if (file.includes('processed-events.json')) {
          logStep('📊', `事件数量: ${Array.isArray(data) ? data.length : 0}`);
          hasValidData = Array.isArray(data) && data.length > 0;
        }
        logStep('✅', `${file} 格式正确`);
      } catch {
        logStep('❌', `${file} JSON 格式错误`);
      }
    } else {
      logStep('⚠️', `${file} 不存在`);
    }
  }
  
  if (!hasValidData) {
    logStep('⚠️', '没有有效的事件数据，网站仍可正常构建');
  }
}

// 3. 执行构建
function buildProject() {
  logStep('🔨', '开始 Astro 构建...');
  
  // 运行 Astro 检查
  if (!runCommand('npx astro check', 'TypeScript 类型检查')) {
    logStep('⚠️', '类型检查失败，但继续构建');
  }
  
  // 运行构建
  if (!runCommand('npx astro build', 'Astro 构建')) {
    logStep('❌', '构建失败');
    process.exit(1);
  }
  
  // 验证构建输出
  if (!existsSync(join(rootDir, 'dist/index.html'))) {
    logStep('❌', '构建输出验证失败');
    process.exit(1);
  }
  
  logStep('✅', '构建完成');
}

// 4. 创建部署文件
function createDeploymentFiles() {
  logStep('📝', '创建部署文件...');
  
  const distPath = join(rootDir, 'dist');
  
  // 创建 .nojekyll 文件
  try {
    execSync(`touch "${join(distPath, '.nojekyll')}"`, { cwd: rootDir });
    logStep('✅', '创建 .nojekyll 文件');
  } catch (error) {
    logStep('⚠️', `创建 .nojekyll 失败: ${error.message}`);
  }
  
  // 如果有自定义域名，创建 CNAME 文件
  const customDomain = process.env.CUSTOM_DOMAIN;
  if (customDomain) {
    try {
      execSync(`echo "${customDomain}" > "${join(distPath, 'CNAME')}"`, { cwd: rootDir });
      logStep('✅', `创建 CNAME: ${customDomain}`);
    } catch (error) {
      logStep('⚠️', `创建 CNAME 失败: ${error.message}`);
    }
  }
}

// 主函数
async function main() {
  try {
    validateEnvironment();
    validateEventData();
    buildProject();
    createDeploymentFiles();
    
    console.log('\n🎉 CI 构建完成！');
    console.log('📦 构建产物已准备就绪，可以部署到 GitHub Pages');
    
  } catch (error) {
    console.error('\n💥 构建过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 运行主函数
main();