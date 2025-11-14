# Saved Charts & Session Resume Implementation Guide

## ✅ Completed Features

### 1. Resume from Past Session
**Status**: Implemented
**Files Modified**:
- `app/math-brain/page.tsx`
  - Added `savedSession` and `showSessionResumePrompt` state
  - Added session loading on mount (lines 801-811)
  - Added `loadSavedSession()` function (lines 3167-3196)
  - Added UI banner to display resume prompt (lines 3490-3524)

**How it works**:
- System saves session data to `localStorage` under key `mb.lastSession` after each report generation
- On page load, checks for saved session and displays a banner with "Resume Session" or "Start Fresh" options
- Resume button loads saved settings (mode, dates, relationship context, translocation)
- Person data is NOT restored (for privacy), users must re-enter birth details

### 2. Shared Location Dropdown Fix
**Status**: Fixed
**Files Modified**:
- `app/math-brain/page.tsx` (lines 873-878)

**Fix Applied**:
```typescript
// Automatically enable includePersonB when a relationship type is selected
useEffect(() => {
  if (relationshipType && relationshipType !== 'NONE') {
    setIncludePersonB(true);
  }
}, [relationshipType]);
```

**Result**: Selecting "Partner", "Family", or "Friend" in Relationship Context now automatically enables Person B, which unlocks "Shared Location (custom city)" in the Mode dropdown.

### 3. Saved Charts Library
**Status**: Complete
**Files Created**:
- `lib/saved-charts.ts` - Core library for managing saved charts
- `components/SavedChartsDropdown.tsx` - Reusable dropdown component

**Features**:
- Save chart configurations with custom names
- Load saved charts into form
- Delete saved charts
- Tag charts for organization
- localStorage-based storage (upgradeable to cloud)
- Future-ready for Firebase/Supabase integration

## 🚧 Remaining Implementation Steps

### Step 1: Add SavedChartsDropdown to Math Brain Form

**Location**: `app/math-brain/page.tsx`

**Add import**:
```typescript
import SavedChartsDropdown from "../../components/SavedChartsDropdown";
```

**Add handler function** (around line 3200, after `loadSavedSession`):
```typescript
const loadSavedChart = (chart: SavedChart) => {
  const { person, relationship } = chart;

  // Load person data
  const nextA = { ...personA };
  if (person.name) nextA.name = person.name;
  if (person.year) nextA.year = person.year;
  if (person.month) nextA.month = person.month;
  if (person.day) nextA.day = person.day;
  if (person.hour) nextA.hour = person.hour;
  if (person.minute) nextA.minute = person.minute;
  if (person.city) nextA.city = person.city;
  if (person.state) nextA.state = person.state;
  if (person.latitude) nextA.latitude = person.latitude;
  if (person.longitude) nextA.longitude = person.longitude;
  if (person.timezone) nextA.timezone = person.timezone;
  if (person.zodiac_type) nextA.zodiac_type = person.zodiac_type;
  setPersonA(nextA);

  // Update coordinates display
  if (person.latitude && person.longitude) {
    setACoordsInput(formatDecimal(Number(person.latitude), Number(person.longitude)));
    setACoordsValid(true);
    setACoordsError(null);
  }

  // Load relationship context if present
  if (relationship) {
    if (relationship.type) setRelationshipType(relationship.type);
    if (relationship.intimacy_tier) setRelationshipTier(relationship.intimacy_tier);
    if (relationship.role) setRelationshipRole(relationship.role);
    if (relationship.notes) setRelationshipNotes(relationship.notes);
  }

  setToast(`Loaded: ${chart.name}`);
};

const handleSaveCurrentChart = () => {
  if (!saveChartName.trim()) {
    setToast('Please enter a chart name');
    return;
  }

  try {
    const newChart = saveChart({
      name: saveChartName.trim(),
      person: {
        name: personA.name,
        year: Number(personA.year),
        month: Number(personA.month),
        day: Number(personA.day),
        hour: Number(personA.hour),
        minute: Number(personA.minute),
        city: personA.city,
        state: personA.state,
        latitude: personA.latitude,
        longitude: personA.longitude,
        timezone: personA.timezone,
        zodiac_type: personA.zodiac_type,
      },
      relationship: relationshipType !== 'NONE' ? {
        type: relationshipType,
        intimacy_tier: relationshipTier,
        role: relationshipRole,
        notes: relationshipNotes,
      } : undefined,
    });

    // Refresh saved charts list
    setSavedCharts(getSavedCharts());
    setShowSaveChartModal(false);
    setSaveChartName('');
    setToast(`Saved: ${newChart.name}`);
  } catch (e) {
    setToast('Failed to save chart: ' + String(e));
  }
};
```

**Add UI Component** (in the form, around line 3870, near Person A form fields):
```typescript
{/* Saved Charts Dropdown */}
<div className="mb-6">
  <SavedChartsDropdown
    onSelectChart={loadSavedChart}
    label="Load Saved Chart (Person A)"
    placeholder="Select a saved chart..."
    className=""
  />
</div>
```

**Add Save Chart Button** (near the submit button, around line 4650):
```typescript
<button
  type="button"
  onClick={() => setShowSaveChartModal(true)}
  className="rounded-md border border-indigo-600 bg-indigo-950/20 px-4 py-2 text-sm font-medium text-indigo-300 hover:bg-indigo-900/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
>
  💾 Save Chart Configuration
</button>
```

**Add Save Chart Modal** (at the end of the return statement, before closing `</main>`):
```typescript
{/* Save Chart Modal */}
{showSaveChartModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
    <div className="w-full max-w-md rounded-lg border border-slate-600 bg-slate-900 p-6 shadow-xl">
      <h2 className="text-xl font-semibold text-slate-100 mb-4">Save Chart Configuration</h2>

      <div className="mb-4">
        <label htmlFor="chart-name-input" className="block text-sm text-slate-300 mb-2">
          Chart Name
        </label>
        <input
          id="chart-name-input"
          type="text"
          value={saveChartName}
          onChange={(e) => setSaveChartName(e.target.value)}
          placeholder="e.g., Dan's Natal Chart"
          className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          autoFocus
        />
      </div>

      <div className="mb-4 rounded-md bg-slate-800/50 p-3 text-xs text-slate-300">
        <p className="font-medium mb-1">Will save:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Person: {personA.name || 'Unnamed'}</li>
          <li>Birth: {personA.year}/{personA.month}/{personA.day} {personA.hour}:{String(personA.minute).padStart(2, '0')}</li>
          <li>Location: {personA.city}, {personA.state}</li>
          {relationshipType !== 'NONE' && <li>Relationship: {relationshipType}</li>}
        </ul>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSaveCurrentChart}
          className="flex-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          Save Chart
        </button>
        <button
          type="button"
          onClick={() => {
            setShowSaveChartModal(false);
            setSaveChartName('');
          }}
          className="flex-1 rounded-md border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
```

### Step 2: Add Person B Saved Charts Support

**Add another SavedChartsDropdown** (in the Person B form section):
```typescript
{includePersonB && (
  <div className="mb-6">
    <SavedChartsDropdown
      onSelectChart={(chart) => {
        // Similar to loadSavedChart but for Person B
        const nextB = { ...personB };
        // ... copy logic from loadSavedChart
        setPersonB(nextB);
      }}
      label="Load Saved Chart (Person B)"
      placeholder="Select a saved chart..."
      className=""
    />
  </div>
)}
```

### Step 3: Future Cloud Storage Integration

When ready to implement cloud storage:

1. **Install Firebase/Supabase**:
```bash
npm install firebase
# or
npm install @supabase/supabase-js
```

2. **Update `lib/saved-charts.ts`**:
   - Implement `syncChartsToCloud(userId)`
   - Implement `loadChartsFromCloud(userId)`
   - Add merge logic for offline changes

3. **Add Auth0 user ID**:
   - Pass `userId` from Auth0 session to all chart functions
   - Migrate localStorage charts to cloud on first login

4. **Firestore Schema** (if using Firebase):
```typescript
collection: users/{userId}/saved_charts
document: {
  id: string,
  name: string,
  createdAt: timestamp,
  updatedAt: timestamp,
  person: {
    name: string,
    // ... rest of chart data
  },
  tags: string[]
}
```

## Testing Checklist

- [ ] Resume session banner appears after generating a report
- [ ] "Resume Session" button loads previous settings correctly
- [ ] "Start Fresh" button dismisses the banner
- [ ] Saved charts dropdown shows all saved charts
- [ ] Loading a saved chart populates the form correctly
- [ ] Saving a new chart adds it to the dropdown
- [ ] Deleting a chart removes it from the list
- [ ] Charts persist across page refreshes
- [ ] "Shared Location" option becomes available when Partner is selected

## Known Limitations

1. **Person data in session resume**: Only partial data (name, city, state, timezone) is saved for privacy. Users must re-enter birth details.
2. **localStorage only**: Charts are stored locally. Clearing browser data will delete charts.
3. **No cloud sync yet**: Charts are not synced across devices.
4. **Single user**: Currently no multi-user support (uses localStorage key `woven.savedCharts.local`).

## Migration Path

When adding cloud storage:
1. Detect charts in localStorage
2. Prompt user to "Sync to Cloud"
3. Upload all charts to Firebase/Supabase
4. Keep localStorage as cache for offline access
5. Implement conflict resolution (last-write-wins or manual merge)
