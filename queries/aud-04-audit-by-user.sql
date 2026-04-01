-- {"key":"aud-04-audit-by-user","title":"Thống kê Audit Log theo User","category":"Audit Log","description":"Ai thực hiện nhiều thao tác admin nhất."}
SELECT
  author_name,
  COUNT(*) as total_events,
  COUNT(DISTINCT category) as categories,
  GROUP_CONCAT(DISTINCT category) as event_categories,
  MIN(created) as first_event,
  MAX(created) as last_event
FROM audit_log
WHERE author_name IS NOT NULL
GROUP BY author_name
ORDER BY total_events DESC
