# AI Assistant Limitations & Troubleshooting Guide

## Overview

This document outlines common limitations when working with AI assistants (GitHub Copilot, ChatGPT, Claude, etc.) in development environments and provides solutions for typical issues.

## System Access Limitations

### Terminal & Command Execution

**What AI Assistants CAN'T Do:**
- Provide passwords for `sudo` commands
- Execute privileged operations requiring authentication
- Access system keychain or credential stores
- Modify system-level configurations
- Kill processes owned by other users

**What AI Assistants CAN Do:**
- Run non-privileged commands
- Check file permissions and ownership
- Use alternative commands that don't require sudo
- Suggest manual steps for privileged operations

### Examples

**❌ Will Get Stuck:**
```bash
sudo lsof -i -P | grep LISTEN  # Requires password input
```

**✅ Alternative Approaches:**
```bash
# Check specific ports without sudo
lsof -i :3000 -i :4000 -i :8888

# Check listening processes (user-owned only)
netstat -an | grep LISTEN

# Check if specific port is in use
nc -z localhost 4000 && echo "Port in use" || echo "Port free"
```

## File System & Context Issues

### Context Sync Problems

**Issue:** AI assistant says "can't find file" that clearly exists

**Causes:**
- Web-based assistants have limited file context
- IDE extensions may have stale context
- File was recently created/moved

**Solutions:**
```bash
# For VS Code Copilot - refresh context
# Command Palette → "Developer: Reload Window"

# For web assistants - re-upload changed files
# Or provide file contents directly in chat

# Verify file exists
ls -la path/to/file
```

### Permission Issues

**Common Scenarios:**
- Files created by different users/processes
- Node modules with restrictive permissions
- Build artifacts owned by system processes

**Solutions:**
```bash
# Check file ownership
ls -la problematic-file

# Fix ownership (if needed)
sudo chown $USER:$USER problematic-file

# Fix directory permissions
chmod 755 directory-name
```

## Development Server Issues

### Port Conflicts & Stuck Processes

**Symptoms:**
- "Port already in use" errors
- Server starts but doesn't respond
- Multiple instances running simultaneously

**Diagnosis:**
```bash
# Check what's using common dev ports
lsof -i :3000 -i :4000 -i :8000 -i :8888

# Find Node.js processes
ps aux | grep node

# Check network connections
netstat -tulpn | grep LISTEN
```

**Solutions:**
```bash
# Kill specific port usage
kill $(lsof -t -i:4000)

# Kill all node processes (nuclear option)
pkill -f node

# Start with different port
npx next dev -p 3001
```

### Environment Variable Issues

**Common Problems:**
- AI can't access actual env var values (security)
- Variables not loaded in development
- Mismatch between local and production

**Troubleshooting:**
```bash
# Check if variable is set (shows value)
echo $RAPIDAPI_KEY

# Check if variable exists (secure check)
[ -z "$RAPIDAPI_KEY" ] && echo "Not set" || echo "Is set"

# List all env vars
printenv | grep -i api

# Restart dev server after env changes
# (Required for most development servers)
```

## Git & Version Control

### Authentication Loops

**Issue:** Git keeps asking for credentials

**Solutions:**
```bash
# Check current remote URL
git remote -v

# Switch to SSH (recommended)
git remote set-url origin git@github.com:username/repo.git

# Configure credential helper
git config --global credential.helper store

# For GitHub, use personal access token as password
```

### Repository State Issues

**Symptoms:**
- Commands hang indefinitely
- "Repository locked" errors
- Merge conflicts that won't resolve

**Emergency Recovery:**
```bash
# Check for lock files
ls -la .git/*.lock

# Remove lock files (if safe)
rm -f .git/index.lock

# Repository integrity check
git fsck

# Clean up repository
git gc

# Nuclear option - re-clone
cd .. && git clone <repo-url> <new-name>
```

## Build & Deployment Issues

### Next.js Compilation Problems

**Common Issues:**
- Webpack cache corruption
- TypeScript compilation errors
- Missing dependencies

**Solutions:**
```bash
# Clear Next.js cache
rm -rf .next

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npx tsc --noEmit
```

### CSS Build Issues

**Symptoms:**
- Styles not updating
- Build process hanging
- Missing CSS output

**Solutions:**
```bash
# Manual CSS build
npm run build:css

# Check Tailwind config
npx tailwindcss --init --dry-run

# Verify input/output paths
ls -la src/input.css public/dist/
```

## API & External Service Issues

### Rate Limits & Authentication

**What AI Can't Help With:**
- Actual API key values (security)
- Real-time API status
- Account-specific quota limits

**What AI Can Help With:**
- API integration patterns
- Error handling strategies
- Alternative approaches

**Diagnostic Steps:**
```bash
# Test API endpoint manually
curl -X GET "https://api.example.com/test" \
  -H "X-RapidAPI-Key: $RAPIDAPI_KEY"

# Check environment variable format
echo ${RAPIDAPI_KEY} | wc -c  # Should show expected length

# Test local API route
curl http://localhost:4000/api/astrology-mathbrain
```

## Communication Best Practices

### When Working with AI Assistants

**Be Specific About:**
- Exact error messages (copy/paste)
- File paths and line numbers
- Steps already attempted
- System information (OS, Node version, etc.)

**Share Context:**
- Recent changes made
- Working vs. broken states
- Environment (dev vs. production)
- Time when issue started

**Avoid Assumptions:**
- Don't assume AI can see current file state
- Provide relevant code snippets
- Mention any recent updates or installations

### Escalation Path

**When AI Gets Stuck:**
1. Try alternative commands (non-privileged)
2. Manual intervention for system operations
3. Check documentation for project-specific solutions
4. Restart development environment
5. Consult human developer or team

## Emergency Recovery Procedures

### Complete Development Environment Reset

```bash
# 1. Stop all processes
pkill -f "node\|netlify\|npm"

# 2. Clear caches
rm -rf .next node_modules .netlify
npm cache clean --force

# 3. Reinstall dependencies
npm install

# 4. Rebuild CSS
npm run build:css

# 5. Restart development
npm run dev
```

### Repository Recovery

```bash
# 1. Backup current work
cp -r . ../backup-$(date +%Y%m%d)

# 2. Check Git status
git status
git log --oneline -5

# 3. If corrupted, re-clone
git remote get-url origin  # Save this
cd .. && git clone <saved-url> fresh-copy
```

## Prevention Strategies

### Regular Maintenance

- Restart development servers daily
- Clear caches weekly
- Update dependencies monthly
- Monitor API usage and limits

### Environment Hygiene

- Use `.env.example` templates
- Document required environment variables
- Separate development and production keys
- Regular credential rotation

### Development Workflow

- Commit frequently with small changes
- Test changes immediately
- Keep development and production environments similar
- Document any manual configuration steps

## Additional Resources

- Project-specific troubleshooting: `README.md`
- Recovery procedures: `copilot_fix_recovery.md`
- Maintenance guidelines: `MAINTENANCE_GUIDE.md`
- Change history: `CHANGELOG.md`

---

*Remember: AI assistants are powerful tools but have inherent limitations. Understanding these boundaries helps maintain productive development workflows and prevents getting stuck on system-level operations.*