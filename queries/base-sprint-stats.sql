-- {"key":"base-sprint-stats","title":"Sprint Statistics","category":"General Analysis","description":"Sprint Statistics"}
SELECT s.name, s.state, s.start_date, s.end_date, s.complete_date,
        COUNT(isp.issue_key) as issue_count,
        b.name as board_name
      FROM sprints s
      LEFT JOIN issue_sprints isp ON s.id = isp.sprint_id
      LEFT JOIN boards b ON s.board_id = b.id
      GROUP BY s.id
      ORDER BY s.start_date DESC
      LIMIT 50
