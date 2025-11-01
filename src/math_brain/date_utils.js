/**
 * Generates an array of date strings between a start and end date.
 * @param {string} start - YYYY-MM-DD
 * @param {string} end - YYYY-MM-DD
 * @returns {string[]} An array of date strings.
 */
function generateDateArray(start, end) {
    const dates = [];
    let currentDate = new Date(start + 'T00:00:00Z');
    const endDate = new Date(end + 'T00:00:00Z');
    while (currentDate <= endDate) {
        dates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
}

module.exports = { generateDateArray };
