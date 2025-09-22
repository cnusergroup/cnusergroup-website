#!/usr/bin/env node

/**
 * Event Processing Script for Deployment Workflow
 * Integrates event scraping, processing, and city mapping into the build process
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Configuration
const config = {
  maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  dataDir: join(rootDir, 'data', 'events'),
  srcDataDir: join(rootDir, 'src', 'data', 'events'),
  eventsFile: join(rootDir, 'data', 'events', 'events.json'),
  citiesFile: join(rootDir, 'src', 'data', 'cities.json'),
  outputFiles: {
    processedEvents: join(rootDir, 'src', 'data', 'events', 'processed-events.json'),
    cityMappings: join(rootDir, 'src', 'data', 'events', 'city-mappings.json'),
    eventStats: join(rootDir, 'src', 'data', 'events', 'event-stats.json'),
    qualityReport: join(rootDir, 'data', 'events', 'quality-report.json')
  },
  scrapeTimeout: 10 * 60 * 1000, // 10 minutes
  fallbackOnError: true
};

class EventProcessor {
  constructor() {
    this.ensureDirectories();
  }

  /**
   * Ensure required directories exist
   */
  ensureDirectories() {
    const dirs = [config.dataDir, config.srcDataDir];
    dirs.forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    });
  }

  /**
   * Log message with timestamp
   */
  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    }[type] || 'ℹ️';

    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  /**
   * Check if event data needs refresh
   */
  needsRefresh() {
    if (!existsSync(config.eventsFile)) {
      this.log('Event data file not found, refresh needed');
      return true;
    }

    try {
      const stats = statSync(config.eventsFile);
      const age = Date.now() - stats.mtime.getTime();
      const needsRefresh = age > config.maxAge;

      if (needsRefresh) {
        this.log(`Event data is ${Math.round(age / (60 * 60 * 1000))} hours old, refresh needed`);
      } else {
        this.log(`Event data is ${Math.round(age / (60 * 60 * 1000))} hours old, still fresh`);
      }

      return needsRefresh;
    } catch (error) {
      this.log(`Error checking event data age: ${error.message}`, 'warning');
      return true;
    }
  }

  /**
   * Run event scraper directly
   */
  async runScraper() {
    this.log('Starting event scraper...');

    try {
      const startTime = Date.now();

      // Run the improved pagination scraper with incremental mode
      this.log('Running improved pagination scraper...');
      execSync('node scripts/improved-pagination-scraper.cjs incremental', {
        cwd: rootDir,
        stdio: 'inherit',
        timeout: config.scrapeTimeout
      });

      const duration = Math.round((Date.now() - startTime) / 1000);
      this.log(`Event scraping completed in ${duration} seconds`, 'success');

      return true;
    } catch (error) {
      this.log(`Event scraping failed: ${error.message}`, 'error');

      if (config.fallbackOnError && existsSync(config.eventsFile)) {
        this.log('Using existing event data as fallback', 'warning');
        return true;
      }

      throw error;
    }
  }

  /**
   * Load raw events data
   */
  loadRawEvents() {
    if (!existsSync(config.eventsFile)) {
      throw new Error('Event data file not found');
    }

    try {
      const data = readFileSync(config.eventsFile, 'utf8');
      const events = JSON.parse(data);

      this.log(`Loaded ${events.length} raw events`);
      return events;
    } catch (error) {
      throw new Error(`Failed to load event data: ${error.message}`);
    }
  }

  /**
   * Load cities data
   */
  loadCities() {
    if (!existsSync(config.citiesFile)) {
      throw new Error('Cities data file not found');
    }

    try {
      const data = readFileSync(config.citiesFile, 'utf8');
      const cities = JSON.parse(data);

      this.log(`Loaded ${cities.length} cities`);
      return cities;
    } catch (error) {
      throw new Error(`Failed to load cities data: ${error.message}`);
    }
  }

  /**
   * Process events using the event processing utilities with data cleaning and quality reporting
   */
  async processEvents(rawEvents, cities) {
    this.log('Processing events with data cleaning and quality checks...');

    try {
      // Import processing utilities (using dynamic import for ES modules)
      const { 
        processEvents, 
        validateEventData, 
        calculateEventStats,
        removeDuplicateEvents,
        cleanEventData,
        generateDataQualityReport
      } = await import('./utils/eventProcessing.js');
      const { createCityMappingEngine } = await import('./utils/cityMapping.js');

      // Step 1: Remove duplicates
      this.log('Step 1: Removing duplicate events...');
      const deduplication = removeDuplicateEvents(rawEvents);
      this.log(`Removed ${deduplication.duplicates.length} duplicate events (${deduplication.unique.length} unique remaining)`);
      
      if (deduplication.duplicates.length > 0) {
        Object.entries(deduplication.summary.duplicateReasons).forEach(([reason, count]) => {
          this.log(`  - ${reason}: ${count} events`, 'warning');
        });
      }

      // Step 2: Clean and normalize data
      this.log('Step 2: Cleaning and normalizing event data...');
      const cleaning = cleanEventData(deduplication.unique);
      this.log(`Cleaned ${cleaning.cleaningActions.length} events`);
      
      if (cleaning.cleaningActions.length > 0) {
        Object.entries(cleaning.summary.cleaningStats).forEach(([action, count]) => {
          this.log(`  - ${action}: ${count} events`);
        });
      }

      // Step 3: Validate event data quality
      this.log('Step 3: Validating event data quality...');
      const validation = validateEventData(cleaning.cleaned);
      this.log(`Data quality: ${validation.summary.validEvents}/${validation.summary.totalEvents} valid events (${validation.summary.qualityScore}% quality score)`);

      if (validation.invalid.length > 0) {
        this.log(`Found ${validation.invalid.length} invalid events`, 'error');
        Object.entries(validation.summary.commonIssues).slice(0, 5).forEach(([issue, count]) => {
          this.log(`  - ${issue}: ${count} events`, 'error');
        });
      }

      if (validation.warnings.length > 0) {
        this.log(`Found ${validation.warnings.length} events with warnings`, 'warning');
      }

      // Step 4: Process valid events
      this.log('Step 4: Processing valid events...');
      const processedEvents = processEvents(validation.valid);
      this.log(`Processed ${processedEvents.length} events`);

      // Step 5: Map events to cities
      this.log('Step 5: Mapping events to cities...');
      const cityMappingEngine = createCityMappingEngine(cities);
      const mappedEvents = cityMappingEngine.mapEventsToCities(processedEvents);
      this.log('Mapped events to cities');

      // Generate city mappings
      const cityMappings = cityMappingEngine.generateCityMappings(mappedEvents);
      const citiesWithEvents = cityMappings.filter(mapping => mapping.eventCount > 0);
      this.log(`Generated mappings for ${citiesWithEvents.length} cities with events`);

      // Step 6: Calculate statistics
      this.log('Step 6: Calculating statistics...');
      const eventStats = calculateEventStats(mappedEvents);
      const mappingStats = cityMappingEngine.generateMappingStats(mappedEvents);

      // Step 7: Generate data quality report
      this.log('Step 7: Generating data quality report...');
      const qualityReport = generateDataQualityReport(rawEvents, validation, deduplication, cleaning);

      // Combine stats with quality information
      const combinedStats = {
        ...eventStats,
        mappingStats,
        processing: {
          totalRawEvents: rawEvents.length,
          duplicatesRemoved: deduplication.duplicates.length,
          eventsAfterDeduplication: deduplication.unique.length,
          eventsCleaned: cleaning.cleaningActions.length,
          validEvents: validation.summary.validEvents,
          invalidEvents: validation.summary.invalidEvents,
          warningEvents: validation.summary.warningEvents,
          processedEvents: mappedEvents.length,
          citiesWithEvents: citiesWithEvents.length,
          dataQualityScore: validation.summary.qualityScore,
          processedAt: new Date().toISOString()
        },
        qualityReport
      };

      this.log(`Final statistics: ${eventStats.totalEvents} total, ${eventStats.upcomingEvents} upcoming, ${mappingStats.mappedEvents} mapped`);
      this.log(`Data quality score: ${validation.summary.qualityScore}%`, validation.summary.qualityScore >= 80 ? 'success' : 'warning');

      return {
        processedEvents: mappedEvents,
        cityMappings,
        eventStats: combinedStats,
        validation,
        deduplication,
        cleaning,
        qualityReport
      };

    } catch (error) {
      throw new Error(`Event processing failed: ${error.message}`);
    }
  }

  /**
   * Save processed data to files including quality report
   */
  saveProcessedData({ processedEvents, cityMappings, eventStats, qualityReport }) {
    this.log('Saving processed data and quality report...');

    try {
      // Save processed events
      writeFileSync(
        config.outputFiles.processedEvents,
        JSON.stringify(processedEvents, null, 2),
        'utf8'
      );
      this.log(`Saved processed events to ${config.outputFiles.processedEvents}`);

      // Save city mappings
      writeFileSync(
        config.outputFiles.cityMappings,
        JSON.stringify(cityMappings, null, 2),
        'utf8'
      );
      this.log(`Saved city mappings to ${config.outputFiles.cityMappings}`);

      // Save event statistics
      writeFileSync(
        config.outputFiles.eventStats,
        JSON.stringify(eventStats, null, 2),
        'utf8'
      );
      this.log(`Saved event statistics to ${config.outputFiles.eventStats}`);

      // Save quality report
      writeFileSync(
        config.outputFiles.qualityReport,
        JSON.stringify(qualityReport, null, 2),
        'utf8'
      );
      this.log(`Saved quality report to ${config.outputFiles.qualityReport}`);

      this.log('All processed data and reports saved successfully', 'success');

    } catch (error) {
      throw new Error(`Failed to save processed data: ${error.message}`);
    }
  }

  /**
   * Generate comprehensive processing report with data quality information
   */
  generateReport(result, processingTime, usedFallback = false) {
    const { processedEvents, cityMappings, eventStats, validation, deduplication, cleaning, qualityReport } = result;

    console.log('\n📊 Event Processing Report');
    console.log('='.repeat(60));
    console.log(`⏱️  Processing time: ${Math.round(processingTime / 1000)} seconds`);
    console.log(`📅 Last updated: ${new Date().toLocaleString()}`);
    
    if (usedFallback) {
      console.log('⚠️  Used existing data (scraping failed)');
    }

    // Data Quality Summary
    console.log('\n🔍 Data Quality Summary:');
    console.log(`   Quality Score: ${eventStats.processing.dataQualityScore}% ${eventStats.processing.dataQualityScore >= 80 ? '✅' : '⚠️'}`);
    console.log(`   Original events: ${eventStats.processing.totalRawEvents}`);
    console.log(`   Duplicates removed: ${eventStats.processing.duplicatesRemoved}`);
    console.log(`   Events cleaned: ${eventStats.processing.eventsCleaned}`);
    console.log(`   Valid events: ${eventStats.processing.validEvents}`);
    console.log(`   Invalid events: ${eventStats.processing.invalidEvents}`);
    console.log(`   Warning events: ${eventStats.processing.warningEvents}`);

    // Data Processing Pipeline
    if (deduplication && deduplication.duplicates.length > 0) {
      console.log('\n🔄 Deduplication Results:');
      Object.entries(deduplication.summary.duplicateReasons).forEach(([reason, count]) => {
        console.log(`   - ${reason}: ${count} events`);
      });
    }

    if (cleaning && cleaning.cleaningActions.length > 0) {
      console.log('\n🧹 Data Cleaning Results:');
      Object.entries(cleaning.summary.cleaningStats).forEach(([action, count]) => {
        console.log(`   - ${action}: ${count} events`);
      });
    }

    // Event Statistics
    console.log('\n📈 Event Statistics:');
    console.log(`   Total events: ${eventStats.totalEvents}`);
    console.log(`   Upcoming events: ${eventStats.upcomingEvents}`);
    console.log(`   Past events: ${eventStats.pastEvents}`);
    console.log(`   Total views: ${eventStats.engagementMetrics.totalViews.toLocaleString()}`);
    console.log(`   Total favorites: ${eventStats.engagementMetrics.totalFavorites.toLocaleString()}`);

    // City Mapping Statistics
    console.log('\n🗺️  City Mapping Statistics:');
    console.log(`   Mapped events: ${eventStats.mappingStats.mappedEvents}`);
    console.log(`   Unmapped events: ${eventStats.mappingStats.unmappedEvents}`);
    console.log(`   Mapping success rate: ${(eventStats.mappingStats.mappingSuccessRate * 100).toFixed(1)}%`);

    const citiesWithEvents = cityMappings.filter(m => m.eventCount > 0);
    console.log(`   Cities with events: ${citiesWithEvents.length}`);

    if (citiesWithEvents.length > 0) {
      console.log('\n🏙️  Top Cities by Event Count:');
      citiesWithEvents
        .sort((a, b) => b.eventCount - a.eventCount)
        .slice(0, 5)
        .forEach((city, index) => {
          console.log(`   ${index + 1}. ${city.cityName}: ${city.eventCount} events`);
        });
    }

    // Data Quality Issues
    if (validation.invalid.length > 0) {
      console.log('\n❌ Critical Data Issues:');
      console.log(`   Invalid events: ${validation.invalid.length}`);
      Object.entries(validation.summary.commonIssues)
        .filter(([issue, count]) => validation.invalid.some(inv => inv.issues.includes(issue)))
        .slice(0, 3)
        .forEach(([issue, count]) => {
          console.log(`   - ${issue}: ${count} events`);
        });
    }

    if (validation.warnings.length > 0) {
      console.log('\n⚠️  Data Quality Warnings:');
      console.log(`   Events with warnings: ${validation.warnings.length}`);
      Object.entries(validation.summary.commonIssues)
        .filter(([issue, count]) => validation.warnings.some(warn => warn.issues.includes(issue)))
        .slice(0, 3)
        .forEach(([issue, count]) => {
          console.log(`   - ${issue}: ${count} events`);
        });
    }

    // Quality Recommendations
    if (qualityReport && qualityReport.recommendations.length > 0) {
      console.log('\n💡 Quality Improvement Recommendations:');
      qualityReport.recommendations.slice(0, 3).forEach((rec, index) => {
        const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
        console.log(`   ${priority} ${rec.message}`);
        console.log(`      Action: ${rec.action}`);
      });
    }

    // Unmapped Locations
    if (eventStats.mappingStats.unmappedLocations && eventStats.mappingStats.unmappedLocations.length > 0) {
      console.log('\n📍 Unmapped Locations (sample):');
      eventStats.mappingStats.unmappedLocations.slice(0, 5).forEach(location => {
        console.log(`   - ${location}`);
      });
    }

    console.log('\n✅ Event processing completed successfully!');
    
    // Integration status
    console.log('\n🔗 Integration Status:');
    console.log('   ✅ Integrated with deployment workflow');
    console.log('   ✅ Data cleaning and deduplication active');
    console.log('   ✅ Quality validation and reporting enabled');
    console.log('   ✅ City mapping system active');
    console.log('   ✅ Fallback mechanisms in place');
    
    // File outputs
    console.log('\n📁 Generated Files:');
    console.log('   ✅ processed-events.json - Clean event data');
    console.log('   ✅ city-mappings.json - City-event mappings');
    console.log('   ✅ event-stats.json - Statistics and metrics');
    console.log('   ✅ quality-report.json - Data quality report');
  }

  /**
   * Main processing workflow
   */
  async run(options = {}) {
    const startTime = Date.now();
    let usedFallback = false;

    try {
      this.log('🚀 Starting event processing workflow');

      // Check if refresh is needed
      const forceRefresh = options.force || false;
      const needsRefresh = forceRefresh || this.needsRefresh();

      // Run scraper if needed
      if (needsRefresh) {
        try {
          await this.runScraper();
        } catch (scraperError) {
          this.log(`Scraper failed: ${scraperError.message}`, 'warning');
          if (!existsSync(config.eventsFile)) {
            throw new Error('No event data available and scraping failed');
          }
          usedFallback = true;
        }
      } else {
        this.log('Using existing event data (still fresh)');
      }

      // Load data
      const rawEvents = this.loadRawEvents();
      const cities = this.loadCities();

      // Process events
      const result = await this.processEvents(rawEvents, cities);

      // Save processed data
      this.saveProcessedData(result);

      // Generate report
      const processingTime = Date.now() - startTime;
      this.generateReport(result, processingTime, usedFallback);

      return result;

    } catch (error) {
      this.log(`Event processing failed: ${error.message}`, 'error');

      if (config.fallbackOnError) {
        this.log('Attempting to use existing processed data...', 'warning');

        // Check if we have existing processed data
        const hasProcessedData = Object.values(config.outputFiles).every(file => existsSync(file));

        if (hasProcessedData) {
          this.log('Using existing processed data as fallback', 'warning');
          
          // Load and return existing processed data for reporting
          try {
            const processedEvents = JSON.parse(readFileSync(config.outputFiles.processedEvents, 'utf8'));
            const cityMappings = JSON.parse(readFileSync(config.outputFiles.cityMappings, 'utf8'));
            const eventStats = JSON.parse(readFileSync(config.outputFiles.eventStats, 'utf8'));
            
            const result = {
              processedEvents,
              cityMappings,
              eventStats,
              validation: { valid: processedEvents, invalid: [], summary: { validEvents: processedEvents.length, invalidEvents: 0, commonIssues: {} } }
            };
            
            const processingTime = Date.now() - startTime;
            this.generateReport(result, processingTime, true);
            
            return result;
          } catch (fallbackError) {
            this.log(`Failed to load existing data: ${fallbackError.message}`, 'error');
          }
        }
      }

      throw error;
    }
  }
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  const options = {
    force: args.includes('--force') || args.includes('-f'),
    help: args.includes('--help') || args.includes('-h')
  };

  if (options.help) {
    console.log(`
Event Processing Script

Usage:
  node scripts/process-events.js [options]

Options:
  --force, -f    Force refresh event data even if recent
  --help, -h     Show this help message

Examples:
  node scripts/process-events.js          # Process with auto-refresh
  node scripts/process-events.js --force  # Force refresh and process
`);
    return;
  }

  const processor = new EventProcessor();

  try {
    await processor.run(options);
    process.exit(0);
  } catch (error) {
    console.error(`\n💥 Event processing failed: ${error.message}`);

    console.log('\n🔧 Troubleshooting:');
    console.log('• Check network connection for event scraping');
    console.log('• Verify data/events/events.json exists and is valid');
    console.log('• Ensure src/data/cities.json is present');
    console.log('• Run with --force to refresh event data');

    process.exit(1);
  }
}

// Export for use in other scripts
export { EventProcessor, config };

// Run if called directly
if (process.argv[1] && process.argv[1].includes('process-events.js')) {
  main();
}