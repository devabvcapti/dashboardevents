-- Migration 018: meta de inscrições por edição
-- Campo opcional (NULL = meta ainda não definida, ex. VC Day antes de decidida).
-- Sem meta, a Visão Geral simplesmente não mostra o card de progresso.

ALTER TABLE editions ADD COLUMN IF NOT EXISTS registration_goal integer;

ALTER TABLE editions ADD CONSTRAINT editions_registration_goal_positive
  CHECK (registration_goal IS NULL OR registration_goal > 0);
