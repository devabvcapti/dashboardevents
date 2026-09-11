-- Migration 024: data do evento por edição
-- Permite calcular comparativos "dias antes do evento" (ex.: quantos
-- ingressos já tinham sido vendidos faltando 2 semanas) entre edições
-- diferentes. Campo opcional — sem data preenchida, a edição simplesmente
-- não entra nesse comparativo.

ALTER TABLE editions ADD COLUMN IF NOT EXISTS event_date date;
