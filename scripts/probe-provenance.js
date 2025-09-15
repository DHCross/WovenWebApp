// scripts/probe-provenance.js
// Usage:
//   export RAPIDAPI_KEY=xxx
//   export GEONAMES_USERNAME=youruser   # optional but recommended
//   node scripts/probe-provenance.js
// Optionally set API_URL to override the endpoint (defaults to local Netlify dev proxy)

const endpoint = process.env.API_URL || 'http://localhost:4000/api/astrology-mathbrain';

async function run() {
  const now = new Date('2025-09-13'); // modify date as needed
  const from = now.toISOString().slice(0,10);
  const to = new Date(now.getTime() + 2*24*3600*1000).toISOString().slice(0,10); // +2 days

  const payload = {
    report_type: 'relational_balance_meter', // or 'solo_balance_meter'
    subjectA: {
      name: 'DH Cross',
      birth: {
        date: '1973-07-24',
        time: '14:30',
        lat: 40.0167,
        lon: -75.3000,
        tz: 'America/Chicago',
        city: 'Bryn Mawr',
        state: 'PA',
        nation: 'US'
      },
      A_local: { city: 'Panama City', state: 'FL', nation: 'US', lat: 30.1588, lon: -85.6602, tz: 'America/Chicago' }
    },
    subjectB: {
      name: 'Test B',
      birth: {
        date: '1965-04-18',
        time: '18:37',
        lat: 31.5833,
        lon: -84.1500,
        tz: 'America/New_York',
        city: 'Albany',
        state: 'GA',
        nation: 'US'
      }
    },
    transits: { from, to, step: '1d' },
    houses: 'Placidus',
    relocation_mode: 'A_local',
    orbs_profile: 'wm-spec-2025-09'
  };

  console.log('Posting to', endpoint, 'window', from, '→', to);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      console.error('Non-200 response:', res.status, await res.text());
      process.exit(2);
    }
    const json = await res.json();

    // print high-level provenance
    console.log('\n=== GLOBAL PROVENANCE ===');
    console.log(JSON.stringify(json.provenance || json.result?.provenance || json, null, 2));

    // person A provenanceByDate
    const pA = json.person_a?.chart?.provenanceByDate || json.result?.person_a?.chart?.provenanceByDate;
    console.log('\n=== PERSON A provenanceByDate (sample) ===');
    if (!pA) {
      console.error('NO provenanceByDate found for person A');
    } else {
      console.log(JSON.stringify(pA, null, 2));
    }

    // print drivers top 3 per date
    const tbd = json.person_a?.chart?.transitsByDate || json.result?.person_a?.chart?.transitsByDate;
    console.log('\n=== TOP DRIVERS PER DAY (person A) ===');
    if (!tbd) {
      console.error('No transitsByDate found.');
    } else {
      for (const d of Object.keys(tbd).sort()) {
        const day = tbd[d];
        const drivers = day.drivers || [];
        const aspectsCount = Array.isArray(day.aspects) ? day.aspects.length : (Array.isArray(day.filtered_aspects) ? day.filtered_aspects.length : drivers.length);
        console.log(`\n${d}  aspects:${aspectsCount}`);
        if (drivers.length === 0) {
          console.log('  drivers: []');
        } else {
          for (let i = 0; i < Math.min(3, drivers.length); i++) {
            const dr = drivers[i];
            console.log(`  - ${dr.a} ${dr.type} ${dr.b} (orb ${dr.orb}, applying:${dr.applying}, w:${dr.weight || 'n/a'})`);
          }
        }
      }
    }

    // decide pass/fail quickly: provenance exists and at least one day has drivers
    const hasProvenance = !!pA && Object.keys(pA).length > 0;
    const hasAnyDrivers = tbd && Object.values(tbd).some(d => (d.drivers || []).length > 0);
    if (hasProvenance && hasAnyDrivers) {
      console.log('\nPROBE: PASS — provenance + drivers present');
      process.exit(0);
    } else {
      console.log('\nPROBE: PARTIAL/FAIL — provenance or drivers missing; inspect output above');
      process.exit(1);
    }

  } catch (err) {
    console.error('Probe error', err);
    process.exit(3);
  }
}

run();
