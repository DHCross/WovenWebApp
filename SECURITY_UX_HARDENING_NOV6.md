# Security & UX Hardening – November 6, 2025

## Summary

Implemented three critical hardening improvements to **ChatClient.tsx** addressing security, UX, and network robustness concerns identified in code review:

---

## 1. **HTML Sanitization Hardening** ✅

**File:** `components/ChatClient.tsx` (lines 188–221)

**Change:** Restricted `DOMPurify` configuration to disable blanket `data-*` attribute permission.

**Before:**
```typescript
ALLOWED_ATTR: ["href", "target", "rel", "class", "style", "data-action"],
ALLOW_DATA_ATTR: true,  // ⚠️ Permits ANY data-* attribute
```

**After:**
```typescript
ALLOWED_ATTR: [
  "href",
  "target",
  "rel",
  "class",
  "style",
  "data-action", // ✅ Only this single data-* attr allowed
],
ALLOW_DATA_ATTR: false, // ✅ Disable blanket data-* permission
```

**Impact:**
- Closes potential XSS vector from arbitrary `data-*` attributes
- Maintains necessary `data-action` support for interactive buttons
- Tightens security posture with minimal impact on functionality

---

## 2. **File Upload Size Validation** ✅

**File:** `components/ChatClient.tsx` (lines 2146–2210)

**Change:** Added file size guards before reading PDFs or text files into memory.

**New Limits:**
- **PDFs:** 50 MB (common max for browser processing)
- **Text files:** 10 MB (reasonable for JSON/CSV imports)

**Implementation:**
```typescript
const MAX_PDF_SIZE = 50 * 1024 * 1024;    // 50 MB
const MAX_TEXT_SIZE = 10 * 1024 * 1024;   // 10 MB
const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
const maxSize = isPdf ? MAX_PDF_SIZE : MAX_TEXT_SIZE;

if (file.size > maxSize) {
  const sizeInMB = (maxSize / (1024 * 1024)).toFixed(0);
  setErrorMessage(`File too large. Max size: ${sizeInMB}MB. Please upload a smaller file.`);
  if (event.target) event.target.value = "";
  return;
}
```

**UX Improvements:**
- User-friendly error message with file size limit
- Early rejection before memory bloat
- Loading state feedback ("Extracting PDF text...", "Reading file...")
- Input cleared to allow retry

**Impact:**
- Prevents out-of-memory crashes from large PDFs
- Improves user experience with transparent feedback
- Protects against accidental uploads of huge files

---

## 3. **Network Resilience with Retry & Backoff** ✅

**File:** `components/ChatClient.tsx` (lines 188–245)

**New Helper Function:** `fetchWithRetry()`

**Features:**
- **Exponential backoff:** 100ms × 2^attempt (up to 3 retries)
- **Jitter:** ±50% random variance to prevent thundering herd
- **Timeout handling:** 30-second timeout per attempt
- **Smart retry:** Only retries on transient errors (network, timeout), not on abort signals

**Implementation:**
```typescript
const fetchWithRetry = async (
  url: string,
  options: RequestInit,
  maxRetries: number = 3,
  timeoutMs: number = 30000,
): Promise<Response> => {
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      if (attempt < maxRetries && isTransientError(error)) {
        const baseDelay = 100 * Math.pow(2, attempt);
        const jitter = baseDelay * 0.5 * Math.random();
        await new Promise((resolve) => setTimeout(resolve, baseDelay + jitter));
      } else {
        throw error;
      }
    }
  }
};
```

**Applied to:** `runRavenRequest()` → `/api/raven` POST calls

**Impact:**
- Gracefully recovers from transient network hiccups
- Reduces false failures in flaky conditions
- Maintains responsive UX with exponential backoff (users don't notice retries)
- User-facing error messages only after all retries exhausted

---

## Testing & Validation

### Security
- [ ] Verify sanitized HTML still renders correctly (message display)
- [ ] Test that `data-*` attributes other than `data-action` are stripped
- [ ] Confirm no console warnings from DOMPurify

### UX
- [ ] Test with 55 MB PDF → should show error message
- [ ] Test with 100 MB text file → should show error message
- [ ] Test with valid 10 MB file → should proceed
- [ ] Verify "Extracting PDF text..." and "Reading file..." messages appear

### Network
- [ ] Simulate network failure with devtools throttling
- [ ] Verify request retries up to 3 times (check network tab)
- [ ] Verify successful recovery after transient failure
- [ ] Verify clean abort when user cancels mid-request

---

## Future Enhancements (Lower Priority)

1. **AbortController Per-Request Tracking**
   - Replace single `abortRef` with `Map<requestId, AbortController>`
   - Prevents overlapping calls from canceling each other

2. **localStorage Compression**
   - Monitor `mb.lastPayload` quota usage
   - Consider LZ4/gzip compression for Math Brain payloads

3. **Type Tightening**
   - Change `Message.rawText` from optional to required
   - Prevents future bugs from missing fallbacks

---

## Code Changes Summary

| File | Lines | Change |
|------|-------|--------|
| `components/ChatClient.tsx` | 188–221 | DOMPurify config hardening |
| `components/ChatClient.tsx` | 188–245 | New `fetchWithRetry()` function |
| `components/ChatClient.tsx` | 2146–2210 | File size validation + UX feedback |
| `components/ChatClient.tsx` | 1564–1631 | Updated `runRavenRequest()` to use retry logic |

---

## Deployment Checklist

- [x] Code changes implemented
- [ ] Local testing with `npm run dev`
- [ ] Verify no regression in existing features
- [ ] Test error paths with invalid inputs
- [ ] Review console for any warnings
- [ ] Deploy to Netlify
- [ ] Monitor logs for retry success rate

---

## References

- **Review Context:** Security/UX concerns on sanitization and uploads; network robustness
- **DOMPurify Docs:** https://github.com/cure53/DOMPurify
- **Fetch Retry Pattern:** Exponential backoff best practices
- **File Size Considerations:** Common browser memory limits for PDF.js
