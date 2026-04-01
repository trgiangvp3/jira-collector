-- {"key":"acc-06-role-assignments","title":"Phân quyền Role theo từng Project","category":"Access Control","description":"Chi tiết ai được gán role gì trong project nào. Rà soát nguyên tắc phân quyền tối thiểu."}
SELECT
  project_key, role_name, actor_type,
  actor_name, actor_display_name
FROM project_role_members
ORDER BY project_key, role_name, actor_type
