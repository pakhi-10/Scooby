const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const dir = 'src/lib/data/mid-sem-2026-spring';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx') && !f.startsWith('~$'));
const file = path.join(dir, files[0]);
const workbook = XLSX.readFile(file);
const sheet = workbook.Sheets[workbook.SheetNames[0]];

// Simulate the exact parsing the server does
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('Row 0 length:', data[0].length);
console.log('Row 1 length:', data[1].length);
console.log();

console.log('=== Row 0 (dates) via sheet_to_json ===');
data[0].forEach((val, i) => console.log(i + ':', val));

console.log();
console.log('=== Row 1 (times) via sheet_to_json ===');
data[1].forEach((val, i) => console.log(i + ':', val));

console.log();
console.log('=== Simulating column parsing ===');
const datesRow = data[0];
const timesRow = data[1];

for (let col = 0; col < timesRow.length; col++) {
    const dateVal = datesRow[col];
    const timeVal = timesRow[col];
    
    if (typeof timeVal !== 'number') {
        console.log('Col ' + col + ': SKIPPED (no time value)');
        continue;
    }
    
    let dateSerial = null;
    if (typeof dateVal === 'number' && dateVal > 40000) {
        dateSerial = dateVal;
    } else {
        for (let i = col - 1; i >= 0; i--) {
            if (typeof datesRow[i] === 'number' && datesRow[i] > 40000) {
                dateSerial = datesRow[i];
                break;
            }
        }
    }
    
    console.log('Col ' + col + ': timeVal=' + timeVal + ', dateSerial=' + dateSerial);
}
