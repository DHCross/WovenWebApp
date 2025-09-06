// WM-Chart-1.2 JSON Schema Validation Test
// Tests the payload contract against the actual implementation

const samplePayload = {
  "date": "2025-09-05",
  "seismograph": {
    "magnitude": 5.0,
    "valence": -5.0,
    "volatility": 4.2,
    "version": "v1.0"
  },
  "balance": {
    "magnitude": 5.0,
    "valence": -3.0,
    "version": "v1.1"
  },
  "sfd": {
    "sfd": -1.5,
    "sPlus": 1.2,
    "sMinus": 2.7,
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
    ['seismograph.valence', payload.seismograph?.valence],
    ['balance.valence', payload.balance?.valence],
    ['sfd.sfd', payload.sfd?.sfd],
    ['sfd.sPlus', payload.sfd?.sPlus],
    ['sfd.sMinus', payload.sfd?.sMinus]
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
  
  if (payload.seismograph?.valence < -5 || payload.seismograph?.valence > 5) {
    errors.push('Seismograph valence must be -5 to +5');
  }
  
  if (payload.balance?.valence < -5 || payload.balance?.valence > 5) {
    errors.push('Balance valence must be -5 to +5');
  }
  
  if (payload.sfd?.sfd < -5 || payload.sfd?.sfd > 5) {
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
  const val = result.payload.seismograph.valence;
  const bal = result.payload.balance.valence;
  const sfd = result.payload.sfd.sfd;
  const splus = result.payload.sfd.sPlus;
  const sminus = result.payload.sfd.sMinus;
  const verdict = sfdVerdict(sfd);
  
  const channelLine = `Quake ${mag} · val ${fmtSigned(val)} · bal ${fmtSigned(bal)} · ${verdict} (SFD ${fmtSigned(sfd)}; S+ ${splus.toFixed(1)}/S− ${sminus.toFixed(1)})`;
  
  console.log(channelLine);
}

module.exports = { validatePayload, samplePayload };
