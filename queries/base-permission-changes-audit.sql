-- {"key":"base-permission-changes-audit","title":"Permission-related Audit Log","category":"General Analysis","description":"Permission-related Audit Log"}
SELECT summary, category, author_name, object_name, object_type, created
      FROM audit_log
      WHERE LOWER(category) LIKE '%permission%'
         OR LOWER(category) LIKE '%security%'
         OR LOWER(summary) LIKE '%permission%'
         OR LOWER(summary) LIKE '%group%'
      ORDER BY created DESC
      LIMIT 200
