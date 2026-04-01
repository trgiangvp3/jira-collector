-- {"key":"dat-01-large-attachments","title":"File đính kèm lớn (> 5MB)","category":"Data Protection","description":"File lớn có thể chứa database dump, export dữ liệu."}
SELECT
  a.issue_key, a.filename,
  ROUND(a.size / 1048576.0, 2) as size_mb,
  a.mime_type, a.author_name, a.created,
  i.project_key, i.summary
FROM attachments a
LEFT JOIN issues i ON a.issue_key = i.key
WHERE a.size > 5242880
ORDER BY a.size DESC
