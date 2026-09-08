-- Fase B (redesign): habilita o quiz de significado (meaning_choice) e serve
-- de hint opcional no verso do flashcard. Aditivo, nullable — dataset atual
-- (en) recebe os valores via supabase/seed/skill_items_meanings.sql.
alter table skill_items add column definicao text;
