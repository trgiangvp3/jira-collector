#!/usr/bin/env node
/**
 * Jira Data Collector - Thu thập dữ liệu Jira Server/DC về SQLite
 * Phục vụ kiểm toán an toàn thông tin
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
const { initSchema, closeDb, getDb } = require('./src/db');
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

async function main() {
  const args = process.argv.slice(2);
  const issuesOnly = args.includes('--issues-only');
  const metaOnly = args.includes('--meta-only');
  const auditOnly = args.includes('--audit-only');

  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   Jira Data Collector for Security Audit     ║');
  console.log('║   Jira Server/Data Center 10.5.0             ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log();

  // Init
  const db = await initSchema();
  const client = new JiraClient();
  const jql = process.env.JIRA_JQL || null;

  // Record collection run
  const run = db.prepare(`INSERT INTO collection_runs (started_at, jql_filter) VALUES (datetime('now'), ?)`).run(jql);
  const runId = run.lastInsertRowid;

  const startTime = Date.now();
  let totalIssues = 0;

  try {
    if (auditOnly) {
      await collectAuditLog(client);
    } else if (issuesOnly) {
      totalIssues = await collectIssues(client, jql);
    } else if (metaOnly) {
      await collectMetadata(client);
      const projects = await collectProjects(client);
      await collectUsers(client);
      await collectSecurityData(client, projects);
    } else {
      // Full collection
      await collectMetadata(client);
      const projects = await collectProjects(client);
      await collectUsers(client);
      totalIssues = await collectIssues(client, jql);
      await collectBoardsAndSprints(client);
      await collectSecurityData(client, projects);
      await collectAuditLog(client);
    }

    // Update run record
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    db.prepare(`UPDATE collection_runs SET finished_at = datetime('now'), status = 'completed', total_issues = ?, notes = ? WHERE id = ?`)
      .run(totalIssues, `Completed in ${elapsed}s`, runId);

    console.log('\n╔══════════════════════════════════════════════╗');
    console.log(`║   Collection completed in ${elapsed}s`);
    console.log('╠══════════════════════════════════════════════╣');
    console.log('║   Next steps:                                ║');
    console.log('║   node src/queries.js              (queries) ║');
    console.log('║   node src/queries.js summary      (summary) ║');
    console.log('║   node src/queries.js --all     (all queries)║');
    console.log('║   node src/export.js csv        (export CSV) ║');
    console.log('║   node src/export.js json      (export JSON) ║');
    console.log('╚══════════════════════════════════════════════╝');

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
    closeDb();
  }
}

main();
