# API Integration Guide for Woven Map (Math Brain)

This document provides detailed guidance on the API integration between the Woven Map frontend and the RapidAPI Astrologer service, based on lessons learned from debugging and development.

## Architecture Overview

The Woven Map application uses a three-part architecture:

1. **Frontend (index.html)**: Collects user input and sends it to the serverless function
2. **Serverless Function (netlify/functions/astrology-mathbrain.js)**: Validates data and forwards it to the external API
3. **External API (Astrologer on RapidAPI)**: Processes the request and returns astrological calculations

## Supported Modes

The backend supports these modes via `context.mode`:
- `natal` – single-subject natal calculations
- `synastry` – A↔B comparisons
- `COMPOSITE_TRANSITS` – midpoint composite placements + composite aspects + **transits to the composite chart** (new)

Notes:
- `COMPOSITE_TRANSITS` requires **both** `personA` and `personB` and a transit date range.
- If a date range is provided without an explicit `context.mode`, the backend will treat it as `COMPOSITE_TRANSITS` when two people are present.

## Required Data Fields

The backend validation in 

`netlify/functions/astrology-mathbrain.js` requires the following fields for each subject (Person A, Person B):

```javascript
const required = [
  'year', 'month', 'day', 'hour', 'minute',
  'name', 'city', 'nation', 'latitude', 'longitude', 'zodiac_type', 'timezone'
];
```

**Additional requirements by mode:**
- `COMPOSITE_TRANSITS`:
  - Two subjects: `personA` and `personB` with all required fields
  - `transitParams.startDate` (YYYY-MM-DD)
  - `transitParams.endDate` (YYYY-MM-DD)
  - Optional: `transitParams.step` = `daily` (default) | `weekly` | number of days (integer)

## Common Integration Issues

### 1. Missing Required Fields

**Problem:** The frontend form data doesn't include all required fields, leading to a 400 error with "Missing required fields" message.

**Solution:**
- Ensure `collectFormData()` in `index.html` correctly extracts and formats all required fields
- Add validation to check for missing fields before submitting the form
- Parse date strings into separate year, month, day fields
- Parse time strings into separate hour and minute fields
- Convert coordinates to decimal latitude and longitude

### 2. Incorrect Data Formats

**Problem:** Form data is collected but not formatted correctly for the API.

**Solution:**
- Use proper data types (numbers for numeric fields, strings for text fields)
- Format dates according to API expectations (separate year, month, day as numbers)
- Format coordinates as decimal degrees (e.g., 40.7128, -74.0060)

### 3. API Endpoint Configuration

**Problem:** Using incorrect API endpoints leads to 404 errors.

**Solution:**
- In production, call the public route: `/api/astrology-mathbrain`
- In local dev, run `netlify dev`; your frontend can call `/api/astrology-mathbrain` (Netlify proxies to `/.netlify/functions/astrology-mathbrain`)
- Avoid hardcoding `/.netlify/functions/...` in frontend code
- Centralize the API base path in a config module

## Environment Setup

The serverless function requires a valid RapidAPI key to function. This key must be set in:

1. **Production:** The Netlify environment variables for the deployed site
2. **Development:** A local `.env` file containing `RAPIDAPI_KEY=your_api_key_here`

The function name is 

`astrology-mathbrain` and is located at 

`netlify/functions/astrology-mathbrain.js`.

**Important:** The server must be restarted after updating the `.env` file.

## Debugging API Requests

When troubleshooting API issues:

1. **Check browser console for JavaScript errors**
   - Open Developer Tools (F12) in the browser
   - Look for any JavaScript errors in the Console tab
   - Verify that form data collection logs appear when the button is clicked

2. **Verify form data is complete**
   - Check the Console for form data logs: `console.log(JSON.stringify(formData, null, 2))`
   - Ensure all required fields are present and properly formatted

3. **Inspect the actual API request**
   - Open Developer Tools → Network tab
   - Click the "Compute Astrological Geometry" button
   - Find the POST request to `/api/astrology-mathbrain`
   - Click on it to view the Request payload
   - Compare the payload to the expected format

4. **Check server logs for validation errors**
   - Monitor the terminal running `netlify dev`
   - Look for console.log output from the backend function
   - Check for specific error messages about missing fields

5. **Verify that the RapidAPI key is valid and properly configured**
   - Ensure the `.env` file contains `RAPIDAPI_KEY=your_actual_key`
   - Restart the server after updating the `.env` file

6. **Test with known good data**
   - Use the test page at `/api-test.html` to verify the API works with properly formatted data
   - This helps isolate whether the issue is in the frontend form or the backend API

### Common Issues and Solutions

**Issue: "Missing required fields for Person A"**
- **Cause**: The `collectFormData()` function is not properly extracting form data
- **Solution**: Check for duplicate function definitions, verify form field IDs match, add extensive logging

**Issue: No console logs appear when clicking the button**
- **Cause**: JavaScript errors or duplicate function definitions
- **Solution**: Check browser console for errors, verify event handlers are properly attached

**Issue: API request shows empty or malformed data**
- **Cause**: Form validation or data parsing issues
- **Solution**: Add step-by-step logging in `collectFormData()`, verify coordinate parsing

### Composite Debugging Checklist

- Confirm `context.mode` is `COMPOSITE_TRANSITS` (or that two persons + a date range are present)
- Ensure both `personA` and `personB` payloads include **all required fields**
- Verify `transitParams.startDate` and `transitParams.endDate` are valid ISO dates
- Inspect the response for `composite.placements`, `composite.aspects`, and `composite.transitsByDate`
- If `composite` is missing, check the server logs for warnings about extraction of planet longitudes

## Example Payloads

**Natal (single subject)**

```javascript
{
  "personA": {
    "name": "John Doe",
    "city": "New York",
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
  "context": {
    "mode": "natal"
  }
}
```

**Composite Transits (two subjects)**

```json
{
  "personA": {
    "name": "Person A",
    "city": "Bryn Mawr",
    "nation": "US",
    "year": 1973,
    "month": 7,
    "day": 24,
    "hour": 14,
    "minute": 30,
    "latitude": 40.0230,
    "longitude": -75.3155,
    "zodiac_type": "Tropic",
    "timezone": "America/New_York"
  },
  "personB": {
    "name": "Person B",
    "city": "Panama City",
    "nation": "US",
    "year": 2006,
    "month": 5,
    "day": 17,
    "hour": 10,
    "minute": 15,
    "latitude": 30.1588,
    "longitude": -85.6602,
    "zodiac_type": "Tropic",
    "timezone": "America/Chicago"
  },
  "context": { "mode": "COMPOSITE_TRANSITS" },
  "transitParams": {
    "startDate": "2025-08-13",
    "endDate": "2025-08-20",
    "step": "daily"
  }
}
```

## Response Shape (COMPOSITE_TRANSITS)

The response includes a `composite` node:

```
```json
{
  "composite": {
    "placements": { "Sun": 123.45, "Moon": 234.56, "ASC": 210.10, "MC": 15.30, "Mercury": 98.12, "Venus": 76.44, ... },
    "aspects": [
      {"a":"Sun","b":"Moon","aspect":"Square","exact":90,"separation":92.10,"orb":2.10},
      {"a":"Venus","b":"Mars","aspect":"Trine","exact":120,"separation":118.50,"orb":1.50}
    ],
    "transitsByDate": {
      "2025-08-13": [
        {"a":"Jupiter","b":"Sun","aspect":"Opposition","exact":180,"separation":182.30,"orb":2.30}
      ],
      "2025-08-14": [ ... ]
    }
  }
}
```

## Best Practices

1. **Contract-First Development:** Use the `openapi.json` as the source of truth for API integration
2. **Defensive Programming:** Always validate form data before submission
3. **Detailed Logging:** Log form data and API responses during development
4. **Error Handling:** Provide clear error messages for missing or invalid data
- **Mode Invariants:** When `context.mode` is `COMPOSITE_TRANSITS`, validate two subjects and a date range on the client before sending.

By following these guidelines, you can avoid common integration issues and ensure the Woven Map application works correctly with the RapidAPI Astrologer service.

## Frontend Checklist (Quick)

- All required fields present for A and B
- `context.mode` set appropriately
- Date range set when requesting composite transits
- Public endpoint `/api/astrology-mathbrain` used (dev via `netlify dev`)
- Console + Network tabs show a complete payload
- Response parsed for `composite.*` fields
