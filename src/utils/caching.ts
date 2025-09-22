/**
 * 缓存和预加载策略
 */

// 缓存管理器
export class CacheManager {
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5分钟

  set(key: string, data: any, ttl: number = this.DEFAULT_TTL) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear() {
    this.cache.clear();
  }

  // 清理过期缓存
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// 全局缓存实例
export const globalCache = new CacheManager();

// 定期清理缓存
if (typeof window !== 'undefined') {
  setInterval(() => {
    globalCache.cleanup();
  }, 60000); // 每分钟清理一次
}

// 资源预加载器
export class ResourcePreloader {
  private preloadedResources: Set<string> = new Set();

  // 预加载关键资源
  preloadCriticalResources() {
    const basePath = import.meta.env.BASE_URL || '/';
    const processPath = (path: string) => {
      const normalizedBasePath = basePath.endsWith('/') ? basePath : basePath + '/';
      const cleanPath = path.startsWith('/') ? path.slice(1) : path;
      return normalizedBasePath + cleanPath;
    };
    
    const criticalResources = [
      processPath('/images/hero-bg.webp'),
      processPath('/images/aws-logo.webp'),
      processPath('/cities'),
      processPath('/en/cities')
    ];

    criticalResources.forEach(resource => {
      this.preloadResource(resource);
    });
  }

  // 预加载单个资源
  preloadResource(url: string, type: 'image' | 'document' | 'script' | 'style' = 'document') {
    if (this.preloadedResources.has(url)) return;

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    
    if (type !== 'document') {
      link.as = type;
    }

    document.head.appendChild(link);
    this.preloadedResources.add(url);
  }

  // 智能预加载（基于用户行为）
  intelligentPreload() {
    // 预加载可能访问的页面
    this.observeUserBehavior();
    
    // 预加载下一页内容
    this.preloadNextPage();
    
    // 预加载热门城市
    this.preloadPopularCities();
  }

  private observeUserBehavior() {
    // 监听鼠标悬停，预加载链接
    document.addEventListener('mouseover', (e) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement;
      
      if (link && link.hostname === window.location.hostname) {
        this.preloadResource(link.href);
      }
    });

    // 监听滚动，预加载即将进入视口的内容
    let scrollTimeout: NodeJS.Timeout;
    document.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.preloadVisibleContent();
      }, 100);
    });
  }

  private preloadNextPage() {
    const currentPath = window.location.pathname;
    const basePath = import.meta.env.BASE_URL || '/';
    const processPath = (path: string) => {
      const normalizedBasePath = basePath.endsWith('/') ? basePath : basePath + '/';
      const cleanPath = path.startsWith('/') ? path.slice(1) : path;
      return normalizedBasePath + cleanPath;
    };
    
    // 根据当前页面预测下一页
    if (currentPath === '/' || currentPath === '/en') {
      this.preloadResource(processPath('/cities'));
      this.preloadResource(processPath('/en/cities'));
    } else if (currentPath.includes('/cities') && !currentPath.includes('/cities/')) {
      // 在城市列表页，预加载热门城市详情页
      const popularCities = ['beijing', 'shanghai', 'shenzhen'];
      popularCities.forEach(city => {
        this.preloadResource(processPath(`/cities/${city}`));
        this.preloadResource(processPath(`/en/cities/${city}`));
      });
    }
  }

  private preloadPopularCities() {
    const basePath = import.meta.env.BASE_URL || '/';
    const processPath = (path: string) => {
      const normalizedBasePath = basePath.endsWith('/') ? basePath : basePath + '/';
      const cleanPath = path.startsWith('/') ? path.slice(1) : path;
      return normalizedBasePath + cleanPath;
    };
    
    // 预加载热门城市的图片
    const popularCityImages = [
      processPath('/images/cities/beijing.webp'),
      processPath('/images/cities/shanghai.webp'),
      processPath('/images/cities/shenzhen.webp'),
      processPath('/images/cities/guangzhou.webp')
    ];

    popularCityImages.forEach(image => {
      this.preloadResource(image, 'image');
    });
  }

  private preloadVisibleContent() {
    const cityCards = document.querySelectorAll('.city-card');
    const viewportHeight = window.innerHeight;
    const scrollTop = window.scrollY;

    cityCards.forEach(card => {
      const rect = card.getBoundingClientRect();
      const cardTop = rect.top + scrollTop;
      
      // 如果卡片即将进入视口（提前200px）
      if (cardTop < scrollTop + viewportHeight + 200) {
        const link = card.querySelector('a[href]') as HTMLAnchorElement;
        if (link) {
          this.preloadResource(link.href);
        }

        const img = card.querySelector('img[data-src]') as HTMLImageElement;
        if (img) {
          this.preloadResource(img.dataset.src!, 'image');
        }
      }
    });
  }
}

// Service Worker 缓存策略
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    const swPath = `${import.meta.env.BASE_URL || '/'}sw.js`;
    navigator.serviceWorker.register(swPath)
      .then(registration => {
        console.log('Service Worker registered:', registration);
      })
      .catch(error => {
        console.log('Service Worker registration failed:', error);
      });
  }
}

// 本地存储缓存
export class LocalStorageCache {
  protected prefix = 'cnusergroup_';

  set(key: string, data: any, ttl: number = 24 * 60 * 60 * 1000) {
    try {
      const item = {
        data,
        timestamp: Date.now(),
        ttl
      };
      localStorage.setItem(this.prefix + key, JSON.stringify(item));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  get(key: string): any | null {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (!item) return null;

      const parsed = JSON.parse(item);
      const now = Date.now();

      if (now - parsed.timestamp > parsed.ttl) {
        this.remove(key);
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
      return null;
    }
  }

  remove(key: string) {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  }

  clear() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }
}

// 网络状态感知缓存
export class NetworkAwareCache extends LocalStorageCache {
  private isOnline = navigator.onLine;

  constructor() {
    super();
    this.setupNetworkListeners();
  }

  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncWhenOnline();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // 网络恢复时同步数据
  private syncWhenOnline() {
    // 清理过期的离线缓存
    this.cleanupOfflineCache();
    
    // 重新获取关键数据
    this.refreshCriticalData();
  }

  private cleanupOfflineCache() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix + 'offline_')) {
        this.remove(key.replace(this.prefix, ''));
      }
    });
  }
  
  public getPrefix(): string {
    return this.prefix;
  }

  private refreshCriticalData() {
    // API 功能已禁用，使用静态数据
    console.log('Data refresh disabled for static site');
  }

  // 智能缓存策略
  smartSet(key: string, data: any, options: {
    ttl?: number;
    priority?: 'high' | 'medium' | 'low';
    networkDependent?: boolean;
  } = {}) {
    const { ttl = 24 * 60 * 60 * 1000, priority = 'medium', networkDependent = false } = options;

    // 根据网络状态调整缓存策略
    if (!this.isOnline && networkDependent) {
      // 离线时使用更长的缓存时间
      this.set(`offline_${key}`, data, ttl * 7); // 7倍缓存时间
    } else {
      this.set(key, data, ttl);
    }

    // 高优先级数据额外备份
    if (priority === 'high') {
      this.set(`backup_${key}`, data, ttl * 2);
    }
  }

  smartGet(key: string): any | null {
    // 首先尝试获取正常缓存
    let data = this.get(key);
    
    // 如果没有，尝试离线缓存
    if (!data && !this.isOnline) {
      data = this.get(`offline_${key}`);
    }
    
    // 最后尝试备份缓存
    if (!data) {
      data = this.get(`backup_${key}`);
    }
    
    return data;
  }
}

// 全局实例
export const localCache = new LocalStorageCache();
export const networkCache = new NetworkAwareCache();
export const preloader = new ResourcePreloader();

// 初始化缓存系统
export function initializeCaching() {
  // 注册 Service Worker
  registerServiceWorker();
  
  // 启动智能预加载
  preloader.intelligentPreload();
  
  // 预加载关键资源
  preloader.preloadCriticalResources();
  
  // 定期清理缓存
  setInterval(() => {
    globalCache.cleanup();
  }, 5 * 60 * 1000); // 每5分钟清理一次
}