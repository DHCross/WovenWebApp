# Deployment & Cache Troubleshooting Guide

## 🚨 **Problem: Code Changes Not Appearing After Restart**

If you've made code changes but they're not showing up in the app after restarting the server, you have a **cache problem**.

---

## ✅ **Solution: Nuclear Cache Clear**

### **Step-by-Step Instructions:**

```bash
# 1. Stop the development server
# Press Ctrl+C in the terminal running npm run dev

# 2. Delete Next.js cache
rm -rf .next

# 3. Delete node modules cache
rm -rf node_modules/.cache

# 4. Restart the server
npm run dev

# 5. Hard refresh your browser (CRITICAL STEP)
# Mac: Cmd + Shift + R
# Windows/Linux: Ctrl + Shift + R
```

### **Advanced Browser Cache Clear:**

If hard refresh doesn't work:

1. **Chrome/Edge:** 
   - Open DevTools (F12)
   - Right-click the refresh button
   - Select "Empty Cache and Hard Reload"

2. **Firefox:**
   - Open DevTools (F12)
   - Network tab → Click gear icon → "Disable Cache"
   - Reload page

3. **Safari:**
   - Develop menu → "Empty Caches"
   - Then reload page

---

## 🔍 **When Do You Need This?**

### **Server-Side Changes (Backend):**
If you modify files in:
- `lib/server/**` (astrology-mathbrain.js, etc.)
- `app/api/**` (API routes)

**Solution:** Server restart usually enough, but `.next` cache clear helps

### **Client-Side Changes (Frontend):**
If you modify files in:
- `app/**/hooks/**` (useChartExport.ts, etc.)
- `components/**`
- Any React component

**Solution:** MUST clear both `.next` AND browser cache

---

## 📂 **Cache Locations**

### **Next.js Build Cache:**
```
.next/
  cache/
  static/chunks/
  server/chunks/
```
**Delete:** `rm -rf .next`

### **Node Modules Cache:**
```
node_modules/.cache/
```
**Delete:** `rm -rf node_modules/.cache`

### **Browser Cache:**
- Chrome: `~/Library/Application Support/Google/Chrome/Default/Cache/` (Mac)
- Firefox: `~/Library/Application Support/Firefox/Profiles/*/cache2/` (Mac)
- **Delete:** Use browser's cache clear feature (safer)

---

## 🐛 **Common Symptoms**

### **Symptom 1: Export Still Shows Old Data**
**Example:** `person_a: null` in Weather_Log JSON even after fixing code

**Cause:** Browser cached the old JavaScript bundle

**Fix:** 
1. `rm -rf .next`
2. `npm run dev`
3. **Hard refresh browser** (Cmd+Shift+R)

### **Symptom 2: Backend Changes Not Working**
**Example:** Backend logs show old behavior

**Cause:** Next.js cached the server compilation

**Fix:**
1. `rm -rf .next`
2. Restart server

### **Symptom 3: Hot Module Replacement (HMR) Failed**
**Example:** File saved, terminal shows "compiled successfully", but browser doesn't update

**Cause:** HMR sometimes skips certain file types (hooks, utilities)

**Fix:**
1. Hard refresh browser
2. If that fails, restart server + hard refresh

---

## 🚀 **Production Deployment**

When deploying to production, Next.js automatically:
1. Clears the build cache
2. Rebuilds everything from scratch
3. Generates fresh static/optimized bundles

**No cache issues in production builds!**

The cache problem only affects local development.

---

## 📝 **Quick Reference**

| Problem | Quick Fix |
|---------|-----------|
| Frontend hook changes not appearing | `rm -rf .next && npm run dev` + hard refresh |
| Backend logic changes not working | `rm -rf .next && npm run dev` |
| Export still shows old format | Clear `.next` + hard refresh browser |
| Page shows stale UI | Hard refresh browser (Cmd+Shift+R) |
| Completely stuck | Nuclear option: delete `.next`, `node_modules/.cache`, restart, hard refresh |

---

## ⚠️ **Important Notes**

### **Don't Delete `node_modules/`**
- Only delete `node_modules/.cache/`
- Never delete `node_modules/` itself (requires full `npm install`)

### **HMR vs Full Restart**
- **HMR (Hot Module Replacement):** Fast but unreliable for hooks/utilities
- **Full Restart:** Slower but guaranteed to pick up all changes
- **Rule of thumb:** If HMR doesn't work after 2 saves, restart server

### **Browser DevTools**
Keep DevTools open with "Disable cache" enabled during development:
- Chrome: DevTools → Network tab → ☑️ "Disable cache"
- This prevents most client-side cache issues

---

## 🎯 **Best Practice Workflow**

```bash
# 1. Make code changes
# (edit files in your IDE)

# 2. Check if HMR worked
# Look for "compiled successfully" in terminal

# 3. If browser doesn't update:
# Hard refresh (Cmd+Shift+R)

# 4. If still not working:
# Stop server, clear cache, restart
rm -rf .next
npm run dev

# 5. If STILL not working:
# Nuclear option
rm -rf .next
rm -rf node_modules/.cache
npm run dev
# Then hard refresh browser
```

---

**Last Updated:** October 12, 2025  
**Version:** Next.js 14.x
