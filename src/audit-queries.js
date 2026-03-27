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

  // ================================================================
  //  10. QUẢN LÝ ĐIỂM YẾU ATTT - TỔNG QUAN (Vulnerability Overview)
  // ================================================================

  'vul-01-all-security-issues': {
    category: 'Vuln - Overview',
    title: 'Tất cả issues liên quan ATTT / điểm yếu / lỗ hổng',
    description: 'Tìm tất cả issue liên quan đến vulnerability, security, bảo mật, lỗ hổng, điểm yếu, CVE, pentest, VA scan. Đây là tập dữ liệu gốc để phân tích.',
    sql: `
SELECT
  i.key, i.project_key, i.issue_type_name, i.summary,
  i.priority_name, i.status_name, i.status_category,
  i.resolution_name,
  i.assignee_name, i.reporter_name,
  i.security_level,
  i.created, i.updated, i.resolved, i.due_date,
  CAST(julianday('now') - julianday(i.created) AS INTEGER) as age_days,
  CASE
    WHEN i.resolved IS NOT NULL THEN CAST(julianday(i.resolved) - julianday(i.created) AS INTEGER)
    ELSE NULL
  END as resolution_days,
  i.labels, i.components
FROM issues i
WHERE LOWER(i.summary) LIKE '%vulnerab%'
   OR LOWER(i.summary) LIKE '%security%'
   OR LOWER(i.summary) LIKE '%bảo mật%'
   OR LOWER(i.summary) LIKE '%bao mat%'
   OR LOWER(i.summary) LIKE '%lỗ hổng%'
   OR LOWER(i.summary) LIKE '%lo hong%'
   OR LOWER(i.summary) LIKE '%điểm yếu%'
   OR LOWER(i.summary) LIKE '%diem yeu%'
   OR LOWER(i.summary) LIKE '%cve-%'
   OR LOWER(i.summary) LIKE '%pentest%'
   OR LOWER(i.summary) LIKE '%pen test%'
   OR LOWER(i.summary) LIKE '%penetration%'
   OR LOWER(i.summary) LIKE '%va scan%'
   OR LOWER(i.summary) LIKE '%scan%vuln%'
   OR LOWER(i.summary) LIKE '%patch%'
   OR LOWER(i.summary) LIKE '%hotfix%'
   OR LOWER(i.summary) LIKE '%exploit%'
   OR LOWER(i.summary) LIKE '%malware%'
   OR LOWER(i.summary) LIKE '%ransomware%'
   OR LOWER(i.summary) LIKE '%incident%'
   OR LOWER(i.summary) LIKE '%sự cố%'
   OR LOWER(i.summary) LIKE '%su co%'
   OR LOWER(i.summary) LIKE '%waf%'
   OR LOWER(i.summary) LIKE '%firewall%'
   OR LOWER(i.summary) LIKE '%ids%'
   OR LOWER(i.summary) LIKE '%ips%'
   OR LOWER(i.summary) LIKE '%siem%'
   OR LOWER(i.summary) LIKE '%soc%'
   OR LOWER(i.summary) LIKE '%hardening%'
   OR LOWER(i.summary) LIKE '%compliance%'
   OR LOWER(i.summary) LIKE '%audit%'
   OR LOWER(i.summary) LIKE '%kiểm toán%'
   OR LOWER(i.summary) LIKE '%kiem toan%'
   OR LOWER(i.summary) LIKE '%owasp%'
   OR LOWER(i.summary) LIKE '%injection%'
   OR LOWER(i.summary) LIKE '%xss%'
   OR LOWER(i.summary) LIKE '%csrf%'
   OR LOWER(i.summary) LIKE '%ssl%'
   OR LOWER(i.summary) LIKE '%tls%'
   OR LOWER(i.summary) LIKE '%certificate%'
   OR LOWER(i.summary) LIKE '%encryption%'
   OR LOWER(i.summary) LIKE '%mã hóa%'
   OR LOWER(i.summary) LIKE '%access control%'
   OR LOWER(i.summary) LIKE '%phân quyền%'
   OR LOWER(i.summary) LIKE '%authentication%'
   OR LOWER(i.summary) LIKE '%authorization%'
   OR LOWER(i.summary) LIKE '%xác thực%'
   OR LOWER(i.labels) LIKE '%security%'
   OR LOWER(i.labels) LIKE '%vulnerability%'
   OR LOWER(i.labels) LIKE '%cve%'
   OR LOWER(i.labels) LIKE '%pentest%'
   OR LOWER(i.issue_type_name) LIKE '%bug%'
   OR LOWER(i.issue_type_name) LIKE '%security%'
   OR LOWER(i.issue_type_name) LIKE '%vulnerability%'
   OR LOWER(i.issue_type_name) LIKE '%incident%'
ORDER BY i.created DESC`
  },

  'vul-02-stats-by-project': {
    category: 'Vuln - Overview',
    title: 'Thống kê issues ATTT theo Project',
    description: 'Phân bổ các issue ATTT theo từng project. Xác định project nào có nhiều điểm yếu nhất.',
    sql: `
WITH security_issues AS (
  SELECT * FROM issues
  WHERE LOWER(summary) LIKE '%vulnerab%'
     OR LOWER(summary) LIKE '%security%'
     OR LOWER(summary) LIKE '%bảo mật%'
     OR LOWER(summary) LIKE '%bao mat%'
     OR LOWER(summary) LIKE '%lỗ hổng%'
     OR LOWER(summary) LIKE '%lo hong%'
     OR LOWER(summary) LIKE '%điểm yếu%'
     OR LOWER(summary) LIKE '%diem yeu%'
     OR LOWER(summary) LIKE '%cve-%'
     OR LOWER(summary) LIKE '%pentest%'
     OR LOWER(summary) LIKE '%patch%'
     OR LOWER(summary) LIKE '%hotfix%'
     OR LOWER(summary) LIKE '%exploit%'
     OR LOWER(summary) LIKE '%incident%'
     OR LOWER(summary) LIKE '%sự cố%'
     OR LOWER(labels) LIKE '%security%'
     OR LOWER(labels) LIKE '%vulnerability%'
     OR LOWER(issue_type_name) LIKE '%security%'
     OR LOWER(issue_type_name) LIKE '%vulnerability%'
)
SELECT
  project_key,
  COUNT(*) as total,
  SUM(CASE WHEN status_category != 'Done' THEN 1 ELSE 0 END) as open,
  SUM(CASE WHEN status_category = 'Done' THEN 1 ELSE 0 END) as closed,
  SUM(CASE WHEN LOWER(priority_name) IN ('blocker','critical','highest','high') AND status_category != 'Done' THEN 1 ELSE 0 END) as high_open,
  SUM(CASE WHEN due_date IS NOT NULL AND due_date < date('now') AND status_category != 'Done' THEN 1 ELSE 0 END) as overdue,
  ROUND(AVG(CASE WHEN resolved IS NOT NULL THEN julianday(resolved) - julianday(created) END), 1) as avg_resolution_days,
  MIN(SUBSTR(created, 1, 10)) as earliest,
  MAX(SUBSTR(created, 1, 10)) as latest
FROM security_issues
GROUP BY project_key
ORDER BY total DESC`
  },

  'vul-03-stats-by-priority': {
    category: 'Vuln - Overview',
    title: 'Thống kê issues ATTT theo Priority',
    description: 'Phân bổ theo mức ưu tiên. Đánh giá có phân loại severity hợp lý không.',
    sql: `
WITH security_issues AS (
  SELECT * FROM issues
  WHERE LOWER(summary) LIKE '%vulnerab%' OR LOWER(summary) LIKE '%security%'
     OR LOWER(summary) LIKE '%bảo mật%' OR LOWER(summary) LIKE '%bao mat%'
     OR LOWER(summary) LIKE '%lỗ hổng%' OR LOWER(summary) LIKE '%lo hong%'
     OR LOWER(summary) LIKE '%điểm yếu%' OR LOWER(summary) LIKE '%diem yeu%'
     OR LOWER(summary) LIKE '%cve-%' OR LOWER(summary) LIKE '%pentest%'
     OR LOWER(summary) LIKE '%patch%' OR LOWER(summary) LIKE '%hotfix%'
     OR LOWER(summary) LIKE '%incident%' OR LOWER(summary) LIKE '%sự cố%'
     OR LOWER(labels) LIKE '%security%' OR LOWER(labels) LIKE '%vulnerability%'
     OR LOWER(issue_type_name) LIKE '%security%' OR LOWER(issue_type_name) LIKE '%vulnerability%'
)
SELECT
  priority_name,
  COUNT(*) as total,
  SUM(CASE WHEN status_category != 'Done' THEN 1 ELSE 0 END) as still_open,
  SUM(CASE WHEN status_category = 'Done' THEN 1 ELSE 0 END) as closed,
  ROUND(AVG(CASE WHEN resolved IS NOT NULL THEN julianday(resolved) - julianday(created) END), 1) as avg_days_to_resolve,
  MAX(CASE WHEN status_category != 'Done' THEN CAST(julianday('now') - julianday(created) AS INTEGER) END) as oldest_open_days,
  SUM(CASE WHEN due_date IS NOT NULL AND due_date < date('now') AND status_category != 'Done' THEN 1 ELSE 0 END) as overdue
FROM security_issues
GROUP BY priority_name
ORDER BY
  CASE LOWER(priority_name) WHEN 'blocker' THEN 1 WHEN 'critical' THEN 2 WHEN 'highest' THEN 3 WHEN 'high' THEN 4 WHEN 'medium' THEN 5 WHEN 'low' THEN 6 WHEN 'lowest' THEN 7 ELSE 8 END`
  },

  'vul-04-stats-by-month': {
    category: 'Vuln - Overview',
    title: 'Xu hướng issues ATTT theo tháng (tạo vs đóng)',
    description: 'Xu hướng phát hiện và xử lý điểm yếu theo thời gian. Đánh giá năng lực xử lý.',
    sql: `
WITH security_issues AS (
  SELECT * FROM issues
  WHERE LOWER(summary) LIKE '%vulnerab%' OR LOWER(summary) LIKE '%security%'
     OR LOWER(summary) LIKE '%bảo mật%' OR LOWER(summary) LIKE '%bao mat%'
     OR LOWER(summary) LIKE '%lỗ hổng%' OR LOWER(summary) LIKE '%điểm yếu%'
     OR LOWER(summary) LIKE '%cve-%' OR LOWER(summary) LIKE '%patch%'
     OR LOWER(summary) LIKE '%pentest%' OR LOWER(summary) LIKE '%incident%'
     OR LOWER(labels) LIKE '%security%' OR LOWER(labels) LIKE '%vulnerability%'
     OR LOWER(issue_type_name) LIKE '%security%' OR LOWER(issue_type_name) LIKE '%vulnerability%'
),
months AS (
  SELECT DISTINCT SUBSTR(created, 1, 7) as month FROM security_issues
  UNION
  SELECT DISTINCT SUBSTR(resolved, 1, 7) FROM security_issues WHERE resolved IS NOT NULL
)
SELECT
  m.month,
  COALESCE(c.created_count, 0) as created,
  COALESCE(r.resolved_count, 0) as resolved,
  COALESCE(c.created_count, 0) - COALESCE(r.resolved_count, 0) as net_new
FROM months m
LEFT JOIN (SELECT SUBSTR(created, 1, 7) as month, COUNT(*) as created_count FROM security_issues GROUP BY SUBSTR(created, 1, 7)) c ON m.month = c.month
LEFT JOIN (SELECT SUBSTR(resolved, 1, 7) as month, COUNT(*) as resolved_count FROM security_issues WHERE resolved IS NOT NULL GROUP BY SUBSTR(resolved, 1, 7)) r ON m.month = r.month
WHERE m.month IS NOT NULL
ORDER BY m.month DESC`
  },

  // ================================================================
  //  11. SLA & THỜI GIAN XỬ LÝ ĐIỂM YẾU (Vuln SLA)
  // ================================================================

  'vul-05-sla-breach-critical': {
    category: 'Vuln - SLA',
    title: 'Điểm yếu Critical/High mở quá 30 ngày',
    description: 'Theo thông lệ ngân hàng, lỗ hổng Critical nên xử lý trong 7-15 ngày, High trong 30 ngày. Liệt kê các điểm yếu vi phạm SLA.',
    sql: `
WITH security_issues AS (
  SELECT * FROM issues
  WHERE LOWER(summary) LIKE '%vulnerab%' OR LOWER(summary) LIKE '%security%'
     OR LOWER(summary) LIKE '%bảo mật%' OR LOWER(summary) LIKE '%bao mat%'
     OR LOWER(summary) LIKE '%lỗ hổng%' OR LOWER(summary) LIKE '%điểm yếu%'
     OR LOWER(summary) LIKE '%cve-%' OR LOWER(summary) LIKE '%patch%'
     OR LOWER(summary) LIKE '%pentest%' OR LOWER(summary) LIKE '%hotfix%'
     OR LOWER(labels) LIKE '%security%' OR LOWER(labels) LIKE '%vulnerability%'
     OR LOWER(issue_type_name) LIKE '%security%' OR LOWER(issue_type_name) LIKE '%vulnerability%'
)
SELECT
  key, project_key, summary,
  priority_name, status_name,
  assignee_name,
  created, due_date,
  CAST(julianday('now') - julianday(created) AS INTEGER) as age_days,
  CASE
    WHEN LOWER(priority_name) IN ('blocker','critical','highest') AND CAST(julianday('now') - julianday(created) AS INTEGER) > 15 THEN 'CRITICAL SLA BREACH (>15d)'
    WHEN LOWER(priority_name) = 'high' AND CAST(julianday('now') - julianday(created) AS INTEGER) > 30 THEN 'HIGH SLA BREACH (>30d)'
    WHEN LOWER(priority_name) = 'medium' AND CAST(julianday('now') - julianday(created) AS INTEGER) > 90 THEN 'MEDIUM SLA BREACH (>90d)'
    ELSE 'Within SLA'
  END as sla_status
FROM security_issues
WHERE status_category != 'Done'
  AND LOWER(priority_name) IN ('blocker','critical','highest','high','medium')
  AND (
    (LOWER(priority_name) IN ('blocker','critical','highest') AND CAST(julianday('now') - julianday(created) AS INTEGER) > 15)
    OR (LOWER(priority_name) = 'high' AND CAST(julianday('now') - julianday(created) AS INTEGER) > 30)
    OR (LOWER(priority_name) = 'medium' AND CAST(julianday('now') - julianday(created) AS INTEGER) > 90)
  )
ORDER BY
  CASE LOWER(priority_name) WHEN 'blocker' THEN 1 WHEN 'critical' THEN 2 WHEN 'highest' THEN 3 WHEN 'high' THEN 4 WHEN 'medium' THEN 5 END,
  age_days DESC`
  },

  'vul-06-resolution-time-analysis': {
    category: 'Vuln - SLA',
    title: 'Phân tích thời gian xử lý điểm yếu đã đóng',
    description: 'Thống kê thời gian xử lý (từ tạo đến resolved) theo priority. Đánh giá có đáp ứng SLA không.',
    sql: `
WITH security_issues AS (
  SELECT * FROM issues
  WHERE (LOWER(summary) LIKE '%vulnerab%' OR LOWER(summary) LIKE '%security%'
     OR LOWER(summary) LIKE '%bảo mật%' OR LOWER(summary) LIKE '%lỗ hổng%'
     OR LOWER(summary) LIKE '%điểm yếu%' OR LOWER(summary) LIKE '%cve-%'
     OR LOWER(summary) LIKE '%patch%' OR LOWER(summary) LIKE '%pentest%'
     OR LOWER(labels) LIKE '%security%' OR LOWER(labels) LIKE '%vulnerability%'
     OR LOWER(issue_type_name) LIKE '%security%' OR LOWER(issue_type_name) LIKE '%vulnerability%')
    AND resolved IS NOT NULL
)
SELECT
  priority_name,
  COUNT(*) as total_resolved,
  ROUND(MIN(julianday(resolved) - julianday(created)), 0) as min_days,
  ROUND(AVG(julianday(resolved) - julianday(created)), 1) as avg_days,
  ROUND(MAX(julianday(resolved) - julianday(created)), 0) as max_days,
  SUM(CASE WHEN julianday(resolved) - julianday(created) <= 7 THEN 1 ELSE 0 END) as within_7d,
  SUM(CASE WHEN julianday(resolved) - julianday(created) <= 30 THEN 1 ELSE 0 END) as within_30d,
  SUM(CASE WHEN julianday(resolved) - julianday(created) <= 90 THEN 1 ELSE 0 END) as within_90d,
  SUM(CASE WHEN julianday(resolved) - julianday(created) > 90 THEN 1 ELSE 0 END) as over_90d
FROM security_issues
GROUP BY priority_name
ORDER BY
  CASE LOWER(priority_name) WHEN 'blocker' THEN 1 WHEN 'critical' THEN 2 WHEN 'highest' THEN 3 WHEN 'high' THEN 4 WHEN 'medium' THEN 5 WHEN 'low' THEN 6 ELSE 7 END`
  },

  'vul-07-oldest-open-vulns': {
    category: 'Vuln - SLA',
    title: 'Top 50 điểm yếu mở lâu nhất',
    description: 'Điểm yếu tồn đọng lâu nhất. Rủi ro cao nếu là lỗ hổng đã biết nhưng chưa xử lý.',
    sql: `
WITH security_issues AS (
  SELECT * FROM issues
  WHERE LOWER(summary) LIKE '%vulnerab%' OR LOWER(summary) LIKE '%security%'
     OR LOWER(summary) LIKE '%bảo mật%' OR LOWER(summary) LIKE '%bao mat%'
     OR LOWER(summary) LIKE '%lỗ hổng%' OR LOWER(summary) LIKE '%điểm yếu%'
     OR LOWER(summary) LIKE '%cve-%' OR LOWER(summary) LIKE '%patch%'
     OR LOWER(summary) LIKE '%pentest%' OR LOWER(summary) LIKE '%hotfix%'
     OR LOWER(labels) LIKE '%security%' OR LOWER(labels) LIKE '%vulnerability%'
     OR LOWER(issue_type_name) LIKE '%security%' OR LOWER(issue_type_name) LIKE '%vulnerability%'
)
SELECT
  key, project_key, summary,
  priority_name, status_name,
  assignee_name, reporter_name,
  created, updated, due_date,
  CAST(julianday('now') - julianday(created) AS INTEGER) as age_days,
  CAST(julianday('now') - julianday(updated) AS INTEGER) as days_since_update
FROM security_issues
WHERE status_category != 'Done'
ORDER BY age_days DESC
LIMIT 50`
  },

  'vul-08-overdue-vulns': {
    category: 'Vuln - SLA',
    title: 'Điểm yếu quá hạn (due date đã qua)',
    description: 'Issue ATTT có due date đã qua nhưng chưa đóng. Vi phạm cam kết xử lý.',
    sql: `
WITH security_issues AS (
  SELECT * FROM issues
  WHERE LOWER(summary) LIKE '%vulnerab%' OR LOWER(summary) LIKE '%security%'
     OR LOWER(summary) LIKE '%bảo mật%' OR LOWER(summary) LIKE '%lỗ hổng%'
     OR LOWER(summary) LIKE '%điểm yếu%' OR LOWER(summary) LIKE '%cve-%'
     OR LOWER(summary) LIKE '%patch%' OR LOWER(summary) LIKE '%pentest%'
     OR LOWER(labels) LIKE '%security%' OR LOWER(labels) LIKE '%vulnerability%'
     OR LOWER(issue_type_name) LIKE '%security%' OR LOWER(issue_type_name) LIKE '%vulnerability%'
)
SELECT
  key, project_key, summary,
  priority_name, status_name,
  assignee_name,
  due_date,
  CAST(julianday('now') - julianday(due_date) AS INTEGER) as days_overdue,
  created
FROM security_issues
WHERE due_date IS NOT NULL
  AND due_date < date('now')
  AND status_category != 'Done'
ORDER BY days_overdue DESC`
  },

  // ================================================================
  //  12. VÒNG ĐỜI ĐIỂM YẾU (Vulnerability Lifecycle)
  // ================================================================

  'vul-09-no-assignee': {
    category: 'Vuln - Lifecycle',
    title: 'Điểm yếu chưa có người xử lý (no assignee)',
    description: 'Issue ATTT open nhưng chưa được giao cho ai. Rủi ro bị bỏ sót.',
    sql: `
WITH security_issues AS (
  SELECT * FROM issues
  WHERE LOWER(summary) LIKE '%vulnerab%' OR LOWER(summary) LIKE '%security%'
     OR LOWER(summary) LIKE '%bảo mật%' OR LOWER(summary) LIKE '%lỗ hổng%'
     OR LOWER(summary) LIKE '%điểm yếu%' OR LOWER(summary) LIKE '%cve-%'
     OR LOWER(summary) LIKE '%patch%' OR LOWER(summary) LIKE '%pentest%'
     OR LOWER(labels) LIKE '%security%' OR LOWER(labels) LIKE '%vulnerability%'
     OR LOWER(issue_type_name) LIKE '%security%' OR LOWER(issue_type_name) LIKE '%vulnerability%'
)
SELECT
  key, project_key, summary,
  priority_name, status_name, reporter_name,
  created,
  CAST(julianday('now') - julianday(created) AS INTEGER) as age_days
FROM security_issues
WHERE assignee_key IS NULL
  AND status_category != 'Done'
ORDER BY
  CASE LOWER(priority_name) WHEN 'blocker' THEN 1 WHEN 'critical' THEN 2 WHEN 'highest' THEN 3 WHEN 'high' THEN 4 ELSE 5 END,
  created ASC`
  },

  'vul-10-no-due-date': {
    category: 'Vuln - Lifecycle',
    title: 'Điểm yếu open không có Due Date',
    description: 'Issue ATTT open nhưng không có deadline. Không thể theo dõi SLA và cam kết xử lý.',
    sql: `
WITH security_issues AS (
  SELECT * FROM issues
  WHERE LOWER(summary) LIKE '%vulnerab%' OR LOWER(summary) LIKE '%security%'
     OR LOWER(summary) LIKE '%bảo mật%' OR LOWER(summary) LIKE '%lỗ hổng%'
     OR LOWER(summary) LIKE '%điểm yếu%' OR LOWER(summary) LIKE '%cve-%'
     OR LOWER(summary) LIKE '%patch%' OR LOWER(summary) LIKE '%pentest%'
     OR LOWER(labels) LIKE '%security%' OR LOWER(labels) LIKE '%vulnerability%'
     OR LOWER(issue_type_name) LIKE '%security%' OR LOWER(issue_type_name) LIKE '%vulnerability%'
)
SELECT
  key, project_key, summary,
  priority_name, status_name,
  assignee_name,
  created,
  CAST(julianday('now') - julianday(created) AS INTEGER) as age_days
FROM security_issues
WHERE due_date IS NULL
  AND status_category != 'Done'
ORDER BY
  CASE LOWER(priority_name) WHEN 'blocker' THEN 1 WHEN 'critical' THEN 2 WHEN 'highest' THEN 3 WHEN 'high' THEN 4 ELSE 5 END,
  age_days DESC`
  },

  'vul-11-reopened-vulns': {
    category: 'Vuln - Lifecycle',
    title: 'Điểm yếu bị Reopen',
    description: 'Issue ATTT từng Done/Closed nhưng bị reopen. Cho thấy xử lý chưa triệt để hoặc lỗ hổng tái phát.',
    sql: `
WITH security_issues AS (
  SELECT key FROM issues
  WHERE LOWER(summary) LIKE '%vulnerab%' OR LOWER(summary) LIKE '%security%'
     OR LOWER(summary) LIKE '%bảo mật%' OR LOWER(summary) LIKE '%lỗ hổng%'
     OR LOWER(summary) LIKE '%điểm yếu%' OR LOWER(summary) LIKE '%cve-%'
     OR LOWER(summary) LIKE '%patch%' OR LOWER(summary) LIKE '%pentest%'
     OR LOWER(labels) LIKE '%security%' OR LOWER(labels) LIKE '%vulnerability%'
     OR LOWER(issue_type_name) LIKE '%security%' OR LOWER(issue_type_name) LIKE '%vulnerability%'
)
SELECT
  ci.issue_key,
  i.project_key, i.summary, i.priority_name, i.status_name, i.assignee_name,
  COUNT(*) as reopen_count,
  GROUP_CONCAT(c.author_name || ' (' || SUBSTR(c.created, 1, 10) || ')') as reopen_events
FROM changelog_items ci
JOIN changelogs c ON ci.changelog_id = c.id
JOIN issues i ON ci.issue_key = i.key
WHERE ci.field = 'status'
  AND ci.issue_key IN (SELECT key FROM security_issues)
  AND LOWER(ci.from_string) IN ('done', 'closed', 'resolved')
  AND LOWER(ci.to_string) NOT IN ('done', 'closed', 'resolved')
GROUP BY ci.issue_key
ORDER BY reopen_count DESC`
  },

  'vul-12-stale-vulns': {
    category: 'Vuln - Lifecycle',
    title: 'Điểm yếu "chết" (open, không cập nhật > 60 ngày)',
    description: 'Issue ATTT open nhưng không ai cập nhật gì > 60 ngày. Có thể bị quên hoặc bỏ sót.',
    sql: `
WITH security_issues AS (
  SELECT * FROM issues
  WHERE LOWER(summary) LIKE '%vulnerab%' OR LOWER(summary) LIKE '%security%'
     OR LOWER(summary) LIKE '%bảo mật%' OR LOWER(summary) LIKE '%lỗ hổng%'
     OR LOWER(summary) LIKE '%điểm yếu%' OR LOWER(summary) LIKE '%cve-%'
     OR LOWER(summary) LIKE '%patch%' OR LOWER(summary) LIKE '%pentest%'
     OR LOWER(labels) LIKE '%security%' OR LOWER(labels) LIKE '%vulnerability%'
     OR LOWER(issue_type_name) LIKE '%security%' OR LOWER(issue_type_name) LIKE '%vulnerability%'
)
SELECT
  key, project_key, summary,
  priority_name, status_name,
  assignee_name,
  created, updated,
  CAST(julianday('now') - julianday(created) AS INTEGER) as age_days,
  CAST(julianday('now') - julianday(updated) AS INTEGER) as days_since_update
FROM security_issues
WHERE status_category != 'Done'
  AND CAST(julianday('now') - julianday(updated) AS INTEGER) > 60
ORDER BY days_since_update DESC`
  },

  'vul-13-vuln-status-flow': {
    category: 'Vuln - Lifecycle',
    title: 'Lịch sử chuyển trạng thái các issue ATTT',
    description: 'Toàn bộ lịch sử thay đổi status của issue ATTT. Đánh giá tuân thủ quy trình.',
    sql: `
WITH security_issues AS (
  SELECT key FROM issues
  WHERE LOWER(summary) LIKE '%vulnerab%' OR LOWER(summary) LIKE '%security%'
     OR LOWER(summary) LIKE '%bảo mật%' OR LOWER(summary) LIKE '%lỗ hổng%'
     OR LOWER(summary) LIKE '%điểm yếu%' OR LOWER(summary) LIKE '%cve-%'
     OR LOWER(summary) LIKE '%patch%' OR LOWER(summary) LIKE '%pentest%'
     OR LOWER(labels) LIKE '%security%' OR LOWER(labels) LIKE '%vulnerability%'
     OR LOWER(issue_type_name) LIKE '%security%' OR LOWER(issue_type_name) LIKE '%vulnerability%'
)
SELECT
  ci.issue_key,
  i.summary,
  ci.from_string as from_status,
  ci.to_string as to_status,
  c.author_name as changed_by,
  c.created as changed_at
FROM changelog_items ci
JOIN changelogs c ON ci.changelog_id = c.id
JOIN issues i ON ci.issue_key = i.key
WHERE ci.field = 'status'
  AND ci.issue_key IN (SELECT key FROM security_issues)
ORDER BY ci.issue_key, c.created`
  },

  // ================================================================
  //  13. PATCH MANAGEMENT
  // ================================================================

  'patch-01-all-patch-issues': {
    category: 'Patch Management',
    title: 'Tất cả issues liên quan Patch / Hotfix / Update',
    description: 'Liệt kê tất cả issue liên quan đến vá lỗi, cập nhật bảo mật.',
    sql: `
SELECT
  key, project_key, issue_type_name, summary,
  priority_name, status_name, status_category,
  assignee_name, reporter_name,
  created, updated, resolved, due_date,
  CAST(julianday('now') - julianday(created) AS INTEGER) as age_days,
  CASE WHEN resolved IS NOT NULL THEN CAST(julianday(resolved) - julianday(created) AS INTEGER) END as resolution_days
FROM issues
WHERE LOWER(summary) LIKE '%patch%'
   OR LOWER(summary) LIKE '%hotfix%'
   OR LOWER(summary) LIKE '%vá lỗi%'
   OR LOWER(summary) LIKE '%va loi%'
   OR LOWER(summary) LIKE '%cập nhật bảo mật%'
   OR LOWER(summary) LIKE '%cap nhat bao mat%'
   OR LOWER(summary) LIKE '%security update%'
   OR LOWER(summary) LIKE '%firmware update%'
   OR LOWER(summary) LIKE '%upgrade%'
   OR LOWER(summary) LIKE '%nâng cấp%'
   OR LOWER(labels) LIKE '%patch%'
   OR LOWER(labels) LIKE '%hotfix%'
ORDER BY created DESC`
  },

  'patch-02-open-patches': {
    category: 'Patch Management',
    title: 'Patches chưa hoàn thành',
    description: 'Patches/hotfix vẫn open. Đánh giá tồn đọng vá lỗi.',
    sql: `
SELECT
  key, project_key, summary,
  priority_name, status_name,
  assignee_name,
  created, due_date,
  CAST(julianday('now') - julianday(created) AS INTEGER) as age_days,
  CASE WHEN due_date IS NOT NULL AND due_date < date('now') THEN 'OVERDUE' ELSE 'On track' END as deadline_status
FROM issues
WHERE (LOWER(summary) LIKE '%patch%' OR LOWER(summary) LIKE '%hotfix%'
    OR LOWER(summary) LIKE '%security update%' OR LOWER(summary) LIKE '%vá lỗi%'
    OR LOWER(labels) LIKE '%patch%' OR LOWER(labels) LIKE '%hotfix%')
  AND status_category != 'Done'
ORDER BY
  CASE LOWER(priority_name) WHEN 'blocker' THEN 1 WHEN 'critical' THEN 2 WHEN 'highest' THEN 3 WHEN 'high' THEN 4 ELSE 5 END,
  age_days DESC`
  },

  // ================================================================
  //  14. PENTEST & VA SCAN
  // ================================================================

  'pt-01-pentest-issues': {
    category: 'Pentest & VA',
    title: 'Issues từ Pentest / Đánh giá ATTT',
    description: 'Issue phát sinh từ pentest, đánh giá bảo mật, VA scan.',
    sql: `
SELECT
  key, project_key, issue_type_name, summary,
  priority_name, status_name, status_category,
  assignee_name, reporter_name,
  created, resolved, due_date,
  CAST(julianday('now') - julianday(created) AS INTEGER) as age_days,
  CASE WHEN resolved IS NOT NULL THEN CAST(julianday(resolved) - julianday(created) AS INTEGER) END as resolution_days,
  labels
FROM issues
WHERE LOWER(summary) LIKE '%pentest%'
   OR LOWER(summary) LIKE '%pen test%'
   OR LOWER(summary) LIKE '%penetration%'
   OR LOWER(summary) LIKE '%va scan%'
   OR LOWER(summary) LIKE '%vulnerability assessment%'
   OR LOWER(summary) LIKE '%đánh giá%attt%'
   OR LOWER(summary) LIKE '%đánh giá%bảo mật%'
   OR LOWER(summary) LIKE '%danh gia%bao mat%'
   OR LOWER(summary) LIKE '%security assessment%'
   OR LOWER(summary) LIKE '%security review%'
   OR LOWER(summary) LIKE '%code review%'
   OR LOWER(summary) LIKE '%rà soát%'
   OR LOWER(summary) LIKE '%ra soat%'
   OR LOWER(summary) LIKE '%nessus%'
   OR LOWER(summary) LIKE '%qualys%'
   OR LOWER(summary) LIKE '%burp%'
   OR LOWER(summary) LIKE '%acunetix%'
   OR LOWER(summary) LIKE '%owasp%'
   OR LOWER(labels) LIKE '%pentest%'
   OR LOWER(labels) LIKE '%va-scan%'
ORDER BY created DESC`
  },

  'pt-02-pentest-open-findings': {
    category: 'Pentest & VA',
    title: 'Findings từ Pentest/VA chưa xử lý xong',
    description: 'Phát hiện từ pentest/VA vẫn open. Cần đánh giá tiến độ khắc phục.',
    sql: `
SELECT
  key, project_key, summary,
  priority_name, status_name,
  assignee_name,
  created, due_date,
  CAST(julianday('now') - julianday(created) AS INTEGER) as age_days,
  CASE
    WHEN due_date IS NOT NULL AND due_date < date('now') THEN 'OVERDUE'
    WHEN due_date IS NOT NULL THEN 'Has deadline'
    ELSE 'NO DEADLINE'
  END as deadline_status
FROM issues
WHERE (LOWER(summary) LIKE '%pentest%' OR LOWER(summary) LIKE '%penetration%'
    OR LOWER(summary) LIKE '%va scan%' OR LOWER(summary) LIKE '%vulnerability assessment%'
    OR LOWER(summary) LIKE '%đánh giá%bảo mật%' OR LOWER(summary) LIKE '%security assessment%'
    OR LOWER(summary) LIKE '%nessus%' OR LOWER(summary) LIKE '%qualys%'
    OR LOWER(labels) LIKE '%pentest%' OR LOWER(labels) LIKE '%va-scan%')
  AND status_category != 'Done'
ORDER BY
  CASE LOWER(priority_name) WHEN 'blocker' THEN 1 WHEN 'critical' THEN 2 WHEN 'highest' THEN 3 WHEN 'high' THEN 4 ELSE 5 END,
  age_days DESC`
  },

  // ================================================================
  //  15. CVE & LỖ HỔNG CỤ THỂ
  // ================================================================

  'cve-01-cve-tracking': {
    category: 'CVE Tracking',
    title: 'Issues có mã CVE',
    description: 'Issue đề cập đến CVE cụ thể. Đánh giá việc theo dõi lỗ hổng công bố.',
    sql: `
SELECT
  key, project_key, summary,
  priority_name, status_name, status_category,
  assignee_name,
  created, resolved, due_date,
  CAST(julianday('now') - julianday(created) AS INTEGER) as age_days,
  CASE WHEN resolved IS NOT NULL THEN CAST(julianday(resolved) - julianday(created) AS INTEGER) END as resolution_days
FROM issues
WHERE LOWER(summary) LIKE '%cve-%'
   OR LOWER(description) LIKE '%cve-%'
ORDER BY created DESC`
  },

  'cve-02-cve-open': {
    category: 'CVE Tracking',
    title: 'CVE chưa xử lý xong',
    description: 'Lỗ hổng CVE đã biết nhưng chưa được khắc phục.',
    sql: `
SELECT
  key, project_key, summary,
  priority_name, status_name,
  assignee_name,
  created, due_date,
  CAST(julianday('now') - julianday(created) AS INTEGER) as age_days
FROM issues
WHERE (LOWER(summary) LIKE '%cve-%' OR LOWER(description) LIKE '%cve-%')
  AND status_category != 'Done'
ORDER BY
  CASE LOWER(priority_name) WHEN 'blocker' THEN 1 WHEN 'critical' THEN 2 WHEN 'highest' THEN 3 WHEN 'high' THEN 4 ELSE 5 END,
  age_days DESC`
  },

  // ================================================================
  //  16. SỰ CỐ ATTT (Security Incidents)
  // ================================================================

  'inc-01-security-incidents': {
    category: 'Security Incidents',
    title: 'Issues liên quan sự cố ATTT',
    description: 'Tất cả issue liên quan đến sự cố bảo mật, incident, breach, tấn công.',
    sql: `
SELECT
  key, project_key, issue_type_name, summary,
  priority_name, status_name, status_category,
  assignee_name, reporter_name,
  created, resolved,
  CASE WHEN resolved IS NOT NULL THEN CAST(julianday(resolved) - julianday(created) AS INTEGER) END as resolution_days,
  labels
FROM issues
WHERE LOWER(summary) LIKE '%incident%'
   OR LOWER(summary) LIKE '%sự cố%'
   OR LOWER(summary) LIKE '%su co%'
   OR LOWER(summary) LIKE '%breach%'
   OR LOWER(summary) LIKE '%tấn công%'
   OR LOWER(summary) LIKE '%tan cong%'
   OR LOWER(summary) LIKE '%attack%'
   OR LOWER(summary) LIKE '%intrusion%'
   OR LOWER(summary) LIKE '%xâm nhập%'
   OR LOWER(summary) LIKE '%malware%'
   OR LOWER(summary) LIKE '%ransomware%'
   OR LOWER(summary) LIKE '%phishing%'
   OR LOWER(summary) LIKE '%ddos%'
   OR LOWER(summary) LIKE '%data leak%'
   OR LOWER(summary) LIKE '%rò rỉ%'
   OR LOWER(summary) LIKE '%ro ri%'
   OR LOWER(issue_type_name) LIKE '%incident%'
   OR LOWER(labels) LIKE '%incident%'
ORDER BY created DESC`
  },

  'inc-02-incident-response-time': {
    category: 'Security Incidents',
    title: 'Thời gian phản hồi sự cố ATTT',
    description: 'Phân tích thời gian từ tạo đến lần cập nhật đầu tiên và đến khi đóng.',
    sql: `
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
ORDER BY ii.created DESC`
  },

  // ================================================================
  //  17. NGƯỜI XỬ LÝ ĐIỂM YẾU (Who handles vulns)
  // ================================================================

  'who-01-vuln-assignee-stats': {
    category: 'Vuln - Responsibility',
    title: 'Thống kê người xử lý điểm yếu ATTT',
    description: 'Ai xử lý bao nhiêu issue ATTT, tỷ lệ hoàn thành, thời gian trung bình.',
    sql: `
WITH security_issues AS (
  SELECT * FROM issues
  WHERE LOWER(summary) LIKE '%vulnerab%' OR LOWER(summary) LIKE '%security%'
     OR LOWER(summary) LIKE '%bảo mật%' OR LOWER(summary) LIKE '%lỗ hổng%'
     OR LOWER(summary) LIKE '%điểm yếu%' OR LOWER(summary) LIKE '%cve-%'
     OR LOWER(summary) LIKE '%patch%' OR LOWER(summary) LIKE '%pentest%'
     OR LOWER(summary) LIKE '%incident%' OR LOWER(summary) LIKE '%sự cố%'
     OR LOWER(labels) LIKE '%security%' OR LOWER(labels) LIKE '%vulnerability%'
     OR LOWER(issue_type_name) LIKE '%security%' OR LOWER(issue_type_name) LIKE '%vulnerability%'
)
SELECT
  assignee_name,
  COUNT(*) as total_assigned,
  SUM(CASE WHEN status_category = 'Done' THEN 1 ELSE 0 END) as completed,
  SUM(CASE WHEN status_category != 'Done' THEN 1 ELSE 0 END) as open,
  ROUND(100.0 * SUM(CASE WHEN status_category = 'Done' THEN 1 ELSE 0 END) / COUNT(*), 1) as completion_pct,
  ROUND(AVG(CASE WHEN resolved IS NOT NULL THEN julianday(resolved) - julianday(created) END), 1) as avg_resolution_days,
  SUM(CASE WHEN LOWER(priority_name) IN ('blocker','critical','highest','high') AND status_category != 'Done' THEN 1 ELSE 0 END) as high_open
FROM security_issues
WHERE assignee_name IS NOT NULL
GROUP BY assignee_key
ORDER BY total_assigned DESC`
  },

  'who-02-vuln-reporter-stats': {
    category: 'Vuln - Responsibility',
    title: 'Nguồn phát hiện điểm yếu (Reporter)',
    description: 'Ai/đội nào report nhiều issue ATTT nhất. Đánh giá nguồn phát hiện lỗ hổng.',
    sql: `
WITH security_issues AS (
  SELECT * FROM issues
  WHERE LOWER(summary) LIKE '%vulnerab%' OR LOWER(summary) LIKE '%security%'
     OR LOWER(summary) LIKE '%bảo mật%' OR LOWER(summary) LIKE '%lỗ hổng%'
     OR LOWER(summary) LIKE '%điểm yếu%' OR LOWER(summary) LIKE '%cve-%'
     OR LOWER(summary) LIKE '%patch%' OR LOWER(summary) LIKE '%pentest%'
     OR LOWER(summary) LIKE '%incident%'
     OR LOWER(labels) LIKE '%security%' OR LOWER(labels) LIKE '%vulnerability%'
     OR LOWER(issue_type_name) LIKE '%security%' OR LOWER(issue_type_name) LIKE '%vulnerability%'
)
SELECT
  reporter_name,
  COUNT(*) as total_reported,
  SUM(CASE WHEN status_category = 'Done' THEN 1 ELSE 0 END) as resolved,
  SUM(CASE WHEN status_category != 'Done' THEN 1 ELSE 0 END) as still_open,
  COUNT(DISTINCT project_key) as projects,
  MIN(SUBSTR(created, 1, 10)) as first_report,
  MAX(SUBSTR(created, 1, 10)) as last_report
FROM security_issues
WHERE reporter_name IS NOT NULL
GROUP BY reporter_key
ORDER BY total_reported DESC`
  },

  // ================================================================
  //  18. COMPLIANCE & CHÍNH SÁCH
  // ================================================================

  'comp-01-compliance-issues': {
    category: 'Compliance',
    title: 'Issues liên quan tuân thủ / compliance / chính sách',
    description: 'Issue liên quan đến compliance, tuân thủ quy định, chính sách, tiêu chuẩn (PCI-DSS, ISO 27001, NHNN...).',
    sql: `
SELECT
  key, project_key, issue_type_name, summary,
  priority_name, status_name, status_category,
  assignee_name, reporter_name,
  created, resolved, due_date,
  CAST(julianday('now') - julianday(created) AS INTEGER) as age_days
FROM issues
WHERE LOWER(summary) LIKE '%compliance%'
   OR LOWER(summary) LIKE '%tuân thủ%'
   OR LOWER(summary) LIKE '%tuan thu%'
   OR LOWER(summary) LIKE '%chính sách%'
   OR LOWER(summary) LIKE '%chinh sach%'
   OR LOWER(summary) LIKE '%policy%'
   OR LOWER(summary) LIKE '%quy định%'
   OR LOWER(summary) LIKE '%quy dinh%'
   OR LOWER(summary) LIKE '%regulation%'
   OR LOWER(summary) LIKE '%pci%'
   OR LOWER(summary) LIKE '%iso 27%'
   OR LOWER(summary) LIKE '%iso27%'
   OR LOWER(summary) LIKE '%nhnn%'
   OR LOWER(summary) LIKE '%ngân hàng nhà nước%'
   OR LOWER(summary) LIKE '%ngan hang nha nuoc%'
   OR LOWER(summary) LIKE '%thông tư%'
   OR LOWER(summary) LIKE '%thong tu%'
   OR LOWER(summary) LIKE '%circular%'
   OR LOWER(summary) LIKE '%sox%'
   OR LOWER(summary) LIKE '%gdpr%'
   OR LOWER(summary) LIKE '%audit finding%'
   OR LOWER(summary) LIKE '%kiểm toán%'
   OR LOWER(summary) LIKE '%kiem toan%'
   OR LOWER(labels) LIKE '%compliance%'
   OR LOWER(labels) LIKE '%audit%'
   OR LOWER(labels) LIKE '%policy%'
ORDER BY created DESC`
  },

  // ================================================================
  //  19. BÁO CÁO TỔNG HỢP CHO KIỂM TOÁN
  // ================================================================

  'vrpt-01-executive-summary': {
    category: 'Vuln - Report',
    title: 'TỔNG HỢP: Điểm yếu ATTT - Executive Summary',
    description: 'Bảng tổng hợp cho báo cáo kiểm toán: tổng số, phân loại, SLA, tồn đọng.',
    sql: `
WITH security_issues AS (
  SELECT * FROM issues
  WHERE LOWER(summary) LIKE '%vulnerab%' OR LOWER(summary) LIKE '%security%'
     OR LOWER(summary) LIKE '%bảo mật%' OR LOWER(summary) LIKE '%bao mat%'
     OR LOWER(summary) LIKE '%lỗ hổng%' OR LOWER(summary) LIKE '%điểm yếu%'
     OR LOWER(summary) LIKE '%cve-%' OR LOWER(summary) LIKE '%patch%'
     OR LOWER(summary) LIKE '%pentest%' OR LOWER(summary) LIKE '%hotfix%'
     OR LOWER(summary) LIKE '%incident%' OR LOWER(summary) LIKE '%sự cố%'
     OR LOWER(labels) LIKE '%security%' OR LOWER(labels) LIKE '%vulnerability%'
     OR LOWER(issue_type_name) LIKE '%security%' OR LOWER(issue_type_name) LIKE '%vulnerability%'
)
SELECT 'Total security issues' as metric, COUNT(*) as value FROM security_issues
UNION ALL SELECT 'Currently Open', COUNT(*) FROM security_issues WHERE status_category != 'Done'
UNION ALL SELECT 'Closed/Resolved', COUNT(*) FROM security_issues WHERE status_category = 'Done'
UNION ALL SELECT 'Open - Critical/High', COUNT(*) FROM security_issues WHERE status_category != 'Done' AND LOWER(priority_name) IN ('blocker','critical','highest','high')
UNION ALL SELECT 'Open - No Assignee', COUNT(*) FROM security_issues WHERE status_category != 'Done' AND assignee_key IS NULL
UNION ALL SELECT 'Open - No Due Date', COUNT(*) FROM security_issues WHERE status_category != 'Done' AND due_date IS NULL
UNION ALL SELECT 'Open - Overdue', COUNT(*) FROM security_issues WHERE status_category != 'Done' AND due_date IS NOT NULL AND due_date < date('now')
UNION ALL SELECT 'Open > 30 days', COUNT(*) FROM security_issues WHERE status_category != 'Done' AND julianday('now') - julianday(created) > 30
UNION ALL SELECT 'Open > 90 days', COUNT(*) FROM security_issues WHERE status_category != 'Done' AND julianday('now') - julianday(created) > 90
UNION ALL SELECT 'Open > 180 days', COUNT(*) FROM security_issues WHERE status_category != 'Done' AND julianday('now') - julianday(created) > 180
UNION ALL SELECT 'Open > 365 days', COUNT(*) FROM security_issues WHERE status_category != 'Done' AND julianday('now') - julianday(created) > 365
UNION ALL SELECT 'Avg Resolution Days (closed)', ROUND(AVG(julianday(resolved) - julianday(created)), 1) FROM security_issues WHERE resolved IS NOT NULL
UNION ALL SELECT 'Reopened issues', COUNT(DISTINCT ci.issue_key) FROM changelog_items ci JOIN changelogs c ON ci.changelog_id = c.id WHERE ci.field = 'status' AND LOWER(ci.from_string) IN ('done','closed','resolved') AND ci.issue_key IN (SELECT key FROM security_issues)
UNION ALL SELECT 'Unique projects affected', COUNT(DISTINCT project_key) FROM security_issues
UNION ALL SELECT 'Unique assignees', COUNT(DISTINCT assignee_key) FROM security_issues WHERE assignee_key IS NOT NULL
UNION ALL SELECT 'Issues with CVE reference', COUNT(*) FROM security_issues WHERE LOWER(summary) LIKE '%cve-%' OR LOWER(description) LIKE '%cve-%'`
  },

  'vrpt-02-aging-report': {
    category: 'Vuln - Report',
    title: 'TỔNG HỢP: Phân tích Aging theo Priority',
    description: 'Bảng aging (tuổi tồn đọng) theo priority. Phục vụ báo cáo kiểm toán.',
    sql: `
WITH security_issues AS (
  SELECT * FROM issues
  WHERE (LOWER(summary) LIKE '%vulnerab%' OR LOWER(summary) LIKE '%security%'
     OR LOWER(summary) LIKE '%bảo mật%' OR LOWER(summary) LIKE '%lỗ hổng%'
     OR LOWER(summary) LIKE '%điểm yếu%' OR LOWER(summary) LIKE '%cve-%'
     OR LOWER(summary) LIKE '%patch%' OR LOWER(summary) LIKE '%pentest%'
     OR LOWER(labels) LIKE '%security%' OR LOWER(labels) LIKE '%vulnerability%'
     OR LOWER(issue_type_name) LIKE '%security%' OR LOWER(issue_type_name) LIKE '%vulnerability%')
    AND status_category != 'Done'
)
SELECT
  priority_name,
  COUNT(*) as total_open,
  SUM(CASE WHEN julianday('now') - julianday(created) <= 7 THEN 1 ELSE 0 END) as "0-7d",
  SUM(CASE WHEN julianday('now') - julianday(created) > 7 AND julianday('now') - julianday(created) <= 30 THEN 1 ELSE 0 END) as "8-30d",
  SUM(CASE WHEN julianday('now') - julianday(created) > 30 AND julianday('now') - julianday(created) <= 90 THEN 1 ELSE 0 END) as "31-90d",
  SUM(CASE WHEN julianday('now') - julianday(created) > 90 AND julianday('now') - julianday(created) <= 180 THEN 1 ELSE 0 END) as "91-180d",
  SUM(CASE WHEN julianday('now') - julianday(created) > 180 AND julianday('now') - julianday(created) <= 365 THEN 1 ELSE 0 END) as "181-365d",
  SUM(CASE WHEN julianday('now') - julianday(created) > 365 THEN 1 ELSE 0 END) as ">365d"
FROM security_issues
GROUP BY priority_name
ORDER BY
  CASE LOWER(priority_name) WHEN 'blocker' THEN 1 WHEN 'critical' THEN 2 WHEN 'highest' THEN 3 WHEN 'high' THEN 4 WHEN 'medium' THEN 5 WHEN 'low' THEN 6 ELSE 7 END`
  },

  'vrpt-03-all-open-detail': {
    category: 'Vuln - Report',
    title: 'TỔNG HỢP: Chi tiết tất cả điểm yếu đang mở',
    description: 'Danh sách đầy đủ tất cả issue ATTT đang open - dùng để attach vào báo cáo kiểm toán.',
    sql: `
WITH security_issues AS (
  SELECT * FROM issues
  WHERE LOWER(summary) LIKE '%vulnerab%' OR LOWER(summary) LIKE '%security%'
     OR LOWER(summary) LIKE '%bảo mật%' OR LOWER(summary) LIKE '%bao mat%'
     OR LOWER(summary) LIKE '%lỗ hổng%' OR LOWER(summary) LIKE '%điểm yếu%'
     OR LOWER(summary) LIKE '%cve-%' OR LOWER(summary) LIKE '%patch%'
     OR LOWER(summary) LIKE '%pentest%' OR LOWER(summary) LIKE '%hotfix%'
     OR LOWER(summary) LIKE '%incident%' OR LOWER(summary) LIKE '%sự cố%'
     OR LOWER(labels) LIKE '%security%' OR LOWER(labels) LIKE '%vulnerability%'
     OR LOWER(issue_type_name) LIKE '%security%' OR LOWER(issue_type_name) LIKE '%vulnerability%'
)
SELECT
  key as "Issue Key",
  project_key as "Project",
  issue_type_name as "Type",
  priority_name as "Priority",
  status_name as "Status",
  summary as "Summary",
  assignee_name as "Assignee",
  reporter_name as "Reporter",
  SUBSTR(created, 1, 10) as "Created",
  due_date as "Due Date",
  CAST(julianday('now') - julianday(created) AS INTEGER) as "Age (days)",
  CASE
    WHEN due_date IS NOT NULL AND due_date < date('now') THEN 'OVERDUE'
    WHEN due_date IS NULL THEN 'NO DEADLINE'
    ELSE 'On track'
  END as "Deadline Status",
  CASE
    WHEN assignee_key IS NULL THEN 'UNASSIGNED'
    ELSE 'Assigned'
  END as "Assignment Status",
  labels as "Labels",
  security_level as "Security Level"
FROM security_issues
WHERE status_category != 'Done'
ORDER BY
  CASE LOWER(priority_name) WHEN 'blocker' THEN 1 WHEN 'critical' THEN 2 WHEN 'highest' THEN 3 WHEN 'high' THEN 4 WHEN 'medium' THEN 5 WHEN 'low' THEN 6 ELSE 7 END,
  created ASC`
  },

  // ================================================================
  //  20. I.4 - RỦI RO CHƯA THỰC HIỆN PENTEST ỨNG DỤNG
  //      Kiểm tra bằng chứng pentest cho từng hệ thống cấp 2,3
  // ================================================================

  'i4-01-pentest-evidence-all': {
    category: 'I.4 - Pentest',
    title: '[I.4] Bằng chứng Pentest - Tổng hợp tất cả hệ thống',
    description: 'Tìm tất cả issue liên quan pentest/VA cho các hệ thống cấp 2,3 trong danh mục. Match theo tên hệ thống trong summary/description.',
    sql: `
WITH system_list(sys_name, sys_level) AS (VALUES
  ('TTBC',2),('SIMO',2),('Kho dữ liệu',2),('Báo cáo ngân hàng',2),('RWA',2),
  ('dealtracker',2),('Tellerportal',2),('Eswitch',2),('FlexCash',2),('SmartForm',2),
  ('RPA',2),('Voffice',2),('eOffice',2),('LOS',2),('CIC',2),('AML',2),
  ('CRM',2),('Lending',2),('Einvoice',2),('DevSecOps',2),('ERP',2),
  ('Notification',2),('OTP',2),('NAC',2),('SIEM',2),('QRadar',2),('SOAR',2),
  ('IDM',2),('PAM',2),('IVANTI',2),('ePIN',2),('SBV',2),
  ('Corebanking',3),('T24',3),('Mobile Banking',3),('Omni Retail',3),
  ('SWIFT',3),('Email',3),('Exchange',3),('AD',3),('DNS',3),
  ('Thẻ',3),('Smartvista',3),('3DSecure',3),('HSM',3),
  ('Call center',3),('Website',3),('F5',3),('WAF',3),
  ('Firewall',3),('DDOS',3),('Billing',3),('Citad',3),('ACH',3),
  ('Virtual Account',3),('ESB',3),('APIC',3),('Omni Corporate',3),
  ('Office 365',3),('Deposit Service',3)
),
pentest_issues AS (
  SELECT * FROM issues
  WHERE LOWER(summary) LIKE '%pentest%'
     OR LOWER(summary) LIKE '%pen test%'
     OR LOWER(summary) LIKE '%penetration%'
     OR LOWER(summary) LIKE '%va scan%'
     OR LOWER(summary) LIKE '%vulnerability assessment%'
     OR LOWER(summary) LIKE '%đánh giá%bảo mật%'
     OR LOWER(summary) LIKE '%danh gia%bao mat%'
     OR LOWER(summary) LIKE '%security assessment%'
     OR LOWER(summary) LIKE '%security review%'
     OR LOWER(summary) LIKE '%security test%'
     OR LOWER(summary) LIKE '%rà soát%attt%'
     OR LOWER(summary) LIKE '%ra soat%attt%'
     OR LOWER(summary) LIKE '%nessus%'
     OR LOWER(summary) LIKE '%qualys%'
     OR LOWER(summary) LIKE '%burp%'
     OR LOWER(summary) LIKE '%acunetix%'
     OR LOWER(labels) LIKE '%pentest%'
     OR LOWER(labels) LIKE '%va-scan%'
     OR LOWER(labels) LIKE '%security-test%'
)
SELECT
  sl.sys_name as "Hệ thống",
  sl.sys_level as "Cấp độ",
  COUNT(pi.key) as "Số issue pentest",
  COALESCE(GROUP_CONCAT(DISTINCT pi.key), 'KHÔNG TÌM THẤY') as "Issue keys",
  COALESCE(MIN(SUBSTR(pi.created, 1, 10)), '-') as "Pentest đầu tiên",
  COALESCE(MAX(SUBSTR(pi.created, 1, 10)), '-') as "Pentest gần nhất",
  SUM(CASE WHEN pi.status_category != 'Done' AND pi.key IS NOT NULL THEN 1 ELSE 0 END) as "Findings chưa xử lý"
FROM system_list sl
LEFT JOIN pentest_issues pi ON (
  LOWER(pi.summary) LIKE '%' || LOWER(sl.sys_name) || '%'
  OR LOWER(pi.description) LIKE '%' || LOWER(sl.sys_name) || '%'
)
GROUP BY sl.sys_name, sl.sys_level
ORDER BY sl.sys_level DESC, COUNT(pi.key) ASC, sl.sys_name`
  },

  'i4-02-systems-no-pentest': {
    category: 'I.4 - Pentest',
    title: '[I.4] Hệ thống CHƯA CÓ bằng chứng Pentest',
    description: 'Danh sách hệ thống cấp 2,3 không tìm thấy bất kỳ issue pentest/VA nào trên Jira. Đây là rủi ro chính cần nêu trong báo cáo kiểm toán.',
    sql: `
WITH system_list(sys_name, sys_level) AS (VALUES
  ('TTBC',2),('SIMO',2),('Kho dữ liệu',2),('Báo cáo ngân hàng',2),('RWA',2),
  ('dealtracker',2),('Tellerportal',2),('Eswitch',2),('FlexCash',2),('SmartForm',2),
  ('RPA',2),('Voffice',2),('eOffice',2),('LOS',2),('CIC',2),('AML',2),
  ('CRM',2),('Lending',2),('Einvoice',2),('DevSecOps',2),('ERP',2),
  ('Notification',2),('OTP',2),('NAC',2),('SIEM',2),('QRadar',2),('SOAR',2),
  ('IDM',2),('PAM',2),('IVANTI',2),('ePIN',2),('SBV',2),
  ('Corebanking',3),('T24',3),('Mobile Banking',3),('Omni Retail',3),
  ('SWIFT',3),('Email',3),('Exchange',3),('AD',3),('DNS',3),
  ('Thẻ',3),('Smartvista',3),('3DSecure',3),('HSM',3),
  ('Call center',3),('Website',3),('F5',3),('WAF',3),
  ('Firewall',3),('DDOS',3),('Billing',3),('Citad',3),('ACH',3),
  ('Virtual Account',3),('ESB',3),('APIC',3),('Omni Corporate',3),
  ('Office 365',3),('Deposit Service',3)
),
pentest_issues AS (
  SELECT * FROM issues
  WHERE LOWER(summary) LIKE '%pentest%' OR LOWER(summary) LIKE '%penetration%'
     OR LOWER(summary) LIKE '%va scan%' OR LOWER(summary) LIKE '%vulnerability assessment%'
     OR LOWER(summary) LIKE '%đánh giá%bảo mật%' OR LOWER(summary) LIKE '%security assessment%'
     OR LOWER(summary) LIKE '%security test%' OR LOWER(summary) LIKE '%security review%'
     OR LOWER(summary) LIKE '%nessus%' OR LOWER(summary) LIKE '%qualys%'
     OR LOWER(labels) LIKE '%pentest%' OR LOWER(labels) LIKE '%va-scan%'
)
SELECT
  sl.sys_name as "Hệ thống",
  sl.sys_level as "Cấp độ",
  'KHÔNG CÓ BẰNG CHỨNG PENTEST' as "Trạng thái"
FROM system_list sl
WHERE NOT EXISTS (
  SELECT 1 FROM pentest_issues pi
  WHERE LOWER(pi.summary) LIKE '%' || LOWER(sl.sys_name) || '%'
     OR LOWER(pi.description) LIKE '%' || LOWER(sl.sys_name) || '%'
)
ORDER BY sl.sys_level DESC, sl.sys_name`
  },

  'i4-03-pentest-frequency': {
    category: 'I.4 - Pentest',
    title: '[I.4] Tần suất Pentest theo năm',
    description: 'Thống kê số lần pentest/VA theo năm. Đánh giá có thực hiện định kỳ theo quy định không (thường yêu cầu ít nhất 1 lần/năm cho hệ thống cấp 3).',
    sql: `
SELECT
  SUBSTR(created, 1, 4) as year,
  COUNT(*) as total_pentest_issues,
  COUNT(DISTINCT project_key) as projects_involved,
  SUM(CASE WHEN status_category = 'Done' THEN 1 ELSE 0 END) as resolved,
  SUM(CASE WHEN status_category != 'Done' THEN 1 ELSE 0 END) as still_open
FROM issues
WHERE LOWER(summary) LIKE '%pentest%' OR LOWER(summary) LIKE '%penetration%'
   OR LOWER(summary) LIKE '%va scan%' OR LOWER(summary) LIKE '%vulnerability assessment%'
   OR LOWER(summary) LIKE '%đánh giá%bảo mật%' OR LOWER(summary) LIKE '%security assessment%'
   OR LOWER(summary) LIKE '%security test%'
   OR LOWER(labels) LIKE '%pentest%' OR LOWER(labels) LIKE '%va-scan%'
GROUP BY SUBSTR(created, 1, 4)
ORDER BY year DESC`
  },

  'i4-04-pentest-findings-open': {
    category: 'I.4 - Pentest',
    title: '[I.4] Findings Pentest/VA chưa khắc phục (chi tiết)',
    description: 'Chi tiết từng finding pentest/VA chưa done, thời gian tồn đọng, SLA. Attach vào phụ lục báo cáo kiểm toán.',
    sql: `
SELECT
  key as "Issue Key",
  project_key as "Project",
  summary as "Finding",
  priority_name as "Severity",
  status_name as "Status",
  assignee_name as "Assignee",
  SUBSTR(created, 1, 10) as "Ngày phát hiện",
  due_date as "Hạn xử lý",
  CAST(julianday('now') - julianday(created) AS INTEGER) as "Số ngày tồn đọng",
  CASE
    WHEN due_date IS NOT NULL AND due_date < date('now') THEN 'QUÁ HẠN ' || CAST(julianday('now') - julianday(due_date) AS INTEGER) || ' ngày'
    WHEN due_date IS NULL THEN 'KHÔNG CÓ HẠN'
    ELSE 'Trong hạn'
  END as "Tình trạng SLA"
FROM issues
WHERE (LOWER(summary) LIKE '%pentest%' OR LOWER(summary) LIKE '%penetration%'
    OR LOWER(summary) LIKE '%va scan%' OR LOWER(summary) LIKE '%vulnerability assessment%'
    OR LOWER(summary) LIKE '%đánh giá%bảo mật%' OR LOWER(summary) LIKE '%security assessment%'
    OR LOWER(summary) LIKE '%security test%' OR LOWER(summary) LIKE '%finding%'
    OR LOWER(labels) LIKE '%pentest%' OR LOWER(labels) LIKE '%va-scan%')
  AND status_category != 'Done'
ORDER BY
  CASE LOWER(priority_name) WHEN 'blocker' THEN 1 WHEN 'critical' THEN 2 WHEN 'highest' THEN 3 WHEN 'high' THEN 4 ELSE 5 END,
  CAST(julianday('now') - julianday(created) AS INTEGER) DESC`
  },

  'i4-05-customer-facing-no-pentest': {
    category: 'I.4 - Pentest',
    title: '[I.4] Hệ thống Customer-facing chưa có Pentest',
    description: 'Hệ thống tiếp xúc khách hàng (Mobile Banking, Website, Billing, ATM...) mà chưa có bằng chứng pentest. Rủi ro cao nhất.',
    sql: `
WITH customer_facing(sys_name) AS (VALUES
  ('Mobile Banking'),('Omni Retail'),('Website'),('Billing'),('Call center'),
  ('Thẻ'),('Smartvista'),('3DSecure'),('ATM'),('POS'),
  ('Citad'),('ACH'),('Einvoice'),('APIC'),('ESB'),
  ('Omni Corporate'),('Virtual Account'),('Deposit Service'),
  ('Thu thuế'),('mobilesale'),('SWIFT')
),
pentest_issues AS (
  SELECT * FROM issues
  WHERE LOWER(summary) LIKE '%pentest%' OR LOWER(summary) LIKE '%penetration%'
     OR LOWER(summary) LIKE '%va scan%' OR LOWER(summary) LIKE '%vulnerability assessment%'
     OR LOWER(summary) LIKE '%đánh giá%bảo mật%' OR LOWER(summary) LIKE '%security assessment%'
     OR LOWER(summary) LIKE '%security test%'
     OR LOWER(labels) LIKE '%pentest%' OR LOWER(labels) LIKE '%va-scan%'
)
SELECT
  cf.sys_name as "Hệ thống Customer-facing",
  CASE
    WHEN EXISTS (SELECT 1 FROM pentest_issues pi WHERE LOWER(pi.summary) LIKE '%' || LOWER(cf.sys_name) || '%' OR LOWER(pi.description) LIKE '%' || LOWER(cf.sys_name) || '%')
    THEN 'CÓ'
    ELSE 'KHÔNG CÓ BẰNG CHỨNG'
  END as "Pentest status",
  (SELECT MAX(SUBSTR(pi.created, 1, 10)) FROM pentest_issues pi WHERE LOWER(pi.summary) LIKE '%' || LOWER(cf.sys_name) || '%' OR LOWER(pi.description) LIKE '%' || LOWER(cf.sys_name) || '%') as "Lần pentest gần nhất",
  (SELECT COUNT(*) FROM pentest_issues pi WHERE (LOWER(pi.summary) LIKE '%' || LOWER(cf.sys_name) || '%' OR LOWER(pi.description) LIKE '%' || LOWER(cf.sys_name) || '%') AND pi.status_category != 'Done') as "Findings chưa xử lý"
FROM customer_facing cf
ORDER BY
  CASE WHEN EXISTS (SELECT 1 FROM pentest_issues pi WHERE LOWER(pi.summary) LIKE '%' || LOWER(cf.sys_name) || '%') THEN 1 ELSE 0 END ASC,
  cf.sys_name`
  },

  // ================================================================
  //  21. I.5 - RỦI RO CHƯA CÓ TIÊU CHUẨN CẤU HÌNH ỨNG DỤNG
  //      Hardening, baseline config, security standards
  // ================================================================

  'i5-01-hardening-issues': {
    category: 'I.5 - Config Baseline',
    title: '[I.5] Tất cả issues liên quan Hardening / Cấu hình bảo mật',
    description: 'Tìm bằng chứng về hardening, baseline config, security configuration cho ứng dụng (web, mobile, API, desktop).',
    sql: `
SELECT
  key, project_key, issue_type_name, summary,
  priority_name, status_name, status_category,
  assignee_name, reporter_name,
  created, resolved, due_date,
  CAST(julianday('now') - julianday(created) AS INTEGER) as age_days,
  labels
FROM issues
WHERE LOWER(summary) LIKE '%hardening%'
   OR LOWER(summary) LIKE '%baseline%'
   OR LOWER(summary) LIKE '%security config%'
   OR LOWER(summary) LIKE '%cấu hình bảo mật%'
   OR LOWER(summary) LIKE '%cau hinh bao mat%'
   OR LOWER(summary) LIKE '%tiêu chuẩn cấu hình%'
   OR LOWER(summary) LIKE '%tieu chuan cau hinh%'
   OR LOWER(summary) LIKE '%security standard%'
   OR LOWER(summary) LIKE '%cis benchmark%'
   OR LOWER(summary) LIKE '%stig%'
   OR LOWER(summary) LIKE '%security header%'
   OR LOWER(summary) LIKE '%http header%'
   OR LOWER(summary) LIKE '%hsts%'
   OR LOWER(summary) LIKE '%x-frame%'
   OR LOWER(summary) LIKE '%x-content-type%'
   OR LOWER(summary) LIKE '%content-security-policy%'
   OR LOWER(summary) LIKE '%csp%'
   OR LOWER(summary) LIKE '%cors%'
   OR LOWER(summary) LIKE '%ssl config%'
   OR LOWER(summary) LIKE '%tls config%'
   OR LOWER(summary) LIKE '%cipher%'
   OR LOWER(summary) LIKE '%certificate%'
   OR LOWER(summary) LIKE '%disable%service%'
   OR LOWER(summary) LIKE '%disable%port%'
   OR LOWER(summary) LIKE '%unnecessary service%'
   OR LOWER(summary) LIKE '%default password%'
   OR LOWER(summary) LIKE '%default credential%'
   OR LOWER(summary) LIKE '%password policy%'
   OR LOWER(summary) LIKE '%session timeout%'
   OR LOWER(summary) LIKE '%session management%'
   OR LOWER(summary) LIKE '%cookie%secure%'
   OR LOWER(summary) LIKE '%httponly%'
   OR LOWER(summary) LIKE '%rate limit%'
   OR LOWER(summary) LIKE '%brute force%'
   OR LOWER(summary) LIKE '%lockout%'
   OR LOWER(summary) LIKE '%error handling%'
   OR LOWER(summary) LIKE '%stack trace%'
   OR LOWER(summary) LIKE '%debug mode%'
   OR LOWER(summary) LIKE '%information disclosure%'
   OR LOWER(summary) LIKE '%version disclosure%'
   OR LOWER(summary) LIKE '%server header%'
   OR LOWER(summary) LIKE '%directory listing%'
   OR LOWER(labels) LIKE '%hardening%'
   OR LOWER(labels) LIKE '%baseline%'
   OR LOWER(labels) LIKE '%config%'
ORDER BY created DESC`
  },

  'i5-02-config-by-app-type': {
    category: 'I.5 - Config Baseline',
    title: '[I.5] Issues cấu hình theo loại ứng dụng (Web/Mobile/API/Desktop)',
    description: 'Phân loại issues liên quan cấu hình bảo mật theo loại ứng dụng: Web app, Mobile app, API, Desktop.',
    sql: `
WITH config_issues AS (
  SELECT * FROM issues
  WHERE LOWER(summary) LIKE '%hardening%' OR LOWER(summary) LIKE '%baseline%'
     OR LOWER(summary) LIKE '%security config%' OR LOWER(summary) LIKE '%cấu hình%'
     OR LOWER(summary) LIKE '%security header%' OR LOWER(summary) LIKE '%ssl%'
     OR LOWER(summary) LIKE '%tls%' OR LOWER(summary) LIKE '%certificate%'
     OR LOWER(summary) LIKE '%cipher%' OR LOWER(summary) LIKE '%hsts%'
     OR LOWER(summary) LIKE '%cors%' OR LOWER(summary) LIKE '%csp%'
     OR LOWER(summary) LIKE '%session%' OR LOWER(summary) LIKE '%cookie%'
     OR LOWER(summary) LIKE '%password policy%' OR LOWER(summary) LIKE '%lockout%'
     OR LOWER(summary) LIKE '%default password%' OR LOWER(summary) LIKE '%debug%'
     OR LOWER(summary) LIKE '%error handling%' OR LOWER(summary) LIKE '%rate limit%'
     OR LOWER(labels) LIKE '%hardening%' OR LOWER(labels) LIKE '%baseline%'
)
SELECT
  CASE
    WHEN LOWER(summary) LIKE '%mobile%' OR LOWER(summary) LIKE '%android%' OR LOWER(summary) LIKE '%ios%' OR LOWER(summary) LIKE '%app%mobile%' THEN 'Mobile App'
    WHEN LOWER(summary) LIKE '%api%' OR LOWER(summary) LIKE '%rest%' OR LOWER(summary) LIKE '%endpoint%' OR LOWER(summary) LIKE '%swagger%' THEN 'API'
    WHEN LOWER(summary) LIKE '%desktop%' OR LOWER(summary) LIKE '%client%' OR LOWER(summary) LIKE '%winform%' THEN 'Desktop App'
    WHEN LOWER(summary) LIKE '%web%' OR LOWER(summary) LIKE '%http%' OR LOWER(summary) LIKE '%browser%' OR LOWER(summary) LIKE '%header%' OR LOWER(summary) LIKE '%cookie%' OR LOWER(summary) LIKE '%cors%' OR LOWER(summary) LIKE '%csp%' THEN 'Web App'
    ELSE 'General / Unclassified'
  END as app_type,
  COUNT(*) as total,
  SUM(CASE WHEN status_category = 'Done' THEN 1 ELSE 0 END) as done,
  SUM(CASE WHEN status_category != 'Done' THEN 1 ELSE 0 END) as open,
  GROUP_CONCAT(DISTINCT key) as issue_keys
FROM config_issues
GROUP BY app_type
ORDER BY total DESC`
  },

  'i5-03-systems-no-hardening': {
    category: 'I.5 - Config Baseline',
    title: '[I.5] Hệ thống CHƯA CÓ bằng chứng Hardening/Baseline',
    description: 'Hệ thống cấp 2,3 không tìm thấy issue nào liên quan hardening hoặc tiêu chuẩn cấu hình. Rủi ro: cấu hình mặc định, không tuân thủ.',
    sql: `
WITH system_list(sys_name, sys_level) AS (VALUES
  ('TTBC',2),('SIMO',2),('Báo cáo ngân hàng',2),('RWA',2),
  ('dealtracker',2),('Tellerportal',2),('Eswitch',2),('FlexCash',2),('SmartForm',2),
  ('RPA',2),('Voffice',2),('eOffice',2),('LOS',2),('CIC',2),('AML',2),
  ('CRM',2),('Lending',2),('Einvoice',2),('DevSecOps',2),('ERP',2),
  ('OTP',2),('IDM',2),('PAM',2),('ePIN',2),
  ('Corebanking',3),('T24',3),('Mobile Banking',3),('Omni Retail',3),
  ('SWIFT',3),('Email',3),('Exchange',3),('AD',3),('DNS',3),
  ('Thẻ',3),('Smartvista',3),('3DSecure',3),('HSM',3),
  ('Call center',3),('Website',3),('F5',3),('WAF',3),
  ('Firewall',3),('Billing',3),('Citad',3),('ACH',3),
  ('Virtual Account',3),('ESB',3),('APIC',3),('Omni Corporate',3),
  ('Office 365',3),('Deposit Service',3)
),
config_issues AS (
  SELECT * FROM issues
  WHERE LOWER(summary) LIKE '%hardening%' OR LOWER(summary) LIKE '%baseline%'
     OR LOWER(summary) LIKE '%security config%' OR LOWER(summary) LIKE '%cấu hình bảo mật%'
     OR LOWER(summary) LIKE '%tiêu chuẩn cấu hình%' OR LOWER(summary) LIKE '%security standard%'
     OR LOWER(summary) LIKE '%cis benchmark%' OR LOWER(summary) LIKE '%stig%'
     OR LOWER(summary) LIKE '%ssl config%' OR LOWER(summary) LIKE '%tls config%'
     OR LOWER(summary) LIKE '%cipher%' OR LOWER(summary) LIKE '%security header%'
     OR LOWER(summary) LIKE '%hsts%' OR LOWER(summary) LIKE '%csp%'
     OR LOWER(summary) LIKE '%cors%' OR LOWER(summary) LIKE '%session%timeout%'
     OR LOWER(summary) LIKE '%password policy%' OR LOWER(summary) LIKE '%lockout%'
     OR LOWER(labels) LIKE '%hardening%' OR LOWER(labels) LIKE '%baseline%'
)
SELECT
  sl.sys_name as "Hệ thống",
  sl.sys_level as "Cấp độ",
  'KHÔNG TÌM THẤY BẰNG CHỨNG' as "Trạng thái Hardening/Baseline"
FROM system_list sl
WHERE NOT EXISTS (
  SELECT 1 FROM config_issues ci
  WHERE LOWER(ci.summary) LIKE '%' || LOWER(sl.sys_name) || '%'
     OR LOWER(ci.description) LIKE '%' || LOWER(sl.sys_name) || '%'
)
ORDER BY sl.sys_level DESC, sl.sys_name`
  },

  'i5-04-ssl-tls-issues': {
    category: 'I.5 - Config Baseline',
    title: '[I.5] Issues liên quan SSL/TLS/Certificate',
    description: 'Vấn đề cấu hình SSL/TLS: certificate hết hạn, cipher yếu, protocol cũ. Quan trọng cho hệ thống banking.',
    sql: `
SELECT
  key, project_key, summary,
  priority_name, status_name, status_category,
  assignee_name,
  created, resolved, due_date,
  CAST(julianday('now') - julianday(created) AS INTEGER) as age_days
FROM issues
WHERE LOWER(summary) LIKE '%ssl%'
   OR LOWER(summary) LIKE '%tls%'
   OR LOWER(summary) LIKE '%certificate%'
   OR LOWER(summary) LIKE '%chứng chỉ số%'
   OR LOWER(summary) LIKE '%chung chi so%'
   OR LOWER(summary) LIKE '%cipher%'
   OR LOWER(summary) LIKE '%https%'
   OR LOWER(summary) LIKE '%hết hạn%cert%'
   OR LOWER(summary) LIKE '%expired%cert%'
   OR LOWER(summary) LIKE '%renew%cert%'
   OR LOWER(summary) LIKE '%gia hạn%cert%'
ORDER BY created DESC`
  },

  'i5-05-web-security-config': {
    category: 'I.5 - Config Baseline',
    title: '[I.5] Issues cấu hình bảo mật Web (headers, CORS, CSP, session)',
    description: 'Vấn đề cấu hình bảo mật web application: security headers, CORS, CSP, session management, cookie.',
    sql: `
SELECT
  key, project_key, summary,
  priority_name, status_name, status_category,
  assignee_name, created, resolved,
  CAST(julianday('now') - julianday(created) AS INTEGER) as age_days
FROM issues
WHERE LOWER(summary) LIKE '%security header%'
   OR LOWER(summary) LIKE '%http header%'
   OR LOWER(summary) LIKE '%hsts%'
   OR LOWER(summary) LIKE '%x-frame%'
   OR LOWER(summary) LIKE '%x-content-type%'
   OR LOWER(summary) LIKE '%content-security-policy%'
   OR LOWER(summary) LIKE '%csp%policy%'
   OR LOWER(summary) LIKE '%cors%'
   OR LOWER(summary) LIKE '%cross-origin%'
   OR LOWER(summary) LIKE '%session%timeout%'
   OR LOWER(summary) LIKE '%session%management%'
   OR LOWER(summary) LIKE '%cookie%secure%'
   OR LOWER(summary) LIKE '%httponly%'
   OR LOWER(summary) LIKE '%samesite%'
   OR LOWER(summary) LIKE '%clickjack%'
   OR LOWER(summary) LIKE '%directory listing%'
   OR LOWER(summary) LIKE '%server header%'
   OR LOWER(summary) LIKE '%version disclosure%'
   OR LOWER(summary) LIKE '%information disclosure%'
   OR LOWER(summary) LIKE '%error page%'
   OR LOWER(summary) LIKE '%stack trace%'
   OR LOWER(summary) LIKE '%debug mode%'
ORDER BY created DESC`
  },

  'i5-06-default-credentials': {
    category: 'I.5 - Config Baseline',
    title: '[I.5] Issues liên quan Default Credential / Password Policy',
    description: 'Vấn đề mật khẩu mặc định, chính sách mật khẩu, account lockout. Rủi ro lớn cho hệ thống banking.',
    sql: `
SELECT
  key, project_key, summary,
  priority_name, status_name, status_category,
  assignee_name, created, resolved,
  CAST(julianday('now') - julianday(created) AS INTEGER) as age_days
FROM issues
WHERE LOWER(summary) LIKE '%default password%'
   OR LOWER(summary) LIKE '%default credential%'
   OR LOWER(summary) LIKE '%mật khẩu mặc định%'
   OR LOWER(summary) LIKE '%mat khau mac dinh%'
   OR LOWER(summary) LIKE '%password policy%'
   OR LOWER(summary) LIKE '%chính sách mật khẩu%'
   OR LOWER(summary) LIKE '%chinh sach mat khau%'
   OR LOWER(summary) LIKE '%password complex%'
   OR LOWER(summary) LIKE '%password strength%'
   OR LOWER(summary) LIKE '%account lockout%'
   OR LOWER(summary) LIKE '%brute force%'
   OR LOWER(summary) LIKE '%rate limit%'
   OR LOWER(summary) LIKE '%login attempt%'
   OR LOWER(summary) LIKE '%2fa%'
   OR LOWER(summary) LIKE '%two factor%'
   OR LOWER(summary) LIKE '%multi factor%'
   OR LOWER(summary) LIKE '%mfa%'
   OR LOWER(summary) LIKE '%xác thực hai%'
   OR LOWER(summary) LIKE '%xác thực 2%'
ORDER BY created DESC`
  },

  'i5-07-config-summary-report': {
    category: 'I.5 - Config Baseline',
    title: '[I.5] TỔNG HỢP: Trạng thái tiêu chuẩn cấu hình theo hệ thống',
    description: 'Bảng tổng hợp cho báo cáo I.5: mỗi hệ thống cấp 2,3 có bao nhiêu issues cấu hình, trạng thái xử lý.',
    sql: `
WITH system_list(sys_name, sys_level) AS (VALUES
  ('TTBC',2),('SIMO',2),('Báo cáo ngân hàng',2),('RWA',2),
  ('dealtracker',2),('Tellerportal',2),('Eswitch',2),('FlexCash',2),('SmartForm',2),
  ('RPA',2),('Voffice',2),('eOffice',2),('LOS',2),('CIC',2),('AML',2),
  ('CRM',2),('Lending',2),('Einvoice',2),('DevSecOps',2),('ERP',2),
  ('OTP',2),('IDM',2),('PAM',2),('ePIN',2),
  ('Corebanking',3),('T24',3),('Mobile Banking',3),('Omni Retail',3),
  ('SWIFT',3),('Email',3),('Exchange',3),('AD',3),('DNS',3),
  ('Thẻ',3),('Smartvista',3),('3DSecure',3),('HSM',3),
  ('Call center',3),('Website',3),('F5',3),('WAF',3),
  ('Firewall',3),('Billing',3),('Citad',3),('ACH',3),
  ('Virtual Account',3),('ESB',3),('APIC',3),('Omni Corporate',3),
  ('Office 365',3),('Deposit Service',3)
),
config_issues AS (
  SELECT * FROM issues
  WHERE LOWER(summary) LIKE '%hardening%' OR LOWER(summary) LIKE '%baseline%'
     OR LOWER(summary) LIKE '%security config%' OR LOWER(summary) LIKE '%cấu hình bảo mật%'
     OR LOWER(summary) LIKE '%tiêu chuẩn cấu hình%' OR LOWER(summary) LIKE '%security standard%'
     OR LOWER(summary) LIKE '%ssl%' OR LOWER(summary) LIKE '%tls%' OR LOWER(summary) LIKE '%certificate%'
     OR LOWER(summary) LIKE '%cipher%' OR LOWER(summary) LIKE '%security header%'
     OR LOWER(summary) LIKE '%hsts%' OR LOWER(summary) LIKE '%csp%' OR LOWER(summary) LIKE '%cors%'
     OR LOWER(summary) LIKE '%session%timeout%' OR LOWER(summary) LIKE '%password policy%'
     OR LOWER(summary) LIKE '%default password%' OR LOWER(summary) LIKE '%lockout%'
     OR LOWER(summary) LIKE '%hardening%' OR LOWER(summary) LIKE '%debug%'
     OR LOWER(labels) LIKE '%hardening%' OR LOWER(labels) LIKE '%baseline%' OR LOWER(labels) LIKE '%config%'
)
SELECT
  sl.sys_name as "Hệ thống",
  sl.sys_level as "Cấp độ",
  COUNT(ci.key) as "Số issues config",
  SUM(CASE WHEN ci.status_category = 'Done' THEN 1 ELSE 0 END) as "Đã xử lý",
  SUM(CASE WHEN ci.status_category != 'Done' AND ci.key IS NOT NULL THEN 1 ELSE 0 END) as "Chưa xử lý",
  CASE
    WHEN COUNT(ci.key) = 0 THEN 'KHÔNG CÓ BẰNG CHỨNG'
    WHEN SUM(CASE WHEN ci.status_category != 'Done' AND ci.key IS NOT NULL THEN 1 ELSE 0 END) > 0 THEN 'CÒN TỒN ĐỌNG'
    ELSE 'ĐÃ XỬ LÝ'
  END as "Đánh giá"
FROM system_list sl
LEFT JOIN config_issues ci ON (
  LOWER(ci.summary) LIKE '%' || LOWER(sl.sys_name) || '%'
  OR LOWER(ci.description) LIKE '%' || LOWER(sl.sys_name) || '%'
)
GROUP BY sl.sys_name, sl.sys_level
ORDER BY sl.sys_level DESC, COUNT(ci.key) ASC, sl.sys_name`
  },
};

module.exports = { AUDIT_QUERIES };
