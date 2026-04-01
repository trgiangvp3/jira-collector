-- {"key":"base-assignee-changes","title":"Assignee Changes (last 30 days)","category":"General Analysis","description":"Assignee Changes (last 30 days)"}
SELECT ci.issue_key, ci.from_string as from_assignee, ci.to_string as to_assignee,
        c.author_name, c.created
      FROM changelog_items ci
      JOIN changelogs c ON ci.changelog_id = c.id
      WHERE ci.field = 'assignee' AND c.created >= date('now', '-30 days')
      ORDER BY c.created DESC
      LIMIT 200
