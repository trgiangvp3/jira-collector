-- {"key":"base-security-levels","title":"Issues with Security Levels","category":"General Analysis","description":"Issues with Security Levels"}
SELECT key, summary, security_level, project_key, status_name, assignee_name
      FROM issues
      WHERE security_level IS NOT NULL
      ORDER BY security_level, key
