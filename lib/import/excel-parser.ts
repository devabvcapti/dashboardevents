import ExcelJS from 'exceljs'
import { KNOWN_HEADERS, MIN_HEADER_SCORE, scoreHeader } from './known-headers'
import { decodeHtmlEntities, sanitizeFormulaInjection, normalizeCpf } from './sanitize'
import { normalizeCompanySegment } from './segment-mapper'
import type { ColumnMapping, ParticipantRow, ParseResult, TargetField, ValidationResult } from './types'

/** Lê o buffer .xlsx e retorna ParseResult (metadata sem aplicar mapping). */
export async function parseExcelMetadata(buffer: ArrayBuffer): Promise<ParseResult> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer)
  const ws =
    wb.getWorksheet('Evento_Lista de participantes') ?? wb.worksheets[0]
  if (!ws) throw new Error('Planilha vazia ou inválida.')

  // Achata merged cells (ExcelJS já preenche o valor master nos slaves após load).
  // Scoring das primeiras 5 linhas vs KNOWN_HEADERS.
  let bestIndex = 0
  let bestScore = 0
  for (let i = 1; i <= Math.min(5, ws.rowCount); i++) {
    const values = (ws.getRow(i).values as Array<string | number | null>).slice(1)
    const s = scoreHeader(values.map((v) => (typeof v === 'string' ? v : String(v ?? ''))))
    if (s > bestScore) {
      bestScore = s
      bestIndex = i - 1
    }
  }
  if (bestScore < MIN_HEADER_SCORE) {
    throw new Error(
      `Cabeçalho não reconhecido como export ABVCAP (score ${bestScore}/${KNOWN_HEADERS.length} < ${MIN_HEADER_SCORE}).`
    )
  }

  const headerRow1Raw = (ws.getRow(bestIndex + 1).values as Array<string | null>).slice(1)
  const headerRow2Raw = (ws.getRow(bestIndex + 2).values as Array<string | null>).slice(1)
  const headerRow1 = headerRow1Raw.map((v) => decodeHtmlEntities(String(v ?? '')))
  const headerRow2 = headerRow2Raw.map((v) => decodeHtmlEntities(String(v ?? '')))

  const detectedMapping = buildDefaultMapping(headerRow1)

  return {
    filename: '', // caller sets
    headerRowIndex: bestIndex,
    headerScore: bestScore,
    detectedMapping,
    rawHeaders: { row1: headerRow1, row2: headerRow2 },
    totalRows: Math.max(0, ws.rowCount - (bestIndex + 2)),
  }
}

/** Mapping padrão derivado do CONTEXT.md (col→field). 0-based col index. */
export function buildDefaultMapping(headerRow1: string[]): ColumnMapping {
  // Os índices abaixo são 0-based dentro de headerRow1 (que já é .slice(1) — coluna A = index 0).
  // Conferir CONTEXT.md tabela de mapeamento de colunas críticas.
  const map: ColumnMapping = {}
  // Tentar identificar por header (mais robusto que índice fixo, mas CONTEXT.md fixa as posições):
  const fixed: Array<[number, TargetField | 'ignore']> = [
    [0, 'ticket_id'],
    [1, 'ignore'],          // ID do contato
    [2, 'full_name'],       // Primeiro nome (concat with col 3 no parsing)
    [3, 'ignore'],          // Último nome (consumido junto com col 2 — marcamos ignore aqui, parser trata especial)
    [4, 'company'],
    [5, 'job_title'],
    [6, 'email'],
    [7, 'ignore'],          // Foto de perfil
    [8, 'cpf'],
    [9, 'phone'],
    [10, 'company_segment_raw'],
    [11, 'ignore'],         // LinkedIn
  ]
  for (const [idx, field] of fixed) map[idx] = field
  // Multi-select groups (cols 12-22, 23-25, 26-29, 30-34 em 0-based; CONTEXT usa 1-based 13-23, 24-26, 27-30, 31-35)
  for (let i = 12; i <= 22; i++) map[i] = 'topics_of_interest'
  for (let i = 23; i <= 25; i++) map[i] = 'interested_in_events'
  for (let i = 26; i <= 29; i++) map[i] = 'preferred_channels'
  for (let i = 30; i <= 34; i++) map[i] = 'content_interests'
  map[35] = 'ignore'    // networking_interest
  map[36] = 'dietary_restrictions'
  map[37] = 'dietary_details'
  // Mark cols 38+ as ignore by default; header scan below overrides booking fields
  for (let i = 38; i < Math.max(headerRow1.length, 70); i++) map[i] = 'ignore'

  // Header-based detection — has precedence over fixed indices for all booking fields
  for (let i = 0; i < headerRow1.length; i++) {
    const h = headerRow1[i]?.toLowerCase().trim() ?? ''
    if (h === 'membro ativo') {
      map[i] = 'ticket_membership'
    } else if (h === 'empresa é membro' || h === 'empresa e membro') {
      map[i] = 'is_company_member'
    } else if (h === 'nome do ingresso') {
      map[i] = 'ticket_name'
    } else if (h === 'preço do ingresso' || h === 'preco do ingresso' || h === 'valor do ingresso') {
      map[i] = 'ticket_value'
    } else if (h === 'status do pagamento' || h === 'status pagamento') {
      map[i] = 'payment_status'
    } else if (
      h === 'cupom' || h === 'código do cupom' || h === 'codigo do cupom' ||
      h === 'coupon' || h === 'coupon code' || h === 'código de desconto' ||
      h === 'promo code' || h === 'código promocional' || h === 'nome do desconto'
    ) {
      map[i] = 'coupon_code'
    }
  }

  return map
}

/**
 * Aplica a mapping (possivelmente editada pelo admin) e produz ParticipantRows + validation errors.
 * NÃO escreve no banco. Plan 04 fará o commit.
 */
export async function parseExcelRows(
  buffer: ArrayBuffer,
  mapping: ColumnMapping,
  headerRowIndex: number
): Promise<ValidationResult> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer)
  const ws = wb.getWorksheet('Evento_Lista de participantes') ?? wb.worksheets[0]
  if (!ws) return { validRows: [], errors: [{ excel_row: 0, field: null, message: 'Planilha vazia.' }] }

  const headerRow2Raw = (ws.getRow(headerRowIndex + 2).values as Array<string | null>).slice(1)
  const headerRow2 = headerRow2Raw.map((v) => decodeHtmlEntities(String(v ?? '')))

  const validRows: ParticipantRow[] = []
  const errors: ValidationResult['errors'] = []

  const dataStartRow = headerRowIndex + 3 // 1-based row index in ExcelJS
  for (let r = dataStartRow; r <= ws.rowCount; r++) {
    const row = ws.getRow(r)
    const values = (row.values as Array<string | number | boolean | Date | null>).slice(1)
    if (values.every((v) => v === null || v === '' || v === undefined)) continue

    try {
      const built = buildRow(values, mapping, headerRow2, r)
      validRows.push(built)
    } catch (e) {
      errors.push({
        excel_row: r,
        field: null,
        message: e instanceof Error ? e.message : 'Erro desconhecido ao parsear linha',
      })
    }
  }

  return { validRows, errors }
}

function buildRow(
  values: Array<string | number | boolean | Date | null>,
  mapping: ColumnMapping,
  headerRow2: string[],
  excelRow: number
): ParticipantRow {
  function cell(idx: number): string | number | boolean | Date | null {
    return values[idx] ?? null
  }
  function str(v: string | number | boolean | Date | null): string {
    if (v === null || v === undefined) return ''
    const s = typeof v === 'string' ? v : v instanceof Date ? v.toISOString() : String(v)
    return sanitizeFormulaInjection(s).trim()
  }

  // Nome: concat col 2+3 (Primeiro + Último). Mapping fixa col 2 como full_name e col 3 como ignore.
  const firstName = str(cell(2))
  const lastName = str(cell(3))
  const full_name = [firstName, lastName].filter(Boolean).join(' ').trim()
  if (!full_name) throw new Error('Nome ausente (colunas 3+4)')

  const email = str(cell(6)).toLowerCase()
  if (!email) throw new Error('Email ausente (coluna 7)')

  // Multi-selects: para cada coluna do grupo, se valor === "x" (case-insensitive), pegar headerRow2[idx]
  function collectMulti(_target: string[], field: string): string[] {
    const out: string[] = []
    for (const [k, v] of Object.entries(mapping)) {
      if (v !== field) continue
      const idx = Number(k)
      const cellValue = cell(idx)
      const mark = (typeof cellValue === 'string' ? cellValue.trim().toLowerCase() : '')
      if (mark === 'x') {
        const label = decodeHtmlEntities(headerRow2[idx] ?? '').trim()
        if (label) out.push(label)
      }
    }
    return out
  }

  function findCol(field: TargetField): number | null {
    for (const [k, v] of Object.entries(mapping)) {
      if (v === field) return Number(k)
    }
    return null
  }

  const membershipCol = findCol('ticket_membership')
  const membershipRaw = membershipCol !== null ? str(cell(membershipCol)).toLowerCase() : ''
  const ticket_membership: 'MEMBRO' | 'NAO_MEMBRO' =
    membershipRaw === 'sim' ? 'MEMBRO'
    : membershipRaw === 'não' || membershipRaw === 'nao' ? 'NAO_MEMBRO'
    : (() => { throw new Error(`Valor inválido em "Membro ativo": "${membershipRaw}"`) })()

  const cmCol = findCol('is_company_member')
  const cmRaw = cmCol !== null ? str(cell(cmCol)).toLowerCase() : ''
  const is_company_member: boolean | null =
    cmRaw === 'sim' ? true : (cmRaw === 'não' || cmRaw === 'nao') ? false : null

  const tvCol = findCol('ticket_value')
  const tvRaw = tvCol !== null ? cell(tvCol) : null
  const ticket_value: number | null =
    typeof tvRaw === 'number' && Number.isFinite(tvRaw) ? tvRaw
    : typeof tvRaw === 'string' && tvRaw.trim() !== ''
      ? (() => { const n = parseFloat(tvRaw.replace(',', '.')); return Number.isFinite(n) ? n : null })()
    : null

  const company_segment_raw = str(cell(10)) || null
  const company_segment_normalized = normalizeCompanySegment(company_segment_raw)

  const dietRaw = str(cell(36)).toLowerCase()
  const dietary_restrictions: 'Sim' | 'Não' | null =
    dietRaw === 'sim' ? 'Sim' : (dietRaw === 'não' || dietRaw === 'nao') ? 'Não' : null

  // ticket_name e coupon_code: colunas detectadas dinamicamente por header
  let ticket_name: string | null = null
  let coupon_code: string | null = null
  for (const [k, v] of Object.entries(mapping)) {
    if (v === 'ticket_name') ticket_name = str(cell(Number(k))) || null
    if (v === 'coupon_code') coupon_code = str(cell(Number(k))) || null
  }

  return {
    excel_row: excelRow,
    ticket_id: str(cell(0)) || null,
    full_name,
    email,
    company: str(cell(4)) || null,
    job_title: str(cell(5)) || null,
    cpf: normalizeCpf(cell(8)),
    phone: cell(9) !== null && cell(9) !== '' ? String(cell(9)) : null,
    company_segment_raw,
    company_segment_normalized,
    is_company_member,
    ticket_membership,
    ticket_name,
    coupon_code,
    ticket_value,
    payment_status: (() => { const c = findCol('payment_status'); return c !== null ? str(cell(c)) || null : null })(),
    topics_of_interest: collectMulti([], 'topics_of_interest'),
    interested_in_events: collectMulti([], 'interested_in_events'),
    preferred_channels: collectMulti([], 'preferred_channels'),
    content_interests: collectMulti([], 'content_interests'),
    dietary_restrictions,
    dietary_details: str(cell(37)) || null,
  }
}
