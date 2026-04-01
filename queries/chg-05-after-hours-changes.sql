-- {"key":"chg-05-after-hours-changes","title":"Thay đổi ngoài giờ hành chính (trước 7h, sau 19h)","category":"Change Management","description":"Hoạt động ngoài giờ làm việc có thể là dấu hiệu bất thường cần rà soát."}
SELECT
  ci.issue_key,
  ci.field,
  ci.from_string,
  ci.to_string,
  c.author_name,
  c.created,
  CAST(SUBSTR(c.created, 12, 2) AS INTEGER) as hour_of_day,
  i.project_key
FROM changelog_items ci
JOIN changelogs c ON ci.changelog_id = c.id
LEFT JOIN issues i ON ci.issue_key = i.key
WHERE (CAST(SUBSTR(c.created, 12, 2) AS INTEGER) < 7
    OR CAST(SUBSTR(c.created, 12, 2) AS INTEGER) >= 19)
ORDER BY c.created DESC
LIMIT 500
