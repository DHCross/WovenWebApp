// Preferred Report Structure for WovenWebApp
// Implements the exact flow: Solo Mirrors → Relational Engines → Weather Overlay

// Solo Mirror Generator - Short, plain-language snapshots
function generateSoloMirror(personName, natalData, currentTransits) {
  // Extract key patterns in conversational language
  const corePattern = extractCorePattern(natalData);
  const currentInfluence = extractCurrentInfluence(currentTransits);
  
  return {
    name: personName,
    snapshot: `${personName}'s system tends to ${corePattern.movement} with a ${corePattern.style} approach. ${currentInfluence.description}. This creates a ${corePattern.resultingClimate} kind of energy that ${corePattern.expression}.`
  };
}

// Core pattern extraction helpers
function extractCorePattern(natalData) {
  // Extract core patterns from actual natal data
  if (!natalData || !natalData.placements) {
    return {
      movement: "navigate life with a unique personal rhythm",
      style: "balanced and adaptive", 
      resultingClimate: "steady",
      expression: "tends to create stability in relationships"
    };
  }
  
  // Analyze sun sign for core expression
  const sun = natalData.placements.core?.find(p => p.name === 'Sun');
  const moon = natalData.placements.core?.find(p => p.name === 'Moon');
  const asc = natalData.placements.core?.find(p => p.name === 'Ascendant');
  
  // Simple pattern matching based on dominant elements/qualities
  const fireSignMovement = "take action and lead the way";
  const earthSignMovement = "build things methodically and practically";
  const airSignMovement = "connect ideas and communicate naturally";
  const waterSignMovement = "flow with intuition and feeling";
  
  const cardinalStyle = "initiating and pioneering";
  const fixedStyle = "steady and determined";
  const mutableStyle = "flexible and adaptive";
  
  // Determine dominant patterns from available data
  let movement = "navigate challenges with personal authenticity";
  let style = "balanced and thoughtful";
  let resultingClimate = "steady";
  let expression = "brings their unique energy to relationships";
  
  if (sun?.element) {
    switch (sun.element.toLowerCase()) {
      case 'fire': movement = fireSignMovement; break;
      case 'earth': movement = earthSignMovement; break;
      case 'air': movement = airSignMovement; break;
      case 'water': movement = waterSignMovement; break;
    }
  }
  
  if (sun?.quality) {
    switch (sun.quality.toLowerCase()) {
      case 'cardinal': style = cardinalStyle; break;
      case 'fixed': style = fixedStyle; break;
      case 'mutable': style = mutableStyle; break;
    }
  }
  
  // Simple climate assessment
  if (sun?.element === 'fire' || sun?.element === 'air') {
    resultingClimate = "dynamic";
  } else if (sun?.element === 'earth') {
    resultingClimate = "grounded";
  } else if (sun?.element === 'water') {
    resultingClimate = "flowing";
  }
  
  return { movement, style, resultingClimate, expression };
}

function extractCurrentInfluence(transits) {
  return {
    description: "Right now there's some extra emphasis on communication and making decisions"
  };
}

// Relational Engine Generator - Structured, named patterns
function generateRelationalEngines(person1Data, person2Data, synastrytData) {
  const engines = [];
  
  // Analyze synastry for recognizable patterns
  const detectedPatterns = analyzeRelationalPatterns(person1Data, person2Data, synastrytData);
  
  detectedPatterns.forEach(pattern => {
    engines.push({
      name: pattern.engineName,
      description: pattern.mechanism,
      tendency: pattern.tendency
    });
  });
  
  return engines;
}

function analyzeRelationalPatterns(p1, p2, synastry) {
  // Library of recognizable relational engines with clear names
  const engineLibrary = [
    {
      engineName: "Spark Engine",
      mechanism: "Creates immediate attraction and excitement when you first connect",
      tendency: "Tends to generate enthusiasm for shared projects and adventures",
      triggerAspects: ['conjunction', 'trine', 'sextile'],
      triggerPlanets: ['Sun', 'Mars', 'Venus']
    },
    {
      engineName: "Crossed-Wires Loop", 
      mechanism: "Communication styles that create productive friction and learning",
      tendency: "Pushes both people to clarify what they actually mean",
      triggerAspects: ['square', 'quincunx'],
      triggerPlanets: ['Mercury', 'Saturn']
    },
    {
      engineName: "Sweet Glue",
      mechanism: "Natural harmony in emotional rhythms and daily preferences", 
      tendency: "Makes ordinary time together feel easy and comfortable",
      triggerAspects: ['trine', 'sextile', 'conjunction'],
      triggerPlanets: ['Moon', 'Venus', 'Jupiter']
    },
    {
      engineName: "Growth Pressure Cooker",
      mechanism: "Challenges that push each person toward their better self",
      tendency: "Creates periods of intensity followed by breakthrough insights",
      triggerAspects: ['square', 'opposition'],
      triggerPlanets: ['Pluto', 'Saturn', 'Mars']
    },
    {
      engineName: "Stability Anchor",
      mechanism: "Grounding influence that helps weather external chaos",
      tendency: "Provides a sense of 'home base' when life gets unpredictable",
      triggerAspects: ['trine', 'conjunction'],
      triggerPlanets: ['Saturn', 'Moon', 'Sun']
    },
    {
      engineName: "Creative Amplifier",
      mechanism: "Ideas and inspiration multiply when you brainstorm together",
      tendency: "Generates more possibilities than either person would find alone",
      triggerAspects: ['conjunction', 'trine', 'sextile'],
      triggerPlanets: ['Jupiter', 'Uranus', 'Mercury']
    },
    {
      engineName: "Mirror Effect",
      mechanism: "Each person reflects back the other's blind spots clearly",
      tendency: "Accelerates self-awareness, sometimes uncomfortably",
      triggerAspects: ['opposition', 'square'],
      triggerPlanets: ['Sun', 'Moon', 'Ascendant']
    },
    {
      engineName: "Complementary Flow",
      mechanism: "Different strengths that naturally fit together like puzzle pieces",
      tendency: "Creates efficiency - one person's weakness is the other's strength",
      triggerAspects: ['sextile', 'trine'],
      triggerPlanets: ['Venus', 'Mars', 'Jupiter']
    }
  ];
  
  const detectedEngines = [];
  
  // Analyze synastry data if available
  if (Array.isArray(synastry) && synastry.length > 0) {
    // Count aspect patterns to determine which engines are active
    const aspectCounts = {};
    const planetPairs = {};
    
    synastry.forEach(aspect => {
      if (aspect.aspect_name && aspect.planet1 && aspect.planet2) {
        const aspectName = aspect.aspect_name.toLowerCase();
        const planet1 = aspect.planet1;
        const planet2 = aspect.planet2;
        
        aspectCounts[aspectName] = (aspectCounts[aspectName] || 0) + 1;
        planetPairs[`${planet1}-${planet2}`] = aspectName;
      }
    });
    
    // Check each engine's trigger conditions
    engineLibrary.forEach(engine => {
      let score = 0;
      
      // Check for matching aspects
      engine.triggerAspects.forEach(aspectType => {
        if (aspectCounts[aspectType]) {
          score += aspectCounts[aspectType] * 2;
        }
      });
      
      // Check for matching planets
      engine.triggerPlanets.forEach(planet => {
        Object.keys(planetPairs).forEach(pair => {
          if (pair.includes(planet)) {
            score += 1;
          }
        });
      });
      
      // Add engines that score above threshold
      if (score >= 3) {
        detectedEngines.push({
          engineName: engine.engineName,
          mechanism: engine.mechanism,
          tendency: engine.tendency
        });
      }
    });
  }
  
  // If no strong patterns detected, return default engines
  if (detectedEngines.length === 0) {
    return [
      engineLibrary[2], // Sweet Glue (default harmony)
      engineLibrary[5], // Creative Amplifier (default synergy)
      engineLibrary[7]  // Complementary Flow (default balance)
    ];
  }
  
  // Limit to top 3 engines
  return detectedEngines.slice(0, 3);
}

// Weather Overlay Generator - Continuous narrative, no numbers
function generateWeatherOverlay(combinedData, timeframe = "current") {
  const weatherElements = analyzeSymbolicWeather(combinedData);
  
  return {
    timeframe: timeframe,
    narrative: buildWeatherNarrative(weatherElements)
  };
}

function analyzeSymbolicWeather(data) {
  // Extract weather-like qualities from actual balance meter data
  if (!data || !data.balanceMeter) {
    return {
      atmosphere: "generally supportive with mild variations",
      undercurrent: "steady flow with natural rhythms", 
      visibility: "clear periods with occasional hazy moments",
      pressure: "comfortable tension that supports growth",
      temperature: "warm and stable overall"
    };
  }
  
  const balance = data.balanceMeter;
  const magnitude = balance.magnitude_value || 0;
  const valence = balance.valence_value || 0;
  const volatility = balance.volatility_value || 0;
  
  // Determine atmosphere based on magnitude
  let atmosphere = "calm and peaceful";
  if (magnitude > 7) {
    atmosphere = "highly charged with significant activity";
  } else if (magnitude > 4) {
    atmosphere = "moderately active with noticeable energy shifts";
  } else if (magnitude > 2) {
    atmosphere = "gently stimulating with subtle variations";
  }
  
  // Determine undercurrent based on valence
  let undercurrent = "balanced flow with natural equilibrium";
  if (valence > 2) {
    undercurrent = "uplifting current with supportive momentum";
  } else if (valence < -2) {
    undercurrent = "challenging current requiring extra navigation";
  } else {
    undercurrent = "steady flow with manageable variations";
  }
  
  // Determine visibility based on overall complexity
  let visibility = "clear with good perspective";
  if (volatility > 5) {
    visibility = "shifting conditions with moments of clarity and confusion";
  } else if (volatility > 2) {
    visibility = "generally clear with some hazy periods";
  }
  
  // Determine pressure based on magnitude + volatility
  const intensity = magnitude + volatility;
  let pressure = "comfortable atmospheric pressure";
  if (intensity > 10) {
    pressure = "high pressure that creates urgency and breakthrough potential";
  } else if (intensity > 6) {
    pressure = "moderate pressure that encourages action and decision-making";
  }
  
  // Determine temperature based on valence
  let temperature = "mild and comfortable";
  if (valence > 3) {
    temperature = "warm and energizing with an optimistic feel";
  } else if (valence < -3) {
    temperature = "cooler climate requiring extra warmth and patience";
  } else {
    temperature = "comfortable temperature with seasonal variations";
  }
  
  return { atmosphere, undercurrent, visibility, pressure, temperature };
}

function buildWeatherNarrative(elements) {
  // Craft flowing paragraphs without lists, bullets, or percentages
  return `The overall climate between you feels ${elements.atmosphere}. There's ${elements.undercurrent} running underneath daily interactions, creating a sense of momentum even when specific conversations feel stuck. 

Communication tends to have ${elements.visibility} - sometimes everything feels crystal clear and other times you might find yourselves talking past each other without quite knowing why. 

The emotional pressure reads as ${elements.pressure}, which generally works in your favor. When tension does build up, it seems to move toward resolution rather than staying stuck. The ${elements.temperature} suggests this relationship has a naturally supportive quality, even when external circumstances create temporary strain.

This kind of weather pattern tends to favor collaborative problem-solving over individual action. Things that might feel overwhelming to tackle alone often become manageable when you approach them together.`;
}

// Main Report Generator - Combines all elements in preferred flow
function generatePreferredReport(person1Name, person1Data, person2Name, person2Data, relationshipData) {
  const report = {
    structure: "preferred_flow_v1",
    timestamp: new Date().toISOString(),
    
    // Section 1: Solo Mirrors (snapshot style)
    soloMirrors: {
      [person1Name]: generateSoloMirror(person1Name, person1Data, relationshipData.person1Transits),
      [person2Name]: generateSoloMirror(person2Name, person2Data, relationshipData.person2Transits)
    },
    
    // Section 2: Relational Engines (structured list)
    relationalEngines: generateRelationalEngines(person1Data, person2Data, relationshipData.synastry),
    
    // Section 3: Weather Overlay (continuous narrative)
    weatherOverlay: generateWeatherOverlay(relationshipData),
    
    // Metadata for system tracking
    meta: {
      reportType: "preferred_structure",
      language: "conversational_plain",
      tone: "probabilities_not_prescriptions",
      format: {
        soloMirrors: "snapshot",
        engines: "structured_list", 
        weather: "continuous_narrative"
      }
    }
  };
  
  return report;
}

// Text Formatter - Converts structured data to readable format
function formatReportForDisplay(reportData) {
  const { soloMirrors, relationalEngines, weatherOverlay } = reportData;
  
  let formatted = '';
  
  // Solo Mirrors Section
  formatted += '## Individual Snapshots\n\n';
  Object.entries(soloMirrors).forEach(([name, mirror]) => {
    formatted += `**${name}:** ${mirror.snapshot}\n\n`;
  });
  
  // Relational Engines Section  
  formatted += '## Relational Engines\n\n';
  relationalEngines.forEach(engine => {
    formatted += `**${engine.name}**\n`;
    formatted += `${engine.description}. ${engine.tendency}.\n\n`;
  });
  
  // Weather Overlay Section
  formatted += '## Current Weather\n\n';
  formatted += `${weatherOverlay.narrative}\n\n`;
  
  return formatted;
}

// Export functions for use in other modules
module.exports = {
  generatePreferredReport,
  formatReportForDisplay,
  generateSoloMirror,
  generateRelationalEngines, 
  generateWeatherOverlay,
  
  // Individual component generators for flexible use
  extractCorePattern,
  analyzeRelationalPatterns,
  buildWeatherNarrative
};