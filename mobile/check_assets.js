const fs = require('fs');
const path = require('path');

const files = ['icon.png', 'adaptive-icon.png', 'splash-icon.png', 'favicon.png'];
const assetsDir = path.join(__dirname, 'assets');

files.forEach(file => {
    const filePath = path.join(assetsDir, file);
    if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        const header = buffer.slice(0, 8).toString('hex');
        console.log(`${file}: ${header}`);
        // PNG header: 89 50 4e 47 0d 0a 1a 0a
        if (header === '89504e470d0a1a0a') {
            console.log(`${file} is a valid PNG header.`);
        } else {
            console.log(`${file} is NOT a valid PNG header!`);
        }
    } else {
        console.log(`${file} does not exist.`);
    }
});
