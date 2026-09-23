import ExcelJS from 'exceljs'
import { normalizeCompanyKey, parseLpCategoryText, isSkippedLpMasterCategoryText } from '@/lib/data'
import type { LpMasterUploadRow } from '@/lib/data'

const NAME_HEADER_ALIASES = ['empresa', 'nome', 'company', 'name', 'razao social', 'razão social', 'investidor']
const CATEGORY_HEADER_ALIASES = ['categoria', 'category', 'subcategoria', 'tipo']
const COUNTRY_HEADER_ALIASES = ['pais', 'país', 'country']

export interface LpMasterParseResult {
  rows: LpMasterUploadRow[]
  totalRows: number
  unrecognizedCategories: string[]
  skippedRows: number
}

function findColumn(headers: string[], aliases: string[]): number {
  return headers.findIndex(h => aliases.includes(normalizeCompanyKey(h)))
}

/**
 * Lê a planilha mestre de LPs — layout livre, colunas detectadas por texto do
 * cabeçalho (não posição fixa). Espera uma coluna de nome de empresa e,
 * opcionalmente, categoria e país.
 */
export async function parseLpMasterFile(buffer: ArrayBuffer): Promise<LpMasterParseResult> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer)
  const ws = wb.worksheets[0]
  if (!ws) throw new Error('Planilha vazia ou inválida.')

  const headerRow = (ws.getRow(1).values as Array<string | number | null>).slice(1)
    .map(v => String(v ?? '').trim())

  const nameIdx = findColumn(headerRow, NAME_HEADER_ALIASES)
  if (nameIdx === -1) {
    throw new Error(
      `Coluna com o nome da empresa não encontrada. Cabeçalhos esperados: ${NAME_HEADER_ALIASES.join(', ')}.`
    )
  }
  const categoryIdx = findColumn(headerRow, CATEGORY_HEADER_ALIASES)
  const countryIdx = findColumn(headerRow, COUNTRY_HEADER_ALIASES)

  const rows: LpMasterUploadRow[] = []
  const unrecognizedCategories = new Set<string>()
  let totalRows = 0
  let skippedRows = 0

  for (let r = 2; r <= ws.rowCount; r++) {
    const values = (ws.getRow(r).values as Array<string | number | null>).slice(1)
    if (values.every(v => v === null || v === undefined || String(v).trim() === '')) continue
    totalRows++

    const displayName = String(values[nameIdx] ?? '').trim()
    if (!displayName) continue

    let category = null
    if (categoryIdx !== -1) {
      const rawCategory = String(values[categoryIdx] ?? '').trim()
      if (rawCategory) {
        // Categorias fora do universo de LP (ex. Universidades, A revisar) — a linha
        // inteira não entra na base mestre, não é só "sem subcategoria".
        if (isSkippedLpMasterCategoryText(rawCategory)) {
          skippedRows++
          continue
        }
        category = parseLpCategoryText(rawCategory)
        if (!category) unrecognizedCategories.add(rawCategory)
      }
    }

    const country = countryIdx !== -1 ? (String(values[countryIdx] ?? '').trim() || null) : null

    rows.push({ displayName, category, country })
  }

  return { rows, totalRows, unrecognizedCategories: Array.from(unrecognizedCategories), skippedRows }
}
