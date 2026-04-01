-- {"key":"vul-06-resolution-time-analysis","title":"Phân tích thời gian xử lý điểm yếu đã đóng","category":"Vuln - SLA","description":"Thống kê thời gian xử lý (từ tạo đến resolved) theo priority. Đánh giá có đáp ứng SLA không."}
WITH security_issues AS (
  SELECT * FROM issues
  WHERE (LOWER(summary) LIKE '%vulnerab%' OR LOWER(summary) LIKE '%security%'
     OR LOWER(summary) LIKE '%bảo mật%' OR LOWER(summary) LIKE '%lỗ hổng%'
     OR LOWER(summary) LIKE '%điểm yếu%' OR LOWER(summary) LIKE '%cve-%'
     OR LOWER(summary) LIKE '%patch%' OR LOWER(summary) LIKE '%pentest%'
     OR LOWER(labels) LIKE '%security%' OR LOWER(labels) LIKE '%vulnerability%'
     OR LOWER(issue_type_name) LIKE '%security%' OR LOWER(issue_type_name) LIKE '%vulnerability%')
    AND resolved IS NOT NULL
)
SELECT
  priority_name,
  COUNT(*) as total_resolved,
  ROUND(MIN(julianday(resolved) - julianday(created)), 0) as min_days,
  ROUND(AVG(julianday(resolved) - julianday(created)), 1) as avg_days,
  ROUND(MAX(julianday(resolved) - julianday(created)), 0) as max_days,
  SUM(CASE WHEN julianday(resolved) - julianday(created) <= 7 THEN 1 ELSE 0 END) as within_7d,
  SUM(CASE WHEN julianday(resolved) - julianday(created) <= 30 THEN 1 ELSE 0 END) as within_30d,
  SUM(CASE WHEN julianday(resolved) - julianday(created) <= 90 THEN 1 ELSE 0 END) as within_90d,
  SUM(CASE WHEN julianday(resolved) - julianday(created) > 90 THEN 1 ELSE 0 END) as over_90d
FROM security_issues
GROUP BY priority_name
ORDER BY
  CASE LOWER(priority_name) WHEN 'blocker' THEN 1 WHEN 'critical' THEN 2 WHEN 'highest' THEN 3 WHEN 'high' THEN 4 WHEN 'medium' THEN 5 WHEN 'low' THEN 6 ELSE 7 END
