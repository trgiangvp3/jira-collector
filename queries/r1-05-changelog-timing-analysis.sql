-- {"key":"r1-05-changelog-timing-analysis","title":"[R1] Timeline phân tích chi tiết - Issue pentest từ tạo đến đóng","category":"R1 - Backdating","description":"Xem toàn bộ lifecycle (tạo, comment đầu, thay đổi status, resolve) để đánh giá issue có qua quy trình thực hay chỉ tạo rồi đóng luôn."}
WITH pentest_issues AS (
  SELECT key, summary, created, resolved, project_key, assignee_name, reporter_name FROM issues
  WHERE LOWER(summary) LIKE '%pentest%' OR LOWER(summary) LIKE '%penetration%'
     OR LOWER(summary) LIKE '%va scan%' OR LOWER(summary) LIKE '%finding%'
     OR LOWER(labels) LIKE '%pentest%' OR LOWER(labels) LIKE '%va-scan%'
),
issue_events AS (
  SELECT
    pi.key,
    pi.summary,
    pi.reporter_name,
    pi.assignee_name,
    SUBSTR(pi.created, 1, 16) as created_at,
    SUBSTR(pi.resolved, 1, 16) as resolved_at,
    (SELECT COUNT(*) FROM comments c WHERE c.issue_key = pi.key) as comment_count,
    (SELECT COUNT(*) FROM changelogs c WHERE c.issue_key = pi.key) as changelog_count,
    (SELECT MIN(SUBSTR(c.created, 1, 16)) FROM comments c WHERE c.issue_key = pi.key) as first_comment,
    (SELECT COUNT(DISTINCT c.author_key) FROM changelogs c WHERE c.issue_key = pi.key) as unique_actors,
    CASE WHEN pi.resolved IS NOT NULL
      THEN ROUND(julianday(pi.resolved) - julianday(pi.created), 1) ELSE NULL END as days_open
  FROM pentest_issues pi
)
SELECT
  key, SUBSTR(summary, 1, 80) as summary,
  reporter_name, assignee_name,
  created_at, resolved_at,
  days_open,
  comment_count,
  changelog_count,
  unique_actors,
  first_comment,
  CASE
    WHEN comment_count = 0 AND changelog_count <= 2 THEN '⚠ SUSPECT: no discussion, minimal changes'
    WHEN days_open IS NOT NULL AND days_open < 1 THEN '⚠ SUSPECT: resolved same day'
    WHEN unique_actors <= 1 THEN '⚠ SUSPECT: single actor'
    ELSE 'OK'
  END as red_flag
FROM issue_events
ORDER BY
  CASE WHEN comment_count = 0 AND changelog_count <= 2 THEN 0
       WHEN days_open IS NOT NULL AND days_open < 1 THEN 1
       WHEN unique_actors <= 1 THEN 2 ELSE 3 END,
  created_at DESC
