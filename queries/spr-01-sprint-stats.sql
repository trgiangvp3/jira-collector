-- {"key":"spr-01-sprint-stats","title":"Thống kê Sprint","category":"Agile / Sprint","description":"Tổng hợp sprint: trạng thái, số issue, thời gian."}
SELECT
  s.name as sprint_name,
  s.state,
  b.name as board_name,
  SUBSTR(s.start_date, 1, 10) as start_date,
  SUBSTR(s.end_date, 1, 10) as end_date,
  SUBSTR(s.complete_date, 1, 10) as complete_date,
  COUNT(isp.issue_key) as issue_count,
  s.goal
FROM sprints s
LEFT JOIN issue_sprints isp ON s.id = isp.sprint_id
LEFT JOIN boards b ON s.board_id = b.id
GROUP BY s.id
ORDER BY s.start_date DESC
