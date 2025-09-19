// Test API with corrected data format
require('dotenv').config();

(async () => {
  process.env.MB_MOCK = 'false';

  const handler = require('./lib/server/astrology-mathbrain.js');

  console.log('🧪 Testing Mirror report generation...');

  const mirrorEvent = {
    httpMethod: 'POST',
    body: JSON.stringify({
      mode: 'NATAL_ONLY',
      personA: {
        name: 'Test Subject',
        year: 1990,
        month: 1,
        day: 1,
        hour: 12,
        minute: 0,
        city: 'Philadelphia',
        state: 'PA',
        nation: 'US',
        latitude: 40.0167,
        longitude: -75.3,
        timezone: 'America/New_York'
      },
      context: {
        mode: 'mirror'
      }
    })
  };

  try {
    console.log('🔮 Testing Mirror report...');
    const mirrorResponse = await handler.handler(mirrorEvent);
    console.log('✅ Mirror Status:', mirrorResponse.statusCode);

    if (mirrorResponse.statusCode === 200) {
      const body = JSON.parse(mirrorResponse.body);
      console.log('🎯 Mirror success! Has person_a:', !!body.person_a);
      console.log('📊 Mirror provenance:', body.provenance ? 'Present' : 'Missing');
    } else {
      console.log('❌ Mirror failed:', mirrorResponse.body);
    }
  } catch (error) {
    console.error('❌ Mirror error:', error.message);
  }

  console.log('\n🧪 Testing Balance Meter report generation...');

  const balanceEvent = {
    httpMethod: 'POST',
    body: JSON.stringify({
      mode: 'NATAL_TRANSITS',
      personA: {
        name: 'Test Subject',
        year: 1990,
        month: 1,
        day: 1,
        hour: 12,
        minute: 0,
        city: 'Philadelphia',
        state: 'PA',
        nation: 'US',
        latitude: 40.0167,
        longitude: -75.3,
        timezone: 'America/New_York'
      },
      window: {
        start: '2025-09-19',
        end: '2025-09-21',
        step: 'daily'
      },
      context: {
        mode: 'balance_meter'
      }
    })
  };

  try {
    console.log('⚖️ Testing Balance Meter report...');
    const balanceResponse = await handler.handler(balanceEvent);
    console.log('✅ Balance Status:', balanceResponse.statusCode);

    if (balanceResponse.statusCode === 200) {
      const body = JSON.parse(balanceResponse.body);
      console.log('🎯 Balance success! Has person_a:', !!body.person_a);
      console.log('📊 Balance provenance:', body.provenance ? 'Present' : 'Missing');
      console.log('📅 Transit dates:', Object.keys(body.person_a?.chart?.transitsByDate || {}));
    } else {
      console.log('❌ Balance failed:', balanceResponse.body);
    }
  } catch (error) {
    console.error('❌ Balance error:', error.message);
  }

  console.log('\n✨ Health check completed!');
})();