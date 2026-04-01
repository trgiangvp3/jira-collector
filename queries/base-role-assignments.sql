-- {"key":"base-role-assignments","title":"Project Role Assignments","category":"General Analysis","description":"Project Role Assignments"}
SELECT project_key, role_name, actor_type, actor_name, actor_display_name
      FROM project_role_members
      ORDER BY project_key, role_name
