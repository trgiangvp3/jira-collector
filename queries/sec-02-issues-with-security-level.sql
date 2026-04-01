-- {"key":"sec-02-issues-with-security-level","title":"Issues có đặt Security Level","category":"Security","description":"Danh sách issue được đặt security level. Kiểm tra dữ liệu nhạy cảm có được bảo vệ."}
SELECT
  key, summary, security_level, project_key,
  status_name, assignee_name, reporter_name,
  created, updated
FROM issues
WHERE security_level IS NOT NULL
ORDER BY security_level, project_key, key
