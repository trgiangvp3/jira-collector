-- {"key":"hr-01-user-activity-summary","title":"Tổng hợp hoạt động theo User","category":"User Activity","description":"Tổng số issue assigned, reported, comment, thay đổi theo từng user."}
SELECT
  u.display_name,
  u.username,
  u.email,
  CASE WHEN u.active = 1 THEN 'Active' ELSE 'INACTIVE' END as status,
  COALESCE(a.cnt, 0) as assigned,
  COALESCE(r.cnt, 0) as reported,
  COALESCE(cm.cnt, 0) as comments,
  COALESCE(ch.cnt, 0) as changes,
  COALESCE(wl.cnt, 0) as worklogs,
  COALESCE(a.cnt,0) + COALESCE(r.cnt,0) + COALESCE(cm.cnt,0) + COALESCE(ch.cnt,0) + COALESCE(wl.cnt,0) as total_activity
FROM users u
LEFT JOIN (SELECT assignee_key, COUNT(*) cnt FROM issues GROUP BY assignee_key) a ON u.account_key = a.assignee_key
LEFT JOIN (SELECT reporter_key, COUNT(*) cnt FROM issues GROUP BY reporter_key) r ON u.account_key = r.reporter_key
LEFT JOIN (SELECT author_key, COUNT(*) cnt FROM comments GROUP BY author_key) cm ON u.account_key = cm.author_key
LEFT JOIN (SELECT author_key, COUNT(*) cnt FROM changelogs GROUP BY author_key) ch ON u.account_key = ch.author_key
LEFT JOIN (SELECT author_key, COUNT(*) cnt FROM worklogs GROUP BY author_key) wl ON u.account_key = wl.author_key
ORDER BY total_activity DESC
