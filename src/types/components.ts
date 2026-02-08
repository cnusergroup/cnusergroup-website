/**
 * 组件相关的 TypeScript 接口定义
 */

import type { City, SpecializedCommunity, Language } from './index';

// 城市图片配置接口
export interface CityImageConfig {
  src: string;
  srcset: string;
  sizes: string;
  mobileSrc: string;
  tabletSrc?: string;
  alt: string;
  fallbackSrc: string;
  width?: number;
  height?: number;
}

// 响应式图片组件属性
export interface ResponsiveImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  class?: string;
  loading?: 'lazy' | 'eager';
  sizes?: string;
  mobileSrc?: string;
  tabletSrc?: string;
  quality?: number;
  format?: 'webp' | 'avif' | 'png' | 'jpg';
  fallbackSrc?: string;
  showPlaceholder?: boolean;
  placeholderText?: string;
}

// 城市卡片组件属性
export interface CityCardProps {
  city: City;
  lang: Language;
  class?: string;
  variant?: CityCardVariant;
  size?: ComponentSize;
  theme?: 'light' | 'dark';
  showStatus?: boolean;
  showImage?: boolean;
  showSubtitle?: boolean;
  bordered?: boolean;
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  interactive?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick?: (city: City) => void;
  onHover?: (city: City) => void;
  onFocus?: (city: City) => void;
}

// 城市网格组件属性
export interface CityGridProps {
  title?: string;
  subtitle?: string;
  showInactive?: boolean;
  showAll?: boolean;
  lang?: Language;
  cities?: City[];
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: string;
  className?: string;
  forceHorizontalLayout?: boolean;
  onCityClick?: (city: City) => void;
  filterOptions?: CityFilterOptions;
}

// 专项社区卡片组件属性
export interface SpecializedCommunityCardProps {
  community: SpecializedCommunity;
  lang: Language;
  class?: string;
  showStatus?: boolean;
}

// 专项社区网格组件属性
export interface SpecializedCommunityGridProps {
  title?: string;
  subtitle?: string;
  lang?: Language;
  communities?: SpecializedCommunity[];
  showAll?: boolean;
}

// 城市过滤选项
export interface CityFilterOptions {
  showSearch?: boolean;
  showRegionFilter?: boolean;
  showStatusFilter?: boolean;
  searchPlaceholder?: string;
  regions?: CityRegion[];
}

// 城市区域定义
export interface CityRegion {
  id: string;
  name: {
    zh: string;
    en: string;
  };
  cities: string[]; // 城市ID数组
}

// 图片占位符组件属性
export interface ImagePlaceholderProps {
  width?: number;
  height?: number;
  text?: string;
  variant?: 'loading' | 'error' | 'empty';
  class?: string;
}

// 城市卡片状态
export type CityCardState = 'loading' | 'loaded' | 'error' | 'idle';

// 城市网格布局配置
export interface GridLayoutConfig {
  columns: {
    mobile: number;
    tablet: number;
    desktop: number;
    wide?: number;
  };
  gap: {
    mobile: string;
    tablet: string;
    desktop: string;
  };
  minCardWidth: string;
  maxCardWidth?: string;
}

// 可访问性配置
export interface AccessibilityConfig {
  enableKeyboardNavigation?: boolean;
  enableScreenReaderSupport?: boolean;
  enableFocusManagement?: boolean;
  announceNavigation?: boolean;
  skipLinks?: boolean;
}

// 城市数据验证结果
export interface CityValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// 城市组件事件
export interface CityComponentEvents {
  onCitySelect?: (city: City) => void;
  onCityHover?: (city: City) => void;
  onCityFocus?: (city: City) => void;
  onImageLoad?: (cityId: string) => void;
  onImageError?: (cityId: string, error: Error) => void;
  onFilterChange?: (filters: CityFilters) => void;
}

// 城市过滤器状态
export interface CityFilters {
  search?: string;
  region?: string;
  status?: 'all' | 'active' | 'inactive';
  sortBy?: 'name' | 'status' | 'region';
  sortOrder?: 'asc' | 'desc';
}

// 城市网格状态
export interface CityGridState {
  cities: City[];
  filteredCities: City[];
  loading: boolean;
  error: string | null;
  filters: CityFilters;
  selectedCity: City | null;
  viewMode: 'grid' | 'list';
}

// 性能监控配置
export interface PerformanceConfig {
  enableImageOptimization?: boolean;
  enableLazyLoading?: boolean;
  enablePreloading?: boolean;
  maxConcurrentImages?: number;
  imageQuality?: number;
  enableWebP?: boolean;
}

// 错误处理配置
export interface ErrorHandlingConfig {
  enableImageFallback?: boolean;
  enableRetry?: boolean;
  maxRetryAttempts?: number;
  retryDelay?: number;
  showErrorMessages?: boolean;
  logErrors?: boolean;
}

// 组件主题配置
export interface ComponentTheme {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: {
      primary: string;
      secondary: string;
      disabled: string;
    };
    border: string;
    shadow: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
    };
    fontWeight: {
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
    lineHeight: {
      tight: number;
      normal: number;
      relaxed: number;
    };
  };
}

// 动画配置
export interface AnimationConfig {
  enableAnimations?: boolean;
  respectReducedMotion?: boolean;
  duration: {
    fast: string;
    normal: string;
    slow: string;
  };
  easing: {
    ease: string;
    easeIn: string;
    easeOut: string;
    easeInOut: string;
  };
}

// 城市卡片变体样式
export type CityCardVariant = 'default' | 'compact' | 'featured' | 'minimal' | 'list';

// 城市网格布局类型
export type GridLayoutType = 'masonry' | 'uniform' | 'responsive';

// 图片加载策略
export type ImageLoadingStrategy = 'lazy' | 'eager' | 'progressive' | 'blur';

// 组件尺寸
export type ComponentSize = 'small' | 'default' | 'large';

// 响应式断点
export interface ResponsiveBreakpoints {
  mobile: number;
  tablet: number;
  desktop: number;
  wide: number;
}

// 默认配置常量
export const DEFAULT_GRID_CONFIG: GridLayoutConfig = {
  columns: {
    mobile: 1,
    tablet: 2,
    desktop: 3,
    wide: 4
  },
  gap: {
    mobile: '1rem',
    tablet: '1.25rem',
    desktop: '1.5rem'
  },
  minCardWidth: '280px',
  maxCardWidth: '400px'
};

export const DEFAULT_RESPONSIVE_BREAKPOINTS: ResponsiveBreakpoints = {
  mobile: 640,
  tablet: 768,
  desktop: 1024,
  wide: 1280
};

export const DEFAULT_ANIMATION_CONFIG: AnimationConfig = {
  enableAnimations: true,
  respectReducedMotion: true,
  duration: {
    fast: '0.15s',
    normal: '0.3s',
    slow: '0.6s'
  },
  easing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out'
  }
};