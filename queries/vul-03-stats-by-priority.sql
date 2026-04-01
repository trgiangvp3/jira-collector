-- {"key":"vul-03-stats-by-priority","title":"Thống kê issues ATTT theo Priority","category":"Vuln - Overview","description":"Phân bổ theo mức ưu tiên. Đánh giá có phân loại severity hợp lý không."}
WITH security_issues AS (
  SELECT * FROM issues
  WHERE LOWER(summary) LIKE '%vulnerab%' OR LOWER(summary) LIKE '%security%'
     OR LOWER(summary) LIKE '%bảo mật%' OR LOWER(summary) LIKE '%bao mat%'
     OR LOWER(summary) LIKE '%lỗ hổng%' OR LOWER(summary) LIKE '%lo hong%'
     OR LOWER(summary) LIKE '%điểm yếu%' OR LOWER(summary) LIKE '%diem yeu%'
     OR LOWER(summary) LIKE '%cve-%' OR LOWER(summary) LIKE '%pentest%'
     OR LOWER(summary) LIKE '%patch%' OR LOWER(summary) LIKE '%hotfix%'
     OR LOWER(summary) LIKE '%incident%' OR LOWER(summary) LIKE '%sự cố%'
     OR LOWER(labels) LIKE '%security%' OR LOWER(labels) LIKE '%vulnerability%'
     OR LOWER(issue_type_name) LIKE '%security%' OR LOWER(issue_type_name) LIKE '%vulnerability%'
)
SELECT
  priority_name,
  COUNT(*) as total,
  SUM(CASE WHEN status_category != 'Done' THEN 1 ELSE 0 END) as still_open,
  SUM(CASE WHEN status_category = 'Done' THEN 1 ELSE 0 END) as closed,
  ROUND(AVG(CASE WHEN resolved IS NOT NULL THEN julianday(resolved) - julianday(created) END), 1) as avg_days_to_resolve,
  MAX(CASE WHEN status_category != 'Done' THEN CAST(julianday('now') - julianday(created) AS INTEGER) END) as oldest_open_days,
  SUM(CASE WHEN due_date IS NOT NULL AND due_date < date('now') AND status_category != 'Done' THEN 1 ELSE 0 END) as overdue
FROM security_issues
GROUP BY priority_name
ORDER BY
  CASE LOWER(priority_name) WHEN 'blocker' THEN 1 WHEN 'critical' THEN 2 WHEN 'highest' THEN 3 WHEN 'high' THEN 4 WHEN 'medium' THEN 5 WHEN 'low' THEN 6 WHEN 'lowest' THEN 7 ELSE 8 END
