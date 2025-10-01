# Copilot Fix Recovery Guide

## 🚨 When Your AI Assistant Goes "Nuts" - Emergency Recovery Procedures

This guide helps you recover when an AI assistant (GitHub Copilot, ChatGPT, Claude, etc.) makes problematic changes to your codebase. Follow these steps to safely restore your project to a working state.

---

## 🔍 **Step 1: Assess the Damage**

### Quick Health Check
```bash
# Check your current git status
git status

# See what files have been modified
git diff --name-only

# Check recent commits
git log --oneline -10
```

### Environment Check
```bash
# Verify environment setup
npm run check-env

# Test if the app still works
npm run dev
```

### Common Signs of AI Assistant Problems:
- ✅ **Files missing or renamed unexpectedly**
- ✅ **Large amounts of code deleted**
- ✅ **Configuration files modified incorrectly**
- ✅ **Environment setup broken**
- ✅ **Dependencies changed without reason**
- ✅ **Tests failing that previously passed**

---

## 🛠️ **Step 2: Choose Your Recovery Strategy**

### Option A: **Soft Recovery** (Recommended First)
Use this when changes are recent and you want to preserve some work:

```bash
# See exactly what changed
git diff HEAD~1

# Reset to last known good commit (replace HASH with actual commit)
git reset --hard COMMIT_HASH

# Or revert specific files
git checkout HEAD~1 -- path/to/file.js
```

### Option B: **Selective File Recovery**
Use this when only specific files are problematic:

```bash
# Restore specific files from main branch
git checkout main -- netlify/functions/astrology-mathbrain.js
git checkout main -- index.html
git checkout main -- package.json

# Stage and commit the fixes
git add .
git commit -m "Restore critical files damaged by AI assistant"
```

### Option C: **Nuclear Option** (Complete Reset)
Use this when everything is broken beyond repair:

```bash
# DANGER: This will lose ALL uncommitted changes
git reset --hard main
git clean -fd  # Remove untracked files

# Or start completely fresh
git reset --hard origin/main
```

---

## 🔧 **Step 3: Fix Common AI Assistant Damage**

### 1. Environment Configuration Broken
```bash
# Restore environment template
cp .env.example .env

# Edit .env with your actual API key
nano .env  # Add your RAPIDAPI_KEY

# Verify setup
npm run check-env
```

### 2. Dependencies Messed Up
```bash
# Reset package.json if needed
git checkout main -- package.json

# Clean install dependencies
rm -rf node_modules package-lock.json
npm install

# Verify scripts work
npm run build:css
```

### 3. Core Files Corrupted
The most critical files to protect/restore:
- `netlify/functions/astrology-mathbrain.js` (backend logic)
- `index.html` (frontend)
- `src/raven-lite-mapper.js` (core mapping)
- `config.js` (configuration)
- `package.json` (dependencies)

```bash
# Restore all critical files at once
git checkout main -- netlify/functions/astrology-mathbrain.js
git checkout main -- index.html
git checkout main -- src/raven-lite-mapper.js
git checkout main -- config.js
git checkout main -- package.json
```

### 4. CSS/Styling Broken
```bash
# Rebuild CSS
npm run build:css

# Restore Tailwind config if needed
git checkout main -- tailwind.config.js
```

---

## 🧪 **Step 4: Verify Recovery**

### Test Basic Functionality
```bash
# Start local development server
npm run dev

# In another terminal, run tests
node test-improvements.js

# Check if core functions work
node verify-copilot-setup.js

# Test CSS build
npm run build:css
```

### Quick Smoke Test
```bash
# 1. Install dependencies
npm install

# 2. Build CSS
npm run build:css

# 3. Start dev server (should show "Server now ready on http://localhost:8888")
npm run dev

# 4. Verify copilot setup
node verify-copilot-setup.js
```

### Manual Testing Checklist
- [ ] App loads without errors at `http://localhost:8888`
- [ ] Form fields accept input
- [ ] API calls work (test with sample data)
- [ ] Error handling works properly
- [ ] CSS styling displays correctly

---

## 📋 **Step 5: Prevent Future Issues**

### 1. Create Recovery Points
```bash
# Before major AI assistance sessions, create a checkpoint
git tag "pre-ai-session-$(date +%Y%m%d)"
git push --tags
```

### 2. Use AI Assistants Safely
- ✅ **Work on feature branches, never main**
- ✅ **Make small, incremental changes**
- ✅ **Test frequently during AI sessions**
- ✅ **Read all AI suggestions before applying**
- ✅ **Understand what the AI is changing**

### 3. Set Up Git Aliases for Quick Recovery
```bash
# Add these to your ~/.gitconfig
git config --global alias.nuke-changes 'reset --hard HEAD'
git config --global alias.save-point 'tag pre-changes'
git config --global alias.back-to-main 'reset --hard main'
```

---

## 🆘 **Emergency Contacts & Escalation**

### When to Escalate
- Core functionality completely broken
- Data loss suspected
- Security concerns (API keys exposed)
- Unable to restore working state

### Escalation Path
1. **Repository Owner**: Jules (DHCross)
2. **GitHub Issues**: Create issue with `emergency` label
3. **Production**: Check Netlify dashboard for deployment status

### Information to Provide
```
Subject: Emergency: AI Assistant Damaged Codebase

1. What AI assistant were you using?
2. What task were you trying to accomplish?
3. What files were modified? (git status output)
4. What errors are you seeing?
5. Have you tried the recovery steps in this guide?
6. Are you able to start the development server?
```

---

## 🎯 **Quick Reference: Recovery Commands**

### Immediate Safety
```bash
# Stop any running processes
pkill -f netlify
pkill -f npm

# Check what's broken
git status
npm run check-env
```

### Fast Recovery
```bash
# Reset specific file
git checkout main -- filename

# Reset everything
git reset --hard main

# Clean reinstall
rm -rf node_modules && npm install
```

### Test Recovery
```bash
# Environment
npm run check-env

# Development server
npm run dev

# Core functionality
node test-improvements.js
```

---

## 📚 **Related Documentation**

For more detailed guidance, see:
- `GIT_MERGE_CONFLICT_BEST_PRACTICES.md` - Merge conflict resolution
- `MAINTENANCE_GUIDE.md` - General best practices
- `Lessons Learned for Developer.md` - AI assistant context management
- `.github/copilot-instructions.md` - Proper AI assistant usage
- `README.md` - Setup and troubleshooting

---

## 💡 **Pro Tips**

1. **Trust but Verify**: Always review AI changes before applying
2. **Baby Steps**: Make small changes and test frequently
3. **Branch Protection**: Never let AI directly modify main branch
4. **Documentation First**: Read existing docs before starting
5. **When in Doubt**: Ask for human review

**Remember**: AI assistants are powerful tools, but they need human oversight. This guide helps you stay in control and recover quickly when things go wrong.

---

*Last updated: 2025-01-21*
*For issues with this guide, contact Jules or create a GitHub issue.*