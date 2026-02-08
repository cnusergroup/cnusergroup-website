import type { City, SpecializedCommunity, Translations, SiteConfig, Language } from '@/types';
import citiesData from '@/data/cities.json';
import specializedData from '@/data/specialized-communities.json';
import zhTranslations from '@/data/translations/zh.json';
import enTranslations from '@/data/translations/en.json';
import { load } from 'js-yaml';
import fs from 'fs';
import path from 'path';

// 加载城市数据
export function getCities(): City[] {
  return citiesData as City[];
}

// 根据ID获取单个城市
export function getCityById(id: string): City | undefined {
  const cities = getCities();
  return cities.find(city => city.id === id);
}

// 获取活跃城市
export function getActiveCities(): City[] {
  return getCities().filter(city => city.active);
}

// 加载专项社区数据
export function getSpecializedCommunities(): SpecializedCommunity[] {
  return specializedData as SpecializedCommunity[];
}

// 根据ID获取单个专项社区
export function getSpecializedCommunityById(id: string): SpecializedCommunity | undefined {
  const communities = getSpecializedCommunities();
  return communities.find(community => community.id === id);
}

// 获取活跃专项社区
export function getActiveSpecializedCommunities(): SpecializedCommunity[] {
  return getSpecializedCommunities().filter(community => community.active);
}

// 加载翻译数据
export function getTranslations(lang: Language): any {
  switch (lang) {
    case 'en':
      return enTranslations;
    case 'zh':
    default:
      return zhTranslations;
  }
}

// 获取翻译文本
export function t(key: string, lang: Language, fallback?: string): string {
  const translations = getTranslations(lang);
  const keys = key.split('.');
  let value = translations;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // 如果找不到翻译，尝试回退到中文
      if (lang === 'en') {
        const zhValue = t(key, 'zh');
        if (zhValue !== key) {
          return zhValue;
        }
      }
      return fallback || key;
    }
  }
  
  return typeof value === 'string' ? value : (fallback || key);
}

// 获取多语言对象中的值
export function getLocalizedValue<T>(obj: { zh: T; en: T }, lang: Language): T {
  return obj[lang] || obj.zh;
}

// 检查翻译是否存在
export function hasTranslation(key: string, lang: Language): boolean {
  const translations = getTranslations(lang);
  const keys = key.split('.');
  let value = translations;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return false;
    }
  }
  
  return typeof value === 'string';
}

// 加载网站配置
export function getSiteConfig(): SiteConfig {
  try {
    const configPath = path.join(process.cwd(), 'src/data/config.yaml');
    const configFile = fs.readFileSync(configPath, 'utf8');
    const config = load(configFile) as any;
    
    return {
      title: config.site.title,
      description: config.site.description,
      socialLinks: config.socialLinks || [],
      globalStats: config.globalStats || {
        organizations: 470,
        countries: 98,
        members: 500000
      }
    };
  } catch (error) {
    console.error('Error loading site config:', error);
    // 返回默认配置
    return {
      title: {
        zh: '亚马逊云科技 User Group 社区',
        en: 'User Group Community'
      },
      description: {
        zh: '连接全球云计算开发者，分享技术经验，推动创新发展',
        en: 'Connecting global cloud computing developers, sharing technical experiences, and driving innovation'
      },
      socialLinks: [],
      globalStats: {
        organizations: 470,
        countries: 98,
        members: 500000
      }
    };
  }
}

// 验证语言
export function isValidLanguage(lang: string): lang is Language {
  return ['zh', 'en'].includes(lang);
}

// 获取默认语言
export function getDefaultLanguage(): Language {
  return 'zh';
}

// 格式化数字
export function formatNumber(num: number, lang: Language): string {
  if (lang === 'en') {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(0) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(0) + 'K';
    }
    return num.toString();
  } else {
    if (num >= 10000) {
      return (num / 10000).toFixed(0) + '万';
    }
    return num.toString();
  }
}