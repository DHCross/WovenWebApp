// Debugging patch for index.html to add detailed logging
// Add this to the browser console to override the postMathBrain function with detailed logging

window.originalPostMathBrain = window.postMathBrain || postMathBrain;

window.postMathBrain = async function(payload, timeoutMs = 30000) {
    console.log("🔍 DEBUG postMathBrain called with:");
    console.log("- Payload keys:", Object.keys(payload || {}));
    console.log("- Timeout:", timeoutMs);
    
    const primary = WovenMapConfig.getApiEndpoint('astrologyMathBrain');
    const fallback = '/.netlify/functions/astrology-mathbrain';
    
    console.log("🔍 URLs:");
    console.log("- Primary:", primary);
    console.log("- Fallback:", fallback);
    
    const doFetch = async (url) => {
        console.log("🔍 Making request to:", url);
        const controller = new AbortController();
        const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            
            console.log("🔍 Response received:");
            console.log("- Status:", response.status);
            console.log("- Status Text:", response.statusText);
            console.log("- Headers:", Object.fromEntries(response.headers));
            console.log("- OK:", response.ok);
            
            return response;
        } finally {
            clearTimeout(timeoutHandle);
        }
    };

    let res = await doFetch(primary);
    
    if (res.status === 404) {
        console.log("🔍 Got 404, checking if HTML response...");
        const ct = (res.headers && res.headers.get && res.headers.get('content-type')) || '';
        let txt = '';
        try { txt = await res.clone().text(); } catch(_) {}
        const looksHtml404 = ct.includes('text/html') || (txt && /^<!DOCTYPE html>/i.test(txt.trim()));
        console.log("- Content-Type:", ct);
        console.log("- Response text preview:", txt.substring(0, 100));
        console.log("- Looks like HTML 404:", looksHtml404);
        
        if (looksHtml404) {
            console.warn('[API] /api route returned 404 HTML. Retrying direct function path.');
            res = await doFetch(fallback);
        }
    }
    
    console.log("🔍 Final response status:", res.status);
    return res;
};

console.log("✅ Debug patch applied to postMathBrain function");
