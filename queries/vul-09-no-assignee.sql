-- {"key":"vul-09-no-assignee","title":"Điểm yếu chưa có người xử lý (no assignee)","category":"Vuln - Lifecycle","description":"Issue ATTT open nhưng chưa được giao cho ai. Rủi ro bị bỏ sót."}
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
  priority_name, status_name, reporter_name,
  created,
  CAST(julianday('now') - julianday(created) AS INTEGER) as age_days
FROM security_issues
WHERE assignee_key IS NULL
  AND status_category != 'Done'
ORDER BY
  CASE LOWER(priority_name) WHEN 'blocker' THEN 1 WHEN 'critical' THEN 2 WHEN 'highest' THEN 3 WHEN 'high' THEN 4 ELSE 5 END,
  created ASC
