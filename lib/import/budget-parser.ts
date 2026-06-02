import ExcelJS from 'exceljs'

export interface BudgetRow {
  category: string
  subcategory: string | null
  budgeted: number
  realized: number
  sort_order: number
}

function parseNumber(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const cleaned = v.replace(/[R$\s.]/g, '').replace(',', '.')
    const n = parseFloat(cleaned)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function str(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

/** Parses a budget .xlsx and returns rows. Header detected by known column names. */
export async function parseBudgetExcel(buffer: ArrayBuffer): Promise<BudgetRow[]> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer)
  const ws = wb.worksheets[0]
  if (!ws) throw new Error('Planilha vazia ou inválida.')

  // Find header row (first row containing at least "orçado" or "orcado" or "budget")
  let headerRowIdx = -1
  let colCategory = -1
  let colSubcategory = -1
  let colBudgeted = -1
  let colRealized = -1

  for (let r = 1; r <= Math.min(5, ws.rowCount); r++) {
    const vals = (ws.getRow(r).values as Array<unknown>).slice(1)
    const normalized = vals.map(v => str(v).toLowerCase())
    const hasBudget = normalized.some(h =>
      h.includes('orçado') || h.includes('orcado') || h.includes('budget') || h.includes('previsto')
    )
    if (!hasBudget) continue

    headerRowIdx = r
    for (let i = 0; i < normalized.length; i++) {
      const h = normalized[i]
      if (colCategory < 0 && (h.includes('categoria') || h.includes('category') || h.includes('item') || h.includes('descrição') || h.includes('descricao'))) {
        colCategory = i
      } else if (colSubcategory < 0 && (h.includes('subcategoria') || h.includes('subcategory') || h.includes('sub'))) {
        colSubcategory = i
      } else if (colBudgeted < 0 && (h.includes('orçado') || h.includes('orcado') || h.includes('budget') || h.includes('previsto'))) {
        colBudgeted = i
      } else if (colRealized < 0 && (h.includes('realizado') || h.includes('realized') || h.includes('real') || h.includes('executado'))) {
        colRealized = i
      }
    }
    break
  }

  if (headerRowIdx < 0) throw new Error('Cabeçalho não reconhecido. A planilha precisa ter colunas "Categoria", "Orçado" e "Realizado".')
  if (colCategory < 0) throw new Error('Coluna "Categoria" não encontrada.')
  if (colBudgeted < 0) throw new Error('Coluna "Orçado" não encontrada.')
  if (colRealized < 0) throw new Error('Coluna "Realizado" não encontrada.')

  const rows: BudgetRow[] = []
  let sortOrder = 0

  for (let r = headerRowIdx + 1; r <= ws.rowCount; r++) {
    const vals = (ws.getRow(r).values as Array<unknown>).slice(1)
    const category = str(vals[colCategory])
    if (!category) continue

    rows.push({
      category,
      subcategory: colSubcategory >= 0 ? str(vals[colSubcategory]) || null : null,
      budgeted: parseNumber(vals[colBudgeted]),
      realized: parseNumber(vals[colRealized]),
      sort_order: sortOrder++,
    })
  }

  if (rows.length === 0) throw new Error('Nenhuma linha de dados encontrada na planilha.')
  return rows
}
