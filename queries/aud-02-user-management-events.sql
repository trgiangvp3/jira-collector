-- {"key":"aud-02-user-management-events","title":"Sự kiện quản lý User (tạo, xóa, deactivate)","category":"Audit Log","description":"Theo dõi lifecycle tài khoản."}
SELECT
  summary, category, author_name,
  object_name, object_type, created
FROM audit_log
WHERE LOWER(category) LIKE '%user%'
   OR LOWER(summary) LIKE '%user%'
   OR LOWER(summary) LIKE '%account%'
   OR LOWER(summary) LIKE '%deactivat%'
   OR LOWER(summary) LIKE '%activat%'
   OR LOWER(summary) LIKE '%created%'
   OR LOWER(summary) LIKE '%deleted%'
ORDER BY created DESC
