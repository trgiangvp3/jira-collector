-- {"key":"acc-04-inactive-in-admin-groups","title":"Tài khoản INACTIVE vẫn nằm trong nhóm quyền","category":"Access Control","description":"Tài khoản đã bị deactivate nhưng chưa bị xóa khỏi groups. Rủi ro: nếu tài khoản bị reactivate sẽ tự động có lại quyền."}
SELECT
  gm.group_name, gm.display_name, gm.username,
  'INACTIVE' as user_status
FROM group_members gm
WHERE gm.active = 0
ORDER BY gm.group_name, gm.display_name
