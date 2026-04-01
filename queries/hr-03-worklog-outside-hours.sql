-- {"key":"hr-03-worklog-outside-hours","title":"Worklog ghi ngoài giờ hành chính","category":"User Activity","description":"Log thời gian vào lúc bất thường (trước 7h, sau 19h, cuối tuần)."}
SELECT
  w.issue_key, w.author_name,
  w.started,
  CAST(SUBSTR(w.started, 12, 2) AS INTEGER) as hour_of_day,
  ROUND(w.time_spent_seconds / 3600.0, 1) as hours_logged,
  w.comment,
  i.project_key, i.summary
FROM worklogs w
LEFT JOIN issues i ON w.issue_key = i.key
WHERE CAST(SUBSTR(w.started, 12, 2) AS INTEGER) < 7
   OR CAST(SUBSTR(w.started, 12, 2) AS INTEGER) >= 19
ORDER BY w.started DESC
LIMIT 200
