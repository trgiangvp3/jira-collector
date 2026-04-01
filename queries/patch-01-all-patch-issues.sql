-- {"key":"patch-01-all-patch-issues","title":"Tất cả issues liên quan Patch / Hotfix / Update","category":"Patch Management","description":"Liệt kê tất cả issue liên quan đến vá lỗi, cập nhật bảo mật."}
SELECT
  key, project_key, issue_type_name, summary,
  priority_name, status_name, status_category,
  assignee_name, reporter_name,
  created, updated, resolved, due_date,
  CAST(julianday('now') - julianday(created) AS INTEGER) as age_days,
  CASE WHEN resolved IS NOT NULL THEN CAST(julianday(resolved) - julianday(created) AS INTEGER) END as resolution_days
FROM issues
WHERE LOWER(summary) LIKE '%patch%'
   OR LOWER(summary) LIKE '%hotfix%'
   OR LOWER(summary) LIKE '%vá lỗi%'
   OR LOWER(summary) LIKE '%va loi%'
   OR LOWER(summary) LIKE '%cập nhật bảo mật%'
   OR LOWER(summary) LIKE '%cap nhat bao mat%'
   OR LOWER(summary) LIKE '%security update%'
   OR LOWER(summary) LIKE '%firmware update%'
   OR LOWER(summary) LIKE '%upgrade%'
   OR LOWER(summary) LIKE '%nâng cấp%'
   OR LOWER(labels) LIKE '%patch%'
   OR LOWER(labels) LIKE '%hotfix%'
ORDER BY created DESC
