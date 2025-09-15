// Test the health endpoint to verify API key works
require('dotenv').config();

(async () => {
  const handler = require('./netlify/functions/astrology-mathbrain.js');
  
  console.log('🔍 Testing health endpoint...');
  console.log('RAPIDAPI_KEY present:', !!process.env.RAPIDAPI_KEY);
  
  try {
    const response = await handler.health({ queryStringParameters: { ping: '1' } });
    console.log('✅ Health Status:', response.statusCode);
    
    const body = JSON.parse(response.body);
    console.log('📊 Health data:', JSON.stringify(body, null, 2));
    
  } catch (error) {
    console.error('❌ Health check error:', error.message);
  }
})();