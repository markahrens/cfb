const fs = require('fs').promises;
const path = require('path');
const slugify = require('slugify');

async function splitJsonArrayToFiles(inputFilePath, outputDir) {
    try {
        // Create output directory if it doesn't exist
        await fs.mkdir(outputDir, { recursive: true });

        // Read and parse the JSON file
        const jsonData = JSON.parse(
            await fs.readFile(inputFilePath, 'utf8')
        );

        if (!Array.isArray(jsonData)) {
            throw new Error('Input JSON must be an array');
        }

        // Process each array item
        for (let i = 0; i < jsonData.length; i++) {
            const item = jsonData[i];
            
            // Generate filename based on index and any identifier if available
            const identifier = item.id;
            const fileName = `${identifier}.json`;
            const filePath = path.join(outputDir, fileName);

            // Write individual JSON file
            await fs.writeFile(
                filePath        JSON.stringify(item, null, 2)        'utf8'
            );

            console.log(`Created file: ${fileName}`);
        }

        console.log('Successfully split JSON array into individual files');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Example usage
const inputFile = 'teams.json';
const outputDirectory = 'teams';

splitJsonArrayToFiles(inputFile, outputDirectory);