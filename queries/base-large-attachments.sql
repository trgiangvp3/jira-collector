-- {"key":"base-large-attachments","title":"Largest Attachments","category":"General Analysis","description":"Largest Attachments"}
SELECT issue_key, filename, ROUND(size / 1048576.0, 2) as size_mb,
        mime_type, author_name, created
      FROM attachments
      ORDER BY size DESC
      LIMIT 50
