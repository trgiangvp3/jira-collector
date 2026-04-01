-- {"key":"vrpt-02-aging-report","title":"TỔNG HỢP: Phân tích Aging theo Priority","category":"Vuln - Report","description":"Bảng aging (tuổi tồn đọng) theo priority. Phục vụ báo cáo kiểm toán."}
WITH security_issues AS (
  SELECT * FROM issues
  WHERE (LOWER(summary) LIKE '%vulnerab%' OR LOWER(summary) LIKE '%security%'
     OR LOWER(summary) LIKE '%bảo mật%' OR LOWER(summary) LIKE '%lỗ hổng%'
     OR LOWER(summary) LIKE '%điểm yếu%' OR LOWER(summary) LIKE '%cve-%'
     OR LOWER(summary) LIKE '%patch%' OR LOWER(summary) LIKE '%pentest%'
     OR LOWER(labels) LIKE '%security%' OR LOWER(labels) LIKE '%vulnerability%'
     OR LOWER(issue_type_name) LIKE '%security%' OR LOWER(issue_type_name) LIKE '%vulnerability%')
    AND status_category != 'Done'
)
SELECT
  priority_name,
  COUNT(*) as total_open,
  SUM(CASE WHEN julianday('now') - julianday(created) <= 7 THEN 1 ELSE 0 END) as "0-7d",
  SUM(CASE WHEN julianday('now') - julianday(created) > 7 AND julianday('now') - julianday(created) <= 30 THEN 1 ELSE 0 END) as "8-30d",
  SUM(CASE WHEN julianday('now') - julianday(created) > 30 AND julianday('now') - julianday(created) <= 90 THEN 1 ELSE 0 END) as "31-90d",
  SUM(CASE WHEN julianday('now') - julianday(created) > 90 AND julianday('now') - julianday(created) <= 180 THEN 1 ELSE 0 END) as "91-180d",
  SUM(CASE WHEN julianday('now') - julianday(created) > 180 AND julianday('now') - julianday(created) <= 365 THEN 1 ELSE 0 END) as "181-365d",
  SUM(CASE WHEN julianday('now') - julianday(created) > 365 THEN 1 ELSE 0 END) as ">365d"
FROM security_issues
GROUP BY priority_name
ORDER BY
  CASE LOWER(priority_name) WHEN 'blocker' THEN 1 WHEN 'critical' THEN 2 WHEN 'highest' THEN 3 WHEN 'high' THEN 4 WHEN 'medium' THEN 5 WHEN 'low' THEN 6 ELSE 7 END
