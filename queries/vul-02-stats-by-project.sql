-- {"key":"vul-02-stats-by-project","title":"Thống kê issues ATTT theo Project","category":"Vuln - Overview","description":"Phân bổ các issue ATTT theo từng project. Xác định project nào có nhiều điểm yếu nhất."}
WITH security_issues AS (
  SELECT * FROM issues
  WHERE LOWER(summary) LIKE '%vulnerab%'
     OR LOWER(summary) LIKE '%security%'
     OR LOWER(summary) LIKE '%bảo mật%'
     OR LOWER(summary) LIKE '%bao mat%'
     OR LOWER(summary) LIKE '%lỗ hổng%'
     OR LOWER(summary) LIKE '%lo hong%'
     OR LOWER(summary) LIKE '%điểm yếu%'
     OR LOWER(summary) LIKE '%diem yeu%'
     OR LOWER(summary) LIKE '%cve-%'
     OR LOWER(summary) LIKE '%pentest%'
     OR LOWER(summary) LIKE '%patch%'
     OR LOWER(summary) LIKE '%hotfix%'
     OR LOWER(summary) LIKE '%exploit%'
     OR LOWER(summary) LIKE '%incident%'
     OR LOWER(summary) LIKE '%sự cố%'
     OR LOWER(labels) LIKE '%security%'
     OR LOWER(labels) LIKE '%vulnerability%'
     OR LOWER(issue_type_name) LIKE '%security%'
     OR LOWER(issue_type_name) LIKE '%vulnerability%'
)
SELECT
  project_key,
  COUNT(*) as total,
  SUM(CASE WHEN status_category != 'Done' THEN 1 ELSE 0 END) as open,
  SUM(CASE WHEN status_category = 'Done' THEN 1 ELSE 0 END) as closed,
  SUM(CASE WHEN LOWER(priority_name) IN ('blocker','critical','highest','high') AND status_category != 'Done' THEN 1 ELSE 0 END) as high_open,
  SUM(CASE WHEN due_date IS NOT NULL AND due_date < date('now') AND status_category != 'Done' THEN 1 ELSE 0 END) as overdue,
  ROUND(AVG(CASE WHEN resolved IS NOT NULL THEN julianday(resolved) - julianday(created) END), 1) as avg_resolution_days,
  MIN(SUBSTR(created, 1, 10)) as earliest,
  MAX(SUBSTR(created, 1, 10)) as latest
FROM security_issues
GROUP BY project_key
ORDER BY total DESC
