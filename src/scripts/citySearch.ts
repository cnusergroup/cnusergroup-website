/**
 * 城市搜索和筛选功能
 * 独立的搜索功能模块，用于城市页面的搜索和筛选
 */

interface CityRegions {
  [key: string]: string;
}

// 城市地区映射
const cityRegions: CityRegions = {
  'beijing': 'north',
  'zhangjiakou': 'north', 
  'qingdao': 'north',
  'shanghai': 'east',
  'hangzhou': 'east',
  'suzhou': 'east',
  'hefei': 'east',
  'shenzhen': 'south',
  'guangzhou': 'south',
  'xiamen': 'south',
  'fuzhou': 'south',
  'hechi': 'south',
  'chengdu': 'west',
  'xian': 'west',
  'lanzhou': 'west',
  'urumqi': 'west',
  'changji': 'west',
  'chongqing': 'west',
  'wuhan': 'central',
  'nanjing': 'east',
  'zhengzhou': 'central'
};

// 城市名称映射
const cityNameMap: Record<string, string> = {
  '北京': 'beijing',
  '上海': 'shanghai', 
  '深圳': 'shenzhen',
  '广州': 'guangzhou',
  '杭州': 'hangzhou',
  '成都': 'chengdu',
  '武汉': 'wuhan',
  '西安': 'xian',
  '苏州': 'suzhou',
  '厦门': 'xiamen',
  '青岛': 'qingdao',
  '福州': 'fuzhou',
  '合肥': 'hefei',
  '兰州': 'lanzhou',
  '乌鲁木齐': 'urumqi',
  '昌吉': 'changji',
  '河池': 'hechi',
  '张家口': 'zhangjiakou',
  '重庆': 'chongqing',
  '南京': 'nanjing',
  '郑州': 'zhengzhou'
};

class CitySearchManager {
  private searchInput: HTMLInputElement | null = null;
  private filterSelect: HTMLSelectElement | null = null;
  private clearFiltersBtn: HTMLElement | null = null;
  private resultsCount: HTMLElement | null = null;
  private cityCards: NodeListOf<Element> | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initElements());
    } else {
      this.initElements();
    }
  }

  private initElements(): void {
    // 获取DOM元素
    this.searchInput = document.getElementById('city-search') as HTMLInputElement;
    this.filterSelect = document.getElementById('city-filter') as HTMLSelectElement;
    this.clearFiltersBtn = document.getElementById('clear-filters') as HTMLElement;
    this.resultsCount = document.getElementById('results-count') as HTMLElement;
    this.cityCards = document.querySelectorAll('.city-moudle');

    // 检查必要元素是否存在
    if (!this.cityCards || this.cityCards.length === 0) {
      console.warn('No city cards found, search functionality disabled');
      return;
    }

    // 初始化城市卡片数据
    this.initializeCityCards();

    // 绑定事件监听器
    this.bindEventListeners();

    console.log('City search initialized with', this.cityCards.length, 'cities');
  }

  private initializeCityCards(): void {
    if (!this.cityCards) return;

    this.cityCards.forEach((card) => {
      const cityElement = card as HTMLElement;
      
      // 城市名称在 .city_name 元素中，获取第一个子元素（中文名）
      const cityNameElement = card.querySelector('.city_name > div:first-child');
      const cityName = cityNameElement?.textContent?.trim() || '';
      
      // 如果已经有 data-city-id，就使用它，否则根据城市名称推断
      let cityId = cityElement.dataset.cityId;
      if (!cityId) {
        cityId = this.getCityIdFromName(cityName);
        cityElement.dataset.cityId = cityId;
      }
      
      // 设置为活跃状态
      cityElement.dataset.active = 'true';
      
      // 添加调试信息
      console.log(`Initialized city: ${cityName} -> ${cityId}`);
    });
  }

  private getCityIdFromName(name: string): string {
    // 移除空格并转换为小写
    const cleanName = name.replace(/\s+/g, '').toLowerCase();
    
    // 首先尝试直接映射
    if (cityNameMap[name]) {
      return cityNameMap[name];
    }
    
    // 尝试部分匹配
    for (const [chineseName, id] of Object.entries(cityNameMap)) {
      if (name.includes(chineseName) || chineseName.includes(name)) {
        return id;
      }
    }
    
    // 如果没有找到映射，返回清理后的名称
    return cleanName;
  }

  private bindEventListeners(): void {
    // 搜索输入框事件
    if (this.searchInput) {
      this.searchInput.addEventListener('input', () => this.filterCities());
      this.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.filterCities();
        }
      });
    }

    // 筛选下拉框事件
    if (this.filterSelect) {
      this.filterSelect.addEventListener('change', () => this.filterCities());
    }

    // 清除筛选按钮事件
    if (this.clearFiltersBtn) {
      this.clearFiltersBtn.addEventListener('click', () => this.clearFilters());
    }
  }

  private filterCities(): void {
    if (!this.cityCards) return;

    const searchTerm = this.searchInput?.value.toLowerCase().trim() || '';
    const filterValue = this.filterSelect?.value || 'all';
    let visibleCount = 0;

    console.log('Filtering cities:', { searchTerm, filterValue });

    this.cityCards.forEach((card) => {
      const cityElement = card as HTMLElement;
      
      // 获取中文城市名称（第一个子元素）
      const cityNameElement = card.querySelector('.city_name > div:first-child');
      const cityName = cityNameElement?.textContent?.toLowerCase().trim() || '';
      
      // 获取英文城市名称（第二个子元素）
      const cityEnglishNameElement = card.querySelector('.city_name > div:last-child');
      const cityEnglishName = cityEnglishNameElement?.textContent?.toLowerCase().trim() || '';
      
      const cityId = cityElement.dataset.cityId || '';
      const isActive = cityElement.dataset.active === 'true';

      // 搜索匹配 - 支持中文和英文名称
      const matchesSearch = !searchTerm || 
        cityName.includes(searchTerm) || 
        cityEnglishName.includes(searchTerm) ||
        cityId.includes(searchTerm);

      // 筛选匹配
      let matchesFilter = true;
      if (filterValue === 'active') {
        matchesFilter = isActive;
      } else if (filterValue !== 'all') {
        matchesFilter = cityRegions[cityId] === filterValue;
      }

      const shouldShow = matchesSearch && matchesFilter;
      
      // 显示/隐藏城市卡片
      cityElement.style.display = shouldShow ? 'block' : 'none';
      
      if (shouldShow) {
        visibleCount++;
      }

      // 添加调试信息
      if (searchTerm || filterValue !== 'all') {
        console.log(`City ${cityName}:`, {
          cityId,
          matchesSearch,
          matchesFilter,
          shouldShow
        });
      }
    });

    // 更新结果计数
    this.updateResultsCount(visibleCount);

    // 显示/隐藏清除按钮
    this.updateClearButton(searchTerm, filterValue);
  }

  private updateResultsCount(visibleCount: number): void {
    if (!this.resultsCount || !this.cityCards) return;

    const lang = document.documentElement.lang || 'zh';
    const totalCount = this.cityCards.length;

    if (visibleCount === 0) {
      this.resultsCount.textContent = lang === 'zh' ? '未找到匹配的城市' : 'No cities found';
    } else if (visibleCount === totalCount) {
      this.resultsCount.textContent = lang === 'zh' ? '显示所有城市' : 'Showing all cities';
    } else {
      this.resultsCount.textContent = lang === 'zh' 
        ? `显示 ${visibleCount} 个城市` 
        : `Showing ${visibleCount} cities`;
    }
  }

  private updateClearButton(searchTerm: string, filterValue: string): void {
    if (!this.clearFiltersBtn) return;

    const hasFilters = searchTerm || filterValue !== 'all';
    this.clearFiltersBtn.classList.toggle('hidden', !hasFilters);
  }

  private clearFilters(): void {
    if (this.searchInput) {
      this.searchInput.value = '';
    }
    
    if (this.filterSelect) {
      this.filterSelect.value = 'all';
    }
    
    this.filterCities();
    
    // 聚焦到搜索框
    if (this.searchInput) {
      this.searchInput.focus();
    }
  }

  // 公共方法：手动触发筛选
  public triggerFilter(): void {
    this.filterCities();
  }

  // 公共方法：获取当前筛选状态
  public getFilterState(): { searchTerm: string; filterValue: string; visibleCount: number } {
    const searchTerm = this.searchInput?.value || '';
    const filterValue = this.filterSelect?.value || 'all';
    const visibleCount = this.cityCards ? 
      Array.from(this.cityCards).filter(card => 
        (card as HTMLElement).style.display !== 'none'
      ).length : 0;

    return { searchTerm, filterValue, visibleCount };
  }
}

// 创建全局实例
let citySearchManager: CitySearchManager | null = null;

// 初始化函数
export function initCitySearch(): void {
  if (!citySearchManager) {
    citySearchManager = new CitySearchManager();
  }
}

// 导出管理器实例（用于调试）
export function getCitySearchManager(): CitySearchManager | null {
  return citySearchManager;
}

// 自动初始化
initCitySearch();

// 将函数暴露到全局作用域（用于调试）
declare global {
  interface Window {
    citySearchManager: CitySearchManager | null;
    initCitySearch: () => void;
  }
}

window.citySearchManager = citySearchManager;
window.initCitySearch = initCitySearch;