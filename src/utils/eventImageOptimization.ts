/**
 * Event Image Optimization Utilities
 * Specialized image optimization for event images
 */

import { getOptimizedImageUrl, generateSrcSet, getImagePlaceholder } from './imageOptimization.js';

export interface EventImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  lazy?: boolean;
  placeholder?: boolean;
}

/**
 * Standard event image sizes for different contexts
 */
export const EVENT_IMAGE_SIZES = {
  thumbnail: { width: 300, height: 200 },
  card: { width: 400, height: 250 },
  hero: { width: 800, height: 400 },
  detail: { width: 1200, height: 600 }
} as const;

/**
 * Get optimized event image URL with fallback
 */
export function getEventImageUrl(
  originalUrl: string, 
  size: keyof typeof EVENT_IMAGE_SIZES = 'card',
  options: EventImageOptions = {}
): string {
  if (!originalUrl) {
    return getEventImagePlaceholder(size);
  }

  const { width, height } = EVENT_IMAGE_SIZES[size];
  
  return getOptimizedImageUrl(originalUrl, {
    width: options.width || width,
    height: options.height || height,
    quality: options.quality || 85,
    format: 'webp'
  });
}

/**
 * Generate responsive srcset for event images
 */
export function getEventImageSrcSet(
  originalUrl: string,
  size: keyof typeof EVENT_IMAGE_SIZES = 'card'
): string {
  if (!originalUrl) {
    return '';
  }

  const { width } = EVENT_IMAGE_SIZES[size];
  const sizes = [width, width * 1.5, width * 2]; // 1x, 1.5x, 2x for retina displays
  
  return generateSrcSet(originalUrl, sizes);
}

/**
 * Get event image placeholder
 */
export function getEventImagePlaceholder(
  size: keyof typeof EVENT_IMAGE_SIZES = 'card'
): string {
  const { width, height } = EVENT_IMAGE_SIZES[size];
  return getImagePlaceholder(width, height);
}

/**
 * Generate event image alt text for accessibility
 */
export function generateEventImageAlt(
  eventTitle: string,
  eventLocation?: string,
  locale: 'zh' | 'en' = 'zh'
): string {
  const templates = {
    zh: {
      withLocation: `${eventTitle} - ${eventLocation} 活动图片`,
      withoutLocation: `${eventTitle} 活动图片`
    },
    en: {
      withLocation: `${eventTitle} - ${eventLocation} event image`,
      withoutLocation: `${eventTitle} event image`
    }
  };

  const template = templates[locale];
  return eventLocation ? template.withLocation : template.withoutLocation;
}

/**
 * Preload critical event images
 */
export function preloadEventImages(imageUrls: string[]): void {
  if (typeof window === 'undefined') return;

  imageUrls.slice(0, 3).forEach(url => {
    if (url) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = getEventImageUrl(url, 'card');
      document.head.appendChild(link);
    }
  });
}

/**
 * Lazy load event images with intersection observer
 */
export function setupEventImageLazyLoading(): void {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return;
  }

  const imageObserver = new IntersectionObserver((entries, observer) => {
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

        img.classList.remove('lazy-loading');
        img.classList.add('lazy-loaded');
        observer.unobserve(img);
      }
    });
  }, {
    rootMargin: '50px 0px',
    threshold: 0.01
  });

  // Observe all lazy images
  document.querySelectorAll('img[data-src]').forEach(img => {
    imageObserver.observe(img);
  });
}

/**
 * Handle image loading errors with fallback
 */
export function handleEventImageError(
  img: HTMLImageElement,
  size: keyof typeof EVENT_IMAGE_SIZES = 'card'
): void {
  img.src = getEventImagePlaceholder(size);
  img.alt = img.alt || '图片加载失败';
  img.classList.add('image-error');
}

/**
 * Optimize event images for performance
 */
export function optimizeEventImages(): void {
  if (typeof window === 'undefined') return;

  // Setup lazy loading
  setupEventImageLazyLoading();

  // Add error handling to all event images
  document.querySelectorAll('img[data-event-image]').forEach(img => {
    const imageElement = img as HTMLImageElement;
    const size = (imageElement.dataset.size as keyof typeof EVENT_IMAGE_SIZES) || 'card';
    
    imageElement.addEventListener('error', () => {
      handleEventImageError(imageElement, size);
    });
  });

  // Preload critical images
  const criticalImages = Array.from(document.querySelectorAll('img[data-critical]'))
    .map(img => (img as HTMLImageElement).src || (img as HTMLImageElement).dataset.src)
    .filter(Boolean) as string[];
    
  preloadEventImages(criticalImages);
}

/**
 * Generate WebP and AVIF sources for modern browsers
 */
export function generateModernImageSources(
  originalUrl: string,
  size: keyof typeof EVENT_IMAGE_SIZES = 'card'
): Array<{ type: string; srcset: string }> {
  if (!originalUrl) return [];

  const { width } = EVENT_IMAGE_SIZES[size];
  const sizes = [width, width * 1.5, width * 2];

  return [
    {
      type: 'image/avif',
      srcset: sizes.map(s => `${getOptimizedImageUrl(originalUrl, { width: s, format: 'avif' })} ${s}w`).join(', ')
    },
    {
      type: 'image/webp',
      srcset: sizes.map(s => `${getOptimizedImageUrl(originalUrl, { width: s, format: 'webp' })} ${s}w`).join(', ')
    }
  ];
}