-- {"key":"spr-02-issues-no-sprint","title":"Issues không thuộc Sprint nào","category":"Agile / Sprint","description":"Issue open không được lập kế hoạch vào sprint."}
SELECT
  i.key, i.project_key, i.summary,
  i.status_name, i.priority_name, i.assignee_name, i.created
FROM issues i
LEFT JOIN issue_sprints isp ON i.key = isp.issue_key
WHERE isp.sprint_id IS NULL
  AND i.status_category != 'Done'
ORDER BY i.priority_name, i.created
LIMIT 200
