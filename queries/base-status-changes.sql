-- {"key":"base-status-changes","title":"Status Change History (last 30 days)","category":"General Analysis","description":"Status Change History (last 30 days)"}
SELECT ci.issue_key, ci.from_string as from_status, ci.to_string as to_status,
        c.author_name, c.created
      FROM changelog_items ci
      JOIN changelogs c ON ci.changelog_id = c.id
      WHERE ci.field = 'status' AND c.created >= date('now', '-30 days')
      ORDER BY c.created DESC
      LIMIT 200
