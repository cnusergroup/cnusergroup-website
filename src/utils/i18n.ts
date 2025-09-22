import type { Language } from '@/types';

// 从 URL 路径中提取语言
export function getLanguageFromUrl(url: URL): Language {
  let pathname = url.pathname;
  
  // 移除 base URL 前缀进行处理
  const baseUrl = import.meta.env.BASE_URL || '/';
  if (baseUrl !== '/' && pathname.startsWith(baseUrl)) {
    pathname = pathname.slice(baseUrl.length);
    if (!pathname.startsWith('/')) {
      pathname = '/' + pathname;
    }
  }
  
  const segments = pathname.split('/').filter(Boolean);
  
  if (segments.length > 0 && (segments[0] === 'zh' || segments[0] === 'en')) {
    return segments[0] as Language;
  }
  
  return 'zh'; // 默认语言
}

// 生成本地化路径
export function getLocalizedPath(path: string, lang: Language): string {
  // 移除开头的斜杠
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // 如果是默认语言（中文），不添加语言前缀
  if (lang === 'zh') {
    return `/${cleanPath}`;
  }
  
  // 其他语言添加语言前缀
  return `/${lang}/${cleanPath}`;
}

// 生成语言切换链接
export function getLanguageSwitchUrl(currentUrl: string, targetLang: Language): string {
  // 如果是完整URL，解析pathname；否则直接使用
  let pathname = currentUrl;
  if (currentUrl.startsWith('http')) {
    const url = new URL(currentUrl);
    pathname = url.pathname;
  }
  
  const currentLang = getLanguageFromUrl({ pathname } as URL);
  
  if (currentLang === targetLang) {
    return currentUrl;
  }
  
  // 获取基础路径
  const baseUrl = import.meta.env.BASE_URL || '/';
  let processPath = pathname;
  
  // 移除 base URL 前缀进行处理
  if (baseUrl !== '/' && processPath.startsWith(baseUrl)) {
    processPath = processPath.slice(baseUrl.length);
    if (!processPath.startsWith('/')) {
      processPath = '/' + processPath;
    }
  }
  
  // 移除当前语言前缀
  if (currentLang === 'en' && processPath.startsWith('/en/')) {
    processPath = processPath.replace('/en/', '/');
  } else if (currentLang === 'en' && processPath === '/en') {
    processPath = '/';
  }
  
  // 添加目标语言前缀
  if (targetLang === 'en') {
    processPath = `/en${processPath}`;
  }
  
  // 清理路径
  processPath = processPath.replace(/\/+/g, '/');
  if (processPath !== '/' && processPath.endsWith('/')) {
    processPath = processPath.slice(0, -1);
  }
  
  // 重新添加 base URL
  const finalPath = baseUrl === '/' ? processPath : `${baseUrl}${processPath}`.replace(/\/+/g, '/');
  
  return finalPath;
}

// 获取页面标题
export function getPageTitle(pageTitle: string, lang: Language): string {
  const siteTitle = lang === 'zh' 
    ? '亚马逊云科技 User Group 社区'
    : 'User Group Community';
    
  return pageTitle ? `${pageTitle} - ${siteTitle}` : siteTitle;
}

// 获取支持的语言列表
export function getSupportedLanguages(): Language[] {
  return ['zh', 'en'];
}

// 获取语言显示名称
export function getLanguageDisplayName(lang: Language): string {
  switch (lang) {
    case 'zh':
      return '中文';
    case 'en':
      return 'English';
    default:
      return lang;
  }
}