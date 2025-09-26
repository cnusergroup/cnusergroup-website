# CNUserGroup Website

亚马逊云科技 User Group 社区官方网站

## 🚀 技术栈

- **框架**: Astro 4.x
- **样式**: Tailwind CSS 3.x
- **语言**: TypeScript
- **部署**: GitHub Pages
- **测试**: Playwright + Axe-core (无障碍测试)
- **构建工具**: Vite

## 📁 项目结构

```
cnusergroup-website/
├── src/                     # 源代码
│   ├── components/          # 可复用 UI 组件
│   │   ├── layout/         # 布局组件 (Header, Footer, Navigation)
│   │   ├── sections/       # 页面区块组件
│   │   └── ui/             # 基础 UI 组件 (Button, Card, etc.)
│   ├── layouts/            # 页面布局模板
│   ├── pages/              # 路由页面和 API 端点
│   │   ├── cities/         # 动态城市详情页面
│   │   ├── events/         # 活动相关页面
│   │   └── en/             # 英文版本页面
│   ├── data/               # 数据文件
│   │   ├── events/         # 活动数据
│   │   ├── cities.json     # 城市信息和元数据
│   │   └── translations/   # 语言文件 (zh.json, en.json)
│   ├── assets/             # 静态资源 (images, icons)
│   ├── scripts/            # 客户端脚本
│   ├── styles/             # 全局样式和 Tailwind 配置
│   └── utils/              # 工具函数
├── public/                 # 静态文件
│   ├── images/            # 图片资源
│   └── js/                # 客户端 JavaScript
├── scripts/               # 构建和部署脚本
├── docs/                  # 项目文档
└── .github/               # GitHub Actions 工作流
```

## 🛠️ 开发命令

### 基础开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
# 或
npm start

# 构建生产版本
npm run build

# 预览生产版本
npm run preview

# 验证构建
npm run validate
```

### 部署相关

```bash
# 部署前检查
npm run pre-deploy

# 完整部署流程
npm run deploy:full

# 检查部署状态
npm run deploy:verify

# 预览生产环境
npm run preview:prod
```

### 事件数据管理

```bash
# 抓取最新事件数据
npm run scrape:events

# 强制重新抓取所有数据
npm run scrape:events:force

# 处理事件数据
npm run events:process

# 查看事件统计
npm run events:stats

# 生成质量报告
npm run events:quality:report

# 清理事件数据
npm run clear:events
```



## ✨ 功能特性

- 🌐 **双语支持**: 中文/英文完整国际化
- 📱 **响应式设计**: 适配所有设备尺寸
- 🚀 **静态站点生成**: 极快的加载速度
- 🎨 **现代化 UI**: 基于 Tailwind CSS 的美观界面
- 📊 **动态内容管理**: 自动抓取和处理活动数据
- 🔍 **SEO 优化**: 完整的搜索引擎优化
- ♿ **无障碍支持**: 符合 WCAG 标准
- 🔄 **自动化部署**: GitHub Actions 持续集成
- 📈 **性能监控**: Lighthouse 性能评分
- 🎯 **事件过滤**: 智能搜索和筛选功能

## 🌐 部署

### 自动部署

网站通过 GitHub Actions 自动部署到 GitHub Pages：

1. 推送代码到 `main` 分支
2. GitHub Actions 自动构建和部署
3. 访问 [https://cnusergroup.github.io/cnusergroup-website](https://cnusergroup.github.io/cnusergroup-website)

### 手动部署

```bash
# 快速部署
npm run deploy

# 完整部署流程（包含验证）
npm run deploy:full

# 仅检查部署准备状态
npm run deploy:check
```

## 📚 文档

- [部署指南](docs/DEPLOYMENT.md) - 详细的部署说明

## 🤝 贡献

欢迎贡献代码和建议！请确保：

1. 遵循现有的代码风格
2. 运行测试确保功能正常
3. 更新相关文档
4. 提交前运行 `npm run validate`

## 📄 许可证

本项目采用 MIT 许可证。

## 🔗 相关链接

- [亚马逊云科技 User Group 社区](https://cnusergroup.github.io/cnusergroup-website)
- [GitHub 仓库](https://github.com/cnusergroup/cnusergroup-website)
- [问题反馈](https://github.com/cnusergroup/cnusergroup-website/issues)

---

**最后更新**: 2025-09-26  
**维护团队**: CNUserGroup 开发团队