-- {"key":"acc-03-admin-groups","title":"Thành viên các nhóm Admin / Đặc quyền","category":"Access Control","description":"Liệt kê tất cả thành viên thuộc nhóm admin hoặc nhóm có quyền cao. Cần kiểm tra nguyên tắc least privilege."}
SELECT
  gm.group_name,
  gm.display_name,
  gm.username,
  CASE WHEN gm.active = 1 THEN 'Active' ELSE 'INACTIVE' END as status,
  u.email
FROM group_members gm
LEFT JOIN users u ON gm.account_key = u.account_key
WHERE LOWER(gm.group_name) LIKE '%admin%'
   OR LOWER(gm.group_name) LIKE '%system%'
   OR LOWER(gm.group_name) LIKE '%jira-software%'
   OR LOWER(gm.group_name) LIKE '%super%'
   OR LOWER(gm.group_name) LIKE '%developer%'
ORDER BY gm.group_name, gm.display_name
