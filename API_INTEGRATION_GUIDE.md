# API Integration Guide for Woven Map Application

This document provides detailed guidance on the API integration between the Woven Map frontend and the RapidAPI Astrologer service, based on lessons learned from debugging and development.

## Architecture Overview

The Woven Map application uses a three-part architecture:

1. **Frontend (index.html)**: Collects user input and sends it to the serverless function
2. **Serverless Function (astrology-mathbrain.js)**: Validates data and forwards it to the external API
3. **External API (Astrologer on RapidAPI)**: Processes the request and returns astrological calculations

## Required Data Fields

The backend validation in `astrology-mathbrain.js` requires the following fields for each subject (Person A, Person B):

```javascript
const required = [
  'year', 'month', 'day', 'hour', 'minute',
  'name', 'city', 'nation', 'latitude', 'longitude', 'zodiac_type', 'timezone'
];
```

All of these fields must be present and properly formatted for the API request to succeed.

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
- Always use the public-facing endpoint `/api/astrology-mathbrain`
- Avoid direct references to `/.netlify/functions/astrology-mathbrain`
- Use a centralized configuration for API endpoints

## Environment Setup

The serverless function requires a valid RapidAPI key to function. This key must be set in:

1. **Production:** The Netlify environment variables for the deployed site
2. **Development:** A local `.env` file containing `RAPIDAPI_KEY=your_api_key_here`

**Important:** The server must be restarted after updating the `.env` file.

## Debugging API Requests

When troubleshooting API issues:

1. Check browser console for JavaScript errors
2. Verify form data is complete by logging `console.log(JSON.stringify(formData, null, 2))`
3. Check server logs for validation errors
4. Verify that the RapidAPI key is valid and properly configured
5. Test the direct API endpoint using a tool like Postman

## Example: Correct Data Format

Here is an example of correctly formatted data for the API:

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

## Best Practices

1. **Contract-First Development:** Use the `openapi.json` as the source of truth for API integration
2. **Defensive Programming:** Always validate form data before submission
3. **Detailed Logging:** Log form data and API responses during development
4. **Error Handling:** Provide clear error messages for missing or invalid data

By following these guidelines, you can avoid common integration issues and ensure the Woven Map application works correctly with the RapidAPI Astrologer service.
