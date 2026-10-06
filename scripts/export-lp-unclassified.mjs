// Gera um Excel com as empresas LP de uma edição que ainda não têm subcategoria
// em lp_company_categories (mesma lógica de getLpAnalysis().unclassified em lib/data.ts).
// Sai no mesmo formato da planilha de classificação original (aba "Classificação"
// + aba "Taxonomia Investidores") pra poder ser preenchida e reimportada direto
// com scripts/import-lp-classifications.mjs.
//
// Uso: node scripts/export-lp-unclassified.mjs <edition_id> <arquivo-saida.xlsx>
import ExcelJS from 'exceljs'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const editionId = process.argv[2]
const outPath = process.argv[3]
if (!editionId || !outPath) {
  console.error('Uso: node scripts/export-lp-unclassified.mjs <edition_id> <arquivo-saida.xlsx>')
  process.exit(1)
}

function loadEnvLocal() {
  const text = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1')
  }
}
loadEnvLocal()

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Mesma normalização de lib/data.ts normalizeCompanyKey().
function normalizeCompanyKey(raw) {
  return raw
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[‐-―]/g, '-')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*\/\s*/g, '/')
}

async function main() {
  const { data: ed, error: edErr } = await supabase.from('editions').select('name').eq('id', editionId).single()
  if (edErr) throw edErr

  const [{ data: participants, error: pErr }, { data: excluded, error: xErr }, { data: categories, error: cErr }] =
    await Promise.all([
      supabase.from('participants').select('company').eq('edition_id', editionId).eq('company_segment_normalized', 'LP').not('company', 'is', null).limit(5000),
      supabase.from('lp_excluded_companies').select('company_key'),
      supabase.from('lp_company_categories').select('company_key'),
    ])
  if (pErr) throw pErr
  if (xErr) throw xErr
  if (cErr) throw cErr

  const excludedKeys = new Set((excluded ?? []).map(e => e.company_key))
  const classifiedKeys = new Set((categories ?? []).map(c => c.company_key))

  const counts = new Map() // key -> { displayName, count }
  for (const row of participants ?? []) {
    const raw = row.company.trim()
    if (!raw) continue
    const key = normalizeCompanyKey(raw)
    if (excludedKeys.has(key)) continue
    const existing = counts.get(key)
    if (existing) existing.count++
    else counts.set(key, { displayName: raw, count: 1 })
  }

  const unclassified = Array.from(counts.entries())
    .filter(([key]) => !classifiedKeys.has(key))
    .map(([, v]) => v)
    .sort((a, b) => b.count - a.count)

  console.log(`Edição: ${ed.name}`)
  console.log(`Empresas LP distintas: ${counts.size} | Não classificadas: ${unclassified.length}`)

  // ─── Monta o Excel no mesmo formato da planilha de classificação original ──
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Classificação')
  ws.addRow([`LPs — ${ed.name}: empresas não classificadas`])
  ws.addRow([])
  ws.addRow(['Empresa', 'Observação', 'Participantes', 'Categoria (EN)', 'Categoria (PT)', 'Subcategoria (EN)', 'Subcategoria (PT)', 'Justificativa', 'Observação', 'Fonte'])
  for (const c of unclassified) {
    ws.addRow([c.displayName, null, c.count, null, null, null, null, null, null, null])
  }
  ws.getColumn(1).width = 45
  ws.getColumn(3).width = 14

  // Aba de referência com as 26 subcategorias válidas, copiada do arquivo original (se existir).
  try {
    const refWb = new ExcelJS.Workbook()
    await refWb.xlsx.readFile('Excel Participantes/LPs_Congresso_ABVCAP_2026_classificados.xlsx')
    const refWs = refWb.getWorksheet('Taxonomia Investidores')
    if (refWs) {
      const taxWs = wb.addWorksheet('Taxonomia Investidores')
      refWs.eachRow((row) => taxWs.addRow(row.values.slice(1)))
      taxWs.columns.forEach(col => { col.width = 28 })
    }
  } catch {
    console.warn('AVISO: não achei a planilha de referência pra copiar a aba "Taxonomia Investidores" — sem ela no arquivo de saída.')
  }

  await wb.xlsx.writeFile(outPath)
  console.log(`Arquivo gerado: ${outPath}`)
}

main()
