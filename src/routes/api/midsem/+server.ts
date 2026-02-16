import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as XLSX from 'xlsx';
import type { Exam } from '$lib/types';

// Import data files from mid-sem folder
const dataFiles = import.meta.glob('$lib/data/mid-sem-2026-spring/*.{xlsx,xls}', { query: '?url', import: 'default', eager: true });

export const GET: RequestHandler = async ({ fetch }) => {
    try {
        const filePaths = Object.keys(dataFiles);
        if (filePaths.length === 0) {
            return json({ error: 'No exam timetable file found in src/lib/data/mid-sem-2026-spring/' }, { status: 404 });
        }

        // Filter out temp files (starting with ~$)
        const validFiles = filePaths.filter(f => !f.includes('~$'));
        const xlsxFile = validFiles.find(f => f.endsWith('.xlsx') || f.endsWith('.xls'));

        if (!xlsxFile) {
            return json({ error: 'No supported file found.' }, { status: 404 });
        }

        const url = dataFiles[xlsxFile] as string;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch data file: ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Parse the exam timetable format
        const exams = parseExamTimetable(worksheet);

        return json({ exams }, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
        });
    } catch (error) {
        console.error('Error loading exam timetable:', error);
        return json({ error: 'Failed to load exam timetable: ' + String(error) }, { status: 500 });
    }
};

function excelDateToString(serial: number): string {
    // Excel dates are days since December 30, 1899
    const date = new Date((serial - 25569) * 86400 * 1000);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
}

function excelTimeToString(fraction: number): string {
    const totalMinutes = Math.round(fraction * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const h = hours % 12 || 12;
    const ampm = hours < 12 ? 'AM' : 'PM';
    return `${h}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

function getDayOfWeek(serial: number): string {
    const date = new Date((serial - 25569) * 86400 * 1000);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
}

function parseExamTimetable(worksheet: XLSX.WorkSheet): Exam[] {
    const exams: Exam[] = [];

    // Convert to array format
    const data = XLSX.utils.sheet_to_json<(string | number | null)[]>(worksheet, { header: 1 });
    
    if (data.length < 3) return exams;

    // Row 0: Dates (Excel serial numbers)
    // Row 1: Times (decimal fractions like 0.395833 for 9:30 AM)
    // Row 2+: Course codes
    
    const datesRow = data[0] as (number | null)[];
    const timesRow = data[1] as (number | null)[];

    // Build column info: each column has a date + time
    interface ColumnInfo {
        col: number;
        date: string;
        dateSerial: number;
        day: string;
        time: string;
        slot: 'morning' | 'afternoon';
    }

    const columns: ColumnInfo[] = [];

    // Loop over timesRow length since dates row may be shorter (sparse)
    const maxCol = Math.max(datesRow.length, timesRow.length);
    for (let col = 0; col < maxCol; col++) {
        const dateVal = datesRow[col];
        const timeVal = timesRow[col];

        // Skip if no time value (meaning this column isn't valid)
        if (typeof timeVal !== 'number') continue;

        // Find the date - either in this column or look back to first non-null date
        let dateSerial: number | null = null;
        if (typeof dateVal === 'number' && dateVal > 40000) {
            dateSerial = dateVal;
        } else {
            // Look back to find the date (date is only in first column of each day)
            for (let i = col - 1; i >= 0; i--) {
                if (typeof datesRow[i] === 'number' && (datesRow[i] as number) > 40000) {
                    dateSerial = datesRow[i] as number;
                    break;
                }
            }
        }

        if (dateSerial === null) continue;

        const dateStr = excelDateToString(dateSerial);
        const dayStr = getDayOfWeek(dateSerial);
        const timeStr = excelTimeToString(timeVal);
        
        // Determine slot based on time (before noon = morning, after = afternoon)
        const slot: 'morning' | 'afternoon' = timeVal < 0.5 ? 'morning' : 'afternoon';

        columns.push({
            col,
            date: dateStr,
            dateSerial,
            day: dayStr,
            time: timeStr,
            slot
        });
    }

    // Process data rows (starting from row 2, index 2)
    for (let row = 2; row < data.length; row++) {
        const rowData = data[row] as (string | null)[];
        
        for (const colInfo of columns) {
            const cellValue = rowData[colInfo.col];
            
            if (cellValue && typeof cellValue === 'string' && cellValue.trim()) {
                const courseCode = cellValue.trim();
                
                exams.push({
                    courseCode,
                    date: colInfo.date,
                    day: colInfo.day,
                    time: colInfo.time,
                    slot: colInfo.slot
                });
            }
        }
    }

    return exams;
}
