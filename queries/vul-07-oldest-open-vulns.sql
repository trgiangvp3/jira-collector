-- {"key":"vul-07-oldest-open-vulns","title":"Top 50 điểm yếu mở lâu nhất","category":"Vuln - SLA","description":"Điểm yếu tồn đọng lâu nhất. Rủi ro cao nếu là lỗ hổng đã biết nhưng chưa xử lý."}
WITH security_issues AS (
  SELECT * FROM issues
  WHERE LOWER(summary) LIKE '%vulnerab%' OR LOWER(summary) LIKE '%security%'
     OR LOWER(summary) LIKE '%bảo mật%' OR LOWER(summary) LIKE '%bao mat%'
     OR LOWER(summary) LIKE '%lỗ hổng%' OR LOWER(summary) LIKE '%điểm yếu%'
     OR LOWER(summary) LIKE '%cve-%' OR LOWER(summary) LIKE '%patch%'
     OR LOWER(summary) LIKE '%pentest%' OR LOWER(summary) LIKE '%hotfix%'
     OR LOWER(labels) LIKE '%security%' OR LOWER(labels) LIKE '%vulnerability%'
     OR LOWER(issue_type_name) LIKE '%security%' OR LOWER(issue_type_name) LIKE '%vulnerability%'
)
SELECT
  key, project_key, summary,
  priority_name, status_name,
  assignee_name, reporter_name,
  created, updated, due_date,
  CAST(julianday('now') - julianday(created) AS INTEGER) as age_days,
  CAST(julianday('now') - julianday(updated) AS INTEGER) as days_since_update
FROM security_issues
WHERE status_category != 'Done'
ORDER BY age_days DESC
LIMIT 50
