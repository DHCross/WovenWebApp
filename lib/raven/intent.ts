export type Intent = "geometry" | "report" | "conversation";

const rePlanet = /\b(Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto)\s+in\s+[A-Z][a-z]+\s+\d{1,2}°/;
const reAngles = /\b(ASC|MC)\s+in\s+[A-Z][a-z]+\s+\d{1,2}°/;
const reHouse  = /\b\d+(st|nd|rd|th)\s+House\s+in\s+[A-Z][a-z]+\s+\d{1,2}°/;
const reAspect = /\b(Conjunction|Square|Trine|Sextile|Opposition)\b.*\(Orb:\s*\d{1,2}°/;
const reReport = /\b(run|make|generate|show)\b|\btransit(s)?\b|\bsynastry\b|\bcomposite\b|\brelocat(e|ion)\b|\bfrom\b.*\bto\b/i;

/**
 * Classifies the user's input into one of three lanes:
 * - "geometry": The input contains raw astrological data.
 * - "report": The user is asking to run a report.
 * - "conversation": Everything else.
 */
export function detectIntent(text: string): Intent {
  const t = text.trim();
  const isGeom = rePlanet.test(t) || reAngles.test(t) || reHouse.test(t) || reAspect.test(t);
  if (isGeom) return "geometry";
  if (reReport.test(t)) return "report";
  return "conversation";
}
