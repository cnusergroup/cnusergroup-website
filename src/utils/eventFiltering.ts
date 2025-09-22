/**
 * Event Filtering Utilities
 * Provides language-specific event filtering functionality
 */

import type { ProcessedEvent } from './eventProcessing.js';

export interface EventFilterOptions {
  locale?: 'zh' | 'en';
  status?: 'all' | 'upcoming' | 'past';
  tags?: string[];
  locations?: string[];
  searchQuery?: string;
  cityId?: string;
  dateRange?: {
    start?: Date;
    end?: Date;
  };
}

/**
 * Filter events based on language and other criteria
 */
export function filterEventsByLanguage(
  events: ProcessedEvent[], 
  options: EventFilterOptions = {}
): ProcessedEvent[] {
  const {
    locale = 'zh',
    status = 'all',
    tags = [],
    locations = [],
    searchQuery = '',
    cityId,
    dateRange
  } = options;

  let filteredEvents = [...events];

  // Filter by status
  if (status !== 'all') {
    filteredEvents = filteredEvents.filter(event => {
      if (status === 'upcoming') return event.isUpcoming;
      if (status === 'past') return !event.isUpcoming;
      return true;
    });
  }

  // Filter by tags
  if (tags.length > 0) {
    filteredEvents = filteredEvents.filter(event =>
      tags.some(tag => event.tags.includes(tag))
    );
  }

  // Filter by locations
  if (locations.length > 0) {
    filteredEvents = filteredEvents.filter(event =>
      locations.some(location => 
        event.location.toLowerCase().includes(location.toLowerCase())
      )
    );
  }

  // Filter by city
  if (cityId) {
    filteredEvents = filteredEvents.filter(event =>
      event.cityMappings.includes(cityId)
    );
  }

  // Filter by search query (language-aware)
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredEvents = filteredEvents.filter(event => {
      // Search in title and location
      const titleMatch = event.title.toLowerCase().includes(query);
      const locationMatch = event.location.toLowerCase().includes(query);
      
      // Language-specific search enhancements
      if (locale === 'zh') {
        // For Chinese, also search in tags and do partial matching
        const tagMatch = event.tags.some(tag => 
          tag.toLowerCase().includes(query)
        );
        return titleMatch || locationMatch || tagMatch;
      } else {
        // For English, use more strict matching
        return titleMatch || locationMatch;
      }
    });
  }

  // Filter by date range
  if (dateRange) {
    filteredEvents = filteredEvents.filter(event => {
      const eventDate = new Date(event.time);
      if (dateRange.start && eventDate < dateRange.start) return false;
      if (dateRange.end && eventDate > dateRange.end) return false;
      return true;
    });
  }

  return filteredEvents;
}

/**
 * Get available filter options from events
 */
export function getFilterOptions(events: ProcessedEvent[], locale: 'zh' | 'en' = 'zh') {
  const tags = new Set<string>();
  const locations = new Set<string>();
  const cities = new Set<string>();

  events.forEach(event => {
    // Collect tags
    event.tags.forEach(tag => tags.add(tag));
    
    // Collect locations
    if (event.location) {
      locations.add(event.location);
    }
    
    // Collect cities
    event.cityMappings.forEach(cityId => cities.add(cityId));
  });

  return {
    tags: Array.from(tags).sort(),
    locations: Array.from(locations).sort(),
    cities: Array.from(cities).sort(),
    statusOptions: [
      { value: 'all', label: locale === 'zh' ? '全部活动' : 'All Events' },
      { value: 'upcoming', label: locale === 'zh' ? '即将举行' : 'Upcoming' },
      { value: 'past', label: locale === 'zh' ? '已结束' : 'Past Events' }
    ]
  };
}

/**
 * Sort events with language-specific preferences
 */
export function sortEventsByLanguage(
  events: ProcessedEvent[], 
  sortBy: 'date' | 'popularity' | 'relevance' = 'date',
  order: 'asc' | 'desc' = 'desc',
  locale: 'zh' | 'en' = 'zh'
): ProcessedEvent[] {
  const sortedEvents = [...events];

  sortedEvents.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'date':
        // Always prioritize upcoming events
        if (a.isUpcoming !== b.isUpcoming) {
          return a.isUpcoming ? -1 : 1;
        }
        comparison = new Date(a.time).getTime() - new Date(b.time).getTime();
        break;
        
      case 'popularity':
        const aPopularity = a.views + a.favorites * 2;
        const bPopularity = b.views + b.favorites * 2;
        comparison = aPopularity - bPopularity;
        break;
        
      case 'relevance':
        // Language-specific relevance scoring
        const aScore = calculateRelevanceScore(a, locale);
        const bScore = calculateRelevanceScore(b, locale);
        comparison = aScore - bScore;
        break;
    }

    return order === 'asc' ? comparison : -comparison;
  });

  return sortedEvents;
}

/**
 * Calculate relevance score for an event based on language
 */
function calculateRelevanceScore(event: ProcessedEvent, locale: 'zh' | 'en'): number {
  let score = 0;

  // Base score from engagement
  score += event.views * 0.1;
  score += event.favorites * 0.5;

  // Boost upcoming events
  if (event.isUpcoming) {
    score += 100;
  }

  // Language-specific scoring
  if (locale === 'zh') {
    // Boost events with Chinese characters in title
    if (/[\u4e00-\u9fff]/.test(event.title)) {
      score += 50;
    }
    
    // Boost events in major Chinese cities
    const majorCities = ['beijing', 'shanghai', 'shenzhen', 'guangzhou', 'hangzhou'];
    if (event.cityMappings.some(city => majorCities.includes(city))) {
      score += 30;
    }
  } else {
    // Boost events with English content
    if (/^[a-zA-Z\s\d\-_.,!?()]+$/.test(event.title)) {
      score += 50;
    }
  }

  // Recent events get higher scores
  const daysSinceScraped = Math.floor(
    (Date.now() - new Date(event.scrapedAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  score += Math.max(0, 30 - daysSinceScraped);

  return score;
}

/**
 * Generate filter URL parameters
 */
export function generateFilterParams(options: EventFilterOptions): URLSearchParams {
  const params = new URLSearchParams();

  if (options.status && options.status !== 'all') {
    params.set('status', options.status);
  }

  if (options.tags && options.tags.length > 0) {
    params.set('tags', options.tags.join(','));
  }

  if (options.locations && options.locations.length > 0) {
    params.set('locations', options.locations.join(','));
  }

  if (options.searchQuery) {
    params.set('q', options.searchQuery);
  }

  if (options.cityId) {
    params.set('city', options.cityId);
  }

  return params;
}

/**
 * Parse filter parameters from URL
 */
export function parseFilterParams(searchParams: URLSearchParams): EventFilterOptions {
  return {
    status: (searchParams.get('status') as 'all' | 'upcoming' | 'past') || 'all',
    tags: searchParams.get('tags')?.split(',').filter(Boolean) || [],
    locations: searchParams.get('locations')?.split(',').filter(Boolean) || [],
    searchQuery: searchParams.get('q') || '',
    cityId: searchParams.get('city') || undefined
  };
}