#!/usr/bin/env node

/**
 * 为现有事件数据添加sort字段
 * 从1开始顺序递增
 */

const fs = require('fs');
const path = require('path');

const dataFile = './data/events/events.json';

function addSortField() {
  try {
    // 读取现有数据
    if (!fs.existsSync(dataFile)) {
      console.log('事件数据文件不存在');
      return;
    }

    const data = fs.readFileSync(dataFile, 'utf8');
    const events = JSON.parse(data);

    console.log(`读取到 ${events.length} 个事件`);

    // 为每个事件添加sort字段
    events.forEach((event, index) => {
      event.sort = index + 1;
    });

    // 保存更新后的数据
    fs.writeFileSync(dataFile, JSON.stringify(events, null, 2));
    console.log(`已为 ${events.length} 个事件添加sort字段`);

    // 显示前几个事件的sort值
    console.log('\n前5个事件的sort值:');
    events.slice(0, 5).forEach(event => {
      console.log(`${event.sort}: ${event.title}`);
    });

  } catch (error) {
    console.error('处理失败:', error.message);
  }
}

if (require.main === module) {
  addSortField();
}

module.exports = { addSortField };