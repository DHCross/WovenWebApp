# GitHub Copilot Instructions for WovenWebApp

## Project Overview

WovenWebApp is a web-based astrological chart analysis application that generates detailed reports for individuals and relationships. It consists of a static HTML/JavaScript frontend with Tailwind CSS and a Netlify serverless function backend that interfaces with the RapidAPI Astrologer API.

### Core Architecture
- **Frontend**: Plain HTML, JavaScript, Tailwind CSS
- **Backend**: Single Netlify serverless function (`astrology-mathbrain.js`)
- **External API**: [Astrologer API on RapidAPI](https://rapidapi.com/tg4-solutions-tg4-solutions-default/api/astrologer)
- **Deployment**: Netlify with environment variables for API keys

## Essential Documentation

Before making any changes, **always** review these key documents:

1. **[README.md](../README.md)** - Setup instructions, API integration details, troubleshooting
2. **[MAINTENANCE_GUIDE.md](../MAINTENANCE_GUIDE.md)** - Best practices, error handling, file organization
3. **[CHANGELOG.md](../CHANGELOG.md)** - Complete change history with AI assistant collaboration notes
4. **[Lessons Learned for Developer.md](../Lessons%20Learned%20for%20Developer.md)** - Critical insights about AI assistant context and IDE integration
5. **[MATH_BRAIN_COMPLIANCE.md](../MATH_BRAIN_COMPLIANCE.md)** - Technical compliance requirements
6. **[API_INTEGRATION_GUIDE.md](../API_INTEGRATION_GUIDE.md)** - API integration specifications

## Development Workflow Guidelines

### 1. Environment Setup
```bash
# Always check environment first
npm run check-env

# For local development
npm run dev

# For production CSS build
npm run build:css
```

### 2. Code Changes Protocol

**Before Making Changes:**
- Review the CHANGELOG.md for recent updates and known issues
- Check MAINTENANCE_GUIDE.md for relevant best practices
- Verify API key configuration in .env.example
- Run `netlify dev` to test the current state

**When Making Changes:**
- Make minimal, surgical modifications
- Test changes locally with `netlify dev`
- Update relevant documentation if the change affects setup or usage
- Follow the existing code patterns and styling

### 3. Commit Message Standards

Use descriptive commit messages following the existing pattern in CHANGELOG.md:

```
[YYYY-MM-DD] TYPE: Brief description

Types: FIX, FEATURE, BREAK, CHANGE, UPDATE, CRITICAL FIX
```

Examples:
- `[2025-01-21] FIX: Resolve API validation error for invalid coordinates`
- `[2025-01-21] FEATURE: Add composite transit support`
- `[2025-01-21] UPDATE: Enhance error messages for better debugging`

### 4. Testing & Verification

**Required Testing Steps:**
1. **Local Function Testing**: Use `netlify dev` to test serverless functions
2. **API Integration**: Verify all API endpoints work with test data
3. **Error Handling**: Test with invalid inputs to verify error messages
4. **Environment Variables**: Ensure both development and production configs work
5. **CSS Build**: Run `npm run build:css` and verify styling

**Test Data Sources:**
- Use existing test files: `test-improvements.js`, `test-coords.js`
- Reference `FORM_DATA_EXAMPLE.md` for valid input formats
- Check `debug-api.html` and `debug-test.html` for debugging tools

### 5. Error Handling Best Practices

**From MAINTENANCE_GUIDE.md:**
- Always use environment variables for secrets (never commit API keys)
- Provide clear, user-friendly error messages
- Log detailed error information for debugging
- Validate all input data before API calls
- Handle network failures gracefully

**Common Issues & Solutions:**
- **"Server misconfiguration"**: Check RAPIDAPI_KEY environment variable
- **"Port already in use"**: Stop existing netlify dev processes
- **API errors**: Verify API key and request format
- **Styling issues**: Run `npm run build:css`

## AI Assistant Context Management

**Critical Insight from "Lessons Learned for Developer.md":**

Different AI assistant interfaces have different context views:
- **IDE Copilot**: Has live file system access, can be refreshed
- **Web Copilot**: Limited to uploaded/attached files, requires manual context updates

**Best Practices:**
- If an AI reports missing files that exist, it's a context sync issue
- Use VS Code for full-context AI assistance when possible
- Re-upload files to web interfaces after local changes
- Provide clear file paths when referencing code

## File Organization & Key Locations

### Core Application Files
- `index.html` - Main application UI and frontend logic
- `netlify/functions/astrology-mathbrain.js` - Serverless function
- `src/input.css` - Tailwind CSS source
- `dist/output.css` - Built CSS (auto-generated)

### Configuration Files
- `.env.example` - Environment variable template
- `netlify.toml` - Netlify configuration
- `package.json` - Dependencies and scripts
- `tailwind.config.js` - Tailwind CSS configuration

### Documentation (Always Keep Updated)
- `README.md` - Primary documentation
- `MAINTENANCE_GUIDE.md` - Best practices guide
- `CHANGELOG.md` - Change history
- All other `.md` files contain important context

## Branch Protection & Merge Guidelines

### Agent Permissions
- AI agents should work on feature branches
- Main branch requires human review before merging
- Assign Jules or repository owner for final verification
- Use clear branch names: `feature/description` or `fix/issue-number`

### Conflict Resolution
1. **Manual Review Required**: For conflicts in core files (`index.html`, `astrology-mathbrain.js`)
2. **Documentation Conflicts**: Merge both perspectives with clear attribution
3. **Configuration Conflicts**: Always defer to production-tested configurations
4. **Use Established Patterns**: Follow existing code style and error handling patterns

### Merge Checklist
- [ ] All tests pass locally (`netlify dev` works)
- [ ] No API keys or secrets committed
- [ ] CHANGELOG.md updated with changes
- [ ] Documentation updated if needed
- [ ] CSS built for production if styles changed (`npm run build:css`)
- [ ] Human reviewer assigned

## Continuous Improvement

### Documentation Updates
- Update this file when development patterns change
- Add new lessons to "Lessons Learned for Developer.md"
- Keep MAINTENANCE_GUIDE.md current with new best practices
- Document any new edge cases or solutions

### Code Quality Standards
- Follow existing error handling patterns
- Use descriptive variable names matching current codebase
- Maintain consistency with established file organization
- Preserve the FIELD → MAP → VOICE architectural principles

## Emergency Contacts & Escalation

**For Critical Issues:**
- Repository Owner: Jules (DHCross)
- Production Deployment: Netlify dashboard
- API Issues: Check RapidAPI status and key validity
- Build Issues: Verify Node.js version and dependencies

**Escalation Triggers:**
- Breaking changes to main functionality
- API integration failures
- Security concerns (exposed keys, etc.)
- Major architectural changes

---

## Quick Reference Commands

```bash
# Environment check
npm run check-env

# Local development
npm run dev

# CSS production build
npm run build:css

# Test environment variables
echo $RAPIDAPI_KEY

# Kill stuck processes (if port in use)
pkill -f netlify
```

**Remember**: Always review existing documentation before making changes, test thoroughly with `netlify dev`, and maintain the high documentation standards established in this repository.