-- {"key":"acc-02-active-no-activity","title":"Tài khoản active nhưng không có hoạt động nào","category":"Access Control","description":"Tài khoản vẫn active nhưng chưa từng tạo, được assign, comment hay thay đổi issue. Có thể là tài khoản thừa cần rà soát."}
SELECT u.display_name, u.username, u.email, u.active
FROM users u
WHERE u.active = 1
  AND u.account_key NOT IN (SELECT DISTINCT assignee_key FROM issues WHERE assignee_key IS NOT NULL)
  AND u.account_key NOT IN (SELECT DISTINCT reporter_key FROM issues WHERE reporter_key IS NOT NULL)
  AND u.account_key NOT IN (SELECT DISTINCT creator_key FROM issues WHERE creator_key IS NOT NULL)
  AND u.account_key NOT IN (SELECT DISTINCT author_key FROM comments WHERE author_key IS NOT NULL)
  AND u.account_key NOT IN (SELECT DISTINCT author_key FROM changelogs WHERE author_key IS NOT NULL)
  AND u.account_key NOT IN (SELECT DISTINCT author_key FROM worklogs WHERE author_key IS NOT NULL)
ORDER BY u.display_name
