# Copilot Instructions for WovenWebApp

## Project Overview

WovenWebApp is an astrological report generator that provides detailed natal charts, synastry analysis, and transit calculations. The application uses a specialized "Raven Calder" astrological system that emphasizes geometric precision over archetypal interpretation.

### Core Philosophy
- **FIELD → MAP → VOICE**: Raw astrological data → Structural patterns → Narrative synthesis
- **Geometry-First**: All interpretations derive from exact planetary angle math, not psychological projection
- **Falsifiable Results**: Mathematical precision over subjective interpretation

## Architecture Overview

### Technology Stack
- **Frontend**: Static HTML, JavaScript, Tailwind CSS
- **Backend**: Netlify serverless functions
- **External API**: RapidAPI Astrologer API (powered by Kerykeion)
- **Deployment**: Netlify with GitHub integration
- **Styling**: Tailwind CSS with PostCSS

### Key Components

#### Frontend (`index.html`)
- Single-page application with form-based input
- Real-time validation and error handling
- Responsive design with dark theme
- Interactive report generation and display

#### Backend (`netlify/functions/astrology-mathbrain.js`)
- Primary serverless function handling all astrological calculations
- API proxy to RapidAPI Astrologer service
- Data transformation and validation
- Error handling with detailed logging

#### Data Processing (`src/raven-lite-mapper.js`)
- Custom mapping logic for astrological aspects
- Transit-to-natal aspect processing
- Raven Calder system implementation

#### Configuration Files
- `package.json`: Build scripts and dependencies
- `tailwind.config.js`: CSS framework configuration
- `netlify.toml`: Deployment configuration
- `.env`: Environment variables (API keys, logging levels)

## Development Workflow

### Prerequisites
```bash
# Required tools
- Node.js 18.x or higher
- npm
- Netlify CLI
- RapidAPI account with Astrologer API subscription
```

### Local Development Setup
```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env
# Edit .env with your RAPIDAPI_KEY

# 3. Verify environment setup
npm run check-env

# 4. Build CSS for production
npm run build:css

# 5. Start development server
npm run dev
```

### Build Scripts
- `npm run build:css`: Compile and minify Tailwind CSS for production
- `npm run dev:tailwind`: Watch mode for CSS development
- `npm run check-env`: Verify environment configuration
- `npm run dev`: Start local development server with Netlify CLI
- `npm run start:local`: Full local development setup (check env + build CSS + start server)

### Environment Variables
- `RAPIDAPI_KEY`: **Required** - Your RapidAPI key for Astrologer API
- `LOG_LEVEL`: Optional - Controls logging verbosity (debug, info, warn, error)
- `NODE_ENV`: Optional - Environment mode (development, production)
- Transit configuration options (see `.env.example` for full list)

## Key Concepts and Terminology

### Raven Calder System
- **FIELD**: Raw astrological data (charts, transits, aspects, orbs, houses)
- **MAP**: Interpreted structural patterns (Echo Loops, house overlays, activated geometry)
- **VOICE**: Narrative synthesis layer (journal-style outputs, symbolic interpretation)
- **OSR (Outside Symbolic Range)**: Events beyond the system's interpretive scope
- **Geometry-First Diagnostic Rule**: All interpretations derive from exact planetary angles

### Application Features
- **Natal Charts**: Birth chart calculation with planetary positions and aspects
- **Synastry Analysis**: Relationship compatibility between two individuals
- **Transit Calculations**: Current planetary influences on natal charts
- **House Overlays**: How one person's planets fall in another's houses
- **Composite Aspects**: Combined chart analysis for relationships

## Common Development Patterns

### API Integration
```javascript
// All API calls go through the Netlify function
const response = await fetch('/.netlify/functions/astrology-mathbrain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestData)
});
```

### Error Handling
```javascript
// Standard error response format
{
    success: false,
    error: "Error message",
    code: "ERROR_CODE",
    errorId: "unique-error-identifier",
    details: errorObject
}
```

### Data Validation
- Use the existing validation patterns in `astrology-mathbrain.js`
- Validate dates, coordinates, and required fields before API calls
- Provide clear error messages for missing or invalid data

### Logging
```javascript
// Use consistent logging throughout
logger.info('Operation completed', { context: data });
logger.error('Operation failed', { error, context });
```

## Best Practices for AI-Assisted Development

### Code Modifications
1. **Preserve Existing Patterns**: Follow the established error handling and logging patterns
2. **Validate Against Schema**: Check changes against `openapi.json` contract
3. **Test API Integration**: Always test with the external RapidAPI service
4. **Maintain Documentation**: Update relevant `.md` files when making changes

### Common Tasks
- **Adding New Features**: Follow the FIELD → MAP → VOICE pattern
- **API Changes**: Update both frontend validation and backend processing
- **Styling Updates**: Use existing Tailwind classes and maintain dark theme
- **Error Handling**: Provide user-friendly messages while logging technical details

### Debugging Approach
1. Check environment variables and API key configuration
2. Verify form data structure matches API expectations
3. Review browser console and network tabs for errors
4. Check Netlify function logs for backend issues
5. Validate API responses against expected schema

## File Organization

### Core Files
- `index.html`: Main application interface
- `config.js`: Frontend configuration
- `netlify/functions/astrology-mathbrain.js`: Primary backend function
- `src/raven-lite-mapper.js`: Data processing logic
- `src/input.css`: Tailwind source styles

### Documentation
- `README.md`: Project overview and setup instructions
- `MAINTENANCE_GUIDE.md`: Best practices and troubleshooting
- `API_INTEGRATION_GUIDE.md`: API usage patterns
- `Lessons Learned for Developer.md`: Common issues and solutions

### Configuration
- `package.json`: Dependencies and build scripts
- `tailwind.config.js`: CSS framework settings
- `netlify.toml`: Deployment configuration
- `.env.example`: Environment variable template

## Testing and Quality Assurance

### Manual Testing Checklist
- [ ] Form validation with various input combinations
- [ ] API integration with real data
- [ ] Error handling for invalid inputs
- [ ] Responsive design across devices
- [ ] Report generation accuracy

### Common Issues
1. **Missing API Key**: Check `.env` file and Netlify environment variables
2. **CORS Errors**: Ensure requests go through Netlify functions  
3. **Date Format Issues**: Use YYYY-MM-DD format consistently
4. **Rate Limiting**: Respect API limits, implement proper batching
5. **CSS Build Failures**: Run `npm install` to ensure all dependencies are available
6. **Browserslist Warnings**: Run `npx update-browserslist-db@latest` to update browser compatibility data

## Security Considerations

### API Keys
- Never commit `.env` files to version control
- Use different keys for development and production
- Rotate keys regularly (every 90 days recommended)
- Monitor API usage for unexpected activity

### Data Handling
- All user data is processed client-side or in serverless functions
- No persistent storage of personal information
- Respect user privacy and consent principles

## Deployment

### Netlify Configuration
- Automatic deployments from GitHub main branch
- Environment variables set in Netlify dashboard
- Build command: `npm run build:css`
- Functions automatically deployed from `netlify/functions/`

### Environment Setup
1. Configure `RAPIDAPI_KEY` in Netlify environment variables
2. Verify build settings and deploy hooks
3. Test API integration in production environment
4. Monitor function logs for errors

## Troubleshooting Guide

### Common Error Patterns
- **"Error computing geometry"**: Usually indicates missing or invalid API key
- **"End date must be after start date"**: Date validation failure
- **Network errors**: Check API key and internet connectivity
- **Empty reports**: Verify API response data structure

### Debugging Steps
1. Enable debug logging (`LOG_LEVEL=debug`)
2. Check browser console for JavaScript errors
3. Verify API key configuration
4. Test with known-good sample data
5. Review Netlify function logs

## AI Assistant Guidelines

When working with this codebase:

1. **Understand the Domain**: Familiarize yourself with astrological concepts and the Raven Calder system
2. **Respect the Architecture**: Maintain the separation between frontend, backend, and external API
3. **Follow Existing Patterns**: Use established error handling, logging, and validation approaches
4. **Test Thoroughly**: Always verify changes work with real API data
5. **Document Changes**: Update relevant documentation when modifying functionality
6. **Preserve Philosophy**: Maintain the geometry-first, falsifiable approach to astrological calculation

### Recommended Reading
- `README.md`: Complete project overview
- `MAINTENANCE_GUIDE.md`: Best practices and maintenance procedures
- `Lessons Learned for Developer.md`: Common pitfalls and solutions
- `The Woven Map System, an App and seperate GPT.md`: Philosophical framework

## Contributing

### Before Making Changes
1. Review existing documentation thoroughly
2. Test the application locally with real data
3. Understand the Raven Calder system philosophy
4. Check for related issues in the changelog

### Change Process
1. Create feature branch from main
2. Make minimal, focused changes
3. Test thoroughly with various input scenarios
4. Update documentation as needed
5. Submit pull request with clear description

This project emphasizes mathematical precision, user agency, and diagnostic clarity. All development should preserve these core principles while enhancing functionality and user experience.