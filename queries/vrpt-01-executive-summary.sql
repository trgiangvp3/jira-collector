-- {"key":"vrpt-01-executive-summary","title":"TỔNG HỢP: Điểm yếu ATTT - Executive Summary","category":"Vuln - Report","description":"Bảng tổng hợp cho báo cáo kiểm toán: tổng số, phân loại, SLA, tồn đọng."}
WITH security_issues AS (
  SELECT * FROM issues
  WHERE LOWER(summary) LIKE '%vulnerab%' OR LOWER(summary) LIKE '%security%'
     OR LOWER(summary) LIKE '%bảo mật%' OR LOWER(summary) LIKE '%bao mat%'
     OR LOWER(summary) LIKE '%lỗ hổng%' OR LOWER(summary) LIKE '%điểm yếu%'
     OR LOWER(summary) LIKE '%cve-%' OR LOWER(summary) LIKE '%patch%'
     OR LOWER(summary) LIKE '%pentest%' OR LOWER(summary) LIKE '%hotfix%'
     OR LOWER(summary) LIKE '%incident%' OR LOWER(summary) LIKE '%sự cố%'
     OR LOWER(labels) LIKE '%security%' OR LOWER(labels) LIKE '%vulnerability%'
     OR LOWER(issue_type_name) LIKE '%security%' OR LOWER(issue_type_name) LIKE '%vulnerability%'
)
SELECT 'Total security issues' as metric, COUNT(*) as value FROM security_issues
UNION ALL SELECT 'Currently Open', COUNT(*) FROM security_issues WHERE status_category != 'Done'
UNION ALL SELECT 'Closed/Resolved', COUNT(*) FROM security_issues WHERE status_category = 'Done'
UNION ALL SELECT 'Open - Critical/High', COUNT(*) FROM security_issues WHERE status_category != 'Done' AND LOWER(priority_name) IN ('blocker','critical','highest','high')
UNION ALL SELECT 'Open - No Assignee', COUNT(*) FROM security_issues WHERE status_category != 'Done' AND assignee_key IS NULL
UNION ALL SELECT 'Open - No Due Date', COUNT(*) FROM security_issues WHERE status_category != 'Done' AND due_date IS NULL
UNION ALL SELECT 'Open - Overdue', COUNT(*) FROM security_issues WHERE status_category != 'Done' AND due_date IS NOT NULL AND due_date < date('now')
UNION ALL SELECT 'Open > 30 days', COUNT(*) FROM security_issues WHERE status_category != 'Done' AND julianday('now') - julianday(created) > 30
UNION ALL SELECT 'Open > 90 days', COUNT(*) FROM security_issues WHERE status_category != 'Done' AND julianday('now') - julianday(created) > 90
UNION ALL SELECT 'Open > 180 days', COUNT(*) FROM security_issues WHERE status_category != 'Done' AND julianday('now') - julianday(created) > 180
UNION ALL SELECT 'Open > 365 days', COUNT(*) FROM security_issues WHERE status_category != 'Done' AND julianday('now') - julianday(created) > 365
UNION ALL SELECT 'Avg Resolution Days (closed)', ROUND(AVG(julianday(resolved) - julianday(created)), 1) FROM security_issues WHERE resolved IS NOT NULL
UNION ALL SELECT 'Reopened issues', COUNT(DISTINCT ci.issue_key) FROM changelog_items ci JOIN changelogs c ON ci.changelog_id = c.id WHERE ci.field = 'status' AND LOWER(ci.from_string) IN ('done','closed','resolved') AND ci.issue_key IN (SELECT key FROM security_issues)
UNION ALL SELECT 'Unique projects affected', COUNT(DISTINCT project_key) FROM security_issues
UNION ALL SELECT 'Unique assignees', COUNT(DISTINCT assignee_key) FROM security_issues WHERE assignee_key IS NOT NULL
UNION ALL SELECT 'Issues with CVE reference', COUNT(*) FROM security_issues WHERE LOWER(summary) LIKE '%cve-%' OR LOWER(description) LIKE '%cve-%'
