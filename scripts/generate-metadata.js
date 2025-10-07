// scripts/generate-metadata.js
const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = './templates';
const OUTPUT_FILE = './templates-metadata.json';

function scanTemplatesDirectory(dir) {
    const templates = {};
    
    const categories = fs.readdirSync(dir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    
    categories.forEach(category => {
        const categoryPath = path.join(dir, category);
        
        const files = fs.readdirSync(categoryPath)
            .filter(file => file.endsWith('.md'))
            .sort();

        templates[category] = files;
    });
    
    return templates;
}

function enrichMetadata(templates) {
    const metadata = {
        lastUpdated: new Date().toISOString(),
        totalTemplates: 0,
        categories: {}
    };
    
    Object.entries(templates).forEach(([category, files]) => {
        metadata.totalTemplates += files.length;
        metadata.categories[category] = {
            count: files.length,
            files: files
        };
    });
    
    return metadata;
}

function generateMetadata() {
    try {
        console.log('🔍 Scanning templates directory...');
        
        if (!fs.existsSync(TEMPLATES_DIR)) {
            console.error(`❌ Templates directory not found: ${TEMPLATES_DIR}`);
            process.exit(1);
        }
        
        const templates = scanTemplatesDirectory(TEMPLATES_DIR);
        
        const metadata = enrichMetadata(templates);
        
        fs.writeFileSync(
            OUTPUT_FILE,
            JSON.stringify(metadata, null, 2),
            'utf8'
        );
        
        
    } catch (error) {
        console.error('❌ Error generating metadata:', error);
        process.exit(1);
    }
}

// Run
generateMetadata();