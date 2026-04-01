-- {"key":"rpt-01-summary","title":"Tổng hợp dữ liệu Database","category":"Summary Report","description":"Thống kê tổng quan toàn bộ dữ liệu đã thu thập."}
SELECT 'Projects' as entity, COUNT(*) as count FROM projects
UNION ALL SELECT 'Issues', COUNT(*) FROM issues
UNION ALL SELECT 'Users (Active)', COUNT(*) FROM users WHERE active = 1
UNION ALL SELECT 'Users (Inactive)', COUNT(*) FROM users WHERE active = 0
UNION ALL SELECT 'Comments', COUNT(*) FROM comments
UNION ALL SELECT 'Worklogs', COUNT(*) FROM worklogs
UNION ALL SELECT 'Changelog entries', COUNT(*) FROM changelogs
UNION ALL SELECT 'Changelog items', COUNT(*) FROM changelog_items
UNION ALL SELECT 'Attachments', COUNT(*) FROM attachments
UNION ALL SELECT 'Issue Links', COUNT(*) FROM issue_links
UNION ALL SELECT 'Groups', COUNT(*) FROM groups
UNION ALL SELECT 'Boards', COUNT(*) FROM boards
UNION ALL SELECT 'Sprints', COUNT(*) FROM sprints
UNION ALL SELECT 'Audit Log entries', COUNT(*) FROM audit_log
UNION ALL SELECT 'Custom Field Definitions', COUNT(*) FROM custom_field_definitions
UNION ALL SELECT 'Permission Schemes', COUNT(*) FROM permission_schemes
UNION ALL SELECT 'Security Schemes', COUNT(*) FROM security_schemes
UNION ALL SELECT 'Workflows', COUNT(*) FROM workflows
