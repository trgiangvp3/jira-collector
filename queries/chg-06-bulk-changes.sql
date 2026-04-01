-- {"key":"chg-06-bulk-changes","title":"User thực hiện nhiều thay đổi cùng lúc (bulk change)","category":"Change Management","description":"Phát hiện bulk change - nhiều thay đổi trong 1 phút bởi cùng 1 user. Có thể là thay đổi hàng loạt không qua kiểm duyệt."}
SELECT
  c.author_name,
  SUBSTR(c.created, 1, 16) as minute_window,
  COUNT(DISTINCT ci.issue_key) as issues_changed,
  GROUP_CONCAT(DISTINCT ci.field) as fields_changed,
  GROUP_CONCAT(DISTINCT ci.issue_key) as issue_keys
FROM changelogs c
JOIN changelog_items ci ON c.id = ci.changelog_id
GROUP BY c.author_name, SUBSTR(c.created, 1, 16)
HAVING issues_changed >= 5
ORDER BY issues_changed DESC
LIMIT 100
