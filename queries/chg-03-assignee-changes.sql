-- {"key":"chg-03-assignee-changes","title":"Thay đổi Assignee (30 ngày)","category":"Change Management","description":"Theo dõi reassign issue. Phát hiện chuyển issue bất thường."}
SELECT
  ci.issue_key,
  i.project_key,
  ci.from_string as from_assignee,
  ci.to_string as to_assignee,
  c.author_name as changed_by,
  c.created as changed_at,
  i.summary
FROM changelog_items ci
JOIN changelogs c ON ci.changelog_id = c.id
LEFT JOIN issues i ON ci.issue_key = i.key
WHERE ci.field = 'assignee'
  AND c.created >= date('now', '-30 days')
ORDER BY c.created DESC
