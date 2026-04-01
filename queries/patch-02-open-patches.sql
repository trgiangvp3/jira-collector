-- {"key":"patch-02-open-patches","title":"Patches chưa hoàn thành","category":"Patch Management","description":"Patches/hotfix vẫn open. Đánh giá tồn đọng vá lỗi."}
SELECT
  key, project_key, summary,
  priority_name, status_name,
  assignee_name,
  created, due_date,
  CAST(julianday('now') - julianday(created) AS INTEGER) as age_days,
  CASE WHEN due_date IS NOT NULL AND due_date < date('now') THEN 'OVERDUE' ELSE 'On track' END as deadline_status
FROM issues
WHERE (LOWER(summary) LIKE '%patch%' OR LOWER(summary) LIKE '%hotfix%'
    OR LOWER(summary) LIKE '%security update%' OR LOWER(summary) LIKE '%vá lỗi%'
    OR LOWER(labels) LIKE '%patch%' OR LOWER(labels) LIKE '%hotfix%')
  AND status_category != 'Done'
ORDER BY
  CASE LOWER(priority_name) WHEN 'blocker' THEN 1 WHEN 'critical' THEN 2 WHEN 'highest' THEN 3 WHEN 'high' THEN 4 ELSE 5 END,
  age_days DESC
