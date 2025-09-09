/**
 * Endpoint Health Check Utility for WovenWebApp
 * 
 * Validates all Netlify function endpoints and API routes
 * Tests for URL whitelisting and callback verification
 * 
 * Usage: node test/endpoint-health-check.js [--local] [--production]
 */

const fs = require('fs');
const path = require('path');

class EndpointHealthChecker {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || 'http://localhost:8888';
        this.isLocal = options.isLocal || this.baseUrl.includes('localhost');
        this.timeout = options.timeout || 10000;
        this.results = [];
    }

    async checkEndpoint(name, path, options = {}) {
        const startTime = Date.now();
        const url = `${this.baseUrl}${path}`;
        
        console.log(`🔍 Checking ${name}: ${url}`);
        
        try {
            const response = await this.fetchWithTimeout(url, {
                method: options.method || 'GET',
                headers: options.headers || {},
                body: options.body ? JSON.stringify(options.body) : undefined,
                ...options.fetchOptions
            });
            
            const responseTime = Date.now() - startTime;
            const result = {
                name,
                url,
                status: response.status,
                ok: response.ok,
                responseTime,
                headers: Object.fromEntries(response.headers.entries()),
                contentType: response.headers.get('content-type')
            };
            
            if (options.validateResponse) {
                try {
                    const text = await response.text();
                    let data = text;
                    
                    if (result.contentType?.includes('application/json')) {
                        data = JSON.parse(text);
                    }
                    
                    result.data = data;
                    result.validation = options.validateResponse(data, response);
                } catch (parseError) {
                    result.parseError = parseError.message;
                }
            }
            
            this.results.push(result);
            
            const statusIcon = response.ok ? '✅' : '❌';
            const timing = responseTime < 1000 ? '🟢' : responseTime < 3000 ? '🟡' : '🔴';
            
            console.log(`${statusIcon} ${response.status} (${responseTime}ms) ${timing}`);
            
            if (result.validation?.error) {
                console.log(`   ⚠️  Validation: ${result.validation.error}`);
            } else if (result.validation?.success) {
                console.log(`   ✅ Validation: ${result.validation.success}`);
            }
            
            console.log('');
            
            return result;
            
        } catch (error) {
            const result = {
                name,
                url,
                error: error.message,
                responseTime: Date.now() - startTime
            };
            
            this.results.push(result);
            console.log(`❌ ERROR: ${error.message}\n`);
            return result;
        }
    }

    async fetchWithTimeout(url, options) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeout);
            return response;
        } catch (error) {
            clearTimeout(timeout);
            if (error.name === 'AbortError') {
                throw new Error(`Request timeout after ${this.timeout}ms`);
            }
            throw error;
        }
    }

    async runHealthChecks() {
        console.log('🏥 WovenWebApp Endpoint Health Check');
        console.log('=====================================\n');
        console.log(`Base URL: ${this.baseUrl}`);
        console.log(`Environment: ${this.isLocal ? 'Local Development' : 'Production'}`);
        console.log(`Timeout: ${this.timeout}ms\n`);
        
        // Check static files
        await this.checkStaticFiles();
        
        // Check API endpoints
        await this.checkApiEndpoints();
        
        // Check Auth0 endpoints
        await this.checkAuth0Endpoints();
        
        // Check configuration endpoints
        await this.checkConfigEndpoints();
        
        // Print summary
        this.printSummary();
    }

    async checkStaticFiles() {
        console.log('📄 STATIC FILES');
        console.log('-'.repeat(30));
        
        await this.checkEndpoint('Main Application', '/', {
            validateResponse: (data) => {
                if (typeof data === 'string' && data.includes('<title>')) {
                    return { success: 'HTML page loaded successfully' };
                }
                return { error: 'Invalid HTML response' };
            }
        });
        
        await this.checkEndpoint('CSS Assets', '/dist/output.css', {
            validateResponse: (data) => {
                if (typeof data === 'string' && data.includes('tailwind')) {
                    return { success: 'Tailwind CSS compiled successfully' };
                }
                return { error: 'CSS file missing or invalid' };
            }
        });
        
        await this.checkEndpoint('Configuration Script', '/config.js', {
            validateResponse: (data) => {
                if (typeof data === 'string' && data.includes('WovenMapConfig')) {
                    return { success: 'Configuration script loaded' };
                }
                return { error: 'Configuration script missing or invalid' };
            }
        });
    }

    async checkApiEndpoints() {
        console.log('🔌 API ENDPOINTS');
        console.log('-'.repeat(30));
        
        // Test astrology math brain endpoint - GET should return 405
        await this.checkEndpoint('Math Brain (GET)', '/api/astrology-mathbrain', {
            validateResponse: (data, response) => {
                if (response.status === 405) {
                    return { success: 'Correctly rejects GET requests' };
                }
                return { error: `Expected 405, got ${response.status}` };
            }
        });
        
        // Test with minimal valid payload
        await this.checkEndpoint('Math Brain (POST)', '/api/astrology-mathbrain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: {
                personA: {
                    name: 'Test',
                    year: 1990,
                    month: 1, 
                    day: 1,
                    hour: 12,
                    minute: 0,
                    city: 'New York',
                    nation: 'US',
                    latitude: 40.7128,
                    longitude: -74.0060,
                    timezone: 'America/New_York',
                    zodiac_type: 'Tropic'
                }
            },
            validateResponse: (data, response) => {
                if (response.status === 500 && data.error?.includes('Authentication failed')) {
                    return { success: 'Function accessible, API key needed' };
                } else if (response.status === 200) {
                    return { success: 'Function working with valid API key' };
                } else if (response.status === 400) {
                    return { success: 'Function validates input correctly' };
                }
                return { error: `Unexpected response: ${response.status}` };
            }
        });
    }

    async checkAuth0Endpoints() {
        console.log('🔐 AUTH0 ENDPOINTS');
        console.log('-'.repeat(30));
        
        await this.checkEndpoint('Auth Config', '/api/auth-config', {
            validateResponse: (data, response) => {
                if (response.status === 200 && data.domain && data.clientId) {
                    return { success: 'Auth0 configuration valid' };
                } else if (response.status === 500 && data.error?.includes('Auth0 environment not configured')) {
                    return { success: 'Auth0 not configured (expected in development)' };
                }
                return { error: 'Auth0 configuration endpoint failed' };
            }
        });
    }

    async checkConfigEndpoints() {
        console.log('⚙️  CONFIGURATION ENDPOINTS');
        console.log('-'.repeat(30));
        
        // Test Netlify function proxy routes
        await this.checkEndpoint('Function Route (astrology)', '/.netlify/functions/astrology-mathbrain', {
            validateResponse: (data, response) => {
                if (response.status === 405) {
                    return { success: 'Direct function route accessible' };
                }
                return { error: `Direct function route: ${response.status}` };
            }
        });
        
        await this.checkEndpoint('Function Route (auth-config)', '/.netlify/functions/auth-config', {
            validateResponse: (data, response) => {
                if (response.status === 200 || response.status === 500) {
                    return { success: 'Auth config function accessible' };
                }
                return { error: `Auth config function: ${response.status}` };
            }
        });
    }

    printSummary() {
        console.log('📊 HEALTH CHECK SUMMARY');
        console.log('========================');
        
        const total = this.results.length;
        const successful = this.results.filter(r => r.ok || (r.status >= 200 && r.status < 400)).length;
        const errors = this.results.filter(r => r.error).length;
        const warnings = this.results.filter(r => r.status >= 400 && !r.error).length;
        
        console.log(`Total Endpoints: ${total}`);
        console.log(`✅ Successful: ${successful}`);
        console.log(`⚠️  Warnings: ${warnings}`);
        console.log(`❌ Errors: ${errors}`);
        
        // Performance summary
        const responseTimes = this.results
            .filter(r => r.responseTime && !r.error)
            .map(r => r.responseTime);
            
        if (responseTimes.length > 0) {
            const avgTime = Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);
            const maxTime = Math.max(...responseTimes);
            
            console.log(`\n⏱️  Performance:`);
            console.log(`   Average Response Time: ${avgTime}ms`);
            console.log(`   Max Response Time: ${maxTime}ms`);
        }
        
        // Critical issues
        const criticalIssues = this.results.filter(r => 
            r.error || 
            (r.name.includes('Math Brain') && r.status >= 500) ||
            (r.name.includes('Main Application') && !r.ok)
        );
        
        if (criticalIssues.length > 0) {
            console.log('\n🚨 CRITICAL ISSUES:');
            criticalIssues.forEach(issue => {
                console.log(`   - ${issue.name}: ${issue.error || `Status ${issue.status}`}`);
            });
        }
        
        console.log('\n' + (criticalIssues.length === 0 ? '🎉 All endpoints healthy!' : '⚠️  Some endpoints need attention'));
    }
}

// Add global fetch polyfill for Node.js environments
if (typeof fetch === 'undefined') {
    try {
        global.fetch = require('node-fetch');
    } catch (e) {
        console.error('❌ node-fetch required for endpoint testing');
        console.error('   Install with: npm install node-fetch');
        process.exit(1);
    }
}

async function runEndpointHealthCheck() {
    const args = process.argv.slice(2);
    const isLocal = args.includes('--local') || (!args.includes('--production'));
    const baseUrl = isLocal ? 'http://localhost:8888' : process.env.DEPLOY_URL || 'https://your-site.netlify.app';
    
    const checker = new EndpointHealthChecker({
        baseUrl,
        isLocal,
        timeout: 15000
    });
    
    await checker.runHealthChecks();
}

if (require.main === module) {
    runEndpointHealthCheck().catch(console.error);
}

module.exports = { EndpointHealthChecker, runEndpointHealthCheck };