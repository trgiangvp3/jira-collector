-- {"key":"i5-04-ssl-tls-issues","title":"[I.5] Issues liên quan SSL/TLS/Certificate","category":"I.5 - Config Baseline","description":"Vấn đề cấu hình SSL/TLS: certificate hết hạn, cipher yếu, protocol cũ. Quan trọng cho hệ thống banking."}
SELECT
  key, project_key, summary,
  priority_name, status_name, status_category,
  assignee_name,
  created, resolved, due_date,
  CAST(julianday('now') - julianday(created) AS INTEGER) as age_days
FROM issues
WHERE LOWER(summary) LIKE '%ssl%'
   OR LOWER(summary) LIKE '%tls%'
   OR LOWER(summary) LIKE '%certificate%'
   OR LOWER(summary) LIKE '%chứng chỉ số%'
   OR LOWER(summary) LIKE '%chung chi so%'
   OR LOWER(summary) LIKE '%cipher%'
   OR LOWER(summary) LIKE '%https%'
   OR LOWER(summary) LIKE '%hết hạn%cert%'
   OR LOWER(summary) LIKE '%expired%cert%'
   OR LOWER(summary) LIKE '%renew%cert%'
   OR LOWER(summary) LIKE '%gia hạn%cert%'
ORDER BY created DESC
