/**
 * WovenWebApp Geometry Mode Consolidation Validation
 * Checks that Geometry UI mode is gone but content remains embedded
 * Copy/paste into browser console or run with Node.js
 */

(function validateConsolidation() {
    const errors = [];
    const warnings = [];
    
    console.log('🔍 Validating Geometry mode consolidation...');
    
    // Check if running in browser or Node.js
    const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
    
    if (!isBrowser) {
        console.warn('⚠️ Running outside browser - DOM checks skipped');
        return { errors: ['Run in browser console for full validation'], warnings: [] };
    }
    
    // 1) No geometry mode branches in JavaScript
    const scripts = Array.from(document.querySelectorAll('script'));
    const hasGeometryMode = scripts.some(s => {
        const content = s.textContent || s.innerHTML || '';
        // Look for literal 'geometry' in mode contexts but ignore prose
        return /['"]geometry['"]/.test(content) && 
               !/geometry.*skeleton|skeleton.*geometry/i.test(content); // Allow skeleton refs
    });
    
    if (hasGeometryMode) {
        errors.push('Found lingering "geometry" mode branch in JavaScript');
    }
    
    // 2) Geometry skeleton anchor exists
    const geometryAnchor = document.querySelector('#geometry-skeleton, [id="geometry-skeleton"]');
    if (!geometryAnchor) {
        errors.push('Missing #geometry-skeleton anchor');
    } else {
        console.log('✅ Geometry skeleton anchor found');
    }
    
    // 3) Header valence clamping check
    const bodyText = document.body.textContent || document.body.innerText || '';
    const execSummaryMatch = bodyText.match(/Valence:\s*([🌑🌞⚖🌪⚔🌊🌫🌋🕰🧩⬇️🌱✨💎🔥🦋🧘🌈]*)\s*(-?\d+(?:\.\d+)?)/);
    if (execSummaryMatch) {
        const valence = parseFloat(execSummaryMatch[2]);
        if (valence < -5 || valence > 5) {
            errors.push(`Unclamped header valence: ${valence} (should be ±5)`);
        } else {
            console.log(`✅ Header valence clamped: ${valence}`);
        }
    } else {
        warnings.push('Could not find valence in executive summary');
    }
    
    // 4) Retrograde split lines present
    const hasRetroSplit = /Transiting ℞ planets:\s*\d+/.test(bodyText) && 
                         /℞-tagged aspects:\s*\d+/.test(bodyText);
    if (!hasRetroSplit) {
        errors.push('Retrograde split lines not found');
    } else {
        console.log('✅ Retrograde split lines found');
    }
    
    // 5) Weighted influences label check
    const hasWeightedLabel = bodyText.includes('Top Weighted Influences (may exceed caps)');
    if (!hasWeightedLabel) {
        warnings.push('No "Top Weighted Influences (may exceed caps)" label found (may be OK if no wide-orb hooks)');
    } else {
        console.log('✅ Weighted influences label found');
    }
    
    // 6) Seismograph emoji legend check
    const hasEmojiLegend = /Valence emoji:\s*🌑\s*=.*🌞\s*=/.test(bodyText);
    if (!hasEmojiLegend) {
        warnings.push('Seismograph emoji legend not found (may be OK if no seismograph rendered)');
    } else {
        console.log('✅ Emoji legend found');
    }
    
    // 7) Show Wiring button functionality
    const showWiringBtn = document.getElementById('showWiringBtn');
    if (showWiringBtn) {
        console.log('✅ Show Wiring button found');
    } else {
        warnings.push('Show Wiring button not found');
    }
    
    // 8) Flash-wire CSS check
    const styles = Array.from(document.querySelectorAll('style')).map(s => s.textContent).join(' ');
    const hasFlashWire = /\.flash-wire|@keyframes flashWire/.test(styles);
    if (!hasFlashWire) {
        warnings.push('Flash-wire CSS animation not found');
    } else {
        console.log('✅ Flash-wire CSS found');
    }
    
    // 9) Deep-link normalization check (look for URL handling code)
    const hasDeepLinkCode = scripts.some(s => {
        const content = s.textContent || '';
        return /geometry.*mirror.*skeleton|URLSearchParams.*geometry/.test(content);
    });
    if (!hasDeepLinkCode) {
        warnings.push('Deep-link normalization code not found');
    } else {
        console.log('✅ Deep-link normalization code found');
    }
    
    // Summary
    const totalIssues = errors.length + warnings.length;
    
    if (errors.length === 0) {
        console.log('🎉 Geometry mode consolidation validation PASSED');
        if (warnings.length > 0) {
            console.log(`⚠️ ${warnings.length} warnings (may be expected):`);
            warnings.forEach(w => console.log(`   - ${w}`));
        }
    } else {
        console.log(`❌ Validation FAILED with ${errors.length} errors:`);
        errors.forEach(e => console.log(`   - ${e}`));
        if (warnings.length > 0) {
            console.log(`⚠️ Additional warnings:`);
            warnings.forEach(w => console.log(`   - ${w}`));
        }
    }
    
    return { errors, warnings, passed: errors.length === 0 };
})();
