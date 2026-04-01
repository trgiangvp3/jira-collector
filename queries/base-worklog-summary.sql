-- {"key":"base-worklog-summary","title":"Worklog Summary by User (hours)","category":"General Analysis","description":"Worklog Summary by User (hours)"}
SELECT author_name,
        ROUND(SUM(time_spent_seconds) / 3600.0, 1) as total_hours,
        COUNT(*) as entries,
        MIN(started) as first_log,
        MAX(started) as last_log
      FROM worklogs
      GROUP BY author_key
      ORDER BY total_hours DESC
