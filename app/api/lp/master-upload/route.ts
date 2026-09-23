import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { replaceLpMasterList } from '@/lib/data'
import { parseLpMasterFile } from '@/lib/import/lp-master-parser'

export const runtime = 'nodejs' // exceljs requires Node, não Edge
export const dynamic = 'force-dynamic'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

export async function POST(req: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const contentType = req.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
    return NextResponse.json({ error: 'Content-Type deve ser multipart/form-data.' }, { status: 400 })
  }

  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'Falha ao ler form-data.' }, { status: 400 })

  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Campo "file" ausente ou inválido.' }, { status: 400 })
  }
  if (file.size === 0) return NextResponse.json({ error: 'Arquivo vazio.' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Arquivo maior que 10 MB.' }, { status: 400 })

  const buffer = await file.arrayBuffer()

  let parsed: Awaited<ReturnType<typeof parseLpMasterFile>>
  try {
    parsed = await parseLpMasterFile(buffer)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Falha ao ler a planilha.' }, { status: 400 })
  }

  if (parsed.rows.length === 0) {
    return NextResponse.json({ error: 'Nenhuma linha válida encontrada na planilha.' }, { status: 400 })
  }

  try {
    const { inserted } = await replaceLpMasterList(parsed.rows)
    return NextResponse.json({
      ok: true,
      totalRows: parsed.totalRows,
      inserted,
      unrecognizedCategories: parsed.unrecognizedCategories,
      skippedRows: parsed.skippedRows,
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Falha ao salvar a planilha mestre.' }, { status: 500 })
  }
}
