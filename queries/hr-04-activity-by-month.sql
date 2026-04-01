-- {"key":"hr-04-activity-by-month","title":"Thống kê hoạt động theo tháng","category":"User Activity","description":"Xu hướng hoạt động trên Jira theo thời gian."}
SELECT
  SUBSTR(created, 1, 7) as month,
  COUNT(*) as issues_created,
  COUNT(DISTINCT reporter_key) as unique_reporters,
  COUNT(DISTINCT project_key) as projects_active
FROM issues
GROUP BY SUBSTR(created, 1, 7)
ORDER BY month DESC
