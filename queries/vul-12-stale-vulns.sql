-- {"key":"vul-12-stale-vulns","title":"Điểm yếu \"chết\" (open, không cập nhật > 60 ngày)","category":"Vuln - Lifecycle","description":"Issue ATTT open nhưng không ai cập nhật gì > 60 ngày. Có thể bị quên hoặc bỏ sót."}
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
  created, updated,
  CAST(julianday('now') - julianday(created) AS INTEGER) as age_days,
  CAST(julianday('now') - julianday(updated) AS INTEGER) as days_since_update
FROM security_issues
WHERE status_category != 'Done'
  AND CAST(julianday('now') - julianday(updated) AS INTEGER) > 60
ORDER BY days_since_update DESC
