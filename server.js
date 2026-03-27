#!/usr/bin/env node
/**
 * Jira Collector - Web UI Server
 */
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const expressWs = require('express-ws');
const XLSX = require('xlsx');
const { initSchema, getDb, closeDb } = require('./src/db');
const JiraClient = require('./src/jira-client');
const collectors = require('./src/collectors');
const { QUERIES } = require('./src/queries');
const { AUDIT_QUERIES } = require('./src/audit-queries');

const app = express();
expressWs(app);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── State ──────────────────────────────────────────────
let collectionState = {
  running: false,
  phase: null,
  progress: null,
  log: [],
  startedAt: null,
  error: null,
};
const wsClients = new Set();

function broadcast(msg) {
  const data = JSON.stringify(msg);
  for (const ws of wsClients) {
    try { ws.send(data); } catch { wsClients.delete(ws); }
  }
}

// Intercept console.log during collection to capture logs
function addLog(text) {
  const entry = { time: new Date().toISOString(), text };
  collectionState.log.push(entry);
  // Keep last 500 lines
  if (collectionState.log.length > 500) collectionState.log.shift();
  broadcast({ type: 'log', ...entry });
}

// ── WebSocket ──────────────────────────────────────────
app.ws('/ws', (ws) => {
  wsClients.add(ws);
  // Send current state on connect
  ws.send(JSON.stringify({ type: 'state', state: collectionState }));
  ws.on('close', () => wsClients.delete(ws));
});

// ── Settings API ───────────────────────────────────────
const ENV_PATH = path.join(__dirname, '.env');

app.get('/api/settings', (req, res) => {
  let settings = {
    JIRA_BASE_URL: '',
    JIRA_USERNAME: '',
    JIRA_PASSWORD: '',
    JIRA_PAT: '',
    JIRA_JQL: '',
    PAGE_SIZE: '100',
    DB_PATH: '',
  };

  if (fs.existsSync(ENV_PATH)) {
    const content = fs.readFileSync(ENV_PATH, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.substring(0, eqIdx).trim();
      const val = trimmed.substring(eqIdx + 1).trim();
      if (key in settings) {
        settings[key] = val;
      }
    }
  }

  // Mask password/PAT for display
  const masked = { ...settings };
  if (masked.JIRA_PASSWORD) masked.JIRA_PASSWORD = '••••••••';
  if (masked.JIRA_PAT) masked.JIRA_PAT = '••••••••';

  res.json({ settings: masked, configured: !!settings.JIRA_BASE_URL });
});

app.post('/api/settings', (req, res) => {
  const { JIRA_BASE_URL, JIRA_USERNAME, JIRA_PASSWORD, JIRA_PAT, JIRA_JQL, PAGE_SIZE, DB_PATH } = req.body;

  // Read existing to preserve passwords if masked
  let existing = {};
  if (fs.existsSync(ENV_PATH)) {
    const content = fs.readFileSync(ENV_PATH, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      existing[trimmed.substring(0, eqIdx).trim()] = trimmed.substring(eqIdx + 1).trim();
    }
  }

  const env = {
    JIRA_BASE_URL: JIRA_BASE_URL || '',
    JIRA_USERNAME: JIRA_USERNAME || '',
    JIRA_PASSWORD: (JIRA_PASSWORD && !JIRA_PASSWORD.includes('••')) ? JIRA_PASSWORD : (existing.JIRA_PASSWORD || ''),
    JIRA_PAT: (JIRA_PAT && !JIRA_PAT.includes('••')) ? JIRA_PAT : (existing.JIRA_PAT || ''),
    JIRA_JQL: JIRA_JQL || '',
    PAGE_SIZE: PAGE_SIZE || '100',
    DB_PATH: DB_PATH || '',
  };

  const lines = Object.entries(env)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${v}`);

  fs.writeFileSync(ENV_PATH, lines.join('\n') + '\n');

  // Reload into process.env
  for (const [k, v] of Object.entries(env)) {
    if (v) process.env[k] = v;
  }

  res.json({ ok: true });
});

// ── Test Connection ────────────────────────────────────
app.post('/api/test-connection', async (req, res) => {
  try {
    const client = new JiraClient();
    const info = await client.getServerInfo();
    res.json({ ok: true, info });
  } catch (err) {
    res.json({
      ok: false,
      error: err.response ? `${err.response.status}: ${JSON.stringify(err.response.data).substring(0, 300)}` : err.message,
    });
  }
});

// ── Collection Control ─────────────────────────────────
app.post('/api/collect/start', async (req, res) => {
  if (collectionState.running) {
    return res.status(409).json({ error: 'Collection already running' });
  }

  const { mode } = req.body; // full, issues, meta, audit
  collectionState = {
    running: true,
    phase: 'starting',
    progress: null,
    log: [],
    startedAt: new Date().toISOString(),
    error: null,
    aborted: false,
  };
  broadcast({ type: 'state', state: collectionState });
  res.json({ ok: true });

  // Run collection in background
  runCollection(mode || 'full');
});

app.post('/api/collect/abort', (req, res) => {
  if (!collectionState.running) {
    return res.status(400).json({ error: 'No collection running' });
  }
  collectionState.aborted = true;
  addLog('[USER] Abort requested...');
  broadcast({ type: 'state', state: collectionState });
  res.json({ ok: true });
});

async function runCollection(mode) {
  // Override console.log to capture output
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  console.log = (...args) => { const msg = args.join(' '); originalLog(msg); addLog(msg); };
  console.error = (...args) => { const msg = args.join(' '); originalError(msg); addLog('[ERROR] ' + msg); };
  console.warn = (...args) => { const msg = args.join(' '); originalWarn(msg); addLog('[WARN] ' + msg); };

  try {
    // Re-read .env
    require('dotenv').config({ override: true });

    const db = initSchema();
    const client = new JiraClient();
    const jql = process.env.JIRA_JQL || null;

    const setPhase = (phase) => {
      collectionState.phase = phase;
      broadcast({ type: 'phase', phase });
    };

    if (mode === 'audit') {
      setPhase('audit_log');
      await collectors.collectAuditLog(client);
    } else if (mode === 'issues') {
      setPhase('issues');
      await collectors.collectIssues(client, jql);
    } else if (mode === 'meta') {
      setPhase('metadata');
      await collectors.collectMetadata(client);
      if (collectionState.aborted) throw new Error('Aborted');
      setPhase('projects');
      const projects = await collectors.collectProjects(client);
      if (collectionState.aborted) throw new Error('Aborted');
      setPhase('users');
      await collectors.collectUsers(client);
      if (collectionState.aborted) throw new Error('Aborted');
      setPhase('security');
      await collectors.collectSecurityData(client, projects);
    } else {
      // Full
      setPhase('metadata');
      await collectors.collectMetadata(client);
      if (collectionState.aborted) throw new Error('Aborted');

      setPhase('projects');
      const projects = await collectors.collectProjects(client);
      if (collectionState.aborted) throw new Error('Aborted');

      setPhase('users');
      await collectors.collectUsers(client);
      if (collectionState.aborted) throw new Error('Aborted');

      setPhase('issues');
      await collectors.collectIssues(client, jql);
      if (collectionState.aborted) throw new Error('Aborted');

      setPhase('boards');
      await collectors.collectBoardsAndSprints(client);
      if (collectionState.aborted) throw new Error('Aborted');

      setPhase('security');
      await collectors.collectSecurityData(client, projects);
      if (collectionState.aborted) throw new Error('Aborted');

      setPhase('audit_log');
      await collectors.collectAuditLog(client);
    }

    collectionState.phase = 'completed';
    addLog('Collection completed successfully!');
  } catch (err) {
    collectionState.error = err.message;
    collectionState.phase = 'error';
    addLog(`[FATAL] ${err.message}`);
  } finally {
    collectionState.running = false;
    broadcast({ type: 'state', state: collectionState });
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
  }
}

// ── Query API ──────────────────────────────────────────
app.get('/api/queries', (req, res) => {
  const list = Object.entries(QUERIES).map(([key, q]) => ({ key, title: q.title }));
  res.json(list);
});

app.get('/api/queries/:name', (req, res) => {
  const query = QUERIES[req.params.name];
  if (!query) return res.status(404).json({ error: 'Query not found' });

  try {
    const db = initSchema();
    const rows = db.prepare(query.sql).all();
    res.json({ title: query.title, sql: query.sql.trim(), rows, count: rows.length });
  } catch (err) {
    res.json({ title: query.title, error: err.message, rows: [], count: 0 });
  }
});

app.post('/api/queries/custom', (req, res) => {
  const { sql } = req.body;
  if (!sql) return res.status(400).json({ error: 'SQL required' });

  // Only allow SELECT
  const trimmed = sql.trim().toUpperCase();
  if (!trimmed.startsWith('SELECT') && !trimmed.startsWith('WITH') && !trimmed.startsWith('PRAGMA')) {
    return res.status(400).json({ error: 'Only SELECT/WITH/PRAGMA queries allowed' });
  }

  try {
    const db = initSchema();
    const rows = db.prepare(sql).all();
    res.json({ rows, count: rows.length });
  } catch (err) {
    res.json({ error: err.message, rows: [], count: 0 });
  }
});

// ── Audit Queries API ──────────────────────────────────
app.get('/api/audit-queries', (req, res) => {
  const list = Object.entries(AUDIT_QUERIES).map(([key, q]) => ({
    key, title: q.title, category: q.category, description: q.description,
  }));
  res.json(list);
});

app.get('/api/audit-queries/:name', (req, res) => {
  const query = AUDIT_QUERIES[req.params.name];
  if (!query) return res.status(404).json({ error: 'Query not found' });
  try {
    const db = initSchema();
    const rows = db.prepare(query.sql).all();
    res.json({ title: query.title, description: query.description, category: query.category, sql: query.sql.trim(), rows, count: rows.length });
  } catch (err) {
    res.json({ title: query.title, error: err.message, rows: [], count: 0 });
  }
});

// ── Excel Export ───────────────────────────────────────
app.post('/api/export-excel', (req, res) => {
  const { sql, filename } = req.body;
  if (!sql) return res.status(400).json({ error: 'SQL required' });

  const trimmed = sql.trim().toUpperCase();
  if (!trimmed.startsWith('SELECT') && !trimmed.startsWith('WITH') && !trimmed.startsWith('PRAGMA')) {
    return res.status(400).json({ error: 'Only SELECT queries allowed' });
  }

  try {
    const db = initSchema();
    const rows = db.prepare(sql).all();
    // Remove raw_json column
    const cleaned = rows.map(({ raw_json, ...rest }) => rest);
    const ws = XLSX.utils.json_to_sheet(cleaned);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');

    // Auto-size columns
    if (cleaned.length > 0) {
      const cols = Object.keys(cleaned[0]);
      ws['!cols'] = cols.map(col => {
        const maxLen = Math.max(col.length, ...cleaned.slice(0, 100).map(r => String(r[col] ?? '').length));
        return { wch: Math.min(maxLen + 2, 60) };
      });
    }

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename || 'export'}.xlsx"`);
    res.send(Buffer.from(buf));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export multiple queries to one Excel file (multi-sheet)
app.post('/api/export-excel-multi', (req, res) => {
  const { queries } = req.body; // [{ name, sql, sheetName }]
  if (!queries || !queries.length) return res.status(400).json({ error: 'No queries provided' });

  try {
    const db = initSchema();
    const wb = XLSX.utils.book_new();

    for (const q of queries) {
      try {
        const rows = db.prepare(q.sql).all();
        const cleaned = rows.map(({ raw_json, ...rest }) => rest);
        const ws = XLSX.utils.json_to_sheet(cleaned);
        if (cleaned.length > 0) {
          const cols = Object.keys(cleaned[0]);
          ws['!cols'] = cols.map(col => {
            const maxLen = Math.max(col.length, ...cleaned.slice(0, 100).map(r => String(r[col] ?? '').length));
            return { wch: Math.min(maxLen + 2, 60) };
          });
        }
        // Sheet name max 31 chars
        const sheetName = (q.sheetName || q.name || 'Sheet').substring(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      } catch { /* skip failed queries */ }
    }

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="jira_audit_report.xlsx"');
    res.send(Buffer.from(buf));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DB Stats ───────────────────────────────────────────
app.get('/api/stats', (req, res) => {
  try {
    const db = initSchema();
    const tables = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all();

    const stats = {};
    for (const t of tables) {
      const row = db.prepare(`SELECT COUNT(*) as count FROM "${t.name}"`).get();
      stats[t.name] = row.count;
    }

    // DB file size
    const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'jira_data.db');
    let fileSize = 0;
    if (fs.existsSync(dbPath)) {
      fileSize = fs.statSync(dbPath).size;
    }

    // Last run
    let lastRun = null;
    try {
      lastRun = db.prepare('SELECT * FROM collection_runs ORDER BY id DESC LIMIT 1').get();
    } catch { /* table might not exist */ }

    res.json({ stats, fileSize, lastRun });
  } catch (err) {
    res.json({ stats: {}, error: err.message });
  }
});

// ── DB Tables Schema ───────────────────────────────────
app.get('/api/schema', (req, res) => {
  try {
    const db = initSchema();
    const tables = db.prepare(`
      SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all();
    res.json(tables);
  } catch (err) {
    res.json({ error: err.message });
  }
});

// ── Export ──────────────────────────────────────────────
app.get('/api/export/:table', (req, res) => {
  try {
    const db = initSchema();
    const table = req.params.table.replace(/[^a-zA-Z0-9_]/g, '');
    const format = req.query.format || 'json';
    const rows = db.prepare(`SELECT * FROM "${table}"`).all();

    if (format === 'csv') {
      if (rows.length === 0) return res.status(200).send('');
      const cols = Object.keys(rows[0]).filter(c => c !== 'raw_json');
      const escape = (v) => {
        if (v == null) return '';
        const s = String(v);
        return (s.includes(',') || s.includes('"') || s.includes('\n')) ? '"' + s.replace(/"/g, '""') + '"' : s;
      };
      const csv = [cols.join(','), ...rows.map(r => cols.map(c => escape(r[c])).join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${table}.csv"`);
      res.send(csv);
    } else {
      const cleaned = rows.map(({ raw_json, ...rest }) => rest);
      res.setHeader('Content-Disposition', `attachment; filename="${table}.json"`);
      res.json(cleaned);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start ──────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n  Jira Collector UI: http://localhost:${PORT}\n`);
});
