-- {"key":"prj-06-issues-no-description","title":"Issues không có mô tả","category":"Project Governance","description":"Issue không có description. Không đảm bảo chất lượng quản lý yêu cầu."}
SELECT
  key, project_key, summary,
  issue_type_name, status_name, assignee_name,
  reporter_name, created
FROM issues
WHERE (description IS NULL OR TRIM(description) = '')
  AND status_category != 'Done'
ORDER BY created DESC
LIMIT 200
