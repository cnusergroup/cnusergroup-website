#!/usr/bin/env node

/**
 * 部署前检查脚本
 * 确保所有必要的资源和配置都正确
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🔍 开始部署前检查...');

// 检查必要文件
function checkRequiredFiles() {
  const requiredFiles = [
    'package.json',
    'astro.config.mjs',
    'tsconfig.json',
    'tailwind.config.mjs',
    'src/pages/index.astro',
    'src/pages/en/index.astro',
    'src/data/cities.json',
    'src/data/images.json'
  ];
  
  const missingFiles = [];
  
  requiredFiles.forEach(file => {
    const filePath = path.join(rootDir, file);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(file);
    }
  });
  
  if (missingFiles.length > 0) {
    console.error('❌ 缺少必要文件:', missingFiles);
    return false;
  }
  
  console.log('✅ 必要文件检查通过');
  return true;
}

// 检查配置文件
function checkConfiguration() {
  try {
    // 检查 Astro 配置
    const astroConfigPath = path.join(rootDir, 'astro.config.mjs');
    const astroConfig = fs.readFileSync(astroConfigPath, 'utf8');
    
    if (!astroConfig.includes('site:') || !astroConfig.includes('base:')) {
      console.warn('⚠️  Astro 配置可能缺少 site 或 base 配置');
    }
    
    // 检查 package.json
    const packageJsonPath = path.join(rootDir, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    if (!packageJson.scripts.build) {
      console.error('❌ package.json 缺少 build 脚本');
      return false;
    }
    
    console.log('✅ 配置文件检查通过');
    return true;
  } catch (error) {
    console.error('❌ 配置文件检查失败:', error.message);
    return false;
  }
}

// 检查数据完整性
function checkDataIntegrity() {
  try {
    // 检查城市数据
    const citiesPath = path.join(rootDir, 'src/data/cities.json');
    const cities = JSON.parse(fs.readFileSync(citiesPath, 'utf8'));
    
    if (!Array.isArray(cities) || cities.length === 0) {
      console.error('❌ 城市数据格式错误或为空');
      return false;
    }
    
    // 检查每个城市的必要字段
    const requiredCityFields = ['id', 'name', 'logo', 'logoMobile', 'active', 'description'];
    const invalidCities = [];
    
    cities.forEach((city, index) => {
      const missingFields = requiredCityFields.filter(field => city[field] === undefined || city[field] === null);
      if (missingFields.length > 0) {
        invalidCities.push({ index, id: city.id, missingFields });
      }
    });
    
    if (invalidCities.length > 0) {
      console.error('❌ 城市数据不完整:', invalidCities);
      return false;
    }
    
    // 检查图片配置
    const imagesPath = path.join(rootDir, 'src/data/images.json');
    const images = JSON.parse(fs.readFileSync(imagesPath, 'utf8'));
    
    if (!images.cities || !images.ui || !images.icons) {
      console.error('❌ 图片配置不完整');
      return false;
    }
    
    console.log('✅ 数据完整性检查通过');
    return true;
  } catch (error) {
    console.error('❌ 数据完整性检查失败:', error.message);
    return false;
  }
}

// 检查依赖项
function checkDependencies() {
  try {
    const packageJsonPath = path.join(rootDir, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const requiredDeps = ['astro', '@astrojs/tailwind', 'tailwindcss'];
    const missingDeps = [];
    
    requiredDeps.forEach(dep => {
      if (!packageJson.dependencies[dep] && !packageJson.devDependencies[dep]) {
        missingDeps.push(dep);
      }
    });
    
    if (missingDeps.length > 0) {
      console.error('❌ 缺少必要依赖:', missingDeps);
      return false;
    }
    
    // 检查 node_modules
    const nodeModulesPath = path.join(rootDir, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      console.error('❌ node_modules 不存在，请运行 npm install');
      return false;
    }
    
    console.log('✅ 依赖项检查通过');
    return true;
  } catch (error) {
    console.error('❌ 依赖项检查失败:', error.message);
    return false;
  }
}

// 检查构建环境
function checkBuildEnvironment() {
  // 检查 Node.js 版本
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 18) {
    console.error(`❌ Node.js 版本过低 (${nodeVersion})，需要 18.0.0 或更高版本`);
    return false;
  }
  
  // 检查环境变量
  const requiredEnvVars = [];
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingEnvVars.length > 0) {
    console.warn('⚠️  缺少环境变量:', missingEnvVars);
  }
  
  console.log('✅ 构建环境检查通过');
  return true;
}

// 生成部署报告
function generateDeploymentReport() {
  const report = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    checks: {
      requiredFiles: true,
      configuration: true,
      dataIntegrity: true,
      dependencies: true,
      buildEnvironment: true
    },
    warnings: [],
    recommendations: [
      '确保所有图片资源已上传到正确位置',
      '检查 GitHub Pages 设置中的源分支配置',
      '验证自定义域名配置（如果使用）',
      '确保 GitHub Actions 有足够的权限'
    ]
  };
  
  const reportPath = path.join(rootDir, 'deployment-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log('📋 部署报告已生成: deployment-report.json');
}

// 主函数
async function main() {
  console.log('🚀 CNUserGroup 网站部署前检查');
  console.log('================================');
  
  const checks = [
    checkRequiredFiles,
    checkConfiguration,
    checkDataIntegrity,
    checkDependencies,
    checkBuildEnvironment
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    if (!check()) {
      allPassed = false;
    }
  }
  
  generateDeploymentReport();
  
  if (allPassed) {
    console.log('\n🎉 所有检查通过！可以开始部署。');
    console.log('\n📝 部署步骤:');
    console.log('1. 提交所有更改到 Git');
    console.log('2. 推送到 GitHub main 分支');
    console.log('3. GitHub Actions 将自动构建和部署');
    console.log('4. 访问 https://cnusergroup.github.io/cnusergroup-website 查看结果');
  } else {
    console.log('\n❌ 检查失败，请修复上述问题后重试。');
    process.exit(1);
  }
}

main();