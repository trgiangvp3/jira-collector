-- {"key":"vul-01-all-security-issues","title":"Tất cả issues liên quan ATTT / điểm yếu / lỗ hổng","category":"Vuln - Overview","description":"Tìm tất cả issue liên quan đến vulnerability, security, bảo mật, lỗ hổng, điểm yếu, CVE, pentest, VA scan. Đây là tập dữ liệu gốc để phân tích."}
SELECT
  i.key, i.project_key, i.issue_type_name, i.summary,
  i.priority_name, i.status_name, i.status_category,
  i.resolution_name,
  i.assignee_name, i.reporter_name,
  i.security_level,
  i.created, i.updated, i.resolved, i.due_date,
  CAST(julianday('now') - julianday(i.created) AS INTEGER) as age_days,
  CASE
    WHEN i.resolved IS NOT NULL THEN CAST(julianday(i.resolved) - julianday(i.created) AS INTEGER)
    ELSE NULL
  END as resolution_days,
  i.labels, i.components
FROM issues i
WHERE LOWER(i.summary) LIKE '%vulnerab%'
   OR LOWER(i.summary) LIKE '%security%'
   OR LOWER(i.summary) LIKE '%bảo mật%'
   OR LOWER(i.summary) LIKE '%bao mat%'
   OR LOWER(i.summary) LIKE '%lỗ hổng%'
   OR LOWER(i.summary) LIKE '%lo hong%'
   OR LOWER(i.summary) LIKE '%điểm yếu%'
   OR LOWER(i.summary) LIKE '%diem yeu%'
   OR LOWER(i.summary) LIKE '%cve-%'
   OR LOWER(i.summary) LIKE '%pentest%'
   OR LOWER(i.summary) LIKE '%pen test%'
   OR LOWER(i.summary) LIKE '%penetration%'
   OR LOWER(i.summary) LIKE '%va scan%'
   OR LOWER(i.summary) LIKE '%scan%vuln%'
   OR LOWER(i.summary) LIKE '%patch%'
   OR LOWER(i.summary) LIKE '%hotfix%'
   OR LOWER(i.summary) LIKE '%exploit%'
   OR LOWER(i.summary) LIKE '%malware%'
   OR LOWER(i.summary) LIKE '%ransomware%'
   OR LOWER(i.summary) LIKE '%incident%'
   OR LOWER(i.summary) LIKE '%sự cố%'
   OR LOWER(i.summary) LIKE '%su co%'
   OR LOWER(i.summary) LIKE '%waf%'
   OR LOWER(i.summary) LIKE '%firewall%'
   OR LOWER(i.summary) LIKE '%ids%'
   OR LOWER(i.summary) LIKE '%ips%'
   OR LOWER(i.summary) LIKE '%siem%'
   OR LOWER(i.summary) LIKE '%soc%'
   OR LOWER(i.summary) LIKE '%hardening%'
   OR LOWER(i.summary) LIKE '%compliance%'
   OR LOWER(i.summary) LIKE '%audit%'
   OR LOWER(i.summary) LIKE '%kiểm toán%'
   OR LOWER(i.summary) LIKE '%kiem toan%'
   OR LOWER(i.summary) LIKE '%owasp%'
   OR LOWER(i.summary) LIKE '%injection%'
   OR LOWER(i.summary) LIKE '%xss%'
   OR LOWER(i.summary) LIKE '%csrf%'
   OR LOWER(i.summary) LIKE '%ssl%'
   OR LOWER(i.summary) LIKE '%tls%'
   OR LOWER(i.summary) LIKE '%certificate%'
   OR LOWER(i.summary) LIKE '%encryption%'
   OR LOWER(i.summary) LIKE '%mã hóa%'
   OR LOWER(i.summary) LIKE '%access control%'
   OR LOWER(i.summary) LIKE '%phân quyền%'
   OR LOWER(i.summary) LIKE '%authentication%'
   OR LOWER(i.summary) LIKE '%authorization%'
   OR LOWER(i.summary) LIKE '%xác thực%'
   OR LOWER(i.labels) LIKE '%security%'
   OR LOWER(i.labels) LIKE '%vulnerability%'
   OR LOWER(i.labels) LIKE '%cve%'
   OR LOWER(i.labels) LIKE '%pentest%'
   OR LOWER(i.issue_type_name) LIKE '%bug%'
   OR LOWER(i.issue_type_name) LIKE '%security%'
   OR LOWER(i.issue_type_name) LIKE '%vulnerability%'
   OR LOWER(i.issue_type_name) LIKE '%incident%'
ORDER BY i.created DESC
