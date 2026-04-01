-- {"key":"chg-01-status-changes-recent","title":"Thay đổi trạng thái issue (30 ngày gần nhất)","category":"Change Management","description":"Theo dõi luồng thay đổi trạng thái. Phát hiện bỏ qua quy trình (skip approval, reopen bất thường)."}
SELECT
  ci.issue_key,
  i.project_key,
  ci.from_string as from_status,
  ci.to_string as to_status,
  c.author_name as changed_by,
  c.created as changed_at,
  i.summary
FROM changelog_items ci
JOIN changelogs c ON ci.changelog_id = c.id
LEFT JOIN issues i ON ci.issue_key = i.key
WHERE ci.field = 'status'
  AND c.created >= date('now', '-30 days')
ORDER BY c.created DESC
