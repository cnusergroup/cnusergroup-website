import type { Language } from '@/types';

// 获取基础路径
function getBasePath(): string {
  // 在浏览器环境中，从 import.meta.env 获取
  if (typeof window !== 'undefined') {
    return import.meta.env.BASE_URL || '/';
  }
  // 自定义域名下始终使用根路径
  return '/';
}

// 导出基础路径获取函数供其他地方使用
export { getBasePath };

// 处理路径，确保包含正确的 base path
function processRoutePath(path: string): string {
  const basePath = getBasePath();
  // 如果 basePath 是 '/'，直接返回路径
  if (basePath === '/') {
    return path;
  }
  // 移除 basePath 末尾的斜杠，并确保路径正确拼接
  const cleanBasePath = basePath.replace(/\/$/, '');
  // 确保路径以 / 开头
  const normalizedPath = path.startsWith('/') ? path : '/' + path;
  return cleanBasePath + normalizedPath;
}

// 路由配置
export const routes = {
  home: '',
  cities: 'cities',
  city: 'cities/[id]',
  specialized: 'specialized',
  specializedDetail: 'specialized/[id]',
  events: 'events',
  about: 'about',
  contact: 'contact',
  privacy: 'privacy',
  terms: 'terms'
} as const;

export type RouteKey = keyof typeof routes;

// 生成本地化路由
export function getRoute(key: RouteKey, lang: Language, params?: Record<string, string>): string {
  let path: string = routes[key];
  
  // 替换动态参数
  if (params) {
    Object.entries(params).forEach(([param, value]) => {
      path = path.replace(`[${param}]`, value);
    });
  }
  
  // 添加语言前缀
  const langPrefix = lang === 'zh' ? '' : `/${lang}`;
  const fullPath = `${langPrefix}/${path}`.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  
  // 处理 base path
  return processRoutePath(fullPath);
}

// 获取所有支持语言的路由
export function getAllRoutes(key: RouteKey, params?: Record<string, string>): Array<{ lang: Language; path: string }> {
  return [
    { lang: 'zh', path: getRoute(key, 'zh', params) },
    { lang: 'en', path: getRoute(key, 'en', params) }
  ];
}

// 检查路由是否需要参数
export function routeRequiresParams(key: RouteKey): boolean {
  return routes[key].includes('[') && routes[key].includes(']');
}

// 从路径中提取参数
export function extractParamsFromPath(path: string, routeKey: RouteKey): Record<string, string> | null {
  const routePattern = routes[routeKey];
  const params: Record<string, string> = {};
  
  // 移除语言前缀
  const cleanPath = path.replace(/^\/(en|zh)\//, '/').replace(/^\//, '');
  const cleanPattern = routePattern.replace(/^\//, '');
  
  // 简单的参数提取（可以扩展为更复杂的匹配）
  if (routePattern.includes('[id]')) {
    const pathParts = cleanPath.split('/');
    const patternParts = cleanPattern.split('/');
    
    patternParts.forEach((part, index) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        const paramName = part.slice(1, -1);
        params[paramName] = pathParts[index] || '';
      }
    });
  }
  
  return Object.keys(params).length > 0 ? params : null;
}

// 生成面包屑导航
export function generateBreadcrumbs(currentPath: string, lang: Language): Array<{ label: string; path: string }> {
  const breadcrumbs = [
    { label: lang === 'zh' ? '首页' : 'Home', path: getRoute('home', lang) }
  ];
  
  // 移除基础路径、语言前缀和开头的斜杠
  const basePath = getBasePath();
  let cleanPath = currentPath;
  
  // 移除基础路径
  if (basePath !== '/' && cleanPath.startsWith(basePath)) {
    cleanPath = cleanPath.substring(basePath.length);
  }
  
  // 移除语言前缀和开头的斜杠
  cleanPath = cleanPath.replace(/^\/(en|zh)\//, '').replace(/^\//, '');
  
  if (!cleanPath) {
    return breadcrumbs;
  }
  
  const pathParts = cleanPath.split('/').filter(Boolean);
  
  // 根据路径生成面包屑
  if (pathParts[0] === 'cities') {
    breadcrumbs.push({
      label: lang === 'zh' ? '城市社区' : 'City Communities',
      path: getRoute('cities', lang)
    });
    
    if (pathParts[1]) {
      // 从城市数据中获取城市名称
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
        nanjing: { zh: '南京', en: 'Nanjing' }
      };
      
      const cityName = cityNames[pathParts[1]]?.[lang] || pathParts[1];
      breadcrumbs.push({
        label: cityName,
        path: getRoute('city', lang, { id: pathParts[1] })
      });
    }
  } else if (pathParts[0] === 'specialized') {
    breadcrumbs.push({
      label: lang === 'zh' ? '专项社区' : 'Specialized Communities',
      path: getRoute('specialized', lang)
    });
    
    if (pathParts[1]) {
      // 从专项社区数据中获取社区名称
      const specializedNames: Record<string, { zh: string; en: string }> = {
        kiro: { zh: 'Kiro社区', en: 'Kiro Community' },
        security: { zh: 'Security社区', en: 'Security Community' },
        observability: { zh: '可观测性社区', en: 'Observability Community' },
        'online-events': { zh: '线上活动社区', en: 'Online Events Community' }
      };
      
      const communityName = specializedNames[pathParts[1]]?.[lang] || pathParts[1];
      breadcrumbs.push({
        label: communityName,
        path: getRoute('specializedDetail', lang, { id: pathParts[1] })
      });
    }
  } else if (pathParts[0] === 'events') {
    breadcrumbs.push({
      label: lang === 'zh' ? '活动' : 'Events',
      path: getRoute('events', lang)
    });
  } else if (pathParts[0] === 'about') {
    breadcrumbs.push({
      label: lang === 'zh' ? '关于我们' : 'About Us',
      path: getRoute('about', lang)
    });
  }
  
  return breadcrumbs;
}