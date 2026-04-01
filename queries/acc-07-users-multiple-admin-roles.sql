-- {"key":"acc-07-users-multiple-admin-roles","title":"User có nhiều role Admin trong nhiều project","category":"Access Control","description":"Người dùng giữ role admin/lead trong nhiều project. Cần đánh giá tập trung quyền."}
SELECT
  actor_display_name,
  actor_name,
  GROUP_CONCAT(DISTINCT role_name) as roles,
  COUNT(DISTINCT project_key) as project_count,
  GROUP_CONCAT(DISTINCT project_key) as projects
FROM project_role_members
WHERE LOWER(role_name) LIKE '%admin%'
   OR LOWER(role_name) LIKE '%lead%'
   OR LOWER(role_name) LIKE '%manager%'
GROUP BY actor_name
HAVING project_count > 1
ORDER BY project_count DESC
