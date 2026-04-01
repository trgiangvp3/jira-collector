-- {"key":"base-summary","title":"Database Summary","category":"General Analysis","description":"Database Summary"}
SELECT 'Projects' as entity, COUNT(*) as count FROM projects
      UNION ALL SELECT 'Issues', COUNT(*) FROM issues
      UNION ALL SELECT 'Users', COUNT(*) FROM users
      UNION ALL SELECT 'Comments', COUNT(*) FROM comments
      UNION ALL SELECT 'Worklogs', COUNT(*) FROM worklogs
      UNION ALL SELECT 'Changelogs', COUNT(*) FROM changelogs
      UNION ALL SELECT 'Attachments', COUNT(*) FROM attachments
      UNION ALL SELECT 'Groups', COUNT(*) FROM groups
      UNION ALL SELECT 'Boards', COUNT(*) FROM boards
      UNION ALL SELECT 'Sprints', COUNT(*) FROM sprints
      UNION ALL SELECT 'Audit Log Entries', COUNT(*) FROM audit_log
