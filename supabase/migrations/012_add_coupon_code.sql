-- Migration 012: adiciona coupon_code a participants e atualiza RPC de upsert

ALTER TABLE participants ADD COLUMN IF NOT EXISTS coupon_code text;

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
      v_excel_row := COALESCE((v_row->>'excel_row')::int, 0);

      IF v_email IS NULL OR v_email = '' THEN
        v_errors := v_errors + 1;
        v_error_log := v_error_log || jsonb_build_object(
          'excel_row', v_excel_row,
          'error', 'Email vazio'
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
        WHERE email = v_email AND edition_id = p_edition_id
      ) INTO v_existed;

      INSERT INTO participants (
        edition_id, email, full_name, company,
        job_title, cpf, phone, payment_status,
        is_company_member, company_segment_raw, company_segment_normalized,
        ticket_membership, ticket_value, ticket_name, coupon_code, import_job_id
      ) VALUES (
        p_edition_id,
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
        p_import_job_id
      )
      ON CONFLICT (email, edition_id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        company = EXCLUDED.company,
        job_title = EXCLUDED.job_title,
        cpf = EXCLUDED.cpf,
        phone = EXCLUDED.phone,
        payment_status = EXCLUDED.payment_status,
        is_company_member = EXCLUDED.is_company_member,
        company_segment_raw = EXCLUDED.company_segment_raw,
        company_segment_normalized = EXCLUDED.company_segment_normalized,
        ticket_membership = EXCLUDED.ticket_membership,
        ticket_value = EXCLUDED.ticket_value,
        ticket_name = EXCLUDED.ticket_name,
        coupon_code = EXCLUDED.coupon_code,
        import_job_id = EXCLUDED.import_job_id;

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
