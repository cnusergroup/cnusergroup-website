// 数据处理工具
export {
  getCities,
  getCityById,
  getActiveCities,
  getSpecializedCommunities,
  getSpecializedCommunityById,
  getActiveSpecializedCommunities,
  getTranslations,
  t,
  getLocalizedValue,
  hasTranslation,
  getSiteConfig,
  isValidLanguage,
  getDefaultLanguage,
  formatNumber
} from './data';

// 国际化工具
export {
  getLanguageFromUrl,
  getLocalizedPath,
  getLanguageSwitchUrl,
  getPageTitle,
  getSupportedLanguages,
  getLanguageDisplayName
} from './i18n';

// 验证工具
export {
  validateCity,
  validateCities,
  validateLanguage,
  sanitizeCity,
  sanitizeCities,
  isValidCity,
  isValidCityArray,
  generateDataQualityReport
} from './validation';

// 路由工具
export {
  getRoute,
  getAllRoutes,
  routeRequiresParams,
  extractParamsFromPath,
  generateBreadcrumbs
} from './routes';

// 图片工具
export {
  getCityImage,
  getUIImage,
  getIcon,
  getQRImage,
  getResponsiveImageSources,
  getCityImageResponsive,
  getSpecializedCommunityImage,
  getSpecializedCommunityImageResponsive,
  generateImageAlt,
  validateImagePath
} from './images';

// 图片优化工具
export {
  generateSrcSet,
  getOptimizedImageUrl,
  getDeviceSpecificSizes,
  getImagePlaceholder,
  supportsWebP,
  supportsAVIF
} from './imageOptimization';