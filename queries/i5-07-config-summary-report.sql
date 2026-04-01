-- {"key":"i5-07-config-summary-report","title":"[I.5] TỔNG HỢP: Trạng thái tiêu chuẩn cấu hình theo hệ thống","category":"I.5 - Config Baseline","description":"Bảng tổng hợp cho báo cáo I.5: mỗi hệ thống cấp 2,3 có bao nhiêu issues cấu hình, trạng thái xử lý."}
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
ORDER BY sl.sys_level DESC, COUNT(ci.key) ASC, sl.sys_name
