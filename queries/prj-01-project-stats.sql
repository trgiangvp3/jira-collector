-- {"key":"prj-01-project-stats","title":"Thống kê tổng quan theo Project","category":"Project Governance","description":"Tổng quan số lượng issue, trạng thái, thời gian hoạt động từng project."}
SELECT
  p.key, p.name, p.lead_display_name as lead,
  COUNT(i.id) as total_issues,
  SUM(CASE WHEN i.status_category = 'Done' THEN 1 ELSE 0 END) as done,
  SUM(CASE WHEN i.status_category = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
  SUM(CASE WHEN i.status_category = 'To Do' THEN 1 ELSE 0 END) as todo,
  MIN(SUBSTR(i.created, 1, 10)) as first_issue,
  MAX(SUBSTR(i.updated, 1, 10)) as last_update
FROM projects p
LEFT JOIN issues i ON p.key = i.project_key
GROUP BY p.key
ORDER BY total_issues DESC
