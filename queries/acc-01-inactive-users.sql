-- {"key":"acc-01-inactive-users","title":"Tài khoản inactive chưa bị vô hiệu hóa đúng cách","category":"Access Control","description":"Liệt kê tài khoản inactive nhưng vẫn tồn tại trong hệ thống. Rủi ro: tài khoản zombie có thể bị khai thác."}
SELECT
  account_key, username, display_name, email, active,
  CASE WHEN active = 0 THEN 'INACTIVE' ELSE 'ACTIVE' END as status
FROM users
WHERE active = 0
ORDER BY display_name
