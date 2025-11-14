# Queue Analysis & Filters User Guide

## Overview

**Queue Analysis** and **Filters** are advanced features in the Woven Map application that become available only after seismograph data has been successfully generated. These features appear in the **Seismograph** mode to help analyze transit patterns and filter data.

![Queue Analysis & Filters Demo](https://github.com/user-attachments/assets/cb4427c4-bab0-4a0d-88f8-75a57497a544)

## Why These Features Seem "Missing"

**The #1 reason users don't see these features is that they require seismograph data to be present.**

### Prerequisites for Visibility

✅ **Valid API key** configured (`RAPIDAPI_KEY` in `.env`)  
✅ **Netlify functions** running (not simple HTTP server)  
✅ **Complete chart data** filled in (Person A minimum)  
✅ **Valid date range** specified (both start and end dates)  
✅ **Successful seismograph generation** (API call completed)

## Step-by-Step Access Guide

### 1. Switch to Seismograph Mode
- Click the **"Seismograph"** tab at the top of the application
- The tab description should show: *"Maps symbolic pressure fronts moving through time..."*

### 2. Fill in Required Data
- **Person A data**: Name, birth date, time, location, coordinates
- **Date range**: Use "📅 Use Today" button for quick setup, or specify custom dates
- Ensure both start and end dates are filled

### 3. Generate Seismograph Data
- Click **"Generate Seismograph"** button
- Wait for API processing (may take 10-30 seconds)
- Look for successful data generation (no error messages)

### 4. Access Features
After successful generation, you'll see these buttons appear:

#### 🔍 **Filters Button**
- **Purpose**: Show/hide filter controls for seismograph data
- **Location**: Button row above seismograph results
- **Function**: Toggles filter panel with sliders for:
  - Min Magnitude (0-10)
  - Min Valence (-5 to +5) 
  - Max Valence (-5 to +5)
  - Min Volatility (0-5)

#### 📦 **Queue Analysis Button**
- **Purpose**: Run pattern detection analysis on seismograph data
- **Location**: Button row above seismograph results  
- **Function**: Analyzes data for:
  - Valence trends (increasing ease/friction)
  - Magnitude trends (intensifying/subsiding)
  - Volatility spikes
  - Sustained pressure periods
  - Cyclical patterns

## How These Features Work

### Filters Functionality
1. Click **"🔍 Filters"** to show the filter panel
2. Adjust sliders to set threshold values:
   - **Min Magnitude**: Hide low-energy days
   - **Min/Max Valence**: Focus on ease (+) or friction (-) periods
   - **Min Volatility**: Show only high-change periods
3. Click **"Apply Filters"** to filter the data table
4. Click **"Reset"** to clear all filters

### Queue Analysis Functionality  
1. Click **"📦 Queue Analysis"** 
2. Button changes to **"⏳ Queued..."** (processing)
3. After ~1 second, shows **"✅ Analysis Complete"**
4. **"🗣️ Raven Voice Analysis Results"** panel appears with:
   - Detected patterns and trends
   - Cycle analysis
   - Pressure period identification
   - Statistical summaries

## Common Issues & Solutions

### ❌ "Buttons Don't Appear"
**Cause**: No seismograph data generated  
**Solution**: Follow steps 1-3 above completely

### ❌ "API Error 501: Unsupported method"
**Cause**: Using simple HTTP server instead of Netlify functions  
**Solution**: Run `netlify dev` instead of `python -m http.server`

### ❌ "Missing dates error"
**Cause**: Start or end date not filled  
**Solution**: Use "📅 Use Today" or manually fill both dates

### ❌ "Invalid API key"
**Cause**: Missing or incorrect `RAPIDAPI_KEY`  
**Solution**: Check `.env` file has valid RapidAPI key

### ❌ "No significant transits found"
**Cause**: API returned empty results for date range  
**Solution**: Try different date range or check API subscription

## Technical Details

### Button IDs
- **Queue Analysis**: `queueSeismographAnalysis`
- **Filters**: `toggleSeismographFilters`

### Code Locations
- **Main function**: `buildSeismographDisplay()` in `index.html`
- **Visibility control**: Depends on `window.seismographData` being populated
- **Filter panel**: `buildSeismographFilters()` function
- **Pattern detection**: `detectSeismographPatterns()` function

### Data Requirements
The features require:
- Valid `window.seismographData` object
- At least one dataset with `transitsByDate` 
- Minimum 3 days of data for meaningful pattern analysis

## Development Notes

For developers working on these features:

```javascript
// Check if seismograph data is available
if (window.seismographData && 
    (window.seismographData.person_a?.chart?.transitsByDate ||
     window.seismographData.person_b?.chart?.transitsByDate ||
     window.seismographData.composite?.transitsByDate)) {
    // Features are available
    showQueueAnalysisButton();
    showFiltersButton();
}
```

### Filter Implementation
```javascript
function applySeismographFilters() {
    const filters = {
        minMagnitude: parseFloat(document.getElementById('filterMinMagnitude').value),
        minValence: parseFloat(document.getElementById('filterMinValence').value),
        maxValence: parseFloat(document.getElementById('filterMaxValence').value),
        minVolatility: parseFloat(document.getElementById('filterMinVolatility').value)
    };
    
    // Apply filters to seismograph data and re-render tables
    // ...
}
```

### Analysis Implementation
```javascript
function queueSeismographAnalysis() {
    seismographAnalysisQueue.push(Date.now());
    processSeismographAnalysisQueue();
}

function detectSeismographPatterns(data) {
    // Analyze trends, spikes, cycles, sustained periods
    // Return patterns array for Raven Voice synthesis
    // ...
}
```

## Troubleshooting Checklist

- [ ] In Seismograph mode (not Mirror or Geometry)
- [ ] Person A data completely filled
- [ ] Valid date range (both start and end dates)
- [ ] Using `netlify dev` (not simple HTTP server)
- [ ] Valid `RAPIDAPI_KEY` in environment
- [ ] No error messages during generation
- [ ] Seismograph data table visible
- [ ] Network requests successful (check browser dev tools)

If all above items are checked and features still don't appear, check the browser console for JavaScript errors and verify the API response contains actual transit data.