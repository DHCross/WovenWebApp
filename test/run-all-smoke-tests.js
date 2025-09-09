/**
 * Master Smoke Test Runner for WovenWebApp
 * 
 * Runs all smoke tests and debugging utilities in sequence
 * Provides comprehensive system health check
 * 
 * Usage: node test/run-all-smoke-tests.js [--environment=production|staging|development] [--skip-network]
 */

const fs = require('fs');
const path = require('path');

// Import test modules
const { runSmokeTests } = require('./smoke-tests');
const { runEndpointHealthCheck } = require('./endpoint-health-check');
const { runAuth0ConfigValidation } = require('./auth0-config-validator');
const { runDeploymentVerification } = require('./deployment-verification');

class MasterSmokeTestRunner {
    constructor(options = {}) {
        this.environment = options.environment || 'development';
        this.skipNetwork = options.skipNetwork || false;
        this.baseUrl = options.baseUrl || 'http://localhost:8888';
        this.results = [];
        this.startTime = Date.now();
    }

    async runAllTests() {
        console.log('🧪 WOVEN WEB APP - MASTER SMOKE TEST SUITE');
        console.log('===========================================');
        console.log(`Environment: ${this.environment.toUpperCase()}`);
        console.log(`Network Tests: ${this.skipNetwork ? 'DISABLED' : 'ENABLED'}`);
        console.log(`Base URL: ${this.baseUrl}`);
        console.log(`Started: ${new Date().toISOString()}\n`);
        
        try {
            // 1. Basic Environment and Configuration Tests
            await this.runTestSuite('Environment & Configuration', async () => {
                console.log('🔍 Running basic smoke tests...\n');
                await runSmokeTests();
            });
            
            // 2. Deployment Verification
            await this.runTestSuite('Deployment Verification', async () => {
                console.log('🚀 Running deployment verification...\n');
                await runDeploymentVerification();
            });
            
            // 3. Auth0 Configuration (if configured)
            if (this.hasAuth0Config()) {
                await this.runTestSuite('Auth0 Configuration', async () => {
                    console.log('🔐 Running Auth0 configuration validation...\n');
                    await runAuth0ConfigValidation();
                });
            } else {
                this.logSkipped('Auth0 Configuration', 'Auth0 not configured - skipping');
            }
            
            // 4. Endpoint Health Checks (if network tests enabled)
            if (!this.skipNetwork) {
                await this.runTestSuite('Endpoint Health Check', async () => {
                    console.log('🏥 Running endpoint health checks...\n');
                    await runEndpointHealthCheck();
                });
            } else {
                this.logSkipped('Endpoint Health Check', 'Network tests disabled');
            }
            
        } catch (error) {
            console.error(`\n❌ Test suite failed: ${error.message}`);
            this.results.push({
                suite: 'Master Test Runner',
                status: 'FAIL',
                error: error.message
            });
        }
        
        this.printFinalSummary();
    }

    async runTestSuite(suiteName, testFunction) {
        const suiteStartTime = Date.now();
        
        try {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`📋 ${suiteName.toUpperCase()}`);
            console.log(`${'='.repeat(60)}\n`);
            
            await testFunction();
            
            const duration = Date.now() - suiteStartTime;
            
            this.results.push({
                suite: suiteName,
                status: 'PASS',
                duration: duration
            });
            
            console.log(`\n✅ ${suiteName} completed in ${duration}ms\n`);
            
        } catch (error) {
            const duration = Date.now() - suiteStartTime;
            
            this.results.push({
                suite: suiteName,
                status: 'FAIL',
                error: error.message,
                duration: duration
            });
            
            console.error(`\n❌ ${suiteName} failed: ${error.message}`);
            console.error(`   Duration: ${duration}ms\n`);
            
            // Continue with other tests instead of stopping
        }
    }

    logSkipped(suiteName, reason) {
        this.results.push({
            suite: suiteName,
            status: 'SKIP',
            reason: reason
        });
        
        console.log(`\n⏭️  ${suiteName}: ${reason}\n`);
    }

    hasAuth0Config() {
        return !!(process.env.AUTH0_DOMAIN || process.env.AUTH0_CLIENT_ID);
    }

    printFinalSummary() {
        const totalDuration = Date.now() - this.startTime;
        
        console.log('\n' + '='.repeat(80));
        console.log('🎯 MASTER SMOKE TEST FINAL SUMMARY');
        console.log('='.repeat(80));
        
        console.log(`\nTotal Runtime: ${Math.round(totalDuration / 1000)}s`);
        console.log(`Environment: ${this.environment.toUpperCase()}`);
        console.log(`Completed: ${new Date().toISOString()}\n`);
        
        // Summary by status
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const failed = this.results.filter(r => r.status === 'FAIL').length;
        const skipped = this.results.filter(r => r.status === 'SKIP').length;
        
        console.log('📊 Test Suite Results:');
        console.log(`   ✅ Passed: ${passed}`);
        console.log(`   ❌ Failed: ${failed}`);
        console.log(`   ⏭️  Skipped: ${skipped}`);
        console.log(`   📋 Total: ${this.results.length}\n`);
        
        // Detailed results
        console.log('📋 Detailed Results:');
        this.results.forEach(result => {
            const icon = result.status === 'PASS' ? '✅' : 
                        result.status === 'FAIL' ? '❌' : '⏭️ ';
            const duration = result.duration ? ` (${result.duration}ms)` : '';
            
            console.log(`   ${icon} ${result.suite}${duration}`);
            
            if (result.error) {
                console.log(`      Error: ${result.error}`);
            }
            if (result.reason) {
                console.log(`      Reason: ${result.reason}`);
            }
        });
        
        // Environment-specific recommendations
        console.log('\n📚 Next Steps:');
        
        if (failed > 0) {
            console.log('   🚨 CRITICAL: Fix failed test suites before deployment');
            console.log('   📖 Review individual test output above for specific issues');
        }
        
        if (this.environment === 'production') {
            console.log('   🔒 Verify environment variables are set in Netlify dashboard');
            console.log('   🔑 Confirm API keys are production-ready');
            console.log('   🌐 Test with production URLs');
        } else if (this.environment === 'development') {
            console.log('   💻 Ensure .env file is configured');
            console.log('   🔧 Run `netlify dev` to test locally');
            console.log('   🎨 Build CSS with `npm run build:css`');
        }
        
        if (skipped > 0) {
            console.log('   ℹ️  Some tests were skipped - review if needed for your deployment');
        }
        
        // Overall status
        const isHealthy = failed === 0;
        const healthStatus = isHealthy ? 'HEALTHY' : 'NEEDS ATTENTION';
        const healthIcon = isHealthy ? '🎉' : '⚠️ ';
        
        console.log(`\n${healthIcon} System Status: ${healthStatus}`);
        
        if (isHealthy) {
            console.log('   🚀 Ready for deployment!');
        } else {
            console.log('   🔧 Address issues above before deploying');
        }
        
        console.log('\n' + '='.repeat(80));
        
        // Exit with error code if tests failed
        if (failed > 0) {
            process.exit(1);
        }
    }
}

async function runMasterSmokeTests() {
    const args = process.argv.slice(2);
    
    // Parse command line arguments
    const envArg = args.find(arg => arg.startsWith('--environment='));
    const environment = envArg ? envArg.split('=')[1] : 'development';
    
    const skipNetwork = args.includes('--skip-network');
    
    const urlArg = args.find(arg => arg.startsWith('--url='));
    const baseUrl = urlArg ? urlArg.split('=')[1] : 'http://localhost:8888';
    
    // Load environment variables
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
    
    // Create and run master test suite
    const runner = new MasterSmokeTestRunner({
        environment,
        skipNetwork,
        baseUrl
    });
    
    await runner.runAllTests();
}

// Helper function to check if we're in a CI environment
function isCIEnvironment() {
    return !!(process.env.CI || process.env.GITHUB_ACTIONS || process.env.NETLIFY);
}

// Helper function to check if Netlify dev is running
async function isNetlifyDevRunning() {
    try {
        const response = await fetch('http://localhost:8888', { 
            signal: AbortSignal.timeout(2000) 
        });
        return response.ok;
    } catch {
        return false;
    }
}

// Pre-flight checks
async function preFlightCheck() {
    console.log('✈️  Pre-flight checks...');
    
    const environment = process.argv.find(arg => arg.startsWith('--environment='))?.split('=')[1] || 'development';
    const skipNetwork = process.argv.includes('--skip-network');
    
    if (environment === 'development' && !skipNetwork) {
        // Check if Netlify dev is running for local development
        try {
            global.fetch = global.fetch || require('node-fetch');
            const isRunning = await isNetlifyDevRunning();
            
            if (!isRunning) {
                console.log('⚠️  Netlify dev not detected on localhost:8888');
                console.log('   For full testing, run: npm run dev');
                console.log('   Or use --skip-network to skip endpoint tests\n');
            }
        } catch (e) {
            console.log('⚠️  Cannot check Netlify dev status (node-fetch needed for network tests)\n');
        }
    }
    
    if (isCIEnvironment()) {
        console.log('🤖 CI environment detected');
        console.log('   Network tests will be limited\n');
    }
}

if (require.main === module) {
    // Add global fetch if needed
    if (typeof fetch === 'undefined') {
        try {
            global.fetch = require('node-fetch');
        } catch (e) {
            console.warn('⚠️  node-fetch not available - network tests will be limited');
        }
    }
    
    preFlightCheck()
        .then(() => runMasterSmokeTests())
        .catch(console.error);
}

module.exports = { 
    MasterSmokeTestRunner, 
    runMasterSmokeTests,
    isCIEnvironment,
    isNetlifyDevRunning
};