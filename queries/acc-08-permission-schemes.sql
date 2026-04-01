-- {"key":"acc-08-permission-schemes","title":"Danh sách Permission Schemes","category":"Access Control","description":"Các scheme phân quyền đang được cấu hình trong hệ thống."}
SELECT id, name, description FROM permission_schemes ORDER BY name
