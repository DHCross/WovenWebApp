(function(global){
  function mapPlanet(p){
    if(!p) return null;
    return {
      name: p.name || p.body || null,
      lon_deg: Number(p.lon_deg ?? p.longitude),
      sign: p.sign || null,
      deg_in_sign: Number(p.deg_in_sign ?? p.degree),
      speed_deg_per_day: Number(p.speed_deg_per_day ?? p.speed),
      retrograde: Boolean(p.retrograde ?? p.rx),
      house: p.house != null ? Number(p.house) : null
    };
  }

  function mapAspect(a){
    if(!a) return null;
    return {
      a: a.a || a.point_a || null,
      b: a.b || a.point_b || null,
      type: a.type || a.aspect || null,
      orb_deg: Number(a.orb_deg ?? a.orb),
      phase: a.phase || a.applying ? 'applying' : (a.separating ? 'separating' : null),
      exact: a.exact || null
    };
  }

  function normalizeVendorPayload(raw){
    raw = raw || {};
    return {
      provenance: {
        calculation_timestamp: raw.calculation_timestamp || raw.timestamp || null,
        software_version: raw.software_version || raw.git_sha || null,
        ephemeris: raw.ephemeris || null,
        timezone_db_version: raw.timezone_db_version || raw.tzdb || null
      },
      birth_data: raw.birth_data || raw.birth || {},
      config: raw.config || {},
      natal: {
        planets: (raw.natal?.planets || raw.planets || []).map(mapPlanet),
        angles: raw.natal?.angles || raw.angles || {},
        houses: raw.natal?.houses || raw.houses || [],
        aspects: (raw.natal?.aspects || raw.aspects || []).map(mapAspect)
      },
      transits: {
        location_context: raw.transits?.location_context || raw.location_context || null,
        aspects: (raw.transits?.aspects || []).map(mapAspect),
        seismograph_daily: raw.transits?.seismograph_daily || []
      }
    };
  }

  global.normalizeAstrologyPayload = normalizeVendorPayload;
})(typeof window !== 'undefined' ? window : globalThis);
