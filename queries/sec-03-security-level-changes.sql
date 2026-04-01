-- {"key":"sec-03-security-level-changes","title":"Lịch sử thay đổi Security Level","category":"Security","description":"Theo dõi ai đã thay đổi (hạ/nâng) security level của issue. Phát hiện hạ mức bảo mật bất thường."}
SELECT
  ci.issue_key,
  ci.from_string as from_level,
  ci.to_string as to_level,
  c.author_name as changed_by,
  c.created as changed_at,
  i.summary,
  i.project_key
FROM changelog_items ci
JOIN changelogs c ON ci.changelog_id = c.id
LEFT JOIN issues i ON ci.issue_key = i.key
WHERE LOWER(ci.field) = 'security'
ORDER BY c.created DESC
