# WovenWebApp

A web application for generating natal charts and transit reports using the Astrologer API. The app supports optional relocation overlays and local forecast charts.

## Prerequisites

- A RapidAPI key for the Astrologer API.
- A modern web browser.

## Setup

1. Copy `.env.example` to `.env` and place your RapidAPI key in it:
   ```
   cp .env.example .env
   # Edit .env and set RAPIDAPI_KEY
   ```
2. Copy `config.example.js` to `config.js` and insert the same key:
   ```
   cp config.example.js config.js
   # Edit config.js and replace the placeholder with your key
   ```
3. Open `Woven Map Math Brain.html` in your browser.

## Usage

1. Enter birth information for **Person A**. **Person B** is optional.
2. In **Step 1**, choose the date range for transits. Tick **Add Relocation Overlay** to calculate a second set of transits for another location without altering the natal data.
3. Click **Generate Full Report** to produce a Markdown report. Both natal-location transits and relocation overlays (if enabled) appear side by side.
4. In **Step 2** you can generate a standalone sky chart for any location and date range.
5. Use the buttons above the output to copy or save the report as Markdown or JSON.

### Coordinate Formats

Latitude and longitude fields accept several formats:

- `30°10'N`
- `30°10' N`
- `30.1588`
- Combined field examples: `30°10′N, 85°40′W` or `30.1588, -85.6602`

Minutes are optional, and decimal degrees are supported.

## Notes

The file `config.js` (containing your API key) and `.env` are ignored by Git. A template `config.example.js` is provided for convenience. Do not commit your secret key to version control.
