-- {"key":"r2-02-findings-per-system","title":"[R2] Số findings trung bình per hệ thống/project","category":"R2 - Shallow Pentest","description":"Pentest thực tế cho 1 hệ thống banking thường phát hiện 10-50 findings. Nếu chỉ 1-3 findings/hệ thống -> pentest sơ sài."}
WITH pentest_findings AS (
  SELECT * FROM issues
  WHERE LOWER(summary) LIKE '%pentest%' OR LOWER(summary) LIKE '%penetration%'
     OR LOWER(summary) LIKE '%va scan%' OR LOWER(summary) LIKE '%finding%'
     OR LOWER(summary) LIKE '%vulnerability%'
     OR LOWER(labels) LIKE '%pentest%' OR LOWER(labels) LIKE '%va-scan%'
)
SELECT
  project_key,
  COUNT(*) as total_findings,
  SUM(CASE WHEN LOWER(priority_name) IN ('blocker','critical','highest','high') THEN 1 ELSE 0 END) as high_critical,
  SUM(CASE WHEN LOWER(priority_name) = 'medium' THEN 1 ELSE 0 END) as medium,
  SUM(CASE WHEN LOWER(priority_name) IN ('low','lowest','trivial') THEN 1 ELSE 0 END) as low,
  SUM(CASE WHEN status_category = 'Done' THEN 1 ELSE 0 END) as resolved,
  SUM(CASE WHEN status_category != 'Done' THEN 1 ELSE 0 END) as open,
  CASE WHEN COUNT(*) <= 3 THEN '⚠ SUSPICIOUSLY LOW' ELSE 'OK' END as assessment
FROM pentest_findings
GROUP BY project_key
ORDER BY total_findings ASC
