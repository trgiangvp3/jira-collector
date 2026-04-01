-- {"key":"base-overdue-issues","title":"Overdue Issues (past due date, still open)","category":"General Analysis","description":"Overdue Issues (past due date, still open)"}
SELECT key, summary, due_date, assignee_name, project_key, status_name, priority_name
      FROM issues
      WHERE due_date IS NOT NULL
        AND due_date < date('now')
        AND status_category != 'Done'
      ORDER BY due_date ASC
