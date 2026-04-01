-- {"key":"aud-03-config-changes","title":"Thay đổi cấu hình hệ thống","category":"Audit Log","description":"Sự kiện thay đổi system config, workflow, scheme."}
SELECT
  summary, category, author_name,
  object_name, object_type, created
FROM audit_log
WHERE LOWER(category) LIKE '%system%'
   OR LOWER(category) LIKE '%global%'
   OR LOWER(category) LIKE '%workflow%'
   OR LOWER(category) LIKE '%config%'
   OR LOWER(summary) LIKE '%workflow%'
   OR LOWER(summary) LIKE '%configuration%'
ORDER BY created DESC
