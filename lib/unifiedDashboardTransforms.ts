/**
 * Data Transformers for Unified Symbolic Dashboard v5.0
 * 
 * Converts Math Brain transit data into MAP/FIELD format:
 * - MAP Layer: Planetary geometry (planet positions in natal houses)
 * - FIELD Layer: Symbolic pressure (Balance Meter readings)
 * - Integration: Handshake between geometry and energy
 */

import type { MapDataPoint, FieldDataPoint, IntegrationPoint } from '@/components/mathbrain/UnifiedSymbolicDashboard';

/**
 * Extract MAP layer data from transitsByDate
 * Each transit position gets mapped to its natal house
 */
export function extractMapData(transitsByDate: any): MapDataPoint[] {
  const mapPoints: MapDataPoint[] = [];
  
  if (!transitsByDate || typeof transitsByDate !== 'object') {
    return mapPoints;
  }

  const planetNames = [
    'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 
    'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
    'Chiron'
  ];

  Object.entries(transitsByDate).forEach(([date, dayData]: [string, any]) => {
    // Handle new format: dayData can be {aspects, transit_positions, transit_houses}
    const transitHouses = dayData?.transit_houses || [];
    const transitPositions = dayData?.transit_positions || [];

    // If we have house positions, create MAP points
    if (transitHouses.length > 0) {
      transitHouses.forEach((house: number, idx: number) => {
        if (idx < planetNames.length && house) {
          const planet = planetNames[idx];
          const position = transitPositions[idx];
          
          mapPoints.push({
            date,
            planet,
            degree: position ? formatDegree(position / 100) : '', // Convert from centidegrees
            house,
          });
        }
      });
    }
  });

  return mapPoints;
}

/**
 * Extract FIELD layer data from seismograph/balance meter readings
 */
export function extractFieldData(
  transitsByDate: any,
  summary?: any,
  subjectName?: string
): FieldDataPoint[] {
  const fieldPoints: FieldDataPoint[] = [];
  
  if (!transitsByDate || typeof transitsByDate !== 'object') {
    return fieldPoints;
  }

  Object.entries(transitsByDate).forEach(([date, dayData]: [string, any]) => {
    // Extract seismograph data (old format) or meter data (new v5.0 format)
    const seismograph = dayData?.seismograph;
    const meter = dayData?.meter;
    
    let magnitude: number | null = null;
    let valence: number | null = null;

    if (meter) {
      // v5.0 format: {mag_x10, bias_x10}
      magnitude = meter.mag_x10 ? meter.mag_x10 / 10 : null;
      valence = meter.bias_x10 ? meter.bias_x10 / 10 : null;
    } else if (seismograph) {
      // Legacy format
      magnitude = seismograph.magnitude ?? null;
      valence = seismograph.directional_bias?.value ?? seismograph.directional_bias ?? null;
    }

    if (magnitude !== null && valence !== null) {
      const intensityLabel = getMagnitudeLabel(magnitude);
      
      fieldPoints.push({
        date,
        subject: subjectName || 'Subject',
        magnitude,
        valence,
        intensity_label: intensityLabel,
      });
    }
  });

  return fieldPoints;
}

/**
 * Create integration points linking MAP geometry to FIELD pressure
 * Identifies when planetary transits correspond to symbolic pressure spikes
 */
export function extractIntegrationPoints(
  mapData: MapDataPoint[],
  fieldData: FieldDataPoint[],
  transitsByDate: any,
  threshold: { magnitude?: number; house?: number[] } = {}
): IntegrationPoint[] {
  const integrationPoints: IntegrationPoint[] = [];
  
  const { magnitude: magThreshold = 3.5, house: focusHouses = [1, 4, 7, 10] } = threshold;

  // Group MAP data by date
  const mapByDate: { [date: string]: MapDataPoint[] } = {};
  mapData.forEach(point => {
    if (!mapByDate[point.date]) {
      mapByDate[point.date] = [];
    }
    mapByDate[point.date].push(point);
  });

  // Group FIELD data by date
  const fieldByDate: { [date: string]: FieldDataPoint } = {};
  fieldData.forEach(point => {
    fieldByDate[point.date] = point;
  });

  // Find handshakes: dates where both MAP and FIELD show significant activity
  Object.keys(mapByDate).forEach(date => {
    const mapPoints = mapByDate[date];
    const fieldPoint = fieldByDate[date];

    if (!fieldPoint || fieldPoint.magnitude < magThreshold) {
      return; // Skip low-magnitude days
    }

    // Find planets in angular houses (1, 4, 7, 10) or other focus houses
    const significantPlanets = mapPoints.filter(p => focusHouses.includes(p.house));

    if (significantPlanets.length > 0) {
      // Create integration point for the most significant planet
      const primaryPlanet = significantPlanets[0]; // Could rank by planet importance
      
      // Check for aspects involving this planet
      const dayData = transitsByDate[date];
      const aspects = Array.isArray(dayData?.aspects) ? dayData.aspects : (dayData || []);
      const relevantAspect = findRelevantAspect(aspects, primaryPlanet.planet);

      integrationPoints.push({
        date,
        planet: primaryPlanet.planet,
        house: primaryPlanet.house,
        aspect: relevantAspect,
        magnitude: fieldPoint.magnitude,
        valence: fieldPoint.valence,
        source: 'Balance Meter v5.0',
        angle_drift: false,
        note: generateHandshakeNote(primaryPlanet, fieldPoint, relevantAspect),
      });
    }
  });

  return integrationPoints;
}

/**
 * Find relevant aspect involving the specified planet
 */
function findRelevantAspect(aspects: any[], planetName: string): string | undefined {
  if (!Array.isArray(aspects)) return undefined;

  // Look for aspects involving this planet and angular points
  const angularPoints = ['Ascendant', 'Medium_Coeli', 'Descendant', 'Imum_Coeli'];
  
  for (const aspect of aspects) {
    const p1 = aspect.p1_name || aspect.planet1 || aspect.a;
    const p2 = aspect.p2_name || aspect.planet2 || aspect.b;
    const aspectType = aspect.aspect || aspect.type || aspect.name;

    if (p1 === planetName && angularPoints.includes(p2)) {
      return `${aspectType} ${p2}`;
    }
    if (p2 === planetName && angularPoints.includes(p1)) {
      return `${aspectType} ${p1}`;
    }
  }

  return undefined;
}

/**
 * Generate diagnostic note explaining the MAP↔FIELD handshake
 */
function generateHandshakeNote(
  mapPoint: MapDataPoint,
  fieldPoint: FieldDataPoint,
  aspect?: string
): string {
  const houseContext = getHouseContext(mapPoint.house);
  const intensityDesc = fieldPoint.magnitude >= 4 ? 'high' : 'elevated';
  const biasDesc = fieldPoint.valence > 1 ? 'expansive' : fieldPoint.valence < -1 ? 'contractive' : 'neutral';

  let note = `${mapPoint.planet} activates ${houseContext}`;
  
  if (aspect) {
    note += ` via ${aspect}`;
  }
  
  note += `, matches ${intensityDesc} magnitude with ${biasDesc} bias.`;
  
  return note;
}

/**
 * Get contextual description for house number
 */
function getHouseContext(house: number): string {
  const contexts: { [key: number]: string } = {
    1: 'H1 (Self/Identity)',
    2: 'H2 (Resources)',
    3: 'H3 (Communication)',
    4: 'H4 (Home/Foundation)',
    5: 'H5 (Creativity)',
    6: 'H6 (Service/Health)',
    7: 'H7 (Partnership)',
    8: 'H8 (Transformation)',
    9: 'H9 (Wisdom/Travel)',
    10: 'H10 (Career/Public)',
    11: 'H11 (Community)',
    12: 'H12 (Dissolution)',
  };
  
  return contexts[house] || `H${house}`;
}

/**
 * Get intensity label from magnitude value
 */
function getMagnitudeLabel(magnitude: number): string {
  if (magnitude >= 4) return 'High Pressure';
  if (magnitude >= 2) return 'Active';
  if (magnitude >= 1) return 'Murmur';
  return 'Latent';
}

/**
 * Format absolute position (degrees) into degree notation
 */
function formatDegree(absolutePosition: number): string {
  const signs = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];
  
  const signIndex = Math.floor(absolutePosition / 30);
  const degreeInSign = absolutePosition % 30;
  const sign = signs[signIndex] || signs[0];
  
  const deg = Math.floor(degreeInSign);
  const min = Math.floor((degreeInSign - deg) * 60);
  
  return `${deg}°${min.toString().padStart(2, '0')}' ${sign}`;
}

/**
 * All-in-one transformer: extract MAP, FIELD, and Integration from result object
 */
export function transformToUnifiedDashboard(result: any, options?: {
  subjectName?: string;
  magnitudeThreshold?: number;
  focusHouses?: number[];
}) {
  const transitsByDate = result?.person_a?.chart?.transitsByDate || {};
  const summary = result?.person_a?.summary;
  const subjectName = options?.subjectName || result?.person_a?.name || 'Subject';

  const mapData = extractMapData(transitsByDate);
  const fieldData = extractFieldData(transitsByDate, summary, subjectName);
  const integration = extractIntegrationPoints(
    mapData,
    fieldData,
    transitsByDate,
    {
      magnitude: options?.magnitudeThreshold,
      house: options?.focusHouses,
    }
  );

  return { mapData, fieldData, integration };
}
