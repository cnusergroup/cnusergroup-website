export async function GET() {
  const baseUrl = import.meta.env.BASE_URL || '/';
  const basePath = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  const manifest = {
    "name": "亚马逊云科技 User Group 社区",
    "short_name": "CNUserGroup",
    "description": "连接中国各地的亚马逊云科技用户群体，分享技术经验，促进社区交流",
    "start_url": `${basePath}/`,
    "display": "standalone",
    "background_color": "#ffffff",
    "theme_color": "#FF9900",
    "orientation": "portrait-primary",
    "categories": ["technology", "community", "education"],
    "lang": "zh-CN",
    "dir": "ltr",
    "scope": `${basePath}/`,
    "icons": [
      {
        "src": `${basePath}/images/icons/icon-72x72.png`,
        "sizes": "72x72",
        "type": "image/png",
        "purpose": "any"
      },
      {
        "src": `${basePath}/images/icons/icon-96x96.png`,
        "sizes": "96x96",
        "type": "image/png",
        "purpose": "any"
      },
      {
        "src": `${basePath}/images/icons/icon-128x128.png`,
        "sizes": "128x128",
        "type": "image/png",
        "purpose": "any"
      },
      {
        "src": `${basePath}/images/icons/icon-144x144.png`,
        "sizes": "144x144",
        "type": "image/png",
        "purpose": "any"
      },
      {
        "src": `${basePath}/images/icons/icon-152x152.png`,
        "sizes": "152x152",
        "type": "image/png",
        "purpose": "any"
      },
      {
        "src": `${basePath}/images/icons/icon-192x192.png`,
        "sizes": "192x192",
        "type": "image/png",
        "purpose": "any maskable"
      },
      {
        "src": `${basePath}/images/icons/icon-384x384.png`,
        "sizes": "384x384",
        "type": "image/png",
        "purpose": "any"
      },
      {
        "src": `${basePath}/images/icons/icon-512x512.png`,
        "sizes": "512x512",
        "type": "image/png",
        "purpose": "any maskable"
      }
    ],
    "screenshots": [
      {
        "src": `${basePath}/images/screenshots/desktop-home.png`,
        "sizes": "1280x720",
        "type": "image/png",
        "form_factor": "wide",
        "label": "首页桌面版截图"
      },
      {
        "src": `${basePath}/images/screenshots/mobile-home.png`,
        "sizes": "375x667",
        "type": "image/png",
        "form_factor": "narrow",
        "label": "首页移动版截图"
      },
      {
        "src": `${basePath}/images/screenshots/cities-page.png`,
        "sizes": "1280x720",
        "type": "image/png",
        "form_factor": "wide",
        "label": "城市社区页面截图"
      }
    ],
    "shortcuts": [
      {
        "name": "城市社区",
        "short_name": "城市",
        "description": "查看所有城市的用户群体",
        "url": `${basePath}/cities`,
        "icons": [
          {
            "src": `${basePath}/images/icons/shortcut-cities.png`,
            "sizes": "96x96",
            "type": "image/png"
          }
        ]
      },
      {
        "name": "北京社区",
        "short_name": "北京",
        "description": "北京亚马逊云科技用户群体",
        "url": `${basePath}/cities/beijing`,
        "icons": [
          {
            "src": `${basePath}/images/cities/beijing-icon.png`,
            "sizes": "96x96",
            "type": "image/png"
          }
        ]
      },
      {
        "name": "上海社区",
        "short_name": "上海",
        "description": "上海亚马逊云科技用户群体",
        "url": `${basePath}/cities/shanghai`,
        "icons": [
          {
            "src": `${basePath}/images/cities/shanghai-icon.png`,
            "sizes": "96x96",
            "type": "image/png"
          }
        ]
      }
    ],
    "related_applications": [
      {
        "platform": "web",
        "url": `https://cnusergroup.github.io${basePath}/`
      }
    ],
    "prefer_related_applications": false,
    "edge_side_panel": {
      "preferred_width": 400
    },
    "launch_handler": {
      "client_mode": "navigate-existing"
    }
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}