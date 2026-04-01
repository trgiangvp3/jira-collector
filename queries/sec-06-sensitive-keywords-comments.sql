-- {"key":"sec-06-sensitive-keywords-comments","title":"Comments chứa từ khóa nhạy cảm","category":"Security","description":"Tìm comment có thể chứa thông tin nhạy cảm (password, key, credential...)."}
SELECT
  c.issue_key, c.author_name,
  SUBSTR(c.body, 1, 300) as comment_preview,
  c.created,
  i.project_key, i.summary
FROM comments c
LEFT JOIN issues i ON c.issue_key = i.key
WHERE LOWER(c.body) LIKE '%password%'
   OR LOWER(c.body) LIKE '%credential%'
   OR LOWER(c.body) LIKE '%secret%'
   OR LOWER(c.body) LIKE '%private key%'
   OR LOWER(c.body) LIKE '%api key%'
   OR LOWER(c.body) LIKE '%token%'
   OR LOWER(c.body) LIKE '%connection string%'
ORDER BY c.created DESC
