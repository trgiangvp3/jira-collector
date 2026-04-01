-- {"key":"prj-04-high-priority-open","title":"Issues Critical/High chưa xử lý","category":"Project Governance","description":"Issue ưu tiên cao vẫn open. Cần rà soát tiến độ và cam kết."}
SELECT
  key, project_key, summary,
  priority_name, status_name,
  assignee_name, reporter_name,
  created, updated,
  CAST(julianday('now') - julianday(created) AS INTEGER) as age_days
FROM issues
WHERE status_category != 'Done'
  AND LOWER(priority_name) IN ('highest', 'critical', 'blocker', 'high')
ORDER BY
  CASE LOWER(priority_name) WHEN 'blocker' THEN 1 WHEN 'critical' THEN 2 WHEN 'highest' THEN 3 WHEN 'high' THEN 4 END,
  created ASC
