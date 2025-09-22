/**
 * 图片优化工具
 */

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpg' | 'png';
  lazy?: boolean;
}

export interface DeviceSpecificSizes {
  mobile: string;
  tablet: string;
  desktop: string;
}

/**
 * 获取优化后的图片URL
 */
export function getOptimizedImageUrl(
  src: string, 
  options: ImageOptimizationOptions = {}
): string {
  // 在生产环境中，这里可以集成图片CDN或优化服务
  // 目前返回原始URL
  return src;
}

/**
 * 获取设备特定的图片尺寸
 */
export function getDeviceSpecificSizes(baseWidth: number): DeviceSpecificSizes {
  return {
    mobile: `${Math.round(baseWidth * 0.5)}px`,
    tablet: `${Math.round(baseWidth * 0.75)}px`,
    desktop: `${baseWidth}px`
  };
}

/**
 * 生成响应式图片的 srcset
 */
export function generateSrcSet(src: string, sizes: number[]): string {
  return sizes
    .map(size => `${getOptimizedImageUrl(src, { width: size })} ${size}w`)
    .join(', ');
}

/**
 * 获取图片的占位符
 */
export function getImagePlaceholder(width: number, height: number): string {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14" 
            fill="#9ca3af" text-anchor="middle" dy=".3em">Loading...</text>
    </svg>
  `;
  
  // Use encodeURIComponent instead of btoa to handle Unicode characters
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * 检查浏览器是否支持WebP格式
 */
export function supportsWebP(): Promise<boolean> {
  return new Promise((resolve) => {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
}

/**
 * 检查浏览器是否支持AVIF格式
 */
export function supportsAVIF(): Promise<boolean> {
  return new Promise((resolve) => {
    const avif = new Image();
    avif.onload = avif.onerror = () => {
      resolve(avif.height === 2);
    };
    avif.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';
  });
}