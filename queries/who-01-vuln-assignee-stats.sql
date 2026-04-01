-- {"key":"who-01-vuln-assignee-stats","title":"Thống kê người xử lý điểm yếu ATTT","category":"Vuln - Responsibility","description":"Ai xử lý bao nhiêu issue ATTT, tỷ lệ hoàn thành, thời gian trung bình."}
WITH security_issues AS (
  SELECT * FROM issues
  WHERE LOWER(summary) LIKE '%vulnerab%' OR LOWER(summary) LIKE '%security%'
     OR LOWER(summary) LIKE '%bảo mật%' OR LOWER(summary) LIKE '%lỗ hổng%'
     OR LOWER(summary) LIKE '%điểm yếu%' OR LOWER(summary) LIKE '%cve-%'
     OR LOWER(summary) LIKE '%patch%' OR LOWER(summary) LIKE '%pentest%'
     OR LOWER(summary) LIKE '%incident%' OR LOWER(summary) LIKE '%sự cố%'
     OR LOWER(labels) LIKE '%security%' OR LOWER(labels) LIKE '%vulnerability%'
     OR LOWER(issue_type_name) LIKE '%security%' OR LOWER(issue_type_name) LIKE '%vulnerability%'
)
SELECT
  assignee_name,
  COUNT(*) as total_assigned,
  SUM(CASE WHEN status_category = 'Done' THEN 1 ELSE 0 END) as completed,
  SUM(CASE WHEN status_category != 'Done' THEN 1 ELSE 0 END) as open,
  ROUND(100.0 * SUM(CASE WHEN status_category = 'Done' THEN 1 ELSE 0 END) / COUNT(*), 1) as completion_pct,
  ROUND(AVG(CASE WHEN resolved IS NOT NULL THEN julianday(resolved) - julianday(created) END), 1) as avg_resolution_days,
  SUM(CASE WHEN LOWER(priority_name) IN ('blocker','critical','highest','high') AND status_category != 'Done' THEN 1 ELSE 0 END) as high_open
FROM security_issues
WHERE assignee_name IS NOT NULL
GROUP BY assignee_key
ORDER BY total_assigned DESC
