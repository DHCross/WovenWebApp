# Woven Map Form Data Validation Example

This is a simple example to demonstrate how to properly validate and format form data for the Woven Map application.

```javascript
/**
 * Validate form data before submission to the API
 * @param {Object} formData - The collected form data
 * @returns {Object} - Validation result with status and errors
 */
function validateFormData(formData) {
  const requiredFields = {
    personA: [
      'year', 'month', 'day', 'hour', 'minute',
      'name', 'city', 'nation', 'latitude', 'longitude', 'zodiac_type', 'timezone'
    ]
  };
  
  const errors = [];
  
  // Check required fields for Person A
  for (const field of requiredFields.personA) {
    if (!formData.personA[field]) {
      errors.push(`Missing required field for Person A: ${field}`);
    }
  }
  
  // Additional validation for Person B if needed
  if (formData.personB) {
    for (const field of requiredFields.personA) {
      if (!formData.personB[field]) {
        errors.push(`Missing required field for Person B: ${field}`);
      }
    }
  }
  
  // Validate numeric fields have the correct type
  const numericFields = ['year', 'month', 'day', 'hour', 'minute', 'latitude', 'longitude'];
  for (const field of numericFields) {
    if (formData.personA[field] && typeof formData.personA[field] !== 'number') {
      errors.push(`Field ${field} for Person A must be a number`);
    }
    if (formData.personB && formData.personB[field] && typeof formData.personB[field] !== 'number') {
      errors.push(`Field ${field} for Person B must be a number`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Example usage
 */
function exampleUsage() {
  // Example form data collection
  const formData = collectFormData();
  
  // Validate before submission
  const validation = validateFormData(formData);
  
  if (!validation.isValid) {
    // Display errors to user
    console.error('Form validation errors:', validation.errors);
    // Show error in UI
    showError(validation.errors.join('\n'));
    return;
  }
  
  // If valid, proceed with API submission
  submitToAPI(formData);
}

/**
 * Example of proper coordinates parsing
 * @param {string} coordString - Coordinate string from form input
 * @returns {Object} - Parsed latitude and longitude
 */
function parseCoordinates(coordString) {
  if (!coordString) return { latitude: undefined, longitude: undefined };
  
  coordString = coordString.trim();
  const decimalPattern = /^-?\d+\.?\d*,\s*-?\d+\.?\d*$/;
  const dmsPattern = /(\d+)[°\s]+(\d+)'?\s*([NS]),\s*(\d+)[°\s]+(\d+)'?\s*([EW])/i;

  console.log("Parsing coordinates:", coordString);

  // Try decimal format (e.g., "40.7128, -74.0060")
  if (decimalPattern.test(coordString)) {
    const [lat, lon] = coordString.split(',').map(s => parseFloat(s.trim()));
    console.log("Parsed decimal coordinates:", { latitude: lat, longitude: lon });
    return { latitude: lat, longitude: lon };
  }

  // Try DMS format (e.g., "40°42'N, 74°00'W")
  const dmsMatch = coordString.match(dmsPattern);
  if (dmsMatch) {
    let lat = parseFloat(dmsMatch[1]) + parseFloat(dmsMatch[2]) / 60;
    if (dmsMatch[3].toUpperCase() === 'S') lat = -lat;

    let lon = parseFloat(dmsMatch[4]) + parseFloat(dmsMatch[5]) / 60;
    if (dmsMatch[6].toUpperCase() === 'W') lon = -lon;
    
    console.log("Parsed DMS coordinates:", { latitude: lat, longitude: lon });
    return { latitude: parseFloat(lat.toFixed(4)), longitude: parseFloat(lon.toFixed(4)) };
  }
  
  console.error("Failed to parse coordinates:", coordString);
  return { latitude: undefined, longitude: undefined };
}

/**
 * Example of parsing date and time from form inputs
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @param {string} timeString - Time string in HH:MM format
 * @returns {Object} - Parsed year, month, day, hour, minute
 */
function parseDateAndTime(dateString, timeString) {
  if (!dateString || !timeString) {
    return {
      year: undefined,
      month: undefined,
      day: undefined,
      hour: undefined,
      minute: undefined
    };
  }
  
  // Parse date string (YYYY-MM-DD)
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Parse time string (HH:MM)
  const [hour, minute] = timeString.split(':').map(Number);
  
  return {
    year,
    month,
    day,
    hour,
    minute
  };
}
```

## Example of Complete Form Data Structure

Here's what the complete form data structure should look like:

```javascript
{
  "personA": {
    "name": "John Doe",
    "city": "New York",
    "state": "NY",
    "nation": "US",
    "year": 1980,
    "month": 1,
    "day": 1,
    "hour": 12,
    "minute": 0,
    "latitude": 40.7128,
    "longitude": -74.0060,
    "zodiac_type": "Tropic",
    "timezone": "America/New_York"
  },
  "personB": {
    "name": "Jane Doe",
    "city": "Los Angeles",
    "state": "CA",
    "nation": "US",
    "year": 1982,
    "month": 5,
    "day": 15,
    "hour": 8,
    "minute": 30,
    "latitude": 34.0522,
    "longitude": -118.2437,
    "zodiac_type": "Tropic",
    "timezone": "America/Los_Angeles"
  },
  "context": {
    "mode": "synastry",
    "relationship_type": "partner",
    "intimacy_tier": "P3"
  },
  "relocation": {
    "enabled": false
  }
}
```

Use this as a reference when implementing form data validation and submission.
