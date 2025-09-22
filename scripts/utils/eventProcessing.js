/**
 * Event Processing Utilities (JavaScript version for Node.js)
 * Handles event data processing, validation, and statistics generation
 */

/**
 * Generate SEO-friendly slug from event title
 */
export function generateEventSlug(title, id) {
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
export function extractEventTags(event) {
  const tags = [];
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
 * Check if event is upcoming based on status field
 */
export function isEventUpcoming(event) {
  return event.status === 'upcoming';
}

/**
 * Format event date for display
 */
export function formatEventDate(timeStr, locale = 'zh') {
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
export function processEvents(rawEvents) {
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
export function calculateEventStats(events) {
  const totalEvents = events.length;
  const upcomingEvents = events.filter(e => e.isUpcoming).length;
  const pastEvents = totalEvents - upcomingEvents;

  // City distribution
  const cityDistribution = {};
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
  const timeDistribution = {};
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
 * Remove duplicate events based on multiple criteria
 */
export function removeDuplicateEvents(events) {
  const duplicates = [];
  const unique = [];
  const seenIds = new Set();
  const seenUrls = new Set();
  const seenTitleTimeLocation = new Set();

  events.forEach((event, index) => {
    const isDuplicate = [];

    // Check for ID duplicates (highest priority)
    if (event.id && seenIds.has(event.id)) {
      isDuplicate.push('Duplicate ID');
    } else if (event.id) {
      seenIds.add(event.id);
    }

    // Check for URL duplicates (high priority)
    if (event.url && seenUrls.has(event.url)) {
      isDuplicate.push('Duplicate URL');
    } else if (event.url) {
      seenUrls.add(event.url);
    }

    // Check for title + time + location duplicates (content-based matching)
    // This catches cases where the same event might have different IDs/URLs but same content
    if (event.title && event.time && event.location) {
      // Normalize the key for better matching
      const normalizedTitle = event.title.trim().toLowerCase()
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/[^\u4e00-\u9fa5a-z0-9\s]/g, ''); // Keep only Chinese, English, numbers, spaces

      const normalizedLocation = event.location.trim().toLowerCase()
        .replace(/\s+/g, ' ');

      const titleTimeLocationKey = `${normalizedTitle}_${event.time}_${normalizedLocation}`;

      if (seenTitleTimeLocation.has(titleTimeLocationKey)) {
        isDuplicate.push('Duplicate title, time and location');
      } else {
        seenTitleTimeLocation.add(titleTimeLocationKey);
      }
    }

    if (isDuplicate.length > 0) {
      duplicates.push({
        event,
        index,
        reasons: isDuplicate
      });
    } else {
      unique.push(event);
    }
  });

  return {
    unique,
    duplicates,
    summary: {
      originalCount: events.length,
      uniqueCount: unique.length,
      duplicateCount: duplicates.length,
      duplicateReasons: duplicates.reduce((acc, dup) => {
        dup.reasons.forEach(reason => {
          acc[reason] = (acc[reason] || 0) + 1;
        });
        return acc;
      }, {})
    }
  };
}

/**
 * Clean and normalize event data
 */
export function cleanEventData(events) {
  const cleaned = [];
  const cleaningActions = [];

  events.forEach((event, index) => {
    const cleanedEvent = { ...event };
    const actions = [];

    // Clean title
    if (cleanedEvent.title) {
      const originalTitle = cleanedEvent.title;
      cleanedEvent.title = cleanedEvent.title
        .trim()
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width characters
        .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s\-\(\)\[\]【】：:，,。.！!？?]/g, ''); // Keep only valid characters

      if (originalTitle !== cleanedEvent.title) {
        actions.push('Cleaned title');
      }
    }

    // Clean location
    if (cleanedEvent.location) {
      const originalLocation = cleanedEvent.location;
      cleanedEvent.location = cleanedEvent.location
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[\u200B-\u200D\uFEFF]/g, '');

      if (originalLocation !== cleanedEvent.location) {
        actions.push('Cleaned location');
      }
    }

    // Normalize time format
    if (cleanedEvent.time) {
      const originalTime = cleanedEvent.time;
      // Try to normalize various time formats to MM/DD HH:MM
      let normalizedTime = cleanedEvent.time.trim();

      // Handle formats like "2024-06-05 13:00" or "06-05 13:00"
      const dateTimeMatch = normalizedTime.match(/(\d{2,4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})/);
      if (dateTimeMatch) {
        const [, year, month, day, hour, minute] = dateTimeMatch;
        normalizedTime = `${month.padStart(2, '0')}/${day.padStart(2, '0')} ${hour.padStart(2, '0')}:${minute}`;
      }

      // Handle formats like "6月5日 13:00"
      const chineseDateMatch = normalizedTime.match(/(\d{1,2})月(\d{1,2})日\s+(\d{1,2}):(\d{2})/);
      if (chineseDateMatch) {
        const [, month, day, hour, minute] = chineseDateMatch;
        normalizedTime = `${month.padStart(2, '0')}/${day.padStart(2, '0')} ${hour.padStart(2, '0')}:${minute}`;
      }

      cleanedEvent.time = normalizedTime;

      if (originalTime !== normalizedTime) {
        actions.push('Normalized time format');
      }
    }

    // Normalize URLs
    if (cleanedEvent.url) {
      const originalUrl = cleanedEvent.url;
      try {
        const url = new URL(cleanedEvent.url);
        cleanedEvent.url = url.toString();

        if (originalUrl !== cleanedEvent.url) {
          actions.push('Normalized URL');
        }
      } catch {
        // Keep original URL if normalization fails
      }
    }

    // Normalize image URLs
    if (cleanedEvent.imageUrl) {
      const originalImageUrl = cleanedEvent.imageUrl;
      try {
        const url = new URL(cleanedEvent.imageUrl);
        cleanedEvent.imageUrl = url.toString();

        if (originalImageUrl !== cleanedEvent.imageUrl) {
          actions.push('Normalized image URL');
        }
      } catch {
        // Keep original URL if normalization fails
      }
    }

    // Normalize numeric values
    if (cleanedEvent.views !== undefined) {
      const originalViews = cleanedEvent.views;
      cleanedEvent.views = Math.max(0, parseInt(cleanedEvent.views) || 0);

      if (originalViews !== cleanedEvent.views) {
        actions.push('Normalized view count');
      }
    }

    if (cleanedEvent.favorites !== undefined) {
      const originalFavorites = cleanedEvent.favorites;
      cleanedEvent.favorites = Math.max(0, parseInt(cleanedEvent.favorites) || 0);

      if (originalFavorites !== cleanedEvent.favorites) {
        actions.push('Normalized favorite count');
      }
    }

    cleaned.push(cleanedEvent);

    if (actions.length > 0) {
      cleaningActions.push({
        index,
        eventId: event.id,
        actions
      });
    }
  });

  return {
    cleaned,
    cleaningActions,
    summary: {
      totalEvents: events.length,
      cleanedEvents: cleaningActions.length,
      cleaningStats: cleaningActions.reduce((acc, action) => {
        action.actions.forEach(actionType => {
          acc[actionType] = (acc[actionType] || 0) + 1;
        });
        return acc;
      }, {})
    }
  };
}

/**
 * Validate event data quality with enhanced checks
 */
export function validateEventData(events) {
  const valid = [];
  const invalid = [];
  const warnings = [];
  const commonIssues = {};

  events.forEach((event, index) => {
    const issues = [];
    const warningIssues = [];

    // Critical validation (will mark as invalid)
    if (!event.id) issues.push('Missing event ID');
    if (!event.title || event.title.trim().length === 0) issues.push('Missing or empty title');
    if (!event.url) issues.push('Missing event URL');

    // Data format validation
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

    // Warning-level validation (won't mark as invalid but will be reported)
    if (!event.location || event.location.trim().length === 0) {
      warningIssues.push('Missing location information');
    }

    if (!event.imageUrl) {
      warningIssues.push('Missing event image');
    }

    if (event.views === undefined || event.views === null) {
      warningIssues.push('No view count data');
    }

    if (event.favorites === undefined || event.favorites === null) {
      warningIssues.push('No favorite count data');
    }

    // Check for suspicious data patterns
    if (event.title && event.title.length < 10) {
      warningIssues.push('Very short title (might be incomplete)');
    }

    if (event.location && event.location.includes('未知') || event.location === 'TBD') {
      warningIssues.push('Unknown or TBD location');
    }

    // Track all issues
    [...issues, ...warningIssues].forEach(issue => {
      commonIssues[issue] = (commonIssues[issue] || 0) + 1;
    });

    if (issues.length === 0) {
      valid.push(event);
      if (warningIssues.length > 0) {
        warnings.push({ event, index, issues: warningIssues });
      }
    } else {
      invalid.push({ event, index, issues, warnings: warningIssues });
    }
  });

  return {
    valid,
    invalid,
    warnings,
    summary: {
      totalEvents: events.length,
      validEvents: valid.length,
      invalidEvents: invalid.length,
      warningEvents: warnings.length,
      commonIssues,
      qualityScore: events.length > 0 ? Math.round((valid.length / events.length) * 100) : 0
    }
  };
}

/**
 * Generate comprehensive data quality report
 */
export function generateDataQualityReport(events, validation, deduplication, cleaning) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      originalEventCount: events.length,
      finalEventCount: validation.valid.length,
      dataQualityScore: validation.summary.qualityScore,
      processingSteps: {
        deduplication: deduplication ? deduplication.summary : null,
        cleaning: cleaning ? cleaning.summary : null,
        validation: validation.summary
      }
    },
    issues: {
      critical: validation.invalid.map(item => ({
        eventId: item.event.id,
        title: item.event.title,
        issues: item.issues
      })),
      warnings: validation.warnings.map(item => ({
        eventId: item.event.id,
        title: item.event.title,
        issues: item.issues
      })),
      duplicates: deduplication ? deduplication.duplicates.map(item => ({
        eventId: item.event.id,
        title: item.event.title,
        reasons: item.reasons
      })) : []
    },
    statistics: {
      commonIssues: validation.summary.commonIssues,
      duplicateReasons: deduplication ? deduplication.summary.duplicateReasons : {},
      cleaningActions: cleaning ? cleaning.summary.cleaningStats : {}
    },
    recommendations: generateQualityRecommendations(validation, deduplication, cleaning)
  };

  return report;
}

/**
 * Generate quality improvement recommendations
 */
function generateQualityRecommendations(validation, deduplication, cleaning) {
  const recommendations = [];

  // Critical issues
  if (validation.invalid.length > 0) {
    recommendations.push({
      priority: 'high',
      category: 'data_integrity',
      message: `${validation.invalid.length} events have critical issues and were excluded`,
      action: 'Review and fix data source or scraping logic'
    });
  }

  // Duplicate issues
  if (deduplication && deduplication.duplicates.length > 0) {
    recommendations.push({
      priority: 'medium',
      category: 'data_quality',
      message: `${deduplication.duplicates.length} duplicate events were removed`,
      action: 'Improve scraping logic to prevent duplicates'
    });
  }

  // Warning issues
  if (validation.warnings.length > 0) {
    const warningRate = (validation.warnings.length / validation.summary.totalEvents) * 100;
    if (warningRate > 20) {
      recommendations.push({
        priority: 'medium',
        category: 'data_completeness',
        message: `${warningRate.toFixed(1)}% of events have data completeness issues`,
        action: 'Enhance scraping to capture missing fields'
      });
    }
  }

  // Quality score
  if (validation.summary.qualityScore < 80) {
    recommendations.push({
      priority: 'high',
      category: 'overall_quality',
      message: `Data quality score is ${validation.summary.qualityScore}% (below 80% threshold)`,
      action: 'Comprehensive review of data collection and processing pipeline needed'
    });
  }

  return recommendations;
}