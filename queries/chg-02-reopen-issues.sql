-- {"key":"chg-02-reopen-issues","title":"Issues bị Reopen nhiều lần","category":"Change Management","description":"Issue bị reopen > 1 lần có thể chỉ ra vấn đề về chất lượng hoặc quy trình kiểm thử."}
SELECT
  ci.issue_key,
  i.project_key,
  i.summary,
  i.assignee_name,
  COUNT(*) as reopen_count,
  GROUP_CONCAT(c.author_name || ' (' || SUBSTR(c.created, 1, 10) || ')') as reopen_history
FROM changelog_items ci
JOIN changelogs c ON ci.changelog_id = c.id
LEFT JOIN issues i ON ci.issue_key = i.key
WHERE ci.field = 'status'
  AND (LOWER(ci.to_string) LIKE '%reopen%' OR LOWER(ci.to_string) LIKE '%open%')
  AND LOWER(ci.from_string) NOT LIKE '%open%'
GROUP BY ci.issue_key
HAVING reopen_count > 1
ORDER BY reopen_count DESC
