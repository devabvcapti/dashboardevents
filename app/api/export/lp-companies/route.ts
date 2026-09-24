import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { requireAdmin } from '@/lib/auth'
import { getLpAnalysis, LP_CATEGORY_LABELS } from '@/lib/data'
import { getActiveEdition } from '@/lib/edition-cookie'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  let edition: Awaited<ReturnType<typeof getActiveEdition>>
  try { edition = await getActiveEdition() } catch {
    return NextResponse.json({ error: 'Nenhuma edição ativa.' }, { status: 400 })
  }

  let analysis: Awaited<ReturnType<typeof getLpAnalysis>>
  try { analysis = await getLpAnalysis(edition.id) } catch (err) {
    return NextResponse.json({ error: 'Falha ao buscar empresas LP', details: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Dashboard ABVCAP'
  wb.created = new Date()
  const ws = wb.addWorksheet('Empresas LP')

  ws.columns = [
    { header: 'Empresa', key: 'company', width: 40 },
    { header: 'Subcategoria', key: 'category', width: 26 },
    { header: 'Participantes', key: 'count', width: 14 },
  ]
  ws.getRow(1).font = { bold: true }
  ws.getRow(1).alignment = { vertical: 'middle' }

  for (const c of analysis.companies) {
    ws.addRow({
      company: c.displayName,
      category: c.category ? LP_CATEGORY_LABELS[c.category] : 'Não classificada',
      count: c.participantCount,
    })
  }

  const buffer = await wb.xlsx.writeBuffer()
  const editionName = edition.name.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 60) || 'evento'
  const filename = `lps-${editionName}.xlsx`

  return new NextResponse(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'no-store',
    },
  })
}
