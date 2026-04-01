-- {"key":"base-inactive-users","title":"Inactive Users (still in system)","category":"General Analysis","description":"Inactive Users (still in system)"}
SELECT account_key, username, display_name, email FROM users WHERE active = 0 ORDER BY display_name
