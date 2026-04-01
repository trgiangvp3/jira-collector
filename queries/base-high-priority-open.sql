-- {"key":"base-high-priority-open","title":"High/Critical Priority Open Issues","category":"General Analysis","description":"High/Critical Priority Open Issues"}
SELECT key, summary, priority_name, project_key, status_name, assignee_name, created, updated
      FROM issues
      WHERE status_category != 'Done'
        AND (LOWER(priority_name) IN ('highest', 'critical', 'blocker', 'high'))
      ORDER BY priority_name, created
