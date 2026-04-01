/**
 * Audit SQL Queries - Per-workspace, loaded from .sql files
 *
 * Template queries live in /queries (project root).
 * Each workspace gets its own copy in data/<workspace-id>/queries/.
 * On first activation, templates are copied to workspace dir.
 *
 * File format:
 *   -- {"key":"acc-01","title":"...","category":"Access Control","description":"..."}
 *   SELECT ...
 */
const fs = require('fs');
const path = require('path');

const TEMPLATE_DIR = path.join(__dirname, '..', 'queries');

function loadFromDir(dir) {
  const queries = {};
  if (!fs.existsSync(dir)) return queries;

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(dir, file), 'utf-8');
      const firstLine = content.split('\n')[0];
      const metaMatch = firstLine.match(/^--\s*(\{.*\})\s*$/);
      if (!metaMatch) continue;

      const meta = JSON.parse(metaMatch[1]);
      const sql = content.substring(firstLine.length + 1).trim();
      const key = meta.key || file.replace('.sql', '');
      queries[key] = {
        title: meta.title || key,
        category: meta.category || 'Uncategorized',
        description: meta.description || '',
        sql,
        file,
      };
    } catch { /* skip bad files */ }
  }
  return queries;
}

/**
 * Ensure workspace has its own queries dir, seeded from templates.
 */
function ensureWorkspaceQueries(workspaceQueriesDir) {
  if (!fs.existsSync(workspaceQueriesDir)) {
    fs.mkdirSync(workspaceQueriesDir, { recursive: true });
    // Copy templates
    if (fs.existsSync(TEMPLATE_DIR)) {
      const files = fs.readdirSync(TEMPLATE_DIR).filter(f => f.endsWith('.sql'));
      for (const file of files) {
        fs.copyFileSync(path.join(TEMPLATE_DIR, file), path.join(workspaceQueriesDir, file));
      }
      console.log(`[AUDIT] Seeded ${files.length} template queries to ${workspaceQueriesDir}`);
    }
  }
}

/**
 * Load audit queries for a workspace.
 * @param {string} workspaceQueriesDir - e.g. data/<ws-id>/queries
 * @returns {Object} queries map
 */
function loadAuditQueries(workspaceQueriesDir) {
  if (workspaceQueriesDir) {
    ensureWorkspaceQueries(workspaceQueriesDir);
    const q = loadFromDir(workspaceQueriesDir);
    console.log(`[AUDIT] Loaded ${Object.keys(q).length} queries from ${workspaceQueriesDir}`);
    return q;
  }
  // Fallback: load from template dir
  const q = loadFromDir(TEMPLATE_DIR);
  console.log(`[AUDIT] Loaded ${Object.keys(q).length} queries from templates`);
  return q;
}

module.exports = { loadAuditQueries, ensureWorkspaceQueries, TEMPLATE_DIR };
