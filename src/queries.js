/**
 * Pre-built audit/analysis queries for security review
 * Run with: node src/queries.js [query-name]
 */
require('dotenv').config();
const { getDb, initSchema, closeDb } = require('./db');

const QUERIES = {
  // ====== OVERVIEW ======
  'summary': {
    title: 'Database Summary',
    sql: `
      SELECT 'Projects' as entity, COUNT(*) as count FROM projects
      UNION ALL SELECT 'Issues', COUNT(*) FROM issues
      UNION ALL SELECT 'Users', COUNT(*) FROM users
      UNION ALL SELECT 'Comments', COUNT(*) FROM comments
      UNION ALL SELECT 'Worklogs', COUNT(*) FROM worklogs
      UNION ALL SELECT 'Changelogs', COUNT(*) FROM changelogs
      UNION ALL SELECT 'Attachments', COUNT(*) FROM attachments
      UNION ALL SELECT 'Groups', COUNT(*) FROM groups
      UNION ALL SELECT 'Boards', COUNT(*) FROM boards
      UNION ALL SELECT 'Sprints', COUNT(*) FROM sprints
      UNION ALL SELECT 'Audit Log Entries', COUNT(*) FROM audit_log
    `
  },

  // ====== USER ANALYSIS ======
  'inactive-users': {
    title: 'Inactive Users (still in system)',
    sql: `SELECT account_key, username, display_name, email FROM users WHERE active = 0 ORDER BY display_name`
  },

  'user-activity': {
    title: 'User Activity Summary (issues assigned, reported, comments)',
    sql: `
      SELECT
        u.display_name,
        u.username,
        u.active,
        COALESCE(assigned.cnt, 0) as issues_assigned,
        COALESCE(reported.cnt, 0) as issues_reported,
        COALESCE(comments.cnt, 0) as comments_made,
        COALESCE(changes.cnt, 0) as changes_made
      FROM users u
      LEFT JOIN (SELECT assignee_key, COUNT(*) cnt FROM issues GROUP BY assignee_key) assigned ON u.account_key = assigned.assignee_key
      LEFT JOIN (SELECT reporter_key, COUNT(*) cnt FROM issues GROUP BY reporter_key) reported ON u.account_key = reported.reporter_key
      LEFT JOIN (SELECT author_key, COUNT(*) cnt FROM comments GROUP BY author_key) comments ON u.account_key = comments.author_key
      LEFT JOIN (SELECT author_key, COUNT(*) cnt FROM changelogs GROUP BY author_key) changes ON u.account_key = changes.author_key
      ORDER BY changes_made DESC
      LIMIT 50
    `
  },

  'users-no-activity': {
    title: 'Active Users with Zero Activity',
    sql: `
      SELECT u.display_name, u.username, u.email
      FROM users u
      WHERE u.active = 1
        AND u.account_key NOT IN (SELECT DISTINCT assignee_key FROM issues WHERE assignee_key IS NOT NULL)
        AND u.account_key NOT IN (SELECT DISTINCT reporter_key FROM issues WHERE reporter_key IS NOT NULL)
        AND u.account_key NOT IN (SELECT DISTINCT author_key FROM comments WHERE author_key IS NOT NULL)
        AND u.account_key NOT IN (SELECT DISTINCT author_key FROM changelogs WHERE author_key IS NOT NULL)
      ORDER BY u.display_name
    `
  },

  // ====== PERMISSION & ACCESS ======
  'group-membership': {
    title: 'Group Membership Overview',
    sql: `
      SELECT g.name as group_name, COUNT(gm.account_key) as member_count,
        SUM(CASE WHEN gm.active = 0 THEN 1 ELSE 0 END) as inactive_members
      FROM groups g
      LEFT JOIN group_members gm ON g.name = gm.group_name
      GROUP BY g.name
      ORDER BY member_count DESC
    `
  },

  'admin-groups': {
    title: 'Admin/Privileged Groups and Members',
    sql: `
      SELECT gm.group_name, gm.display_name, gm.username, gm.active
      FROM group_members gm
      WHERE LOWER(gm.group_name) LIKE '%admin%'
         OR LOWER(gm.group_name) LIKE '%jira-software%'
         OR LOWER(gm.group_name) LIKE '%system%'
      ORDER BY gm.group_name, gm.display_name
    `
  },

  'role-assignments': {
    title: 'Project Role Assignments',
    sql: `
      SELECT project_key, role_name, actor_type, actor_name, actor_display_name
      FROM project_role_members
      ORDER BY project_key, role_name
    `
  },

  'permission-schemes': {
    title: 'Permission Schemes',
    sql: `SELECT id, name, description FROM permission_schemes ORDER BY name`
  },

  // ====== SECURITY ISSUES ======
  'security-levels': {
    title: 'Issues with Security Levels',
    sql: `
      SELECT key, summary, security_level, project_key, status_name, assignee_name
      FROM issues
      WHERE security_level IS NOT NULL
      ORDER BY security_level, key
    `
  },

  'security-schemes': {
    title: 'Issue Security Schemes',
    sql: `SELECT id, name, description FROM security_schemes`
  },

  // ====== PROJECT ANALYSIS ======
  'project-stats': {
    title: 'Project Statistics',
    sql: `
      SELECT
        p.key, p.name, p.lead_display_name,
        COUNT(i.id) as total_issues,
        SUM(CASE WHEN i.status_category = 'Done' THEN 1 ELSE 0 END) as done,
        SUM(CASE WHEN i.status_category = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN i.status_category = 'To Do' THEN 1 ELSE 0 END) as todo,
        MIN(i.created) as first_issue,
        MAX(i.updated) as last_update
      FROM projects p
      LEFT JOIN issues i ON p.key = i.project_key
      GROUP BY p.key
      ORDER BY total_issues DESC
    `
  },

  // ====== ISSUE ANALYSIS ======
  'overdue-issues': {
    title: 'Overdue Issues (past due date, still open)',
    sql: `
      SELECT key, summary, due_date, assignee_name, project_key, status_name, priority_name
      FROM issues
      WHERE due_date IS NOT NULL
        AND due_date < date('now')
        AND status_category != 'Done'
      ORDER BY due_date ASC
    `
  },

  'old-open-issues': {
    title: 'Open Issues Older Than 1 Year',
    sql: `
      SELECT key, summary, created, updated, assignee_name, project_key, status_name
      FROM issues
      WHERE status_category != 'Done'
        AND created < date('now', '-1 year')
      ORDER BY created ASC
      LIMIT 100
    `
  },

  'unassigned-issues': {
    title: 'Open Unassigned Issues',
    sql: `
      SELECT key, summary, project_key, status_name, priority_name, created
      FROM issues
      WHERE assignee_key IS NULL AND status_category != 'Done'
      ORDER BY priority_name, created
      LIMIT 100
    `
  },

  'high-priority-open': {
    title: 'High/Critical Priority Open Issues',
    sql: `
      SELECT key, summary, priority_name, project_key, status_name, assignee_name, created, updated
      FROM issues
      WHERE status_category != 'Done'
        AND (LOWER(priority_name) IN ('highest', 'critical', 'blocker', 'high'))
      ORDER BY priority_name, created
    `
  },

  // ====== CHANGE ANALYSIS ======
  'status-changes': {
    title: 'Status Change History (last 30 days)',
    sql: `
      SELECT ci.issue_key, ci.from_string as from_status, ci.to_string as to_status,
        c.author_name, c.created
      FROM changelog_items ci
      JOIN changelogs c ON ci.changelog_id = c.id
      WHERE ci.field = 'status' AND c.created >= date('now', '-30 days')
      ORDER BY c.created DESC
      LIMIT 200
    `
  },

  'assignee-changes': {
    title: 'Assignee Changes (last 30 days)',
    sql: `
      SELECT ci.issue_key, ci.from_string as from_assignee, ci.to_string as to_assignee,
        c.author_name, c.created
      FROM changelog_items ci
      JOIN changelogs c ON ci.changelog_id = c.id
      WHERE ci.field = 'assignee' AND c.created >= date('now', '-30 days')
      ORDER BY c.created DESC
      LIMIT 200
    `
  },

  'security-level-changes': {
    title: 'Security Level Changes',
    sql: `
      SELECT ci.issue_key, ci.from_string, ci.to_string,
        c.author_name, c.created
      FROM changelog_items ci
      JOIN changelogs c ON ci.changelog_id = c.id
      WHERE LOWER(ci.field) = 'security'
      ORDER BY c.created DESC
    `
  },

  'permission-changes-audit': {
    title: 'Permission-related Audit Log',
    sql: `
      SELECT summary, category, author_name, object_name, object_type, created
      FROM audit_log
      WHERE LOWER(category) LIKE '%permission%'
         OR LOWER(category) LIKE '%security%'
         OR LOWER(summary) LIKE '%permission%'
         OR LOWER(summary) LIKE '%group%'
      ORDER BY created DESC
      LIMIT 200
    `
  },

  // ====== WORKLOG / TIME ======
  'worklog-summary': {
    title: 'Worklog Summary by User (hours)',
    sql: `
      SELECT author_name,
        ROUND(SUM(time_spent_seconds) / 3600.0, 1) as total_hours,
        COUNT(*) as entries,
        MIN(started) as first_log,
        MAX(started) as last_log
      FROM worklogs
      GROUP BY author_key
      ORDER BY total_hours DESC
    `
  },

  // ====== ATTACHMENT ANALYSIS ======
  'large-attachments': {
    title: 'Largest Attachments',
    sql: `
      SELECT issue_key, filename, ROUND(size / 1048576.0, 2) as size_mb,
        mime_type, author_name, created
      FROM attachments
      ORDER BY size DESC
      LIMIT 50
    `
  },

  'attachment-types': {
    title: 'Attachment Types Summary',
    sql: `
      SELECT mime_type, COUNT(*) as count,
        ROUND(SUM(size) / 1048576.0, 2) as total_size_mb
      FROM attachments
      GROUP BY mime_type
      ORDER BY total_size_mb DESC
    `
  },

  // ====== WORKFLOW ======
  'workflows': {
    title: 'Workflows',
    sql: `SELECT name, description, is_default, steps_count FROM workflows ORDER BY name`
  },

  // ====== SPRINT ANALYSIS ======
  'sprint-stats': {
    title: 'Sprint Statistics',
    sql: `
      SELECT s.name, s.state, s.start_date, s.end_date, s.complete_date,
        COUNT(isp.issue_key) as issue_count,
        b.name as board_name
      FROM sprints s
      LEFT JOIN issue_sprints isp ON s.id = isp.sprint_id
      LEFT JOIN boards b ON s.board_id = b.id
      GROUP BY s.id
      ORDER BY s.start_date DESC
      LIMIT 50
    `
  },
};

function runQuery(name) {
  const db = initSchema();
  const query = QUERIES[name];
  if (!query) {
    console.log('Available queries:');
    for (const [key, q] of Object.entries(QUERIES)) {
      console.log(`  ${key.padEnd(30)} ${q.title}`);
    }
    return;
  }

  console.log(`\n=== ${query.title} ===\n`);
  const rows = db.prepare(query.sql).all();

  if (rows.length === 0) {
    console.log('(no results)');
  } else {
    console.table(rows);
    console.log(`\n${rows.length} rows returned`);
  }

  closeDb();
}

// Run all queries and export to a report
function runAllQueries() {
  const db = initSchema();
  const results = {};

  for (const [name, query] of Object.entries(QUERIES)) {
    try {
      results[name] = {
        title: query.title,
        rows: db.prepare(query.sql).all(),
      };
    } catch (err) {
      results[name] = { title: query.title, error: err.message };
    }
  }

  closeDb();
  return results;
}

if (require.main === module) {
  const queryName = process.argv[2];
  if (queryName === '--all') {
    const results = runAllQueries();
    for (const [name, result] of Object.entries(results)) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`=== ${result.title} ===`);
      console.log('='.repeat(60));
      if (result.error) {
        console.log(`ERROR: ${result.error}`);
      } else if (result.rows.length === 0) {
        console.log('(no results)');
      } else {
        console.table(result.rows);
        console.log(`${result.rows.length} rows`);
      }
    }
  } else {
    runQuery(queryName);
  }
}

module.exports = { QUERIES, runQuery, runAllQueries };
