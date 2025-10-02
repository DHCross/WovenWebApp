// Test the preferred report structure integration
const { generatePreferredReport } = require('./lib/preferred-report-formatter');

// Sample test data
const mockPerson1Data = {
  natal: {
    placements: {
      core: [
        { name: 'Sun', sign: 'Leo', element: 'Fire', quality: 'Fixed', house: 1 },
        { name: 'Moon', sign: 'Cancer', element: 'Water', quality: 'Cardinal', house: 12 },
        { name: 'Ascendant', sign: 'Leo', element: 'Fire', quality: 'Fixed', house: 1 }
      ]
    }
  }
};

const mockPerson2Data = {
  natal: {
    placements: {
      core: [
        { name: 'Sun', sign: 'Libra', element: 'Air', quality: 'Cardinal', house: 3 },
        { name: 'Moon', sign: 'Scorpio', element: 'Water', quality: 'Fixed', house: 4 },
        { name: 'Ascendant', sign: 'Virgo', element: 'Earth', quality: 'Mutable', house: 1 }
      ]
    }
  }
};

const mockRelationshipData = {
  synastry: [
    { planet1: 'Sun', planet2: 'Venus', aspect_name: 'trine', orb: 2.5 },
    { planet1: 'Moon', planet2: 'Mars', aspect_name: 'square', orb: 1.8 },
    { planet1: 'Mercury', planet2: 'Jupiter', aspect_name: 'conjunction', orb: 3.2 }
  ],
  balanceMeter: {
    magnitude_value: 5.2,
    valence_value: 1.8,
    volatility_value: 3.1
  }
};

try {
  console.log('Testing preferred report structure...');
  
  // Test relational report
  const relationalReport = generatePreferredReport(
    'Dan', mockPerson1Data,
    'Stephie', mockPerson2Data,
    mockRelationshipData
  );
  
  console.log('✅ Relational report generated successfully');
  console.log('Structure:', Object.keys(relationalReport));
  console.log('Solo mirrors:', Object.keys(relationalReport.soloMirrors));
  console.log('Engines found:', relationalReport.relationalEngines.length);
  console.log('Weather included:', !!relationalReport.weatherOverlay);
  
  // Test solo report
  const soloReport = generatePreferredReport(
    'Dan', mockPerson1Data,
    null, null,
    { balanceMeter: mockRelationshipData.balanceMeter }
  );
  
  console.log('✅ Solo report generated successfully');
  console.log('Solo structure:', Object.keys(soloReport));
  
  console.log('\n🎉 Preferred report structure integration complete!');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}