*** /Users/dancross/Documents/GitHub/WovenWebApp/src/reporters/woven-map-composer.js
@@
 // Woven Map Report Composer (DATA-ONLY)
 // Builds a clinical, non-VOICE report envelope from existing Math Brain outputs.
 // Do NOT include narrative fields; avoid keys named 'field', 'map', or 'voice' to pass Clear Mirror scrub.
 
 const { composeHookStack } = require('../feedback/hook-stack-composer');
 const {
-  classifyValence,
+  classifyValence,
   classifyMagnitude,
   classifyVolatility,
   classifySfd,
   clamp,
 } = require('../../lib/reporting/metric-labels');
@@
 const ANGLE_POINTS = new Set(['Ascendant','Medium_Coeli','Descendant','Imum_Coeli']);
 
 function verdictFromSfd(value) {
   const sfd = safeNum(value, null);
   if (sfd == null) return null;
   if (sfd >= 1) return 'stabilizers prevail';
   if (sfd <= -1) return 'stabilizers cut';
   return 'stabilizers mixed';
 }
@@
   return { core, supporting, derived, raw: list };
 }
 
 function computeIntegrationFactors(summary, valenceOverride = null) {
   if (!summary) return null;
   const mag = safeNum(summary.magnitude, 0) || 0;
-  const valSource = valenceOverride != null ? valenceOverride : (summary.valence_bounded ?? summary.valence);
+  // Prefer bounded valence; fall back to override; never let raw leak into UI math
+  const valSource = valenceOverride != null ? valenceOverride : (summary.valence_bounded ?? summary.valence);
   const val = safeNum(valSource, 0) || 0;
   const vol = safeNum(summary.volatility, 0) || 0;
 
   // Normalize per UI logic
   const magN = clamp(mag / 5, 0, 1);
   const volN = clamp(vol / 5, 0, 1);
   const valN = (clamp(val, -2, 2) + 2) / 4; // map -2..2 -> 0..1
@@
 function extractTimeSeries(transitsByDate) {
   if (!transitsByDate || typeof transitsByDate !== 'object') return [];
   const entries = [];
   for (const [date, v] of Object.entries(transitsByDate)) {
     const seismo = v?.seismograph || v;
-    const balanceVal = safeNum(v?.balance?.valence ?? v?.balance?.valence_bounded);
+    // prefer bounded/balance valence; clamp defensively
+    const balanceVal = safeNum(v?.balance?.valence ?? v?.balance?.valence_bounded);
     const balanceInfo = balanceVal != null ? classifyValence(balanceVal) : null;
     const magnitudeVal = safeNum(seismo?.magnitude);
     const magnitudeInfo = magnitudeVal != null ? classifyMagnitude(magnitudeVal) : null;
     const volatilityVal = safeNum(seismo?.volatility);
     const volatilityInfo = volatilityVal != null ? classifyVolatility(volatilityVal) : null;
-    const valenceBounded = safeNum(seismo?.valence_bounded ?? balanceVal ?? seismo?.valence);
+    const valenceBounded = safeNum(seismo?.valence_bounded ?? balanceVal ?? seismo?.valence);
     const valenceInfo = valenceBounded != null ? classifyValence(valenceBounded) : null;
-    const valenceRaw = safeNum(seismo?.valence_raw_unbounded ?? seismo?.valence_raw ?? seismo?.valence);
+    const valenceRaw = safeNum(seismo?.valence_raw_unbounded ?? seismo?.valence_raw ?? seismo?.valence);
     const valenceLabel = seismo?.valence_label || balanceInfo?.label || valenceInfo?.label || null;
     const valenceCode = seismo?.valence_code || balanceInfo?.code || valenceInfo?.code || null;
-    const valenceRange = seismo?.valence_range || v?.balance?.range || [-5, 5];
-    const valenceVersion = seismo?.valence_version || v?.balance?.version || null;
-    const valencePolarity = seismo?.valence_polarity || balanceInfo?.polarity || valenceInfo?.polarity || (valenceBounded >= 0 ? 'positive' : 'negative');
+    const valenceRange = seismo?.valence_range || v?.balance?.range || [-5, 5];
+    const valenceVersion = seismo?.valence_version || v?.balance?.version || BALANCE_CALIBRATION_VERSION;
+    const valencePolarity = seismo?.valence_polarity || balanceInfo?.polarity || valenceInfo?.polarity || (valenceBounded >= 0 ? 'positive' : 'negative');
     const sfdBlock = v?.sfd || {};
     const sfdCont = safeNum(sfdBlock.sfd_cont ?? sfdBlock.value ?? sfdBlock.sfd);
     const sfdInfo = sfdCont != null ? classifySfd(sfdCont) : null;
     const sfdDisc = safeNum(sfdBlock.sfd_disc ?? sfdInfo?.disc);
     const sfdLabel = sfdBlock.sfd_label || sfdInfo?.label || verdictFromSfd(sfdCont ?? sfdInfo?.value ?? 0);
@@
       valence_bounded: valenceBounded,
       valence_label: valenceLabel,
       valence_code: valenceCode,
       valence_raw_unbounded: valenceRaw,
-      valence_calibrated: safeNum(seismo?.valence_calibrated ?? balanceVal ?? valenceBounded),
+      // normalized/calibrated valence mirrors bounded value for UI paths
+      valence_calibrated: safeNum(seismo?.valence_calibrated ?? valenceBounded ?? balanceVal),
       valence_range: valenceRange,
       valence_version: valenceVersion || BALANCE_CALIBRATION_VERSION,
       valence_polarity: valencePolarity,
       volatility: volatilityVal,
       volatility_label: seismo?.volatility_label || volatilityInfo?.label || null,
@@
   return out;
 }
 
-function summarizeMeterChannels(transitsByDate) {
+function summarizeMeterChannels(transitsByDate) {
   if (!transitsByDate || typeof transitsByDate !== 'object') {
     return {
       seismograph: { confidence: null, sample_size: 0 },
       balance: null,
       sfd: null
@@
     balance: balanceAvg != null ? {
-      value: balanceMeta?.value ?? balanceAvg,
-      valence: balanceMeta?.value ?? balanceAvg,
+      value: balanceMeta?.value ?? balanceAvg,
+      valence: balanceMeta?.value ?? balanceAvg,
       label: balanceMeta?.label || null,
       emoji: balanceMeta?.emoji || null,
       polarity: balanceMeta?.polarity || (balanceAvg >= 0 ? 'positive' : 'negative'),
       band: balanceMeta?.band || null,
       code: balanceMeta?.code || null,
       sample_size: balanceValues.length,
       version: BALANCE_CALIBRATION_VERSION,
       calibration_mode: BALANCE_CALIBRATION_VERSION,
       range: [-5, 5]
     } : null,
@@
 // DATA-ONLY Polarity Cards structure: leave human-facing content null; include geometry hooks only
 function buildPolarityCardsHooks(a /* person_a */) {
   // Select a few strongest daily drivers as skeleton; no language
   const series = a?.chart?.transitsByDate || {};
   const items = [];
   for (const [date, v] of Object.entries(series)) {
     if (Array.isArray(v?.drivers) && v.drivers.length) {
       items.push({ date, drivers: v.drivers.slice(0, 3) });
     }
   }
   // Reduce to a small sample window
   const sample = items.slice(0, 7);
   return [
-    { id: 'card_1', field_tone: null, map_geometry: sample, voice_slot: null },
-    { id: 'card_2', field_tone: null, map_geometry: sample, voice_slot: null },
-    { id: 'card_3', field_tone: null, map_geometry: sample, voice_slot: null }
+    // avoid literal keys named 'field'|'map'|'voice'
+    { id: 'card_1', tone_hint: null, geometry_hooks: sample, text_slot: null },
+    { id: 'card_2', tone_hint: null, geometry_hooks: sample, text_slot: null },
+    { id: 'card_3', tone_hint: null, geometry_hooks: sample, text_slot: null }
   ];
 }
 
-function inferReportType(modeToken, hasB) {
+function inferReportType(modeToken, hasB) {
   const m = (modeToken || '').toUpperCase();
   if (m.includes('SYNASTRY') || m.includes('COMPOSITE') || hasB) return 'relational';
   return 'solo';
 }
 
-function composeWovenMapReport({ result, mode, period }) {
+// New: report-family inference and gating
+function inferFamily(modeToken, result) {
+  const m = (modeToken || '').toUpperCase();
+  const hasTransits = !!(result?.person_a?.chart?.transitsByDate && Object.keys(result.person_a.chart.transitsByDate).length);
+  if (m.includes('BALANCE')) return 'balance_meter';
+  if (m.includes('MIRROR')) return 'mirror_flow';
+  return hasTransits ? 'balance_meter' : 'mirror_flow';
+}
+
+function buildBalanceMeter(summary, meterChannels, provenanceVersions) {
+  if (!summary) return null;
+  const magnitudeInfo = classifyMagnitude(summary.magnitude);
+  const magnitudeVal = magnitudeInfo?.value ?? safeNum(summary.magnitude);
+  const magnitudeLabel = summary.magnitude_label || magnitudeInfo?.label || null;
+  const volatilityInfo = classifyVolatility(summary.volatility);
+  const volatilityVal = volatilityInfo?.value ?? safeNum(summary.volatility);
+  const volatilityLabel = summary.volatility_label || volatilityInfo?.label || null;
+  const balanceMeta = meterChannels?.balance || null;
+  const valenceSource = summary.valence_bounded ?? balanceMeta?.value ?? summary.valence;
+  const valenceInfo = classifyValence(valenceSource);
+  const valenceVal = valenceInfo?.value ?? safeNum(valenceSource);
+  const valenceRaw = safeNum(summary.valence_raw_unbounded ?? summary.valence_raw);
+  const valenceLabel = summary.valence_label || balanceMeta?.label || valenceInfo?.label || null;
+  const valenceRange = Array.isArray(summary.valence_range)
+    ? summary.valence_range
+    : (balanceMeta?.range || [-5, 5]);
+  const valenceVersion = summary?.valence_version
+    || balanceMeta?.calibration_mode
+    || balanceMeta?.version
+    || BALANCE_CALIBRATION_VERSION;
+  const valenceCode = balanceMeta?.code || valenceInfo?.code || null;
+  const valencePolarity = balanceMeta?.polarity || valenceInfo?.polarity || (valenceVal >= 0 ? 'positive' : 'negative');
+  return {
+    magnitude: { value: magnitudeVal, label: magnitudeLabel },
+    magnitude_label: magnitudeLabel,
+    valence: {
+      value: valenceVal,
+      raw_value: valenceRaw,
+      normalized: balanceMeta?.value ?? valenceVal,
+      label: valenceLabel,
+      emoji: balanceMeta?.emoji || valenceInfo?.emoji || null,
+      polarity: valencePolarity,
+      band: balanceMeta?.band || valenceInfo?.band || null,
+      code: valenceCode,
+      range: valenceRange,
+      version: valenceVersion,
+      sample_size: balanceMeta?.sample_size ?? summary.valence_sample_size ?? null
+    },
+    valence_bounded: valenceVal,
+    valence_label: valenceLabel,
+    valence_code: valenceCode,
+    valence_range: valenceRange,
+    valence_version: valenceVersion,
+    valence_raw_unbounded: valenceRaw,
+    volatility: { value: volatilityVal, label: volatilityLabel, emoji: volatilityInfo?.emoji || null },
+    volatility_label: volatilityLabel,
+    confidence: meterChannels?.seismograph?.confidence ?? null,
+    confidence_sample_size: meterChannels?.seismograph?.sample_size ?? 0,
+    balance_channel: meterChannels?.balance ? { ...meterChannels.balance } : null,
+    support_friction: meterChannels?.sfd ? { ...meterChannels.sfd } : null,
+    version: provenanceVersions
+      ? { ...provenanceVersions }
+      : { seismograph: SEISMOGRAPH_VERSION, balance: BALANCE_CALIBRATION_VERSION, sfd: SFD_VERSION },
+    calibration_mode: meterChannels?.balance?.calibration_mode || BALANCE_CALIBRATION_VERSION
+  };
+}
+
+function composeWovenMapReport({ result, mode, period, options = {} }) {
   const a = result.person_a || {};
   const b = result.person_b || null;
-  const type = inferReportType(mode, !!b);
+  const type = inferReportType(mode, !!b);
+  const report_family = (options.report_family || inferFamily(mode, result));
 
-  const summary = a.derived?.seismograph_summary || null;
-  const meterChannels = summarizeMeterChannels(a.chart?.transitsByDate);
-  const integration = computeIntegrationFactors(summary, meterChannels?.balance?.value ?? null);
-  const timeSeries = extractTimeSeries(a.chart?.transitsByDate);
-  const vectorIntegrity = computeVectorIntegrity(a.chart?.transitsByDate);
+  const transits = a.chart?.transitsByDate;
+  const summary = a.derived?.seismograph_summary || null;
+  const meterChannels = summarizeMeterChannels(transits);
+  const integration = computeIntegrationFactors(summary, meterChannels?.balance?.value ?? null);
+  const timeSeries = extractTimeSeries(transits);
+  const vectorIntegrity = computeVectorIntegrity(transits);
   const hookStack = composeHookStack(result, { maxHooks: 4, minIntensity: 8 });
 
-  let balanceMeter = null;
-  if (summary) {
-    const magnitudeInfo = classifyMagnitude(summary.magnitude);
-    const magnitudeVal = magnitudeInfo?.value ?? safeNum(summary.magnitude);
-    const magnitudeLabel = summary.magnitude_label || magnitudeInfo?.label || null;
-
-    const volatilityInfo = classifyVolatility(summary.volatility);
-    const volatilityVal = volatilityInfo?.value ?? safeNum(summary.volatility);
-    const volatilityLabel = summary.volatility_label || volatilityInfo?.label || null;
-
-    const balanceMeta = meterChannels?.balance || null;
-    const valenceSource = summary.valence_bounded ?? balanceMeta?.value ?? summary.valence;
-    const valenceInfo = classifyValence(valenceSource);
-    const valenceVal = valenceInfo?.value ?? safeNum(valenceSource);
-    const valenceRaw = safeNum(summary.valence_raw_unbounded ?? summary.valence_raw);
-    const valenceLabel = summary.valence_label || balanceMeta?.label || valenceInfo?.label || null;
-    const valenceRange = Array.isArray(summary.valence_range)
-      ? summary.valence_range
-      : (balanceMeta?.range || [-5, 5]);
-    const valenceVersion = summary?.valence_version
-      || balanceMeta?.calibration_mode
-      || balanceMeta?.version
-      || BALANCE_CALIBRATION_VERSION;
-    const valenceCode = balanceMeta?.code || valenceInfo?.code || null;
-    const valencePolarity = balanceMeta?.polarity || valenceInfo?.polarity || (valenceVal >= 0 ? 'positive' : 'negative');
-
-    balanceMeter = {
-      magnitude: {
-        value: magnitudeVal,
-        label: magnitudeLabel
-      },
-      magnitude_label: magnitudeLabel,
-      valence: {
-        value: valenceVal,
-        raw_value: valenceRaw,
-        normalized: balanceMeta?.value ?? valenceVal,
-        label: valenceLabel,
-        emoji: balanceMeta?.emoji || valenceInfo?.emoji || null,
-        polarity: valencePolarity,
-        band: balanceMeta?.band || valenceInfo?.band || null,
-        code: valenceCode,
-        range: valenceRange,
-        version: valenceVersion,
-        sample_size: balanceMeta?.sample_size ?? summary.valence_sample_size ?? null
-      },
-      valence_bounded: valenceVal,
-      valence_label: valenceLabel,
-      valence_code: valenceCode,
-      valence_range: valenceRange,
-      valence_version: valenceVersion,
-      valence_raw_unbounded: valenceRaw,
-      volatility: {
-        value: volatilityVal,
-        label: volatilityLabel,
-        emoji: volatilityInfo?.emoji || null
-      },
-      volatility_label: volatilityLabel,
-      confidence: meterChannels?.seismograph?.confidence ?? null,
-      confidence_sample_size: meterChannels?.seismograph?.sample_size ?? 0,
-      balance_channel: meterChannels?.balance ? { ...meterChannels.balance } : null,
-      support_friction: meterChannels?.sfd ? { ...meterChannels.sfd } : null,
-      version: result?.provenance?.engine_versions
-        ? { ...result.provenance.engine_versions }
-        : {
-            seismograph: SEISMOGRAPH_VERSION,
-            balance: BALANCE_CALIBRATION_VERSION,
-            sfd: SFD_VERSION
-          },
-      calibration_mode: balanceMeta?.calibration_mode || summary.valence_version || BALANCE_CALIBRATION_VERSION
-    };
-  }
+  // base envelope (no hybrid blobs)
+  const report = {
+    schema: 'WM-WovenMap-1.0',
+    type, // 'solo' | 'relational'
+    report_family,
+    context: {
+      mode,
+      period: period || null,
+      translocation: result?.context?.translocation || null,
+      person_a: {
+        name: a?.details?.name || 'Subject',
+        birth_date: a?.details?.birth_date || null,
+        birth_time: a?.details?.birth_time || null,
+        coordinates: (a?.details?.latitude != null && a?.details?.longitude != null)
+          ? { lat: a.details.latitude, lon: a.details.longitude }
+          : null,
+        timezone: a?.details?.timezone || null
+      },
+      person_b: b ? {
+        name: b?.details?.name || 'Subject B',
+        birth_date: b?.details?.birth_date || null,
+        birth_time: b?.details?.birth_time || null,
+        coordinates: (b?.details?.latitude != null && b?.details?.longitude != null)
+          ? { lat: b.details.latitude, lon: a.details.longitude }
+          : null,
+        timezone: b?.details?.timezone || null
+      } : null
+    },
+    raw_geometry: extractRawGeometry(result),
+    provenance: result.provenance || null
+  };
 
-  const natalSummary = extractNatalSummary(a);
-  const driversSummary = (() => {
-    const placements = natalSummary?.placements || {};
-    const listNames = (arr) => Array.isArray(arr) ? arr.map(item => item?.name).filter(Boolean) : [];
-    return {
-      core_planets: listNames(placements.core),
-      supporting_points: listNames(placements.supporting),
-      derived: listNames(placements.derived)
-    };
-  })();
+  if (report_family === 'mirror_flow') {
+    const natalSummary = extractNatalSummary(a);
+    const driversSummary = (() => {
+      const placements = natalSummary?.placements || {};
+      const listNames = (arr) => Array.isArray(arr) ? arr.map(item => item?.name).filter(Boolean) : [];
+      return {
+        core_planets: listNames(placements.core),
+        supporting_points: listNames(placements.supporting),
+        derived: listNames(placements.derived)
+      };
+    })();
+    report.natal_summary = natalSummary;
+    report.drivers = driversSummary;
+    report.vector_integrity = vectorIntegrity;
+    report.polarity_cards = buildPolarityCardsHooks(a); // DATA hooks only
+    // DO NOT include balance_meter or time_series here
+  } else if (report_family === 'balance_meter') {
+    // Strictly meter + series (+ optional integration factors)
+    report.balance_meter = buildBalanceMeter(summary, meterChannels, result?.provenance?.engine_versions);
+    report.time_series = timeSeries;
+    report.integration_factors = integration;
+    // DO NOT include polarity_cards here
+  }
 
-  const report = {
-    schema: 'WM-WovenMap-1.0',
-    type, // 'solo' | 'relational'
-    context: {
-      mode,
-      period: period || null,
-      translocation: result?.context?.translocation || null,
-      person_a: {
-        name: a?.details?.name || 'Subject',
-        birth_date: a?.details?.birth_date || null,
-        birth_time: a?.details?.birth_time || null,
-        coordinates: (a?.details?.latitude != null && a?.details?.longitude != null)
-          ? { lat: a.details.latitude, lon: a.details.longitude }
-          : null,
-        timezone: a?.details?.timezone || null
-      },
-      person_b: b ? {
-        name: b?.details?.name || 'Subject B',
-        birth_date: b?.details?.birth_date || null,
-        birth_time: b?.details?.birth_time || null,
-        coordinates: (b?.details?.latitude != null && b?.details?.longitude != null)
-          ? { lat: b.details.latitude, lon: a.details.longitude }
-          : null,
-        timezone: b?.details?.timezone || null
-      } : null
-    },
-    balance_meter: balanceMeter,
-    hook_stack: hookStack,
-    integration_factors: integration,
-    time_series: timeSeries,
-    natal_summary: natalSummary,
-    drivers: driversSummary,
-    vector_integrity: vectorIntegrity,
-    polarity_cards: buildPolarityCardsHooks(a), // DATA hooks only, no VOICE
-    mirror_voice: null, // reserved for Raven
-    raw_geometry: extractRawGeometry(result),
-    provenance: result.provenance || null
-  };
+  // Always include hooks (data-only), independent of family
+  report.hook_stack = hookStack;
 
   return report;
 }
 
-module.exports = { composeWovenMapReport };
+module.exports = { composeWovenMapReport, inferReportType, inferFamily };