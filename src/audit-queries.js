/**
 * Audit SQL Queries - Gợi ý SQL phục vụ kiểm toán ATTT
 * Phân loại theo các nhóm kiểm toán chính
 */

const AUDIT_QUERIES = {

  // ================================================================
  //  1. QUẢN LÝ TÀI KHOẢN & QUYỀN TRUY CẬP (Access Control)
  // ================================================================

  'acc-01-inactive-users': {
    category: 'Access Control',
    title: 'Tài khoản inactive chưa bị vô hiệu hóa đúng cách',
    description: 'Liệt kê tài khoản inactive nhưng vẫn tồn tại trong hệ thống. Rủi ro: tài khoản zombie có thể bị khai thác.',
    sql: `
SELECT
  account_key, username, display_name, email, active,
  CASE WHEN active = 0 THEN 'INACTIVE' ELSE 'ACTIVE' END as status
FROM users
WHERE active = 0
ORDER BY display_name`
  },

  'acc-02-active-no-activity': {
    category: 'Access Control',
    title: 'Tài khoản active nhưng không có hoạt động nào',
    description: 'Tài khoản vẫn active nhưng chưa từng tạo, được assign, comment hay thay đổi issue. Có thể là tài khoản thừa cần rà soát.',
    sql: `
SELECT u.display_name, u.username, u.email, u.active
FROM users u
WHERE u.active = 1
  AND u.account_key NOT IN (SELECT DISTINCT assignee_key FROM issues WHERE assignee_key IS NOT NULL)
  AND u.account_key NOT IN (SELECT DISTINCT reporter_key FROM issues WHERE reporter_key IS NOT NULL)
  AND u.account_key NOT IN (SELECT DISTINCT creator_key FROM issues WHERE creator_key IS NOT NULL)
  AND u.account_key NOT IN (SELECT DISTINCT author_key FROM comments WHERE author_key IS NOT NULL)
  AND u.account_key NOT IN (SELECT DISTINCT author_key FROM changelogs WHERE author_key IS NOT NULL)
  AND u.account_key NOT IN (SELECT DISTINCT author_key FROM worklogs WHERE author_key IS NOT NULL)
ORDER BY u.display_name`
  },

  'acc-03-admin-groups': {
    category: 'Access Control',
    title: 'Thành viên các nhóm Admin / Đặc quyền',
    description: 'Liệt kê tất cả thành viên thuộc nhóm admin hoặc nhóm có quyền cao. Cần kiểm tra nguyên tắc least privilege.',
    sql: `
SELECT
  gm.group_name,
  gm.display_name,
  gm.username,
  CASE WHEN gm.active = 1 THEN 'Active' ELSE 'INACTIVE' END as status,
  u.email
FROM group_members gm
LEFT JOIN users u ON gm.account_key = u.account_key
WHERE LOWER(gm.group_name) LIKE '%admin%'
   OR LOWER(gm.group_name) LIKE '%system%'
   OR LOWER(gm.group_name) LIKE '%jira-software%'
   OR LOWER(gm.group_name) LIKE '%super%'
   OR LOWER(gm.group_name) LIKE '%developer%'
ORDER BY gm.group_name, gm.display_name`
  },

  'acc-04-inactive-in-admin-groups': {
    category: 'Access Control',
    title: 'Tài khoản INACTIVE vẫn nằm trong nhóm quyền',
    description: 'Tài khoản đã bị deactivate nhưng chưa bị xóa khỏi groups. Rủi ro: nếu tài khoản bị reactivate sẽ tự động có lại quyền.',
    sql: `
SELECT
  gm.group_name, gm.display_name, gm.username,
  'INACTIVE' as user_status
FROM group_members gm
WHERE gm.active = 0
ORDER BY gm.group_name, gm.display_name`
  },

  'acc-05-group-overview': {
    category: 'Access Control',
    title: 'Tổng quan các nhóm quyền và số thành viên',
    description: 'Thống kê số thành viên mỗi nhóm, bao gồm cả inactive. Nhóm quá nhiều thành viên cần rà soát.',
    sql: `
SELECT
  g.name as group_name,
  COUNT(gm.account_key) as total_members,
  SUM(CASE WHEN gm.active = 1 THEN 1 ELSE 0 END) as active_members,
  SUM(CASE WHEN gm.active = 0 THEN 1 ELSE 0 END) as inactive_members,
  ROUND(100.0 * SUM(CASE WHEN gm.active = 0 THEN 1 ELSE 0 END) / MAX(COUNT(gm.account_key), 1), 1) as inactive_pct
FROM groups g
LEFT JOIN group_members gm ON g.name = gm.group_name
GROUP BY g.name
ORDER BY total_members DESC`
  },

  'acc-06-role-assignments': {
    category: 'Access Control',
    title: 'Phân quyền Role theo từng Project',
    description: 'Chi tiết ai được gán role gì trong project nào. Rà soát nguyên tắc phân quyền tối thiểu.',
    sql: `
SELECT
  project_key, role_name, actor_type,
  actor_name, actor_display_name
FROM project_role_members
ORDER BY project_key, role_name, actor_type`
  },

  'acc-07-users-multiple-admin-roles': {
    category: 'Access Control',
    title: 'User có nhiều role Admin trong nhiều project',
    description: 'Người dùng giữ role admin/lead trong nhiều project. Cần đánh giá tập trung quyền.',
    sql: `
SELECT
  actor_display_name,
  actor_name,
  GROUP_CONCAT(DISTINCT role_name) as roles,
  COUNT(DISTINCT project_key) as project_count,
  GROUP_CONCAT(DISTINCT project_key) as projects
FROM project_role_members
WHERE LOWER(role_name) LIKE '%admin%'
   OR LOWER(role_name) LIKE '%lead%'
   OR LOWER(role_name) LIKE '%manager%'
GROUP BY actor_name
HAVING project_count > 1
ORDER BY project_count DESC`
  },

  'acc-08-permission-schemes': {
    category: 'Access Control',
    title: 'Danh sách Permission Schemes',
    description: 'Các scheme phân quyền đang được cấu hình trong hệ thống.',
    sql: `SELECT id, name, description FROM permission_schemes ORDER BY name`
  },

  // ================================================================
  //  2. QUẢN LÝ BẢO MẬT (Security Management)
  // ================================================================

  'sec-01-security-schemes': {
    category: 'Security',
    title: 'Issue Security Schemes',
    description: 'Các scheme bảo mật issue đang cấu hình. Kiểm tra có được áp dụng đúng.',
    sql: `SELECT id, name, description FROM security_schemes ORDER BY name`
  },

  'sec-02-issues-with-security-level': {
    category: 'Security',
    title: 'Issues có đặt Security Level',
    description: 'Danh sách issue được đặt security level. Kiểm tra dữ liệu nhạy cảm có được bảo vệ.',
    sql: `
SELECT
  key, summary, security_level, project_key,
  status_name, assignee_name, reporter_name,
  created, updated
FROM issues
WHERE security_level IS NOT NULL
ORDER BY security_level, project_key, key`
  },

  'sec-03-security-level-changes': {
    category: 'Security',
    title: 'Lịch sử thay đổi Security Level',
    description: 'Theo dõi ai đã thay đổi (hạ/nâng) security level của issue. Phát hiện hạ mức bảo mật bất thường.',
    sql: `
SELECT
  ci.issue_key,
  ci.from_string as from_level,
  ci.to_string as to_level,
  c.author_name as changed_by,
  c.created as changed_at,
  i.summary,
  i.project_key
FROM changelog_items ci
JOIN changelogs c ON ci.changelog_id = c.id
LEFT JOIN issues i ON ci.issue_key = i.key
WHERE LOWER(ci.field) = 'security'
ORDER BY c.created DESC`
  },

  'sec-04-notification-schemes': {
    category: 'Security',
    title: 'Notification Schemes',
    description: 'Kiểm tra cấu hình thông báo - đảm bảo không gửi thông tin nhạy cảm ra ngoài.',
    sql: `SELECT id, name, description FROM notification_schemes ORDER BY name`
  },

  'sec-05-sensitive-keywords-issues': {
    category: 'Security',
    title: 'Issues chứa từ khóa nhạy cảm (password, credential, secret, token...)',
    description: 'Tìm issue có thể chứa thông tin nhạy cảm trong summary hoặc description.',
    sql: `
SELECT
  key, project_key, summary,
  SUBSTR(description, 1, 200) as description_preview,
  assignee_name, reporter_name, created, status_name
FROM issues
WHERE LOWER(summary) LIKE '%password%'
   OR LOWER(summary) LIKE '%credential%'
   OR LOWER(summary) LIKE '%secret%'
   OR LOWER(summary) LIKE '%token%'
   OR LOWER(summary) LIKE '%private key%'
   OR LOWER(summary) LIKE '%api key%'
   OR LOWER(summary) LIKE '%access key%'
   OR LOWER(summary) LIKE '%connection string%'
   OR LOWER(description) LIKE '%password%'
   OR LOWER(description) LIKE '%credential%'
   OR LOWER(description) LIKE '%secret%'
   OR LOWER(description) LIKE '%private key%'
   OR LOWER(description) LIKE '%api key%'
ORDER BY created DESC`
  },

  'sec-06-sensitive-keywords-comments': {
    category: 'Security',
    title: 'Comments chứa từ khóa nhạy cảm',
    description: 'Tìm comment có thể chứa thông tin nhạy cảm (password, key, credential...).',
    sql: `
SELECT
  c.issue_key, c.author_name,
  SUBSTR(c.body, 1, 300) as comment_preview,
  c.created,
  i.project_key, i.summary
FROM comments c
LEFT JOIN issues i ON c.issue_key = i.key
WHERE LOWER(c.body) LIKE '%password%'
   OR LOWER(c.body) LIKE '%credential%'
   OR LOWER(c.body) LIKE '%secret%'
   OR LOWER(c.body) LIKE '%private key%'
   OR LOWER(c.body) LIKE '%api key%'
   OR LOWER(c.body) LIKE '%token%'
   OR LOWER(c.body) LIKE '%connection string%'
ORDER BY c.created DESC`
  },

  'sec-07-sensitive-attachments': {
    category: 'Security',
    title: 'File đính kèm có thể chứa dữ liệu nhạy cảm',
    description: 'File config, key, cert, SQL dump, spreadsheet có thể chứa thông tin nhạy cảm.',
    sql: `
SELECT
  a.issue_key, a.filename,
  ROUND(a.size / 1024.0, 1) as size_kb,
  a.mime_type, a.author_name, a.created,
  i.project_key, i.summary
FROM attachments a
LEFT JOIN issues i ON a.issue_key = i.key
WHERE LOWER(a.filename) LIKE '%.pem'
   OR LOWER(a.filename) LIKE '%.key'
   OR LOWER(a.filename) LIKE '%.p12'
   OR LOWER(a.filename) LIKE '%.pfx'
   OR LOWER(a.filename) LIKE '%.cert'
   OR LOWER(a.filename) LIKE '%.crt'
   OR LOWER(a.filename) LIKE '%.env'
   OR LOWER(a.filename) LIKE '%.conf'
   OR LOWER(a.filename) LIKE '%.config'
   OR LOWER(a.filename) LIKE '%.properties'
   OR LOWER(a.filename) LIKE '%.sql'
   OR LOWER(a.filename) LIKE '%.bak'
   OR LOWER(a.filename) LIKE '%.dump'
   OR LOWER(a.filename) LIKE '%.csv'
   OR LOWER(a.filename) LIKE '%password%'
   OR LOWER(a.filename) LIKE '%credential%'
   OR LOWER(a.filename) LIKE '%secret%'
ORDER BY a.created DESC`
  },

  // ================================================================
  //  3. QUẢN LÝ THAY ĐỔI (Change Management)
  // ================================================================

  'chg-01-status-changes-recent': {
    category: 'Change Management',
    title: 'Thay đổi trạng thái issue (30 ngày gần nhất)',
    description: 'Theo dõi luồng thay đổi trạng thái. Phát hiện bỏ qua quy trình (skip approval, reopen bất thường).',
    sql: `
SELECT
  ci.issue_key,
  i.project_key,
  ci.from_string as from_status,
  ci.to_string as to_status,
  c.author_name as changed_by,
  c.created as changed_at,
  i.summary
FROM changelog_items ci
JOIN changelogs c ON ci.changelog_id = c.id
LEFT JOIN issues i ON ci.issue_key = i.key
WHERE ci.field = 'status'
  AND c.created >= date('now', '-30 days')
ORDER BY c.created DESC`
  },

  'chg-02-reopen-issues': {
    category: 'Change Management',
    title: 'Issues bị Reopen nhiều lần',
    description: 'Issue bị reopen > 1 lần có thể chỉ ra vấn đề về chất lượng hoặc quy trình kiểm thử.',
    sql: `
SELECT
  ci.issue_key,
  i.project_key,
  i.summary,
  i.assignee_name,
  COUNT(*) as reopen_count,
  GROUP_CONCAT(c.author_name || ' (' || SUBSTR(c.created, 1, 10) || ')') as reopen_history
FROM changelog_items ci
JOIN changelogs c ON ci.changelog_id = c.id
LEFT JOIN issues i ON ci.issue_key = i.key
WHERE ci.field = 'status'
  AND (LOWER(ci.to_string) LIKE '%reopen%' OR LOWER(ci.to_string) LIKE '%open%')
  AND LOWER(ci.from_string) NOT LIKE '%open%'
GROUP BY ci.issue_key
HAVING reopen_count > 1
ORDER BY reopen_count DESC`
  },

  'chg-03-assignee-changes': {
    category: 'Change Management',
    title: 'Thay đổi Assignee (30 ngày)',
    description: 'Theo dõi reassign issue. Phát hiện chuyển issue bất thường.',
    sql: `
SELECT
  ci.issue_key,
  i.project_key,
  ci.from_string as from_assignee,
  ci.to_string as to_assignee,
  c.author_name as changed_by,
  c.created as changed_at,
  i.summary
FROM changelog_items ci
JOIN changelogs c ON ci.changelog_id = c.id
LEFT JOIN issues i ON ci.issue_key = i.key
WHERE ci.field = 'assignee'
  AND c.created >= date('now', '-30 days')
ORDER BY c.created DESC`
  },

  'chg-04-priority-escalations': {
    category: 'Change Management',
    title: 'Thay đổi Priority / Escalation',
    description: 'Lịch sử nâng/hạ priority. Phát hiện escalation bất thường hoặc hạ priority để tránh SLA.',
    sql: `
SELECT
  ci.issue_key,
  i.project_key,
  ci.from_string as from_priority,
  ci.to_string as to_priority,
  c.author_name as changed_by,
  c.created as changed_at,
  i.summary
FROM changelog_items ci
JOIN changelogs c ON ci.changelog_id = c.id
LEFT JOIN issues i ON ci.issue_key = i.key
WHERE ci.field = 'priority'
ORDER BY c.created DESC`
  },

  'chg-05-after-hours-changes': {
    category: 'Change Management',
    title: 'Thay đổi ngoài giờ hành chính (trước 7h, sau 19h)',
    description: 'Hoạt động ngoài giờ làm việc có thể là dấu hiệu bất thường cần rà soát.',
    sql: `
SELECT
  ci.issue_key,
  ci.field,
  ci.from_string,
  ci.to_string,
  c.author_name,
  c.created,
  CAST(SUBSTR(c.created, 12, 2) AS INTEGER) as hour_of_day,
  i.project_key
FROM changelog_items ci
JOIN changelogs c ON ci.changelog_id = c.id
LEFT JOIN issues i ON ci.issue_key = i.key
WHERE (CAST(SUBSTR(c.created, 12, 2) AS INTEGER) < 7
    OR CAST(SUBSTR(c.created, 12, 2) AS INTEGER) >= 19)
ORDER BY c.created DESC
LIMIT 500`
  },

  'chg-06-bulk-changes': {
    category: 'Change Management',
    title: 'User thực hiện nhiều thay đổi cùng lúc (bulk change)',
    description: 'Phát hiện bulk change - nhiều thay đổi trong 1 phút bởi cùng 1 user. Có thể là thay đổi hàng loạt không qua kiểm duyệt.',
    sql: `
SELECT
  c.author_name,
  SUBSTR(c.created, 1, 16) as minute_window,
  COUNT(DISTINCT ci.issue_key) as issues_changed,
  GROUP_CONCAT(DISTINCT ci.field) as fields_changed,
  GROUP_CONCAT(DISTINCT ci.issue_key) as issue_keys
FROM changelogs c
JOIN changelog_items ci ON c.id = ci.changelog_id
GROUP BY c.author_name, SUBSTR(c.created, 1, 16)
HAVING issues_changed >= 5
ORDER BY issues_changed DESC
LIMIT 100`
  },

  'chg-07-workflow-violations': {
    category: 'Change Management',
    title: 'Chuyển trạng thái bất thường (có thể bypass workflow)',
    description: 'Các chuyển đổi trạng thái đáng ngờ: Done->Open, Closed->In Progress, skip các bước trung gian.',
    sql: `
SELECT
  ci.issue_key,
  ci.from_string as from_status,
  ci.to_string as to_status,
  c.author_name,
  c.created,
  i.project_key,
  i.summary
FROM changelog_items ci
JOIN changelogs c ON ci.changelog_id = c.id
LEFT JOIN issues i ON ci.issue_key = i.key
WHERE ci.field = 'status'
  AND (
    (LOWER(ci.from_string) IN ('done', 'closed', 'resolved') AND LOWER(ci.to_string) IN ('open', 'to do', 'new'))
    OR (LOWER(ci.from_string) IN ('done', 'closed') AND LOWER(ci.to_string) LIKE '%progress%')
  )
ORDER BY c.created DESC`
  },

  // ================================================================
  //  4. QUẢN LÝ DỰ ÁN & ISSUE (Project Governance)
  // ================================================================

  'prj-01-project-stats': {
    category: 'Project Governance',
    title: 'Thống kê tổng quan theo Project',
    description: 'Tổng quan số lượng issue, trạng thái, thời gian hoạt động từng project.',
    sql: `
SELECT
  p.key, p.name, p.lead_display_name as lead,
  COUNT(i.id) as total_issues,
  SUM(CASE WHEN i.status_category = 'Done' THEN 1 ELSE 0 END) as done,
  SUM(CASE WHEN i.status_category = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
  SUM(CASE WHEN i.status_category = 'To Do' THEN 1 ELSE 0 END) as todo,
  MIN(SUBSTR(i.created, 1, 10)) as first_issue,
  MAX(SUBSTR(i.updated, 1, 10)) as last_update
FROM projects p
LEFT JOIN issues i ON p.key = i.project_key
GROUP BY p.key
ORDER BY total_issues DESC`
  },

  'prj-02-overdue-issues': {
    category: 'Project Governance',
    title: 'Issues quá hạn (Due date đã qua, chưa done)',
    description: 'Issue đã quá hạn nhưng chưa hoàn thành. Rủi ro SLA và cam kết.',
    sql: `
SELECT
  key, project_key, summary,
  due_date,
  CAST(julianday('now') - julianday(due_date) AS INTEGER) as days_overdue,
  status_name, priority_name,
  assignee_name, reporter_name
FROM issues
WHERE due_date IS NOT NULL
  AND due_date < date('now')
  AND status_category != 'Done'
ORDER BY days_overdue DESC`
  },

  'prj-03-stale-issues': {
    category: 'Project Governance',
    title: 'Issues "chết" (open > 1 năm, không cập nhật > 6 tháng)',
    description: 'Issue mở lâu không xử lý. Cần đánh giá có nên đóng hoặc xử lý.',
    sql: `
SELECT
  key, project_key, summary,
  status_name, priority_name,
  assignee_name,
  created,
  updated,
  CAST(julianday('now') - julianday(created) AS INTEGER) as age_days,
  CAST(julianday('now') - julianday(updated) AS INTEGER) as days_since_update
FROM issues
WHERE status_category != 'Done'
  AND created < date('now', '-1 year')
  AND updated < date('now', '-6 months')
ORDER BY age_days DESC
LIMIT 200`
  },

  'prj-04-high-priority-open': {
    category: 'Project Governance',
    title: 'Issues Critical/High chưa xử lý',
    description: 'Issue ưu tiên cao vẫn open. Cần rà soát tiến độ và cam kết.',
    sql: `
SELECT
  key, project_key, summary,
  priority_name, status_name,
  assignee_name, reporter_name,
  created, updated,
  CAST(julianday('now') - julianday(created) AS INTEGER) as age_days
FROM issues
WHERE status_category != 'Done'
  AND LOWER(priority_name) IN ('highest', 'critical', 'blocker', 'high')
ORDER BY
  CASE LOWER(priority_name) WHEN 'blocker' THEN 1 WHEN 'critical' THEN 2 WHEN 'highest' THEN 3 WHEN 'high' THEN 4 END,
  created ASC`
  },

  'prj-05-unassigned-open': {
    category: 'Project Governance',
    title: 'Issues open chưa có người nhận',
    description: 'Issue không có assignee. Rủi ro bị bỏ sót.',
    sql: `
SELECT
  key, project_key, summary,
  priority_name, status_name,
  reporter_name, created,
  CAST(julianday('now') - julianday(created) AS INTEGER) as age_days
FROM issues
WHERE assignee_key IS NULL
  AND status_category != 'Done'
ORDER BY
  CASE LOWER(priority_name) WHEN 'blocker' THEN 1 WHEN 'critical' THEN 2 WHEN 'highest' THEN 3 WHEN 'high' THEN 4 ELSE 5 END,
  created ASC
LIMIT 200`
  },

  'prj-06-issues-no-description': {
    category: 'Project Governance',
    title: 'Issues không có mô tả',
    description: 'Issue không có description. Không đảm bảo chất lượng quản lý yêu cầu.',
    sql: `
SELECT
  key, project_key, summary,
  issue_type_name, status_name, assignee_name,
  reporter_name, created
FROM issues
WHERE (description IS NULL OR TRIM(description) = '')
  AND status_category != 'Done'
ORDER BY created DESC
LIMIT 200`
  },

  // ================================================================
  //  5. THEO DÕI AUDIT LOG
  // ================================================================

  'aud-01-permission-changes': {
    category: 'Audit Log',
    title: 'Thay đổi quyền trong Audit Log',
    description: 'Tất cả sự kiện liên quan đến thay đổi quyền, group, scheme.',
    sql: `
SELECT
  summary, category, author_name,
  object_name, object_type, created
FROM audit_log
WHERE LOWER(category) LIKE '%permission%'
   OR LOWER(category) LIKE '%security%'
   OR LOWER(category) LIKE '%scheme%'
   OR LOWER(summary) LIKE '%permission%'
   OR LOWER(summary) LIKE '%group%'
   OR LOWER(summary) LIKE '%role%'
   OR LOWER(summary) LIKE '%scheme%'
ORDER BY created DESC`
  },

  'aud-02-user-management-events': {
    category: 'Audit Log',
    title: 'Sự kiện quản lý User (tạo, xóa, deactivate)',
    description: 'Theo dõi lifecycle tài khoản.',
    sql: `
SELECT
  summary, category, author_name,
  object_name, object_type, created
FROM audit_log
WHERE LOWER(category) LIKE '%user%'
   OR LOWER(summary) LIKE '%user%'
   OR LOWER(summary) LIKE '%account%'
   OR LOWER(summary) LIKE '%deactivat%'
   OR LOWER(summary) LIKE '%activat%'
   OR LOWER(summary) LIKE '%created%'
   OR LOWER(summary) LIKE '%deleted%'
ORDER BY created DESC`
  },

  'aud-03-config-changes': {
    category: 'Audit Log',
    title: 'Thay đổi cấu hình hệ thống',
    description: 'Sự kiện thay đổi system config, workflow, scheme.',
    sql: `
SELECT
  summary, category, author_name,
  object_name, object_type, created
FROM audit_log
WHERE LOWER(category) LIKE '%system%'
   OR LOWER(category) LIKE '%global%'
   OR LOWER(category) LIKE '%workflow%'
   OR LOWER(category) LIKE '%config%'
   OR LOWER(summary) LIKE '%workflow%'
   OR LOWER(summary) LIKE '%configuration%'
ORDER BY created DESC`
  },

  'aud-04-audit-by-user': {
    category: 'Audit Log',
    title: 'Thống kê Audit Log theo User',
    description: 'Ai thực hiện nhiều thao tác admin nhất.',
    sql: `
SELECT
  author_name,
  COUNT(*) as total_events,
  COUNT(DISTINCT category) as categories,
  GROUP_CONCAT(DISTINCT category) as event_categories,
  MIN(created) as first_event,
  MAX(created) as last_event
FROM audit_log
WHERE author_name IS NOT NULL
GROUP BY author_name
ORDER BY total_events DESC`
  },

  'aud-05-recent-audit': {
    category: 'Audit Log',
    title: 'Audit Log gần đây nhất (100 sự kiện)',
    description: 'Xem 100 sự kiện audit gần nhất.',
    sql: `
SELECT summary, category, event_source, author_name, object_name, object_type, created
FROM audit_log
ORDER BY created DESC
LIMIT 100`
  },

  // ================================================================
  //  6. PHÂN TÍCH NHÂN SỰ & NĂNG SUẤT
  // ================================================================

  'hr-01-user-activity-summary': {
    category: 'User Activity',
    title: 'Tổng hợp hoạt động theo User',
    description: 'Tổng số issue assigned, reported, comment, thay đổi theo từng user.',
    sql: `
SELECT
  u.display_name,
  u.username,
  u.email,
  CASE WHEN u.active = 1 THEN 'Active' ELSE 'INACTIVE' END as status,
  COALESCE(a.cnt, 0) as assigned,
  COALESCE(r.cnt, 0) as reported,
  COALESCE(cm.cnt, 0) as comments,
  COALESCE(ch.cnt, 0) as changes,
  COALESCE(wl.cnt, 0) as worklogs,
  COALESCE(a.cnt,0) + COALESCE(r.cnt,0) + COALESCE(cm.cnt,0) + COALESCE(ch.cnt,0) + COALESCE(wl.cnt,0) as total_activity
FROM users u
LEFT JOIN (SELECT assignee_key, COUNT(*) cnt FROM issues GROUP BY assignee_key) a ON u.account_key = a.assignee_key
LEFT JOIN (SELECT reporter_key, COUNT(*) cnt FROM issues GROUP BY reporter_key) r ON u.account_key = r.reporter_key
LEFT JOIN (SELECT author_key, COUNT(*) cnt FROM comments GROUP BY author_key) cm ON u.account_key = cm.author_key
LEFT JOIN (SELECT author_key, COUNT(*) cnt FROM changelogs GROUP BY author_key) ch ON u.account_key = ch.author_key
LEFT JOIN (SELECT author_key, COUNT(*) cnt FROM worklogs GROUP BY author_key) wl ON u.account_key = wl.author_key
ORDER BY total_activity DESC`
  },

  'hr-02-worklog-summary': {
    category: 'User Activity',
    title: 'Tổng hợp thời gian làm việc (Worklog)',
    description: 'Số giờ log theo từng user. Đối chiếu với chấm công.',
    sql: `
SELECT
  author_name,
  ROUND(SUM(time_spent_seconds) / 3600.0, 1) as total_hours,
  COUNT(*) as log_entries,
  COUNT(DISTINCT issue_key) as issues_worked,
  MIN(SUBSTR(started, 1, 10)) as first_log,
  MAX(SUBSTR(started, 1, 10)) as last_log
FROM worklogs
GROUP BY author_key
ORDER BY total_hours DESC`
  },

  'hr-03-worklog-outside-hours': {
    category: 'User Activity',
    title: 'Worklog ghi ngoài giờ hành chính',
    description: 'Log thời gian vào lúc bất thường (trước 7h, sau 19h, cuối tuần).',
    sql: `
SELECT
  w.issue_key, w.author_name,
  w.started,
  CAST(SUBSTR(w.started, 12, 2) AS INTEGER) as hour_of_day,
  ROUND(w.time_spent_seconds / 3600.0, 1) as hours_logged,
  w.comment,
  i.project_key, i.summary
FROM worklogs w
LEFT JOIN issues i ON w.issue_key = i.key
WHERE CAST(SUBSTR(w.started, 12, 2) AS INTEGER) < 7
   OR CAST(SUBSTR(w.started, 12, 2) AS INTEGER) >= 19
ORDER BY w.started DESC
LIMIT 200`
  },

  'hr-04-activity-by-month': {
    category: 'User Activity',
    title: 'Thống kê hoạt động theo tháng',
    description: 'Xu hướng hoạt động trên Jira theo thời gian.',
    sql: `
SELECT
  SUBSTR(created, 1, 7) as month,
  COUNT(*) as issues_created,
  COUNT(DISTINCT reporter_key) as unique_reporters,
  COUNT(DISTINCT project_key) as projects_active
FROM issues
GROUP BY SUBSTR(created, 1, 7)
ORDER BY month DESC`
  },

  // ================================================================
  //  7. ATTACHMENTS & DATA LEAKAGE
  // ================================================================

  'dat-01-large-attachments': {
    category: 'Data Protection',
    title: 'File đính kèm lớn (> 5MB)',
    description: 'File lớn có thể chứa database dump, export dữ liệu.',
    sql: `
SELECT
  a.issue_key, a.filename,
  ROUND(a.size / 1048576.0, 2) as size_mb,
  a.mime_type, a.author_name, a.created,
  i.project_key, i.summary
FROM attachments a
LEFT JOIN issues i ON a.issue_key = i.key
WHERE a.size > 5242880
ORDER BY a.size DESC`
  },

  'dat-02-attachment-types': {
    category: 'Data Protection',
    title: 'Thống kê loại file đính kèm',
    description: 'Tổng hợp loại file và dung lượng. Kiểm tra có file nhạy cảm.',
    sql: `
SELECT
  mime_type,
  COUNT(*) as file_count,
  ROUND(SUM(size) / 1048576.0, 2) as total_size_mb,
  ROUND(AVG(size) / 1024.0, 1) as avg_size_kb,
  ROUND(MAX(size) / 1048576.0, 2) as max_size_mb
FROM attachments
GROUP BY mime_type
ORDER BY total_size_mb DESC`
  },

  'dat-03-executable-attachments': {
    category: 'Data Protection',
    title: 'File đính kèm có thể thực thi',
    description: 'File .exe, .bat, .sh, .jar, .py... có thể là mã độc hoặc rủi ro bảo mật.',
    sql: `
SELECT
  a.issue_key, a.filename,
  ROUND(a.size / 1024.0, 1) as size_kb,
  a.mime_type, a.author_name, a.created,
  i.project_key
FROM attachments a
LEFT JOIN issues i ON a.issue_key = i.key
WHERE LOWER(a.filename) LIKE '%.exe'
   OR LOWER(a.filename) LIKE '%.bat'
   OR LOWER(a.filename) LIKE '%.cmd'
   OR LOWER(a.filename) LIKE '%.sh'
   OR LOWER(a.filename) LIKE '%.ps1'
   OR LOWER(a.filename) LIKE '%.jar'
   OR LOWER(a.filename) LIKE '%.py'
   OR LOWER(a.filename) LIKE '%.vbs'
   OR LOWER(a.filename) LIKE '%.dll'
   OR LOWER(a.filename) LIKE '%.msi'
   OR LOWER(a.filename) LIKE '%.scr'
   OR LOWER(a.filename) LIKE '%.com'
   OR LOWER(a.mime_type) LIKE '%executable%'
   OR LOWER(a.mime_type) LIKE '%x-sh%'
ORDER BY a.created DESC`
  },

  // ================================================================
  //  8. SPRINT & AGILE
  // ================================================================

  'spr-01-sprint-stats': {
    category: 'Agile / Sprint',
    title: 'Thống kê Sprint',
    description: 'Tổng hợp sprint: trạng thái, số issue, thời gian.',
    sql: `
SELECT
  s.name as sprint_name,
  s.state,
  b.name as board_name,
  SUBSTR(s.start_date, 1, 10) as start_date,
  SUBSTR(s.end_date, 1, 10) as end_date,
  SUBSTR(s.complete_date, 1, 10) as complete_date,
  COUNT(isp.issue_key) as issue_count,
  s.goal
FROM sprints s
LEFT JOIN issue_sprints isp ON s.id = isp.sprint_id
LEFT JOIN boards b ON s.board_id = b.id
GROUP BY s.id
ORDER BY s.start_date DESC`
  },

  'spr-02-issues-no-sprint': {
    category: 'Agile / Sprint',
    title: 'Issues không thuộc Sprint nào',
    description: 'Issue open không được lập kế hoạch vào sprint.',
    sql: `
SELECT
  i.key, i.project_key, i.summary,
  i.status_name, i.priority_name, i.assignee_name, i.created
FROM issues i
LEFT JOIN issue_sprints isp ON i.key = isp.issue_key
WHERE isp.sprint_id IS NULL
  AND i.status_category != 'Done'
ORDER BY i.priority_name, i.created
LIMIT 200`
  },

  // ================================================================
  //  9. TỔNG HỢP BÁO CÁO
  // ================================================================

  'rpt-01-summary': {
    category: 'Summary Report',
    title: 'Tổng hợp dữ liệu Database',
    description: 'Thống kê tổng quan toàn bộ dữ liệu đã thu thập.',
    sql: `
SELECT 'Projects' as entity, COUNT(*) as count FROM projects
UNION ALL SELECT 'Issues', COUNT(*) FROM issues
UNION ALL SELECT 'Users (Active)', COUNT(*) FROM users WHERE active = 1
UNION ALL SELECT 'Users (Inactive)', COUNT(*) FROM users WHERE active = 0
UNION ALL SELECT 'Comments', COUNT(*) FROM comments
UNION ALL SELECT 'Worklogs', COUNT(*) FROM worklogs
UNION ALL SELECT 'Changelog entries', COUNT(*) FROM changelogs
UNION ALL SELECT 'Changelog items', COUNT(*) FROM changelog_items
UNION ALL SELECT 'Attachments', COUNT(*) FROM attachments
UNION ALL SELECT 'Issue Links', COUNT(*) FROM issue_links
UNION ALL SELECT 'Groups', COUNT(*) FROM groups
UNION ALL SELECT 'Boards', COUNT(*) FROM boards
UNION ALL SELECT 'Sprints', COUNT(*) FROM sprints
UNION ALL SELECT 'Audit Log entries', COUNT(*) FROM audit_log
UNION ALL SELECT 'Custom Field Definitions', COUNT(*) FROM custom_field_definitions
UNION ALL SELECT 'Permission Schemes', COUNT(*) FROM permission_schemes
UNION ALL SELECT 'Security Schemes', COUNT(*) FROM security_schemes
UNION ALL SELECT 'Workflows', COUNT(*) FROM workflows`
  },

  'rpt-02-issue-by-type-status': {
    category: 'Summary Report',
    title: 'Issue theo Type và Status',
    description: 'Ma trận issue type x status category.',
    sql: `
SELECT
  issue_type_name,
  COUNT(*) as total,
  SUM(CASE WHEN status_category = 'To Do' THEN 1 ELSE 0 END) as todo,
  SUM(CASE WHEN status_category = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
  SUM(CASE WHEN status_category = 'Done' THEN 1 ELSE 0 END) as done
FROM issues
GROUP BY issue_type_name
ORDER BY total DESC`
  },

  'rpt-03-issue-by-priority': {
    category: 'Summary Report',
    title: 'Issue theo Priority (open)',
    description: 'Phân bổ issue open theo mức priority.',
    sql: `
SELECT
  priority_name,
  COUNT(*) as total_open,
  SUM(CASE WHEN due_date < date('now') THEN 1 ELSE 0 END) as overdue,
  AVG(CAST(julianday('now') - julianday(created) AS INTEGER)) as avg_age_days
FROM issues
WHERE status_category != 'Done'
GROUP BY priority_name
ORDER BY
  CASE LOWER(priority_name) WHEN 'blocker' THEN 1 WHEN 'critical' THEN 2 WHEN 'highest' THEN 3 WHEN 'high' THEN 4 WHEN 'medium' THEN 5 WHEN 'low' THEN 6 WHEN 'lowest' THEN 7 ELSE 8 END`
  },

  'rpt-04-workflows': {
    category: 'Summary Report',
    title: 'Danh sách Workflows',
    description: 'Tất cả workflow đang cấu hình.',
    sql: `SELECT name, description, is_default, steps_count FROM workflows ORDER BY name`
  },

  'rpt-05-filters-dashboards': {
    category: 'Summary Report',
    title: 'Filters & Dashboards',
    description: 'Saved filters và dashboards trong hệ thống.',
    sql: `
SELECT 'Filter' as type, name, owner_name, jql as detail FROM filters
UNION ALL
SELECT 'Dashboard' as type, name, owner_name, description as detail FROM dashboards
ORDER BY type, name`
  },
};

module.exports = { AUDIT_QUERIES };
