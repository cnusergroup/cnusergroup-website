/**
 * Service Worker for CNUserGroup Website
 * 提供离线缓存和性能优化
 */

const CACHE_NAME = 'cnusergroup-v1.0.0';
const STATIC_CACHE = 'cnusergroup-static-v1.0.0';
const DYNAMIC_CACHE = 'cnusergroup-dynamic-v1.0.0';
const IMAGE_CACHE = 'cnusergroup-images-v1.0.0';

// 自定义域名下 BASE_URL 为空（根路径）
const BASE_URL = '';

// 需要缓存的静态资源 - 动态添加BASE_URL前缀
const STATIC_ASSETS = [
  `${BASE_URL}/`,
  `${BASE_URL}/en`,
  `${BASE_URL}/cities`,
  `${BASE_URL}/en/cities`,
  `${BASE_URL}/manifest.json`,
  `${BASE_URL}/favicon.svg`,
  `${BASE_URL}/images/ui/hero-background.png`,
  `${BASE_URL}/images/ui/title-left.png`,
  `${BASE_URL}/images/ui/title-right.png`,
  `${BASE_URL}/images/aws-logo.webp`
].filter(path => path !== BASE_URL); // 移除空的BASE_URL项

// 需要缓存的动态内容模式 - 考虑BASE_URL
const DYNAMIC_PATTERNS = [
  new RegExp(`^${BASE_URL}/cities/[^/]+$`),
  new RegExp(`^${BASE_URL}/en/cities/[^/]+$`),
  new RegExp(`^${BASE_URL}/images/cities/.+\\.(webp|jpg|png)$`),
  new RegExp(`^${BASE_URL}/api/.+$`)
];

// 安装事件 - 缓存静态资源
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      // 缓存静态资源
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      }),
      // 跳过等待，立即激活
      self.skipWaiting()
    ])
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // 清理旧缓存
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== IMAGE_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // 立即控制所有客户端
      self.clients.claim()
    ])
  );
});

// 拦截网络请求
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 只处理同源请求
  if (url.origin !== location.origin) {
    return;
  }
  
  // 根据请求类型选择缓存策略
  if (request.destination === 'image') {
    event.respondWith(handleImageRequest(request));
  } else if (isStaticAsset(request.url)) {
    event.respondWith(handleStaticRequest(request));
  } else if (isDynamicContent(request.url)) {
    event.respondWith(handleDynamicRequest(request));
  } else {
    event.respondWith(handleDefaultRequest(request));
  }
});

// 处理图片请求 - 缓存优先策略
async function handleImageRequest(request) {
  try {
    const cache = await caches.open(IMAGE_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Image request failed:', error);
    return new Response('Image not available', { status: 404 });
  }
}

// 处理静态资源 - 缓存优先策略
async function handleStaticRequest(request) {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Static request failed:', error);
    
    // 返回离线页面
    if (request.mode === 'navigate') {
      return caches.match(`${BASE_URL}/offline.html`) || 
             caches.match(`${BASE_URL}/`) ||
             new Response('Offline', { status: 503 });
    }
    
    return new Response('Resource not available', { status: 404 });
  }
}

// 处理动态内容 - 网络优先策略
async function handleDynamicRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Dynamic request failed, trying cache:', error);
    
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // 如果是页面导航，返回离线页面
    if (request.mode === 'navigate') {
      return caches.match(`${BASE_URL}/`) || 
             new Response('Offline', { status: 503 });
    }
    
    return new Response('Content not available', { status: 404 });
  }
}

// 处理默认请求 - 网络优先策略
async function handleDefaultRequest(request) {
  try {
    return await fetch(request);
  } catch (error) {
    console.log('Default request failed:', error);
    
    if (request.mode === 'navigate') {
      return caches.match(`${BASE_URL}/`) || 
             new Response('Offline', { status: 503 });
    }
    
    return new Response('Request failed', { status: 404 });
  }
}

// 判断是否为静态资源
function isStaticAsset(url) {
  const urlPath = new URL(url).pathname;
  return STATIC_ASSETS.some(asset => urlPath === asset || urlPath.endsWith(asset)) ||
         urlPath.includes('/assets/') ||
         urlPath.includes('/_astro/') ||
         urlPath.endsWith('.css') ||
         urlPath.endsWith('.js') ||
         urlPath.endsWith('.woff2') ||
         urlPath.endsWith('.woff');
}

// 判断是否为动态内容
function isDynamicContent(url) {
  const urlPath = new URL(url).pathname;
  return DYNAMIC_PATTERNS.some(pattern => pattern.test(urlPath));
}

// 后台同步
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // 同步离线时收集的数据
    console.log('Background sync triggered');
    
    // 这里可以添加需要后台同步的逻辑
    // 比如发送离线时收集的分析数据
  } catch (error) {
    console.log('Background sync failed:', error);
  }
}

// 推送通知
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body,
      icon: `${BASE_URL}/images/icons/icon-192x192.png`,
      badge: `${BASE_URL}/images/icons/badge-72x72.png`,
      data: data.url,
      actions: [
        {
          action: 'open',
          title: '查看详情'
        },
        {
          action: 'close',
          title: '关闭'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// 通知点击处理
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow(event.notification.data || `${BASE_URL}/`)
    );
  }
});

// 缓存管理 - 定期清理
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAN_CACHE') {
    event.waitUntil(cleanOldCache());
  }
});

async function cleanOldCache() {
  try {
    const cacheNames = await caches.keys();
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      
      // 清理超过100个条目的缓存
      if (requests.length > 100) {
        const oldRequests = requests.slice(0, requests.length - 50);
        await Promise.all(
          oldRequests.map(request => cache.delete(request))
        );
      }
    }
    
    console.log('Cache cleaned successfully');
  } catch (error) {
    console.log('Cache cleaning failed:', error);
  }
}

// 错误处理
self.addEventListener('error', (event) => {
  console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker unhandled rejection:', event.reason);
});