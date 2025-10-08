const { DateTime } = require('luxon');

function normalizeHour(value, fallback = 12) {
  const n = Number.isFinite(value) ? Math.trunc(value) : fallback;
  if (n < 0) return 0;
  if (n > 23) return 23;
  return n;
}

function normalizeMinute(value, fallback = 0) {
  const n = Number.isFinite(value) ? Math.trunc(value) : fallback;
  if (n < 0) return 0;
  if (n > 59) return 59;
  return n;
}

function resolveZone(startIso, candidates) {
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'string') continue;
    const dt = DateTime.fromISO(startIso, { zone: candidate });
    if (dt.isValid) return candidate;
  }
  return 'UTC';
}

function localNoonToUTC(dateOrIso, ianaTz) {
  if (!ianaTz || typeof ianaTz !== 'string') {
    throw new Error('localNoonToUTC requires an IANA timezone string');
  }
  const dateOnlyRe = /^\d{4}-\d{2}-\d{2}$/;
  let dt;
  if (dateOnlyRe.test(dateOrIso)) {
    dt = DateTime.fromISO(dateOrIso, { zone: ianaTz }).set({ hour: 12, minute: 0, second: 0, millisecond: 0 });
  } else {
    const hasOffset = /[Zz]|[+\-]\d{2}:\d{2}$/.test(dateOrIso);
    dt = DateTime.fromISO(dateOrIso, { zone: hasOffset ? undefined : ianaTz });
    if (!dt.isValid) throw new Error('Invalid ISO date/time: ' + dateOrIso);
  }
  return dt.toUTC().toISO();
}

function buildWindowSamples(windowObj, ianaTz, timeSpec = null) {
  if (!windowObj || !windowObj.start || !windowObj.end || !windowObj.step) {
    throw new Error('Invalid window object');
  }
  const { start, end, step } = windowObj;
  const zoneCandidates = [timeSpec?.timezone, ianaTz, 'UTC'];
  const zone = resolveZone(start, zoneCandidates);

  const localStart = DateTime.fromISO(start, { zone });
  const localEnd = DateTime.fromISO(end, { zone });
  if (!localStart.isValid || !localEnd.isValid) {
    throw new Error('Invalid window dates for timezone ' + zone);
  }

  const defaultHour = normalizeHour(timeSpec?.hour, 12);
  const defaultMinute = normalizeMinute(timeSpec?.minute, 0);

  let cursor = localStart.set({ hour: defaultHour, minute: defaultMinute, second: 0, millisecond: 0 });
  const endBoundary = localEnd.set({ hour: defaultHour, minute: defaultMinute, second: 0, millisecond: 0 });

  const stepToken = (step || '').toString().toLowerCase();
  const stepUnit = stepToken === 'weekly' ? { days: 7 }
    : stepToken === 'monthly' ? { months: 1 }
    : { days: 1 };

  const samples = [];
  while (cursor <= endBoundary) {
    samples.push(cursor.toUTC().toISO());
    cursor = cursor.plus(stepUnit).set({ hour: defaultHour, minute: defaultMinute, second: 0, millisecond: 0 });
  }
  return {
    samples,
    zone,
    hour: defaultHour,
    minute: defaultMinute
  };
}

module.exports = { localNoonToUTC, buildWindowSamples };
