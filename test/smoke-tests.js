/**
 * Comprehensive Smoke Test Suite for WovenWebApp
 * 
 * Tests environment configuration, Auth0 setup, API endpoints,
 * and deployment verification as outlined in issue requirements.
 * 
 * Usage: node test/smoke-tests.js
 */

const fs = require('fs');
const path = require('path');

class SmokeTestRunner {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
        this.warnings = 0;
        this.results = [];
    }

    test(name, testFn, options = {}) {
        this.tests.push({ 
            name, 
            testFn, 
            critical: options.critical !== false, // Default to critical
            category: options.category || 'general'
        });
    }

    assert(condition, message) {
        if (!condition) throw new Error(message || 'Assertion failed');
    }

    warn(message) {
        console.warn(`⚠️  WARNING: ${message}`);
        this.warnings++;
    }

    async run() {
        console.log('🔥 WovenWebApp Smoke Test Suite');
        console.log('================================\n');
        
        const categories = [...new Set(this.tests.map(t => t.category))];
        
        for (const category of categories) {
            console.log(`📋 ${category.toUpperCase()} TESTS`);
            console.log('-'.repeat(50));
            
            const categoryTests = this.tests.filter(t => t.category === category);
            
            for (const { name, testFn, critical } of categoryTests) {
                try {
                    console.log(`Running: ${name}`);
                    await testFn();
                    console.log(`✅ PASS: ${name}\n`);
                    this.passed++;
                    this.results.push({ name, status: 'PASS', critical });
                } catch (error) {
                    const severity = critical ? 'CRITICAL FAIL' : 'FAIL';
                    console.error(`❌ ${severity}: ${name}`);
                    console.error(`   Error: ${error.message}\n`);
                    this.failed++;
                    this.results.push({ 
                        name, 
                        status: 'FAIL', 
                        error: error.message,
                        critical
                    });
                }
            }
        }
        
        this.printSummary();
    }

    printSummary() {
        console.log('\n📊 SMOKE TEST SUMMARY');
        console.log('======================');
        console.log(`Total Tests: ${this.tests.length}`);
        console.log(`✅ Passed: ${this.passed}`);
        console.log(`❌ Failed: ${this.failed}`);
        console.log(`⚠️  Warnings: ${this.warnings}`);
        
        const criticalFailures = this.results.filter(r => r.status === 'FAIL' && r.critical);
        
        if (criticalFailures.length > 0) {
            console.log('\n🚨 CRITICAL FAILURES:');
            criticalFailures.forEach(f => console.log(`   - ${f.name}: ${f.error}`));
            console.log('\n❌ Deployment not ready - critical issues must be resolved');
            process.exit(1);
        } else if (this.failed > 0) {
            console.log('\n⚠️  Some non-critical tests failed - review recommended');
        } else {
            console.log('\n🎉 All smoke tests passed! System ready for deployment');
        }
    }
}

/**
 * Environment Configuration Tests
 */
function setupEnvironmentTests(runner) {
    runner.test('Environment file exists', () => {
        const envPath = path.join(__dirname, '..', '.env');
        runner.assert(fs.existsSync(envPath), '.env file not found - copy .env.example to .env');
    }, { category: 'environment', critical: true });

    runner.test('Required API key configured', () => {
        const rapidApiKey = process.env.RAPIDAPI_KEY;
        runner.assert(rapidApiKey, 'RAPIDAPI_KEY not found in environment');
        runner.assert(rapidApiKey !== 'your_rapidapi_key_here', 'RAPIDAPI_KEY still set to default value');
        runner.assert(rapidApiKey.length >= 32, 'RAPIDAPI_KEY appears too short');
    }, { category: 'environment', critical: true });

    runner.test('Log level configuration', () => {
        const logLevel = process.env.LOG_LEVEL || 'info';
        const validLevels = ['debug', 'info', 'warn', 'error'];
        runner.assert(validLevels.includes(logLevel), `Invalid LOG_LEVEL: ${logLevel}`);
    }, { category: 'environment', critical: false });

    runner.test('Transit configuration settings', () => {
        const batchSize = parseInt(process.env.TRANSIT_BATCH_SIZE) || 5;
        const batchDelay = parseInt(process.env.TRANSIT_BATCH_DELAY) || 500;
        
        runner.assert(batchSize >= 1 && batchSize <= 20, `TRANSIT_BATCH_SIZE out of range: ${batchSize}`);
        runner.assert(batchDelay >= 100, `TRANSIT_BATCH_DELAY too low: ${batchDelay}ms`);
    }, { category: 'environment', critical: false });
}

/**
 * Auth0 Configuration Tests
 */
function setupAuth0Tests(runner) {
    runner.test('Auth0 environment variables', () => {
        const domain = process.env.AUTH0_DOMAIN;
        const clientId = process.env.AUTH0_CLIENT_ID;
        
        if (domain) {
            runner.assert(!domain.includes('http'), 'AUTH0_DOMAIN should not include protocol');
            runner.assert(domain.includes('.auth0.com'), 'AUTH0_DOMAIN should end with .auth0.com');
        } else {
            runner.warn('AUTH0_DOMAIN not configured - Auth features will be disabled');
        }
        
        if (clientId) {
            runner.assert(clientId.length >= 20, 'AUTH0_CLIENT_ID appears too short');
        } else {
            runner.warn('AUTH0_CLIENT_ID not configured - Auth features will be disabled');
        }
    }, { category: 'auth0', critical: false });

    runner.test('Auth config function exists', () => {
        const authConfigPath = path.join(__dirname, '..', 'netlify', 'functions', 'auth-config.js');
        runner.assert(fs.existsSync(authConfigPath), 'auth-config.js function not found');
    }, { category: 'auth0', critical: false });
}

/**
 * Netlify Function Tests
 */
function setupFunctionTests(runner) {
    runner.test('Primary math brain function exists', () => {
        const mathBrainPath = path.join(__dirname, '..', 'netlify', 'functions', 'astrology-mathbrain.js');
        runner.assert(fs.existsSync(mathBrainPath), 'astrology-mathbrain.js function not found');
    }, { category: 'functions', critical: true });

    runner.test('Function dependencies available', () => {
        const seismographPath = path.join(__dirname, '..', 'src', 'seismograph.js');
        const ravenMapperPath = path.join(__dirname, '..', 'src', 'raven-lite-mapper.js');
        
        runner.assert(fs.existsSync(seismographPath), 'seismograph.js module not found');
        runner.assert(fs.existsSync(ravenMapperPath), 'raven-lite-mapper.js module not found');
    }, { category: 'functions', critical: true });

    runner.test('Math brain function can be loaded', () => {
        try {
            const mathBrainPath = path.join(__dirname, '..', 'netlify', 'functions', 'astrology-mathbrain.js');
            delete require.cache[require.resolve(mathBrainPath)];
            const mathBrain = require(mathBrainPath);
            runner.assert(typeof mathBrain.handler === 'function', 'Math brain handler not found');
        } catch (error) {
            throw new Error(`Failed to load math brain function: ${error.message}`);
        }
    }, { category: 'functions', critical: true });
}

/**
 * Configuration File Tests
 */
function setupConfigTests(runner) {
    runner.test('Netlify configuration exists', () => {
        const netlifyTomlPath = path.join(__dirname, '..', 'netlify.toml');
        runner.assert(fs.existsSync(netlifyTomlPath), 'netlify.toml not found');
    }, { category: 'config', critical: true });

    runner.test('Package.json scripts configured', () => {
        const packagePath = path.join(__dirname, '..', 'package.json');
        const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        
        runner.assert(pkg.scripts['build:css'], 'build:css script not found');
        runner.assert(pkg.scripts['dev'], 'dev script not found');
        runner.assert(pkg.scripts['check-env'], 'check-env script not found');
    }, { category: 'config', critical: true });

    runner.test('CSS build configuration', () => {
        const tailwindConfigPath = path.join(__dirname, '..', 'tailwind.config.js');
        const inputCssPath = path.join(__dirname, '..', 'src', 'input.css');
        
        runner.assert(fs.existsSync(tailwindConfigPath), 'tailwind.config.js not found');
        runner.assert(fs.existsSync(inputCssPath), 'src/input.css not found');
    }, { category: 'config', critical: true });
}

/**
 * File Structure Tests
 */
function setupFileStructureTests(runner) {
    runner.test('Core application files exist', () => {
        const indexPath = path.join(__dirname, '..', 'index.html');
        const configPath = path.join(__dirname, '..', 'config.js');
        
        runner.assert(fs.existsSync(indexPath), 'index.html not found');
        runner.assert(fs.existsSync(configPath), 'config.js not found');
    }, { category: 'files', critical: true });

    runner.test('Documentation files exist', () => {
        const readmePath = path.join(__dirname, '..', 'README.md');
        const maintenancePath = path.join(__dirname, '..', 'MAINTENANCE_GUIDE.md');
        const apiIntegrationPath = path.join(__dirname, '..', 'API_INTEGRATION_GUIDE.md');
        
        runner.assert(fs.existsSync(readmePath), 'README.md not found');
        runner.assert(fs.existsSync(maintenancePath), 'MAINTENANCE_GUIDE.md not found');
        runner.assert(fs.existsSync(apiIntegrationPath), 'API_INTEGRATION_GUIDE.md not found');
    }, { category: 'files', critical: false });

    runner.test('CSS output directory exists', () => {
        const distPath = path.join(__dirname, '..', 'dist');
        if (!fs.existsSync(distPath)) {
            runner.warn('dist/ directory not found - run npm run build:css');
        }
    }, { category: 'files', critical: false });
}

/**
 * Load environment and run tests
 */
async function runSmokeTests() {
    // Load environment variables if .env file exists
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
        // Try to load dotenv, but continue if not available
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

    const runner = new SmokeTestRunner();
    
    // Setup test suites
    setupEnvironmentTests(runner);
    setupAuth0Tests(runner);
    setupFunctionTests(runner);
    setupConfigTests(runner);
    setupFileStructureTests(runner);
    
    await runner.run();
}

if (require.main === module) {
    runSmokeTests().catch(console.error);
}

module.exports = { runSmokeTests, SmokeTestRunner };