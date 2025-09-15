// Centralized UI strings for app-wide reuse
// Keeping these simple constants for now; can evolve to i18n later.

export const APP_NAME = 'Raven Calder';
export const STATUS_CONNECTED = 'Connected';
export const INPUT_PLACEHOLDER = 'Ask or paste here';

// GeoNames UI copy (drop-in)
export const GEONAMES_COPY = {
	tooltip: 'Optional: Add a GeoNames username to stabilize city lookups for natal charts. It’s free and server-only.',
	inlineHelper: 'GeoNames (optional): A free username lets the server resolve birth cities more reliably. If present and you provide city + nation/state, we’ll prefer city-mode; otherwise we fall back to coordinates.',
	settingsDescription: `GeoNames Username (optional, recommended)\nThe server uses this to resolve birth cities and timezones for natal charts. One free GeoNames account for the server is enough — clients do not need their own accounts. When set and you enter city + nation (recommended: include state for US cities), natal processing prefers city-mode. If absent or city details are incomplete, the system falls back to coordinates-only. Adding this will reduce “no aspects returned” errors for natal endpoints.`,
	adminDebugNote: 'With GEONAMES_USERNAME set on the server, natal city-mode becomes reliable. Formation is chosen once per window (city+GeoNames → coords-only → city-only) and is recorded per day under provenanceByDate. If a day returns empty aspects, check provenance first.'
} as const;
