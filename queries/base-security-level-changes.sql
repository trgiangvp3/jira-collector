-- {"key":"base-security-level-changes","title":"Security Level Changes","category":"General Analysis","description":"Security Level Changes"}
SELECT ci.issue_key, ci.from_string, ci.to_string,
        c.author_name, c.created
      FROM changelog_items ci
      JOIN changelogs c ON ci.changelog_id = c.id
      WHERE LOWER(ci.field) = 'security'
      ORDER BY c.created DESC
