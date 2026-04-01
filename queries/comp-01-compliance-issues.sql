-- {"key":"comp-01-compliance-issues","title":"Issues liên quan tuân thủ / compliance / chính sách","category":"Compliance","description":"Issue liên quan đến compliance, tuân thủ quy định, chính sách, tiêu chuẩn (PCI-DSS, ISO 27001, NHNN...)."}
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
ORDER BY created DESC
