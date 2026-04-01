-- {"key":"base-users-no-activity","title":"Active Users with Zero Activity","category":"General Analysis","description":"Active Users with Zero Activity"}
SELECT u.display_name, u.username, u.email
      FROM users u
      WHERE u.active = 1
        AND u.account_key NOT IN (SELECT DISTINCT assignee_key FROM issues WHERE assignee_key IS NOT NULL)
        AND u.account_key NOT IN (SELECT DISTINCT reporter_key FROM issues WHERE reporter_key IS NOT NULL)
        AND u.account_key NOT IN (SELECT DISTINCT author_key FROM comments WHERE author_key IS NOT NULL)
        AND u.account_key NOT IN (SELECT DISTINCT author_key FROM changelogs WHERE author_key IS NOT NULL)
      ORDER BY u.display_name
