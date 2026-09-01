-- Migration 017: usa ticket_id (coluna A "ID do ingresso" da planilha) como
-- chave de identidade do participante, em vez de email.
--
-- Motivo: e-mails genéricos/de contato são reaproveitados por várias pessoas
-- diferentes num mesmo pedido de grupo (ex. rsvp@abvcap.com.br usado por 50
-- palestrantes distintos na planilha de 01.09.26). Com email+edição como
-- chave única, cada linha nova sobrescrevia a anterior no upsert — perda
-- silenciosa de dados. ticket_id é único por linha (confirmado: 193/193
-- únicos na planilha mais recente, mesmo dentro do grupo de 50).
--
-- Linhas já importadas antes desta migração ficam com ticket_id NULL até
-- serem reimportadas (NULL não colide com a UNIQUE constraint).

ALTER TABLE participants ADD COLUMN IF NOT EXISTS ticket_id text;

ALTER TABLE participants DROP CONSTRAINT IF EXISTS participants_email_edition_id_key;
ALTER TABLE participants ADD CONSTRAINT participants_ticket_id_edition_id_key UNIQUE (ticket_id, edition_id);

-- email deixa de ser único, mas continua sendo filtrado/buscado na UI
CREATE INDEX IF NOT EXISTS idx_participants_email_edition ON participants(email, edition_id);

-- ── upsert_participants_batch: identidade agora é (ticket_id, edition_id) ──
CREATE OR REPLACE FUNCTION upsert_participants_batch(
  p_rows         jsonb,
  p_edition_id   uuid,
  p_import_job_id uuid
)
RETURNS json AS $$
DECLARE
  v_row              jsonb;
  v_inserted         int := 0;
  v_updated          int := 0;
  v_errors           int := 0;
  v_error_log        jsonb := '[]'::jsonb;
  v_email            text;
  v_ticket_id        text;
  v_existed          boolean;
  v_excel_row        int;
  v_segment_normalized company_segment;
BEGIN
  IF jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'p_rows must be a JSON array';
  END IF;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    BEGIN
      v_email := lower(trim(v_row->>'email'));
      v_ticket_id := NULLIF(trim(v_row->>'ticket_id'), '');
      v_excel_row := COALESCE((v_row->>'excel_row')::int, 0);

      IF v_email IS NULL OR v_email = '' THEN
        v_errors := v_errors + 1;
        v_error_log := v_error_log || jsonb_build_object(
          'excel_row', v_excel_row,
          'error', 'Email vazio'
        );
        CONTINUE;
      END IF;

      IF v_ticket_id IS NULL THEN
        v_errors := v_errors + 1;
        v_error_log := v_error_log || jsonb_build_object(
          'excel_row', v_excel_row,
          'email', v_email,
          'error', 'ID do ingresso (coluna A) vazio'
        );
        CONTINUE;
      END IF;

      IF v_row ? 'company_segment_normalized' AND v_row->>'company_segment_normalized' IS NOT NULL THEN
        BEGIN
          v_segment_normalized := (v_row->>'company_segment_normalized')::company_segment;
        EXCEPTION WHEN invalid_text_representation THEN
          v_segment_normalized := 'OUTRO'::company_segment;
        END;
      ELSE
        v_segment_normalized := NULL;
      END IF;

      SELECT EXISTS(
        SELECT 1 FROM participants
        WHERE ticket_id = v_ticket_id AND edition_id = p_edition_id
      ) INTO v_existed;

      INSERT INTO participants (
        edition_id, ticket_id, email, full_name, company,
        job_title, cpf, phone, payment_status,
        is_company_member, company_segment_raw, company_segment_normalized,
        ticket_membership, ticket_value, ticket_name, coupon_code,
        registered_at, import_job_id
      ) VALUES (
        p_edition_id,
        v_ticket_id,
        v_email,
        v_row->>'full_name',
        NULLIF(v_row->>'company', ''),
        NULLIF(v_row->>'job_title', ''),
        NULLIF(v_row->>'cpf', ''),
        NULLIF(v_row->>'phone', ''),
        NULLIF(v_row->>'payment_status', ''),
        CASE
          WHEN v_row->>'is_company_member' IN ('true','false')
            THEN (v_row->>'is_company_member')::boolean
          ELSE NULL
        END,
        NULLIF(v_row->>'company_segment_raw', ''),
        v_segment_normalized,
        (v_row->>'ticket_membership')::ticket_membership,
        NULLIF(v_row->>'ticket_value','')::numeric,
        NULLIF(v_row->>'ticket_name', ''),
        NULLIF(v_row->>'coupon_code', ''),
        NULLIF(v_row->>'registered_at', '')::timestamptz,
        p_import_job_id
      )
      ON CONFLICT (ticket_id, edition_id) DO UPDATE SET
        email                       = EXCLUDED.email,
        full_name                  = EXCLUDED.full_name,
        company                    = EXCLUDED.company,
        job_title                  = EXCLUDED.job_title,
        cpf                        = EXCLUDED.cpf,
        phone                      = EXCLUDED.phone,
        payment_status             = EXCLUDED.payment_status,
        is_company_member          = EXCLUDED.is_company_member,
        company_segment_raw        = EXCLUDED.company_segment_raw,
        company_segment_normalized = EXCLUDED.company_segment_normalized,
        ticket_membership          = EXCLUDED.ticket_membership,
        ticket_value               = EXCLUDED.ticket_value,
        ticket_name                = EXCLUDED.ticket_name,
        coupon_code                = EXCLUDED.coupon_code,
        registered_at              = EXCLUDED.registered_at,
        import_job_id              = EXCLUDED.import_job_id;

      IF v_existed THEN
        v_updated := v_updated + 1;
      ELSE
        v_inserted := v_inserted + 1;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      v_error_log := v_error_log || jsonb_build_object(
        'excel_row', v_excel_row,
        'email', v_email,
        'error', SQLERRM
      );
    END;
  END LOOP;

  RETURN json_build_object(
    'inserted',  v_inserted,
    'updated',   v_updated,
    'errors',    v_errors,
    'error_log', v_error_log
  );
END;
$$ LANGUAGE plpgsql VOLATILE;

-- ── upsert_form_responses_batch: participante agora é achado por (ticket_id, edition_id) ──
CREATE OR REPLACE FUNCTION upsert_form_responses_batch(
  p_rows         jsonb,
  p_edition_id   uuid
)
RETURNS json AS $$
DECLARE
  v_row             jsonb;
  v_inserted        int := 0;
  v_updated         int := 0;
  v_errors          int := 0;
  v_error_log       jsonb := '[]'::jsonb;
  v_ticket_id       text;
  v_excel_row       int;
  v_participant_id  uuid;
  v_existed         boolean;
  v_topics          text[];
  v_events          text[];
  v_channels        text[];
  v_contents        text[];
  v_vc_day_topics   text[];
  v_dietary_rest    text;
  v_dietary_details text;
BEGIN
  IF jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'p_rows must be a JSON array';
  END IF;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    BEGIN
      v_ticket_id := NULLIF(trim(v_row->>'ticket_id'), '');
      v_excel_row := COALESCE((v_row->>'excel_row')::int, 0);

      IF v_ticket_id IS NULL THEN
        v_errors := v_errors + 1;
        v_error_log := v_error_log || jsonb_build_object(
          'excel_row', v_excel_row,
          'error', 'ticket_id vazio'
        );
        CONTINUE;
      END IF;

      SELECT id INTO v_participant_id
      FROM participants
      WHERE ticket_id = v_ticket_id AND edition_id = p_edition_id;

      IF v_participant_id IS NULL THEN
        v_errors := v_errors + 1;
        v_error_log := v_error_log || jsonb_build_object(
          'excel_row', v_excel_row,
          'ticket_id', v_ticket_id,
          'error', 'Participant não encontrado para (ticket_id, edition_id)'
        );
        CONTINUE;
      END IF;

      v_topics := CASE
        WHEN jsonb_typeof(v_row->'topics_of_interest') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(v_row->'topics_of_interest'))
        ELSE NULL
      END;
      v_events := CASE
        WHEN jsonb_typeof(v_row->'interested_in_events') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(v_row->'interested_in_events'))
        ELSE NULL
      END;
      v_channels := CASE
        WHEN jsonb_typeof(v_row->'preferred_channels') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(v_row->'preferred_channels'))
        ELSE NULL
      END;
      v_contents := CASE
        WHEN jsonb_typeof(v_row->'content_interests') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(v_row->'content_interests'))
        ELSE NULL
      END;
      v_vc_day_topics := CASE
        WHEN jsonb_typeof(v_row->'vc_day_topics') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(v_row->'vc_day_topics'))
        ELSE NULL
      END;
      v_dietary_rest    := NULLIF(v_row->>'dietary_restrictions', '');
      v_dietary_details := NULLIF(v_row->>'dietary_details', '');

      SELECT EXISTS(SELECT 1 FROM form_responses WHERE participant_id = v_participant_id)
      INTO v_existed;

      INSERT INTO form_responses (
        participant_id,
        topics_of_interest,
        interested_in_events,
        preferred_channels,
        content_interests,
        vc_day_topics,
        dietary_restrictions,
        dietary_details
      ) VALUES (
        v_participant_id,
        v_topics,
        v_events,
        v_channels,
        v_contents,
        v_vc_day_topics,
        v_dietary_rest,
        v_dietary_details
      )
      ON CONFLICT (participant_id) DO UPDATE SET
        topics_of_interest   = EXCLUDED.topics_of_interest,
        interested_in_events = EXCLUDED.interested_in_events,
        preferred_channels   = EXCLUDED.preferred_channels,
        content_interests    = EXCLUDED.content_interests,
        vc_day_topics        = EXCLUDED.vc_day_topics,
        dietary_restrictions = EXCLUDED.dietary_restrictions,
        dietary_details      = EXCLUDED.dietary_details;

      IF v_existed THEN
        v_updated := v_updated + 1;
      ELSE
        v_inserted := v_inserted + 1;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      v_error_log := v_error_log || jsonb_build_object(
        'excel_row', v_excel_row,
        'ticket_id', v_ticket_id,
        'error', SQLERRM
      );
    END;
  END LOOP;

  RETURN json_build_object(
    'inserted',  v_inserted,
    'updated',   v_updated,
    'errors',    v_errors,
    'error_log', v_error_log
  );
END;
$$ LANGUAGE plpgsql VOLATILE;
