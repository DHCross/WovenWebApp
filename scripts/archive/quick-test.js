// Quick test of the fixed API
async function quickTest() {
  try {
    console.log('🧪 Testing fixed API...');
    const res = await fetch('http://localhost:4000/api/astrology-mathbrain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subjectA: {
          name: 'Test Person',
          birth: {
            year: 1990, month: 1, day: 1, hour: 12, minute: 0,
            latitude: 40.7128, longitude: -74.0060, timezone: 'America/New_York'
          }
        },
        context: { mode: 'mirror' }
      })
    });
    
    const data = await res.json();
    console.log('✅ Success:', data.success);
    
    if (data.success) {
      console.log('📡 Source:', data.provenance?.source || 'unknown');
      console.log('📊 Chart present:', !!data.person_a?.chart);
      console.log('🔗 Aspects count:', data.person_a?.aspects?.length || 0);
      console.log('🎯 REAL DATA WORKING!');
    } else {
      console.log('❌ Error:', data.error);
      console.log('🔍 Code:', data.code);
    }
  } catch (e) {
    console.log('💥 Exception:', e.message);
  }
}

quickTest();