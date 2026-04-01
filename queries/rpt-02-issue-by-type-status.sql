-- {"key":"rpt-02-issue-by-type-status","title":"Issue theo Type và Status","category":"Summary Report","description":"Ma trận issue type x status category."}
SELECT
  issue_type_name,
  COUNT(*) as total,
  SUM(CASE WHEN status_category = 'To Do' THEN 1 ELSE 0 END) as todo,
  SUM(CASE WHEN status_category = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
  SUM(CASE WHEN status_category = 'Done' THEN 1 ELSE 0 END) as done
FROM issues
GROUP BY issue_type_name
ORDER BY total DESC
