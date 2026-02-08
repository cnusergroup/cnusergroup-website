// 城市数据模型
export interface City {
  id: string;
  name: {
    zh: string;
    en: string;
  };
  logo: string;
  logoMobile: string;
  active: boolean;
  description: {
    zh: string;
    en: string;
  };
  contact?: {
    wechat?: string;
    email?: string;
    leader?: string;
  };
  stats?: {
    members: number;
    events: number;
    founded: number;
  };
  events?: Event[];
}

// 专项社区数据模型
export interface SpecializedCommunity {
  id: string;
  name: {
    zh: string;
    en: string;
  };
  logo: string;
  logoMobile: string;
  active: boolean;
  description: {
    zh: string;
    en: string;
  };
  contact?: {
    wechat?: string;
    email?: string;
    leader?: string;
  };
  stats?: {
    members: number;
    events: number;
    founded: number;
  };
}

// 翻译数据模型
export interface Translations {
  [key: string]: {
    zh: string;
    en: string;
  };
}

// 网站配置模型
export interface SiteConfig {
  title: {
    zh: string;
    en: string;
  };
  description: {
    zh: string;
    en: string;
  };
  socialLinks: SocialLink[];
  globalStats: {
    organizations: number;
    countries: number;
    members: number;
  };
}

// 社交媒体链接
export interface SocialLink {
  name: string;
  url: string;
  icon: string;
  platform: 'wechat' | 'weibo' | 'tiktok' | 'bilibili' | 'xiaohongshu';
}

// 事件数据模型
export interface Event {
  id: string;
  title: {
    zh: string;
    en: string;
  };
  date: string;
  location: string;
  description: {
    zh: string;
    en: string;
  };
}

// 语言类型
export type Language = 'zh' | 'en';

// 应用申请类型
export interface Application {
  type: 'leader' | 'volunteer' | 'instructor' | 'certificate';
  title: {
    zh: string;
    en: string;
  };
  icon: string;
  url: string;
}