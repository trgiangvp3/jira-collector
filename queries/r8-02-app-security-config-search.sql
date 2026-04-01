-- {"key":"r8-02-app-security-config-search","title":"[R8] Tìm BẤT KỲ bằng chứng nào về tiêu chuẩn cấu hình ứng dụng","category":"R8 - No App Baseline","description":"Tìm rộng nhất có thể: bất kỳ issue nào đề cập đến app config standard, secure coding, OWASP config, web hardening guide... Nếu 0 kết quả = finding chắc chắn."}
SELECT
  key, project_key, issue_type_name, summary,
  priority_name, status_name,
  assignee_name, reporter_name,
  SUBSTR(created, 1, 10) as created,
  labels
FROM issues
WHERE LOWER(summary) LIKE '%tiêu chuẩn cấu hình%ứng dụng%'
   OR LOWER(summary) LIKE '%tieu chuan cau hinh%ung dung%'
   OR LOWER(summary) LIKE '%application%baseline%'
   OR LOWER(summary) LIKE '%application%hardening%'
   OR LOWER(summary) LIKE '%app%hardening%'
   OR LOWER(summary) LIKE '%web%hardening%'
   OR LOWER(summary) LIKE '%mobile%hardening%'
   OR LOWER(summary) LIKE '%api%hardening%'
   OR LOWER(summary) LIKE '%secure coding%standard%'
   OR LOWER(summary) LIKE '%owasp%config%'
   OR LOWER(summary) LIKE '%owasp%standard%'
   OR LOWER(summary) LIKE '%application security%standard%'
   OR LOWER(summary) LIKE '%deployment%checklist%security%'
   OR LOWER(summary) LIKE '%go-live%security%'
   OR LOWER(summary) LIKE '%security%checklist%deploy%'
   OR LOWER(summary) LIKE '%security%requirement%'
   OR LOWER(summary) LIKE '%yêu cầu bảo mật%ứng dụng%'
   OR LOWER(summary) LIKE '%quy định%cấu hình%'
   OR LOWER(summary) LIKE '%chính sách%cấu hình%'
ORDER BY created DESC
