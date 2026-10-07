// Gera um Excel com uma aba por tema de interesse (Congresso/VC Day), listando
// nome/email/empresa de quem marcou aquele tema — pra comunicação direcionada.
// Uso: node scripts/export-topics-contacts.mjs <edition_id> <coluna: topics_of_interest|vc_day_topics> <arquivo-saida.xlsx>
import ExcelJS from 'exceljs'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const [editionId, column, outPath] = process.argv.slice(2)
if (!editionId || !column || !outPath) {
  console.error('Uso: node scripts/export-topics-contacts.mjs <edition_id> <topics_of_interest|vc_day_topics> <arquivo-saida.xlsx>')
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

function safeSheetName(name) {
  return name.replace(/[*?:/\\[\]]/g, '').slice(0, 31)
}

async function main() {
  const { data, error } = await supabase
    .from('participants')
    .select(`full_name, email, company, form_responses(${column})`)
    .eq('edition_id', editionId)
    .limit(5000)
  if (error) throw error

  const byTopic = new Map() // topic -> [{name,email,company}]
  for (const p of data) {
    const fr = Array.isArray(p.form_responses) ? p.form_responses[0] : p.form_responses
    if (!fr) continue
    for (const topic of fr[column] ?? []) {
      if (!byTopic.has(topic)) byTopic.set(topic, [])
      byTopic.get(topic).push({ name: p.full_name, email: p.email, company: p.company })
    }
  }

  const sortedTopics = [...byTopic.entries()].sort((a, b) => b[1].length - a[1].length)

  const wb = new ExcelJS.Workbook()

  const summary = wb.addWorksheet('Resumo')
  summary.addRow(['Tema', 'Respostas'])
  for (const [topic, people] of sortedTopics) summary.addRow([topic, people.length])
  summary.getColumn(1).width = 50
  summary.getColumn(2).width = 12

  const usedNames = new Set()
  for (const [topic, people] of sortedTopics) {
    let sheetName = safeSheetName(topic)
    let n = 2
    while (usedNames.has(sheetName.toLowerCase())) { sheetName = safeSheetName(`${topic} (${n})`); n++ }
    usedNames.add(sheetName.toLowerCase())

    const ws = wb.addWorksheet(sheetName)
    ws.addRow(['Nome', 'Email', 'Empresa'])
    ws.getRow(1).font = { bold: true }
    for (const person of [...people].sort((a, b) => a.name.localeCompare(b.name))) {
      ws.addRow([person.name, person.email, person.company])
    }
    ws.getColumn(1).width = 35
    ws.getColumn(2).width = 35
    ws.getColumn(3).width = 35
  }

  await wb.xlsx.writeFile(outPath)
  console.log(`Arquivo gerado: ${outPath}`)
  console.log(`Temas: ${sortedTopics.length}`)
  for (const [topic, people] of sortedTopics) console.log(`  - ${topic}: ${people.length}`)
}

main()
