-- {"key":"r1-03-bulk-resolve-pattern","title":"[R1] Bulk resolve - nhiều issue ATTT đóng cùng ngày bởi cùng người","category":"R1 - Backdating","description":"Nhiều issue security được resolve cùng ngày bởi cùng 1 user. Dấu hiệu đóng hàng loạt mà không thực sự xử lý từng finding."}
WITH sec_status_changes AS (
  SELECT
    ci.issue_key, ci.to_string as new_status,
    c.author_name, SUBSTR(c.created, 1, 10) as change_date
  FROM changelog_items ci
  JOIN changelogs c ON ci.changelog_id = c.id
  WHERE ci.field = 'status'
    AND LOWER(ci.to_string) IN ('done', 'closed', 'resolved')
    AND ci.issue_key IN (
      SELECT key FROM issues
      WHERE LOWER(summary) LIKE '%pentest%' OR LOWER(summary) LIKE '%penetration%'
         OR LOWER(summary) LIKE '%va scan%' OR LOWER(summary) LIKE '%vulnerability%'
         OR LOWER(summary) LIKE '%finding%' OR LOWER(summary) LIKE '%security%'
         OR LOWER(labels) LIKE '%pentest%' OR LOWER(labels) LIKE '%security%'
    )
)
SELECT
  author_name as resolved_by,
  change_date,
  COUNT(*) as issues_resolved,
  GROUP_CONCAT(issue_key) as issue_keys
FROM sec_status_changes
GROUP BY author_name, change_date
HAVING issues_resolved >= 3
ORDER BY issues_resolved DESC
