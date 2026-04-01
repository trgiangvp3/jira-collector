-- {"key":"r4-01-findings-no-remediation","title":"[R4] Findings pentest không có hoạt động khắc phục","category":"R4 - No Remediation","description":"Issue finding từ pentest mà không có comment, không có changelog (ngoài tạo), không có worklog -> chưa ai xử lý thực tế."}
WITH pentest_findings AS (
  SELECT i.key, i.summary, i.project_key, i.priority_name, i.status_name,
    i.status_category, i.assignee_name, i.created, i.resolved
  FROM issues i
  WHERE LOWER(i.summary) LIKE '%pentest%' OR LOWER(i.summary) LIKE '%penetration%'
     OR LOWER(i.summary) LIKE '%va scan%' OR LOWER(i.summary) LIKE '%finding%'
     OR LOWER(i.summary) LIKE '%vulnerability%'
     OR LOWER(i.labels) LIKE '%pentest%' OR LOWER(i.labels) LIKE '%va-scan%'
)
SELECT
  pf.key, pf.project_key,
  SUBSTR(pf.summary, 1, 80) as summary,
  pf.priority_name, pf.status_name, pf.assignee_name,
  SUBSTR(pf.created, 1, 10) as created,
  (SELECT COUNT(*) FROM comments c WHERE c.issue_key = pf.key) as comments,
  (SELECT COUNT(*) FROM changelogs c WHERE c.issue_key = pf.key) as changes,
  (SELECT COUNT(*) FROM worklogs w WHERE w.issue_key = pf.key) as worklogs,
  CASE
    WHEN pf.status_category = 'Done'
     AND (SELECT COUNT(*) FROM comments c WHERE c.issue_key = pf.key) = 0
     AND (SELECT COUNT(*) FROM worklogs w WHERE w.issue_key = pf.key) = 0
    THEN '⚠ CLOSED WITHOUT EVIDENCE of work'
    WHEN pf.status_category != 'Done'
     AND (SELECT COUNT(*) FROM changelogs c WHERE c.issue_key = pf.key) <= 1
    THEN '⚠ OPEN but no activity'
    ELSE 'Has activity'
  END as red_flag
FROM pentest_findings pf
ORDER BY
  CASE
    WHEN pf.status_category = 'Done' AND (SELECT COUNT(*) FROM comments c WHERE c.issue_key = pf.key) = 0 THEN 0
    WHEN pf.status_category != 'Done' AND (SELECT COUNT(*) FROM changelogs c WHERE c.issue_key = pf.key) <= 1 THEN 1
    ELSE 2
  END,
  pf.created
