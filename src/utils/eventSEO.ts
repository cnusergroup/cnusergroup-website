/**
 * Event SEO Optimization Utilities
 * Generate structured data, meta tags, and SEO-friendly content for events
 */

import type { ProcessedEvent } from './eventProcessing.js';

export interface EventSEOData {
  title: string;
  description: string;
  canonicalUrl: string;
  ogImage: string;
  structuredData: object;
  keywords: string[];
}

/**
 * Generate SEO-optimized title for event
 */
export function generateEventSEOTitle(
  event: ProcessedEvent,
  locale: 'zh' | 'en' = 'zh'
): string {
  const templates = {
    zh: `${event.title} - ${event.location} - ${event.formattedDate} | 中国用户组`,
    en: `${event.title} - ${event.location} - ${event.formattedDate} | CNUserGroup`
  };
  
  return templates[locale];
}

/**
 * Generate SEO-optimized description for event
 */
export function generateEventSEODescription(
  event: ProcessedEvent,
  locale: 'zh' | 'en' = 'zh'
): string {
  const templates = {
    zh: `参加${event.title}活动，时间：${event.formattedDate}，地点：${event.location}。与技术专家和同行交流，提升技能，拓展人脉。立即查看活动详情并报名参加。`,
    en: `Join ${event.title} event on ${event.formattedDate} at ${event.location}. Connect with tech experts and peers, enhance skills, and expand your network. View event details and register now.`
  };
  
  return templates[locale];
}

/**
 * Generate keywords for event SEO
 */
export function generateEventKeywords(
  event: ProcessedEvent,
  locale: 'zh' | 'en' = 'zh'
): string[] {
  const baseKeywords = {
    zh: ['技术活动', '开发者', '社区', '聚会', '分享会', '工作坊', '用户组'],
    en: ['tech event', 'developer', 'community', 'meetup', 'workshop', 'user group', 'networking']
  };
  
  const keywords = [...baseKeywords[locale]];
  
  // Add event-specific keywords
  if (event.tags && event.tags.length > 0) {
    keywords.push(...event.tags);
  }
  
  // Add location-based keywords
  if (event.location) {
    keywords.push(event.location);
    if (locale === 'zh') {
      keywords.push(`${event.location}技术活动`, `${event.location}开发者`);
    } else {
      keywords.push(`${event.location} tech event`, `${event.location} developer`);
    }
  }
  
  // Add title-based keywords (extract meaningful words)
  const titleWords = event.title
    .split(/[\s\-_,，、]+/)
    .filter(word => word.length > 2)
    .slice(0, 5);
  keywords.push(...titleWords);
  
  return [...new Set(keywords)]; // Remove duplicates
}

/**
 * Generate structured data (JSON-LD) for event
 */
export function generateEventStructuredData(
  event: ProcessedEvent,
  siteUrl: string = 'https://cnusergroup.com'
): object {
  const eventUrl = `${siteUrl}/events/${event.slug}`;
  
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": event.title,
    "description": event.title,
    "startDate": event.time,
    "endDate": event.time, // Could be enhanced with actual end time
    "eventStatus": event.isUpcoming 
      ? "https://schema.org/EventScheduled" 
      : "https://schema.org/EventPostponed",
    "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
    "location": {
      "@type": "Place",
      "name": event.location,
      "address": {
        "@type": "PostalAddress",
        "addressLocality": event.location,
        "addressCountry": "CN"
      }
    },
    "image": event.imageUrl ? [event.imageUrl] : [],
    "url": eventUrl,
    "organizer": {
      "@type": "Organization",
      "name": "CNUserGroup",
      "url": siteUrl,
      "logo": `${siteUrl}/images/logo.png`
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "CNY",
      "availability": "https://schema.org/InStock",
      "url": event.url,
      "validFrom": new Date().toISOString()
    },
    "performer": {
      "@type": "Organization",
      "name": "CNUserGroup"
    },
    "audience": {
      "@type": "Audience",
      "audienceType": "Developers, Tech Professionals"
    },
    "keywords": event.tags?.join(', ') || '',
    "inLanguage": "zh-CN",
    "isAccessibleForFree": true,
    "aggregateRating": event.views > 100 ? {
      "@type": "AggregateRating",
      "ratingValue": Math.min(4.5, 3 + (event.favorites / event.views) * 2),
      "reviewCount": Math.floor(event.views / 10),
      "bestRating": 5,
      "worstRating": 1
    } : undefined
  };
}

/**
 * Generate Open Graph meta tags for event
 */
export function generateEventOGTags(
  event: ProcessedEvent,
  siteUrl: string = 'https://cnusergroup.com',
  locale: 'zh' | 'en' = 'zh'
): Record<string, string> {
  const eventUrl = `${siteUrl}/events/${event.slug}`;
  const title = generateEventSEOTitle(event, locale);
  const description = generateEventSEODescription(event, locale);
  
  return {
    'og:type': 'event',
    'og:title': title,
    'og:description': description,
    'og:url': eventUrl,
    'og:image': event.imageUrl || `${siteUrl}/images/og-event-default.jpg`,
    'og:image:width': '1200',
    'og:image:height': '630',
    'og:image:alt': event.title,
    'og:site_name': locale === 'zh' ? '中国用户组' : 'CNUserGroup',
    'og:locale': locale === 'zh' ? 'zh_CN' : 'en_US',
    'event:start_time': event.time,
    'event:location': event.location
  };
}

/**
 * Generate Twitter Card meta tags for event
 */
export function generateEventTwitterTags(
  event: ProcessedEvent,
  siteUrl: string = 'https://cnusergroup.com',
  locale: 'zh' | 'en' = 'zh'
): Record<string, string> {
  const title = generateEventSEOTitle(event, locale);
  const description = generateEventSEODescription(event, locale);
  
  return {
    'twitter:card': 'summary_large_image',
    'twitter:title': title,
    'twitter:description': description,
    'twitter:image': event.imageUrl || `${siteUrl}/images/twitter-event-default.jpg`,
    'twitter:image:alt': event.title,
    'twitter:site': '@CNUserGroup',
    'twitter:creator': '@CNUserGroup'
  };
}

/**
 * Generate complete SEO data for event
 */
export function generateEventSEOData(
  event: ProcessedEvent,
  siteUrl: string = 'https://cnusergroup.com',
  locale: 'zh' | 'en' = 'zh'
): EventSEOData {
  const eventUrl = `${siteUrl}/events/${event.slug}`;
  
  return {
    title: generateEventSEOTitle(event, locale),
    description: generateEventSEODescription(event, locale),
    canonicalUrl: eventUrl,
    ogImage: event.imageUrl || `${siteUrl}/images/og-event-default.jpg`,
    structuredData: generateEventStructuredData(event, siteUrl),
    keywords: generateEventKeywords(event, locale)
  };
}

/**
 * Generate breadcrumb structured data for event
 */
export function generateEventBreadcrumbData(
  event: ProcessedEvent,
  siteUrl: string = 'https://cnusergroup.com',
  locale: 'zh' | 'en' = 'zh'
): object {
  const homeLabel = locale === 'zh' ? '首页' : 'Home';
  const eventsLabel = locale === 'zh' ? '活动' : 'Events';
  
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": homeLabel,
        "item": siteUrl
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": eventsLabel,
        "item": `${siteUrl}/${locale === 'en' ? 'en/' : ''}events`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": event.title,
        "item": `${siteUrl}/events/${event.slug}`
      }
    ]
  };
}

/**
 * Generate sitemap entry for event
 */
export function generateEventSitemapEntry(
  event: ProcessedEvent,
  siteUrl: string = 'https://cnusergroup.com'
): object {
  return {
    url: `${siteUrl}/events/${event.slug}`,
    lastmod: event.scrapedAt,
    changefreq: event.isUpcoming ? 'weekly' : 'monthly',
    priority: event.isUpcoming ? 0.8 : 0.6,
    images: event.imageUrl ? [{
      url: event.imageUrl,
      title: event.title,
      caption: `${event.title} - ${event.location}`
    }] : []
  };
}