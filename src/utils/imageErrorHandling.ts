/**
 * 图片错误处理工具
 */

// 获取基础路径
function getBasePath(): string {
  return import.meta.env.BASE_URL || '/';
}

// 处理图片路径，确保包含正确的 base path
function processImagePath(path: string): string {
  const basePath = getBasePath();
  // 如果路径已经包含 base path，直接返回
  if (path.startsWith(basePath)) {
    return path;
  }
  // 确保 basePath 以 / 结尾
  const normalizedBasePath = basePath.endsWith('/') ? basePath : basePath + '/';
  // 移除开头的 / 并添加 base path
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return normalizedBasePath + cleanPath;
}

export interface FallbackImageConfig {
  cities: {
    pc: string;
    mobile: string;
  };
  ui: {
    decoration: string;
    hero: string;
    card: string;
  };
  icons: {
    default: string;
    social: string;
  };
  qr: {
    default: string;
  };
}

export const fallbackImages: FallbackImageConfig = {
  cities: {
    pc: processImagePath('/images/cities/fallback-city.svg'),
    mobile: processImagePath('/images/cities/fallback-city-mobile.svg')
  },
  ui: {
    decoration: processImagePath('/images/ui/fallback-decoration.svg'),
    hero: processImagePath('/images/ui/fallback-hero.svg'),
    card: processImagePath('/images/ui/fallback-card.svg')
  },
  icons: {
    default: processImagePath('/images/icons/fallback-icon.svg'),
    social: processImagePath('/images/icons/fallback-social.svg')
  },
  qr: {
    default: processImagePath('/images/qr/fallback-qr.svg')
  }
};

/**
 * 根据图片路径确定图片类型
 */
export function getImageType(src: string): keyof FallbackImageConfig {
  if (src.includes('/cities/')) return 'cities';
  if (src.includes('/ui/')) return 'ui';
  if (src.includes('/icons/')) return 'icons';
  if (src.includes('/qr/')) return 'qr';
  return 'ui'; // 默认类型
}

/**
 * 获取备用图片URL
 */
export function getFallbackImage(src: string): string {
  const type = getImageType(src);
  
  switch (type) {
    case 'cities':
      return src.includes('-mobile') 
        ? fallbackImages.cities.mobile 
        : fallbackImages.cities.pc;
    case 'ui':
      if (src.includes('hero')) return fallbackImages.ui.hero;
      if (src.includes('card')) return fallbackImages.ui.card;
      return fallbackImages.ui.decoration;
    case 'icons':
      return src.includes('social') 
        ? fallbackImages.icons.social 
        : fallbackImages.icons.default;
    case 'qr':
      return fallbackImages.qr.default;
    default:
      return processImagePath('/images/fallback-generic.png');
  }
}

/**
 * 生成图片的alt文本
 */
export function generateAltText(src: string, cityName?: string, lang: string = 'zh'): string {
  const type = getImageType(src);
  const filename = src.split('/').pop()?.replace(/\.(png|jpg|jpeg|webp)$/i, '') || '';
  
  switch (type) {
    case 'cities':
      return cityName 
        ? (lang === 'zh' ? `${cityName}用户组` : `${cityName} User Group`)
        : (lang === 'zh' ? '城市用户组' : 'City User Group');
    case 'ui':
      if (filename.includes('hero')) {
        return lang === 'zh' ? '主页横幅背景' : 'Hero banner background';
      }
      if (filename.includes('decoration')) {
        return lang === 'zh' ? '装饰图片' : 'Decorative image';
      }
      return lang === 'zh' ? 'UI装饰元素' : 'UI decoration element';
    case 'icons':
      const iconNames: Record<string, { zh: string; en: string }> = {
        user: { zh: '用户图标', en: 'User icon' },
        volunteer: { zh: '志愿者图标', en: 'Volunteer icon' },
        teacher: { zh: '讲师图标', en: 'Teacher icon' },
        certificate: { zh: '证书图标', en: 'Certificate icon' },
        wechat: { zh: '微信图标', en: 'WeChat icon' },
        weibo: { zh: '微博图标', en: 'Weibo icon' },
        tiktok: { zh: '抖音图标', en: 'TikTok icon' },
        bilibili: { zh: 'B站图标', en: 'Bilibili icon' },
        xiaohongshu: { zh: '小红书图标', en: 'Xiaohongshu icon' },
        'free-cloud': { zh: '免费云服务图标', en: 'Free cloud service icon' },
        pytorch: { zh: 'PyTorch图标', en: 'PyTorch icon' }
      };
      
      for (const [key, names] of Object.entries(iconNames)) {
        if (filename.includes(key)) {
          return names[lang as keyof typeof names];
        }
      }
      return lang === 'zh' ? '图标' : 'Icon';
    case 'qr':
      return lang === 'zh' ? '微信公众号二维码' : 'WeChat Official Account QR Code';
    default:
      return lang === 'zh' ? '图片' : 'Image';
  }
}

/**
 * 处理图片加载错误
 */
export function handleImageError(event: Event): void {
  const target = event.target as HTMLImageElement;
  if (!target) return;
  
  // 防止无限循环
  if (target.dataset.fallbackAttempted === 'true') {
    console.warn('Fallback image also failed to load:', target.src);
    return;
  }
  
  const originalSrc = target.src;
  const fallbackSrc = getFallbackImage(originalSrc);
  
  target.dataset.fallbackAttempted = 'true';
  target.src = fallbackSrc;
  
  console.warn(`Image failed to load: ${originalSrc}, using fallback: ${fallbackSrc}`);
}

/**
 * 创建图片加载观察器
 */
export function createImageObserver(
  callback: IntersectionObserverCallback,
  options: IntersectionObserverInit = {}
): IntersectionObserver {
  const defaultOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1,
    ...options
  };
  
  return new IntersectionObserver(callback, defaultOptions);
}