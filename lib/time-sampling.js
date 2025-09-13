const { DateTime } = require('luxon');

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

function buildWindowSamples(windowObj, ianaTz) {
  if (!windowObj || !windowObj.start || !windowObj.end || !windowObj.step) {
    throw new Error('Invalid window object');
  }
  const { start, end, step } = windowObj;
  const localStart = DateTime.fromISO(start, { zone: ianaTz });
  const localEnd = DateTime.fromISO(end, { zone: ianaTz });
  if (!localStart.isValid || !localEnd.isValid) {
    throw new Error('Invalid window dates for timezone ' + ianaTz);
  }
  let cursor = DateTime.fromISO(start, { zone: ianaTz }).set({ hour: 12, minute: 0, second: 0, millisecond: 0 });
  const samples = [];
  const stepUnit = step === 'weekly' ? { days: 7 } : { days: 1 };
  while (cursor <= localEnd.set({ hour: 23, minute: 59, second: 59 })) {
    samples.push(cursor.toUTC().toISO());
    cursor = cursor.plus(stepUnit);
  }
  return samples;
}

module.exports = { localNoonToUTC, buildWindowSamples };
