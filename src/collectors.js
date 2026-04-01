// ============================================================
// Helper: upsert with conflict handling
// ============================================================
function upsertRow(db, table, data, conflictColumn) {
  const columns = Object.keys(data);
  const placeholders = columns.map(() => '?').join(', ');
  const updates = columns.map(c => `${c} = excluded.${c}`).join(', ');
  const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})
    ON CONFLICT(${conflictColumn}) DO UPDATE SET ${updates}`;
  db.prepare(sql).run(...Object.values(data));
}

// ============================================================
// Collect metadata (projects, types, statuses, etc.)
// ============================================================
async function collectMetadata(client, db) {
  console.log('\n=== Collecting metadata ===');

  // Server info
  try {
    const info = await client.getServerInfo();
    console.log(`[INFO] Jira Server: ${info.serverTitle} v${info.version} (build ${info.buildNumber})`);
  } catch (e) {
    console.log('[WARN] Could not get server info:', e.message);
  }

  // Issue types
  console.log('[META] Issue types...');
  const issueTypes = await client.getIssueTypes();
  const insertType = db.prepare(`INSERT OR REPLACE INTO issue_types (id, name, description, subtask, raw_json) VALUES (?, ?, ?, ?, ?)`);
  for (const t of issueTypes) {
    insertType.run(t.id, t.name, t.description, t.subtask ? 1 : 0, JSON.stringify(t));
  }
  console.log(`  -> ${issueTypes.length} issue types`);

  // Statuses
  console.log('[META] Statuses...');
  const statuses = await client.getStatuses();
  const insertStatus = db.prepare(`INSERT OR REPLACE INTO statuses (id, name, description, category_key, category_name, raw_json) VALUES (?, ?, ?, ?, ?, ?)`);
  for (const s of statuses) {
    insertStatus.run(s.id, s.name, s.description, s.statusCategory?.key, s.statusCategory?.name, JSON.stringify(s));
  }
  console.log(`  -> ${statuses.length} statuses`);

  // Priorities
  console.log('[META] Priorities...');
  const priorities = await client.getPriorities();
  const insertPriority = db.prepare(`INSERT OR REPLACE INTO priorities (id, name, description, raw_json) VALUES (?, ?, ?, ?)`);
  for (const p of priorities) {
    insertPriority.run(p.id, p.name, p.description, JSON.stringify(p));
  }
  console.log(`  -> ${priorities.length} priorities`);

  // Resolutions
  console.log('[META] Resolutions...');
  const resolutions = await client.getResolutions();
  const insertRes = db.prepare(`INSERT OR REPLACE INTO resolutions (id, name, description, raw_json) VALUES (?, ?, ?, ?)`);
  for (const r of resolutions) {
    insertRes.run(r.id, r.name, r.description, JSON.stringify(r));
  }
  console.log(`  -> ${resolutions.length} resolutions`);

  // Custom field definitions
  console.log('[META] Field definitions...');
  const fields = await client.getFields();
  const customFields = fields.filter(f => f.custom);
  const insertField = db.prepare(`INSERT OR REPLACE INTO custom_field_definitions (id, name, description, type, raw_json) VALUES (?, ?, ?, ?, ?)`);
  for (const f of customFields) {
    insertField.run(f.id, f.name, f.description || null, f.schema?.type || null, JSON.stringify(f));
  }
  console.log(`  -> ${customFields.length} custom fields`);

  return { fields };
}

// ============================================================
// Collect projects
// ============================================================
async function collectProjects(client, db) {
  console.log('\n=== Collecting projects ===');
  const projects = await client.getProjects();

  const insertProject = db.prepare(`INSERT OR REPLACE INTO projects
    (id, key, name, description, project_type, lead_account_id, lead_display_name, url, raw_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  const insertComponent = db.prepare(`INSERT OR REPLACE INTO components
    (id, project_key, name, description, lead_display_name, assignee_type, raw_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)`);

  const insertVersion = db.prepare(`INSERT OR REPLACE INTO versions
    (id, project_key, name, description, released, archived, release_date, start_date, raw_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  for (const p of projects) {
    insertProject.run(
      parseInt(p.id), p.key, p.name, p.description || null,
      p.projectTypeKey || null,
      p.lead?.key || p.lead?.accountId || null,
      p.lead?.displayName || null,
      p.url || null,
      JSON.stringify(p)
    );

    // Components
    try {
      const components = await client.getProjectComponents(p.key);
      for (const c of components) {
        insertComponent.run(
          parseInt(c.id), p.key, c.name, c.description || null,
          c.lead?.displayName || null, c.assigneeType || null,
          JSON.stringify(c)
        );
      }
    } catch { /* skip */ }

    // Versions
    try {
      const versions = await client.getProjectVersions(p.key);
      for (const v of versions) {
        insertVersion.run(
          parseInt(v.id), p.key, v.name, v.description || null,
          v.released ? 1 : 0, v.archived ? 1 : 0,
          v.releaseDate || null, v.startDate || null,
          JSON.stringify(v)
        );
      }
    } catch { /* skip */ }
  }

  console.log(`  -> ${projects.length} projects collected`);
  return projects;
}

// ============================================================
// Collect users
// ============================================================
async function collectUsers(client, db) {
  console.log('\n=== Collecting users ===');
  const insertUser = db.prepare(`INSERT OR REPLACE INTO users
    (account_key, username, display_name, email, active, time_zone, raw_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)`);

  let total = 0;
  let startAt = 0;
  while (true) {
    const users = await client.searchUsers(startAt, 1000);
    if (!users || users.length === 0) break;
    for (const u of users) {
      insertUser.run(
        u.key || u.accountId || u.name,
        u.name || u.key,
        u.displayName,
        u.emailAddress || null,
        u.active ? 1 : 0,
        u.timeZone || null,
        JSON.stringify(u)
      );
    }
    total += users.length;
    startAt += users.length;
    if (users.length < 1000) break;
  }
  console.log(`  -> ${total} users collected`);
}

// ============================================================
// Collect issues with all details
// ============================================================
async function collectIssues(client, db, jql, { resume = false } = {}) {
  console.log('\n=== Collecting issues ===');

  // Resume: count existing issues and skip ahead (with 1000-record overlap for safety)
  let resumeStartAt = 0;
  if (resume) {
    const row = db.prepare('SELECT COUNT(*) as cnt FROM issues').get();
    const existing = row?.cnt || 0;
    if (existing > 0) {
      resumeStartAt = Math.max(0, existing - 1000);
      console.log(`  [RESUME] ${existing} issues in DB, resuming from offset ${resumeStartAt} (1000 overlap for safety)`);
    }
  }

  const insertIssue = db.prepare(`INSERT OR REPLACE INTO issues
    (id, key, project_key, issue_type_id, issue_type_name,
     status_id, status_name, status_category,
     priority_id, priority_name, resolution_id, resolution_name,
     summary, description, environment, labels, components,
     fix_versions, affects_versions,
     assignee_key, assignee_name, reporter_key, reporter_name,
     creator_key, creator_name, parent_key, epic_key, epic_name,
     story_points, original_estimate, remaining_estimate, time_spent,
     security_level, due_date, created, updated, resolved, raw_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  const insertComment = db.prepare(`INSERT OR REPLACE INTO comments
    (id, issue_key, author_key, author_name, update_author_key, update_author_name,
     body, created, updated, visibility_type, visibility_value, raw_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  const insertWorklog = db.prepare(`INSERT OR REPLACE INTO worklogs
    (id, issue_key, author_key, author_name, update_author_key, update_author_name,
     comment, started, time_spent_seconds, created, updated, raw_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  const insertChangelog = db.prepare(`INSERT OR REPLACE INTO changelogs
    (id, issue_key, author_key, author_name, created, raw_json)
    VALUES (?, ?, ?, ?, ?, ?)`);

  const insertChangeItem = db.prepare(`INSERT INTO changelog_items
    (changelog_id, issue_key, field, field_type, from_value, from_string, to_value, to_string)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

  const insertAttachment = db.prepare(`INSERT OR REPLACE INTO attachments
    (id, issue_key, filename, author_key, author_name, created, size, mime_type, content_url, raw_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  const insertLink = db.prepare(`INSERT OR REPLACE INTO issue_links
    (id, issue_key, link_type_name, link_type_inward, link_type_outward,
     direction, linked_issue_key, linked_issue_summary, linked_issue_status, raw_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  const insertCustomVal = db.prepare(`INSERT INTO custom_field_values
    (issue_key, field_id, field_name, value, display_value)
    VALUES (?, ?, ?, ?, ?)`);

  const insertSprintRel = db.prepare(`INSERT OR REPLACE INTO issue_sprints (issue_key, sprint_id) VALUES (?, ?)`);

  // Clear changelog_items before re-collecting (no natural PK)
  // We'll handle this per-issue

  let totalIssues = resumeStartAt;
  let pageNum = 0;

  for await (const page of client.searchIssues(jql, undefined, undefined, resumeStartAt)) {
    if (pageNum === 0) {
      console.log(`  Total issues: ${page.total}${resumeStartAt > 0 ? ` (resuming from #${resumeStartAt})` : ''}`);
      if (resumeStartAt >= page.total) {
        console.log('  [RESUME] All issues already collected, nothing to do.');
        return totalIssues;
      }
    }
    pageNum++;
    const fieldNames = page.names || {};

    const processPage = db.transaction(() => {
      for (const issue of page.issues) {
        const f = issue.fields;
        const key = issue.key;

        // Find epic key & story points from custom fields
        let epicKey = null;
        let epicName = null;
        let storyPoints = null;

        // Process all fields to find epic and story points
        for (const [fieldId, value] of Object.entries(f)) {
          if (!fieldId.startsWith('customfield_') || value == null) continue;
          const name = (fieldNames[fieldId] || '').toLowerCase();
          if (name.includes('epic link') || name === 'epic link') {
            epicKey = typeof value === 'string' ? value : value?.key || null;
          }
          if (name.includes('epic name')) {
            epicName = typeof value === 'string' ? value : null;
          }
          if (name.includes('story point') || name === 'story points') {
            storyPoints = typeof value === 'number' ? value : null;
          }
        }

        // Main issue
        insertIssue.run(
          parseInt(issue.id), key,
          f.project?.key || null,
          f.issuetype?.id || null, f.issuetype?.name || null,
          f.status?.id || null, f.status?.name || null,
          f.status?.statusCategory?.name || null,
          f.priority?.id || null, f.priority?.name || null,
          f.resolution?.id || null, f.resolution?.name || null,
          f.summary, f.description || null, f.environment || null,
          JSON.stringify(f.labels || []),
          JSON.stringify((f.components || []).map(c => c.name)),
          JSON.stringify((f.fixVersions || []).map(v => v.name)),
          JSON.stringify((f.versions || []).map(v => v.name)),
          f.assignee?.key || f.assignee?.accountId || null,
          f.assignee?.displayName || null,
          f.reporter?.key || f.reporter?.accountId || null,
          f.reporter?.displayName || null,
          f.creator?.key || f.creator?.accountId || null,
          f.creator?.displayName || null,
          f.parent?.key || null,
          epicKey, epicName, storyPoints,
          f.timeoriginalestimate || null,
          f.timeestimate || null,
          f.timespent || null,
          f.security?.name || null,
          f.duedate || null,
          f.created, f.updated,
          f.resolutiondate || null,
          JSON.stringify(issue)
        );

        // Comments
        if (f.comment && f.comment.comments) {
          for (const c of f.comment.comments) {
            insertComment.run(
              parseInt(c.id), key,
              c.author?.key || c.author?.accountId || null,
              c.author?.displayName || null,
              c.updateAuthor?.key || c.updateAuthor?.accountId || null,
              c.updateAuthor?.displayName || null,
              c.body, c.created, c.updated,
              c.visibility?.type || null,
              c.visibility?.value || null,
              JSON.stringify(c)
            );
          }
        }

        // Worklogs
        if (f.worklog && f.worklog.worklogs) {
          for (const w of f.worklog.worklogs) {
            insertWorklog.run(
              parseInt(w.id), key,
              w.author?.key || w.author?.accountId || null,
              w.author?.displayName || null,
              w.updateAuthor?.key || w.updateAuthor?.accountId || null,
              w.updateAuthor?.displayName || null,
              w.comment || null, w.started,
              w.timeSpentSeconds, w.created, w.updated,
              JSON.stringify(w)
            );
          }
        }

        // Attachments
        if (f.attachment) {
          for (const a of f.attachment) {
            insertAttachment.run(
              parseInt(a.id), key, a.filename,
              a.author?.key || a.author?.accountId || null,
              a.author?.displayName || null,
              a.created, a.size, a.mimeType,
              a.content || null, JSON.stringify(a)
            );
          }
        }

        // Issue links
        if (f.issuelinks) {
          for (const link of f.issuelinks) {
            const direction = link.inwardIssue ? 'inward' : 'outward';
            const linkedIssue = link.inwardIssue || link.outwardIssue;
            if (linkedIssue) {
              insertLink.run(
                parseInt(link.id), key,
                link.type?.name || null,
                link.type?.inward || null,
                link.type?.outward || null,
                direction,
                linkedIssue.key,
                linkedIssue.fields?.summary || null,
                linkedIssue.fields?.status?.name || null,
                JSON.stringify(link)
              );
            }
          }
        }

        // Changelog
        if (issue.changelog && issue.changelog.histories) {
          // Remove old changelog_items for this issue
          db.prepare('DELETE FROM changelog_items WHERE issue_key = ?').run(key);

          for (const h of issue.changelog.histories) {
            insertChangelog.run(
              parseInt(h.id), key,
              h.author?.key || h.author?.accountId || null,
              h.author?.displayName || null,
              h.created, JSON.stringify(h)
            );
            for (const item of h.items || []) {
              insertChangeItem.run(
                parseInt(h.id), key,
                item.field, item.fieldtype,
                item.from, item.fromString,
                item.to, item.toString
              );
            }
          }
        }

        // Custom field values
        db.prepare('DELETE FROM custom_field_values WHERE issue_key = ?').run(key);
        for (const [fieldId, value] of Object.entries(f)) {
          if (!fieldId.startsWith('customfield_') || value == null) continue;
          const name = fieldNames[fieldId] || fieldId;
          let displayVal = null;
          let rawVal = null;

          if (typeof value === 'string' || typeof value === 'number') {
            rawVal = String(value);
            displayVal = rawVal;
          } else if (value.name || value.value) {
            rawVal = JSON.stringify(value);
            displayVal = value.name || value.value;
          } else if (Array.isArray(value)) {
            rawVal = JSON.stringify(value);
            displayVal = value.map(v => v.name || v.value || v).join(', ');
          } else {
            rawVal = JSON.stringify(value);
            displayVal = rawVal;
          }

          insertCustomVal.run(key, fieldId, name, rawVal, displayVal);
        }

        // Sprint relationships (from custom fields)
        for (const [fieldId, value] of Object.entries(f)) {
          if (!fieldId.startsWith('customfield_') || !Array.isArray(value)) continue;
          for (const item of value) {
            if (item && typeof item === 'object' && item.id && (item.name || item.state)) {
              // Looks like a sprint object
              try { insertSprintRel.run(key, item.id); } catch { /* ignore dups */ }
            }
          }
        }
      }
    });

    processPage();
    totalIssues += page.issues.length;
    console.log(`  -> ${totalIssues} / ${page.total} issues`);
  }

  console.log(`  -> Total: ${totalIssues} issues collected`);
  return totalIssues;
}

// ============================================================
// Collect boards and sprints
// ============================================================
async function collectBoardsAndSprints(client, db) {
  console.log('\n=== Collecting boards & sprints ===');

  const insertBoard = db.prepare(`INSERT OR REPLACE INTO boards
    (id, name, type, project_key, raw_json) VALUES (?, ?, ?, ?, ?)`);

  const insertSprint = db.prepare(`INSERT OR REPLACE INTO sprints
    (id, board_id, name, state, start_date, end_date, complete_date, goal, raw_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  let boardCount = 0;
  let sprintCount = 0;

  for await (const page of client.getBoards()) {
    for (const b of page.values) {
      insertBoard.run(b.id, b.name, b.type, b.location?.projectKey || null, JSON.stringify(b));
      boardCount++;

      const sprints = await client.getBoardSprints(b.id);
      for (const s of sprints) {
        insertSprint.run(
          s.id, b.id, s.name, s.state,
          s.startDate || null, s.endDate || null,
          s.completeDate || null, s.goal || null,
          JSON.stringify(s)
        );
        sprintCount++;
      }
    }
  }

  console.log(`  -> ${boardCount} boards, ${sprintCount} sprints`);
}

// ============================================================
// Collect security/admin data
// ============================================================
async function collectSecurityData(client, db, projects) {
  console.log('\n=== Collecting security & admin data ===');

  // Permission schemes
  console.log('[SEC] Permission schemes...');
  const permSchemes = await client.getPermissionSchemes();
  const insertPerm = db.prepare(`INSERT OR REPLACE INTO permission_schemes (id, name, description, raw_json) VALUES (?, ?, ?, ?)`);
  for (const ps of (permSchemes.permissionSchemes || [])) {
    insertPerm.run(ps.id, ps.name, ps.description || null, JSON.stringify(ps));
  }
  console.log(`  -> ${(permSchemes.permissionSchemes || []).length} permission schemes`);

  // Roles
  console.log('[SEC] Project roles...');
  const roles = await client.getRoles();
  const insertRole = db.prepare(`INSERT OR REPLACE INTO project_roles (id, name, description, raw_json) VALUES (?, ?, ?, ?)`);
  const insertRoleMember = db.prepare(`INSERT INTO project_role_members
    (project_key, role_id, role_name, actor_type, actor_name, actor_display_name, raw_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)`);

  // Clear old role members
  db.prepare('DELETE FROM project_role_members').run();

  for (const role of roles) {
    insertRole.run(role.id, role.name, role.description || null, JSON.stringify(role));

    // Get members per project
    for (const proj of (projects || [])) {
      const roleData = await client.getProjectRoleMembers(proj.key, role.id);
      if (roleData && roleData.actors) {
        for (const actor of roleData.actors) {
          insertRoleMember.run(
            proj.key, role.id, role.name,
            actor.type, actor.name,
            actor.displayName, JSON.stringify(actor)
          );
        }
      }
    }
  }
  console.log(`  -> ${roles.length} roles`);

  // Groups & members
  console.log('[SEC] Groups...');
  const groups = await client.getGroups();
  const insertGroup = db.prepare(`INSERT OR REPLACE INTO groups (name, raw_json) VALUES (?, ?)`);
  const insertGroupMember = db.prepare(`INSERT INTO group_members
    (group_name, account_key, username, display_name, active) VALUES (?, ?, ?, ?, ?)`);

  db.prepare('DELETE FROM group_members').run();

  for (const g of (groups.groups || [])) {
    insertGroup.run(g.name, JSON.stringify(g));
    const members = await client.getGroupMembers(g.name);
    for (const m of members) {
      insertGroupMember.run(g.name, m.key || m.accountId, m.name, m.displayName, m.active ? 1 : 0);
    }
  }
  console.log(`  -> ${(groups.groups || []).length} groups`);

  // Workflows
  console.log('[SEC] Workflows...');
  const workflows = await client.getWorkflows();
  const insertWf = db.prepare(`INSERT OR REPLACE INTO workflows (name, description, is_default, steps_count, raw_json) VALUES (?, ?, ?, ?, ?)`);
  for (const w of workflows) {
    insertWf.run(w.name, w.description || null, w.isDefault ? 1 : 0, w.steps?.length || 0, JSON.stringify(w));
  }
  console.log(`  -> ${workflows.length} workflows`);

  // Notification schemes
  console.log('[SEC] Notification schemes...');
  const notifSchemes = await client.getNotificationSchemes();
  const insertNotif = db.prepare(`INSERT OR REPLACE INTO notification_schemes (id, name, description, raw_json) VALUES (?, ?, ?, ?)`);
  for (const ns of notifSchemes) {
    insertNotif.run(ns.id, ns.name, ns.description || null, JSON.stringify(ns));
  }

  // Security schemes
  console.log('[SEC] Issue security schemes...');
  const secSchemes = await client.getSecuritySchemes();
  const insertSec = db.prepare(`INSERT OR REPLACE INTO security_schemes (id, name, description, default_level_id, raw_json) VALUES (?, ?, ?, ?, ?)`);
  for (const ss of (secSchemes.issueSecuritySchemes || [])) {
    insertSec.run(ss.id, ss.name, ss.description || null, ss.defaultSecurityLevelId || null, JSON.stringify(ss));
  }

  // Filters & Dashboards
  console.log('[SEC] Filters & dashboards...');
  const filters = await client.getFavouriteFilters();
  const insertFilter = db.prepare(`INSERT OR REPLACE INTO filters (id, name, owner_name, jql, description, favourite, raw_json) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  for (const f of filters) {
    insertFilter.run(f.id, f.name, f.owner?.displayName || null, f.jql, f.description || null, 1, JSON.stringify(f));
  }

  const dashboards = await client.getDashboards();
  const insertDash = db.prepare(`INSERT OR REPLACE INTO dashboards (id, name, owner_name, description, raw_json) VALUES (?, ?, ?, ?, ?)`);
  for (const d of dashboards) {
    insertDash.run(parseInt(d.id), d.name, d.owner?.displayName || null, d.description || null, JSON.stringify(d));
  }
}

// ============================================================
// Collect audit log
// ============================================================
async function collectAuditLog(client, db) {
  console.log('\n=== Collecting audit log ===');
  const insertAudit = db.prepare(`INSERT INTO audit_log
    (summary, category, event_source, author_key, author_name,
     object_name, object_type, created, raw_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  let total = 0;
  for await (const page of client.getAuditLog()) {
    if (!page.records) break;
    const batch = db.transaction(() => {
      for (const r of page.records) {
        insertAudit.run(
          r.summary, r.category, r.eventSource,
          r.authorKey || null, r.authorAccountId || null,
          r.objectItem?.name || null, r.objectItem?.typeName || null,
          r.created, JSON.stringify(r)
        );
      }
    });
    batch();
    total += page.records.length;
    console.log(`  -> ${total} audit records...`);
  }
  console.log(`  -> Total: ${total} audit log entries`);
}

module.exports = {
  collectMetadata,
  collectProjects,
  collectUsers,
  collectIssues,
  collectBoardsAndSprints,
  collectSecurityData,
  collectAuditLog,
};
