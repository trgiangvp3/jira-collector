-- {"key":"inc-02-incident-response-time","title":"Thời gian phản hồi sự cố ATTT","category":"Security Incidents","description":"Phân tích thời gian từ tạo đến lần cập nhật đầu tiên và đến khi đóng."}
WITH incident_issues AS (
  SELECT key, summary, priority_name, created, resolved, project_key, assignee_name
  FROM issues
  WHERE LOWER(summary) LIKE '%incident%' OR LOWER(summary) LIKE '%sự cố%'
     OR LOWER(summary) LIKE '%su co%' OR LOWER(summary) LIKE '%breach%'
     OR LOWER(summary) LIKE '%attack%' OR LOWER(summary) LIKE '%tấn công%'
     OR LOWER(issue_type_name) LIKE '%incident%' OR LOWER(labels) LIKE '%incident%'
),
first_response AS (
  SELECT
    ii.key,
    MIN(c.created) as first_comment_at
  FROM incident_issues ii
  LEFT JOIN comments c ON ii.key = c.issue_key AND c.created > ii.created
  GROUP BY ii.key
)
SELECT
  ii.key, ii.project_key, ii.summary,
  ii.priority_name, ii.assignee_name,
  ii.created,
  fr.first_comment_at,
  CASE WHEN fr.first_comment_at IS NOT NULL
    THEN ROUND((julianday(fr.first_comment_at) - julianday(ii.created)) * 24, 1)
    ELSE NULL END as response_hours,
  ii.resolved,
  CASE WHEN ii.resolved IS NOT NULL
    THEN CAST(julianday(ii.resolved) - julianday(ii.created) AS INTEGER)
    ELSE NULL END as resolution_days
FROM incident_issues ii
LEFT JOIN first_response fr ON ii.key = fr.key
ORDER BY ii.created DESC
