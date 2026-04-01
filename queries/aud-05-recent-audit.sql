-- {"key":"aud-05-recent-audit","title":"Audit Log gần đây nhất (100 sự kiện)","category":"Audit Log","description":"Xem 100 sự kiện audit gần nhất."}
SELECT summary, category, event_source, author_name, object_name, object_type, created
FROM audit_log
ORDER BY created DESC
LIMIT 100
