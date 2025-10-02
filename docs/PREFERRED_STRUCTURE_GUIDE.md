# Preferred Report Structure Implementation

## Overview

This implementation adds a new "Preferred Structure" report format to WovenWebApp that follows the exact flow requested:

1. **Solo Mirrors** - Short, plain-language snapshots for each person
2. **Relational Engines** - Structured, named patterns (Spark Engine, Sweet Glue, etc.)
3. **Weather Overlay** - Continuous narrative form without lists or percentages

## How to Use

### In the Math Brain Interface

1. **Select Report Format**: In the "Report Format" section, choose "Preferred Structure"
2. **Generate Report**: Run your analysis as normal
3. **View Results**: The report will display in the new conversational format instead of the technical comprehensive format

### Format Characteristics

**Solo Mirrors:**
- Conversational snapshot style
- Example: "Dan's system tends to seek balance through action with a direct and straightforward approach..."
- No jargon, just natural language descriptions of patterns

**Relational Engines:**
- Clean, modular named patterns:
  - Spark Engine
  - Crossed-Wires Loop  
  - Sweet Glue
  - Growth Pressure Cooker
  - Stability Anchor
  - Creative Amplifier
  - Mirror Effect
  - Complementary Flow
- Each engine shows mechanism and tendency

**Weather Overlay:**
- Continuous narrative paragraphs
- No bullet points, lists, or percentages
- Climate descriptions rather than prescriptions
- Example: "The overall climate between you feels generally supportive with some scattered intensity..."

## Technical Details

### Backend Integration

The system integrates at multiple levels:

- **Report Family**: Added `preferred_structure` as a new report family option
- **Data Formatter**: `lib/preferred-report-formatter.js` handles the conversion
- **Report Composer**: `src/reporters/woven-map-composer.js` includes the new format
- **UI Component**: `components/PreferredReportDisplay.tsx` renders the format

### Data Flow

1. User selects "Preferred Structure" format
2. `report_family: 'preferred_structure'` is passed to API
3. Backend detects this and uses `generatePreferredReport()` function
4. Actual astrological data is analyzed and converted to conversational format
5. Frontend displays using `PreferredReportDisplay` component

### Format Detection

The system automatically detects when to show the preferred structure:

```javascript
const preferredStructure = result?.woven_map?.preferred_structure;
if (preferredStructure) {
  // Show preferred format
} else {
  // Show standard format
}
```

## Key Features

### Intelligent Engine Detection

The system analyzes actual synastry aspects to determine which relational engines are active:

- Aspect patterns (conjunction, trine, square, etc.)
- Planet involvement (Sun, Moon, Venus, etc.)
- Scoring system to identify the most relevant engines

### Real Weather Analysis

Weather descriptions are based on actual Balance Meter data:

- Magnitude → Atmosphere intensity
- Valence → Current direction (uplifting/challenging)
- Volatility → Visibility and pressure

### Conversational Tone

All language is designed to be:
- Accessible and jargon-free
- Presented as tendencies, not certainties
- Suitable for sharing and discussion
- Educational without being prescriptive

## Example Output

```
## Individual Snapshots

**Dan:** Dan's system tends to take action and lead the way with an initiating and pioneering approach. Right now there's some extra emphasis on communication and making decisions. This creates a dynamic kind of energy that brings their unique energy to relationships.

**Stephie:** Stephie's system tends to flow with intuition and feeling with a steady and determined approach. Currently experiencing supportive momentum in creative areas. This creates a flowing kind of energy that shapes the overall emotional atmosphere.

## Relational Engines

**Spark Engine**
Creates immediate attraction and excitement when you first connect. Tends to generate enthusiasm for shared projects and adventures.

**Sweet Glue**
Natural harmony in emotional rhythms and daily preferences. Makes ordinary time together feel easy and comfortable.

## Current Weather

The overall climate between you feels moderately active with noticeable energy shifts. There's steady flow with manageable variations running underneath daily interactions, creating a sense of momentum even when specific conversations feel stuck...
```

## Benefits

1. **User-Friendly**: No need to decode astrological jargon
2. **Shareable**: Language suitable for discussing with partners/friends  
3. **Actionable**: Presents patterns as conversation starters
4. **Balanced**: Avoids both overly technical and overly mystical language
5. **Flexible**: Adapts to solo or relational readings seamlessly

This implementation successfully bridges the gap between technical astrological analysis and conversational, accessible insights.