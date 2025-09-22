/**
 * Event Performance Monitoring Utilities
 * Track and optimize performance metrics for event pages
 */

export interface PerformanceMetrics {
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  timeToInteractive: number;
  resourceLoadTimes: Record<string, number>;
}

export interface EventPageMetrics extends PerformanceMetrics {
  eventId: string;
  eventTitle: string;
  imageLoadTime: number;
  filterResponseTime: number;
  searchResponseTime: number;
}

/**
 * Performance observer for Core Web Vitals
 */
export class EventPerformanceMonitor {
  private metrics: Partial<EventPageMetrics> = {};
  private observers: PerformanceObserver[] = [];

  constructor(private eventId?: string, private eventTitle?: string) {
    if (typeof window === 'undefined') return;

    this.metrics.eventId = eventId || '';
    this.metrics.eventTitle = eventTitle || '';
    this.initializeObservers();
  }

  /**
   * Initialize performance observers
   */
  private initializeObservers(): void {
    // Observe paint metrics
    if ('PerformanceObserver' in window) {
      try {
        const paintObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              this.metrics.firstContentfulPaint = entry.startTime;
            }
          }
        });
        paintObserver.observe({ entryTypes: ['paint'] });
        this.observers.push(paintObserver);
      } catch (error) {
        console.warn('Failed to observe paint metrics:', error);
      }

      // Observe LCP
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.metrics.largestContentfulPaint = lastEntry.startTime;
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (error) {
        console.warn('Failed to observe LCP:', error);
      }

      // Observe FID
      try {
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.processingStart) {
              this.metrics.firstInputDelay = entry.processingStart - entry.startTime;
            }
          }
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      } catch (error) {
        console.warn('Failed to observe FID:', error);
      }

      // Observe CLS
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          this.metrics.cumulativeLayoutShift = clsValue;
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      } catch (error) {
        console.warn('Failed to observe CLS:', error);
      }

      // Observe resource loading
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const resource = entry as PerformanceResourceTiming;
            if (resource.name.includes('image') || resource.name.includes('.jpg') || 
                resource.name.includes('.png') || resource.name.includes('.webp')) {
              this.metrics.imageLoadTime = resource.responseEnd - resource.startTime;
            }
          }
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);
      } catch (error) {
        console.warn('Failed to observe resources:', error);
      }
    }
  }

  /**
   * Measure page load time
   */
  measurePageLoad(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        this.metrics.pageLoadTime = navigation.loadEventEnd - navigation.startTime;
        this.metrics.timeToInteractive = navigation.domInteractive - navigation.startTime;
      }
    });
  }

  /**
   * Measure filter response time
   */
  measureFilterResponse(startTime: number): void {
    this.metrics.filterResponseTime = performance.now() - startTime;
  }

  /**
   * Measure search response time
   */
  measureSearchResponse(startTime: number): void {
    this.metrics.searchResponseTime = performance.now() - startTime;
  }

  /**
   * Get current metrics
   */
  getMetrics(): Partial<EventPageMetrics> {
    return { ...this.metrics };
  }

  /**
   * Send metrics to analytics
   */
  sendMetrics(): void {
    if (typeof window === 'undefined') return;

    // Send to Google Analytics if available
    if (typeof gtag !== 'undefined') {
      const metrics = this.getMetrics();
      
      // Send Core Web Vitals
      if (metrics.largestContentfulPaint) {
        gtag('event', 'web_vitals', {
          event_category: 'Performance',
          event_label: 'LCP',
          value: Math.round(metrics.largestContentfulPaint),
          custom_map: { metric_id: 'lcp' }
        });
      }

      if (metrics.firstInputDelay) {
        gtag('event', 'web_vitals', {
          event_category: 'Performance',
          event_label: 'FID',
          value: Math.round(metrics.firstInputDelay),
          custom_map: { metric_id: 'fid' }
        });
      }

      if (metrics.cumulativeLayoutShift) {
        gtag('event', 'web_vitals', {
          event_category: 'Performance',
          event_label: 'CLS',
          value: Math.round(metrics.cumulativeLayoutShift * 1000),
          custom_map: { metric_id: 'cls' }
        });
      }

      // Send event-specific metrics
      if (metrics.eventId) {
        gtag('event', 'event_page_performance', {
          event_category: 'Events',
          event_label: metrics.eventId,
          value: Math.round(metrics.pageLoadTime || 0),
          custom_parameters: {
            event_title: metrics.eventTitle,
            image_load_time: Math.round(metrics.imageLoadTime || 0),
            filter_response_time: Math.round(metrics.filterResponseTime || 0)
          }
        });
      }
    }

    // Send to custom analytics endpoint
    this.sendToCustomAnalytics();
  }

  /**
   * Send metrics to custom analytics endpoint
   */
  private sendToCustomAnalytics(): void {
    const metrics = this.getMetrics();
    
    // Only send if we have meaningful data
    if (!metrics.pageLoadTime && !metrics.largestContentfulPaint) {
      return;
    }

    fetch('/api/analytics/performance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'event_performance',
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        metrics: metrics
      })
    }).catch(error => {
      console.warn('Failed to send performance metrics:', error);
    });
  }

  /**
   * Cleanup observers
   */
  cleanup(): void {
    this.observers.forEach(observer => {
      try {
        observer.disconnect();
      } catch (error) {
        console.warn('Failed to disconnect observer:', error);
      }
    });
    this.observers = [];
  }
}

/**
 * Global performance monitor instance
 */
let globalPerformanceMonitor: EventPerformanceMonitor | null = null;

/**
 * Initialize performance monitoring for event pages
 */
export function initializeEventPerformanceMonitoring(eventId?: string, eventTitle?: string): EventPerformanceMonitor {
  if (typeof window === 'undefined') {
    return new EventPerformanceMonitor();
  }

  if (globalPerformanceMonitor) {
    globalPerformanceMonitor.cleanup();
  }

  globalPerformanceMonitor = new EventPerformanceMonitor(eventId, eventTitle);
  globalPerformanceMonitor.measurePageLoad();

  // Send metrics when page is about to unload
  window.addEventListener('beforeunload', () => {
    globalPerformanceMonitor?.sendMetrics();
  });

  // Send metrics after a delay to capture most interactions
  setTimeout(() => {
    globalPerformanceMonitor?.sendMetrics();
  }, 10000);

  return globalPerformanceMonitor;
}

/**
 * Measure and report image loading performance
 */
export function measureImageLoadPerformance(imageElement: HTMLImageElement, eventId?: string): void {
  const startTime = performance.now();
  
  const onLoad = () => {
    const loadTime = performance.now() - startTime;
    
    if (typeof gtag !== 'undefined') {
      gtag('event', 'image_load_performance', {
        event_category: 'Performance',
        event_label: eventId || 'unknown',
        value: Math.round(loadTime),
        custom_parameters: {
          image_src: imageElement.src,
          image_width: imageElement.naturalWidth,
          image_height: imageElement.naturalHeight
        }
      });
    }
    
    cleanup();
  };

  const onError = () => {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'image_load_error', {
        event_category: 'Performance',
        event_label: eventId || 'unknown',
        custom_parameters: {
          image_src: imageElement.src
        }
      });
    }
    
    cleanup();
  };

  const cleanup = () => {
    imageElement.removeEventListener('load', onLoad);
    imageElement.removeEventListener('error', onError);
  };

  imageElement.addEventListener('load', onLoad);
  imageElement.addEventListener('error', onError);
}

/**
 * Performance budget checker
 */
export function checkPerformanceBudget(metrics: Partial<EventPageMetrics>): {
  passed: boolean;
  violations: string[];
  score: number;
} {
  const violations: string[] = [];
  let score = 100;

  // LCP should be under 2.5s
  if (metrics.largestContentfulPaint && metrics.largestContentfulPaint > 2500) {
    violations.push(`LCP too slow: ${Math.round(metrics.largestContentfulPaint)}ms (target: <2500ms)`);
    score -= 20;
  }

  // FID should be under 100ms
  if (metrics.firstInputDelay && metrics.firstInputDelay > 100) {
    violations.push(`FID too slow: ${Math.round(metrics.firstInputDelay)}ms (target: <100ms)`);
    score -= 15;
  }

  // CLS should be under 0.1
  if (metrics.cumulativeLayoutShift && metrics.cumulativeLayoutShift > 0.1) {
    violations.push(`CLS too high: ${metrics.cumulativeLayoutShift.toFixed(3)} (target: <0.1)`);
    score -= 15;
  }

  // Page load should be under 3s
  if (metrics.pageLoadTime && metrics.pageLoadTime > 3000) {
    violations.push(`Page load too slow: ${Math.round(metrics.pageLoadTime)}ms (target: <3000ms)`);
    score -= 10;
  }

  // Image load should be under 1s
  if (metrics.imageLoadTime && metrics.imageLoadTime > 1000) {
    violations.push(`Image load too slow: ${Math.round(metrics.imageLoadTime)}ms (target: <1000ms)`);
    score -= 10;
  }

  return {
    passed: violations.length === 0,
    violations,
    score: Math.max(0, score)
  };
}

/**
 * Get performance recommendations
 */
export function getPerformanceRecommendations(metrics: Partial<EventPageMetrics>): string[] {
  const recommendations: string[] = [];
  
  if (metrics.largestContentfulPaint && metrics.largestContentfulPaint > 2500) {
    recommendations.push('优化图片大小和格式，使用WebP或AVIF格式');
    recommendations.push('启用图片懒加载，优先加载关键图片');
    recommendations.push('使用CDN加速图片加载');
  }

  if (metrics.firstInputDelay && metrics.firstInputDelay > 100) {
    recommendations.push('减少JavaScript执行时间');
    recommendations.push('使用Web Workers处理复杂计算');
    recommendations.push('延迟加载非关键JavaScript');
  }

  if (metrics.cumulativeLayoutShift && metrics.cumulativeLayoutShift > 0.1) {
    recommendations.push('为图片和广告预留空间');
    recommendations.push('避免在现有内容上方插入内容');
    recommendations.push('使用transform动画而不是改变布局属性');
  }

  if (metrics.pageLoadTime && metrics.pageLoadTime > 3000) {
    recommendations.push('启用Gzip压缩');
    recommendations.push('优化CSS和JavaScript文件大小');
    recommendations.push('使用浏览器缓存');
  }

  return recommendations;
}