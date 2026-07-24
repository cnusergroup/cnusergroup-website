#!/usr/bin/env node

/**
 * 构建优化脚本
 * 用于 GitHub Pages 部署前的额外优化
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

console.log('🚀 开始构建优化...');

// 1. 创建 .nojekyll 文件
function createNoJekyllFile() {
  const nojekyllPath = path.join(distDir, '.nojekyll');
  fs.writeFileSync(nojekyllPath, '');
  console.log('✅ 创建 .nojekyll 文件');
}

// 2. 生成 robots.txt
function generateRobotsTxt() {
  const robotsContent = `User-agent: *
Allow: /

# Sitemap
Sitemap: https://awscommunity.cn/sitemap.xml

# 禁止访问的路径
Disallow: /api/
Disallow: /_astro/
Disallow: /admin/
`;

  const robotsPath = path.join(distDir, 'robots.txt');
  fs.writeFileSync(robotsPath, robotsContent);
  console.log('✅ 生成 robots.txt');
}

// 3. 生成 sitemap.xml
function generateSitemap() {
  const baseUrl = 'https://awscommunity.cn';
  const currentDate = new Date().toISOString().split('T')[0];
  
  // 基础页面
  const pages = [
    { url: '', priority: '1.0', changefreq: 'weekly' },
    { url: '/en', priority: '1.0', changefreq: 'weekly' },
    { url: '/cities', priority: '0.9', changefreq: 'weekly' },
    { url: '/en/cities', priority: '0.9', changefreq: 'weekly' },
    { url: '/events', priority: '0.9', changefreq: 'daily' },
    { url: '/en/events', priority: '0.9', changefreq: 'daily' }
  ];

  // 城市页面：从 cities.json 读取，避免和实际生成的页面产生偏差
  const citiesPath = path.join(rootDir, 'src/data/cities.json');
  const cities = JSON.parse(fs.readFileSync(citiesPath, 'utf8')).map(city => city.id);
  
  cities.forEach(city => {
    pages.push({
      url: `/cities/${city}`,
      priority: '0.8',
      changefreq: 'monthly'
    });
    pages.push({
      url: `/en/cities/${city}`,
      priority: '0.8',
      changefreq: 'monthly'
    });
  });
  
  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  const sitemapPath = path.join(distDir, 'sitemap.xml');
  fs.writeFileSync(sitemapPath, sitemapContent);
  console.log('✅ 生成 sitemap.xml');
}

// 4. 优化 HTML 文件
function optimizeHtmlFiles() {
  const htmlFiles = [];
  
  function findHtmlFiles(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        findHtmlFiles(filePath);
      } else if (file.endsWith('.html')) {
        htmlFiles.push(filePath);
      }
    });
  }
  
  findHtmlFiles(distDir);
  
  htmlFiles.forEach(filePath => {
    let content = fs.readFileSync(filePath, 'utf8');

    // 注意：这里不做空白压缩。
    // 全局 /\s+/g -> ' ' 会把 inline <script> 的换行也压掉，
    // 使 `//` 行注释吞掉其后的整段代码（例如 EventCard 的 is:inline 脚本）。
    // HTML 空白对 gzip 后体积影响很小，不值得这个风险。

    // 添加安全头部
    if (content.includes('<head>')) {
      const securityHeaders = `
    <meta http-equiv="X-Content-Type-Options" content="nosniff">
    <meta http-equiv="X-Frame-Options" content="DENY">
    <meta http-equiv="X-XSS-Protection" content="1; mode=block">
    <meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin">`;
      
      content = content.replace('<head>', `<head>${securityHeaders}`);
    }
    
    fs.writeFileSync(filePath, content);
  });
  
  console.log(`✅ 优化了 ${htmlFiles.length} 个 HTML 文件`);
}

// 5. 生成构建信息
function generateBuildInfo() {
  const buildInfo = {
    buildTime: new Date().toISOString(),
    version: process.env.GITHUB_SHA || 'local',
    branch: process.env.GITHUB_REF_NAME || 'main',
    environment: 'production'
  };
  
  const buildInfoPath = path.join(distDir, 'build-info.json');
  fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2));
  console.log('✅ 生成构建信息');
}

// 6. 检查构建结果
function validateBuild() {
  const requiredFiles = [
    'index.html',
    'en/index.html',
    'cities/index.html',
    'en/cities/index.html'
  ];
  
  const missingFiles = [];
  
  requiredFiles.forEach(file => {
    const filePath = path.join(distDir, file);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(file);
    }
  });
  
  if (missingFiles.length > 0) {
    console.error('❌ 缺少必要文件:', missingFiles);
    process.exit(1);
  }
  
  console.log('✅ 构建验证通过');
}

// 执行优化步骤
async function main() {
  try {
    if (!fs.existsSync(distDir)) {
      console.error('❌ dist 目录不存在，请先运行 npm run build');
      process.exit(1);
    }
    
    createNoJekyllFile();
    generateRobotsTxt();
    generateSitemap();
    optimizeHtmlFiles();
    generateBuildInfo();
    validateBuild();
    
    console.log('🎉 构建优化完成！');
  } catch (error) {
    console.error('❌ 构建优化失败:', error);
    process.exit(1);
  }
}

main();