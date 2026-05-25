-- ABVCAP Congresso Dashboard — Schema
-- Execute este script no SQL Editor do Supabase

-- Enums
CREATE TYPE ticket_type AS ENUM ('LP', 'GP', 'APOIADOR', 'PATROCINADOR', 'IMPRENSA', 'CORTESIA', 'STAFF');
CREATE TYPE company_type AS ENUM ('GP', 'LP', 'GESTORA', 'FUNDO', 'CORPORATIVO', 'GOVERNO', 'ACADEMIA', 'OUTRO');
CREATE TYPE participant_status AS ENUM ('CONFIRMADO', 'PENDENTE', 'CANCELADO', 'LISTA_ESPERA');

-- Tabela principal de participantes
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  company TEXT NOT NULL,
  company_type company_type NOT NULL DEFAULT 'OUTRO',
  job_title TEXT,
  ticket_type ticket_type NOT NULL,
  status participant_status NOT NULL DEFAULT 'PENDENTE',
  is_checked_in BOOLEAN NOT NULL DEFAULT false,
  checked_in_at TIMESTAMPTZ,
  form_submitted_at TIMESTAMPTZ,
  notes TEXT
);

-- Índices para queries frequentes
CREATE INDEX idx_participants_ticket_type ON participants(ticket_type);
CREATE INDEX idx_participants_status ON participants(status);
CREATE INDEX idx_participants_company_type ON participants(company_type);
CREATE INDEX idx_participants_is_checked_in ON participants(is_checked_in);

-- RLS (Row Level Security) — desabilite para uso admin ou configure conforme necessário
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- Política permissiva para service_role (usado pelo backend)
CREATE POLICY "service_role_all" ON participants
  FOR ALL USING (auth.role() = 'service_role');

-- Dados de exemplo para desenvolvimento
INSERT INTO participants (name, email, phone, company, company_type, job_title, ticket_type, status, form_submitted_at) VALUES
  ('Ana Beatriz Ferreira', 'ana.ferreira@votorantim.com.br', '11999001001', 'Votorantim Capital', 'LP', 'Diretora de Investimentos', 'LP', 'CONFIRMADO', now() - interval '5 days'),
  ('Carlos Eduardo Melo', 'carlos.melo@gp.com.br', '11988002002', 'GP Investimentos', 'GP', 'Sócio', 'GP', 'CONFIRMADO', now() - interval '4 days'),
  ('Fernanda Lima', 'fernanda.lima@bradesco.com.br', '11977003003', 'Bradesco Seguros', 'CORPORATIVO', 'Gerente Sênior', 'LP', 'CONFIRMADO', now() - interval '3 days'),
  ('Rafael Souza', 'rafael.souza@bndes.gov.br', '21966004004', 'BNDES', 'GOVERNO', 'Analista', 'LP', 'PENDENTE', now() - interval '2 days'),
  ('Mariana Costa', 'mariana.costa@fgv.br', '11955005005', 'FGV', 'ACADEMIA', 'Professora', 'CORTESIA', 'CONFIRMADO', now() - interval '2 days'),
  ('Paulo Henrique', 'paulo.h@volandocap.com', '11944006006', 'Volando Capital', 'GESTORA', 'CEO', 'GP', 'CONFIRMADO', now() - interval '1 day'),
  ('Isabela Rodrigues', 'isabela@previ.com.br', '61933007007', 'PREVI', 'LP', 'Gerente de Renda Variável', 'LP', 'CONFIRMADO', now() - interval '1 day'),
  ('Thiago Alves', 'thiago.alves@reuters.com', '11922008008', 'Reuters Brasil', 'CORPORATIVO', 'Jornalista', 'IMPRENSA', 'CONFIRMADO', now()),
  ('Camila Santos', 'camila@abvcap.com.br', '11911009009', 'ABVCAP', 'OUTRO', 'Coordenadora de Eventos', 'STAFF', 'CONFIRMADO', now()),
  ('Bruno Martins', 'bruno.martins@funcef.com.br', '61900010010', 'FUNCEF', 'LP', 'Diretor de Investimentos', 'LP', 'LISTA_ESPERA', now());
