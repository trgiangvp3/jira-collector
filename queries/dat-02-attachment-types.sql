-- {"key":"dat-02-attachment-types","title":"Thống kê loại file đính kèm","category":"Data Protection","description":"Tổng hợp loại file và dung lượng. Kiểm tra có file nhạy cảm."}
SELECT
  mime_type,
  COUNT(*) as file_count,
  ROUND(SUM(size) / 1048576.0, 2) as total_size_mb,
  ROUND(AVG(size) / 1024.0, 1) as avg_size_kb,
  ROUND(MAX(size) / 1048576.0, 2) as max_size_mb
FROM attachments
GROUP BY mime_type
ORDER BY total_size_mb DESC
