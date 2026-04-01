-- {"key":"r2-01-finding-severity-distribution","title":"[R2] Phân bố severity findings pentest","category":"R2 - Shallow Pentest","description":"Nếu hầu hết findings là Low/Info mà không có High/Critical -> pentest có thể hình thức, chỉ quét surface. So sánh với benchmark ngành (thường 10-20% High, 30-40% Medium)."}
WITH pentest_findings AS (
  SELECT * FROM issues
  WHERE LOWER(summary) LIKE '%pentest%' OR LOWER(summary) LIKE '%penetration%'
     OR LOWER(summary) LIKE '%va scan%' OR LOWER(summary) LIKE '%finding%'
     OR LOWER(summary) LIKE '%vulnerability%'
     OR LOWER(labels) LIKE '%pentest%' OR LOWER(labels) LIKE '%va-scan%'
)
SELECT
  priority_name as severity,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM pentest_findings), 1) as pct,
  SUM(CASE WHEN status_category = 'Done' THEN 1 ELSE 0 END) as resolved,
  SUM(CASE WHEN status_category != 'Done' THEN 1 ELSE 0 END) as open
FROM pentest_findings
GROUP BY priority_name
ORDER BY
  CASE LOWER(priority_name) WHEN 'blocker' THEN 1 WHEN 'critical' THEN 2 WHEN 'highest' THEN 3 WHEN 'high' THEN 4 WHEN 'medium' THEN 5 WHEN 'low' THEN 6 WHEN 'lowest' THEN 7 WHEN 'trivial' THEN 8 ELSE 9 END
