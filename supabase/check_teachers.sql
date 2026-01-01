-- Check is_active value for each teacher (this is the field used by owner toggle)
SELECT t.id, u.name, t.is_active, t.is_available, t.les_place_id
FROM teachers t
LEFT JOIN users u ON t.user_id = u.id
WHERE t.les_place_id = '5d898519-bf5b-4287-887f-3b493493618c';
