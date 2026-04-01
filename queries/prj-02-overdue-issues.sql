-- {"key":"prj-02-overdue-issues","title":"Issues quá hạn (Due date đã qua, chưa done)","category":"Project Governance","description":"Issue đã quá hạn nhưng chưa hoàn thành. Rủi ro SLA và cam kết."}
SELECT
  key, project_key, summary,
  due_date,
  CAST(julianday('now') - julianday(due_date) AS INTEGER) as days_overdue,
  status_name, priority_name,
  assignee_name, reporter_name
FROM issues
WHERE due_date IS NOT NULL
  AND due_date < date('now')
  AND status_category != 'Done'
ORDER BY days_overdue DESC
