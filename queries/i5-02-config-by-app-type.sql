-- {"key":"i5-02-config-by-app-type","title":"[I.5] Issues cấu hình theo loại ứng dụng (Web/Mobile/API/Desktop)","category":"I.5 - Config Baseline","description":"Phân loại issues liên quan cấu hình bảo mật theo loại ứng dụng: Web app, Mobile app, API, Desktop."}
WITH config_issues AS (
  SELECT * FROM issues
  WHERE LOWER(summary) LIKE '%hardening%' OR LOWER(summary) LIKE '%baseline%'
     OR LOWER(summary) LIKE '%security config%' OR LOWER(summary) LIKE '%cấu hình%'
     OR LOWER(summary) LIKE '%security header%' OR LOWER(summary) LIKE '%ssl%'
     OR LOWER(summary) LIKE '%tls%' OR LOWER(summary) LIKE '%certificate%'
     OR LOWER(summary) LIKE '%cipher%' OR LOWER(summary) LIKE '%hsts%'
     OR LOWER(summary) LIKE '%cors%' OR LOWER(summary) LIKE '%csp%'
     OR LOWER(summary) LIKE '%session%' OR LOWER(summary) LIKE '%cookie%'
     OR LOWER(summary) LIKE '%password policy%' OR LOWER(summary) LIKE '%lockout%'
     OR LOWER(summary) LIKE '%default password%' OR LOWER(summary) LIKE '%debug%'
     OR LOWER(summary) LIKE '%error handling%' OR LOWER(summary) LIKE '%rate limit%'
     OR LOWER(labels) LIKE '%hardening%' OR LOWER(labels) LIKE '%baseline%'
)
SELECT
  CASE
    WHEN LOWER(summary) LIKE '%mobile%' OR LOWER(summary) LIKE '%android%' OR LOWER(summary) LIKE '%ios%' OR LOWER(summary) LIKE '%app%mobile%' THEN 'Mobile App'
    WHEN LOWER(summary) LIKE '%api%' OR LOWER(summary) LIKE '%rest%' OR LOWER(summary) LIKE '%endpoint%' OR LOWER(summary) LIKE '%swagger%' THEN 'API'
    WHEN LOWER(summary) LIKE '%desktop%' OR LOWER(summary) LIKE '%client%' OR LOWER(summary) LIKE '%winform%' THEN 'Desktop App'
    WHEN LOWER(summary) LIKE '%web%' OR LOWER(summary) LIKE '%http%' OR LOWER(summary) LIKE '%browser%' OR LOWER(summary) LIKE '%header%' OR LOWER(summary) LIKE '%cookie%' OR LOWER(summary) LIKE '%cors%' OR LOWER(summary) LIKE '%csp%' THEN 'Web App'
    ELSE 'General / Unclassified'
  END as app_type,
  COUNT(*) as total,
  SUM(CASE WHEN status_category = 'Done' THEN 1 ELSE 0 END) as done,
  SUM(CASE WHEN status_category != 'Done' THEN 1 ELSE 0 END) as open,
  GROUP_CONCAT(DISTINCT key) as issue_keys
FROM config_issues
GROUP BY app_type
ORDER BY total DESC
