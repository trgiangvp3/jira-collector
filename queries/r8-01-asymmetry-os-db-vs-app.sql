-- {"key":"r8-01-asymmetry-os-db-vs-app","title":"[R8] Bất đối xứng: OS/DB audit có, App audit không","category":"R8 - No App Baseline","description":"So sánh số issue audit/hardening cho OS, Database, và Application. Nếu OS+DB có nhiều nhưng App = 0 -> bằng chứng thiếu tiêu chuẩn app."}
SELECT
  CASE
    WHEN LOWER(summary) LIKE '%os%' OR LOWER(summary) LIKE '%operating system%'
      OR LOWER(summary) LIKE '%windows%server%' OR LOWER(summary) LIKE '%linux%'
      OR LOWER(summary) LIKE '%redhat%' OR LOWER(summary) LIKE '%centos%'
      OR LOWER(summary) LIKE '%ubuntu%' THEN 'OS / Operating System'
    WHEN LOWER(summary) LIKE '%database%' OR LOWER(summary) LIKE '%oracle%db%'
      OR LOWER(summary) LIKE '%sql server%' OR LOWER(summary) LIKE '%mysql%'
      OR LOWER(summary) LIKE '%postgresql%' OR LOWER(summary) LIKE '%csdl%'
      OR LOWER(summary) LIKE '%cơ sở dữ liệu%' THEN 'Database'
    WHEN LOWER(summary) LIKE '%web app%' OR LOWER(summary) LIKE '%mobile app%'
      OR LOWER(summary) LIKE '%api%' OR LOWER(summary) LIKE '%ứng dụng%'
      OR LOWER(summary) LIKE '%application%' THEN 'Application'
    ELSE 'Other/General'
  END as layer,
  COUNT(*) as total_issues,
  SUM(CASE WHEN status_category = 'Done' THEN 1 ELSE 0 END) as resolved,
  SUM(CASE WHEN status_category != 'Done' THEN 1 ELSE 0 END) as open
FROM issues
WHERE LOWER(summary) LIKE '%hardening%' OR LOWER(summary) LIKE '%baseline%'
   OR LOWER(summary) LIKE '%audit config%' OR LOWER(summary) LIKE '%security config%'
   OR LOWER(summary) LIKE '%cis benchmark%' OR LOWER(summary) LIKE '%stig%'
   OR LOWER(summary) LIKE '%cấu hình%' OR LOWER(summary) LIKE '%tiêu chuẩn%'
   OR LOWER(labels) LIKE '%hardening%' OR LOWER(labels) LIKE '%baseline%'
   OR LOWER(labels) LIKE '%audit%config%'
GROUP BY layer
ORDER BY total_issues DESC
