-- {"key":"base-user-activity","title":"User Activity Summary (issues assigned, reported, comments)","category":"General Analysis","description":"User Activity Summary (issues assigned, reported, comments)"}
SELECT
        u.display_name,
        u.username,
        u.active,
        COALESCE(assigned.cnt, 0) as issues_assigned,
        COALESCE(reported.cnt, 0) as issues_reported,
        COALESCE(comments.cnt, 0) as comments_made,
        COALESCE(changes.cnt, 0) as changes_made
      FROM users u
      LEFT JOIN (SELECT assignee_key, COUNT(*) cnt FROM issues GROUP BY assignee_key) assigned ON u.account_key = assigned.assignee_key
      LEFT JOIN (SELECT reporter_key, COUNT(*) cnt FROM issues GROUP BY reporter_key) reported ON u.account_key = reported.reporter_key
      LEFT JOIN (SELECT author_key, COUNT(*) cnt FROM comments GROUP BY author_key) comments ON u.account_key = comments.author_key
      LEFT JOIN (SELECT author_key, COUNT(*) cnt FROM changelogs GROUP BY author_key) changes ON u.account_key = changes.author_key
      ORDER BY changes_made DESC
      LIMIT 50
