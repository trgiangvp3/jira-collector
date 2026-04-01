-- {"key":"rpt-04-workflows","title":"Danh sách Workflows","category":"Summary Report","description":"Tất cả workflow đang cấu hình."}
SELECT name, description, is_default, steps_count FROM workflows ORDER BY name
