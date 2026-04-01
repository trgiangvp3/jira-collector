-- {"key":"who-02-vuln-reporter-stats","title":"Nguồn phát hiện điểm yếu (Reporter)","category":"Vuln - Responsibility","description":"Ai/đội nào report nhiều issue ATTT nhất. Đánh giá nguồn phát hiện lỗ hổng."}
WITH security_issues AS (
  SELECT * FROM issues
  WHERE LOWER(summary) LIKE '%vulnerab%' OR LOWER(summary) LIKE '%security%'
     OR LOWER(summary) LIKE '%bảo mật%' OR LOWER(summary) LIKE '%lỗ hổng%'
     OR LOWER(summary) LIKE '%điểm yếu%' OR LOWER(summary) LIKE '%cve-%'
     OR LOWER(summary) LIKE '%patch%' OR LOWER(summary) LIKE '%pentest%'
     OR LOWER(summary) LIKE '%incident%'
     OR LOWER(labels) LIKE '%security%' OR LOWER(labels) LIKE '%vulnerability%'
     OR LOWER(issue_type_name) LIKE '%security%' OR LOWER(issue_type_name) LIKE '%vulnerability%'
)
SELECT
  reporter_name,
  COUNT(*) as total_reported,
  SUM(CASE WHEN status_category = 'Done' THEN 1 ELSE 0 END) as resolved,
  SUM(CASE WHEN status_category != 'Done' THEN 1 ELSE 0 END) as still_open,
  COUNT(DISTINCT project_key) as projects,
  MIN(SUBSTR(created, 1, 10)) as first_report,
  MAX(SUBSTR(created, 1, 10)) as last_report
FROM security_issues
WHERE reporter_name IS NOT NULL
GROUP BY reporter_key
ORDER BY total_reported DESC
