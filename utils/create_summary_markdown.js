const fs = require('fs');
const path = require('path');

/**
 * Extracts daily readings from a weather log JSON and creates a Markdown summary table.
 * @param {string} inputJsonPath - Path to the input weather log JSON file.
 * @param {string} outputMarkdownPath - Path to the output Markdown file.
 */
function createWeatherSummaryMarkdown(inputJsonPath, outputMarkdownPath) {
    console.log(`Reading data from: ${inputJsonPath}`);
    let rawData;
    try {
        rawData = fs.readFileSync(inputJsonPath, 'utf8');
    } catch (error) {
        console.error(`Error reading file from disk: ${inputJsonPath}`, error);
        process.exit(1);
    }

    let weatherLog;
    try {
        weatherLog = JSON.parse(rawData);
    } catch (error) {
        console.error(`Error parsing JSON data from file: ${inputJsonPath}`, error);
        process.exit(1);
    }

    const dailyReadings = weatherLog.daily_readings;

    if (!dailyReadings || !Array.isArray(dailyReadings)) {
        console.error('Could not find a valid `daily_readings` array in the JSON file.');
        process.exit(1);
    }

    // Create Markdown Table Header
    let markdownTable = '| Date       | Magnitude | Directional Bias | Volatility |\n';
    markdownTable += '|------------|-----------|------------------|------------|\n';

    // Create Markdown Table Rows
    for (const day of dailyReadings) {
        const date = day.date || 'N/A';
        const magnitude = day.magnitude !== undefined ? day.magnitude.toFixed(1) : 'N/A';
        const bias = day.directional_bias !== undefined ? day.directional_bias.toFixed(1) : 'N/A';
        const volatility = day.volatility !== undefined ? day.volatility.toFixed(1) : 'N/A';
        markdownTable += `| ${date} | ${magnitude.padEnd(9)} | ${bias.padEnd(16)} | ${volatility.padEnd(10)} |\n`;
    }
    
    const outputDir = path.dirname(outputMarkdownPath);
    if (!fs.existsSync(outputDir)){
        fs.mkdirSync(outputDir, { recursive: true });
    }

    try {
        fs.writeFileSync(outputMarkdownPath, markdownTable);
        console.log(`Successfully created Markdown summary at: ${outputMarkdownPath}`);
    } catch (error) {
        console.error(`Error writing Markdown file to disk: ${outputMarkdownPath}`, error);
        process.exit(1);
    }
}

// --- Main Execution ---
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length !== 2) {
        console.log('Usage: node create_summary_markdown.js <input_json_path> <output_markdown_path>');
        process.exit(1);
    }

    const [inputPath, outputPath] = args;
    createWeatherSummaryMarkdown(inputPath, outputPath);
}

module.exports = createWeatherSummaryMarkdown;
