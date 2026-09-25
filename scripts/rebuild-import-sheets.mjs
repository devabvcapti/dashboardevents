// Reconstrói um export bruto da plataforma de inscrições (Glue Up) no layout
// canônico que o importador do dashboard espera (mesma ordem de colunas de
// "Participantes Congresso ... .xlsx" / "Participantes VCDAY ... .xlsx"),
// separando as linhas em duas planilhas (Congresso / VC Day) pelo "Nome do
// ingresso".
//
// A plataforma reordena/insere colunas entre exports (já vimos "ID do
// ingresso" pular de coluna, e colunas de check-in/check-out aparecerem do
// nada), então o mapeamento é feito por TEXTO DO CABEÇALHO (row1), não por
// posição fixa — resiste a reordenações futuras. Se um campo esperado sumir
// do arquivo de origem, o script avisa em vez de gerar dado errado.
//
// Uso: node scripts/rebuild-import-sheets.mjs <arquivo-origem.xlsx> <pasta-saida> <DD.MM.AA>
import ExcelJS from 'exceljs'

const srcPath = process.argv[2]
const outDir = process.argv[3]
const dateLabel = process.argv[4]

if (!srcPath || !outDir || !dateLabel) {
  console.error('Uso: node scripts/rebuild-import-sheets.mjs <arquivo-origem.xlsx> <pasta-saida> <DD.MM.AA>')
  process.exit(1)
}

const TARGET_LEN = 76
const ROW1 = new Array(TARGET_LEN).fill(null)
const ROW2 = new Array(TARGET_LEN).fill(null)
ROW1[0] = 'ID do ingresso'
ROW1[1] = 'ID do contato'
ROW1[2] = 'Primeiro nome'
ROW1[3] = 'Último nome'
ROW1[4] = 'Empresa'
ROW1[5] = 'Cargo / Posição'
ROW1[6] = 'Email'
ROW1[7] = 'Foto de perfil'
ROW1[8] = 'CPF / CNPJ'
ROW1[9] = 'Telefone / WhatsApp'
ROW1[10] = 'Segmento de atuação'
ROW1[11] = 'LinkedIn'
ROW1[12] = 'Quais temas são de maior interesse para você no Congresso?'
const TOPICS = ['Conjuntura & Geopolítica','Private Equity','Crédito Privado & Internacional','Special Situations','Mercado Secundário & Novas Estruturas','Infraestrutura & Real Estate','Inteligência Artificial & Venture Capital','Empreendedorismo & Capital Global','Family Offices & LPs','Clima & Investimentos','Fundraising & Relacionamento com Investidores']
for (let i = 0; i < TOPICS.length; i++) ROW2[12 + i] = TOPICS[i]
ROW1[23] = 'Você tem interesse em participar de eventos do ecossistema?'
const EVENTS = ['LP Day — 21 de setembro, manhã (exclusivo para investidores institucionais)','Women Connection — 21 de setembro, noite','Não tenho interesse em eventos adicionais']
for (let i = 0; i < EVENTS.length; i++) ROW2[23 + i] = EVENTS[i]
ROW1[26] = 'Como prefere receber comunicações da ABVCAP?'
const CHANNELS = ['E-mail','WhatsApp','LinkedIn','Não desejo receber comunicações']
for (let i = 0; i < CHANNELS.length; i++) ROW2[26 + i] = CHANNELS[i]
ROW1[30] = 'Quais conteúdos são de seu interesse?'
const CONTENTS = ['Notícias e atualizações do setor','Eventos e congressos','Publicações e relatórios da ABVCAP','Cursos e programas de formação (Aprenda com quem Faz)','Oportunidades de networking']
for (let i = 0; i < CONTENTS.length; i++) ROW2[30 + i] = CONTENTS[i]
ROW1[35] = 'Oportunidades de networking'
ROW1[36] = 'Para o dia do evento, existe alguma restrição alimentar?'
ROW1[37] = 'Detalhar'
ROW1[38] = 'Quais temas são de maior interesse para você no VC Day 2026?'
const VCDAY = ['Deep Tech, incluindo inteligência artificial','Exits & Liquidez em Venture Capital','Corporate Venture Capital & Inovação Aberta','Captação de Recursos & Relação com Investidores','Perspectivas para o mercado de VC','Cases práticos de investimento e escalabilidade','Não participarei do VC Day']
for (let i = 0; i < VCDAY.length; i++) ROW2[38 + i] = VCDAY[i]
ROW1[45] = 'língua preferida'
ROW1[46] = 'Categoria'
ROW1[47] = 'Observação interna'
ROW1[48] = 'Visível na sala de eventos'
ROW1[49] = 'Termos Opt-In'
ROW1[50] = 'Membro ativo'
ROW1[51] = 'Empresa é membro'
ROW1[52] = 'Usuário Registrado'
ROW1[53] = 'Status do participante'
ROW1[54] = 'Código QR'
ROW1[55] = 'Compra adicional'
ROW1[56] = 'Nome do ingresso'
ROW1[57] = 'Opção de preço'
ROW1[58] = 'Preço do ingresso'
ROW1[59] = 'Status do pagamento'
ROW1[60] = 'Status do reembolso'
ROW1[61] = 'Nome do desconto'
ROW1[62] = 'ID do pagamento #'
ROW1[63] = 'ID do registro #'
ROW1[64] = 'data de registro (GMT-3 Sao_Paulo)'
ROW1[65] = 'Número de participantes no registro'
ROW1[66] = 'Valor Total do Registro'
ROW1[67] = 'Saldo de registro devido'
ROW1[68] = 'Registro Nome de contato'
ROW1[69] = 'Registro Contato Sobrenome'
ROW1[70] = 'Inscrição Contato E-mail'
ROW1[71] = 'Registro Telefone de Contato'
ROW1[72] = 'Inscrição Contato Empresa'
ROW1[73] = 'Posição do contato de registro'
ROW1[74] = 'Bilhete transferido de'
ROW1[75] = 'Fez check-in'

const GROUPS = [
  { start: 12, count: 11, label: ROW1[12] },
  { start: 23, count: 3, label: ROW1[23] },
  { start: 26, count: 4, label: ROW1[26] },
  { start: 30, count: 5, label: ROW1[30] },
  { start: 38, count: 7, label: ROW1[38] },
]
const groupTargetIdxSet = new Set(GROUPS.flatMap(g => Array.from({ length: g.count }, (_, i) => g.start + i)))

function cellVal(v) {
  if (v && typeof v === 'object' && 'text' in v) return v.text
  return v === undefined ? null : v
}

async function main() {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(srcPath)
  const ws = wb.worksheets[0]

  const srcRow1 = (ws.getRow(1).values ?? []).slice(1)

  const SRC_TO_DST = {}
  const usedSrcIdx = new Set()
  let missing = 0

  for (let dst = 0; dst < TARGET_LEN; dst++) {
    if (groupTargetIdxSet.has(dst)) continue
    const label = ROW1[dst]
    if (!label) continue
    const srcIdx = srcRow1.findIndex((v, i) => !usedSrcIdx.has(i) && v === label)
    if (srcIdx === -1) {
      console.warn(`AVISO: campo não encontrado no arquivo de origem: "${label}" (destino idx ${dst})`)
      missing++
      continue
    }
    SRC_TO_DST[srcIdx] = dst
    usedSrcIdx.add(srcIdx)
  }

  for (const g of GROUPS) {
    const matches = srcRow1
      .map((v, i) => ({ v, i }))
      .filter(({ v, i }) => !usedSrcIdx.has(i) && v === g.label)
      .map(({ i }) => i)
    if (matches.length !== g.count) {
      console.warn(`AVISO: grupo "${g.label}" esperava ${g.count} colunas, achou ${matches.length}`)
      missing++
    }
    matches.slice(0, g.count).forEach((srcIdx, i) => {
      SRC_TO_DST[srcIdx] = g.start + i
      usedSrcIdx.add(srcIdx)
    })
  }

  console.log('Colunas de origem mapeadas:', Object.keys(SRC_TO_DST).length, 'de', srcRow1.length, '(destino tem', TARGET_LEN, 'campos)')
  if (missing > 0) {
    console.warn(`\n>>> ${missing} campo(s) não localizado(s) — confira os avisos acima antes de usar o resultado. <<<\n`)
  }

  const nomeIngressoTargetIdx = 56
  const nomeIngressoSrcIdx = Number(Object.entries(SRC_TO_DST).find(([, dst]) => dst === nomeIngressoTargetIdx)?.[0])

  const vcDayRows = []
  const congressoRows = []
  let totalRows = 0

  for (let r = 3; r <= ws.rowCount; r++) {
    const values = (ws.getRow(r).values ?? []).slice(1)
    if (values.every(v => v === null || v === '' || v === undefined)) continue
    totalRows++

    const target = new Array(TARGET_LEN).fill(null)
    for (const [srcIdxStr, dstIdx] of Object.entries(SRC_TO_DST)) {
      target[dstIdx] = cellVal(values[Number(srcIdxStr)])
    }

    const ticketName = String(cellVal(values[nomeIngressoSrcIdx]) ?? '')
    if (ticketName.toUpperCase().includes('VC DAY')) {
      vcDayRows.push(target)
    } else {
      congressoRows.push(target)
    }
  }

  console.log('Total linhas processadas:', totalRows)
  console.log('VC Day:', vcDayRows.length)
  console.log('Congresso:', congressoRows.length)

  async function writeOut(rows, filename) {
    const outWb = new ExcelJS.Workbook()
    const outWs = outWb.addWorksheet('Evento_Lista de participantes ')
    outWs.addRow(ROW1)
    outWs.addRow(ROW2)
    for (const row of rows) outWs.addRow(row)
    const path = `${outDir}/${filename}`
    await outWb.xlsx.writeFile(path)
    console.log('Escrito:', path)
  }

  await writeOut(congressoRows, `Participantes Congresso 2026 (sem VC Day) ${dateLabel}.xlsx`)
  await writeOut(vcDayRows, `Participantes VCDAY ${dateLabel}.xlsx`)
}

main()
