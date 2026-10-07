// Importa a planilha de classificação de LPs (aba "Classificação": Empresa +
// Subcategoria (EN)) direto para lp_company_categories, via service role key.
// PRÉ-REQUISITO: migration 029_add_lp_subcategory_taxonomy.sql já aplicada no
// banco (cria o enum lp_subcategory e a coluna subcategory) — sem isso o
// upsert falha porque a coluna/tipo ainda não existem.
//
// Uso: node scripts/import-lp-classifications.mjs <arquivo.xlsx>
import ExcelJS from 'exceljs'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const srcPath = process.argv[2]
if (!srcPath) {
  console.error('Uso: node scripts/import-lp-classifications.mjs <arquivo.xlsx>')
  process.exit(1)
}

// .env.local não é carregado automaticamente fora do Next.js — parse manual.
function loadEnvLocal() {
  const text = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1')
  }
}
loadEnvLocal()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não encontrados em .env.local')
  process.exit(1)
}

// Mesma normalização de lib/data.ts normalizeCompanyKey() — precisa bater
// exatamente com o que o app usa, senão a empresa vira uma linha duplicada.
function normalizeCompanyKey(raw) {
  return raw
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[‐-―]/g, '-')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*\/\s*/g, '/')
}

// Rótulo "Subcategoria (EN)" da planilha de taxonomia → enum lp_subcategory.
const EN_TO_ENUM = {
  'Corporate Pension': 'CORPORATE_PENSION',
  'Public Pension Fund': 'PUBLIC_PENSION_FUND',
  'Union Pension Fund': 'UNION_PENSION_FUND',
  'Family Office (Single)': 'FAMILY_OFFICE_SINGLE',
  'Family Office (Multi)': 'FAMILY_OFFICE_MULTI',
  'Direct Investment': 'DIRECT_INVESTMENT',
  'Fund of Funds': 'FUND_OF_FUNDS',
  'Insurance Company': 'INSURANCE_COMPANY',
  'Mutual Fund Company': 'MUTUAL_FUND_COMPANY',
  'Private Investment Fund': 'PRIVATE_INVESTMENT_FUND',
  'Real Estate Investment Company': 'REAL_ESTATE_INVESTMENT_COMPANY',
  'Secondary LP': 'SECONDARY_LP',
  'Economic Development Agency': 'ECONOMIC_DEVELOPMENT_AGENCY',
  'Endowment': 'ENDOWMENT',
  'University (Non-Endowment)': 'UNIVERSITY_NON_ENDOWMENT',
  'Foundation': 'FOUNDATION',
  'Government Agency': 'GOVERNMENT_AGENCY',
  'Sovereign Wealth Fund': 'SOVEREIGN_WEALTH_FUND',
  'Discretionary Advisor': 'DISCRETIONARY_ADVISOR',
  'Investment Advisor': 'INVESTMENT_ADVISOR',
  'Money Management Firm': 'MONEY_MANAGEMENT_FIRM',
  'Wealth Management Firm': 'WEALTH_MANAGEMENT_FIRM',
  'Placement Agent / Capital Advisory': 'PLACEMENT_AGENT',
  'Placement Agent': 'PLACEMENT_AGENT',
  'Banking Institution': 'BANKING_INSTITUTION',
  'Corporation': 'CORPORATION',
  'High-net-worth investor': 'HIGH_NET_WORTH_INVESTOR',
  'Other Limited Partner': 'OTHER_LIMITED_PARTNER',
}

function cellText(v) {
  if (v && typeof v === 'object' && 'text' in v) return v.text
  return v === undefined || v === null ? '' : String(v)
}

async function main() {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(srcPath)
  const ws = wb.getWorksheet('Classificação')
  if (!ws) throw new Error('Aba "Classificação" não encontrada na planilha.')

  const rows = []
  const skipped = []
  for (let r = 4; r <= ws.rowCount; r++) {
    const values = (ws.getRow(r).values ?? []).slice(1)
    if (values.every(v => v === null || v === undefined || cellText(v).trim() === '')) continue

    const displayName = cellText(values[0]).trim()
    const subcategoryEn = cellText(values[5]).trim()
    if (!displayName || !subcategoryEn) continue

    const enumValue = EN_TO_ENUM[subcategoryEn]
    if (!enumValue) {
      skipped.push({ displayName, subcategoryEn })
      continue
    }

    rows.push({
      company_key: normalizeCompanyKey(displayName),
      display_name: displayName,
      subcategory: enumValue,
      updated_at: new Date().toISOString(),
    })
  }

  console.log('Linhas prontas para upsert:', rows.length)
  if (skipped.length > 0) {
    console.warn(`AVISO: ${skipped.length} linha(s) com subcategoria não reconhecida:`, skipped)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const { error, count } = await supabase
    .from('lp_company_categories')
    .upsert(rows, { onConflict: 'company_key', count: 'exact' })

  if (error) {
    console.error('Falha no upsert:', error.message)
    process.exit(1)
  }
  console.log('Upsert concluído. Linhas afetadas:', count)
}

main()
