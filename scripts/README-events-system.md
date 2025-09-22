# 活动采集系统使用指南

这是一个完整的活动数据采集、清理和管理系统，用于从活动行网站采集线下活动信息。

## 🚀 快速开始

### 1. 测试系统
```bash
npm run events:workflow:test
```

### 2. 快速采集
```bash
npm run events:workflow:quick
```

### 3. 完整工作流程
```bash
npm run events:workflow
```

## 📋 可用命令

### 采集相关
- `npm run scrape:events` - 采集新活动
- `npm run scrape:events:force` - 强制重新采集所有活动
- `npm run scrape:events:verbose` - 详细模式采集
- `npm run scrape:test` - 测试采集功能

### 数据管理
- `npm run events:view` - 查看活动数据
- `npm run events:stats` - 显示统计信息
- `npm run events:list` - 显示活动列表
- `npm run events:quality` - 数据质量分析
- `npm run events:clean` - 清理数据
- `npm run events:backup` - 备份数据
- `npm run events:csv` - 导出CSV文件

### 工作流程
- `npm run events:workflow` - 完整工作流程
- `npm run events:workflow:quick` - 快速模式
- `npm run events:workflow:test` - 测试模式

## 📊 数据结构

每个活动包含以下字段：

```json
{
  "id": "3825656249900",
  "title": "活动标题",
  "time": "09/21 14:00",
  "location": "福建福州",
  "url": "https://usergroup.huodongxing.com/event/...",
  "imageUrl": "https://cdn.huodongxing.com/...",
  "localImage": "3825656249900.jpg",
  "scrapedAt": "2025-09-22T03:20:53.520Z"
}
```

## 🔧 系统功能

### 1. 智能采集
- ✅ 自动识别线下活动
- ✅ 分页采集支持
- ✅ 增量更新（只采集新活动）
- ✅ 图片自动下载
- ✅ 错误处理和重试

### 2. 数据清理
- ✅ 去除重复活动
- ✅ 修复无效地点信息
- ✅ 从标题中提取城市名
- ✅ 清理格式异常的数据
- ✅ 自动备份原始数据

### 3. 质量分析
- ✅ 数据完整性统计
- ✅ 地点信息有效性检查
- ✅ 时间格式验证
- ✅ 图片下载状态统计
- ✅ 问题活动识别

### 4. 统计报告
- ✅ 按地点分布统计
- ✅ 按时间分布统计
- ✅ 数据质量指标
- ✅ 采集历史记录
- ✅ CSV导出功能

## 📁 文件结构

```
data/events/
├── events.json          # 主数据文件
├── report.json          # 统计报告
├── events.csv           # CSV导出文件
├── scraper.log          # 采集日志
├── backup/              # 数据备份目录
└── images/              # 活动图片目录
    └── *.jpg

scripts/
├── event-scraper.cjs    # 主采集器
├── test-scraper.cjs     # 测试工具
├── view-events.cjs      # 数据查看工具
├── clean-events.cjs     # 数据清理工具
├── events-workflow.cjs  # 工作流程管理
└── run-scraper.cjs      # 采集运行器
```

## 🛠️ 高级用法

### 自定义采集参数

编辑 `scripts/event-scraper.cjs` 中的配置：

```javascript
// 最大采集页数
const maxPages = 20;

// 请求延迟（毫秒）
const requestDelay = 2000;

// 城市名提取模式
const cityPatterns = [
  /(北京|上海|广州|深圳|...)/,
  // 添加更多模式
];
```

### 数据质量规则

在 `scripts/clean-events.cjs` 中自定义清理规则：

```javascript
// 地点验证规则
const isValidLocation = (location) => {
  return /[\u4e00-\u9fa5]/.test(location) && 
         !/^\d+\s+\d+/.test(location);
};

// 时间格式验证
const isValidTime = (time) => {
  return /\d{2}\/\d{2}\s+\d{2}:\d{2}/.test(time);
};
```

### 搜索和过滤

```bash
# 搜索特定关键词
npm run events:view -- --search "Kiro"

# 显示所有活动
npm run events:list -- --all

# 查看特定数量的活动
npm run events:list -- --limit 20
```

## 🔍 故障排除

### 常见问题

1. **采集失败**
   ```bash
   # 检查网络连接
   npm run scrape:test
   
   # 查看详细日志
   npm run scrape:events:verbose
   ```

2. **数据质量问题**
   ```bash
   # 分析数据质量
   npm run events:quality
   
   # 清理数据
   npm run events:clean
   ```

3. **图片下载失败**
   - 检查网络连接
   - 确认磁盘空间充足
   - 查看 `data/events/scraper.log` 日志

### 日志文件

- `data/events/scraper.log` - 采集过程日志
- 控制台输出 - 实时状态信息

## 📈 性能优化

### 采集性能
- 调整请求延迟避免被限制
- 使用增量更新减少重复采集
- 合理设置最大页数限制

### 存储优化
- 定期清理备份文件
- 压缩历史数据
- 优化图片存储格式

## 🔄 定时任务

可以设置定时任务自动采集：

```bash
# Linux/Mac (crontab)
0 */6 * * * cd /path/to/project && npm run events:workflow:quick

# Windows (任务计划程序)
# 创建任务运行: npm run events:workflow:quick
```

## 📞 技术支持

如果遇到问题：

1. 查看日志文件
2. 运行测试模式
3. 检查数据质量
4. 查看系统文档

---

**注意**: 请确保采集行为符合目标网站的使用条款和相关法律法规。