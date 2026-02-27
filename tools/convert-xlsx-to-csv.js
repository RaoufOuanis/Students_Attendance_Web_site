#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

function printUsage() {
  const cmd = 'npm run xlsx:to-csv -- <input.xlsx> [output.csv] [sheet]';
  console.log(`Usage: ${cmd}`);
  console.log('  <input.xlsx>   Path to .xlsx/.xls file');
  console.log('  [output.csv]   Optional output path (default: same name .csv next to input)');
  console.log('  [sheet]        Optional sheet name or 0-based index (default: first sheet)');
}

function resolveSheet(workbook, sheetArg) {
  if (sheetArg === undefined || sheetArg === null || sheetArg === '') {
    return workbook.SheetNames[0];
  }

  const asNumber = Number(sheetArg);
  if (!Number.isNaN(asNumber) && Number.isFinite(asNumber)) {
    const idx = Math.trunc(asNumber);
    if (idx < 0 || idx >= workbook.SheetNames.length) {
      throw new Error(`Sheet index out of range: ${idx}`);
    }
    return workbook.SheetNames[idx];
  }

  if (!workbook.SheetNames.includes(sheetArg)) {
    throw new Error(`Sheet not found: ${sheetArg}`);
  }
  return sheetArg;
}

function quoteCsv(value) {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

(async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1 || args.includes('-h') || args.includes('--help')) {
    printUsage();
    process.exit(args.length < 1 ? 1 : 0);
  }

  const inputPath = path.resolve(args[0]);
  const outputPath = path.resolve(args[1] || inputPath.replace(/\.(xlsx|xls)$/i, '') + '.csv');
  const sheetArg = args[2];

  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(2);
  }

  try {
    const workbook = XLSX.readFile(inputPath, { cellDates: true });
    const sheetName = resolveSheet(workbook, sheetArg);
    const worksheet = workbook.Sheets[sheetName];

    // Produce a clean CSV (no dozens of trailing empty columns).
    // Default behavior: if the sheet has more than 4 columns, export only A-D.
    const ref = worksheet['!ref'];
    if (!ref) throw new Error('Worksheet is empty');
    const range = XLSX.utils.decode_range(ref);
    const lastRow = range.e.r;
    const maxCol = range.e.c;

    let csv;
    if (maxCol > 3) {
      const trimmedRange = { s: { c: 0, r: 0 }, e: { c: 3, r: lastRow } };
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false, range: trimmedRange });
      csv = rows.map((row) => row.slice(0, 4).map(quoteCsv).join(',')).join('\n');
    } else {
      csv = XLSX.utils.sheet_to_csv(worksheet, {
        FS: ',',
        RS: '\n',
        blankrows: false
      });
    }

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, csv, 'utf8');

    console.log(`Converted: ${inputPath}`);
    console.log(`Sheet: ${sheetName}`);
    console.log(`Output: ${outputPath}`);
  } catch (err) {
    console.error('Conversion failed:', err && err.message ? err.message : err);
    process.exit(3);
  }
})();
