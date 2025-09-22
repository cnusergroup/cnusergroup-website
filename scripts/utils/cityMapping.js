/**
 * City Mapping System (JavaScript version for Node.js)
 * Maps events to cities based on location text analysis
 */

/**
 * City Mapping Engine
 */
export class CityMappingEngine {
  constructor(cities) {
    this.cities = cities.filter(city => city.active);
    this.mappingRules = this.generateMappingRules();
  }
  
  /**
   * Generate mapping rules based on city data
   */
  generateMappingRules() {
    const rules = [];
    
    this.cities.forEach(city => {
      const zhName = city.name.zh;
      const enName = city.name.en;
      
      // Exact match rules (highest priority)
      rules.push({
        pattern: new RegExp(`\\b${this.escapeRegex(zhName)}\\b`, 'i'),
        cityId: city.id,
        priority: 100,
        type: 'exact'
      });
      
      rules.push({
        pattern: new RegExp(`\\b${this.escapeRegex(enName)}\\b`, 'i'),
        cityId: city.id,
        priority: 99,
        type: 'exact'
      });
      
      // Province + city rules
      const provincePatterns = this.getProvincePatterns(zhName);
      provincePatterns.forEach((pattern, index) => {
        rules.push({
          pattern: new RegExp(pattern, 'i'),
          cityId: city.id,
          priority: 80 - index,
          type: 'province'
        });
      });
      
      // Fuzzy match rules (lower priority)
      if (zhName.length > 2) {
        // Match partial city names
        const partialPattern = zhName.slice(0, -1); // Remove last character
        rules.push({
          pattern: new RegExp(`\\b${this.escapeRegex(partialPattern)}`, 'i'),
          cityId: city.id,
          priority: 60,
          type: 'fuzzy'
        });
      }
      
      // Special keyword rules
      const keywordPatterns = this.getKeywordPatterns(city);
      keywordPatterns.forEach((pattern, index) => {
        rules.push({
          pattern: new RegExp(pattern, 'i'),
          cityId: city.id,
          priority: 40 - index,
          type: 'keyword'
        });
      });
    });
    
    // Sort rules by priority (highest first)
    return rules.sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Get province-based patterns for a city
   */
  getProvincePatterns(cityName) {
    const patterns = [];
    
    // Define province mappings
    const provinceMap = {
      '北京': ['北京市?', '京'],
      '上海': ['上海市?', '沪'],
      '深圳': ['广东.*深圳', '深圳.*广东', '粤.*深圳'],
      '广州': ['广东.*广州', '广州.*广东', '粤.*广州'],
      '杭州': ['浙江.*杭州', '杭州.*浙江', '浙.*杭州'],
      '成都': ['四川.*成都', '成都.*四川', '川.*成都', '蜀.*成都'],
      '武汉': ['湖北.*武汉', '武汉.*湖北', '鄂.*武汉'],
      '西安': ['陕西.*西安', '西安.*陕西', '陕.*西安', '秦.*西安'],
      '南京': ['江苏.*南京', '南京.*江苏', '苏.*南京'],
      '苏州': ['江苏.*苏州', '苏州.*江苏'],
      '福州': ['福建.*福州', '福州.*福建', '闽.*福州'],
      '厦门': ['福建.*厦门', '厦门.*福建', '闽.*厦门'],
      '合肥': ['安徽.*合肥', '合肥.*安徽', '皖.*合肥'],
      '郑州': ['河南.*郑州', '郑州.*河南', '豫.*郑州'],
      '兰州': ['甘肃.*兰州', '兰州.*甘肃', '甘.*兰州', '陇.*兰州'],
      '乌鲁木齐': ['新疆.*乌鲁木齐', '乌鲁木齐.*新疆', '新.*乌鲁木齐'],
      '昌吉': ['新疆.*昌吉', '昌吉.*新疆', '新.*昌吉'],
      '张家口': ['河北.*张家口', '张家口.*河北', '冀.*张家口'],
      '青岛': ['山东.*青岛', '青岛.*山东', '鲁.*青岛'],
      '重庆': ['重庆市?', '渝']
    };
    
    const cityPatterns = provinceMap[cityName];
    if (cityPatterns) {
      patterns.push(...cityPatterns);
    }
    
    return patterns;
  }
  
  /**
   * Get keyword patterns for special cases
   */
  getKeywordPatterns(city) {
    const patterns = [];
    const cityName = city.name.zh;
    
    // Special cases for major cities
    const keywordMap = {
      '北京': ['朝阳', '海淀', '丰台', '东城', '西城', '石景山'],
      '上海': ['浦东', '徐汇', '黄浦', '静安', '普陀', '虹口', '杨浦'],
      '深圳': ['南山', '福田', '罗湖', '宝安', '龙岗', '盐田'],
      '广州': ['天河', '越秀', '荔湾', '海珠', '白云', '黄埔'],
      '重庆': ['渝北', '江北', '九龙坡', '南岸', '沙坪坝']
    };
    
    const keywords = keywordMap[cityName];
    if (keywords) {
      keywords.forEach(keyword => {
        patterns.push(`\\b${this.escapeRegex(keyword)}\\b`);
      });
    }
    
    return patterns;
  }
  
  /**
   * Escape special regex characters
   */
  escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  /**
   * Calculate string similarity using Levenshtein distance
   */
  calculateSimilarity(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    
    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;
    
    const matrix = [];
    
    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }
    
    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }
    
    const maxLen = Math.max(len1, len2);
    return (maxLen - matrix[len1][len2]) / maxLen;
  }
  
  /**
   * Fuzzy match location against city names
   */
  fuzzyMatchLocation(location, threshold = 0.6) {
    const results = [];
    
    this.cities.forEach(city => {
      const zhSimilarity = this.calculateSimilarity(location.toLowerCase(), city.name.zh.toLowerCase());
      const enSimilarity = this.calculateSimilarity(location.toLowerCase(), city.name.en.toLowerCase());
      
      const maxSimilarity = Math.max(zhSimilarity, enSimilarity);
      
      if (maxSimilarity >= threshold) {
        results.push({
          cityId: city.id,
          confidence: maxSimilarity,
          matchType: 'fuzzy',
          matchedText: maxSimilarity === zhSimilarity ? city.name.zh : city.name.en
        });
      }
    });
    
    return results.sort((a, b) => b.confidence - a.confidence);
  }
  
  /**
   * Map a single event to cities
   */
  mapEventToCities(event) {
    const location = event.location;
    if (!location) return [];
    
    const results = [];
    const processedLocation = location.trim();
    
    // Try rule-based matching first
    for (const rule of this.mappingRules) {
      const match = processedLocation.match(rule.pattern);
      if (match) {
        const confidence = this.calculateConfidenceByType(rule.type, rule.priority);
        
        results.push({
          cityId: rule.cityId,
          confidence,
          matchType: rule.type,
          matchedText: match[0]
        });
        
        // For exact matches, we can stop here
        if (rule.type === 'exact' && confidence >= 0.9) {
          break;
        }
      }
    }
    
    // If no high-confidence matches, try fuzzy matching
    if (results.length === 0 || results[0].confidence < 0.7) {
      const fuzzyResults = this.fuzzyMatchLocation(processedLocation, 0.6);
      results.push(...fuzzyResults);
    }
    
    // Remove duplicates and sort by confidence
    const uniqueResults = results.reduce((acc, result) => {
      const existing = acc.find(r => r.cityId === result.cityId);
      if (!existing || existing.confidence < result.confidence) {
        acc = acc.filter(r => r.cityId !== result.cityId);
        acc.push(result);
      }
      return acc;
    }, []);
    
    return uniqueResults.sort((a, b) => b.confidence - a.confidence);
  }
  
  /**
   * Calculate confidence score based on match type and priority
   */
  calculateConfidenceByType(type, priority) {
    const baseConfidence = {
      'exact': 0.95,
      'province': 0.8,
      'fuzzy': 0.6,
      'keyword': 0.7
    };
    
    const base = baseConfidence[type] || 0.5;
    const priorityBonus = (priority - 50) / 100 * 0.1; // Small bonus for higher priority
    
    return Math.min(1.0, Math.max(0.1, base + priorityBonus));
  }
  
  /**
   * Map all events to cities
   */
  mapEventsToCities(events, minConfidence = 0.5) {
    return events.map(event => {
      const mappingResults = this.mapEventToCities(event);
      
      // Filter by minimum confidence and take top matches
      const validMappings = mappingResults
        .filter(result => result.confidence >= minConfidence)
        .slice(0, 3); // Limit to top 3 matches
      
      return {
        ...event,
        cityMappings: validMappings.map(result => result.cityId)
      };
    });
  }
  
  /**
   * Generate city-specific event data
   */
  generateCityMappings(events) {
    const cityMappings = {};
    
    // Initialize mappings for all active cities
    this.cities.forEach(city => {
      cityMappings[city.id] = {
        cityId: city.id,
        cityName: city.name.zh,
        events: [],
        eventCount: 0,
        lastUpdated: new Date().toISOString()
      };
    });
    
    // Add events to their mapped cities
    events.forEach(event => {
      event.cityMappings.forEach(cityId => {
        if (cityMappings[cityId]) {
          cityMappings[cityId].events.push(event);
          cityMappings[cityId].eventCount++;
        }
      });
    });
    
    // Sort events within each city by date (upcoming first)
    Object.values(cityMappings).forEach(mapping => {
      mapping.events.sort((a, b) => {
        if (a.isUpcoming !== b.isUpcoming) {
          return a.isUpcoming ? -1 : 1;
        }
        return a.time.localeCompare(b.time);
      });
    });
    
    return Object.values(cityMappings);
  }
  
  /**
   * Generate mapping statistics
   */
  generateMappingStats(events) {
    const totalEvents = events.length;
    const mappedEvents = events.filter(e => e.cityMappings.length > 0).length;
    const unmappedEvents = totalEvents - mappedEvents;
    
    let highConfidence = 0;
    let mediumConfidence = 0;
    let lowConfidence = 0;
    
    const mappingsByType = {};
    const unmappedLocations = [];
    
    events.forEach(event => {
      if (event.cityMappings.length === 0) {
        if (event.location && !unmappedLocations.includes(event.location)) {
          unmappedLocations.push(event.location);
        }
      } else {
        // For mapped events, we need to check the mapping results
        const mappingResults = this.mapEventToCities(event);
        const bestMatch = mappingResults[0];
        
        if (bestMatch) {
          if (bestMatch.confidence >= 0.8) highConfidence++;
          else if (bestMatch.confidence >= 0.5) mediumConfidence++;
          else lowConfidence++;
          
          mappingsByType[bestMatch.matchType] = (mappingsByType[bestMatch.matchType] || 0) + 1;
        }
      }
    });
    
    return {
      totalEvents,
      mappedEvents,
      unmappedEvents,
      mappingsByConfidence: {
        high: highConfidence,
        medium: mediumConfidence,
        low: lowConfidence
      },
      mappingsByType,
      unmappedLocations: unmappedLocations.slice(0, 20) // Limit to top 20
    };
  }
}

/**
 * Utility function to create city mapping engine
 */
export function createCityMappingEngine(cities) {
  return new CityMappingEngine(cities);
}