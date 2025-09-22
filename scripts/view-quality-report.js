#!/usr/bin/env node

/**
 * Data Quality Report Viewer
 * Display comprehensive data quality information for events
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const qualityReportPath = join(rootDir, 'data', 'events', 'quality-report.json');
const eventStatsPath = join(rootDir, 'src', 'data', 'events', 'event-stats.json');

function displayQualityReport() {
  console.log('📊 Event Data Quality Report');
  console.log('='.repeat(50));

  // Check if quality report exists
  if (!existsSync(qualityReportPath)) {
    console.log('❌ Quality report not found. Run "npm run events:process" first.');
    return;
  }

  try {
    const qualityReport = JSON.parse(readFileSync(qualityReportPath, 'utf8'));
    const eventStats = existsSync(eventStatsPath) ? 
      JSON.parse(readFileSync(eventStatsPath, 'utf8')) : null;

    // Report timestamp
    console.log(`📅 Report generated: ${new Date(qualityReport.timestamp).toLocaleString()}`);
    console.log('');

    // Summary
    console.log('📋 Summary:');
    console.log(`   Original events: ${qualityReport.summary.originalEventCount}`);
    console.log(`   Final events: ${qualityReport.summary.finalEventCount}`);
    console.log(`   Quality Score: ${qualityReport.summary.dataQualityScore}% ${qualityReport.summary.dataQualityScore >= 80 ? '✅' : '⚠️'}`);
    console.log('');

    // Processing steps
    if (qualityReport.summary.processingSteps) {
      console.log('🔄 Processing Steps:');
      
      const { deduplication, cleaning, validation } = qualityReport.summary.processingSteps;
      
      if (deduplication) {
        console.log(`   Deduplication: ${deduplication.duplicateCount} duplicates removed`);
      }
      
      if (cleaning) {
        console.log(`   Cleaning: ${cleaning.cleanedEvents} events cleaned`);
      }
      
      if (validation) {
        console.log(`   Validation: ${validation.validEvents} valid, ${validation.invalidEvents} invalid, ${validation.warningEvents} warnings`);
      }
      console.log('');
    }

    // Critical issues
    if (qualityReport.issues.critical.length > 0) {
      console.log('❌ Critical Issues:');
      qualityReport.issues.critical.slice(0, 10).forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue.title || 'Untitled Event'}`);
        console.log(`      ID: ${issue.eventId}`);
        console.log(`      Issues: ${issue.issues.join(', ')}`);
      });
      
      if (qualityReport.issues.critical.length > 10) {
        console.log(`   ... and ${qualityReport.issues.critical.length - 10} more critical issues`);
      }
      console.log('');
    }

    // Warnings
    if (qualityReport.issues.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      qualityReport.issues.warnings.slice(0, 5).forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning.title || 'Untitled Event'}`);
        console.log(`      Issues: ${warning.issues.join(', ')}`);
      });
      
      if (qualityReport.issues.warnings.length > 5) {
        console.log(`   ... and ${qualityReport.issues.warnings.length - 5} more warnings`);
      }
      console.log('');
    }

    // Duplicates
    if (qualityReport.issues.duplicates.length > 0) {
      console.log('🔄 Duplicates Removed:');
      qualityReport.issues.duplicates.slice(0, 5).forEach((duplicate, index) => {
        console.log(`   ${index + 1}. ${duplicate.title || 'Untitled Event'}`);
        console.log(`      Reasons: ${duplicate.reasons.join(', ')}`);
      });
      
      if (qualityReport.issues.duplicates.length > 5) {
        console.log(`   ... and ${qualityReport.issues.duplicates.length - 5} more duplicates`);
      }
      console.log('');
    }

    // Common issues statistics
    if (qualityReport.statistics.commonIssues && Object.keys(qualityReport.statistics.commonIssues).length > 0) {
      console.log('📊 Common Issues:');
      Object.entries(qualityReport.statistics.commonIssues)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .forEach(([issue, count]) => {
          console.log(`   ${issue}: ${count} events`);
        });
      console.log('');
    }

    // Recommendations
    if (qualityReport.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      qualityReport.recommendations.forEach((rec, index) => {
        const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
        console.log(`   ${priority} ${rec.message}`);
        console.log(`      Category: ${rec.category}`);
        console.log(`      Action: ${rec.action}`);
        console.log('');
      });
    }

    // Current statistics (if available)
    if (eventStats && eventStats.processing) {
      console.log('📈 Current Statistics:');
      console.log(`   Total events: ${eventStats.totalEvents}`);
      console.log(`   Upcoming events: ${eventStats.upcomingEvents}`);
      console.log(`   Cities with events: ${eventStats.processing.citiesWithEvents}`);
      console.log(`   Last processed: ${new Date(eventStats.processing.processedAt).toLocaleString()}`);
    }

  } catch (error) {
    console.error('❌ Error reading quality report:', error.message);
  }
}

function displayHelp() {
  console.log(`
Event Data Quality Report Viewer

Usage:
  node scripts/view-quality-report.js

This script displays the comprehensive data quality report generated
during event processing, including:

• Data quality score and summary
• Critical issues and warnings
• Duplicate detection results
• Data cleaning statistics
• Quality improvement recommendations

To generate a new quality report, run:
  npm run events:process

To view other event statistics, use:
  npm run events:stats
`);
}

// Main execution
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  displayHelp();
} else {
  displayQualityReport();
}