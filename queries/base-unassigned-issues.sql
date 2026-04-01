-- {"key":"base-unassigned-issues","title":"Open Unassigned Issues","category":"General Analysis","description":"Open Unassigned Issues"}
SELECT key, summary, project_key, status_name, priority_name, created
      FROM issues
      WHERE assignee_key IS NULL AND status_category != 'Done'
      ORDER BY priority_name, created
      LIMIT 100
