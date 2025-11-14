# Development Guide for Raven Calder

This document outlines the development workflow and best practices for working on the Raven Calder Astrological Analysis System without affecting the production site.

## 🏗️ Development Environment Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Git
- Netlify CLI (optional)

### Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd WovenWebApp

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local.development
# Edit .env.local.development with your local settings
```

## 🔄 Development Workflow

### Running Locally

```bash
# Start development server on port 3000
npm run dev

# Or specify a custom port (recommended to avoid conflicts)
PORT=8888 npm run dev
```

### Environment Variables

Create/update `.env.local.development` with these recommended settings:

```env
# Local development overrides
NEXT_PUBLIC_USE_LOCAL_AUTH=true
NEXT_PUBLIC_DEV_MODE=true
NEXT_PUBLIC_AUTH_ENABLED=false
NEXT_PUBLIC_MOCK_USER='{"name":"Local Dev User","email":"dev@local"}'

# API Configuration
MB_MOCK=true  # Set to false to test with real API
RAPIDAPI_KEY=your_key_here  # Only needed if MB_MOCK=false
NODE_ENV=development
```

## 🛡️ Isolating Development from Production

### Key Safety Measures
1. **Environment Variables**
   - Development uses `.env.local.development`
   - Production uses Netlify environment variables
   - `.env.local` is for local overrides (gitignored)

2. **Mock Mode**
   - Enabled by default in development
   - Set `MB_MOCK=false` to test with real API
   - Mock mode is automatically disabled in production builds

3. **Port Configuration**
   - Default: 3000
   - Recommended: Use port 8888 to avoid conflicts
   - Configured via `PORT` environment variable

### Testing Production Builds Locally

```bash
# Build for production
npm run build

# Start production server
npm run start
```

## 🚀 Deployment to Production

### Netlify Deployment
- Automatic deployments from `main` branch
- Production environment variables are managed in Netlify
- Preview deployments for PRs

### Manual Deployment
```bash
# Build for production
npm run build

# Deploy to Netlify
netlify deploy --prod
```

## 🔍 Debugging

### Common Issues
1. **Port in Use**
   ```bash
   # Find and kill process using port 3000
   lsof -i :3000
   kill -9 <PID>
   ```

2. **Environment Variables Not Loading**
   - Ensure file is named `.env.local.development`
   - Restart development server after changes
   - Check for typos in variable names

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- path/to/test/file.test.js
```

## 📝 Best Practices

1. **Environment Variables**
   - Never commit sensitive data
   - Use `.env.example` as a template
   - Document new variables in README.md

2. **Git Workflow**
   - Create feature branches from `main`
   - Open PRs for review
   - Squash and merge when approved

3. **Local Development**
   - Use mock data during development
   - Test with real API before pushing changes
   - Document any required environment variables

## 🔗 Related Resources

- [Netlify Docs](https://docs.netlify.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [RapidAPI Astrologer API](https://rapidapi.com/astrologer/api/astrologer)
