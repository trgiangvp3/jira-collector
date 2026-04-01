-- {"key":"dat-03-executable-attachments","title":"File đính kèm có thể thực thi","category":"Data Protection","description":"File .exe, .bat, .sh, .jar, .py... có thể là mã độc hoặc rủi ro bảo mật."}
SELECT
  a.issue_key, a.filename,
  ROUND(a.size / 1024.0, 1) as size_kb,
  a.mime_type, a.author_name, a.created,
  i.project_key
FROM attachments a
LEFT JOIN issues i ON a.issue_key = i.key
WHERE LOWER(a.filename) LIKE '%.exe'
   OR LOWER(a.filename) LIKE '%.bat'
   OR LOWER(a.filename) LIKE '%.cmd'
   OR LOWER(a.filename) LIKE '%.sh'
   OR LOWER(a.filename) LIKE '%.ps1'
   OR LOWER(a.filename) LIKE '%.jar'
   OR LOWER(a.filename) LIKE '%.py'
   OR LOWER(a.filename) LIKE '%.vbs'
   OR LOWER(a.filename) LIKE '%.dll'
   OR LOWER(a.filename) LIKE '%.msi'
   OR LOWER(a.filename) LIKE '%.scr'
   OR LOWER(a.filename) LIKE '%.com'
   OR LOWER(a.mime_type) LIKE '%executable%'
   OR LOWER(a.mime_type) LIKE '%x-sh%'
ORDER BY a.created DESC
