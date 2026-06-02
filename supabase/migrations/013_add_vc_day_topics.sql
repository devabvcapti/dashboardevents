-- Migration 013: Adiciona coluna vc_day_topics em form_responses e atualiza RPC de upsert

ALTER TABLE form_responses
  ADD COLUMN IF NOT EXISTS vc_day_topics text[] DEFAULT NULL;

-- Recria a RPC incluindo vc_day_topics
CREATE OR REPLACE FUNCTION upsert_form_responses_batch(
  p_rows       jsonb,
  p_edition_id uuid
)
RETURNS json AS $$
DECLARE
  v_row             jsonb;
  v_inserted        int := 0;
  v_updated         int := 0;
  v_errors          int := 0;
  v_error_log       jsonb := '[]'::jsonb;
  v_email           text;
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
      v_email := lower(trim(v_row->>'participant_email'));
      v_excel_row := COALESCE((v_row->>'excel_row')::int, 0);

      IF v_email IS NULL OR v_email = '' THEN
        v_errors := v_errors + 1;
        v_error_log := v_error_log || jsonb_build_object(
          'excel_row', v_excel_row,
          'error', 'participant_email vazio'
        );
        CONTINUE;
      END IF;

      SELECT id INTO v_participant_id
      FROM participants
      WHERE email = v_email AND edition_id = p_edition_id;

      IF v_participant_id IS NULL THEN
        v_errors := v_errors + 1;
        v_error_log := v_error_log || jsonb_build_object(
          'excel_row', v_excel_row,
          'email', v_email,
          'error', 'Participant não encontrado para (email, edition_id)'
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
