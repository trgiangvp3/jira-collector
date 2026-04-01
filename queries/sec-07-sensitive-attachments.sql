-- {"key":"sec-07-sensitive-attachments","title":"File đính kèm có thể chứa dữ liệu nhạy cảm","category":"Security","description":"File config, key, cert, SQL dump, spreadsheet có thể chứa thông tin nhạy cảm."}
SELECT
  a.issue_key, a.filename,
  ROUND(a.size / 1024.0, 1) as size_kb,
  a.mime_type, a.author_name, a.created,
  i.project_key, i.summary
FROM attachments a
LEFT JOIN issues i ON a.issue_key = i.key
WHERE LOWER(a.filename) LIKE '%.pem'
   OR LOWER(a.filename) LIKE '%.key'
   OR LOWER(a.filename) LIKE '%.p12'
   OR LOWER(a.filename) LIKE '%.pfx'
   OR LOWER(a.filename) LIKE '%.cert'
   OR LOWER(a.filename) LIKE '%.crt'
   OR LOWER(a.filename) LIKE '%.env'
   OR LOWER(a.filename) LIKE '%.conf'
   OR LOWER(a.filename) LIKE '%.config'
   OR LOWER(a.filename) LIKE '%.properties'
   OR LOWER(a.filename) LIKE '%.sql'
   OR LOWER(a.filename) LIKE '%.bak'
   OR LOWER(a.filename) LIKE '%.dump'
   OR LOWER(a.filename) LIKE '%.csv'
   OR LOWER(a.filename) LIKE '%password%'
   OR LOWER(a.filename) LIKE '%credential%'
   OR LOWER(a.filename) LIKE '%secret%'
ORDER BY a.created DESC
