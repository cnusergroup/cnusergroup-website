/**
 * 性能优化工具函数
 */

// 预加载关键资源
export function preloadCriticalResources() {
  if (typeof window === 'undefined') return;

  // 预加载关键字体
  const fontLink = document.createElement('link');
  fontLink.rel = 'preload';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
  fontLink.as = 'style';
  fontLink.crossOrigin = 'anonymous';
  document.head.appendChild(fontLink);

  // 预加载关键图片
  const basePath = import.meta.env.BASE_URL || '/';
  const processPath = (path: string) => {
    const normalizedBasePath = basePath.endsWith('/') ? basePath : basePath + '/';
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return normalizedBasePath + cleanPath;
  };
  
  const criticalImages = [
    processPath('/images/hero-bg.webp'),
    processPath('/images/aws-logo.webp')
  ];

  criticalImages.forEach(src => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = src;
    link.as = 'image';
    document.head.appendChild(link);
  });
}

// 懒加载图片观察器
export function createImageObserver() {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return null;
  }

  return new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        const src = img.dataset.src;
        const srcset = img.dataset.srcset;

        if (src) {
          img.src = src;
          img.removeAttribute('data-src');
        }

        if (srcset) {
          img.srcset = srcset;
          img.removeAttribute('data-srcset');
        }

        img.classList.remove('lazy');
        img.classList.add('loaded');
      }
    });
  }, {
    rootMargin: '50px 0px',
    threshold: 0.01
  });
}

// 代码分割动态导入
export async function loadComponent(componentName: string) {
  try {
    switch (componentName) {
      case 'WeChatQRModal':
        return await import('../components/ui/WeChatQRModal.astro');
      case 'SocialShare':
        return await import('../components/ui/SocialShare.astro');
      default:
        throw new Error(`Unknown component: ${componentName}`);
    }
  } catch (error) {
    console.error(`Failed to load component ${componentName}:`, error);
    return null;
  }
}

// 防抖函数
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// 节流函数
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// 检测网络连接质量
export function getNetworkInfo() {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return { effectiveType: '4g', saveData: false };
  }

  const connection = (navigator as any).connection;
  return {
    effectiveType: connection.effectiveType || '4g',
    saveData: connection.saveData || false,
    downlink: connection.downlink || 10
  };
}

// 根据网络状况调整图片质量
export function getOptimalImageQuality(): 'low' | 'medium' | 'high' {
  const { effectiveType, saveData } = getNetworkInfo();

  if (saveData || effectiveType === 'slow-2g' || effectiveType === '2g') {
    return 'low';
  }

  if (effectiveType === '3g') {
    return 'medium';
  }

  return 'high';
}

// 预连接到外部域名
export function preconnectToDomains() {
  if (typeof document === 'undefined') return;

  const domains = [
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
    'https://www.google-analytics.com'
  ];

  domains.forEach(domain => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = domain;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
}

// 资源提示
export function addResourceHints() {
  if (typeof document === 'undefined') return;

  // DNS 预解析
  const dnsPreconnect = document.createElement('link');
  dnsPreconnect.rel = 'dns-prefetch';
  dnsPreconnect.href = '//fonts.googleapis.com';
  document.head.appendChild(dnsPreconnect);

  // 预加载下一页可能需要的资源
  const basePath = import.meta.env.BASE_URL || '/';
  const processPath = (path: string) => {
    const normalizedBasePath = basePath.endsWith('/') ? basePath : basePath + '/';
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return normalizedBasePath + cleanPath;
  };
  
  const prefetchLink = document.createElement('link');
  prefetchLink.rel = 'prefetch';
  prefetchLink.href = processPath('/cities');
  document.head.appendChild(prefetchLink);
}

// 监控性能指标
export function trackPerformanceMetrics() {
  if (typeof window === 'undefined' || !('performance' in window)) return;

  // 监控 Core Web Vitals
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (entry.entryType === 'largest-contentful-paint') {
        console.log('LCP:', entry.startTime);
      }

      if (entry.entryType === 'first-input') {
        console.log('FID:', (entry.processingStart || 0) - entry.startTime);
      }

      if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
        console.log('CLS:', (entry as any).value);
      }
    });
  });

  observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
}

// 优化字体加载
export function optimizeFontLoading() {
  if (typeof document === 'undefined') return;

  // 使用 font-display: swap 优化字体加载
  const style = document.createElement('style');
  style.textContent = `
    @font-face {
      font-family: 'Inter';
      font-style: normal;
      font-weight: 400;
      font-display: swap;
      src: url('https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2') format('woff2');
    }
  `;
  document.head.appendChild(style);
}