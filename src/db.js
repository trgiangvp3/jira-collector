const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'jira_data.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initSchema() {
  const db = getDb();

  db.exec(`
    -- Metadata: track collection runs
    CREATE TABLE IF NOT EXISTS collection_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      status TEXT DEFAULT 'running',
      jql_filter TEXT,
      total_issues INTEGER DEFAULT 0,
      notes TEXT
    );

    -- Projects
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      name TEXT,
      description TEXT,
      project_type TEXT,
      lead_account_id TEXT,
      lead_display_name TEXT,
      url TEXT,
      archived INTEGER DEFAULT 0,
      raw_json TEXT,
      collected_at TEXT DEFAULT (datetime('now'))
    );

    -- Project components
    CREATE TABLE IF NOT EXISTS components (
      id INTEGER PRIMARY KEY,
      project_key TEXT NOT NULL,
      name TEXT,
      description TEXT,
      lead_display_name TEXT,
      assignee_type TEXT,
      raw_json TEXT
    );

    -- Project versions
    CREATE TABLE IF NOT EXISTS versions (
      id INTEGER PRIMARY KEY,
      project_key TEXT NOT NULL,
      name TEXT,
      description TEXT,
      released INTEGER DEFAULT 0,
      archived INTEGER DEFAULT 0,
      release_date TEXT,
      start_date TEXT,
      raw_json TEXT
    );

    -- Users
    CREATE TABLE IF NOT EXISTS users (
      account_key TEXT PRIMARY KEY,
      username TEXT,
      display_name TEXT,
      email TEXT,
      active INTEGER DEFAULT 1,
      time_zone TEXT,
      raw_json TEXT,
      collected_at TEXT DEFAULT (datetime('now'))
    );

    -- Issue types
    CREATE TABLE IF NOT EXISTS issue_types (
      id TEXT PRIMARY KEY,
      name TEXT,
      description TEXT,
      subtask INTEGER DEFAULT 0,
      raw_json TEXT
    );

    -- Statuses
    CREATE TABLE IF NOT EXISTS statuses (
      id TEXT PRIMARY KEY,
      name TEXT,
      description TEXT,
      category_key TEXT,
      category_name TEXT,
      raw_json TEXT
    );

    -- Priorities
    CREATE TABLE IF NOT EXISTS priorities (
      id TEXT PRIMARY KEY,
      name TEXT,
      description TEXT,
      raw_json TEXT
    );

    -- Resolutions
    CREATE TABLE IF NOT EXISTS resolutions (
      id TEXT PRIMARY KEY,
      name TEXT,
      description TEXT,
      raw_json TEXT
    );

    -- Custom field definitions
    CREATE TABLE IF NOT EXISTS custom_field_definitions (
      id TEXT PRIMARY KEY,
      name TEXT,
      description TEXT,
      type TEXT,
      raw_json TEXT
    );

    -- Issues (main table)
    CREATE TABLE IF NOT EXISTS issues (
      id INTEGER PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      project_key TEXT,
      issue_type_id TEXT,
      issue_type_name TEXT,
      status_id TEXT,
      status_name TEXT,
      status_category TEXT,
      priority_id TEXT,
      priority_name TEXT,
      resolution_id TEXT,
      resolution_name TEXT,
      summary TEXT,
      description TEXT,
      environment TEXT,
      labels TEXT, -- JSON array
      components TEXT, -- JSON array
      fix_versions TEXT, -- JSON array
      affects_versions TEXT, -- JSON array
      assignee_key TEXT,
      assignee_name TEXT,
      reporter_key TEXT,
      reporter_name TEXT,
      creator_key TEXT,
      creator_name TEXT,
      parent_key TEXT,
      epic_key TEXT,
      epic_name TEXT,
      story_points REAL,
      original_estimate INTEGER,
      remaining_estimate INTEGER,
      time_spent INTEGER,
      security_level TEXT,
      due_date TEXT,
      created TEXT,
      updated TEXT,
      resolved TEXT,
      raw_json TEXT,
      collected_at TEXT DEFAULT (datetime('now'))
    );

    -- Issue links
    CREATE TABLE IF NOT EXISTS issue_links (
      id INTEGER PRIMARY KEY,
      issue_key TEXT NOT NULL,
      link_type_name TEXT,
      link_type_inward TEXT,
      link_type_outward TEXT,
      direction TEXT, -- 'inward' or 'outward'
      linked_issue_key TEXT,
      linked_issue_summary TEXT,
      linked_issue_status TEXT,
      raw_json TEXT
    );

    -- Comments
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY,
      issue_key TEXT NOT NULL,
      author_key TEXT,
      author_name TEXT,
      update_author_key TEXT,
      update_author_name TEXT,
      body TEXT,
      created TEXT,
      updated TEXT,
      visibility_type TEXT,
      visibility_value TEXT,
      raw_json TEXT
    );

    -- Worklogs
    CREATE TABLE IF NOT EXISTS worklogs (
      id INTEGER PRIMARY KEY,
      issue_key TEXT NOT NULL,
      author_key TEXT,
      author_name TEXT,
      update_author_key TEXT,
      update_author_name TEXT,
      comment TEXT,
      started TEXT,
      time_spent_seconds INTEGER,
      created TEXT,
      updated TEXT,
      raw_json TEXT
    );

    -- Changelogs (issue history)
    CREATE TABLE IF NOT EXISTS changelogs (
      id INTEGER PRIMARY KEY,
      issue_key TEXT NOT NULL,
      author_key TEXT,
      author_name TEXT,
      created TEXT,
      raw_json TEXT
    );

    -- Changelog items (individual field changes)
    CREATE TABLE IF NOT EXISTS changelog_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      changelog_id INTEGER NOT NULL,
      issue_key TEXT NOT NULL,
      field TEXT,
      field_type TEXT,
      from_value TEXT,
      from_string TEXT,
      to_value TEXT,
      to_string TEXT,
      FOREIGN KEY (changelog_id) REFERENCES changelogs(id)
    );

    -- Attachments metadata
    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY,
      issue_key TEXT NOT NULL,
      filename TEXT,
      author_key TEXT,
      author_name TEXT,
      created TEXT,
      size INTEGER,
      mime_type TEXT,
      content_url TEXT,
      raw_json TEXT
    );

    -- Custom field values
    CREATE TABLE IF NOT EXISTS custom_field_values (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_key TEXT NOT NULL,
      field_id TEXT NOT NULL,
      field_name TEXT,
      value TEXT,
      display_value TEXT
    );

    -- Sprints
    CREATE TABLE IF NOT EXISTS sprints (
      id INTEGER PRIMARY KEY,
      board_id INTEGER,
      name TEXT,
      state TEXT,
      start_date TEXT,
      end_date TEXT,
      complete_date TEXT,
      goal TEXT,
      raw_json TEXT
    );

    -- Issue-Sprint relationship
    CREATE TABLE IF NOT EXISTS issue_sprints (
      issue_key TEXT NOT NULL,
      sprint_id INTEGER NOT NULL,
      PRIMARY KEY (issue_key, sprint_id)
    );

    -- Boards (Agile)
    CREATE TABLE IF NOT EXISTS boards (
      id INTEGER PRIMARY KEY,
      name TEXT,
      type TEXT,
      project_key TEXT,
      raw_json TEXT
    );

    -- Permission schemes
    CREATE TABLE IF NOT EXISTS permission_schemes (
      id INTEGER PRIMARY KEY,
      name TEXT,
      description TEXT,
      raw_json TEXT,
      collected_at TEXT DEFAULT (datetime('now'))
    );

    -- Roles
    CREATE TABLE IF NOT EXISTS project_roles (
      id INTEGER PRIMARY KEY,
      name TEXT,
      description TEXT,
      raw_json TEXT
    );

    -- Project role members
    CREATE TABLE IF NOT EXISTS project_role_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_key TEXT NOT NULL,
      role_id INTEGER NOT NULL,
      role_name TEXT,
      actor_type TEXT,
      actor_name TEXT,
      actor_display_name TEXT,
      raw_json TEXT
    );

    -- Filters (saved searches)
    CREATE TABLE IF NOT EXISTS filters (
      id INTEGER PRIMARY KEY,
      name TEXT,
      owner_name TEXT,
      jql TEXT,
      description TEXT,
      favourite INTEGER DEFAULT 0,
      raw_json TEXT,
      collected_at TEXT DEFAULT (datetime('now'))
    );

    -- Dashboards
    CREATE TABLE IF NOT EXISTS dashboards (
      id INTEGER PRIMARY KEY,
      name TEXT,
      owner_name TEXT,
      description TEXT,
      raw_json TEXT,
      collected_at TEXT DEFAULT (datetime('now'))
    );

    -- Audit log entries (if accessible)
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      summary TEXT,
      category TEXT,
      event_source TEXT,
      author_key TEXT,
      author_name TEXT,
      object_name TEXT,
      object_type TEXT,
      created TEXT,
      raw_json TEXT,
      collected_at TEXT DEFAULT (datetime('now'))
    );

    -- Groups
    CREATE TABLE IF NOT EXISTS groups (
      name TEXT PRIMARY KEY,
      raw_json TEXT,
      collected_at TEXT DEFAULT (datetime('now'))
    );

    -- Group members
    CREATE TABLE IF NOT EXISTS group_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_name TEXT NOT NULL,
      account_key TEXT,
      username TEXT,
      display_name TEXT,
      active INTEGER DEFAULT 1
    );

    -- Workflows
    CREATE TABLE IF NOT EXISTS workflows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      description TEXT,
      is_default INTEGER DEFAULT 0,
      steps_count INTEGER,
      raw_json TEXT,
      collected_at TEXT DEFAULT (datetime('now'))
    );

    -- Notification schemes
    CREATE TABLE IF NOT EXISTS notification_schemes (
      id INTEGER PRIMARY KEY,
      name TEXT,
      description TEXT,
      raw_json TEXT,
      collected_at TEXT DEFAULT (datetime('now'))
    );

    -- Security schemes
    CREATE TABLE IF NOT EXISTS security_schemes (
      id INTEGER PRIMARY KEY,
      name TEXT,
      description TEXT,
      default_level_id INTEGER,
      raw_json TEXT,
      collected_at TEXT DEFAULT (datetime('now'))
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_issues_project ON issues(project_key);
    CREATE INDEX IF NOT EXISTS idx_issues_assignee ON issues(assignee_key);
    CREATE INDEX IF NOT EXISTS idx_issues_reporter ON issues(reporter_key);
    CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status_name);
    CREATE INDEX IF NOT EXISTS idx_issues_type ON issues(issue_type_name);
    CREATE INDEX IF NOT EXISTS idx_issues_created ON issues(created);
    CREATE INDEX IF NOT EXISTS idx_issues_updated ON issues(updated);
    CREATE INDEX IF NOT EXISTS idx_issues_resolved ON issues(resolved);
    CREATE INDEX IF NOT EXISTS idx_issues_priority ON issues(priority_name);
    CREATE INDEX IF NOT EXISTS idx_issues_epic ON issues(epic_key);
    CREATE INDEX IF NOT EXISTS idx_comments_issue ON comments(issue_key);
    CREATE INDEX IF NOT EXISTS idx_worklogs_issue ON worklogs(issue_key);
    CREATE INDEX IF NOT EXISTS idx_changelogs_issue ON changelogs(issue_key);
    CREATE INDEX IF NOT EXISTS idx_changelog_items_issue ON changelog_items(issue_key);
    CREATE INDEX IF NOT EXISTS idx_changelog_items_field ON changelog_items(field);
    CREATE INDEX IF NOT EXISTS idx_attachments_issue ON attachments(issue_key);
    CREATE INDEX IF NOT EXISTS idx_custom_fields_issue ON custom_field_values(issue_key);
    CREATE INDEX IF NOT EXISTS idx_issue_links_issue ON issue_links(issue_key);
    CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created);
    CREATE INDEX IF NOT EXISTS idx_audit_log_author ON audit_log(author_key);
  `);

  console.log('[DB] Schema initialized successfully');
  return db;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, initSchema, closeDb };
