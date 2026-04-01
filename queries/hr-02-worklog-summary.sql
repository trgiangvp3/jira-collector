-- {"key":"hr-02-worklog-summary","title":"Tổng hợp thời gian làm việc (Worklog)","category":"User Activity","description":"Số giờ log theo từng user. Đối chiếu với chấm công."}
SELECT
  author_name,
  ROUND(SUM(time_spent_seconds) / 3600.0, 1) as total_hours,
  COUNT(*) as log_entries,
  COUNT(DISTINCT issue_key) as issues_worked,
  MIN(SUBSTR(started, 1, 10)) as first_log,
  MAX(SUBSTR(started, 1, 10)) as last_log
FROM worklogs
GROUP BY author_key
ORDER BY total_hours DESC
