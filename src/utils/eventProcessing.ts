/**
 * Event Processing Utilities
 * Handles event data processing, validation, and statistics generation
 */

export interface RawEvent {
  id: string;
  title: string;
  time: string;
  location: string;
  url: string;
  imageUrl: string;
  status: 'upcoming' | 'ended';
  views: number;
  favorites: number;
  scrapedAt: string;
  sort?: number;
  localImage?: string;
}

export interface ProcessedEvent extends RawEvent {
  cityMappings: string[];
  slug: string;
  tags: string[];
  isUpcoming: boolean;
  formattedDate: string;
}

export interface EventStats {
  totalEvents: number;
  upcomingEvents: number;
  pastEvents: number;
  cityDistribution: Record<string, number>;
  engagementMetrics: {
    totalViews: number;
    totalFavorites: number;
    averageViews: number;
    averageFavorites: number;
    topViewedEvents: Array<{
      id: string;
      title: string;
      views: number;
    }>;
    topFavoritedEvents: Array<{
      id: string;
      title: string;
      favorites: number;
    }>;
  };
  mappingStats: {
    mappedEvents: number;
    unmappedEvents: number;
    mappingSuccessRate: number;
  };
  timeDistribution: Record<string, number>;
  lastUpdated: string;
}

/**
 * Generate SEO-friendly slug from event title
 */
export function generateEventSlug(title: string, id: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9\s-]/g, '') // Keep Chinese, English, numbers, spaces, hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

  // Ensure slug is not empty and add ID for uniqueness
  return slug ? `${slug}-${id}` : `event-${id}`;
}

/**
 * Extract tags from event title and location
 */
export function extractEventTags(event: RawEvent): string[] {
  const tags: string[] = [];
  const text = `${event.title} ${event.location}`.toLowerCase();

  // Technology tags
  const techKeywords = [
    'ai', 'artificial intelligence', '人工智能',
    'aws', 'amazon', 'cloud', '云计算',
    'bedrock', 'genai', '生成式ai',
    'machine learning', 'ml', '机器学习',
    'deep learning', 'deepseek', '深度学习',
    'reinvent', 're:invent',
    'serverless', '无服务器',
    'kubernetes', 'k8s',
    'docker', '容器',
    'microservices', '微服务',
    'devops', '开发运维'
  ];

  techKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      tags.push(keyword);
    }
  });

  // Event type tags
  if (text.includes('meetup') || text.includes('聚会')) tags.push('meetup');
  if (text.includes('workshop') || text.includes('工作坊')) tags.push('workshop');
  if (text.includes('conference') || text.includes('大会')) tags.push('conference');
  if (text.includes('community') || text.includes('社区')) tags.push('community');
  if (text.includes('hackathon') || text.includes('黑客马拉松')) tags.push('hackathon');

  return [...new Set(tags)]; // Remove duplicates
}

/**
 * Parse event time string and return Date object
 */
export function parseEventTime(timeStr: string): Date | null {
  if (!timeStr) return null;

  try {
    // Parse time format like "09/21 14:00" or "12/25 19:30"
    const match = timeStr.match(/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/);
    if (!match) return null;

    const [, month, day, hour, minute] = match;
    const currentYear = new Date().getFullYear();
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11
    const eventMonth = parseInt(month);

    // Create date object for current year first
    let eventDate = new Date(currentYear, eventMonth - 1, parseInt(day), parseInt(hour), parseInt(minute));

    // Improved year assignment logic:
    // For events in the same year, keep current year
    // For events that seem to be in the future (next year), assign next year
    // For events that are clearly in the past (previous months), keep current year

    // If event month is significantly in the future compared to current month,
    // and we're in the later part of the year, it might be next year
    if (currentMonth >= 10 && eventMonth <= 3) {
      // We're in Oct-Dec, event is in Jan-Mar, likely next year
      eventDate.setFullYear(currentYear + 1);
    } else if (currentMonth <= 3 && eventMonth >= 10) {
      // We're in Jan-Mar, event is in Oct-Dec, likely previous year
      eventDate.setFullYear(currentYear - 1);
    }
    // Otherwise, assume same year

    return eventDate;
  } catch {
    return null;
  }
}

/**
 * Check if event is upcoming based on status field
 */
export function isEventUpcoming(event: RawEvent): boolean {
  return event.status === 'upcoming';
}

/**
 * Format event date for display
 */
export function formatEventDate(timeStr: string, locale: 'zh' | 'en' = 'zh'): string {
  if (!timeStr) return '';

  try {
    const match = timeStr.match(/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/);
    if (!match) return timeStr;

    const [, month, day, hour, minute] = match;
    const currentYear = new Date().getFullYear();

    const eventDate = new Date(currentYear, parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));

    if (locale === 'en') {
      return eventDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      return `${month}月${day}日 ${hour}:${minute}`;
    }
  } catch {
    return timeStr;
  }
}

/**
 * Process raw events into enhanced event objects
 */
export function processEvents(rawEvents: RawEvent[]): ProcessedEvent[] {
  return rawEvents.map(event => ({
    ...event,
    cityMappings: [], // Will be populated by city mapping system
    slug: generateEventSlug(event.title, event.id),
    tags: extractEventTags(event),
    isUpcoming: isEventUpcoming(event),
    formattedDate: formatEventDate(event.time)
  }));
}

/**
 * Calculate comprehensive event statistics
 */
export function calculateEventStats(events: ProcessedEvent[]): EventStats {
  const totalEvents = events.length;
  const upcomingEvents = events.filter(e => e.isUpcoming).length;
  const pastEvents = totalEvents - upcomingEvents;

  // City distribution
  const cityDistribution: Record<string, number> = {};
  events.forEach(event => {
    event.cityMappings.forEach(cityId => {
      cityDistribution[cityId] = (cityDistribution[cityId] || 0) + 1;
    });
  });

  // Engagement metrics
  const totalViews = events.reduce((sum, e) => sum + (e.views || 0), 0);
  const totalFavorites = events.reduce((sum, e) => sum + (e.favorites || 0), 0);
  const averageViews = totalEvents > 0 ? Math.round(totalViews / totalEvents) : 0;
  const averageFavorites = totalEvents > 0 ? Math.round(totalFavorites / totalEvents) : 0;

  // Top events
  const topViewedEvents = events
    .filter(e => e.views > 0)
    .sort((a, b) => b.views - a.views)
    .slice(0, 5)
    .map(e => ({ id: e.id, title: e.title, views: e.views }));

  const topFavoritedEvents = events
    .filter(e => e.favorites > 0)
    .sort((a, b) => b.favorites - a.favorites)
    .slice(0, 5)
    .map(e => ({ id: e.id, title: e.title, favorites: e.favorites }));

  // Mapping stats
  const mappedEvents = events.filter(e => e.cityMappings.length > 0).length;
  const unmappedEvents = totalEvents - mappedEvents;
  const mappingSuccessRate = totalEvents > 0 ? Math.round((mappedEvents / totalEvents) * 100) / 100 : 0;

  // Time distribution
  const timeDistribution: Record<string, number> = {};
  events.forEach(event => {
    if (event.time) {
      const month = event.time.substring(0, 5); // "MM/DD" format
      timeDistribution[month] = (timeDistribution[month] || 0) + 1;
    }
  });

  return {
    totalEvents,
    upcomingEvents,
    pastEvents,
    cityDistribution,
    engagementMetrics: {
      totalViews,
      totalFavorites,
      averageViews,
      averageFavorites,
      topViewedEvents,
      topFavoritedEvents
    },
    mappingStats: {
      mappedEvents,
      unmappedEvents,
      mappingSuccessRate
    },
    timeDistribution,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Validate event data quality
 */
export function validateEventData(events: RawEvent[]): {
  valid: RawEvent[];
  invalid: Array<{ event: RawEvent; issues: string[] }>;
  summary: {
    totalEvents: number;
    validEvents: number;
    invalidEvents: number;
    commonIssues: Record<string, number>;
  };
} {
  const valid: RawEvent[] = [];
  const invalid: Array<{ event: RawEvent; issues: string[] }> = [];
  const commonIssues: Record<string, number> = {};

  events.forEach(event => {
    const issues: string[] = [];

    // Required fields validation
    if (!event.id) issues.push('Missing event ID');
    if (!event.title || event.title.trim().length === 0) issues.push('Missing or empty title');
    if (!event.url) issues.push('Missing event URL');

    // Data quality validation
    if (event.title && event.title.length > 200) issues.push('Title too long (>200 chars)');
    if (event.location && event.location.length > 100) issues.push('Location too long (>100 chars)');
    if (event.views && (event.views < 0 || event.views > 1000000)) issues.push('Invalid view count');
    if (event.favorites && (event.favorites < 0 || event.favorites > 100000)) issues.push('Invalid favorite count');

    // URL validation
    if (event.url && !event.url.startsWith('http')) issues.push('Invalid URL format');
    if (event.imageUrl && event.imageUrl && !event.imageUrl.startsWith('http')) issues.push('Invalid image URL format');

    // Time format validation
    if (event.time && !/^\d{2}\/\d{2}\s+\d{2}:\d{2}$/.test(event.time)) {
      issues.push('Invalid time format (expected MM/DD HH:MM)');
    }

    // Track common issues
    issues.forEach(issue => {
      commonIssues[issue] = (commonIssues[issue] || 0) + 1;
    });

    if (issues.length === 0) {
      valid.push(event);
    } else {
      invalid.push({ event, issues });
    }
  });

  return {
    valid,
    invalid,
    summary: {
      totalEvents: events.length,
      validEvents: valid.length,
      invalidEvents: invalid.length,
      commonIssues
    }
  };
}

/**
 * Sort events by various criteria with status-based priority
 */
export function sortEvents(events: ProcessedEvent[], sortBy: 'date' | 'views' | 'favorites' | 'title' | 'scraped' | 'id' | 'sort' = 'scraped', order: 'asc' | 'desc' = 'desc'): ProcessedEvent[] {
  const sorted = [...events].sort((a, b) => {
    // First priority: upcoming events always come before ended events
    if (a.status !== b.status) {
      if (a.status === 'upcoming' && b.status === 'ended') return -1;
      if (a.status === 'ended' && b.status === 'upcoming') return 1;
    }

    // Second priority: sort by the specified criteria within the same status group
    let comparison = 0;

    switch (sortBy) {
      case 'scraped':
        // Sort by scrapedAt timestamp - earliest scraped first (asc)
        const scrapedA = new Date(a.scrapedAt || 0).getTime();
        const scrapedB = new Date(b.scrapedAt || 0).getTime();
        comparison = scrapedA - scrapedB; // Ascending (earliest first)
        break;
      case 'date':
        // Parse actual dates for proper comparison
        const dateA = parseEventTime(a.time);
        const dateB = parseEventTime(b.time);

        if (!dateA && !dateB) {
          comparison = 0;
        } else if (!dateA) {
          comparison = 1; // Put events without dates at the end
        } else if (!dateB) {
          comparison = -1;
        } else {
          // For upcoming events: sort by date ascending (earliest first)
          // For ended events: sort by date descending (most recent first)
          if (a.status === 'upcoming') {
            comparison = dateA.getTime() - dateB.getTime(); // Ascending for upcoming
          } else {
            comparison = dateB.getTime() - dateA.getTime(); // Descending for ended
          }
        }
        break;
      case 'views':
        comparison = (a.views || 0) - (b.views || 0);
        break;
      case 'favorites':
        comparison = (a.favorites || 0) - (b.favorites || 0);
        break;
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'id':
        // Sort by id - convert to number for proper numeric comparison
        const idA = parseInt(a.id);
        const idB = parseInt(b.id);
        comparison = idB - idA; // Descending (larger id first)
        break;
      case 'sort':
        // Sort by sort field - ascending order (1, 2, 3...)
        const sortA = (a as any).sort || 0;
        const sortB = (b as any).sort || 0;
        comparison = sortA - sortB; // Ascending (smaller sort first)
        break;
    }

    // Apply order only for non-scraped, non-date, non-id, and non-sort sorting
    if (sortBy !== 'scraped' && sortBy !== 'date' && sortBy !== 'id' && sortBy !== 'sort') {
      return order === 'desc' ? -comparison : comparison;
    }

    return comparison;
  });

  return sorted;
}

/**
 * Filter events by various criteria
 */
export function filterEvents(events: ProcessedEvent[], filters: {
  cityId?: string;
  isUpcoming?: boolean;
  tags?: string[];
  searchQuery?: string;
}): ProcessedEvent[] {
  return events.filter(event => {
    // City filter
    if (filters.cityId && !event.cityMappings.includes(filters.cityId)) {
      return false;
    }

    // Upcoming filter
    if (filters.isUpcoming !== undefined && event.isUpcoming !== filters.isUpcoming) {
      return false;
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some(tag => event.tags.includes(tag));
      if (!hasMatchingTag) return false;
    }

    // Search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase().trim();
      if (query) {
        // Create comprehensive search text including all relevant fields
        const searchFields = [
          event.title,
          event.location,
          event.tags.join(' '),
          event.cityMappings.join(' '),
          event.time,
          event.formattedDate || ''
        ];
        
        const searchText = searchFields.join(' ').toLowerCase();
        
        // Support multiple search terms (AND logic)
        const searchTerms = query.split(/\s+/).filter(term => term.length > 0);
        const matchesAllTerms = searchTerms.every(term => searchText.includes(term));
        
        if (!matchesAllTerms) return false;
      }
    }

    return true;
  });
}