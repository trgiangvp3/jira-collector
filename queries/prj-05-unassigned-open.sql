-- {"key":"prj-05-unassigned-open","title":"Issues open chưa có người nhận","category":"Project Governance","description":"Issue không có assignee. Rủi ro bị bỏ sót."}
SELECT
  key, project_key, summary,
  priority_name, status_name,
  reporter_name, created,
  CAST(julianday('now') - julianday(created) AS INTEGER) as age_days
FROM issues
WHERE assignee_key IS NULL
  AND status_category != 'Done'
ORDER BY
  CASE LOWER(priority_name) WHEN 'blocker' THEN 1 WHEN 'critical' THEN 2 WHEN 'highest' THEN 3 WHEN 'high' THEN 4 ELSE 5 END,
  created ASC
LIMIT 200
