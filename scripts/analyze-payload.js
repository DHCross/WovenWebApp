/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const filePath = './reports/Mirror+SymbolicWeather_Weather_Dashboard_dan-stephie_2025-11-15_to_2025-11-21.json';
const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));

console.log('=== Payload Analysis ===\n');

const chart = payload.person_a && payload.person_a.chart;
if (!chart) {
  console.log('No chart found');
  process.exit(0);
}

console.log('person_a.chart breakdown:');

// Measure each major section
const keys = Object.keys(chart);
const sizes = {};

for (const key of keys) {
  if (chart[key]) {
    sizes[key] = JSON.stringify(chart[key]).length;
  }
}

// Sort by size descending
const sorted = Object.entries(sizes).sort((a, b) => b[1] - a[1]);
for (const [key, size] of sorted.slice(0, 20)) {
  console.log('  -', key + ':', (size / 1024).toFixed(1), 'KB');
}

// Check transitsByDate
if (chart.transitsByDate) {
  const transitDays = Object.keys(chart.transitsByDate);
  console.log('\ntransitsByDate has', transitDays.length, 'days');
  
  // Sample one day
  const sampleDay = chart.transitsByDate[transitDays[0]];
  if (sampleDay) {
    console.log('\nSample day breakdown (', transitDays[0], '):');
    for (const key of Object.keys(sampleDay)) {
      if (sampleDay[key]) {
        console.log('  -', key + ':', (JSON.stringify(sampleDay[key]).length / 1024).toFixed(1), 'KB');
      }
    }
    
    // Check seismograph structure
    if (sampleDay.seismograph) {
      console.log('\nSeismograph keys:', Object.keys(sampleDay.seismograph).join(', '));
    }
  }
}
