import { NextResponse } from 'next/server'
import { z } from 'zod'
import ExcelJS from 'exceljs'
import { requireAdmin } from '@/lib/auth'
import { getSupabase } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const QuerySchema = z.object({
  event_slug: z.string().max(100).optional(),
  survey_slug: z.string().max(100).optional(),
})

const SURVEY_TITLES: Record<string, string> = {
  participantes: 'Participantes',
  'participantes-vcday': 'Participantes VC Day',
  'painelistas-moderadores': 'Painelistas e Moderadores',
  patrocinadores: 'Patrocinadores e Apoiadores',
  'women-connection': 'Women Connection',
}

export async function GET(req: Request) {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  const url = new URL(req.url)
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Parâmetros inválidos', details: parsed.error.issues }, { status: 400 })
  }

  let query = getSupabase()
    .from('vcday_nps_responses')
    .select('survey_slug, event_slug, answers')
  if (parsed.data.event_slug) query = query.eq('event_slug', parsed.data.event_slug)
  if (parsed.data.survey_slug) query = query.eq('survey_slug', parsed.data.survey_slug)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Falha ao buscar respostas', details: error.message }, { status: 500 })

  const rows = (data ?? []) as { survey_slug: string; event_slug: string; answers: Record<string, unknown> }[]

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Dashboard ABVCAP'
  wb.created = new Date()
  const ws = wb.addWorksheet('Contatos NPS')

  ws.columns = [
    { header: 'Nome', key: 'name', width: 32 },
    { header: 'Email', key: 'email', width: 32 },
    { header: 'Pesquisa', key: 'survey', width: 24 },
    { header: 'Evento', key: 'event', width: 18 },
  ]
  ws.getRow(1).font = { bold: true }
  ws.getRow(1).alignment = { vertical: 'middle' }

  for (const r of rows) {
    const name = typeof r.answers.nome === 'string' ? r.answers.nome.trim() : ''
    const email = typeof r.answers.email === 'string' ? r.answers.email.trim() : ''
    if (!name && !email) continue
    ws.addRow({
      name,
      email,
      survey: SURVEY_TITLES[r.survey_slug] ?? r.survey_slug,
      event: r.event_slug,
    })
  }

  const buffer = await wb.xlsx.writeBuffer()
  const suffix = [parsed.data.event_slug, parsed.data.survey_slug].filter(Boolean).join('-') || 'todos'
  const filename = `contatos-nps-${suffix}.xlsx`

  return new NextResponse(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'no-store',
    },
  })
}
