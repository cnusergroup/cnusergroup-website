# 活动行线下活动采集工具使用指南

## 🎯 工具概述

这个工具专门用于采集亚马逊云科技 User Group 在活动行平台上的线下活动信息，支持自动化采集、图片下载和增量更新。

## 🚀 快速开始

### 1. 安装依赖

```bash
# 安装 Playwright（如果还没安装）
npm install playwright

# 安装浏览器
npx playwright install chromium
```

### 2. 运行采集

```bash
# 基础采集（推荐）
npm run scrape:events

# 强制重新采集所有活动
npm run scrape:events:force

# 详细输出模式
npm run scrape:events:verbose
```

### 3. 查看结果

```bash
# 查看统计信息
npm run events:stats

# 查看活动列表
npm run events:list

# 导出CSV文件
npm run events:csv
```

## 📋 功能详解

### 采集功能

- **自动分页**: 自动遍历所有分页，采集完整数据
- **增量更新**: 只采集新活动，避免重复
- **图片下载**: 自动下载活动图片到本地
- **错误处理**: 完善的错误处理和重试机制
- **日志记录**: 详细的操作日志

### 数据字段

每个活动包含以下信息：

```json
{
  "id": "活动ID",
  "title": "活动标题", 
  "time": "活动时间 (MM/DD HH:MM)",
  "location": "活动地点",
  "url": "活动详情页URL",
  "imageUrl": "原始图片URL",
  "localImage": "本地图片文件名",
  "scrapedAt": "采集时间戳"
}
```

## 📁 文件结构

```
data/events/
├── events.json          # 活动数据文件
├── events.csv           # CSV导出文件
├── scraper.log          # 采集日志
└── images/              # 活动图片目录
    ├── 3825656249900.jpg
    ├── 3825927559300.jpg
    └── ...
```

## 🛠️ 高级用法

### 测试工具

```bash
# 测试采集工具是否正常工作
npm run scrape:test
```

### 数据查看

```bash
# 显示统计信息
node scripts/view-events.js --stats

# 显示所有活动
node scripts/view-events.js --list --all

# 搜索特定活动
node scripts/view-events.js --search "Kiro"

# 搜索特定地点
node scripts/view-events.js --search "北京"
```

### 自定义配置

编辑 `scripts/event-scraper.js` 文件可以修改：

- 采集页数限制（默认20页）
- 请求延迟时间（默认2秒）
- 数据保存路径
- 图片保存路径

## 🔄 定期采集

### 手动定期运行

建议每天或每周运行一次：

```bash
npm run scrape:events
```

### 自动化方案

#### 1. 使用 cron (Linux/Mac)

```bash
# 编辑 crontab
crontab -e

# 添加每天上午10点运行的任务
0 10 * * * cd /path/to/project && npm run scrape:events
```

#### 2. 使用 Windows 任务计划程序

1. 打开"任务计划程序"
2. 创建基本任务
3. 设置触发器（每天/每周）
4. 设置操作：运行程序
   - 程序：`cmd`
   - 参数：`/c cd /d "C:\path\to\project" && npm run scrape:events`

#### 3. 使用 GitHub Actions

创建 `.github/workflows/scrape-events.yml`：

```yaml
name: Scrape Events
on:
  schedule:
    - cron: '0 10 * * *'  # 每天上午10点
  workflow_dispatch:      # 手动触发

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npx playwright install chromium
      - run: npm run scrape:events
      - uses: actions/upload-artifact@v3
        with:
          name: events-data
          path: data/events/
```

## 📊 数据分析

### 统计信息

工具提供以下统计：

- 总活动数量
- 按地点分布
- 按时间分布  
- 图片下载成功率
- 最新活动信息

### CSV导出

导出的CSV文件可以用于：

- Excel分析
- 数据可视化
- 第三方工具集成
- 报表生成

## 🔧 故障排除

### 常见问题

#### 1. Playwright 安装失败

```bash
# 重新安装
npm uninstall playwright
npm install playwright
npx playwright install chromium
```

#### 2. 网络连接问题

- 检查网络连接
- 确认可以访问 `https://usergroup.huodongxing.com/`
- 考虑使用代理（如需要）

#### 3. 权限问题

```bash
# 确保有写入权限
chmod 755 data/events/
```

#### 4. 内存不足

- 减少并发请求
- 增加请求延迟时间
- 分批处理大量数据

### 日志分析

查看详细日志：

```bash
# 查看最新日志
tail -f data/events/scraper.log

# 查看错误日志
grep "ERROR\|Failed" data/events/scraper.log
```

## 🔒 注意事项

### 使用规范

1. **合理频率**: 不要过于频繁地采集，建议每天最多1-2次
2. **尊重网站**: 遵守目标网站的robots.txt和使用条款
3. **数据使用**: 采集的数据仅用于合法用途
4. **隐私保护**: 不要采集和存储个人敏感信息

### 技术限制

1. **反爬虫**: 网站可能有反爬虫机制，需要适当调整策略
2. **页面变化**: 网站结构变化可能导致采集失败
3. **网络稳定性**: 网络不稳定可能影响采集效果

## 🚀 扩展功能

### 可能的扩展

1. **邮件通知**: 新活动通知
2. **数据库存储**: 使用数据库替代JSON文件
3. **Web界面**: 创建Web界面查看数据
4. **API接口**: 提供REST API访问数据
5. **数据分析**: 更深入的数据分析和可视化

### 集成建议

- 与现有网站集成显示活动
- 与日历应用同步
- 与通知系统集成
- 与数据分析平台集成

## 📞 支持

如果遇到问题：

1. 查看日志文件：`data/events/scraper.log`
2. 运行测试：`npm run scrape:test`
3. 检查网络连接和权限
4. 查看GitHub Issues或提交新问题

## 📄 许可证

MIT License - 详见项目根目录的 LICENSE 文件