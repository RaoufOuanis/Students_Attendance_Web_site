#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const XLSX = require('xlsx');

function printUsage() {
  console.log('Usage: npm run csv:import-mylist -- <input.csv> [--truncate]');
  console.log('Env:   DB_HOST, DB_USER, DB_PASSWORD, DB_NAME (default DB_NAME=attendance)');
}

function simplifyKey(key) {
  return String(key || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function pickValue(obj, candidates) {
  const keys = Object.keys(obj);
  const simplifiedMap = new Map(keys.map((k) => [simplifyKey(k), k]));
  for (const c of candidates) {
    const found = simplifiedMap.get(simplifyKey(c));
    if (found) return obj[found];
  }
  return '';
}

function normalizeRow(r) {
  // Supports the CSV headers you have: Nom, Prénom, N d'inscription, ClassID
  const surname = pickValue(r, ['Nom', 'surname', 'last', 'lastname']).toString().trim();
  const name = pickValue(r, ['Prénom', 'Prenom', 'name', 'first', 'firstname']).toString().trim();
  const StudentIdL = pickValue(r, ["N d'inscription", "N d\"inscription", 'N inscription', 'inscription', 'matricule', 'id', 'StudentIdL', 'studentId']).toString().trim();
  return { name, surname, StudentIdL };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1 || args.includes('-h') || args.includes('--help')) {
    printUsage();
    process.exit(args.length < 1 ? 1 : 0);
  }

  const inputPath = path.resolve(args[0]);
  const truncate = args.includes('--truncate');

  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(2);
  }

  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'wifakstif19000',
    database: process.env.DB_NAME || 'attendance'
  };

  let connection;
  try {
    // XLSX can read CSV reliably (handles commas/quotes better than a naive split)
    const workbook = XLSX.readFile(inputPath, { raw: false });
    const sheetName = workbook.SheetNames[0];
    const ws = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
    if (!Array.isArray(rows) || rows.length === 0) {
      console.error('No rows found in CSV.');
      process.exit(3);
    }

    const normalized = rows
      .map(normalizeRow)
      .filter((r) => r.StudentIdL && r.StudentIdL.length > 0);

    if (normalized.length === 0) {
      console.error('No valid StudentIdL values found in CSV.');
      process.exit(4);
    }

    connection = await mysql.createConnection(dbConfig);

    if (truncate) {
      try {
        await connection.execute('TRUNCATE TABLE mylist');
      } catch (e) {
        // Common on existing schemas: other tables reference mylist via foreign keys.
        // In that case, fall back to syncing rows (update/insert) without truncating.
        console.warn('Warning: TRUNCATE TABLE mylist failed (likely FK constraint). Falling back to sync mode.');
      }
    }

    let inserted = 0;
    let updated = 0;

    await connection.beginTransaction();

    // Sync strategy (does not require UNIQUE constraints):
    // 1) UPDATE by StudentIdL
    // 2) If no row updated, INSERT
    for (const r of normalized) {
      const [updateResult] = await connection.execute(
        'UPDATE mylist SET name = ?, surname = ? WHERE StudentIdL = ?',
        [r.name, r.surname, r.StudentIdL]
      );

      const affected = updateResult?.affectedRows ?? 0;
      if (affected > 0) {
        updated += affected;
        continue;
      }

      const [insertResult] = await connection.execute(
        'INSERT INTO mylist (name, surname, StudentIdL) VALUES (?, ?, ?)',
        [r.name, r.surname, r.StudentIdL]
      );
      inserted += insertResult?.affectedRows ?? 0;
    }

    await connection.commit();

    console.log(`CSV: ${inputPath}`);
    console.log(`Rows read: ${rows.length}`);
    console.log(`Valid IDs: ${normalized.length}`);
    console.log(`Inserted: ${inserted}`);
    console.log(`Updated: ${updated}`);
    if (truncate) console.log('Mode: TRUNCATE (best effort) then sync');
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        // ignore
      }
    }

    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      console.error('Table mylist does not exist in the selected database.');
      console.error('Create it first, or set DB_NAME to the right database.');
      process.exit(5);
    }

    console.error('Import failed:', err && err.message ? err.message : err);
    process.exit(6);
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch {
        // ignore
      }
    }
  }
}

main();
