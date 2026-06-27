require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../src/config/db');

async function run() {
  const target = process.argv[2];

  const files = fs
    .readdirSync(__dirname)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const toRun = target ? files.filter((f) => f === target) : files;

  if (toRun.length === 0) {
    console.error(`No migration file found${target ? `: ${target}` : ''}`);
    process.exit(1);
  }

  for (const file of toRun) {
    const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
    await pool.query(sql);
    console.log(`Migration applied: ${file}`);
  }

  await pool.end();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
