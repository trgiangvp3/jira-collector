-- {"key":"vul-05-sla-breach-critical","title":"Điểm yếu Critical/High mở quá 30 ngày","category":"Vuln - SLA","description":"Theo thông lệ ngân hàng, lỗ hổng Critical nên xử lý trong 7-15 ngày, High trong 30 ngày. Liệt kê các điểm yếu vi phạm SLA."}
WITH security_issues AS (
  SELECT * FROM issues
  WHERE LOWER(summary) LIKE '%vulnerab%' OR LOWER(summary) LIKE '%security%'
     OR LOWER(summary) LIKE '%bảo mật%' OR LOWER(summary) LIKE '%bao mat%'
     OR LOWER(summary) LIKE '%lỗ hổng%' OR LOWER(summary) LIKE '%điểm yếu%'
     OR LOWER(summary) LIKE '%cve-%' OR LOWER(summary) LIKE '%patch%'
     OR LOWER(summary) LIKE '%pentest%' OR LOWER(summary) LIKE '%hotfix%'
     OR LOWER(labels) LIKE '%security%' OR LOWER(labels) LIKE '%vulnerability%'
     OR LOWER(issue_type_name) LIKE '%security%' OR LOWER(issue_type_name) LIKE '%vulnerability%'
)
SELECT
  key, project_key, summary,
  priority_name, status_name,
  assignee_name,
  created, due_date,
  CAST(julianday('now') - julianday(created) AS INTEGER) as age_days,
  CASE
    WHEN LOWER(priority_name) IN ('blocker','critical','highest') AND CAST(julianday('now') - julianday(created) AS INTEGER) > 15 THEN 'CRITICAL SLA BREACH (>15d)'
    WHEN LOWER(priority_name) = 'high' AND CAST(julianday('now') - julianday(created) AS INTEGER) > 30 THEN 'HIGH SLA BREACH (>30d)'
    WHEN LOWER(priority_name) = 'medium' AND CAST(julianday('now') - julianday(created) AS INTEGER) > 90 THEN 'MEDIUM SLA BREACH (>90d)'
    ELSE 'Within SLA'
  END as sla_status
FROM security_issues
WHERE status_category != 'Done'
  AND LOWER(priority_name) IN ('blocker','critical','highest','high','medium')
  AND (
    (LOWER(priority_name) IN ('blocker','critical','highest') AND CAST(julianday('now') - julianday(created) AS INTEGER) > 15)
    OR (LOWER(priority_name) = 'high' AND CAST(julianday('now') - julianday(created) AS INTEGER) > 30)
    OR (LOWER(priority_name) = 'medium' AND CAST(julianday('now') - julianday(created) AS INTEGER) > 90)
  )
ORDER BY
  CASE LOWER(priority_name) WHEN 'blocker' THEN 1 WHEN 'critical' THEN 2 WHEN 'highest' THEN 3 WHEN 'high' THEN 4 WHEN 'medium' THEN 5 END,
  age_days DESC
