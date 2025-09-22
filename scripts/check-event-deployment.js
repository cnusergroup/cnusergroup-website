#!/usr/bin/env node

/**
 * Event Deployment Status Checker
 * 检查事件系统在部署中的状态和健康度
 */

import { existsSync, readFileSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('📅 事件系统部署状态检查');
console.log('================================\n');

let totalChecks = 0;
let passedChecks = 0;
const issues = [];
const warnings = [];

function logCheck(description, passed, isWarning = false) {
  totalChecks++;
  if (passed) {
    passedChecks++;
    console.log(`✅ ${description}`);
  } else {
    if (isWarning) {
      warnings.push(description);
      console.log(`⚠️  ${description}`);
    } else {
      issues.push(description);
      console.log(`❌ ${description}`);
    }
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString) {
  try {
    return new Date(dateString).toLocaleString('zh-CN');
  } catch {
    return '无效日期';
  }
}

// 1. 检查事件数据文件
function checkEventDataFiles() {
  console.log('📊 检查事件数据文件...');
  
  const eventFiles = [
    {
      path: 'src/data/events/processed-events.json',
      name: '处理后事件数据',
      required: true
    },
    {
      path: 'src/data/events/city-mappings.json',
      name: '城市映射数据',
      required: true
    },
    {
      path: 'src/data/events/event-stats.json',
      name: '事件统计数据',
      required: false
    },
    {
      path: 'data/events/events.json',
      name: '原始事件数据',
      required: false
    },
    {
      path: 'data/events/quality-report.json',
      name: '数据质量报告',
      required: false
    }
  ];
  
  eventFiles.forEach(file => {
    const filePath = join(rootDir, file.path);
    const exists = existsSync(filePath);
    
    if (exists) {
      try {
        const content = readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        const stat = statSync(filePath);
        
        logCheck(`${file.name} - 存在且格式正确 (${formatFileSize(stat.size)})`, true);
        
        // 额外的数据质量检查
        if (file.path.includes('processed-events.json')) {
          const eventCount = Array.isArray(data) ? data.length : 0;
          console.log(`   📈 事件数量: ${eventCount}`);
          
          if (eventCount === 0) {
            logCheck(`${file.name} - 事件数量为空`, false, true);
          } else {
            // 检查事件数据完整性
            const validEvents = data.filter(event => 
              event.id && event.title && event.location && event.time
            );
            const validityRate = Math.round((validEvents.length / eventCount) * 100);
            console.log(`   🔍 数据完整性: ${validityRate}%`);
            
            if (validityRate < 90) {
              logCheck(`${file.name} - 数据完整性较低 (${validityRate}%)`, false, true);
            }
            
            // 检查城市映射覆盖率
            const mappedEvents = data.filter(event => 
              event.cityMappings && event.cityMappings.length > 0
            );
            const mappingRate = Math.round((mappedEvents.length / eventCount) * 100);
            console.log(`   🗺️  城市映射覆盖率: ${mappingRate}%`);
            
            if (mappingRate < 70) {
              logCheck(`${file.name} - 城市映射覆盖率较低 (${mappingRate}%)`, false, true);
            }
          }
        }
        
        if (file.path.includes('city-mappings.json')) {
          const cityCount = Object.keys(data).length;
          console.log(`   🏙️  映射城市数量: ${cityCount}`);
          
          if (cityCount === 0) {
            logCheck(`${file.name} - 城市映射为空`, false, true);
          }
        }
        
        if (file.path.includes('event-stats.json')) {
          console.log(`   📊 统计数据更新时间: ${formatDate(data.lastUpdated)}`);
          
          // 检查统计数据是否过期（超过24小时）
          const lastUpdated = new Date(data.lastUpdated);
          const now = new Date();
          const hoursSinceUpdate = (now - lastUpdated) / (1000 * 60 * 60);
          
          if (hoursSinceUpdate > 24) {
            logCheck(`${file.name} - 数据可能过期 (${Math.round(hoursSinceUpdate)}小时前)`, false, true);
          }
        }
        
      } catch (parseError) {
        logCheck(`${file.name} - JSON格式错误`, false);
      }
    } else {
      logCheck(`${file.name} - 文件不存在`, !file.required, file.required);
    }
  });
  
  console.log('');
}

// 2. 检查事件页面文件
function checkEventPageFiles() {
  console.log('📄 检查事件页面文件...');
  
  const pageFiles = [
    {
      path: 'src/pages/events.astro',
      name: '事件列表页面 (中文)'
    },
    {
      path: 'src/pages/en/events.astro',
      name: '事件列表页面 (英文)'
    },
    {
      path: 'src/pages/events/[slug].astro',
      name: '事件详情页面模板'
    },
    {
      path: 'src/components/sections/EventsList.astro',
      name: '事件列表组件'
    },
    {
      path: 'src/components/ui/EventCard.astro',
      name: '事件卡片组件'
    },
    {
      path: 'src/components/sections/CityEvents.astro',
      name: '城市事件组件'
    },
    {
      path: 'src/components/sections/EventsStats.astro',
      name: '事件统计组件'
    }
  ];
  
  pageFiles.forEach(file => {
    const filePath = join(rootDir, file.path);
    const exists = existsSync(filePath);
    
    if (exists) {
      const stat = statSync(filePath);
      logCheck(`${file.name} - 存在 (${formatFileSize(stat.size)})`, true);
    } else {
      logCheck(`${file.name} - 文件不存在`, false);
    }
  });
  
  console.log('');
}

// 3. 检查事件工具文件
function checkEventUtilityFiles() {
  console.log('🔧 检查事件工具文件...');
  
  const utilityFiles = [
    {
      path: 'src/utils/eventProcessing.ts',
      name: '事件处理工具'
    },
    {
      path: 'src/utils/cityMapping.ts',
      name: '城市映射工具'
    },
    {
      path: 'src/utils/eventSEO.ts',
      name: '事件SEO工具'
    },
    {
      path: 'src/utils/eventImageOptimization.ts',
      name: '事件图片优化工具'
    },
    {
      path: 'src/utils/eventCaching.ts',
      name: '事件缓存工具'
    },
    {
      path: 'src/utils/eventPerformance.ts',
      name: '事件性能监控工具'
    },
    {
      path: 'src/components/ui/OptimizedEventImage.astro',
      name: '优化事件图片组件'
    }
  ];
  
  utilityFiles.forEach(file => {
    const filePath = join(rootDir, file.path);
    const exists = existsSync(filePath);
    
    if (exists) {
      const stat = statSync(filePath);
      logCheck(`${file.name} - 存在 (${formatFileSize(stat.size)})`, true);
    } else {
      logCheck(`${file.name} - 文件不存在`, false);
    }
  });
  
  console.log('');
}

// 4. 检查事件处理脚本
function checkEventScripts() {
  console.log('📜 检查事件处理脚本...');
  
  const scriptFiles = [
    {
      path: 'scripts/process-events.js',
      name: '事件处理主脚本'
    },
    {
      path: 'scripts/improved-pagination-scraper.cjs',
      name: '事件爬取脚本'
    },
    {
      path: 'scripts/events-workflow.cjs',
      name: '事件工作流脚本'
    },
    {
      path: 'scripts/utils/eventProcessing.js',
      name: '事件处理工具脚本'
    },
    {
      path: 'scripts/utils/cityMapping.js',
      name: '城市映射工具脚本'
    }
  ];
  
  scriptFiles.forEach(file => {
    const filePath = join(rootDir, file.path);
    const exists = existsSync(filePath);
    
    if (exists) {
      const stat = statSync(filePath);
      logCheck(`${file.name} - 存在 (${formatFileSize(stat.size)})`, true);
    } else {
      logCheck(`${file.name} - 文件不存在`, false);
    }
  });
  
  console.log('');
}

// 5. 检查构建输出中的事件文件
function checkBuildOutput() {
  console.log('🏗️  检查构建输出中的事件文件...');
  
  const distPath = join(rootDir, 'dist');
  if (!existsSync(distPath)) {
    logCheck('构建输出目录不存在', false);
    console.log('');
    return;
  }
  
  const buildFiles = [
    {
      path: 'dist/events/index.html',
      name: '事件列表页面'
    },
    {
      path: 'dist/en/events/index.html',
      name: '事件列表页面 (英文)'
    }
  ];
  
  buildFiles.forEach(file => {
    const filePath = join(rootDir, file.path);
    const exists = existsSync(filePath);
    
    if (exists) {
      const stat = statSync(filePath);
      logCheck(`${file.name} - 已构建 (${formatFileSize(stat.size)})`, true);
      
      // 检查HTML内容
      try {
        const content = readFileSync(filePath, 'utf8');
        const hasEventContent = content.includes('event') || content.includes('活动');
        const hasStructuredData = content.includes('application/ld+json');
        
        if (hasEventContent) {
          console.log(`   📝 包含事件内容: ✅`);
        } else {
          logCheck(`${file.name} - 缺少事件内容`, false, true);
        }
        
        if (hasStructuredData) {
          console.log(`   🔍 包含结构化数据: ✅`);
        } else {
          logCheck(`${file.name} - 缺少结构化数据`, false, true);
        }
        
      } catch (readError) {
        logCheck(`${file.name} - 无法读取内容`, false, true);
      }
    } else {
      logCheck(`${file.name} - 未构建`, false, true);
    }
  });
  
  console.log('');
}

// 6. 生成部署状态报告
function generateDeploymentStatusReport() {
  console.log('📋 生成事件系统部署状态报告...');
  
  const successRate = Math.round((passedChecks / totalChecks) * 100);
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalChecks,
      passedChecks,
      failedChecks: totalChecks - passedChecks,
      successRate: `${successRate}%`,
      status: successRate >= 90 ? 'healthy' : successRate >= 70 ? 'warning' : 'critical'
    },
    issues: issues,
    warnings: warnings,
    recommendations: []
  };
  
  // 生成建议
  if (issues.length > 0) {
    report.recommendations.push('修复所有标记为错误的问题');
    report.recommendations.push('运行 npm run events:process 重新处理事件数据');
  }
  
  if (warnings.length > 0) {
    report.recommendations.push('检查并解决所有警告项');
    report.recommendations.push('考虑运行 npm run events:workflow 更新事件数据');
  }
  
  if (successRate < 100) {
    report.recommendations.push('运行 npm run deploy:ready --force-events 强制重新处理');
  }
  
  console.log(`✅ 报告生成完成`);
  console.log('');
  
  return report;
}

// 主函数
function main() {
  try {
    checkEventDataFiles();
    checkEventPageFiles();
    checkEventUtilityFiles();
    checkEventScripts();
    checkBuildOutput();
    
    const report = generateDeploymentStatusReport();
    
    // 显示总结
    console.log('🎯 事件系统部署状态总结');
    console.log('============================');
    console.log(`📊 检查通过率: ${report.summary.successRate}`);
    console.log(`✅ 通过检查: ${passedChecks}/${totalChecks}`);
    console.log(`❌ 失败检查: ${issues.length}`);
    console.log(`⚠️  警告项目: ${warnings.length}`);
    console.log(`🏥 系统状态: ${report.summary.status.toUpperCase()}`);
    
    if (issues.length > 0) {
      console.log('\n❌ 需要修复的问题:');
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }
    
    if (warnings.length > 0) {
      console.log('\n⚠️  警告项目:');
      warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
    }
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 建议操作:');
      report.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }
    
    // 根据状态设置退出码
    if (report.summary.status === 'critical') {
      console.log('\n🚨 事件系统状态严重，建议修复后再部署');
      process.exit(1);
    } else if (report.summary.status === 'warning') {
      console.log('\n⚠️  事件系统有警告，建议检查后部署');
      process.exit(0);
    } else {
      console.log('\n✅ 事件系统状态良好，可以安全部署');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('\n💥 检查过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 运行检查
main();