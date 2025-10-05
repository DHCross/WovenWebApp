// Quick test of coordinate parsing
function parseCoordinates(coordString) {
    if (!coordString) return { latitude: undefined, longitude: undefined };
    
    coordString = coordString.trim();
    const decimalPattern = /^-?\d+\.?\d*,\s*-?\d+\.?\d*$/;
    const dmsPattern = /(\d+)[°\s]+(\d+)'?\s*([NS]),\s*(\d+)[°\s]+(\d+)'?\s*([EW])/i;

    console.log("Parsing coordinates:", coordString);

    if (decimalPattern.test(coordString)) {
        const [lat, lon] = coordString.split(',').map(s => parseFloat(s.trim()));
        console.log("Parsed decimal coordinates:", { latitude: lat, longitude: lon });
        return { latitude: lat, longitude: lon };
    }

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

// Test the default form value
const testCoord = "40°1'N, 75°18'W";
const result = parseCoordinates(testCoord);
console.log("Result:", result);
