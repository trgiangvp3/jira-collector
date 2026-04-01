/**
 * Workspace Manager - manages multiple Jira server connections
 * Each workspace has its own config and SQLite database.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const WORKSPACES_FILE = path.join(__dirname, '..', 'workspaces.json');
const DATA_DIR = path.join(__dirname, '..', 'data');

function generateId() {
  return 'ws-' + crypto.randomBytes(4).toString('hex');
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Load workspaces from disk. On first run, migrate from .env if present.
 */
function load() {
  if (fs.existsSync(WORKSPACES_FILE)) {
    const raw = fs.readFileSync(WORKSPACES_FILE, 'utf-8');
    return JSON.parse(raw);
  }

  // First run: check for .env migration
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    return migrateFromEnv(envPath);
  }

  // No workspaces at all
  const empty = { activeId: null, workspaces: {} };
  save(empty);
  return empty;
}

/**
 * Migrate existing .env into a default workspace
 */
function migrateFromEnv(envPath) {
  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    env[trimmed.substring(0, eqIdx).trim()] = trimmed.substring(eqIdx + 1).trim();
  }

  const id = generateId();
  ensureDataDir();
  const dbPath = path.join('data', `${id}.db`);

  const workspace = {
    id,
    name: env.JIRA_BASE_URL ? `Migrated (${new URL(env.JIRA_BASE_URL).hostname})` : 'Default Workspace',
    JIRA_BASE_URL: env.JIRA_BASE_URL || '',
    JIRA_USERNAME: env.JIRA_USERNAME || '',
    JIRA_PASSWORD: env.JIRA_PASSWORD || '',
    JIRA_PAT: env.JIRA_PAT || '',
    JIRA_JQL: env.JIRA_JQL || '',
    PAGE_SIZE: env.PAGE_SIZE || '100',
    DB_PATH: dbPath,
  };

  // If there was an existing DB file, copy it to the workspace path
  const oldDbPath = env.DB_PATH || path.join(process.cwd(), 'jira_data.db');
  const newDbFullPath = path.resolve(path.join(__dirname, '..'), dbPath);
  if (fs.existsSync(oldDbPath) && oldDbPath !== newDbFullPath) {
    try {
      fs.copyFileSync(oldDbPath, newDbFullPath);
      console.log(`[WS] Migrated existing DB to ${newDbFullPath}`);
    } catch (err) {
      console.warn(`[WS] Could not copy old DB: ${err.message}`);
    }
  }

  const data = {
    activeId: id,
    workspaces: { [id]: workspace },
  };
  save(data);
  console.log(`[WS] Migrated .env into workspace "${workspace.name}" (${id})`);
  return data;
}

function save(data) {
  fs.writeFileSync(WORKSPACES_FILE, JSON.stringify(data, null, 2));
}

// ── CRUD API ──

function list() {
  const data = load();
  return { activeId: data.activeId, workspaces: Object.values(data.workspaces) };
}

function get(id) {
  const data = load();
  return data.workspaces[id] || null;
}

function create(config) {
  const data = load();
  const id = generateId();
  ensureDataDir();
  const dbPath = config.DB_PATH || path.join('data', `${id}.db`);

  const workspace = {
    id,
    name: config.name || 'New Workspace',
    JIRA_BASE_URL: config.JIRA_BASE_URL || '',
    JIRA_USERNAME: config.JIRA_USERNAME || '',
    JIRA_PASSWORD: config.JIRA_PASSWORD || '',
    JIRA_PAT: config.JIRA_PAT || '',
    JIRA_JQL: config.JIRA_JQL || '',
    PAGE_SIZE: config.PAGE_SIZE || '100',
    DB_PATH: dbPath,
  };

  data.workspaces[id] = workspace;
  // If no active workspace, set this one as active
  if (!data.activeId) {
    data.activeId = id;
  }
  save(data);
  return workspace;
}

function update(id, config) {
  const data = load();
  if (!data.workspaces[id]) return null;

  const existing = data.workspaces[id];
  data.workspaces[id] = {
    ...existing,
    name: config.name !== undefined ? config.name : existing.name,
    JIRA_BASE_URL: config.JIRA_BASE_URL !== undefined ? config.JIRA_BASE_URL : existing.JIRA_BASE_URL,
    JIRA_USERNAME: config.JIRA_USERNAME !== undefined ? config.JIRA_USERNAME : existing.JIRA_USERNAME,
    JIRA_PASSWORD: config.JIRA_PASSWORD !== undefined ? config.JIRA_PASSWORD : existing.JIRA_PASSWORD,
    JIRA_PAT: config.JIRA_PAT !== undefined ? config.JIRA_PAT : existing.JIRA_PAT,
    JIRA_JQL: config.JIRA_JQL !== undefined ? config.JIRA_JQL : existing.JIRA_JQL,
    PAGE_SIZE: config.PAGE_SIZE !== undefined ? config.PAGE_SIZE : existing.PAGE_SIZE,
    DB_PATH: existing.DB_PATH, // DB_PATH is immutable after creation
  };
  save(data);
  return data.workspaces[id];
}

function remove(id) {
  const data = load();
  if (!data.workspaces[id]) return false;

  // Optionally delete DB file
  const ws = data.workspaces[id];
  const dbFullPath = path.resolve(path.join(__dirname, '..'), ws.DB_PATH);
  if (fs.existsSync(dbFullPath)) {
    try { fs.unlinkSync(dbFullPath); } catch { /* ignore */ }
  }

  delete data.workspaces[id];
  if (data.activeId === id) {
    const remaining = Object.keys(data.workspaces);
    data.activeId = remaining.length > 0 ? remaining[0] : null;
  }
  save(data);
  return true;
}

function getActive() {
  const data = load();
  if (!data.activeId) return null;
  return data.workspaces[data.activeId] || null;
}

function setActive(id) {
  const data = load();
  if (!data.workspaces[id]) return false;
  data.activeId = id;
  save(data);
  return true;
}

function getActiveId() {
  const data = load();
  return data.activeId;
}

/**
 * Resolve the full absolute path for a workspace's DB_PATH
 */
function resolveDbPath(ws) {
  return path.resolve(path.join(__dirname, '..'), ws.DB_PATH);
}

module.exports = {
  load,
  list,
  get,
  create,
  update,
  remove,
  getActive,
  setActive,
  getActiveId,
  resolveDbPath,
  ensureDataDir,
  DATA_DIR,
};
