import { NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { requireAdmin } from '@/lib/auth'
import {
  parseExcelMetadata,
  parseExcelRows,
} from '@/lib/import/excel-parser'
import { ParticipantRowSchema } from '@/lib/import/zod-schemas'
import type { ColumnMapping, PreviewResponse, ValidationResult } from '@/lib/import/types'

export const runtime = 'nodejs' // exceljs requires Node, não Edge
export const dynamic = 'force-dynamic'

const MAX_BYTES = 20 * 1024 * 1024 // 20 MB

// In-memory store de previews pendentes; serverToken → { rows, filename, expires }.
// É aceitável apenas porque o Plan 04 (commit) lê isso na MESMA instância dentro de minutos.
// TODO v2: persistir em Redis ou import_jobs PENDING.
type StoredPreview = {
  rows: PreviewResponse['validation']['validRows']
  filename: string
  expiresAt: number
}
declare global {
  // eslint-disable-next-line no-var
  var __importPreviewStore: Map<string, StoredPreview> | undefined
}
globalThis.__importPreviewStore ??= new Map()
const STORE = globalThis.__importPreviewStore

const TTL_MS = 15 * 60 * 1000 // 15 min

function cleanupExpired() {
  const now = Date.now()
  for (const [k, v] of STORE.entries()) {
    if (v.expiresAt < now) STORE.delete(k)
  }
}

export async function POST(req: Request) {
  // 1. Auth — middleware já garantiu admin, mas defense-in-depth
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  cleanupExpired()

  // 2. Parse multipart
  const contentType = req.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
    return NextResponse.json(
      { error: 'Content-Type deve ser multipart/form-data.' },
      { status: 400 }
    )
  }

  const form = await req.formData().catch(() => null)
  if (!form) {
    return NextResponse.json({ error: 'Falha ao ler form-data.' }, { status: 400 })
  }

  const file = form.get('file')
  const mappingOverrideRaw = form.get('mapping') // optional, JSON string from step 2 of UI

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'Campo "file" ausente ou inválido.' },
      { status: 400 }
    )
  }

  if (file.size === 0) {
    return NextResponse.json({ error: 'Arquivo vazio.' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Arquivo excede limite de ${MAX_BYTES / 1024 / 1024} MB.` },
      { status: 413 }
    )
  }

  const buffer = await file.arrayBuffer()
  // 3. Magic bytes — .xlsx é zip (PK\x03\x04)
  const head = new Uint8Array(buffer.slice(0, 4))
  if (head[0] !== 0x50 || head[1] !== 0x4b || head[2] !== 0x03 || head[3] !== 0x04) {
    return NextResponse.json(
      { error: 'Arquivo não é um .xlsx válido (assinatura inválida).' },
      { status: 400 }
    )
  }

  // 4. Parse metadata + detect header
  let parseResult
  try {
    parseResult = await parseExcelMetadata(buffer)
    parseResult.filename = file.name
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Falha ao parsear Excel.' },
      { status: 400 }
    )
  }

  // 5. Determinar mapping efetivo (default ou override do admin)
  let mapping: ColumnMapping = parseResult.detectedMapping
  if (typeof mappingOverrideRaw === 'string' && mappingOverrideRaw.length > 0) {
    try {
      mapping = JSON.parse(mappingOverrideRaw) as ColumnMapping
    } catch {
      return NextResponse.json(
        { error: 'Mapping override inválido (JSON malformado).' },
        { status: 400 }
      )
    }
  }

  // 6. Parse rows + apply mapping
  const rawValidation = await parseExcelRows(buffer, mapping, parseResult.headerRowIndex)

  // 7. Validar cada linha com Zod safeParse — coleta TODOS os erros
  const validRows: ValidationResult['validRows'] = []
  const errors: ValidationResult['errors'] = [...rawValidation.errors]

  for (const row of rawValidation.validRows) {
    const result = ParticipantRowSchema.safeParse(row)
    if (result.success) {
      validRows.push(result.data)
    } else {
      for (const issue of result.error.issues) {
        errors.push({
          excel_row: row.excel_row,
          field: issue.path.join('.') || null,
          message: `Linha ${row.excel_row}: ${issue.message}`,
        })
      }
    }
  }

  // 8. Armazenar para o commit (Plan 04)
  const serverToken = randomBytes(16).toString('hex')
  STORE.set(serverToken, {
    rows: validRows,
    filename: file.name,
    expiresAt: Date.now() + TTL_MS,
  })

  const response: PreviewResponse = {
    parseResult,
    validation: { validRows, errors },
    serverToken,
  }
  return NextResponse.json(response, { status: 200 })
}

/** Exportado para Plan 04 consumir via import direto (mesmo processo). */
export function consumePreview(serverToken: string): StoredPreview | null {
  cleanupExpired()
  const v = STORE.get(serverToken)
  if (!v) return null
  STORE.delete(serverToken)
  return v
}
