# 部署指南

本文档介绍如何将 CNUserGroup 网站部署到 GitHub Pages。

## 前置要求

- Node.js 18.0.0 或更高版本
- npm 或 yarn 包管理器
- Git 版本控制
- GitHub 账户

## 自动部署 (推荐)

### 1. GitHub Actions 自动部署

项目已配置 GitHub Actions 工作流，推送到 `main` 分支时会自动部署。

#### 设置步骤：

1. **Fork 或克隆仓库**
   ```bash
   git clone https://github.com/your-username/cnusergroup-website.git
   cd cnusergroup-website
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置 GitHub Pages**
   - 进入 GitHub 仓库设置
   - 找到 "Pages" 选项
   - Source 选择 "GitHub Actions"

4. **推送代码**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

5. **等待部署完成**
   - 查看 Actions 标签页的部署状态
   - 部署完成后访问 `https://your-username.github.io/cnusergroup-website`

### 2. 部署脚本

#### 快速检查
```bash
npm run deploy:check
```
仅执行检查，不进行构建，适合快速验证项目状态。

#### 完整部署准备（推荐）
```bash
npm run deploy:ready
```
执行完整的部署准备流程：
- ✅ 检查环境和依赖
- 🧹 清理旧文件
- 📦 安装/更新依赖
- 🔨 构建项目
- 📝 创建部署文件
- 📋 生成部署报告

#### 一键完整部署
```bash
npm run deploy:full
```
自动化完整部署流程：
- 检查 Git 状态并提交更改
- 执行部署准备
- 推送到 GitHub
- 等待 GitHub Actions 部署
- 验证部署结果

#### 部署后验证
```bash
npm run deploy:verify
```
验证部署后的网站状态：
- 网站连通性测试
- 页面内容检查
- 性能指标测试
- SEO 优化检查

## 手动部署

### 1. 本地构建

```bash
# 开发环境预览
npm run dev

# 生产环境构建
npm run build

# 生产环境预览
npm run preview:prod
```

### 2. 部署到 GitHub Pages

```bash
# 使用 gh-pages 包部署
npm run deploy
```

## 配置说明

### Astro 配置 (astro.config.mjs)

```javascript
export default defineConfig({
  site: 'https://cnusergroup.github.io',
  base: '/cnusergroup-website',
  output: 'static'
});
```

### GitHub Actions 配置 (.github/workflows/deploy.yml)

工作流包含以下步骤：
1. 检出代码
2. 设置 Node.js 环境
3. 安装依赖
4. 构建项目
5. 部署到 GitHub Pages

### 构建优化

构建过程会自动：
- 创建 `.nojekyll` 文件
- 生成 `robots.txt`
- 生成 `sitemap.xml`
- 优化 HTML 文件
- 添加安全头部

## 自定义域名

### 1. 配置 CNAME

编辑 `public/CNAME` 文件：
```
your-domain.com
```

### 2. DNS 设置

在域名提供商处添加 CNAME 记录：
```
CNAME  www  your-username.github.io
```

或添加 A 记录指向 GitHub Pages IP：
```
A  @  185.199.108.153
A  @  185.199.109.153
A  @  185.199.110.153
A  @  185.199.111.153
```

## 环境变量

### GitHub Secrets

如果需要环境变量，在 GitHub 仓库设置中添加 Secrets：

- `ANALYTICS_ID`: 分析服务 ID
- `API_KEY`: API 密钥（如果需要）

### 本地开发

创建 `.env` 文件：
```
PUBLIC_ANALYTICS_ID=your-analytics-id
```

## 故障排除

### 常见问题

1. **404 错误**
   - 检查 `base` 配置是否正确
   - 确保 `.nojekyll` 文件存在

2. **资源加载失败**
   - 检查图片路径是否正确
   - 确保所有资源使用相对路径

3. **构建失败**
   - 检查 Node.js 版本
   - 运行 `npm run pre-deploy` 检查问题

4. **样式丢失**
   - 检查 CSS 文件路径
   - 确保 Tailwind CSS 正确配置

### 调试步骤

1. **本地测试**
   ```bash
   npm run build
   npm run preview:prod
   ```

2. **检查构建输出**
   ```bash
   ls -la dist/
   ```

3. **查看 GitHub Actions 日志**
   - 进入 Actions 标签页
   - 点击失败的工作流
   - 查看详细日志

## 性能优化

### 图片优化

- 使用 WebP 格式
- 实现响应式图片
- 启用懒加载

### 代码优化

- 启用代码分割
- 压缩 CSS 和 JS
- 使用 CDN 加速

### 缓存策略

- 设置适当的缓存头
- 使用版本化资源
- 启用浏览器缓存

## 监控和分析

### 性能监控

- 使用 Lighthouse 检查性能
- 监控 Core Web Vitals
- 设置性能预算

### 分析集成

- Google Analytics
- 百度统计
- 自定义分析

## 安全考虑

### 内容安全策略

- 设置 CSP 头部
- 防止 XSS 攻击
- 启用 HTTPS

### 访问控制

- 配置适当的 robots.txt
- 设置访问限制
- 监控异常访问

## 备份和恢复

### 代码备份

- 定期推送到 GitHub
- 创建发布标签
- 维护多个分支

### 数据备份

- 备份配置文件
- 保存图片资源
- 记录部署历史

## 更新和维护

### 依赖更新

```bash
# 检查过时的包
npm outdated

# 更新依赖
npm update

# 安全审计
npm audit
```

### 内容更新

1. 更新城市数据
2. 添加新功能
3. 修复 bug
4. 优化性能

### 版本管理

- 使用语义化版本
- 创建变更日志
- 标记重要版本