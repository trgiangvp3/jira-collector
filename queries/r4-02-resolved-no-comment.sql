-- {"key":"r4-02-resolved-no-comment","title":"[R4] Issues ATTT đã đóng nhưng KHÔNG CÓ comment nào","category":"R4 - No Remediation","description":"Issue security resolved mà 0 comments. Không có thảo luận = không có bằng chứng ai đã review, phân tích, xử lý."}
SELECT
  i.key, i.project_key,
  SUBSTR(i.summary, 1, 80) as summary,
  i.priority_name, i.status_name,
  i.assignee_name, i.reporter_name,
  SUBSTR(i.created, 1, 10) as created,
  SUBSTR(i.resolved, 1, 10) as resolved,
  CAST(julianday(i.resolved) - julianday(i.created) AS INTEGER) as days_to_resolve,
  (SELECT COUNT(*) FROM changelogs c WHERE c.issue_key = i.key) as changelog_entries,
  '⚠ ZERO COMMENTS' as red_flag
FROM issues i
LEFT JOIN comments c ON i.key = c.issue_key
WHERE i.status_category = 'Done'
  AND c.id IS NULL
  AND (LOWER(i.summary) LIKE '%pentest%' OR LOWER(i.summary) LIKE '%penetration%'
    OR LOWER(i.summary) LIKE '%vulnerab%' OR LOWER(i.summary) LIKE '%finding%'
    OR LOWER(i.summary) LIKE '%security%' OR LOWER(i.summary) LIKE '%bảo mật%'
    OR LOWER(i.labels) LIKE '%pentest%' OR LOWER(i.labels) LIKE '%security%')
ORDER BY days_to_resolve ASC
