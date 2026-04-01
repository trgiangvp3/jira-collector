-- {"key":"vrpt-03-all-open-detail","title":"TỔNG HỢP: Chi tiết tất cả điểm yếu đang mở","category":"Vuln - Report","description":"Danh sách đầy đủ tất cả issue ATTT đang open - dùng để attach vào báo cáo kiểm toán."}
WITH security_issues AS (
  SELECT * FROM issues
  WHERE LOWER(summary) LIKE '%vulnerab%' OR LOWER(summary) LIKE '%security%'
     OR LOWER(summary) LIKE '%bảo mật%' OR LOWER(summary) LIKE '%bao mat%'
     OR LOWER(summary) LIKE '%lỗ hổng%' OR LOWER(summary) LIKE '%điểm yếu%'
     OR LOWER(summary) LIKE '%cve-%' OR LOWER(summary) LIKE '%patch%'
     OR LOWER(summary) LIKE '%pentest%' OR LOWER(summary) LIKE '%hotfix%'
     OR LOWER(summary) LIKE '%incident%' OR LOWER(summary) LIKE '%sự cố%'
     OR LOWER(labels) LIKE '%security%' OR LOWER(labels) LIKE '%vulnerability%'
     OR LOWER(issue_type_name) LIKE '%security%' OR LOWER(issue_type_name) LIKE '%vulnerability%'
)
SELECT
  key as "Issue Key",
  project_key as "Project",
  issue_type_name as "Type",
  priority_name as "Priority",
  status_name as "Status",
  summary as "Summary",
  assignee_name as "Assignee",
  reporter_name as "Reporter",
  SUBSTR(created, 1, 10) as "Created",
  due_date as "Due Date",
  CAST(julianday('now') - julianday(created) AS INTEGER) as "Age (days)",
  CASE
    WHEN due_date IS NOT NULL AND due_date < date('now') THEN 'OVERDUE'
    WHEN due_date IS NULL THEN 'NO DEADLINE'
    ELSE 'On track'
  END as "Deadline Status",
  CASE
    WHEN assignee_key IS NULL THEN 'UNASSIGNED'
    ELSE 'Assigned'
  END as "Assignment Status",
  labels as "Labels",
  security_level as "Security Level"
FROM security_issues
WHERE status_category != 'Done'
ORDER BY
  CASE LOWER(priority_name) WHEN 'blocker' THEN 1 WHEN 'critical' THEN 2 WHEN 'highest' THEN 3 WHEN 'high' THEN 4 WHEN 'medium' THEN 5 WHEN 'low' THEN 6 ELSE 7 END,
  created ASC
