-- {"key":"sec-05-sensitive-keywords-issues","title":"Issues chứa từ khóa nhạy cảm (password, credential, secret, token...)","category":"Security","description":"Tìm issue có thể chứa thông tin nhạy cảm trong summary hoặc description."}
SELECT
  key, project_key, summary,
  SUBSTR(description, 1, 200) as description_preview,
  assignee_name, reporter_name, created, status_name
FROM issues
WHERE LOWER(summary) LIKE '%password%'
   OR LOWER(summary) LIKE '%credential%'
   OR LOWER(summary) LIKE '%secret%'
   OR LOWER(summary) LIKE '%token%'
   OR LOWER(summary) LIKE '%private key%'
   OR LOWER(summary) LIKE '%api key%'
   OR LOWER(summary) LIKE '%access key%'
   OR LOWER(summary) LIKE '%connection string%'
   OR LOWER(description) LIKE '%password%'
   OR LOWER(description) LIKE '%credential%'
   OR LOWER(description) LIKE '%secret%'
   OR LOWER(description) LIKE '%private key%'
   OR LOWER(description) LIKE '%api key%'
ORDER BY created DESC
