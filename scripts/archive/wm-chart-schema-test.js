// WM-Chart-1.2 JSON Schema Validation Test
// Tests the payload contract against the actual implementation

const samplePayload = {
  "date": "2025-09-05",
  "seismograph": {
    "magnitude": 5.0,
    "magnitude_label": "Threshold",
    "valence_bounded": -5.0,
    "valence_label": "Collapse",
    "volatility": 4.2,
    "volatility_label": "Fragment Scatter",
    "version": "v1.0"
  },
  "balance": {
    "magnitude": 5.0,
    "valence_bounded": -3.0,
    "valence_label": "Friction",
    "version": "v1.1",
    "calibration_mode": "v1.1"
  },
  "sfd": {
    "sfd_cont": -1.5,
    "sfd_disc": -1,
    "sfd_label": "scaffolding cut",
    "s_plus": 1.2,
    "s_minus": 2.7,
    "version": "v1.2"
  },
  "meta": {
    "calibration_boundary": "2025-09-05",
    "engine_versions": {
      "seismograph": "v1.0",
      "balance": "v1.1", 
      "sfd": "v1.2"
    },
    "reconstructed": false
  }
};

// Test the helper functions would work with this payload
function validatePayload(payload) {
  const errors = [];

  // Check required structure
  if (!payload.seismograph || typeof payload.seismograph !== 'object') {
    errors.push('Missing or invalid seismograph object');
  }
  
  if (!payload.balance || typeof payload.balance !== 'object') {
    errors.push('Missing or invalid balance object');
  }
  
  if (!payload.sfd || typeof payload.sfd !== 'object') {
    errors.push('Missing or invalid sfd object');
  }

  // Check version tags
  if (payload.seismograph?.version !== 'v1.0') {
    errors.push('Seismograph version should be v1.0');
  }
  
  if (payload.balance?.version !== 'v1.1') {
    errors.push('Balance version should be v1.1');
  }
  
  if (payload.sfd?.version !== 'v1.2') {
    errors.push('SFD version should be v1.2');
  }

  // Check required numeric fields
  const requiredNumbers = [
    ['seismograph.magnitude', payload.seismograph?.magnitude],
    ['seismograph.valence_bounded', payload.seismograph?.valence_bounded],
    ['balance.valence_bounded', payload.balance?.valence_bounded],
    ['sfd.sfd_cont', payload.sfd?.sfd_cont],
    ['sfd.s_plus', payload.sfd?.s_plus],
    ['sfd.s_minus', payload.sfd?.s_minus]
  ];

  requiredNumbers.forEach(([path, value]) => {
    if (!Number.isFinite(value)) {
      errors.push(`${path} must be a finite number, got: ${value}`);
    }
  });

  // Check value ranges
  if (payload.seismograph?.magnitude < 0 || payload.seismograph?.magnitude > 10) {
    errors.push('Seismograph magnitude must be 0-10');
  }
  
  if (payload.seismograph?.valence_bounded < -5 || payload.seismograph?.valence_bounded > 5) {
    errors.push('Seismograph valence must be -5 to +5');
  }

  if (payload.balance?.valence_bounded < -5 || payload.balance?.valence_bounded > 5) {
    errors.push('Balance valence must be -5 to +5');
  }

  if (payload.sfd?.sfd_cont < -5 || payload.sfd?.sfd_cont > 5) {
    errors.push('SFD value must be -5 to +5');
  }

  return {
    valid: errors.length === 0,
    errors,
    payload
  };
}

// Run validation
const result = validatePayload(samplePayload);

console.log('WM-Chart-1.2 Schema Validation Result:');
console.log('Valid:', result.valid);
if (!result.valid) {
  console.log('Errors:', result.errors);
} else {
  console.log('✅ Schema validation passed!');
  console.log('Sample triple channel line would be:');
  
  // Mock the tripleChannelLine function
  const fmtSigned = (n) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}`;
  const sfdVerdict = (sfd) => {
    if (sfd >= 0.75) return "stabilizers prevail";
    if (sfd <= -0.75) return "stabilizers cut";
    return "stabilizers mixed";
  };
  
  const mag = result.payload.seismograph.magnitude.toFixed(1);
  const val = result.payload.seismograph.valence_bounded;
  const bal = result.payload.balance.valence_bounded;
  const sfd = result.payload.sfd.sfd_cont;
  const splus = result.payload.sfd.s_plus;
  const sminus = result.payload.sfd.s_minus;
  const verdict = result.payload.sfd.sfd_label || sfdVerdict(sfd);

  const channelLine = `Quake ${mag} · val ${fmtSigned(val)} · bal ${fmtSigned(bal)} · ${verdict} (SFD ${fmtSigned(sfd)}; S+ ${splus.toFixed(1)}/S− ${sminus.toFixed(1)})`;
  
  console.log(channelLine);
}

module.exports = { validatePayload, samplePayload };
