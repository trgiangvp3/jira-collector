/**
 * Export data from SQLite to CSV/JSON for reporting
 * Usage: node src/export.js [format] [output-dir]
 *   format: csv | json (default: csv)
 *   output-dir: directory to write files (default: ./export)
 */
require('dotenv').config();
const { getDb, initSchema, closeDb } = require('./db');
const fs = require('fs');
const path = require('path');

const CLI_WORKSPACE_ID = '__cli_export__';

const EXPORT_TABLES = [
  'projects', 'issues', 'users', 'comments', 'worklogs',
  'changelogs', 'changelog_items', 'attachments', 'issue_links',
  'custom_field_values', 'groups', 'group_members',
  'project_role_members', 'permission_schemes', 'security_schemes',
  'boards', 'sprints', 'audit_log', 'filters', 'dashboards',
];

function escapeCsv(value) {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function exportTable(db, table, format, outputDir) {
  const rows = db.prepare(`SELECT * FROM ${table}`).all();
  if (rows.length === 0) {
    console.log(`  [SKIP] ${table} (empty)`);
    return;
  }

  const filePath = path.join(outputDir, `${table}.${format}`);

  if (format === 'json') {
    // Exclude raw_json column for cleaner output
    const cleaned = rows.map(row => {
      const { raw_json, ...rest } = row;
      return rest;
    });
    fs.writeFileSync(filePath, JSON.stringify(cleaned, null, 2));
  } else {
    // CSV
    const columns = Object.keys(rows[0]).filter(c => c !== 'raw_json');
    const header = columns.map(escapeCsv).join(',');
    const lines = rows.map(row => columns.map(c => escapeCsv(row[c])).join(','));
    fs.writeFileSync(filePath, [header, ...lines].join('\n'), 'utf-8');
  }

  console.log(`  [OK] ${table} -> ${filePath} (${rows.length} rows)`);
}

async function exportAll(format = 'csv', outputDir = './export') {
  const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'jira_data.db');
  const db = await initSchema(CLI_WORKSPACE_ID, dbPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`\nExporting to ${format.toUpperCase()} -> ${path.resolve(outputDir)}\n`);

  for (const table of EXPORT_TABLES) {
    try {
      exportTable(db, table, format, outputDir);
    } catch (err) {
      console.log(`  [ERR] ${table}: ${err.message}`);
    }
  }

  // Also export query results
  const { QUERIES } = require('./queries');
  const queriesDir = path.join(outputDir, 'queries');
  if (!fs.existsSync(queriesDir)) {
    fs.mkdirSync(queriesDir, { recursive: true });
  }

  console.log('\nExporting query results...\n');
  for (const [name, query] of Object.entries(QUERIES)) {
    try {
      const rows = db.prepare(query.sql).all();
      if (rows.length === 0) continue;

      const filePath = path.join(queriesDir, `${name}.${format}`);
      if (format === 'json') {
        fs.writeFileSync(filePath, JSON.stringify(rows, null, 2));
      } else {
        const columns = Object.keys(rows[0]);
        const header = columns.map(escapeCsv).join(',');
        const lines = rows.map(row => columns.map(c => escapeCsv(row[c])).join(','));
        fs.writeFileSync(filePath, [header, ...lines].join('\n'), 'utf-8');
      }
      console.log(`  [OK] ${name} -> ${filePath} (${rows.length} rows)`);
    } catch (err) {
      console.log(`  [ERR] ${name}: ${err.message}`);
    }
  }

  closeDb(CLI_WORKSPACE_ID);
  console.log('\nExport complete!');
}

if (require.main === module) {
  const format = process.argv[2] || 'csv';
  const outputDir = process.argv[3] || './export';
  exportAll(format, outputDir).catch(err => console.error(err));
}

module.exports = { exportAll };
