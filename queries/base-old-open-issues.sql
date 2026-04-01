-- {"key":"base-old-open-issues","title":"Open Issues Older Than 1 Year","category":"General Analysis","description":"Open Issues Older Than 1 Year"}
SELECT key, summary, created, updated, assignee_name, project_key, status_name
      FROM issues
      WHERE status_category != 'Done'
        AND created < date('now', '-1 year')
      ORDER BY created ASC
      LIMIT 100
