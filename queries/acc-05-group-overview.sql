-- {"key":"acc-05-group-overview","title":"Tổng quan các nhóm quyền và số thành viên","category":"Access Control","description":"Thống kê số thành viên mỗi nhóm, bao gồm cả inactive. Nhóm quá nhiều thành viên cần rà soát."}
SELECT
  g.name as group_name,
  COUNT(gm.account_key) as total_members,
  SUM(CASE WHEN gm.active = 1 THEN 1 ELSE 0 END) as active_members,
  SUM(CASE WHEN gm.active = 0 THEN 1 ELSE 0 END) as inactive_members,
  ROUND(100.0 * SUM(CASE WHEN gm.active = 0 THEN 1 ELSE 0 END) / MAX(COUNT(gm.account_key), 1), 1) as inactive_pct
FROM groups g
LEFT JOIN group_members gm ON g.name = gm.group_name
GROUP BY g.name
ORDER BY total_members DESC
