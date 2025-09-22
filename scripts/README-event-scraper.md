# 活动行线下活动采集工具

这个工具用于采集亚马逊云科技 User Group 在活动行上的线下活动信息。

## 功能特性

- ✅ 采集线下活动信息（标题、时间、地点、详情URL）
- ✅ 自动下载活动图片到本地
- ✅ 支持分页采集，获取所有活动
- ✅ 增量更新，只采集新活动
- ✅ 自动去重，避免重复采集
- ✅ 详细日志记录

## 安装依赖

```bash
npm install playwright
```

## 使用方法

### 1. 直接运行采集
```bash
node scripts/event-scraper.js
```

### 2. 作为模块使用
```javascript
const EventScraper = require('./scripts/event-scraper');

const scraper = new EventScraper();
scraper.run().then(() => {
  console.log('采集完成');
}).catch(console.error);
```

## 输出文件

采集的数据会保存在以下位置：

- `./data/events/events.json` - 活动数据JSON文件
- `./data/events/images/` - 活动图片目录
- `./data/events/scraper.log` - 采集日志

## 数据格式

每个活动包含以下字段：

```json
{
  "id": "3825656249900",
  "title": "Kiro IDE 与 Strands SDK 驱动开发全生命周期智能升级",
  "time": "09/21 14:00",
  "location": "福建福州",
  "url": "https://usergroup.huodongxing.com/event/3825656249900?qd=8839540364256",
  "imageUrl": "https://pic.huodongxing.com/...",
  "localImage": "3825656249900.jpg",
  "scrapedAt": "2025-01-22T03:15:30.123Z"
}
```

## 配置选项

可以在 `EventScraper` 类中修改以下配置：

- `baseUrl`: 目标网站URL
- `dataDir`: 数据保存目录
- `imageDir`: 图片保存目录
- 最大采集页数（默认20页）

## 增量更新机制

- 首次运行：采集所有活动
- 后续运行：只采集新活动（基于活动ID判断）
- 如果某页没有新活动，停止采集后续页面

## 注意事项

1. 请合理控制采集频率，避免对目标网站造成压力
2. 工具会自动添加请求延迟（2秒）
3. 图片下载失败不会影响活动数据采集
4. 建议定期运行以获取最新活动

## 故障排除

### 常见问题

1. **Playwright 安装失败**
   ```bash
   npx playwright install chromium
   ```

2. **网络连接问题**
   - 检查网络连接
   - 确认目标网站可访问

3. **权限问题**
   - 确保有写入 `./data/events/` 目录的权限

### 日志查看

查看详细日志：
```bash
cat ./data/events/scraper.log
```

## 扩展功能

可以根据需要扩展以下功能：

- 添加邮件通知
- 集成到CI/CD流程
- 添加数据库存储
- 实现Web界面展示
- 添加活动状态监控

## 许可证

MIT License