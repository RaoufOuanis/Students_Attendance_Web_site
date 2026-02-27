#!/usr/bin/env node

const path = require('path');
const mysqldump = require('mysqldump');

async function main() {
  const args = process.argv.slice(2);
  const outputArg = args[0] || 'attendance_backup.sql';
  const outputPath = path.resolve(outputArg);

  const connection = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'wifakstif19000',
    database: process.env.DB_NAME || 'attendance'
  };

  try {
    await mysqldump({
      connection,
      dumpToFile: outputPath,
      dump: {
        schema: {
          table: {
            dropIfExist: true
          }
        },
        data: {
          format: true,
          lockTables: false
        }
      }
    });

    console.log(`Export done: ${outputPath}`);
  } catch (err) {
    console.error('Export failed:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

main();
