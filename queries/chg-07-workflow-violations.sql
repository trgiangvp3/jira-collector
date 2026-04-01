-- {"key":"chg-07-workflow-violations","title":"Chuyển trạng thái bất thường (có thể bypass workflow)","category":"Change Management","description":"Các chuyển đổi trạng thái đáng ngờ: Done->Open, Closed->In Progress, skip các bước trung gian."}
SELECT
  ci.issue_key,
  ci.from_string as from_status,
  ci.to_string as to_status,
  c.author_name,
  c.created,
  i.project_key,
  i.summary
FROM changelog_items ci
JOIN changelogs c ON ci.changelog_id = c.id
LEFT JOIN issues i ON ci.issue_key = i.key
WHERE ci.field = 'status'
  AND (
    (LOWER(ci.from_string) IN ('done', 'closed', 'resolved') AND LOWER(ci.to_string) IN ('open', 'to do', 'new'))
    OR (LOWER(ci.from_string) IN ('done', 'closed') AND LOWER(ci.to_string) LIKE '%progress%')
  )
ORDER BY c.created DESC
