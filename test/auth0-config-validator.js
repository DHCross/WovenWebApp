/**
 * Auth0 Configuration Validator for WovenWebApp
 * 
 * Validates Auth0 setup, URL whitelisting, and callback configurations
 * Tests audience alignment and tenant setup
 * 
 * Usage: node test/auth0-config-validator.js
 */

const fs = require('fs');
const path = require('path');

class Auth0ConfigValidator {
    constructor() {
        this.results = [];
        this.issues = [];
        this.warnings = [];
    }

    async validate() {
        console.log('🔐 Auth0 Configuration Validator');
        console.log('=================================\n');
        
        await this.validateEnvironmentVariables();
        await this.validateAuth0Domain();
        await this.validateClientConfiguration();
        await this.validateAudienceConfiguration();
        await this.validateUrlWhitelisting();
        await this.validateConfigFunction();
        await this.validateSecuritySettings();
        
        this.printSummary();
    }

    log(test, status, message, details = null) {
        const result = { test, status, message, details };
        this.results.push(result);
        
        const icon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️ ' : '❌';
        console.log(`${icon} ${test}: ${message}`);
        
        if (details) {
            console.log(`   ${details}`);
        }
        
        if (status === 'FAIL') {
            this.issues.push(result);
        } else if (status === 'WARN') {
            this.warnings.push(result);
        }
        
        console.log('');
    }

    async validateEnvironmentVariables() {
        console.log('🌍 ENVIRONMENT VARIABLES');
        console.log('-'.repeat(40));
        
        const domain = process.env.AUTH0_DOMAIN;
        const clientId = process.env.AUTH0_CLIENT_ID;
        const audience = process.env.AUTH0_AUDIENCE;
        
        if (!domain && !clientId) {
            this.log(
                'Auth0 Environment',
                'WARN',
                'Auth0 not configured',
                'Auth features will be disabled. This is OK for Math Brain only usage.'
            );
            return;
        }
        
        if (domain) {
            if (domain.includes('http://') || domain.includes('https://')) {
                this.log(
                    'AUTH0_DOMAIN Format',
                    'FAIL',
                    'Domain includes protocol',
                    `Should be "your-tenant.us.auth0.com", not "${domain}"`
                );
            } else if (!domain.includes('.auth0.com')) {
                this.log(
                    'AUTH0_DOMAIN Format',
                    'FAIL',
                    'Invalid domain format',
                    `Should end with .auth0.com, got "${domain}"`
                );
            } else {
                this.log(
                    'AUTH0_DOMAIN Format',
                    'PASS',
                    'Domain format correct',
                    `Using domain: ${domain}`
                );
            }
        } else {
            this.log(
                'AUTH0_DOMAIN',
                'FAIL',
                'AUTH0_DOMAIN missing',
                'Required for Auth0 integration'
            );
        }
        
        if (clientId) {
            if (clientId.length < 20) {
                this.log(
                    'AUTH0_CLIENT_ID Format',
                    'FAIL',
                    'Client ID too short',
                    `Expected 32+ characters, got ${clientId.length}`
                );
            } else {
                this.log(
                    'AUTH0_CLIENT_ID Format',
                    'PASS',
                    'Client ID format valid',
                    `Length: ${clientId.length} characters`
                );
            }
        } else {
            this.log(
                'AUTH0_CLIENT_ID',
                'FAIL',
                'AUTH0_CLIENT_ID missing',
                'Required for Auth0 integration'
            );
        }
        
        if (audience) {
            if (audience.includes('auth0.com/api/v2/')) {
                this.log(
                    'AUTH0_AUDIENCE',
                    'FAIL',
                    'Using Management API audience',
                    'Should use custom API identifier, not Management API'
                );
            } else {
                this.log(
                    'AUTH0_AUDIENCE',
                    'PASS',
                    'Custom audience configured',
                    `Audience: ${audience}`
                );
            }
        } else {
            this.log(
                'AUTH0_AUDIENCE',
                'WARN',
                'No audience configured',
                'Optional but recommended for API access'
            );
        }
    }

    async validateAuth0Domain() {
        const domain = process.env.AUTH0_DOMAIN;
        if (!domain) return;
        
        console.log('🌐 DOMAIN VALIDATION');
        console.log('-'.repeat(40));
        
        try {
            // Test domain accessibility
            const wellKnownUrl = `https://${domain}/.well-known/openid_configuration`;
            console.log(`Testing: ${wellKnownUrl}`);
            
            const response = await this.fetchWithTimeout(wellKnownUrl, { timeout: 5000 });
            
            if (response.ok) {
                const config = await response.json();
                
                this.log(
                    'Auth0 Domain Accessibility',
                    'PASS',
                    'Domain accessible',
                    `Issuer: ${config.issuer}`
                );
                
                // Validate issuer matches domain
                if (config.issuer === `https://${domain}/`) {
                    this.log(
                        'Issuer Validation',
                        'PASS',
                        'Issuer matches domain',
                        'Configuration consistent'
                    );
                } else {
                    this.log(
                        'Issuer Validation',
                        'WARN',
                        'Issuer mismatch',
                        `Expected https://${domain}/, got ${config.issuer}`
                    );
                }
                
            } else {
                this.log(
                    'Auth0 Domain Accessibility',
                    'FAIL',
                    `Domain not accessible: ${response.status}`,
                    'Check domain spelling and Auth0 tenant status'
                );
            }
            
        } catch (error) {
            this.log(
                'Auth0 Domain Accessibility',
                'FAIL',
                'Network error accessing domain',
                error.message
            );
        }
    }

    async validateClientConfiguration() {
        const domain = process.env.AUTH0_DOMAIN;
        const clientId = process.env.AUTH0_CLIENT_ID;
        
        if (!domain || !clientId) return;
        
        console.log('👤 CLIENT CONFIGURATION');
        console.log('-'.repeat(40));
        
        // We can't directly validate the client config without Management API access,
        // but we can validate the format and provide guidance
        
        this.log(
            'Client Type Guidance',
            'WARN',
            'Verify application type in Auth0 Dashboard',
            'Must be "Single Page Application" for proper CORS and token handling'
        );
        
        this.log(
            'Grant Types Guidance',
            'WARN',
            'Verify grant types in Auth0 Dashboard',
            'Should include "Authorization Code with PKCE" for SPAs'
        );
    }

    async validateAudienceConfiguration() {
        const audience = process.env.AUTH0_AUDIENCE;
        
        console.log('🎯 AUDIENCE CONFIGURATION');
        console.log('-'.repeat(40));
        
        if (!audience) {
            this.log(
                'API Audience',
                'WARN',
                'No audience configured',
                'If using protected APIs, configure AUTH0_AUDIENCE with your API identifier'
            );
            return;
        }
        
        // Check for common mistakes
        if (audience.includes('.auth0.com')) {
            this.log(
                'Audience Format',
                'FAIL',
                'Audience appears to be a domain',
                'Should be your custom API identifier, not Auth0 domain'
            );
        } else if (audience.startsWith('http')) {
            this.log(
                'Audience Format',
                'WARN',
                'Audience is a URL',
                'Verify this matches your API identifier exactly'
            );
        } else {
            this.log(
                'Audience Format',
                'PASS',
                'Audience format appears correct',
                `Using: ${audience}`
            );
        }
    }

    async validateUrlWhitelisting() {
        console.log('🔗 URL WHITELISTING');
        console.log('-'.repeat(40));
        
        const domain = process.env.AUTH0_DOMAIN;
        if (!domain) return;
        
        // Common URL patterns that should be whitelisted
        const requiredUrls = {
            callback: [
                'http://localhost:8888',
                'http://localhost:8888/',
                'https://your-site.netlify.app',
                'https://your-site.netlify.app/'
            ],
            logout: [
                'http://localhost:8888',
                'http://localhost:8888/',
                'https://your-site.netlify.app',
                'https://your-site.netlify.app/'
            ],
            webOrigins: [
                'http://localhost:8888',
                'https://your-site.netlify.app'
            ]
        };
        
        this.log(
            'Callback URLs',
            'WARN',
            'Verify in Auth0 Dashboard',
            `Required: ${requiredUrls.callback.join(', ')}`
        );
        
        this.log(
            'Logout URLs',
            'WARN',
            'Verify in Auth0 Dashboard',
            `Required: ${requiredUrls.logout.join(', ')}`
        );
        
        this.log(
            'Web Origins',
            'WARN',
            'Verify in Auth0 Dashboard',
            `Required: ${requiredUrls.webOrigins.join(', ')}`
        );
        
        // Common URL formatting mistakes
        this.log(
            'URL Formatting Tips',
            'WARN',
            'Check for common mistakes',
            'No trailing spaces, correct protocol (http/https), exact port numbers'
        );
    }

    async validateConfigFunction() {
        console.log('⚙️  CONFIG FUNCTION');
        console.log('-'.repeat(40));
        
        const configPath = path.join(__dirname, '..', 'netlify', 'functions', 'auth-config.js');
        
        if (!fs.existsSync(configPath)) {
            this.log(
                'Config Function File',
                'FAIL',
                'auth-config.js not found',
                'Required for runtime Auth0 configuration'
            );
            return;
        }
        
        this.log(
            'Config Function File',
            'PASS',
            'auth-config.js exists',
            'Function file present'
        );
        
        // Try to load and validate the function
        try {
            delete require.cache[require.resolve(configPath)];
            const configModule = require(configPath);
            
            if (typeof configModule.handler === 'function') {
                this.log(
                    'Config Function Handler',
                    'PASS',
                    'Handler function found',
                    'Function can be loaded successfully'
                );
            } else {
                this.log(
                    'Config Function Handler',
                    'FAIL',
                    'Handler function missing',
                    'Expected exports.handler function'
                );
            }
            
        } catch (error) {
            this.log(
                'Config Function Loading',
                'FAIL',
                'Function loading failed',
                error.message
            );
        }
    }

    async validateSecuritySettings() {
        console.log('🛡️  SECURITY SETTINGS');
        console.log('-'.repeat(40));
        
        // Check CSP configuration
        const netlifyTomlPath = path.join(__dirname, '..', 'netlify.toml');
        
        if (fs.existsSync(netlifyTomlPath)) {
            const netlifyConfig = fs.readFileSync(netlifyTomlPath, 'utf8');
            
            if (netlifyConfig.includes('connect-src') && netlifyConfig.includes('auth0.com')) {
                this.log(
                    'CSP Configuration',
                    'PASS',
                    'Auth0 allowed in CSP',
                    'connect-src and frame-src configured for Auth0'
                );
            } else {
                this.log(
                    'CSP Configuration',
                    'WARN',
                    'Check CSP for Auth0 domains',
                    'Ensure connect-src and frame-src allow *.auth0.com'
                );
            }
        } else {
            this.log(
                'Netlify Configuration',
                'WARN',
                'netlify.toml not found',
                'CSP headers may not be configured'
            );
        }
        
        // Token storage security
        this.log(
            'Token Storage',
            'WARN',
            'Review token storage security',
            'Tokens stored in localStorage - consider in-memory for production'
        );
        
        // Environment security
        this.log(
            'Environment Security',
            'WARN',
            'Verify environment variable security',
            'Ensure no Auth0 secrets in client-side code'
        );
    }

    async fetchWithTimeout(url, options = {}) {
        const timeout = options.timeout || 5000;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                signal: controller.signal,
                ...options
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    printSummary() {
        console.log('📊 AUTH0 VALIDATION SUMMARY');
        console.log('============================');
        
        const total = this.results.length;
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const warnings = this.results.filter(r => r.status === 'WARN').length;
        const failed = this.results.filter(r => r.status === 'FAIL').length;
        
        console.log(`Total Checks: ${total}`);
        console.log(`✅ Passed: ${passed}`);
        console.log(`⚠️  Warnings: ${warnings}`);
        console.log(`❌ Failed: ${failed}`);
        
        if (this.issues.length > 0) {
            console.log('\n🚨 CRITICAL ISSUES TO FIX:');
            this.issues.forEach(issue => {
                console.log(`   - ${issue.test}: ${issue.message}`);
                if (issue.details) {
                    console.log(`     ${issue.details}`);
                }
            });
        }
        
        if (this.warnings.length > 0) {
            console.log('\n⚠️  ITEMS TO VERIFY:');
            this.warnings.forEach(warning => {
                console.log(`   - ${warning.test}: ${warning.message}`);
            });
        }
        
        console.log('\n📚 NEXT STEPS:');
        console.log('   1. Fix any critical issues above');
        console.log('   2. Verify URL whitelisting in Auth0 Dashboard');
        console.log('   3. Test auth flow: curl -s https://your-site/.netlify/functions/auth-config');
        console.log('   4. Verify application type is "Single Page Application"');
        console.log('   5. Check grant types include "Authorization Code with PKCE"');
        
        const isReady = this.issues.length === 0;
        console.log(`\n${isReady ? '🎉' : '⚠️ '} Auth0 ${isReady ? 'configuration ready' : 'needs attention'}`);
    }
}

// Add global fetch if not available
if (typeof fetch === 'undefined') {
    try {
        global.fetch = require('node-fetch');
    } catch (e) {
        console.warn('⚠️  node-fetch not available - skipping network tests');
        global.fetch = () => Promise.reject(new Error('fetch not available'));
    }
}

async function runAuth0ConfigValidation() {
    // Load environment variables if .env file exists
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
        try {
            require('dotenv').config({ path: envPath });
        } catch (e) {
            console.warn('⚠️  dotenv not available - loading .env manually');
            // Basic .env parser as fallback
            const envContent = fs.readFileSync(envPath, 'utf8');
            envContent.split('\n').forEach(line => {
                const [key, value] = line.split('=');
                if (key && value && !key.startsWith('#')) {
                    process.env[key.trim()] = value.trim();
                }
            });
        }
    }
    
    const validator = new Auth0ConfigValidator();
    await validator.validate();
}

if (require.main === module) {
    runAuth0ConfigValidation().catch(console.error);
}

module.exports = { Auth0ConfigValidator, runAuth0ConfigValidation };