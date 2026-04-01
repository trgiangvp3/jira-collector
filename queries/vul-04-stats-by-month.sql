-- {"key":"vul-04-stats-by-month","title":"Xu hướng issues ATTT theo tháng (tạo vs đóng)","category":"Vuln - Overview","description":"Xu hướng phát hiện và xử lý điểm yếu theo thời gian. Đánh giá năng lực xử lý."}
WITH security_issues AS (
  SELECT * FROM issues
  WHERE LOWER(summary) LIKE '%vulnerab%' OR LOWER(summary) LIKE '%security%'
     OR LOWER(summary) LIKE '%bảo mật%' OR LOWER(summary) LIKE '%bao mat%'
     OR LOWER(summary) LIKE '%lỗ hổng%' OR LOWER(summary) LIKE '%điểm yếu%'
     OR LOWER(summary) LIKE '%cve-%' OR LOWER(summary) LIKE '%patch%'
     OR LOWER(summary) LIKE '%pentest%' OR LOWER(summary) LIKE '%incident%'
     OR LOWER(labels) LIKE '%security%' OR LOWER(labels) LIKE '%vulnerability%'
     OR LOWER(issue_type_name) LIKE '%security%' OR LOWER(issue_type_name) LIKE '%vulnerability%'
),
months AS (
  SELECT DISTINCT SUBSTR(created, 1, 7) as month FROM security_issues
  UNION
  SELECT DISTINCT SUBSTR(resolved, 1, 7) FROM security_issues WHERE resolved IS NOT NULL
)
SELECT
  m.month,
  COALESCE(c.created_count, 0) as created,
  COALESCE(r.resolved_count, 0) as resolved,
  COALESCE(c.created_count, 0) - COALESCE(r.resolved_count, 0) as net_new
FROM months m
LEFT JOIN (SELECT SUBSTR(created, 1, 7) as month, COUNT(*) as created_count FROM security_issues GROUP BY SUBSTR(created, 1, 7)) c ON m.month = c.month
LEFT JOIN (SELECT SUBSTR(resolved, 1, 7) as month, COUNT(*) as resolved_count FROM security_issues WHERE resolved IS NOT NULL GROUP BY SUBSTR(resolved, 1, 7)) r ON m.month = r.month
WHERE m.month IS NOT NULL
ORDER BY m.month DESC
