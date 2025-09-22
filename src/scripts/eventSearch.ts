/**
 * 活动搜索和筛选功能
 * 独立的搜索功能模块，用于活动页面的搜索和筛选
 */

interface EventRegions {
  [key: string]: string;
}

// 城市地区映射 (暂时保留，可能用于未来的地区筛选功能)
// const cityRegions: EventRegions = {
//   'beijing': 'north',
//   'zhangjiakou': 'north', 
//   'qingdao': 'north',
//   'shanghai': 'east',
//   'hangzhou': 'east',
//   'suzhou': 'east',
//   'hefei': 'east',
//   'shenzhen': 'south',
//   'guangzhou': 'south',
//   'xiamen': 'south',
//   'fuzhou': 'south',
//   'hechi': 'south',
//   'chengdu': 'west',
//   'xian': 'west',
//   'lanzhou': 'west',
//   'urumqi': 'west',
//   'changji': 'west',
//   'wuhan': 'central'
// };

// 城市名称映射 - 支持多语言
const cityNameMap: Record<string, Record<string, string>> = {
  zh: {
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
    '张家口': 'zhangjiakou'
  },
  en: {
    'Beijing': 'beijing',
    'Shanghai': 'shanghai', 
    'Shenzhen': 'shenzhen',
    'Guangzhou': 'guangzhou',
    'Hangzhou': 'hangzhou',
    'Chengdu': 'chengdu',
    'Wuhan': 'wuhan',
    'Xi\'an': 'xian',
    'Suzhou': 'suzhou',
    'Xiamen': 'xiamen',
    'Qingdao': 'qingdao',
    'Fuzhou': 'fuzhou',
    'Hefei': 'hefei',
    'Lanzhou': 'lanzhou',
    'Urumqi': 'urumqi',
    'Changji': 'changji',
    'Hechi': 'hechi',
    'Zhangjiakou': 'zhangjiakou'
  }
};

interface ProcessedEvent {
  id: string;
  title: string;
  time: string;
  location: string;
  url: string;
  imageUrl: string;
  status: 'upcoming' | 'ended';
  views: number;
  favorites: number;
  scrapedAt: string;
  cityMappings: string[];
  slug: string;
  tags: string[];
  isUpcoming: boolean;
  formattedDate: string;
}

class EventSearchManager {
  private searchInput: HTMLInputElement | null = null;
  private filterSelect: HTMLSelectElement | null = null;
  private cityFilterSelect: HTMLSelectElement | null = null;
  private clearFiltersBtn: HTMLElement | null = null;
  private resultsCount: HTMLElement | null = null;
  private eventCards: NodeListOf<Element> | null = null;
  private eventsGrid: HTMLElement | null = null;
  private allEventsData: ProcessedEvent[] = [];

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
    this.searchInput = document.getElementById('event-search') as HTMLInputElement;
    this.filterSelect = document.getElementById('statusFilter') as HTMLSelectElement;
    this.cityFilterSelect = document.getElementById('cityFilter') as HTMLSelectElement;
    this.clearFiltersBtn = document.getElementById('clear-filters') as HTMLElement;
    this.resultsCount = document.getElementById('results-count') as HTMLElement;
    this.eventsGrid = document.getElementById('events-grid') as HTMLElement;
    this.eventCards = document.querySelectorAll('[data-event-id]');

    // 检查必要元素是否存在
    if (!this.eventsGrid) {
      console.warn('Events grid not found, search functionality disabled');
      return;
    }

    // 从全局变量获取事件数据（由 Astro 组件传递）
    if (typeof window !== 'undefined' && (window as any).allEventsData) {
      this.allEventsData = (window as any).allEventsData;
    }

    // 初始化事件卡片数据
    this.initializeEventCards();

    // 绑定事件监听器
    this.bindEventListeners();

    console.log('Event search initialized with', this.allEventsData.length, 'events');
  }

  private initializeEventCards(): void {
    if (!this.eventCards) return;

    this.eventCards.forEach((card) => {
      const eventElement = card as HTMLElement;
      
      // 从数据属性获取事件信息
      const eventId = eventElement.dataset.eventId || '';
      const eventTitle = eventElement.dataset.eventTitle || '';
      
      // 添加调试信息
      console.log(`Initialized event: ${eventTitle} (${eventId})`);
    });
  }

  private bindEventListeners(): void {
    // 搜索输入框事件
    if (this.searchInput) {
      this.searchInput.addEventListener('input', () => this.filterEvents());
      this.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.filterEvents();
        }
      });
    }

    // 筛选下拉框事件
    if (this.filterSelect) {
      this.filterSelect.addEventListener('change', () => this.filterEvents());
    }

    // 城市筛选下拉框事件
    if (this.cityFilterSelect) {
      this.cityFilterSelect.addEventListener('change', () => this.filterEvents());
    }

    // 清除筛选按钮事件
    if (this.clearFiltersBtn) {
      this.clearFiltersBtn.addEventListener('click', () => this.clearFilters());
    }
  }

  private filterEvents(): void {
    const searchTerm = this.searchInput?.value.toLowerCase().trim() || '';
    const filterValue = this.filterSelect?.value || 'all';
    const cityFilterValue = this.cityFilterSelect?.value || '';
    let visibleCount = 0;

    console.log('Filtering events:', { searchTerm, filterValue, cityFilterValue });

    // 使用事件数据进行过滤
    const filteredEvents = this.allEventsData.filter(event => {
      // 搜索匹配 - 支持多字段搜索
      let matchesSearch = true;
      if (searchTerm) {
        const searchFields = [
          event.title || '',
          event.location || '',
          (event.tags || []).join(' '),
          (event.cityMappings || []).join(' '),
          event.time || '',
          event.formattedDate || ''
        ];
        
        const searchText = searchFields.join(' ').toLowerCase();
        
        // 支持多关键词搜索（AND逻辑）
        const searchTerms = searchTerm.split(/\s+/).filter(term => term.length > 0);
        matchesSearch = searchTerms.every(term => searchText.includes(term));
      }

      // 状态筛选匹配
      let matchesStatusFilter = true;
      if (filterValue === 'upcoming') {
        matchesStatusFilter = event.status === 'upcoming';
      } else if (filterValue === 'past') {
        matchesStatusFilter = event.status === 'ended';
      }

      // 城市筛选匹配
      let matchesCityFilter = true;
      if (cityFilterValue) {
        matchesCityFilter = event.cityMappings && event.cityMappings.includes(cityFilterValue);
      }

      const shouldShow = matchesSearch && matchesStatusFilter && matchesCityFilter;
      
      if (shouldShow) {
        visibleCount++;
      }

      return shouldShow;
    });

    // 更新事件网格显示
    this.updateEventsGrid(filteredEvents);

    // 更新结果计数
    this.updateResultsCount(visibleCount);

    // 显示/隐藏清除按钮
    this.updateClearButton(searchTerm, filterValue, cityFilterValue);

    console.log(`Filtered to ${visibleCount} events`);
  }

  private updateEventsGrid(filteredEvents: ProcessedEvent[]): void {
    if (!this.eventsGrid) return;

    // 获取当前的事件卡片
    const currentCards = this.eventsGrid.querySelectorAll('[data-event-id]');
    
    // 显示/隐藏现有的事件卡片
    currentCards.forEach(card => {
      const eventElement = card as HTMLElement;
      const eventId = eventElement.dataset.eventId;
      
      const shouldShow = filteredEvents.some(event => event.id === eventId);
      eventElement.style.display = shouldShow ? 'block' : 'none';
    });

    // 如果需要，可以在这里添加动态创建事件卡片的逻辑
    // 但通常静态生成的卡片已经足够
  }

  private updateResultsCount(visibleCount: number): void {
    if (!this.resultsCount) return;

    const lang = document.documentElement.lang || 'zh';
    const totalCount = this.allEventsData.length;

    if (visibleCount === 0) {
      this.resultsCount.textContent = lang === 'zh' ? '未找到匹配的活动' : 'No events found';
    } else if (visibleCount === totalCount) {
      this.resultsCount.textContent = lang === 'zh' ? '显示所有活动' : 'Showing all events';
    } else {
      this.resultsCount.textContent = lang === 'zh' 
        ? `显示 ${visibleCount} 个活动` 
        : `Showing ${visibleCount} events`;
    }
  }

  private updateClearButton(searchTerm: string, filterValue: string, cityFilterValue: string): void {
    if (!this.clearFiltersBtn) return;

    const hasFilters = searchTerm || filterValue !== 'all' || cityFilterValue;
    this.clearFiltersBtn.classList.toggle('hidden', !hasFilters);
  }

  private clearFilters(): void {
    if (this.searchInput) {
      this.searchInput.value = '';
    }
    
    if (this.filterSelect) {
      this.filterSelect.value = 'all';
    }

    if (this.cityFilterSelect) {
      this.cityFilterSelect.value = '';
    }
    
    this.filterEvents();
    
    // 聚焦到搜索框
    if (this.searchInput) {
      this.searchInput.focus();
    }
  }

  // 公共方法：手动触发筛选
  public triggerFilter(): void {
    this.filterEvents();
  }

  // 公共方法：获取当前筛选状态
  public getFilterState(): { searchTerm: string; filterValue: string; cityFilterValue: string; visibleCount: number } {
    const searchTerm = this.searchInput?.value || '';
    const filterValue = this.filterSelect?.value || 'all';
    const cityFilterValue = this.cityFilterSelect?.value || '';
    
    // 计算当前可见的事件数量
    const visibleCards = this.eventsGrid?.querySelectorAll('[data-event-id]:not([style*="display: none"])');
    const visibleCount = visibleCards?.length || 0;

    return { searchTerm, filterValue, cityFilterValue, visibleCount };
  }

  // 公共方法：设置事件数据
  public setEventsData(events: ProcessedEvent[]): void {
    this.allEventsData = events;
    this.filterEvents();
  }
}

// 创建全局实例
let eventSearchManager: EventSearchManager | null = null;

// 初始化函数
export function initEventSearch(): void {
  if (!eventSearchManager) {
    eventSearchManager = new EventSearchManager();
  }
}

// 导出管理器实例（用于调试）
export function getEventSearchManager(): EventSearchManager | null {
  return eventSearchManager;
}

// 自动初始化
initEventSearch();

// 将函数暴露到全局作用域（用于调试）
declare global {
  interface Window {
    eventSearchManager: EventSearchManager | null;
    initEventSearch: () => void;
  }
}

if (typeof window !== 'undefined') {
  window.eventSearchManager = eventSearchManager;
  window.initEventSearch = initEventSearch;
}