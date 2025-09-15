// Test the API with real RAPIDAPI_    console.log('✅ Status:', response.statusCode);
    
    const body = JSON.parse(response.body);
    
    // Debug the full response structure
    console.log('🔍 Full provenance:', JSON.stringify(body.provenance, null, 2));
    console.log('🎯 Person A has chart:', !!body.person_a?.chart);
    console.log('📅 Person A chart keys:', Object.keys(body.person_a?.chart || {}));
    console.log('📅 Transit dates found:', Object.keys(body.person_a?.chart?.transitsByDate || {}));
    console.log('🔍 Provenance dates:', Object.keys(body.person_a?.chart?.provenanceByDate || {}));tly via function handler
(async () => {
  process.env.MB_MOCK = 'false';
  
  const handler = require('./netlify/functions/astrology-mathbrain.js');
  
  const event = {
    httpMethod: 'POST',
    body: JSON.stringify({
      personA: {
        name: 'Test Subject',
        year: 1990,
        month: 1,
        day: 1,
        hour: 12,
        minute: 0,
        latitude: 40.0167,
        longitude: -75.3,
        timezone: 'America/New_York'
      },
      window: {
        start: '2025-09-01',
        end: '2025-09-03',
        step: 'daily'
      },
      context: {
        mode: 'NATAL_TRANSITS'
      }
    })
  };

  console.log('🚀 Calling real Astrologer API...');
  
  try {
    const response = await handler.handler(event);
    console.log('✅ Status:', response.statusCode);
    
    const body = JSON.parse(response.body);
    
    // Check our improvements
    console.log('📊 Math Brain version:', body.provenance?.math_brain_version);
    console.log('🎯 Person A has chart:', !!body.person_a?.chart);
    console.log('📅 Transit dates found:', Object.keys(body.person_a?.chart?.transitsByDate || {}));
    console.log('� Provenance dates:', Object.keys(body.person_a?.chart?.provenanceByDate || {}));
    
    // Check first day details
    const firstDate = Object.keys(body.person_a?.chart?.transitsByDate || {})[0];
    if (firstDate) {
      const dayData = body.person_a.chart.transitsByDate[firstDate];
      const provData = body.person_a.chart.provenanceByDate?.[firstDate];
      
      console.log(`\n📈 Day ${firstDate}:`);
      console.log('  Raw aspects:', dayData?.aspects?.length || 0);
      console.log('  Filtered aspects:', dayData?.filtered_aspects?.length || 0);
      console.log('  Hooks:', dayData?.hooks?.length || 0);
      console.log('  Seismograph:', dayData?.seismograph);
      console.log('  Provenance:', provData);
      
      if (dayData?.hooks?.length > 0) {
        console.log('  First hook:', dayData.hooks[0]);
      }
    }
    
    console.log('\n✨ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
})();