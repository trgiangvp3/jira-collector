-- {"key":"vul-11-reopened-vulns","title":"Điểm yếu bị Reopen","category":"Vuln - Lifecycle","description":"Issue ATTT từng Done/Closed nhưng bị reopen. Cho thấy xử lý chưa triệt để hoặc lỗ hổng tái phát."}
WITH security_issues AS (
  SELECT key FROM issues
  WHERE LOWER(summary) LIKE '%vulnerab%' OR LOWER(summary) LIKE '%security%'
     OR LOWER(summary) LIKE '%bảo mật%' OR LOWER(summary) LIKE '%lỗ hổng%'
     OR LOWER(summary) LIKE '%điểm yếu%' OR LOWER(summary) LIKE '%cve-%'
     OR LOWER(summary) LIKE '%patch%' OR LOWER(summary) LIKE '%pentest%'
     OR LOWER(labels) LIKE '%security%' OR LOWER(labels) LIKE '%vulnerability%'
     OR LOWER(issue_type_name) LIKE '%security%' OR LOWER(issue_type_name) LIKE '%vulnerability%'
)
SELECT
  ci.issue_key,
  i.project_key, i.summary, i.priority_name, i.status_name, i.assignee_name,
  COUNT(*) as reopen_count,
  GROUP_CONCAT(c.author_name || ' (' || SUBSTR(c.created, 1, 10) || ')') as reopen_events
FROM changelog_items ci
JOIN changelogs c ON ci.changelog_id = c.id
JOIN issues i ON ci.issue_key = i.key
WHERE ci.field = 'status'
  AND ci.issue_key IN (SELECT key FROM security_issues)
  AND LOWER(ci.from_string) IN ('done', 'closed', 'resolved')
  AND LOWER(ci.to_string) NOT IN ('done', 'closed', 'resolved')
GROUP BY ci.issue_key
ORDER BY reopen_count DESC
