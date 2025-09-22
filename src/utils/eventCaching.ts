/**
 * Event Caching Utilities
 * Implement caching strategies for event data and images
 */

export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum cache size
  strategy: 'lru' | 'fifo' | 'lfu'; // Cache eviction strategy
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * In-memory cache implementation with configurable eviction strategies
 */
export class EventCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      ttl: 5 * 60 * 1000, // 5 minutes default
      maxSize: 100,
      strategy: 'lru',
      ...config
    };
  }

  /**
   * Get item from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.config.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update access statistics
    entry.lastAccessed = Date.now();
    entry.accessCount++;

    return entry.data;
  }

  /**
   * Set item in cache
   */
  set(key: string, data: T): void {
    // Check if we need to evict items
    if (this.cache.size >= this.config.maxSize) {
      this.evict();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now()
    };

    this.cache.set(key, entry);
  }

  /**
   * Check if key exists in cache and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Clear expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    oldestEntry: number;
  } {
    let totalAccess = 0;
    let oldestTimestamp = Date.now();

    for (const entry of this.cache.values()) {
      totalAccess += entry.accessCount;
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: totalAccess / Math.max(this.cache.size, 1),
      oldestEntry: Date.now() - oldestTimestamp
    };
  }

  /**
   * Evict items based on configured strategy
   */
  private evict(): void {
    if (this.cache.size === 0) return;

    let keyToEvict: string;

    switch (this.config.strategy) {
      case 'lru': // Least Recently Used
        keyToEvict = this.findLRUKey();
        break;
      case 'lfu': // Least Frequently Used
        keyToEvict = this.findLFUKey();
        break;
      case 'fifo': // First In, First Out
      default:
        keyToEvict = this.findFIFOKey();
        break;
    }

    this.cache.delete(keyToEvict);
  }

  private findLRUKey(): string {
    let lruKey = '';
    let oldestAccess = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed;
        lruKey = key;
      }
    }

    return lruKey;
  }

  private findLFUKey(): string {
    let lfuKey = '';
    let lowestCount = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessCount < lowestCount) {
        lowestCount = entry.accessCount;
        lfuKey = key;
      }
    }

    return lfuKey;
  }

  private findFIFOKey(): string {
    let fifoKey = '';
    let oldestTimestamp = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        fifoKey = key;
      }
    }

    return fifoKey;
  }
}

/**
 * Global event cache instances
 */
export const eventDataCache = new EventCache({
  ttl: 10 * 60 * 1000, // 10 minutes for event data
  maxSize: 200,
  strategy: 'lru'
});

export const eventImageCache = new EventCache({
  ttl: 30 * 60 * 1000, // 30 minutes for images
  maxSize: 50,
  strategy: 'lfu'
});

export const eventStatsCache = new EventCache({
  ttl: 5 * 60 * 1000, // 5 minutes for statistics
  maxSize: 10,
  strategy: 'fifo'
});

/**
 * Browser storage cache for persistent caching
 */
export class BrowserStorageCache {
  private storage: Storage;
  private prefix: string;

  constructor(type: 'localStorage' | 'sessionStorage' = 'localStorage', prefix = 'event_cache_') {
    if (typeof window === 'undefined') {
      throw new Error('BrowserStorageCache can only be used in browser environment');
    }
    
    this.storage = window[type];
    this.prefix = prefix;
  }

  /**
   * Get item from browser storage
   */
  get<T>(key: string): T | null {
    try {
      const item = this.storage.getItem(this.prefix + key);
      if (!item) return null;

      const parsed = JSON.parse(item);
      
      // Check expiration
      if (parsed.expires && Date.now() > parsed.expires) {
        this.storage.removeItem(this.prefix + key);
        return null;
      }

      return parsed.data;
    } catch {
      return null;
    }
  }

  /**
   * Set item in browser storage with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    try {
      const item = {
        data,
        expires: ttl ? Date.now() + ttl : null,
        timestamp: Date.now()
      };

      this.storage.setItem(this.prefix + key, JSON.stringify(item));
    } catch (error) {
      // Handle storage quota exceeded
      console.warn('Failed to cache item in browser storage:', error);
      this.cleanup();
    }
  }

  /**
   * Remove item from storage
   */
  remove(key: string): void {
    this.storage.removeItem(this.prefix + key);
  }

  /**
   * Clean up expired items
   */
  cleanup(): void {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && key.startsWith(this.prefix)) {
        try {
          const item = JSON.parse(this.storage.getItem(key) || '{}');
          if (item.expires && Date.now() > item.expires) {
            keysToRemove.push(key);
          }
        } catch {
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => this.storage.removeItem(key));
  }

  /**
   * Clear all cached items
   */
  clear(): void {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => this.storage.removeItem(key));
  }
}

/**
 * Cache management utilities
 */
export function initializeEventCaching(): void {
  if (typeof window === 'undefined') return;

  // Clean up caches periodically
  setInterval(() => {
    eventDataCache.cleanup();
    eventImageCache.cleanup();
    eventStatsCache.cleanup();
  }, 5 * 60 * 1000); // Every 5 minutes

  // Clean up browser storage on page load
  try {
    const browserCache = new BrowserStorageCache();
    browserCache.cleanup();
  } catch (error) {
    console.warn('Failed to initialize browser storage cache:', error);
  }
}

/**
 * Cached fetch function for event data
 */
export async function cachedFetch<T>(
  url: string,
  options: RequestInit = {},
  ttl: number = 5 * 60 * 1000
): Promise<T> {
  const cacheKey = `fetch_${url}_${JSON.stringify(options)}`;
  
  // Try memory cache first
  const cached = eventDataCache.get(cacheKey);
  if (cached) {
    return cached as T;
  }

  // Try browser storage cache
  if (typeof window !== 'undefined') {
    try {
      const browserCache = new BrowserStorageCache();
      const browserCached = browserCache.get<T>(cacheKey);
      if (browserCached) {
        eventDataCache.set(cacheKey, browserCached);
        return browserCached;
      }
    } catch {
      // Ignore browser storage errors
    }
  }

  // Fetch fresh data
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Cache the result
    eventDataCache.set(cacheKey, data);
    
    if (typeof window !== 'undefined') {
      try {
        const browserCache = new BrowserStorageCache();
        browserCache.set(cacheKey, data, ttl);
      } catch {
        // Ignore browser storage errors
      }
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch data:', error);
    throw error;
  }
}

/**
 * Preload and cache critical event data
 */
export function preloadEventData(eventIds: string[]): void {
  if (typeof window === 'undefined') return;

  eventIds.forEach(async (eventId) => {
    try {
      await cachedFetch(`/api/events/${eventId}`, {}, 10 * 60 * 1000);
    } catch {
      // Ignore preload errors
    }
  });
}