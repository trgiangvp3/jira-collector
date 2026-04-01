-- {"key":"r1-04-created-after-duedate","title":"[R1] Issue tạo SAU due date của chính nó","category":"R1 - Backdating","description":"Due date sớm hơn ngày tạo issue - bất thường logic, có thể do set due date giả để khớp timeline."}
SELECT
  key, project_key, summary,
  SUBSTR(created, 1, 10) as created_date,
  due_date,
  CAST(julianday(created) - julianday(due_date) AS INTEGER) as days_after_due,
  assignee_name, reporter_name, status_name
FROM issues
WHERE due_date IS NOT NULL
  AND SUBSTR(created, 1, 10) > due_date
  AND (LOWER(summary) LIKE '%pentest%' OR LOWER(summary) LIKE '%security%'
    OR LOWER(summary) LIKE '%vulnerab%' OR LOWER(summary) LIKE '%finding%'
    OR LOWER(summary) LIKE '%bảo mật%' OR LOWER(summary) LIKE '%attt%'
    OR LOWER(labels) LIKE '%pentest%' OR LOWER(labels) LIKE '%security%')
ORDER BY days_after_due DESC
