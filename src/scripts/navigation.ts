// 导航高亮处理脚本
export function initializeNavigation() {
  // 等待DOM加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupNavigation);
  } else {
    setupNavigation();
  }
}

function setupNavigation() {
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-link');
  
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && isActiveLink(currentPath, href)) {
      link.classList.add('active');
    }
  });
}

function isActiveLink(currentPath: string, linkHref: string): boolean {
  // 移除末尾的斜杠进行比较
  const cleanCurrentPath = currentPath.replace(/\/$/, '') || '/';
  const cleanHrefPath = linkHref.replace(/\/$/, '') || '/';
  
  // 获取基础路径
  const basePath = (window as any).import?.meta?.env?.BASE_URL || 
                   (document.querySelector('meta[name="astro-base"]') as HTMLMetaElement)?.content || 
                   '/';
  const cleanBasePath = basePath.replace(/\/$/, '');
  
  // 移除基础路径进行比较
  let normalizedCurrentPath = cleanCurrentPath;
  let normalizedHrefPath = cleanHrefPath;
  
  if (cleanBasePath !== '' && normalizedCurrentPath.startsWith(cleanBasePath)) {
    normalizedCurrentPath = normalizedCurrentPath.substring(cleanBasePath.length) || '/';
  }
  if (cleanBasePath !== '' && normalizedHrefPath.startsWith(cleanBasePath)) {
    normalizedHrefPath = normalizedHrefPath.substring(cleanBasePath.length) || '/';
  }
  
  // 首页匹配：精确匹配根路径或语言路径
  if (isHomePage(normalizedHrefPath)) {
    return isHomePage(normalizedCurrentPath) || normalizedCurrentPath === normalizedHrefPath;
  }
  
  // 其他页面匹配：精确匹配或前缀匹配
  return normalizedCurrentPath === normalizedHrefPath || 
         normalizedCurrentPath.startsWith(normalizedHrefPath + '/');
}

function isHomePage(path: string): boolean {
  return path === '/' || path === '' || path === '/en';
}

// 自动初始化
initializeNavigation();