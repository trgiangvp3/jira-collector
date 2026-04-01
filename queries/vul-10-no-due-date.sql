-- {"key":"vul-10-no-due-date","title":"Điểm yếu open không có Due Date","category":"Vuln - Lifecycle","description":"Issue ATTT open nhưng không có deadline. Không thể theo dõi SLA và cam kết xử lý."}
WITH security_issues AS (
  SELECT * FROM issues
  WHERE LOWER(summary) LIKE '%vulnerab%' OR LOWER(summary) LIKE '%security%'
     OR LOWER(summary) LIKE '%bảo mật%' OR LOWER(summary) LIKE '%lỗ hổng%'
     OR LOWER(summary) LIKE '%điểm yếu%' OR LOWER(summary) LIKE '%cve-%'
     OR LOWER(summary) LIKE '%patch%' OR LOWER(summary) LIKE '%pentest%'
     OR LOWER(labels) LIKE '%security%' OR LOWER(labels) LIKE '%vulnerability%'
     OR LOWER(issue_type_name) LIKE '%security%' OR LOWER(issue_type_name) LIKE '%vulnerability%'
)
SELECT
  key, project_key, summary,
  priority_name, status_name,
  assignee_name,
  created,
  CAST(julianday('now') - julianday(created) AS INTEGER) as age_days
FROM security_issues
WHERE due_date IS NULL
  AND status_category != 'Done'
ORDER BY
  CASE LOWER(priority_name) WHEN 'blocker' THEN 1 WHEN 'critical' THEN 2 WHEN 'highest' THEN 3 WHEN 'high' THEN 4 ELSE 5 END,
  age_days DESC
