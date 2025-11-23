/**
 * Deployment Verification Script for WovenWebApp
 * 
 * Verifies deployment configuration, environment setup,
 * and production readiness checks
 * 
 * Usage: node test/deployment-verification.js [--environment=production|staging|development]
 */

const fs = require('fs');
const path = require('path');

class DeploymentVerifier {
    constructor(environment = 'production') {
        this.environment = environment;
        this.results = [];
        this.criticalIssues = [];
        this.warnings = [];
    }

    async verify() {
        console.log('🚀 WovenWebApp Deployment Verification');
        console.log('=======================================\n');
        console.log(`Environment: ${this.environment.toUpperCase()}\n`);
        
        await this.verifyFileStructure();
        await this.verifyBuildConfiguration();
        await this.verifyNetlifyConfiguration();
        await this.verifyEnvironmentVariables();
        await this.verifySecurityConfiguration();
        await this.verifyPerformanceSettings();
        await this.verifyFunctionConfiguration();
        
        this.printSummary();
    }

    log(category, test, status, message, details = null, critical = false) {
        const result = { category, test, status, message, details, critical };
        this.results.push(result);
        
        const icon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️ ' : '❌';
        console.log(`${icon} ${test}: ${message}`);
        
        if (details) {
            console.log(`   ${details}`);
        }
        
        if (status === 'FAIL' && critical) {
            this.criticalIssues.push(result);
        } else if (status === 'WARN' || (status === 'FAIL' && !critical)) {
            this.warnings.push(result);
        }
        
        console.log('');
    }

    async verifyFileStructure() {
        console.log('📁 FILE STRUCTURE');
        console.log('-'.repeat(30));
        
        const requiredFiles = [
            { path: 'index.html', critical: true, description: 'Main application file' },
            { path: 'config.js', critical: true, description: 'Application configuration' },
            { path: 'netlify.toml', critical: true, description: 'Netlify configuration' },
            { path: 'package.json', critical: true, description: 'Package configuration' },
            { path: 'dist/output.css', critical: false, description: 'Compiled CSS (run npm run build:css)' },
            { path: '_redirects', critical: false, description: 'Netlify redirects' }
        ];
        
        for (const file of requiredFiles) {
            const filePath = path.join(__dirname, '..', file.path);
            const exists = fs.existsSync(filePath);
            
            this.log(
                'structure',
                `File: ${file.path}`,
                exists ? 'PASS' : 'FAIL',
                exists ? 'File exists' : 'File missing',
                file.description,
                file.critical
            );
        }
        
        // Check for unwanted files in production
        const unwantedFiles = [
            '.env',
            'node_modules',
            '.DS_Store',
            'Thumbs.db'
        ];
        
        for (const file of unwantedFiles) {
            const filePath = path.join(__dirname, '..', file);
            const exists = fs.existsSync(filePath);
            
            if (exists && this.environment === 'production') {
                this.log(
                    'structure',
                    `Unwanted: ${file}`,
                    'WARN',
                    'File should not be deployed',
                    'Add to .gitignore'
                );
            }
        }
    }

    async verifyBuildConfiguration() {
        console.log('🏗️  BUILD CONFIGURATION');
        console.log('-'.repeat(30));
        
        // Check package.json scripts
        const packagePath = path.join(__dirname, '..', 'package.json');
        
        if (fs.existsSync(packagePath)) {
            const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            
            const requiredScripts = [
                'build:css',
                'dev',
                'check-env'
            ];
            
            for (const script of requiredScripts) {
                const exists = pkg.scripts && pkg.scripts[script];
                
                this.log(
                    'build',
                    `Script: ${script}`,
                    exists ? 'PASS' : 'FAIL',
                    exists ? 'Script configured' : 'Script missing',
                    exists ? pkg.scripts[script] : 'Required for build process',
                    true
                );
            }
            
            // Check dependencies
            const requiredDeps = [
                'tailwindcss',
                'postcss',
                'autoprefixer'
            ];
            
            for (const dep of requiredDeps) {
                const exists = (pkg.dependencies && pkg.dependencies[dep]) || 
                             (pkg.devDependencies && pkg.devDependencies[dep]);
                
                this.log(
                    'build',
                    `Dependency: ${dep}`,
                    exists ? 'PASS' : 'WARN',
                    exists ? 'Dependency available' : 'Dependency missing',
                    exists ? 'Required for CSS compilation' : 'May cause build issues'
                );
            }
        }
        
        // Check if CSS is built
        const cssPath = path.join(__dirname, '..', 'dist', 'output.css');
        
        if (fs.existsSync(cssPath)) {
            const stats = fs.statSync(cssPath);
            const size = Math.round(stats.size / 1024);
            
            this.log(
                'build',
                'CSS Build',
                'PASS',
                'CSS compiled successfully',
                `Size: ${size}KB`
            );
        } else {
            this.log(
                'build',
                'CSS Build',
                'FAIL',
                'CSS not compiled',
                'Run: npm run build:css',
                true
            );
        }
    }

    async verifyNetlifyConfiguration() {
        console.log('⚡ NETLIFY CONFIGURATION');
        console.log('-'.repeat(30));
        
        const netlifyTomlPath = path.join(__dirname, '..', 'netlify.toml');
        
        if (!fs.existsSync(netlifyTomlPath)) {
            this.log(
                'netlify',
                'Configuration File',
                'FAIL',
                'netlify.toml missing',
                'Required for proper deployment',
                true
            );
            return;
        }
        
        const config = fs.readFileSync(netlifyTomlPath, 'utf8');
        
        // Check build command
        if (config.includes('command = "npm run build:css"')) {
            this.log(
                'netlify',
                'Build Command',
                'PASS',
                'Build command configured',
                'CSS will be compiled on deploy'
            );
        } else {
            this.log(
                'netlify',
                'Build Command',
                'WARN',
                'Build command may be missing',
                'Verify CSS compilation in build process'
            );
        }
        
        // Check function directory
        if (config.includes('functions = "netlify/functions"')) {
            this.log(
                'netlify',
                'Functions Directory',
                'PASS',
                'Functions directory configured',
                'Serverless functions will deploy'
            );
        } else {
            this.log(
                'netlify',
                'Functions Directory',
                'FAIL',
                'Functions directory not configured',
                'Add: functions = "netlify/functions"',
                true
            );
        }
        
        // Check redirects
        const requiredRedirects = [
            '/api/astrology-mathbrain',
            '/api/auth-config'
        ];
        
        for (const redirect of requiredRedirects) {
            if (config.includes(`from = "${redirect}"`)) {
                this.log(
                    'netlify',
                    `Redirect: ${redirect}`,
                    'PASS',
                    'Redirect configured',
                    'API endpoint will work'
                );
            } else {
                this.log(
                    'netlify',
                    `Redirect: ${redirect}`,
                    'FAIL',
                    'Redirect missing',
                    'API calls may fail',
                    true
                );
            }
        }
        
        // Check security headers
        if (config.includes('Content-Security-Policy')) {
            this.log(
                'netlify',
                'Security Headers',
                'PASS',
                'CSP configured',
                'Security headers will be applied'
            );
        } else {
            this.log(
                'netlify',
                'Security Headers',
                'WARN',
                'No CSP headers found',
                'Consider adding security headers'
            );
        }
    }

    async verifyEnvironmentVariables() {
        console.log('🌍 ENVIRONMENT VARIABLES');
        console.log('-'.repeat(30));
        
        const criticalEnvVars = [
            { name: 'RAPIDAPI_KEY', required: true, description: 'API access' },
            { name: 'NODE_ENV', required: false, description: 'Environment mode' },
            { name: 'LOG_LEVEL', required: false, description: 'Logging verbosity' }
        ];
        
        const auth0EnvVars = [
            { name: 'AUTH0_DOMAIN', required: false, description: 'Auth0 tenant' },
            { name: 'AUTH0_CLIENT_ID', required: false, description: 'Auth0 client' },
            { name: 'AUTH0_AUDIENCE', required: false, description: 'API audience' }
        ];
        
        // Check critical variables
        for (const envVar of criticalEnvVars) {
            const value = process.env[envVar.name];
            
            if (envVar.required && !value) {
                this.log(
                    'environment',
                    envVar.name,
                    'FAIL',
                    'Required variable missing',
                    envVar.description,
                    true
                );
            } else if (value) {
                const isDefault = value.includes('your_') || value.includes('_here');
                
                this.log(
                    'environment',
                    envVar.name,
                    isDefault ? 'FAIL' : 'PASS',
                    isDefault ? 'Still using default value' : 'Variable configured',
                    `${envVar.description} - Length: ${value.length}`,
                    isDefault
                );
            } else {
                this.log(
                    'environment',
                    envVar.name,
                    'WARN',
                    'Optional variable not set',
                    envVar.description
                );
            }
        }
        
        // Check Auth0 variables (optional but validate if present)
        let auth0Configured = false;
        for (const envVar of auth0EnvVars) {
            const value = process.env[envVar.name];
            if (value) {
                auth0Configured = true;
                break;
            }
        }
        
        if (auth0Configured) {
            this.log(
                'environment',
                'Auth0 Configuration',
                'PASS',
                'Auth0 variables detected',
                'Run auth0-config-validator.js for detailed validation'
            );
        } else {
            this.log(
                'environment',
                'Auth0 Configuration',
                'WARN',
                'Auth0 not configured',
                'Auth features will be disabled (OK for Math Brain only)'
            );
        }
    }

    async verifySecurityConfiguration() {
        console.log('🛡️  SECURITY CONFIGURATION');
        console.log('-'.repeat(30));
        
        // Check for .env in repo
        const envPath = path.join(__dirname, '..', '.env');
        const gitignorePath = path.join(__dirname, '..', '.gitignore');
        
        if (fs.existsSync(envPath) && this.environment === 'production') {
            this.log(
                'security',
                'Environment File',
                'FAIL',
                '.env file present in production',
                'Remove .env from deployment',
                true
            );
        }
        
        if (fs.existsSync(gitignorePath)) {
            const gitignore = fs.readFileSync(gitignorePath, 'utf8');
            
            if (gitignore.includes('.env')) {
                this.log(
                    'security',
                    'Gitignore Protection',
                    'PASS',
                    '.env protected by gitignore',
                    'Secrets won\'t be committed'
                );
            } else {
                this.log(
                    'security',
                    'Gitignore Protection',
                    'WARN',
                    '.env not in gitignore',
                    'Add .env to .gitignore'
                );
            }
        }
        
        // Check for hardcoded secrets in common files
        const filesToCheck = ['index.html', 'config.js'];
        
        for (const file of filesToCheck) {
            const filePath = path.join(__dirname, '..', file);
            
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                const hasSecrets = /([a-zA-Z0-9]{32,}|sk_live_|pk_live_|AKIA[0-9A-Z]{16})/g.test(content);
                
                this.log(
                    'security',
                    `Secrets in ${file}`,
                    hasSecrets ? 'FAIL' : 'PASS',
                    hasSecrets ? 'Potential secrets found' : 'No obvious secrets',
                    hasSecrets ? 'Review file for hardcoded credentials' : 'File appears clean',
                    hasSecrets
                );
            }
        }
    }

    async verifyPerformanceSettings() {
        console.log('⚡ PERFORMANCE SETTINGS');
        console.log('-'.repeat(30));
        
        // Check CSS file size
        const cssPath = path.join(__dirname, '..', 'dist', 'output.css');
        
        if (fs.existsSync(cssPath)) {
            const stats = fs.statSync(cssPath);
            const sizeKB = Math.round(stats.size / 1024);
            
            if (sizeKB > 500) {
                this.log(
                    'performance',
                    'CSS Size',
                    'WARN',
                    `CSS file large: ${sizeKB}KB`,
                    'Consider purging unused CSS'
                );
            } else {
                this.log(
                    'performance',
                    'CSS Size',
                    'PASS',
                    `CSS size optimal: ${sizeKB}KB`,
                    'Good for fast loading'
                );
            }
        }
        
        // Check environment-specific settings
        const logLevel = process.env.LOG_LEVEL || 'info';
        
        if (this.environment === 'production' && logLevel === 'debug') {
            this.log(
                'performance',
                'Log Level',
                'WARN',
                'Debug logging in production',
                'Set LOG_LEVEL=warn or LOG_LEVEL=error for production'
            );
        } else {
            this.log(
                'performance',
                'Log Level',
                'PASS',
                `Appropriate log level: ${logLevel}`,
                'Optimal for environment'
            );
        }
        
        // Check transit batch settings
        const batchSize = parseInt(process.env.TRANSIT_BATCH_SIZE) || 5;
        const batchDelay = parseInt(process.env.TRANSIT_BATCH_DELAY) || 500;
        
        if (this.environment === 'production') {
            if (batchSize > 10) {
                this.log(
                    'performance',
                    'API Batch Size',
                    'WARN',
                    `High batch size: ${batchSize}`,
                    'May trigger rate limits'
                );
            } else {
                this.log(
                    'performance',
                    'API Batch Size',
                    'PASS',
                    `Batch size appropriate: ${batchSize}`,
                    'Good for rate limiting'
                );
            }
        }
    }

    async verifyFunctionConfiguration() {
        console.log('⚙️  FUNCTION CONFIGURATION');
        console.log('-'.repeat(30));
        
        const functionsDir = path.join(__dirname, '..', 'netlify', 'functions');
        
        if (!fs.existsSync(functionsDir)) {
            this.log(
                'functions',
                'Functions Directory',
                'FAIL',
                'Functions directory missing',
                'Create netlify/functions directory',
                true
            );
            return;
        }
        
        const requiredFunctions = [
            'astrology-mathbrain.js',
            'auth-config.js'
        ];
        
        for (const func of requiredFunctions) {
            const funcPath = path.join(functionsDir, func);
            
            if (fs.existsSync(funcPath)) {
                // Try to load the function
                try {
                    delete require.cache[require.resolve(funcPath)];
                    const funcModule = require(funcPath);
                    
                    if (typeof funcModule.handler === 'function') {
                        this.log(
                            'functions',
                            func,
                            'PASS',
                            'Function loadable',
                            'Handler function found'
                        );
                    } else {
                        this.log(
                            'functions',
                            func,
                            'FAIL',
                            'Invalid function format',
                            'Missing handler export',
                            true
                        );
                    }
                } catch (error) {
                    this.log(
                        'functions',
                        func,
                        'FAIL',
                        'Function loading failed',
                        error.message,
                        true
                    );
                }
            } else {
                const critical = func === 'astrology-mathbrain.js';
                
                this.log(
                    'functions',
                    func,
                    'FAIL',
                    'Function file missing',
                    critical ? 'Core function required' : 'Optional function',
                    critical
                );
            }
        }
    }

    printSummary() {
        console.log('📊 DEPLOYMENT VERIFICATION SUMMARY');
        console.log('===================================');
        
        const total = this.results.length;
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const warnings = this.results.filter(r => r.status === 'WARN').length;
        const failed = this.results.filter(r => r.status === 'FAIL').length;
        
        console.log(`Environment: ${this.environment.toUpperCase()}`);
        console.log(`Total Checks: ${total}`);
        console.log(`✅ Passed: ${passed}`);
        console.log(`⚠️  Warnings: ${warnings}`);
        console.log(`❌ Failed: ${failed}`);
        
        if (this.criticalIssues.length > 0) {
            console.log('\n🚨 CRITICAL ISSUES - DEPLOYMENT BLOCKED:');
            this.criticalIssues.forEach(issue => {
                console.log(`   - ${issue.test}: ${issue.message}`);
                if (issue.details) {
                    console.log(`     ${issue.details}`);
                }
            });
        }
        
        if (this.warnings.length > 0) {
            console.log('\n⚠️  WARNINGS - REVIEW RECOMMENDED:');
            this.warnings.slice(0, 5).forEach(warning => {
                console.log(`   - ${warning.test}: ${warning.message}`);
            });
            
            if (this.warnings.length > 5) {
                console.log(`   ... and ${this.warnings.length - 5} more warnings`);
            }
        }
        
        console.log('\n📋 DEPLOYMENT CHECKLIST:');
        console.log('   1. Fix all critical issues above');
        console.log('   2. Run: npm run build:css');
        console.log('   3. Set environment variables in Netlify dashboard');
        console.log('   4. Test endpoints with endpoint-health-check.js');
        console.log('   5. Verify Auth0 setup with auth0-config-validator.js');
        
        const isReady = this.criticalIssues.length === 0;
        console.log(`\n${isReady ? '🎉' : '❌'} Deployment ${isReady ? 'READY' : 'NOT READY'}`);
        
        if (!isReady) {
            process.exit(1);
        }
    }
}

async function runDeploymentVerification() {
    const args = process.argv.slice(2);
    const envArg = args.find(arg => arg.startsWith('--environment='));
    const environment = envArg ? envArg.split('=')[1] : 'production';
    
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
    
    const verifier = new DeploymentVerifier(environment);
    await verifier.verify();
}

if (require.main === module) {
    runDeploymentVerification().catch(console.error);
}

module.exports = { DeploymentVerifier, runDeploymentVerification };