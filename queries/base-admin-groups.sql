-- {"key":"base-admin-groups","title":"Admin/Privileged Groups and Members","category":"General Analysis","description":"Admin/Privileged Groups and Members"}
SELECT gm.group_name, gm.display_name, gm.username, gm.active
      FROM group_members gm
      WHERE LOWER(gm.group_name) LIKE '%admin%'
         OR LOWER(gm.group_name) LIKE '%jira-software%'
         OR LOWER(gm.group_name) LIKE '%system%'
      ORDER BY gm.group_name, gm.display_name
