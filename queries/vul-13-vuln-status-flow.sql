-- {"key":"vul-13-vuln-status-flow","title":"Lịch sử chuyển trạng thái các issue ATTT","category":"Vuln - Lifecycle","description":"Toàn bộ lịch sử thay đổi status của issue ATTT. Đánh giá tuân thủ quy trình."}
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
  i.summary,
  ci.from_string as from_status,
  ci.to_string as to_status,
  c.author_name as changed_by,
  c.created as changed_at
FROM changelog_items ci
JOIN changelogs c ON ci.changelog_id = c.id
JOIN issues i ON ci.issue_key = i.key
WHERE ci.field = 'status'
  AND ci.issue_key IN (SELECT key FROM security_issues)
ORDER BY ci.issue_key, c.created
