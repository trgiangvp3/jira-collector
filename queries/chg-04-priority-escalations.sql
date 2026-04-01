-- {"key":"chg-04-priority-escalations","title":"Thay đổi Priority / Escalation","category":"Change Management","description":"Lịch sử nâng/hạ priority. Phát hiện escalation bất thường hoặc hạ priority để tránh SLA."}
SELECT
  ci.issue_key,
  i.project_key,
  ci.from_string as from_priority,
  ci.to_string as to_priority,
  c.author_name as changed_by,
  c.created as changed_at,
  i.summary
FROM changelog_items ci
JOIN changelogs c ON ci.changelog_id = c.id
LEFT JOIN issues i ON ci.issue_key = i.key
WHERE ci.field = 'priority'
ORDER BY c.created DESC
