# Testing Mirror + Symbolic Weather Upload Flow

This directory contains test scripts to simulate the full upload/auto-execution flow that occurs when a user uploads a Mirror + Symbolic Weather report to Poetic Brain.

## Prerequisites

1. **Local development server must be running:**
   ```bash
   npm run dev
   ```
   This starts the Next.js server with `/api/raven` and `/api/astrology-mathbrain` endpoints.

2. **Test report file must exist:**
   - Default: `reports/Mirror+SymbolicWeather_Weather_Dashboard_dan_2025-11-06_to_2025-11-06 (1).json`
   - This file contains both natal chart geometry and symbolic weather data

## Available Test Scripts

### Option 1: Full-featured test (requires `jq`)

```bash
./test-upload-flow.sh
```

**Features:**
- Pretty-printed JSON response
- Automatic timestamp-based context IDs
- Clear error messages
- Response validation hints

**Requirements:**
- `jq` (install with `brew install jq` on macOS)

### Option 2: Simple test (no dependencies)

```bash
./test-upload-flow-simple.sh
```

**Features:**
- No external dependencies (uses Python 3)
- Raw JSON response
- HTTP status code display
- Simpler output

## What the Test Does

1. **Reads the report file** from `reports/` directory
2. **Creates a POST payload** simulating what ChatClient.tsx sends:
   ```json
   {
     "input": "",
     "options": {
       "reportContexts": [
         {
           "id": "test-context-<timestamp>",
           "type": "mirror",
           "name": "Mirror + Symbolic Weather Test",
           "summary": "Testing auto-execution...",
           "content": "<entire JSON file as string>"
         }
       ]
     }
   }
   ```
3. **Sends request** to `http://localhost:3000/api/raven`
4. **Displays response** with structured draft and session data

## Expected Response

### ✅ Successful Auto-Execution

```json
{
  "ok": true,
  "intent": "report",
  "draft": {
    "picture": "Field layer observation...",
    "feeling": "Sensory/somatic data...",
    "container": "Symbolic direction...",
    "option": "Conditional inference...",
    "next_step": "Resonance question..."
  },
  "prov": {
    "source": "Poetic Brain (Auto-Execution Prompt)",
    "confidence": 0.85
  },
  "climate": {
    "magnitude": 2.3,
    "magnitude_label": "Active",
    "directional_bias": -1.2,
    "directional_bias_label": "Mild Inward",
    "coherence": 3.8,
    "coherence_label": "Stable"
  },
  "sessionId": "<uuid>",
  "probe": {
    "id": "<uuid>",
    "question": "Where does this pattern land in your body?"
  }
}
```

### ❌ Guard Response (Missing Data)

If you receive a guard message instead:

```json
{
  "ok": true,
  "intent": "conversation",
  "draft": {
    "conversation": "I see you've uploaded a file, but..."
  }
}
```

**This means:**
- The JSON bundle is missing required fields
- Natal geometry or weather section is incomplete
- The report format doesn't match expected structure

## Troubleshooting

### Server not responding
```bash
# Check if dev server is running
curl http://localhost:3000/api/health

# If not, start it
npm run dev
```

### File not found
```bash
# Verify the file exists
ls -lh "reports/Mirror+SymbolicWeather_Weather_Dashboard_dan_2025-11-06_to_2025-11-06 (1).json"

# Check file size (should be several MB)
```

### Invalid JSON response
- Check server logs in the `npm run dev` terminal
- Look for error messages about missing geometry or invalid format
- Verify the report file is valid JSON: `cat reports/... | jq '.' > /dev/null`

### Testing with different files

Edit the script and change the `REPORT_FILE` variable:

```bash
REPORT_FILE="/path/to/your/report.json"
```

## What to Watch For

### In the Response

1. **`ok: true`** - Request succeeded
2. **`intent: "report"`** - Auto-execution triggered correctly
3. **`draft` structure** - Should have FIELD → MAP → VOICE components
4. **`sessionId`** - Session created for future interactions
5. **`probe`** - Resonance check question included

### In Server Logs

Watch the `npm run dev` terminal for:
- `[Auto-Execution]` log entries
- Geometry validation messages
- Any error/warning logs
- API call durations

## Advanced Testing

### Test with custom input

To simulate user sending a question after upload:

```bash
curl -X POST http://localhost:3000/api/raven \
  -H 'Content-Type: application/json' \
  -d '{
    "input": "What does this weather mean for me today?",
    "sessionId": "<session-id-from-previous-response>",
    "options": {
      "reportContexts": [...]
    }
  }'
```

### Test different report types

Change `"type": "mirror"` to:
- `"balance"` - For balance meter reports
- `"weather"` - For weather-only reports

### Validate response structure

```bash
./test-upload-flow.sh | jq '.draft | keys'
# Should show: ["picture", "feeling", "container", "option", "next_step"]
```

## Integration with Frontend

This test exercises the same code path as:

```typescript
// In ChatClient.tsx
const analyzeReportContext = async (reportContext: ReportContext) => {
  await runRavenRequest(
    {
      input: '',  // Empty input triggers auto-execution
      sessionId: sessionId ?? undefined,
      options: {
        reportType: reportContext.type,
        reportContexts: [reportContext]
      }
    },
    placeholderId,
    "Generating complete mirror flow report..."
  );
};
```

The backend sees the same payload structure and follows the same auto-execution logic.
