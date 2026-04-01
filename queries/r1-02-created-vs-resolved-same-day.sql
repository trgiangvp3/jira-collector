-- {"key":"r1-02-created-vs-resolved-same-day","title":"[R1] Issues pentest tạo và đóng cùng ngày","category":"R1 - Backdating","description":"Issue ATTT được tạo và resolved cùng ngày là bất thường - có thể tạo hình thức để đối phó. Pentest thực tế cần thời gian để phát hiện, báo cáo, xử lý."}
WITH pentest_issues AS (
  SELECT * FROM issues
  WHERE LOWER(summary) LIKE '%pentest%' OR LOWER(summary) LIKE '%penetration%'
     OR LOWER(summary) LIKE '%va scan%' OR LOWER(summary) LIKE '%vulnerability assessment%'
     OR LOWER(summary) LIKE '%đánh giá%bảo mật%' OR LOWER(summary) LIKE '%security assessment%'
     OR LOWER(summary) LIKE '%security test%' OR LOWER(summary) LIKE '%finding%'
     OR LOWER(labels) LIKE '%pentest%' OR LOWER(labels) LIKE '%va-scan%'
)
SELECT
  key, project_key, summary,
  priority_name, status_name,
  assignee_name, reporter_name,
  SUBSTR(created, 1, 10) as created_date,
  SUBSTR(resolved, 1, 10) as resolved_date,
  ROUND((julianday(resolved) - julianday(created)) * 24, 1) as hours_to_resolve
FROM pentest_issues
WHERE resolved IS NOT NULL
  AND SUBSTR(created, 1, 10) = SUBSTR(resolved, 1, 10)
ORDER BY created DESC
