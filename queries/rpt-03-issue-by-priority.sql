-- {"key":"rpt-03-issue-by-priority","title":"Issue theo Priority (open)","category":"Summary Report","description":"Phân bổ issue open theo mức priority."}
SELECT
  priority_name,
  COUNT(*) as total_open,
  SUM(CASE WHEN due_date < date('now') THEN 1 ELSE 0 END) as overdue,
  AVG(CAST(julianday('now') - julianday(created) AS INTEGER)) as avg_age_days
FROM issues
WHERE status_category != 'Done'
GROUP BY priority_name
ORDER BY
  CASE LOWER(priority_name) WHEN 'blocker' THEN 1 WHEN 'critical' THEN 2 WHEN 'highest' THEN 3 WHEN 'high' THEN 4 WHEN 'medium' THEN 5 WHEN 'low' THEN 6 WHEN 'lowest' THEN 7 ELSE 8 END
