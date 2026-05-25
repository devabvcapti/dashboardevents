import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import { getSupabase } from '@/lib/supabase'
import { consumePreview } from '@/lib/import/preview-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CHUNK_SIZE = 500

const BodySchema = z.object({
  serverToken: z.string().min(32).max(64),
  editionYear: z.number().int().optional().default(2025),
})

export async function POST(req: Request) {
  // 1. Auth — defense-in-depth (middleware already checks, but we verify again)
  let adminUser: Awaited<ReturnType<typeof requireAdmin>>
  try {
    adminUser = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 2. Parse + validate body
  let body: z.infer<typeof BodySchema>
  try {
    const raw = await req.json()
    const parsed = BodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Payload inválido.', details: parsed.error.issues },
        { status: 400 }
      )
    }
    body = parsed.data
  } catch {
    return NextResponse.json({ error: 'JSON inválido no body.' }, { status: 400 })
  }

  // 3. Consume preview (one-time use)
  const stored = consumePreview(body.serverToken)
  if (!stored) {
    return NextResponse.json(
      { error: 'Preview não encontrado ou expirado. Faça upload novamente.' },
      { status: 404 }
    )
  }

  const supabase = getSupabase()

  // 4. Resolve edition by year
  const { data: edition, error: editionErr } = await supabase
    .from('editions')
    .select('id, year, name')
    .eq('year', body.editionYear)
    .single()

  if (editionErr || !edition) {
    return NextResponse.json(
      { error: `Edição ${body.editionYear} não encontrada.` },
      { status: 404 }
    )
  }

  // 5. INSERT import_job with PROCESSING status
  const { data: job, error: jobErr } = await supabase
    .from('import_jobs')
    .insert({
      edition_id: edition.id,
      filename: stored.filename,
      status: 'PROCESSING',
      total_rows: stored.rows.length,
      imported_by: adminUser.id,
    })
    .select('id')
    .single()

  if (jobErr || !job) {
    return NextResponse.json(
      { error: 'Falha ao criar registro de import_job.', details: jobErr?.message },
      { status: 500 }
    )
  }

  const jobId = job.id

  // 6. Process rows in chunks
  let inserted = 0
  let updated = 0
  let errors = 0
  let formInserted = 0
  let formUpdated = 0
  let formErrors = 0

  try {
    const rows = stored.rows
    for (let offset = 0; offset < rows.length; offset += CHUNK_SIZE) {
      const chunk = rows.slice(offset, offset + CHUNK_SIZE)

      // 6a. Upsert participants first
      const { data: partResult, error: partErr } = await supabase.rpc(
        'upsert_participants_batch',
        {
          p_rows: chunk as unknown as import('@/lib/database.types').Json,
          p_edition_id: edition.id,
          p_import_job_id: jobId,
        }
      )

      if (partErr) {
        throw new Error(`Erro ao inserir participantes (chunk ${offset}): ${partErr.message}`)
      }

      const pr = partResult as { inserted: number; updated: number; errors: number } | null
      if (pr) {
        inserted += pr.inserted ?? 0
        updated += pr.updated ?? 0
        errors += pr.errors ?? 0
      }

      // 6b. Upsert form responses AFTER participants in same chunk
      const formRows = chunk.map((r) => ({
        participant_email: r.email,
        excel_row: r.excel_row,
        topics_of_interest: r.topics_of_interest,
        interested_in_events: r.interested_in_events,
        preferred_channels: r.preferred_channels,
        content_interests: r.content_interests,
        dietary_restrictions: r.dietary_restrictions,
        dietary_details: r.dietary_details,
      }))

      const { data: formResult, error: formErr } = await supabase.rpc(
        'upsert_form_responses_batch',
        {
          p_rows: formRows as unknown as import('@/lib/database.types').Json,
          p_edition_id: edition.id,
        }
      )

      if (formErr) {
        throw new Error(`Erro ao inserir respostas de formulário (chunk ${offset}): ${formErr.message}`)
      }

      const fr = formResult as { inserted: number; updated: number; errors: number } | null
      if (fr) {
        formInserted += fr.inserted ?? 0
        formUpdated += fr.updated ?? 0
        formErrors += fr.errors ?? 0
      }
    }

    // 7. Mark job as COMPLETED
    await supabase
      .from('import_jobs')
      .update({
        status: 'COMPLETED',
        inserted_rows: inserted,
        updated_rows: updated,
        error_rows: errors,
        total_rows: stored.rows.length,
      })
      .eq('id', jobId)

    return NextResponse.json(
      {
        jobId,
        inserted,
        updated,
        errors,
        totalRows: stored.rows.length,
        formInserted,
        formUpdated,
        formErrors,
      },
      { status: 200 }
    )
  } catch (err) {
    // 8. Mark job as FAILED on any error
    await supabase
      .from('import_jobs')
      .update({
        status: 'FAILED',
        error_log: { message: err instanceof Error ? err.message : String(err) },
      })
      .eq('id', jobId)

    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Falha durante importação.' },
      { status: 500 }
    )
  }
}
