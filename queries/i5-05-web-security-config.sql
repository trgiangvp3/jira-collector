-- {"key":"i5-05-web-security-config","title":"[I.5] Issues cấu hình bảo mật Web (headers, CORS, CSP, session)","category":"I.5 - Config Baseline","description":"Vấn đề cấu hình bảo mật web application: security headers, CORS, CSP, session management, cookie."}
SELECT
  key, project_key, summary,
  priority_name, status_name, status_category,
  assignee_name, created, resolved,
  CAST(julianday('now') - julianday(created) AS INTEGER) as age_days
FROM issues
WHERE LOWER(summary) LIKE '%security header%'
   OR LOWER(summary) LIKE '%http header%'
   OR LOWER(summary) LIKE '%hsts%'
   OR LOWER(summary) LIKE '%x-frame%'
   OR LOWER(summary) LIKE '%x-content-type%'
   OR LOWER(summary) LIKE '%content-security-policy%'
   OR LOWER(summary) LIKE '%csp%policy%'
   OR LOWER(summary) LIKE '%cors%'
   OR LOWER(summary) LIKE '%cross-origin%'
   OR LOWER(summary) LIKE '%session%timeout%'
   OR LOWER(summary) LIKE '%session%management%'
   OR LOWER(summary) LIKE '%cookie%secure%'
   OR LOWER(summary) LIKE '%httponly%'
   OR LOWER(summary) LIKE '%samesite%'
   OR LOWER(summary) LIKE '%clickjack%'
   OR LOWER(summary) LIKE '%directory listing%'
   OR LOWER(summary) LIKE '%server header%'
   OR LOWER(summary) LIKE '%version disclosure%'
   OR LOWER(summary) LIKE '%information disclosure%'
   OR LOWER(summary) LIKE '%error page%'
   OR LOWER(summary) LIKE '%stack trace%'
   OR LOWER(summary) LIKE '%debug mode%'
ORDER BY created DESC
