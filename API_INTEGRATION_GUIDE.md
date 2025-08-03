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
