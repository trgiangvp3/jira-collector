-- {"key":"aud-01-permission-changes","title":"Thay đổi quyền trong Audit Log","category":"Audit Log","description":"Tất cả sự kiện liên quan đến thay đổi quyền, group, scheme."}
SELECT
  summary, category, author_name,
  object_name, object_type, created
FROM audit_log
WHERE LOWER(category) LIKE '%permission%'
   OR LOWER(category) LIKE '%security%'
   OR LOWER(category) LIKE '%scheme%'
   OR LOWER(summary) LIKE '%permission%'
   OR LOWER(summary) LIKE '%group%'
   OR LOWER(summary) LIKE '%role%'
   OR LOWER(summary) LIKE '%scheme%'
ORDER BY created DESC
