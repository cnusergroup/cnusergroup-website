#!/usr/bin/env node

/**
 * 综合部署准备脚本
 * 执行完整的部署前检查、清理和准备工作
 */

import { execSync } from 'child_process';
import { existsSync, rmSync, writeFileSync, readFileSync, statSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🚀 CNUserGroup 网站部署准备');
console.log('================================\n');

let checksPassed = 0;
let totalChecks = 0;
const warnings = [];
const errors = [];

// 辅助函数
function logCheck(message, passed, isWarning = false) {
  totalChecks++;
  if (passed) {
    checksPassed++;
    console.log(`✅ ${message}`);
  } else {
    if (isWarning) {
      warnings.push(message);
      console.log(`⚠️  ${message}`);
    } else {
      errors.push(message);
      console.log(`❌ ${message}`);
    }
  }
}

// 1. 环境检查
function checkEnvironment() {
  console.log('🔧 检查环境...');
  
  // Node.js 版本检查
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  logCheck(`Node.js 版本 ${nodeVersion} (需要 ≥18)`, majorVersion >= 18);
  
  // npm 检查
  try {
    execSync('npm --version', { stdio: 'pipe' });
    logCheck('npm 可用', true);
  } catch {
    logCheck('npm 不可用', false);
  }
  
  console.log('');
}

// 2. 项目文件检查
function checkProjectFiles() {
  console.log('📁 检查项目文件...');
  
  const requiredFiles = [
    'package.json',
    'astro.config.mjs',
    'tailwind.config.mjs',
    'src/pages/index.astro',
    'src/pages/cities.astro',
    'src/pages/about.astro',
    'src/pages/en/index.astro',
    'src/pages/en/cities.astro',
    'src/pages/en/about.astro'
  ];
  
  requiredFiles.forEach(file => {
    const exists = existsSync(join(rootDir, file));
    logCheck(`${file}`, exists);
  });
  
  console.log('');
}

// 3. 数据文件检查
function checkDataFiles() {
  console.log('📊 检查数据文件...');
  
  const dataFiles = [
    'src/data/cities.json',
    'src/data/translations/zh.json',
    'src/data/translations/en.json',
    'src/data/images.json',
    'src/data/social.json'
  ];
  
  dataFiles.forEach(file => {
    const filePath = join(rootDir, file);
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, 'utf8');
        JSON.parse(content);
        logCheck(`${file} - JSON 格式正确`, true);
      } catch {
        logCheck(`${file} - JSON 格式错误`, false);
      }
    } else {
      logCheck(`${file} - 文件不存在`, false);
    }
  });
  
  console.log('');
}

// 4. 图片资源检查
function checkImageResources() {
  console.log('🖼️ 检查图片资源...');
  
  const imageDirectories = [
    'public/images/cities',
    'public/images/ui',
    'public/images/icons',
    'public/images/qr'
  ];
  
  imageDirectories.forEach(dir => {
    const dirPath = join(rootDir, dir);
    if (existsSync(dirPath)) {
      const stat = statSync(dirPath);
      if (stat.isDirectory()) {
        const files = readdirSync(dirPath);
        const imageFiles = files.filter(f => /\.(jpg|jpeg|png|webp|avif|svg)$/i.test(f));
        logCheck(`${dir} - ${imageFiles.length} 个图片文件`, imageFiles.length > 0, imageFiles.length === 0);
      } else {
        logCheck(`${dir} - 不是目录`, false);
      }
    } else {
      logCheck(`${dir} - 目录不存在`, false);
    }
  });
  
  console.log('');
}

// 5. 依赖检查
function checkDependencies() {
  console.log('📦 检查依赖...');
  
  // 检查 node_modules
  const nodeModulesExists = existsSync(join(rootDir, 'node_modules'));
  logCheck('node_modules 目录存在', nodeModulesExists);
  
  if (nodeModulesExists) {
    // 检查关键依赖
    const criticalDeps = ['astro', '@astrojs/tailwind', 'tailwindcss'];
    criticalDeps.forEach(dep => {
      const depPath = join(rootDir, 'node_modules', dep);
      logCheck(`${dep} 已安装`, existsSync(depPath));
    });
  }
  
  console.log('');
}

// 6. 配置文件检查
function checkConfiguration() {
  console.log('⚙️ 检查配置文件...');
  
  // 检查 Astro 配置
  try {
    const astroConfigPath = join(rootDir, 'astro.config.mjs');
    const astroConfig = readFileSync(astroConfigPath, 'utf8');
    
    logCheck('astro.config.mjs 包含 site 配置', astroConfig.includes('site:'));
    logCheck('astro.config.mjs 包含 base 配置', astroConfig.includes('base:'));
    logCheck('astro.config.mjs 包含 tailwind 集成', astroConfig.includes('@astrojs/tailwind'));
  } catch {
    logCheck('astro.config.mjs 读取失败', false);
  }
  
  // 检查 package.json 脚本
  try {
    const packageJsonPath = join(rootDir, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    
    logCheck('package.json 包含 build 脚本', !!packageJson.scripts?.build);
    logCheck('package.json 包含 dev 脚本', !!packageJson.scripts?.dev);
    logCheck('package.json 包含 preview 脚本', !!packageJson.scripts?.preview);
  } catch {
    logCheck('package.json 读取失败', false);
  }
  
  console.log('');
}

// 7. 清理旧文件
function cleanupOldFiles() {
  console.log('🧹 清理旧文件...');
  
  const filesToClean = [
    'dist',
    '.astro',
    'deployment-report.json'
  ];
  
  filesToClean.forEach(file => {
    const filePath = join(rootDir, file);
    if (existsSync(filePath)) {
      try {
        rmSync(filePath, { recursive: true, force: true });
        console.log(`🗑️  已删除: ${file}`);
      } catch (error) {
        console.log(`⚠️  无法删除 ${file}: ${error.message}`);
      }
    }
  });
  
  console.log('');
}

// 8. 处理事件数据
function processEvents() {
  console.log('📅 处理事件数据...');
  
  // 检查是否跳过事件处理
  if (process.argv.includes('--skip-events')) {
    console.log('⏭️  跳过事件数据处理（已在CI中完成）');
    return true;
  }
  
  try {
    // 检查是否需要强制处理
    const forceProcess = process.argv.includes('--force-events') || 
                        process.env.FORCE_EVENT_PROCESSING === 'true';
    
    const command = forceProcess ? 
      'node scripts/process-events.js --force' : 
      'node scripts/process-events.js';
    
    console.log('正在运行事件处理流程...');
    execSync(command, { stdio: 'inherit', cwd: rootDir });
    console.log('✅ 事件数据处理完成');
    
    // 验证处理结果
    const processedEventsPath = join(rootDir, 'src/data/events/processed-events.json');
    const cityMappingsPath = join(rootDir, 'src/data/events/city-mappings.json');
    const eventStatsPath = join(rootDir, 'src/data/events/event-stats.json');
    
    let validationPassed = true;
    const validationResults = [];
    
    // 检查必需文件
    if (existsSync(processedEventsPath)) {
      try {
        const events = JSON.parse(readFileSync(processedEventsPath, 'utf8'));
        validationResults.push(`✅ 处理事件数据: ${events.length} 个事件`);
        
        // 检查事件数据质量
        const eventsWithCities = events.filter(e => e.cityMappings && e.cityMappings.length > 0);
        const mappingRate = Math.round((eventsWithCities.length / events.length) * 100);
        validationResults.push(`📍 城市映射率: ${mappingRate}%`);
        
        if (mappingRate < 50) {
          console.log('⚠️  城市映射率较低，可能影响城市页面显示');
        }
      } catch (parseError) {
        validationResults.push('❌ 处理事件数据格式错误');
        validationPassed = false;
      }
    } else {
      validationResults.push('❌ 处理事件数据文件不存在');
      validationPassed = false;
    }
    
    if (existsSync(cityMappingsPath)) {
      try {
        const mappings = JSON.parse(readFileSync(cityMappingsPath, 'utf8'));
        const cityCount = Object.keys(mappings).length;
        validationResults.push(`✅ 城市映射数据: ${cityCount} 个城市`);
      } catch (parseError) {
        validationResults.push('❌ 城市映射数据格式错误');
        validationPassed = false;
      }
    } else {
      validationResults.push('❌ 城市映射数据文件不存在');
      validationPassed = false;
    }
    
    if (existsSync(eventStatsPath)) {
      try {
        const stats = JSON.parse(readFileSync(eventStatsPath, 'utf8'));
        validationResults.push(`📊 事件统计数据: ${stats.totalEvents} 个事件`);
      } catch (parseError) {
        validationResults.push('⚠️  事件统计数据格式错误');
      }
    } else {
      validationResults.push('⚠️  事件统计数据文件不存在');
    }
    
    // 显示验证结果
    console.log('\n📋 事件数据验证结果:');
    validationResults.forEach(result => console.log(`   ${result}`));
    
    if (validationPassed) {
      console.log('✅ 事件数据验证通过');
    } else {
      console.log('⚠️  事件数据验证有问题，但继续构建');
    }
    
    return true; // 总是返回 true，不阻止构建
    
  } catch (error) {
    console.log('⚠️  事件处理失败，尝试使用现有数据:', error.message);
    
    // 尝试验证现有数据
    const processedEventsPath = join(rootDir, 'src/data/events/processed-events.json');
    if (existsSync(processedEventsPath)) {
      console.log('✅ 发现现有事件数据，将使用现有数据继续构建');
    } else {
      console.log('⚠️  未找到任何事件数据，将创建空数据文件');
      
      // 创建空的事件数据文件以防止构建失败
      try {
        const emptyEvents = [];
        const emptyMappings = {};
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
          lastUpdated: new Date().toISOString()
        };
        
        // 确保目录存在
        const eventsDir = join(rootDir, 'src/data/events');
        if (!existsSync(eventsDir)) {
          execSync(`mkdir -p "${eventsDir}"`, { cwd: rootDir });
        }
        
        writeFileSync(join(rootDir, 'src/data/events/processed-events.json'), JSON.stringify(emptyEvents, null, 2));
        writeFileSync(join(rootDir, 'src/data/events/city-mappings.json'), JSON.stringify(emptyMappings, null, 2));
        writeFileSync(join(rootDir, 'src/data/events/event-stats.json'), JSON.stringify(emptyStats, null, 2));
        
        console.log('✅ 创建空事件数据文件成功');
      } catch (createError) {
        console.log('❌ 创建空事件数据文件失败:', createError.message);
      }
    }
    
    return true; // 不阻止构建
  }
}

// 9. 安装依赖
function installDependencies() {
  console.log('📥 安装/更新依赖...');

  // CI 环境已在工作流中安装过依赖，重复安装会在 NODE_ENV=production 下
  // 移除 devDependencies（typescript、@types/*），导致 astro check 失败
  if (process.env.CI === 'true' && existsSync(join(rootDir, 'node_modules'))) {
    console.log('✅ 检测到 CI 环境且依赖已存在，跳过重复安装');
    console.log('');
    return true;
  }

  // --include=dev 确保 NODE_ENV=production 时仍安装构建期需要的 devDependencies
  try {
    console.log('正在运行 npm ci --include=dev...');
    execSync('npm ci --include=dev', { stdio: 'inherit', cwd: rootDir });
    console.log('✅ 依赖安装完成');
  } catch {
    try {
      console.log('npm ci 失败，尝试 npm install --include=dev...');
      execSync('npm install --include=dev', { stdio: 'inherit', cwd: rootDir });
      console.log('✅ 依赖安装完成');
    } catch (error) {
      console.log('❌ 依赖安装失败:', error.message);
      return false;
    }
  }
  
  console.log('');
  return true;
}

// 10. 构建项目
function buildProject() {
  console.log('🔨 构建项目...');
  
  try {
    execSync('npm run build', { stdio: 'inherit', cwd: rootDir });
    console.log('✅ 项目构建完成');
    
    // 验证构建输出
    const distPath = join(rootDir, 'dist');
    const indexPath = join(distPath, 'index.html');
    
    if (existsSync(indexPath)) {
      console.log('✅ 构建输出验证通过');
      
      // 检查构建文件大小
      const stat = statSync(indexPath);
      console.log(`📊 index.html 大小: ${(stat.size / 1024).toFixed(2)} KB`);
      
      return true;
    } else {
      console.log('❌ 构建输出验证失败: 找不到 index.html');
      return false;
    }
  } catch (error) {
    console.log('❌ 项目构建失败:', error.message);
    return false;
  }
}

// 11. 创建部署文件
function createDeploymentFiles() {
  console.log('📝 创建部署文件...');
  
  const distPath = join(rootDir, 'dist');
  
  // 创建 .nojekyll 文件
  const nojekyllPath = join(distPath, '.nojekyll');
  if (!existsSync(nojekyllPath)) {
    writeFileSync(nojekyllPath, '');
    console.log('✅ 创建 .nojekyll 文件');
  }
  
  // 创建 CNAME 文件（如果有自定义域名）
  const customDomain = process.env.CUSTOM_DOMAIN;
  if (customDomain) {
    const cnamePath = join(distPath, 'CNAME');
    writeFileSync(cnamePath, customDomain);
    console.log(`✅ 创建 CNAME 文件: ${customDomain}`);
  }
  
  console.log('');
}

// 12. 生成部署报告
function generateReport() {
  console.log('📋 生成部署报告...');
  
  const report = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    },
    checks: {
      total: totalChecks,
      passed: checksPassed,
      failed: totalChecks - checksPassed,
      successRate: `${Math.round((checksPassed / totalChecks) * 100)}%`
    },
    warnings: warnings,
    errors: errors,
    buildInfo: {
      distExists: existsSync(join(rootDir, 'dist')),
      indexExists: existsSync(join(rootDir, 'dist', 'index.html'))
    },
    nextSteps: [
      'git add .',
      'git commit -m "Ready for deployment"',
      'git push origin main',
      '等待 GitHub Actions 自动部署'
    ]
  };
  
  const reportPath = join(rootDir, 'deployment-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`✅ 部署报告已保存: deployment-report.json`);
  console.log('');
  
  return report;
}

// 主函数
async function main() {
  const checkOnly = process.argv.includes('--check-only');
  
  try {
    // 执行所有检查
    checkEnvironment();
    checkProjectFiles();
    checkDataFiles();
    checkImageResources();
    checkDependencies();
    checkConfiguration();
    
    if (checkOnly) {
      console.log('🔍 仅执行检查模式');
      const report = generateReport();
      
      console.log('\n📊 检查结果总结');
      console.log('================');
      console.log(`✅ 通过检查: ${checksPassed}/${totalChecks}`);
      console.log(`⚠️  警告: ${warnings.length}`);
      console.log(`❌ 错误: ${errors.length}`);
      
      if (errors.length > 0) {
        console.log('\n❌ 发现错误，需要修复:');
        errors.forEach(error => console.log(`   • ${error}`));
        process.exit(1);
      }
      
      console.log('\n✅ 检查通过！可以执行完整部署准备。');
      console.log('运行 npm run deploy:ready 开始完整部署准备。');
      return;
    }
    
    // 执行完整的准备步骤
    cleanupOldFiles();
    
    const depsInstalled = installDependencies();
    if (!depsInstalled) {
      process.exit(1);
    }
    
    // 处理事件数据
    processEvents();
    
    const buildSuccess = buildProject();
    if (!buildSuccess) {
      process.exit(1);
    }
    
    createDeploymentFiles();
    const report = generateReport();
    
    // 显示最终结果
    console.log('🎯 部署准备总结');
    console.log('================');
    console.log(`✅ 通过检查: ${checksPassed}/${totalChecks}`);
    console.log(`⚠️  警告: ${warnings.length}`);
    console.log(`❌ 错误: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ 发现错误，需要修复:');
      errors.forEach(error => console.log(`   • ${error}`));
      process.exit(1);
    }
    
    if (warnings.length > 0) {
      console.log('\n⚠️  警告信息:');
      warnings.forEach(warning => console.log(`   • ${warning}`));
    }
    
    console.log('\n🎉 部署准备完成！');
    console.log('\n📋 下一步操作:');
    report.nextSteps.forEach((step, index) => {
      console.log(`${index + 1}. ${step}`);
    });
    
    console.log('\n🌐 部署后访问: https://yourusername.github.io/cnusergroup');
    
  } catch (error) {
    console.error('\n💥 部署准备过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 运行主函数
main();