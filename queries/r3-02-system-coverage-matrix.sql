-- {"key":"r3-02-system-coverage-matrix","title":"[R3] Ma trận bao phủ: pentest + hardening + security per project","category":"R3 - Coverage Gap","description":"Tổng hợp mỗi project có bao nhiêu issue pentest, hardening, security. Project nào = 0 cả 3 là gap lớn nhất."}
SELECT
  p.key, p.name,
  COUNT(DISTINCT CASE WHEN LOWER(i.summary) LIKE '%pentest%' OR LOWER(i.summary) LIKE '%penetration%' OR LOWER(i.summary) LIKE '%va scan%' OR LOWER(i.labels) LIKE '%pentest%' THEN i.key END) as pentest_issues,
  COUNT(DISTINCT CASE WHEN LOWER(i.summary) LIKE '%hardening%' OR LOWER(i.summary) LIKE '%baseline%' OR LOWER(i.summary) LIKE '%security config%' OR LOWER(i.labels) LIKE '%hardening%' THEN i.key END) as hardening_issues,
  COUNT(DISTINCT CASE WHEN LOWER(i.summary) LIKE '%vulnerab%' OR LOWER(i.summary) LIKE '%cve-%' OR LOWER(i.summary) LIKE '%security%fix%' OR LOWER(i.summary) LIKE '%patch%' THEN i.key END) as vuln_fix_issues,
  COUNT(i.id) as total_issues,
  CASE
    WHEN COUNT(DISTINCT CASE WHEN LOWER(i.summary) LIKE '%pentest%' OR LOWER(i.summary) LIKE '%penetration%' OR LOWER(i.summary) LIKE '%va scan%' OR LOWER(i.labels) LIKE '%pentest%' THEN i.key END) = 0
     AND COUNT(DISTINCT CASE WHEN LOWER(i.summary) LIKE '%hardening%' OR LOWER(i.summary) LIKE '%baseline%' OR LOWER(i.labels) LIKE '%hardening%' THEN i.key END) = 0
    THEN '⚠ NO SECURITY ACTIVITY'
    WHEN COUNT(DISTINCT CASE WHEN LOWER(i.summary) LIKE '%pentest%' OR LOWER(i.summary) LIKE '%penetration%' OR LOWER(i.labels) LIKE '%pentest%' THEN i.key END) = 0
    THEN '⚠ No pentest'
    ELSE 'Has activity'
  END as gap_status
FROM projects p
LEFT JOIN issues i ON p.key = i.project_key
GROUP BY p.key
ORDER BY pentest_issues ASC, hardening_issues ASC
