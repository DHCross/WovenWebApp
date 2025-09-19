/**
 * Placeholder function to normalize parsed geometry data into the
 * standard internal format (points, houses, drivers).
 * @param parsedData The data from a parser.
 * @returns A standardized geometry object.
 */
export function normalizeGeometry(parsedData: Record<string, any>): Record<string, any> {
  console.log("Normalizing geometry...");
  return {
    points: [],
    houses: [],
    drivers: [],
    normalizedFrom: parsedData,
  };
}
