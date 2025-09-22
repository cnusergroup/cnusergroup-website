# 增量采集模式

活动爬虫现在支持智能的增量采集模式，可以大大提高采集效率。

## 🚀 采集模式

### 1. 快速增量模式 (推荐日常使用)
```bash
npm run scrape:quick
```
- **特点**: 1页无新增就停止
- **适用**: 日常更新检查
- **速度**: 最快 (~30秒)

### 2. 标准增量模式 (默认)
```bash
npm run scrape:incremental
# 或者
npm run scrape:improved
```
- **特点**: 连续2页无新增才停止
- **适用**: 定期数据更新
- **速度**: 快 (~1-2分钟)

### 3. 完整采集模式
```bash
npm run scrape:full
```
- **特点**: 遍历所有16页
- **适用**: 首次采集或数据重建
- **速度**: 慢 (~5-8分钟)

## 📊 智能停止逻辑

### 增量采集停止条件
1. **连续无新增**: 连续N页没有新活动时停止
2. **连续空页**: 连续3页没有任何活动时停止
3. **到达最后一页**: 下一页按钮不可用时停止

### 配置参数
- `earlyStopThreshold`: 连续无新增页数阈值
- `maxEmptyPages`: 最大连续空页数

## 🔄 与完整流程集成

增量采集可以与完整的事件处理流程结合使用：

```bash
# 快速增量采集 + 完整处理
npm run scrape:quick && npm run events:process

# 标准增量采集 + 完整处理  
npm run events:process:force  # 内部使用增量模式
```

## 📈 性能对比

| 模式 | 时间 | 适用场景 | 数据完整性 |
|------|------|----------|------------|
| 快速增量 | ~30秒 | 日常检查 | 新增数据 |
| 标准增量 | ~1-2分钟 | 定期更新 | 新增数据 |
| 完整采集 | ~5-8分钟 | 首次/重建 | 全部数据 |

## 💡 使用建议

1. **日常使用**: `npm run scrape:quick`
2. **定期更新**: `npm run scrape:incremental` 
3. **数据重建**: `npm run scrape:full`
4. **完整流程**: `npm run events:process:force`

## 🔧 自定义配置

可以通过代码自定义增量采集参数：

```javascript
const scraper = new EventPaginationScraper();

// 自定义增量模式
scraper.runIncremental({
  earlyStopThreshold: 3,  // 3页无新增才停止
  maxEmptyPages: 5        // 最大5页空页
});
```