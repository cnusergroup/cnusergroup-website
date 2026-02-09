import imageConfig from '../data/images.json';
import { getOptimizedImageUrl, getDeviceSpecificSizes } from './imageOptimization';

// 获取基础路径
function getBasePath(): string {
  // 在构建时使用环境变量或配置
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

// 图片类型定义
export type ImageCategory = 'cities' | 'ui' | 'icons' | 'qr';
export type DeviceType = 'pc' | 'mobile';

// 获取城市图片
export function getCityImage(cityId: string, device: DeviceType = 'pc', optimized: boolean = true): string {
  const cityImages = imageConfig.cities[cityId as keyof typeof imageConfig.cities];
  let imagePath: string;

  if (cityImages && cityImages[device]) {
    imagePath = cityImages[device];
  } else {
    // 回退到默认图片
    imagePath = `/images/cities/default-${device}.png`;
  }

  // 处理路径以包含正确的 base path
  imagePath = processImagePath(imagePath);

  // 如果需要优化，返回优化后的 URL
  if (optimized) {
    const width = device === 'mobile' ? 640 : 1024;
    return getOptimizedImageUrl(imagePath, { width, quality: 85, format: 'webp' });
  }

  return imagePath;
}

// 获取UI图片
export function getUIImage(imageName: string): string {
  const uiImages = imageConfig.ui as Record<string, string>;
  const imagePath = uiImages[imageName] || `/images/ui/${imageName}.png`;
  return processImagePath(imagePath);
}

// 获取图标
export function getIcon(iconName: string): string {
  const icons = imageConfig.icons as Record<string, string>;
  const imagePath = icons[iconName] || `/images/icons/${iconName}.png`;
  return processImagePath(imagePath);
}

// 获取二维码图片
export function getQRImage(qrName: string): string {
  const qrImages = imageConfig.qr as Record<string, string>;
  const imagePath = qrImages[qrName] || `/images/qr/${qrName}.jpg`;
  return processImagePath(imagePath);
}

// 获取响应式图片源集
export function getResponsiveImageSources(cityId: string): {
  desktop: string;
  tablet: string;
  mobile: string;
} {
  const desktopPath = getCityImage(cityId, 'pc', false);
  const mobilePath = getCityImage(cityId, 'mobile', false);

  return {
    desktop: desktopPath,
    tablet: desktopPath, // 平板使用桌面版图片
    mobile: mobilePath
  };
}

// 获取城市图片的完整响应式配置
export function getCityImageResponsive(cityId: string): {
  src: string;
  srcset: string;
  sizes: string;
  mobileSrc: string;
  alt: string;
  fallbackSrc: string;
} {
  const sources = getResponsiveImageSources(cityId);

  return {
    src: sources.desktop,
    srcset: `${sources.mobile} 640w, ${sources.tablet} 1024w, ${sources.desktop} 1536w`,
    sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
    mobileSrc: sources.mobile,
    alt: generateImageAlt(cityId, 'zh'), // 默认中文，可以根据需要调整
    fallbackSrc: getDefaultCityImage('pc')
  };
}

// 获取专项社区图片
export function getSpecializedCommunityImage(communityId: string, device: DeviceType = 'pc', optimized: boolean = true): string {
  let imagePath = `/images/specialized/${communityId}-${device}.png`;

  // 处理路径以包含正确的 base path
  imagePath = processImagePath(imagePath);

  // 如果需要优化，返回优化后的 URL
  if (optimized) {
    const width = device === 'mobile' ? 640 : 1024;
    return getOptimizedImageUrl(imagePath, { width, quality: 85, format: 'webp' });
  }

  return imagePath;
}

// 获取专项社区图片的完整响应式配置
export function getSpecializedCommunityImageResponsive(communityId: string): {
  src: string;
  srcset: string;
  sizes: string;
  mobileSrc: string;
  alt: string;
  fallbackSrc: string;
} {
  const desktopPath = getSpecializedCommunityImage(communityId, 'pc', false);
  const mobilePath = getSpecializedCommunityImage(communityId, 'mobile', false);

  return {
    src: desktopPath,
    srcset: `${mobilePath} 640w, ${desktopPath} 1024w, ${desktopPath} 1536w`,
    sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
    mobileSrc: mobilePath,
    alt: communityId,
    fallbackSrc: processImagePath(`/images/specialized/default-pc.png`)
  };
}


// 获取默认城市图片
export function getDefaultCityImage(device: DeviceType = 'pc'): string {
  return processImagePath(`/images/cities/default-${device}.png`);
}

// 检查城市图片是否存在
export function hasCityImage(cityId: string, device: DeviceType = 'pc'): boolean {
  const cityImages = imageConfig.cities[cityId as keyof typeof imageConfig.cities];
  return !!(cityImages && cityImages[device]);
}

// 生成图片alt文本
export function generateImageAlt(cityId: string, lang: 'zh' | 'en'): string {
  // 这里可以从城市数据中获取城市名称
  const cityNames: Record<string, { zh: string; en: string }> = {
    beijing: { zh: '北京', en: 'Beijing' },
    shanghai: { zh: '上海', en: 'Shanghai' },
    shenzhen: { zh: '深圳', en: 'Shenzhen' },
    wuhan: { zh: '武汉', en: 'Wuhan' },
    xian: { zh: '西安', en: "Xi'an" },
    changji: { zh: '昌吉', en: 'Changji' },
    chengdu: { zh: '成都', en: 'Chengdu' },
    lanzhou: { zh: '兰州', en: 'Lanzhou' },
    guangzhou: { zh: '广州', en: 'Guangzhou' },
    fuzhou: { zh: '福州', en: 'Fuzhou' },
    suzhou: { zh: '苏州', en: 'Suzhou' },
    hangzhou: { zh: '杭州', en: 'Hangzhou' },
    hechi: { zh: '河池', en: 'Hechi' },
    urumqi: { zh: '乌鲁木齐', en: 'Urumqi' },
    qingdao: { zh: '青岛', en: 'Qingdao' },
    xiamen: { zh: '厦门', en: 'Xiamen' },
    zhangjiakou: { zh: '张家口', en: 'Zhangjiakou' },
    hefei: { zh: '合肥', en: 'Hefei' },
    nanjing: { zh: '南京', en: 'Nanjing' },
    chongqing: { zh: '重庆', en: 'Chongqing' },
    zhengzhou: { zh: '郑州', en: 'Zhengzhou' }
  };

  const cityName = cityNames[cityId]?.[lang] || cityId;
  const suffix = lang === 'zh' ? '亚马逊云科技 User Group' : 'User Group';

  return `${cityName} ${suffix}`;
}

// 检查图片是否存在（用于开发时的调试）
export function validateImagePath(imagePath: string): boolean {
  // 在生产环境中，这个函数可以用来验证图片路径
  // 开发时可以返回 true，生产时可以实际检查文件
  return imagePath.startsWith('/images/');
}