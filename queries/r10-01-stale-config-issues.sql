-- {"key":"r10-01-stale-config-issues","title":"[R10] Issues hardening/config không cập nhật > 12 tháng","category":"R10 - Stale Standards","description":"Issue liên quan tiêu chuẩn cấu hình tồn tại nhưng không ai cập nhật > 12 tháng. Tiêu chuẩn lỗi thời = vô nghĩa."}
SELECT
  key, project_key, summary,
  status_name, assignee_name,
  SUBSTR(created, 1, 10) as created,
  SUBSTR(updated, 1, 10) as last_updated,
  CAST(julianday('now') - julianday(updated) AS INTEGER) as days_since_update,
  '⚠ STALE > 12 months' as flag
FROM issues
WHERE (LOWER(summary) LIKE '%hardening%' OR LOWER(summary) LIKE '%baseline%'
    OR LOWER(summary) LIKE '%security config%' OR LOWER(summary) LIKE '%security standard%'
    OR LOWER(summary) LIKE '%tiêu chuẩn%' OR LOWER(summary) LIKE '%cấu hình bảo mật%'
    OR LOWER(labels) LIKE '%hardening%' OR LOWER(labels) LIKE '%baseline%')
  AND julianday('now') - julianday(updated) > 365
ORDER BY days_since_update DESC
