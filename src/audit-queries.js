/**
 * Audit SQL Queries - Loaded from individual .sql files in /queries directory
 *
 * Each .sql file has metadata as a JSON comment on the first line:
 *   -- {"key":"acc-01-inactive-users","title":"...","category":"Access Control","description":"..."}
 *   SELECT ...
 *
 * To add a new query: create a new .sql file in /queries with the metadata comment.
 * To edit: modify the .sql file directly. Changes take effect on server restart.
 */
const fs = require('fs');
const path = require('path');

const QUERIES_DIR = path.join(__dirname, '..', 'queries');

function loadAuditQueries() {
  const queries = {};

  if (!fs.existsSync(QUERIES_DIR)) {
    console.warn('[AUDIT] Queries directory not found:', QUERIES_DIR);
    return queries;
  }

  const files = fs.readdirSync(QUERIES_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(QUERIES_DIR, file), 'utf-8');
      const firstLine = content.split('\n')[0];

      // Parse metadata from first line: -- { ... }
      const metaMatch = firstLine.match(/^--\s*(\{.*\})\s*$/);
      if (!metaMatch) {
        console.warn(`[AUDIT] Skipping ${file}: no metadata comment on first line`);
        continue;
      }

      const meta = JSON.parse(metaMatch[1]);
      const sql = content.substring(firstLine.length + 1).trim();

      const key = meta.key || file.replace('.sql', '');
      queries[key] = {
        title: meta.title || key,
        category: meta.category || 'Uncategorized',
        description: meta.description || '',
        sql,
      };
    } catch (err) {
      console.warn(`[AUDIT] Error loading ${file}:`, err.message);
    }
  }

  console.log(`[AUDIT] Loaded ${Object.keys(queries).length} queries from ${QUERIES_DIR}`);
  return queries;
}

const AUDIT_QUERIES = loadAuditQueries();

module.exports = { AUDIT_QUERIES };
