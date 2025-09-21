# 部署脚本使用示例

## 🚀 常见部署场景

### 场景 1: 首次部署
```bash
# 1. 快速检查项目状态
npm run deploy:check

# 2. 如果检查通过，执行完整部署
npm run deploy:full
```

### 场景 2: 日常更新部署
```bash
# 修改代码后，一键部署
npm run deploy:full
```

### 场景 3: 仅检查不部署
```bash
# 验证项目状态，不执行构建
npm run deploy:check
```

### 场景 4: 手动分步部署
```bash
# 1. 准备部署
npm run deploy:ready

# 2. 手动提交和推送
git add .
git commit -m "Update website"
git push origin main

# 3. 等待 GitHub Actions 完成后验证
npm run deploy:verify
```

## 📊 脚本输出示例

### deploy:check 输出
```
🔍 开始最终部署检查...

📁 检查必要文件...
✅ package.json
✅ astro.config.mjs
✅ src/pages/index.astro
✅ src/pages/cities.astro

📊 检查数据文件...
✅ src/data/cities.json - JSON 格式正确
✅ src/data/translations/zh.json - JSON 格式正确

🖼️ 检查图片资源...
✅ public/images/cities - 15 个图片文件
✅ public/images/ui - 8 个图片文件

📊 检查结果: 21/21 (100%)
🎉 所有检查通过！项目已准备好部署到 GitHub！
```

### deploy:ready 输出
```
🚀 CNUserGroup 网站部署准备
================================

🔧 检查环境...
✅ Node.js 版本 v18.17.0 (需要 ≥18)
✅ npm 可用

📁 检查项目文件...
✅ package.json
✅ astro.config.mjs
[... 更多检查项目 ...]

🧹 清理旧文件...
🗑️  已删除: dist
🗑️  已删除: .astro

📥 安装/更新依赖...
正在运行 npm ci...
✅ 依赖安装完成

🔨 构建项目...
✅ 项目构建完成
✅ 构建输出验证通过
📊 index.html 大小: 45.32 KB

📝 创建部署文件...
✅ 创建 .nojekyll 文件

📋 生成部署报告...
✅ 部署报告已保存: deployment-report.json

🎉 部署准备完成！
```

### deploy:full 输出
```
🚀 CNUserGroup 完整部署工作流
================================

📋 步骤 1/7: 检查 Git 状态
──────────────────────────────────────────────────
ℹ️  执行: git status
✅ Git 仓库检查通过
✅ 工作目录干净，无需提交
✅ 远程仓库: https://github.com/username/cnusergroup.git

📋 步骤 2/7: 执行部署准备
──────────────────────────────────────────────────
[... deploy:ready 的完整输出 ...]

📋 步骤 3/7: 推送到 GitHub
──────────────────────────────────────────────────
ℹ️  推送到 origin/main...
✅ 代码推送成功
ℹ️  最新提交: a1b2c3d4

📋 步骤 4/7: 等待 GitHub Actions 部署
──────────────────────────────────────────────────
ℹ️  GitHub Actions 将自动开始构建和部署...
ℹ️  最大等待时间: 300 秒
✅ 预计部署已完成

📋 步骤 5/7: 验证部署结果
──────────────────────────────────────────────────
[... deploy:verify 的输出 ...]

🎉 部署完成！
================
⏱️  总耗时: 3 分钟
📝 提交: a1b2c3d4
🌐 分支: main
✅ 构建检查: 21/21 (100%)
```

### deploy:verify 输出
```
🌐 检查部署状态
================

🔗 目标网站: https://username.github.io/cnusergroup

🔌 测试网站连通性...
✅ 网站可访问 - 状态码: 200
✅ 响应时间正常 - 1245ms

📄 测试页面内容...
✅ HTML 文档结构
✅ 页面标题存在
✅ 包含中国用户组内容
✅ CSS 样式加载

🔗 测试关键页面...
✅ 首页 (/) - 状态码: 200
✅ 城市页面 (/cities/) - 状态码: 200
✅ 英文首页 (/en/) - 状态码: 200

⚡ 测试性能指标...
✅ 首屏加载时间 - 1245ms
✅ 启用 Gzip 压缩
✅ 页面大小合理 - 45.32 KB

📊 部署检查报告
================
✅ 通过测试: 18/20 (90%)
❌ 失败测试: 2

🎉 部署状态优秀！网站运行正常。
```

## 🔧 故障排除

### 常见错误及解决方案

#### 1. Node.js 版本过低
```
❌ Node.js 版本过低 (v16.14.0)，需要 18.0.0 或更高版本
```
**解决方案**: 升级 Node.js 到 18+ 版本

#### 2. 依赖安装失败
```
❌ 依赖安装失败: npm ERR! peer dep missing
```
**解决方案**: 
```bash
rm -rf node_modules package-lock.json
npm install
```

#### 3. 构建失败
```
❌ 项目构建失败: Error: Cannot resolve module
```
**解决方案**: 检查导入路径和文件是否存在

#### 4. Git 推送失败
```
❌ 推送失败: Permission denied
```
**解决方案**: 检查 Git 凭据和仓库权限

#### 5. 部署验证失败
```
❌ 网站可访问 - Request timeout
```
**解决方案**: 等待几分钟后重试，或检查 GitHub Pages 设置

## 📋 最佳实践

### 1. 部署前检查
```bash
# 总是先检查项目状态
npm run deploy:check

# 如果有警告，先修复再部署
npm run deploy:ready
```

### 2. 分阶段部署
```bash
# 开发环境测试
npm run dev

# 本地构建测试
npm run build
npm run preview

# 部署到生产环境
npm run deploy:full
```

### 3. 部署后验证
```bash
# 部署完成后验证
npm run deploy:verify

# 检查性能
npm run perf:audit

# 检查可访问性
npm run a11y:test
```

### 4. 定期维护
```bash
# 每周检查项目状态
npm run deploy:check

# 每月更新依赖
npm update
npm run deploy:ready
```

## 🎯 自动化建议

### GitHub Actions 集成
在 `.github/workflows/deploy.yml` 中添加部署后验证：

```yaml
- name: Verify deployment
  run: |
    sleep 60  # 等待部署完成
    npm run deploy:verify
```

### 本地 Git Hooks
在 `.git/hooks/pre-push` 中添加部署前检查：

```bash
#!/bin/sh
npm run deploy:check
```

### CI/CD 流水线
```bash
# 完整的 CI/CD 流程
npm run deploy:check    # 检查
npm run build          # 构建
npm run test           # 测试
npm run deploy:full    # 部署
npm run deploy:verify  # 验证
```