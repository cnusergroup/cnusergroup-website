# 快速部署指南

## 🚀 一键部署

### 方法一：完整部署准备（推荐）
```bash
npm run deploy:ready
```

这个命令会：
- ✅ 检查环境和依赖
- 🧹 清理旧文件
- 📦 安装/更新依赖
- 🔨 构建项目
- 📝 创建部署文件
- 📋 生成部署报告

### 方法二：仅检查（快速验证）
```bash
npm run deploy:check
```

这个命令只执行检查，不进行构建，适合快速验证项目状态。

## 📋 部署前检查清单

### 必要文件 ✅
- [ ] `package.json` - 项目配置
- [ ] `astro.config.mjs` - Astro 配置
- [ ] `src/pages/index.astro` - 首页
- [ ] `src/pages/cities.astro` - 城市页面
- [ ] `src/pages/about.astro` - 关于页面
- [ ] 英文版本页面

### 数据文件 📊
- [ ] `src/data/cities.json` - 城市数据
- [ ] `src/data/translations/zh.json` - 中文翻译
- [ ] `src/data/translations/en.json` - 英文翻译
- [ ] `src/data/images.json` - 图片配置
- [ ] `src/data/social.json` - 社交媒体配置

### 图片资源 🖼️
- [ ] `public/images/cities/` - 城市图片
- [ ] `public/images/ui/` - UI 图片
- [ ] `public/images/icons/` - 图标文件
- [ ] `public/images/qr/` - 二维码图片

### 配置检查 ⚙️
- [ ] Astro 配置包含 `site` 和 `base`
- [ ] package.json 包含必要脚本
- [ ] 依赖项完整安装

## 🔧 常见问题解决

### 构建失败
```bash
# 清理并重新安装依赖
rm -rf node_modules package-lock.json
npm install
npm run deploy:ready
```

### 图片加载问题
1. 检查图片文件是否存在于 `public/images/` 目录
2. 验证 `src/data/images.json` 配置正确
3. 确认图片格式支持（jpg, png, webp, svg）

### 数据格式错误
```bash
# 验证 JSON 格式
node -e "console.log(JSON.parse(require('fs').readFileSync('src/data/cities.json')))"
```

### Node.js 版本问题
确保使用 Node.js 18 或更高版本：
```bash
node --version  # 应该显示 v18.x.x 或更高
```

## 📊 部署报告

运行部署准备后，会生成 `deployment-report.json` 文件，包含：

```json
{
  "timestamp": "2025-01-01T12:00:00.000Z",
  "environment": {
    "nodeVersion": "v18.17.0",
    "platform": "win32"
  },
  "checks": {
    "total": 25,
    "passed": 25,
    "successRate": "100%"
  },
  "warnings": [],
  "errors": [],
  "buildInfo": {
    "distExists": true,
    "indexExists": true
  }
}
```

## 🌐 GitHub Pages 部署

### 自动部署（推荐）
1. **准备项目**
   ```bash
   npm run deploy:ready
   ```

2. **提交到 GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

3. **GitHub Actions 自动部署**
   - 推送后自动触发构建
   - 约 2-5 分钟完成部署
   - 访问 `https://yourusername.github.io/cnusergroup`

### 手动部署
1. **本地构建**
   ```bash
   npm run deploy:ready
   ```

2. **上传 dist 文件夹**
   - 将 `dist/` 目录内容上传到 GitHub Pages
   - 或使用 `gh-pages` 工具

## 🎯 性能优化建议

### 图片优化
- 使用 WebP 格式减少文件大小
- 启用懒加载提升首屏速度
- 提供多种尺寸适配不同设备

### 代码优化
- 启用代码分割
- 压缩 CSS 和 JavaScript
- 使用 CDN 加速静态资源

### 缓存策略
- 设置合适的缓存头
- 使用版本号管理资源更新
- 启用浏览器缓存

## 📈 监控和维护

### 性能监控
```bash
npm run perf:audit  # 本地性能审计
```

### 可访问性测试
```bash
npm run a11y:test   # 可访问性测试
```

### 定期检查
- 每月运行 `npm run deploy:check` 验证项目状态
- 更新依赖项保持安全性
- 监控网站性能指标

## 🆘 获取帮助

如果遇到问题：

1. **查看部署报告** - `deployment-report.json`
2. **检查控制台输出** - 查找错误信息
3. **验证环境** - 确认 Node.js 版本和依赖
4. **重新开始** - 清理后重新部署

---

**提示**: 首次部署建议先运行 `npm run deploy:check` 验证环境，然后再执行完整的 `npm run deploy:ready`。