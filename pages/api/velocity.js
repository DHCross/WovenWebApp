import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const logPath = path.join(process.cwd(), '.logs', 'velocity-survival-log.jsonl');

  if (!fs.existsSync(logPath)) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  let data;
  try {
    data = fs.readFileSync(logPath, 'utf8');
  } catch (err) {
    res.status(500).json({ error: 'read_error', detail: err?.message || String(err) });
    return;
  }

  const trimmed = data.trim();
  if (!trimmed) {
    res.status(200).json({});
    return;
  }

  const lastLine = trimmed.split(/\r?\n/).pop();
  if (!lastLine) {
    res.status(200).json({});
    return;
  }

  try {
    const parsed = JSON.parse(lastLine);
    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: 'parse_error', detail: err?.message || String(err) });
  }
}
