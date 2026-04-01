-- {"key":"vul-08-overdue-vulns","title":"Điểm yếu quá hạn (due date đã qua)","category":"Vuln - SLA","description":"Issue ATTT có due date đã qua nhưng chưa đóng. Vi phạm cam kết xử lý."}
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
  due_date,
  CAST(julianday('now') - julianday(due_date) AS INTEGER) as days_overdue,
  created
FROM security_issues
WHERE due_date IS NOT NULL
  AND due_date < date('now')
  AND status_category != 'Done'
ORDER BY days_overdue DESC
