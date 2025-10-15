function sanitizeForFilename(value, fallback = 'file') {
  const raw = value === undefined || value === null ? '' : String(value);
  const trimmed = raw.trim();
  if (!trimmed) {
    return fallback;
  }

  // Replace characters that are problematic for filenames across platforms
  const sanitized = trimmed
    .replace(/[\u0000-\u001F\u007F]/g, '') // control characters
    .replace(/[<>:"/\\|?*]/g, '_') // reserved characters on Windows
    .replace(/\s+/g, ' ') // collapse whitespace to single spaces
    .replace(/\.+$/g, '') // avoid trailing periods which can be problematic on Windows
    .trim();

  return sanitized.length > 0 ? sanitized : fallback;
}

module.exports = { sanitizeForFilename };
