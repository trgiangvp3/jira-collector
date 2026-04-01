-- {"key":"inc-01-security-incidents","title":"Issues liên quan sự cố ATTT","category":"Security Incidents","description":"Tất cả issue liên quan đến sự cố bảo mật, incident, breach, tấn công."}
SELECT
  key, project_key, issue_type_name, summary,
  priority_name, status_name, status_category,
  assignee_name, reporter_name,
  created, resolved,
  CASE WHEN resolved IS NOT NULL THEN CAST(julianday(resolved) - julianday(created) AS INTEGER) END as resolution_days,
  labels
FROM issues
WHERE LOWER(summary) LIKE '%incident%'
   OR LOWER(summary) LIKE '%sự cố%'
   OR LOWER(summary) LIKE '%su co%'
   OR LOWER(summary) LIKE '%breach%'
   OR LOWER(summary) LIKE '%tấn công%'
   OR LOWER(summary) LIKE '%tan cong%'
   OR LOWER(summary) LIKE '%attack%'
   OR LOWER(summary) LIKE '%intrusion%'
   OR LOWER(summary) LIKE '%xâm nhập%'
   OR LOWER(summary) LIKE '%malware%'
   OR LOWER(summary) LIKE '%ransomware%'
   OR LOWER(summary) LIKE '%phishing%'
   OR LOWER(summary) LIKE '%ddos%'
   OR LOWER(summary) LIKE '%data leak%'
   OR LOWER(summary) LIKE '%rò rỉ%'
   OR LOWER(summary) LIKE '%ro ri%'
   OR LOWER(issue_type_name) LIKE '%incident%'
   OR LOWER(labels) LIKE '%incident%'
ORDER BY created DESC
