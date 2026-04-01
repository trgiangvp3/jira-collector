#!/usr/bin/env node
/**
 * Jira Data Collector - Thu thap du lieu Jira Server/DC ve SQLite
 * Phuc vu kiem toan an toan thong tin
 *
 * Usage:
 *   node index.js                    # Full collection
 *   node index.js --issues-only      # Only collect issues
 *   node index.js --meta-only        # Only collect metadata & security data
 *   node index.js --audit-only       # Only collect audit log
 *   node src/queries.js [query]      # Run analysis queries
 *   node src/queries.js --all        # Run all queries
 *   node src/export.js [csv|json]    # Export to CSV/JSON
 */
require('dotenv').config();
const path = require('path');
const { initSchema, closeDb } = require('./src/db');
const JiraClient = require('./src/jira-client');
const {
  collectMetadata,
  collectProjects,
  collectUsers,
  collectIssues,
  collectBoardsAndSprints,
  collectSecurityData,
  collectAuditLog,
} = require('./src/collectors');

const CLI_WORKSPACE_ID = '__cli__';

async function main() {
  const args = process.argv.slice(2);
  const issuesOnly = args.includes('--issues-only');
  const metaOnly = args.includes('--meta-only');
  const auditOnly = args.includes('--audit-only');

  console.log('\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557');
  console.log('\u2551   Jira Data Collector for Security Audit     \u2551');
  console.log('\u2551   Jira Server/Data Center 10.5.0             \u2551');
  console.log('\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d');
  console.log();

  // Init - use process.env for DB path (backward compat with .env)
  const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'jira_data.db');
  const db = await initSchema(CLI_WORKSPACE_ID, dbPath);
  const client = new JiraClient(); // reads from process.env
  const jql = process.env.JIRA_JQL || null;

  // Record collection run
  const run = db.prepare(`INSERT INTO collection_runs (started_at, jql_filter) VALUES (datetime('now'), ?)`).run(jql);
  const runId = run.lastInsertRowid;

  const startTime = Date.now();
  let totalIssues = 0;

  try {
    if (auditOnly) {
      await collectAuditLog(client, db);
    } else if (issuesOnly) {
      totalIssues = await collectIssues(client, db, jql);
    } else if (metaOnly) {
      await collectMetadata(client, db);
      const projects = await collectProjects(client, db);
      await collectUsers(client, db);
      await collectSecurityData(client, db, projects);
    } else {
      // Full collection
      await collectMetadata(client, db);
      const projects = await collectProjects(client, db);
      await collectUsers(client, db);
      totalIssues = await collectIssues(client, db, jql);
      await collectBoardsAndSprints(client, db);
      await collectSecurityData(client, db, projects);
      await collectAuditLog(client, db);
    }

    // Update run record
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    db.prepare(`UPDATE collection_runs SET finished_at = datetime('now'), status = 'completed', total_issues = ?, notes = ? WHERE id = ?`)
      .run(totalIssues, `Completed in ${elapsed}s`, runId);

    console.log('\n\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557');
    console.log(`\u2551   Collection completed in ${elapsed}s`);
    console.log('\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563');
    console.log('\u2551   Next steps:                                \u2551');
    console.log('\u2551   node src/queries.js              (queries) \u2551');
    console.log('\u2551   node src/queries.js summary      (summary) \u2551');
    console.log('\u2551   node src/queries.js --all     (all queries)\u2551');
    console.log('\u2551   node src/export.js csv        (export CSV) \u2551');
    console.log('\u2551   node src/export.js json      (export JSON) \u2551');
    console.log('\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d');

  } catch (err) {
    db.prepare(`UPDATE collection_runs SET finished_at = datetime('now'), status = 'failed', notes = ? WHERE id = ?`)
      .run(err.message, runId);
    console.error('\n[ERROR]', err.message);
    if (err.response) {
      console.error('  Status:', err.response.status);
      console.error('  Data:', JSON.stringify(err.response.data).substring(0, 500));
    }
    process.exitCode = 1;
  } finally {
    closeDb(CLI_WORKSPACE_ID);
  }
}

main();
