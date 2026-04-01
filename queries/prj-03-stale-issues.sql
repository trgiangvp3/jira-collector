-- {"key":"prj-03-stale-issues","title":"Issues \"chết\" (open > 1 năm, không cập nhật > 6 tháng)","category":"Project Governance","description":"Issue mở lâu không xử lý. Cần đánh giá có nên đóng hoặc xử lý."}
SELECT
  key, project_key, summary,
  status_name, priority_name,
  assignee_name,
  created,
  updated,
  CAST(julianday('now') - julianday(created) AS INTEGER) as age_days,
  CAST(julianday('now') - julianday(updated) AS INTEGER) as days_since_update
FROM issues
WHERE status_category != 'Done'
  AND created < date('now', '-1 year')
  AND updated < date('now', '-6 months')
ORDER BY age_days DESC
LIMIT 200
