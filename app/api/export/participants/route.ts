import { NextResponse } from 'next/server'
import { z } from 'zod'
import ExcelJS from 'exceljs'
import { requireAdmin } from '@/lib/auth'
import { getParticipantsForExport } from '@/lib/data'
import { getActiveEditionId } from '@/lib/edition-cookie'
import { getSupabase } from '@/lib/supabase'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const QuerySchema = z.object({
  search: z.string().max(200).optional(),
  membership: z.enum(['MEMBRO', 'NAO_MEMBRO']).optional(),
  segment: z.enum(['GP', 'LP', 'FUNDO', 'CORPORATIVO', 'GOVERNO', 'ACADEMIA', 'OUTRO']).optional(),
  state: z.string().regex(/^[A-Z]{2}$/).optional(),
  min_value: z.coerce.number().optional(),
  max_value: z.coerce.number().optional(),
})

const SEGMENT_LABELS: Record<string, string> = {
  GP: 'Gestora de PE/VC',
  LP: 'Investidor (LP)',
  FUNDO: 'Fundo de Pensão',
  CORPORATIVO: 'Corporativo',
  GOVERNO: 'Governo',
  ACADEMIA: 'Academia',
  OUTRO: 'Outro',
}

export async function GET(req: Request) {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  let editionId: string
  try { editionId = await getActiveEditionId() } catch {
    return NextResponse.json({ error: 'Nenhuma edição ativa.' }, { status: 400 })
  }

  const url = new URL(req.url)
  const raw = Object.fromEntries(url.searchParams.entries())
  const parsed = QuerySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Parâmetros inválidos', details: parsed.error.issues }, { status: 400 })
  }

  // Buscar nome do evento para o filename
  let editionName = 'evento'
  let editionYear = ''
  try {
    const { data } = await getSupabase()
      .from('editions')
      .select('name, year')
      .eq('id', editionId)
      .single()
    if (data) {
      editionName = String(data.name).replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 60) || 'evento'
      editionYear = String(data.year)
    }
  } catch { /* fallback aceitável */ }

  let rows: Awaited<ReturnType<typeof getParticipantsForExport>>
  try {
    rows = await getParticipantsForExport({
      editionId,
      search: parsed.data.search,
      membership: parsed.data.membership,
      segment: parsed.data.segment,
      state: parsed.data.state,
      minValue: parsed.data.min_value,
      maxValue: parsed.data.max_value,
    })
  } catch (err) {
    return NextResponse.json({ error: 'Falha ao buscar participantes', details: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Dashboard ABVCAP'
  wb.created = new Date()
  const ws = wb.addWorksheet('Participantes')

  ws.columns = [
    { header: 'Nome', key: 'full_name', width: 32 },
    { header: 'Email', key: 'email', width: 32 },
    { header: 'Empresa', key: 'company', width: 28 },
    { header: 'Cargo', key: 'job_title', width: 24 },
    { header: 'Tipo de Ingresso', key: 'ticket_membership', width: 16 },
    { header: 'Valor (R$)', key: 'ticket_value', width: 14 },
    { header: 'Segmento da Empresa', key: 'company_segment', width: 22 },
    { header: 'Estado', key: 'origin_state', width: 10 },
    { header: 'CPF', key: 'cpf', width: 16 },
    { header: 'Telefone', key: 'phone', width: 18 },
    { header: 'Data de Inscrição', key: 'created_at', width: 20 },
  ]

  ws.getRow(1).font = { bold: true }
  ws.getRow(1).alignment = { vertical: 'middle' }

  for (const r of rows) {
    ws.addRow({
      full_name: r.full_name,
      email: r.email,
      company: r.company ?? '',
      job_title: r.job_title ?? '',
      ticket_membership: r.ticket_membership === 'MEMBRO' ? 'Membro' : 'Não Membro',
      ticket_value: r.ticket_value ?? 0,
      company_segment: r.company_segment_normalized
        ? (SEGMENT_LABELS[r.company_segment_normalized] ?? r.company_segment_normalized)
        : (r.company_segment_raw ?? ''),
      origin_state: r.origin_state ?? '',
      cpf: r.cpf ?? '',
      phone: r.phone ?? '',
      created_at: r.created_at ? new Date(r.created_at).toLocaleString('pt-BR') : '',
    })
  }

  // Formato monetário pt-BR para coluna "Valor (R$)"
  ws.getColumn('ticket_value').numFmt = '#,##0.00'

  const buffer = await wb.xlsx.writeBuffer()
  const filename = `participantes-${editionName}${editionYear ? '-' + editionYear : ''}.xlsx`

  return new NextResponse(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
