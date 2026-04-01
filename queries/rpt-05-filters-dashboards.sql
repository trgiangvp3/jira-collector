-- {"key":"rpt-05-filters-dashboards","title":"Filters & Dashboards","category":"Summary Report","description":"Saved filters và dashboards trong hệ thống."}
SELECT 'Filter' as type, name, owner_name, jql as detail FROM filters
UNION ALL
SELECT 'Dashboard' as type, name, owner_name, description as detail FROM dashboards
ORDER BY type, name
