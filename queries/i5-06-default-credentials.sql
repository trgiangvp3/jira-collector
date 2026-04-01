-- {"key":"i5-06-default-credentials","title":"[I.5] Issues liên quan Default Credential / Password Policy","category":"I.5 - Config Baseline","description":"Vấn đề mật khẩu mặc định, chính sách mật khẩu, account lockout. Rủi ro lớn cho hệ thống banking."}
SELECT
  key, project_key, summary,
  priority_name, status_name, status_category,
  assignee_name, created, resolved,
  CAST(julianday('now') - julianday(created) AS INTEGER) as age_days
FROM issues
WHERE LOWER(summary) LIKE '%default password%'
   OR LOWER(summary) LIKE '%default credential%'
   OR LOWER(summary) LIKE '%mật khẩu mặc định%'
   OR LOWER(summary) LIKE '%mat khau mac dinh%'
   OR LOWER(summary) LIKE '%password policy%'
   OR LOWER(summary) LIKE '%chính sách mật khẩu%'
   OR LOWER(summary) LIKE '%chinh sach mat khau%'
   OR LOWER(summary) LIKE '%password complex%'
   OR LOWER(summary) LIKE '%password strength%'
   OR LOWER(summary) LIKE '%account lockout%'
   OR LOWER(summary) LIKE '%brute force%'
   OR LOWER(summary) LIKE '%rate limit%'
   OR LOWER(summary) LIKE '%login attempt%'
   OR LOWER(summary) LIKE '%2fa%'
   OR LOWER(summary) LIKE '%two factor%'
   OR LOWER(summary) LIKE '%multi factor%'
   OR LOWER(summary) LIKE '%mfa%'
   OR LOWER(summary) LIKE '%xác thực hai%'
   OR LOWER(summary) LIKE '%xác thực 2%'
ORDER BY created DESC
