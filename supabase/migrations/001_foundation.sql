-- Migration 001: Foundation schema
-- Substitui o schema antigo (participants monolítico) pelo modelo normalizado.

-- ============================================================
-- 0. Limpar objetos antigos
-- ============================================================
DROP TABLE IF EXISTS participants CASCADE;

DROP TYPE IF EXISTS ticket_type CASCADE;
DROP TYPE IF EXISTS company_type CASCADE;
DROP TYPE IF EXISTS participant_status CASCADE;

-- ============================================================
-- 1. ENUMs
-- ============================================================
CREATE TYPE ticket_membership AS ENUM ('MEMBRO', 'NAO_MEMBRO');

CREATE TYPE company_segment AS ENUM (
  'GP', 'LP', 'FUNDO', 'CORPORATIVO', 'GOVERNO', 'ACADEMIA', 'OUTRO'
);

CREATE TYPE import_status AS ENUM (
  'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'
);

-- ============================================================
-- 2. Tabelas
-- ============================================================

CREATE TABLE editions (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text        NOT NULL,
  year        int         NOT NULL UNIQUE,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE import_jobs (
  id            uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  edition_id    uuid          REFERENCES editions(id),
  filename      text          NOT NULL,
  status        import_status DEFAULT 'PENDING',
  total_rows    int           DEFAULT 0,
  inserted_rows int           DEFAULT 0,
  updated_rows  int           DEFAULT 0,
  error_rows    int           DEFAULT 0,
  error_log     jsonb         DEFAULT '[]',
  imported_by   text,
  created_at    timestamptz   DEFAULT now()
);

CREATE TABLE participants (
  id                uuid              DEFAULT gen_random_uuid() PRIMARY KEY,
  edition_id        uuid              REFERENCES editions(id) NOT NULL,
  email             text              NOT NULL,
  full_name         text              NOT NULL,
  company           text,
  ticket_membership ticket_membership NOT NULL,
  ticket_value      numeric(10,2),
  import_job_id     uuid              REFERENCES import_jobs(id),
  created_at        timestamptz       DEFAULT now(),
  UNIQUE(email, edition_id)
);

CREATE TABLE form_responses (
  id                   uuid            DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id       uuid            REFERENCES participants(id) UNIQUE NOT NULL,
  professional_role    text,
  company_segment      company_segment,
  company_size         text,
  origin_state         text,
  opt_in_communication boolean,
  preferred_channels   text[],
  topics_of_interest   text[],
  interested_in_events boolean,
  dietary_restrictions text,
  raw_data             jsonb,
  created_at           timestamptz     DEFAULT now()
);

-- ============================================================
-- 3. Índices
-- ============================================================
CREATE INDEX ON form_responses USING GIN (preferred_channels);
CREATE INDEX ON form_responses USING GIN (topics_of_interest);

-- ============================================================
-- 4. Dados iniciais
-- ============================================================
INSERT INTO editions (name, year) VALUES ('Congresso ABVCAP 2025', 2025);
