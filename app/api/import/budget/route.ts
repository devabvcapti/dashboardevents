import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getSupabase } from '@/lib/supabase'
import { parseBudgetExcel } from '@/lib/import/budget-parser'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BYTES = 10 * 1024 * 1024

export async function POST(req: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'Falha ao ler form-data.' }, { status: 400 })

  const file = form.get('file')
  const editionId = form.get('editionId')

  if (!(file instanceof File)) return NextResponse.json({ error: 'Campo "file" ausente.' }, { status: 400 })
  if (typeof editionId !== 'string' || !editionId) return NextResponse.json({ error: 'editionId ausente.' }, { status: 400 })
  if (file.size === 0) return NextResponse.json({ error: 'Arquivo vazio.' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Arquivo excede 10 MB.' }, { status: 413 })

  const buffer = await file.arrayBuffer()

  let rows
  try {
    rows = await parseBudgetExcel(buffer)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro ao parsear planilha.' }, { status: 400 })
  }

  const supabase = getSupabase()

  // Replace: delete existing budget for edition, then insert new
  const { error: delErr } = await supabase
    .from('budget_items')
    .delete()
    .eq('edition_id', editionId)

  if (delErr) return NextResponse.json({ error: `Erro ao limpar orçamento anterior: ${delErr.message}` }, { status: 500 })

  const { error: insErr } = await supabase
    .from('budget_items')
    .insert(rows.map(r => ({ ...r, edition_id: editionId })))

  if (insErr) return NextResponse.json({ error: `Erro ao inserir itens: ${insErr.message}` }, { status: 500 })

  return NextResponse.json({ inserted: rows.length }, { status: 200 })
}
