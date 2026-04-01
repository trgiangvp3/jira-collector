-- {"key":"base-attachment-types","title":"Attachment Types Summary","category":"General Analysis","description":"Attachment Types Summary"}
SELECT mime_type, COUNT(*) as count,
        ROUND(SUM(size) / 1048576.0, 2) as total_size_mb
      FROM attachments
      GROUP BY mime_type
      ORDER BY total_size_mb DESC
