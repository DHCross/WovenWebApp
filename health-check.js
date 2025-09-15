#!/usr/bin/env node

// Comprehensive health check script for Raven Calder system
const https = require('https');
const http = require('http');

async function healthCheck() {
    console.log('🔍 Raven Calder System Health Sweep - Enhanced Diagnostics');
    console.log('=' .repeat(60));
    
    const results = {};
    
    // 1. Check if Netlify dev server is running
    console.log('\n📡 Checking Netlify Dev Server...');
    try {
        const response = await makeRequest('http://localhost:8888');
        console.log('✅ Netlify dev server responding');
        results.netlifyDev = { status: 'healthy', statusCode: response.statusCode };
    } catch (error) {
        console.log('❌ Netlify dev server not responding:', error.message);
        results.netlifyDev = { status: 'unhealthy', error: error.message };
    }
    
    // 2. Check /api/auth-config (Auth0 wiring)
    console.log('\n🔐 Checking Auth0 Config Endpoint...');
    try {
        const response = await makeRequest('http://localhost:8888/api/auth-config');
        const data = JSON.parse(response.data);
        if (data.success) {
            console.log('✅ Auth config responding');
            console.log('   Domain:', data.config?.domain || 'missing');
            console.log('   Client ID:', data.config?.clientId ? '[present]' : 'missing');
        } else {
            console.log('❌ Auth config reported failure:', data.error || 'unknown error');
        }
        results.authConfig = { status: data.success ? 'healthy' : 'unhealthy', data };
    } catch (error) {
        console.log('❌ Auth config endpoint error:', error.message);
        results.authConfig = { status: 'unhealthy', error: error.message };
    }

    // 3. Check astrology-health function
    console.log('\n🔮 Checking Astrology Health Function...');
    try {
        const response = await makeRequest('http://localhost:8888/.netlify/functions/astrology-health');
        const data = JSON.parse(response.data);
        console.log('✅ Astrology health function responding');
        console.log('   API Status:', data.rapidapi?.status || 'unknown');
        console.log('   Environment:', data.environment || 'unknown');
        results.astrologyHealth = { status: 'healthy', data };
    } catch (error) {
        console.log('❌ Astrology health function error:', error.message);
        results.astrologyHealth = { status: 'unhealthy', error: error.message };
    }
    
    // 4. Check math brain function
    console.log('\n🧠 Checking Math Brain Function...');
    const testPayload = {
        person1: {
            name: "Test User",
            birthDate: "1990-01-01",
            birthTime: "12:00",
            latitude: 40.7128,
            longitude: -74.0060,
            city: "New York",
            timezone: "America/New_York"
        },
        transitStartDate: "2025-01-01",
        transitEndDate: "2025-01-07",
        reportType: "individual"
    };
    
    try {
        const response = await makeRequest(
            'http://localhost:8888/.netlify/functions/astrology-mathbrain',
            'POST',
            JSON.stringify(testPayload)
        );
        const data = JSON.parse(response.data);
        console.log('✅ Math brain function responding');
        console.log('   Success:', data.success);
        if (data.success) {
            console.log('   Report sections:', Object.keys(data.data || {}).length);
        }
        results.mathBrain = { status: 'healthy', success: data.success };
    } catch (error) {
        console.log('❌ Math brain function error:', error.message);
        results.mathBrain = { status: 'unhealthy', error: error.message };
    }
    
    // 5. Check Next.js dev server (port 4000)
    console.log('\n⚛️  Checking Next.js Dev (4000)...');
    try {
        const response = await makeRequest('http://localhost:4000');
        console.log('✅ Next.js dev server responding');
        results.nextjs = { status: 'healthy', statusCode: response.statusCode };
    } catch (error) {
        console.log('❌ Next.js dev server not responding:', error.message);
        results.nextjs = { status: 'unhealthy', error: error.message };
    }
    
    // 6. Summary
    console.log('\n📊 Health Summary');
    console.log('=' .repeat(30));
    let healthyCount = 0;
    let totalCount = 0;
    
    for (const [service, result] of Object.entries(results)) {
        totalCount++;
        if (result.status === 'healthy') healthyCount++;
        const status = result.status === 'healthy' ? '✅' : '❌';
        console.log(`${status} ${service}: ${result.status}`);
    }
    
    console.log(`\n🎯 Overall Health: ${healthyCount}/${totalCount} services healthy`);
    
    if (healthyCount === totalCount) {
        console.log('🎉 All systems operational!');
        console.log('\n🔧 Enhanced diagnostics features available:');
        console.log('   • Resource error capture');
        console.log('   • Promise timeout detection (8s)');
        console.log('   • HTTPS URL validation');
        console.log('   • Improved PDF export with font handling');
        console.log('   • Triple RAF for complex layouts');
    } else {
        console.log('⚠️  Some services need attention');
    }
    
    return results;
}

function makeRequest(url, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const isHttps = url.startsWith('https:');
        const client = isHttps ? https : http;
        const urlObj = new URL(url);
        
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...(data && { 'Content-Length': Buffer.byteLength(data) })
            },
            timeout: 10000
        };
        
        const req = client.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    data: responseData,
                    headers: res.headers
                });
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        if (data) {
            req.write(data);
        }
        
        req.end();
    });
}

// Run the health check
if (require.main === module) {
    healthCheck().catch(console.error);
}

module.exports = { healthCheck };
