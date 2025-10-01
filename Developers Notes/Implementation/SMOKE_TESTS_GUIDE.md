# Smoke Tests and Debugging Guide for WovenWebApp

This document provides comprehensive guidance on using the smoke test suite and debugging utilities for WovenWebApp, addressing the key lessons from OAuth and deployment integrations as outlined in the requirements.

## Overview

The smoke test suite validates:
- **Environment Configuration**: API keys, Auth0 setup, logging levels
- **Deployment Configuration**: Netlify settings, function wiring, redirects
- **Security Configuration**: Secret management, CSP headers, URL whitelisting
- **Performance Settings**: CSS compilation, rate limiting, batch processing
- **Endpoint Health**: Function accessibility, API connectivity

## Quick Start

### Running All Smoke Tests
```bash
# Run comprehensive test suite
npm run test:all

# Run for specific environment
npm run test:production
npm run test:deployment --environment=staging

# Skip network tests (useful for CI)
npm run test:ci
```

### Individual Test Suites
```bash
# Basic environment validation
npm run test:smoke

# Endpoint health checks
npm run test:endpoints

# Auth0 configuration validation
npm run test:auth0

# Deployment readiness verification
npm run test:deployment
```

## Test Suite Components

### 1. Environment Smoke Tests (`test/smoke-tests.js`)

**Purpose**: Validates basic environment setup and configuration

**Key Checks**:
- ✅ `.env` file exists and configured
- ✅ `RAPIDAPI_KEY` present and not default value
- ✅ Log levels and transit settings valid
- ✅ Required dependencies available
- ✅ Core files and documentation exist

**Common Issues**:
- `RAPIDAPI_KEY still set to default value`: Update `.env` with real API key
- `CSS output directory not found`: Run `npm run build:css`
- `Function dependencies missing`: Check `src/` directory structure

**Usage**:
```bash
node test/smoke-tests.js
```

### 2. Endpoint Health Check (`test/endpoint-health-check.js`)

**Purpose**: Tests all API endpoints and function accessibility

**Key Checks**:
- 🏥 Static file serving (HTML, CSS, JS)
- 🏥 API endpoint routing (`/api/*` to `/.netlify/functions/*`)
- 🏥 Function handler responses (405 for GET, proper POST handling)
- 🏥 Auth0 configuration endpoint

**Common Issues**:
- `404 on /api/astrology-mathbrain`: Check `netlify.toml` redirects
- `Function not accessible`: Verify `netlify/functions/` directory structure
- `Timeout errors`: Check if `netlify dev` is running locally

**Usage**:
```bash
# Test local development server
node test/endpoint-health-check.js --local

# Test production deployment
node test/endpoint-health-check.js --production --url=https://your-site.netlify.app
```

### 3. Auth0 Configuration Validator (`test/auth0-config-validator.js`)

**Purpose**: Validates Auth0 setup and URL whitelisting

**Key Checks**:
- 🔐 Environment variables format and values
- 🔐 Domain accessibility and issuer validation
- 🔐 Audience configuration (avoid Management API)
- 🔐 URL whitelisting guidance and common mistakes
- 🔐 Security settings and CSP configuration

**Common Issues Fixed**:
- `Domain includes protocol`: Remove `https://` from `AUTH0_DOMAIN`
- `Using Management API audience`: Use custom API identifier
- `Domain not accessible`: Check tenant spelling and status
- `Invalid URI errors`: Review callback/logout URL formatting

**URL Whitelisting Requirements**:
```
Callback URLs:
- http://localhost:8888
- http://localhost:8888/
- https://your-site.netlify.app
- https://your-site.netlify.app/

Logout URLs:
- http://localhost:8888
- http://localhost:8888/
- https://your-site.netlify.app
- https://your-site.netlify.app/

Web Origins:
- http://localhost:8888
- https://your-site.netlify.app
```

**Usage**:
```bash
node test/auth0-config-validator.js
```

### 4. Deployment Verification (`test/deployment-verification.js`)

**Purpose**: Comprehensive deployment readiness check

**Key Checks**:
- 🚀 File structure and required assets
- 🚀 Build configuration and scripts
- 🚀 Netlify configuration (`netlify.toml`)
- 🚀 Environment variable security
- 🚀 Function deployment readiness
- 🚀 Performance and security settings

**Critical Issues That Block Deployment**:
- Missing `netlify.toml` or incorrect function directory
- CSS not compiled (`dist/output.css` missing)
- Functions not loadable or missing handler
- Secrets hardcoded in client-side files
- Required environment variables missing

**Usage**:
```bash
# Development environment check
node test/deployment-verification.js --environment=development

# Production readiness
node test/deployment-verification.js --environment=production
```

### 5. Master Test Runner (`test/run-all-smoke-tests.js`)

**Purpose**: Orchestrates all test suites with comprehensive reporting

**Features**:
- 📊 Sequential test execution with detailed reporting
- 📊 Environment-specific configuration
- 📊 Network test optional skipping
- 📊 Performance timing and summary statistics
- 📊 Critical issue identification and prioritization

**Usage**:
```bash
# Complete test suite
node test/run-all-smoke-tests.js

# Environment-specific
node test/run-all-smoke-tests.js --environment=production

# Skip network tests (CI-friendly)
node test/run-all-smoke-tests.js --skip-network

# Custom base URL
node test/run-all-smoke-tests.js --url=https://staging.netlify.app
```

## Debug Dashboard

### Interactive Debugging (`debug-dashboard.html`)

Access via: `http://localhost:8888/debug-dashboard.html`

**Features**:
- 🔧 Real-time environment status monitoring
- 🔧 Interactive endpoint testing
- 🔧 Build status verification
- 🔧 Network connectivity diagnostics
- 🔧 Console output with downloadable logs
- 🔧 Quick actions for common tasks

**Usage Scenarios**:
1. **Development Setup**: Check environment and endpoint health
2. **Deployment Debugging**: Verify production configuration
3. **Issue Diagnosis**: Interactive testing with detailed logging
4. **Performance Monitoring**: Response times and connectivity status

## Common Issues and Solutions

### Environment Configuration

**Issue**: `RAPIDAPI_KEY still set to default value`
**Solution**: 
1. Copy `.env.example` to `.env`
2. Replace `your_rapidapi_key_here` with actual RapidAPI key
3. Restart development server

**Issue**: `AUTH0_DOMAIN contains malformed characters`
**Solution**:
- ❌ Wrong: `https://your-tenant.us.auth0.com`
- ✅ Correct: `your-tenant.us.auth0.com`

### Deployment Configuration

**Issue**: `Function deployment failed: 404`
**Solution**:
1. Check `netlify.toml` has `functions = "netlify/functions"`
2. Verify redirect routes are configured
3. Ensure function files exist in correct directory

**Issue**: `CSS not found: run npm run build:css`
**Solution**:
```bash
npm run build:css
# Verify dist/output.css exists
```

### Auth0 Integration

**Issue**: `Invalid URI error in Auth0`
**Solution**:
1. Check exact URL formatting in Auth0 Dashboard
2. Ensure no trailing spaces or incorrect protocols
3. Verify development vs production URLs match

**Issue**: `Audience/tenant alignment mismatch`
**Solution**:
1. Use custom API identifier, not Management API
2. Verify `AUTH0_AUDIENCE` matches API settings exactly
3. Check tenant domain spelling

### Network and API Issues

**Issue**: `Authentication failed calling RapidAPI`
**Solution**:
1. Verify `RAPIDAPI_KEY` is valid and active
2. Check RapidAPI subscription status
3. Monitor usage limits and quotas

**Issue**: `Function timeout or 504 errors`
**Solution**:
1. Reduce `TRANSIT_BATCH_SIZE` (try 3-5)
2. Increase `TRANSIT_BATCH_DELAY` (try 1000ms)
3. Check API rate limits

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run Smoke Tests
  run: |
    npm install
    npm run build:css
    npm run test:ci
  env:
    RAPIDAPI_KEY: ${{ secrets.RAPIDAPI_KEY }}
    LOG_LEVEL: warn
```

### Netlify Build Hooks
```toml
[build]
  command = "npm run build:css && npm run test:deployment"
  
[build.environment]
  NODE_ENV = "production"
  LOG_LEVEL = "warn"
```

## Performance and Monitoring

### Key Metrics Tracked
- 📈 Test execution time (target: < 60s for full suite)
- 📈 Endpoint response times (target: < 2s)
- 📈 CSS file size (target: < 100KB)
- 📈 Function cold start performance

### Production Monitoring Setup
```bash
# Set optimal production settings
export LOG_LEVEL=warn
export TRANSIT_BATCH_SIZE=3
export TRANSIT_BATCH_DELAY=1000
export API_RATE_LIMIT=50
```

## Troubleshooting Checklist

### Before Deployment
- [ ] All smoke tests passing
- [ ] CSS compiled and optimized
- [ ] Environment variables configured in Netlify
- [ ] Auth0 URLs whitelisted correctly
- [ ] API keys rotated and tested
- [ ] Security headers configured
- [ ] Function endpoints responding correctly

### Production Issues
- [ ] Run deployment verification
- [ ] Check Netlify function logs
- [ ] Verify environment variable injection
- [ ] Test Auth0 configuration endpoint
- [ ] Monitor API usage and rate limits
- [ ] Validate CSP headers and CORS

### Development Issues
- [ ] Ensure `netlify dev` is running
- [ ] Check `.env` file configuration
- [ ] Verify CSS build process
- [ ] Test function loading and dependencies
- [ ] Validate local Auth0 callback URLs

## Advanced Usage

### Custom Test Configuration
```javascript
// Custom test runner configuration
const runner = new SmokeTestRunner({
    environment: 'staging',
    skipNetwork: false,
    baseUrl: 'https://staging-site.netlify.app',
    timeout: 15000
});
```

### Extending Test Suites
```javascript
// Add custom tests to existing suites
runner.test('Custom API Integration', async () => {
    // Your custom test logic
}, { category: 'custom', critical: true });
```

### Integration with Monitoring
```javascript
// Export results for monitoring systems
const results = await runAllSmokeTests();
await sendToMonitoring(results);
```

This comprehensive smoke test suite addresses all the key challenges outlined in the issue requirements, providing robust validation for OAuth integrations, deployment configurations, and production readiness.