# Debugging empty aspect days — quick checklist

1) Check provenanceByDate
- For each date, confirm: endpoint, formation, attempts, aspect_count.
- If aspect_count === 0, note the formation and endpoint tried.

2) Formation mismatch
- If formation is coords but upstream returned 422 complaining about missing city, try city_state_geonames (requires GEONAMES_USERNAME).
- If formation is city_state and upstream asked for GeoNames, ensure server env var GEONAMES_USERNAME is set.

3) Check per-day attempts
- The pipeline tries: transit-aspects-data → transit-chart → formation switch. Look at the attempts log to see which call returned 200 vs 200-empty vs 4xx/5xx.

4) Backoff / 429
- If you see 429 in the logs, the handler uses exponential backoff. Wait a minute and re-run the day probe (the probe script retries fresh requests).

5) Payload normalization
- Confirm the outgoing payload uses canonical field names your provider expects: lat, lng/lon, tz_str or city, state, nation. The adapter normalizes these; if you patch UI fields, keep names consistent.

6) Quick fixes
- Add GEONAMES_USERNAME to server env and re-run entire window (natal city-mode will be used).
- Temporarily run transit calls coords-only (set births to coords-only and force transit coords) to confirm transit endpoint separately.

7) When to skip natal
- If natal validation breaks repeatedly, set NATAL_TRANSITS to allow transits-only and set a provenance flag natal_omitted: true — this unblocks Balance Meter generation immediately.

8) Collect logs
- If empty persists across formations, collect server logs for a single date (include request/response payloads trimmed) and share with engineering for provider escalation.
