-- {"key":"base-group-membership","title":"Group Membership Overview","category":"General Analysis","description":"Group Membership Overview"}
SELECT g.name as group_name, COUNT(gm.account_key) as member_count,
        SUM(CASE WHEN gm.active = 0 THEN 1 ELSE 0 END) as inactive_members
      FROM groups g
      LEFT JOIN group_members gm ON g.name = gm.group_name
      GROUP BY g.name
      ORDER BY member_count DESC
