export const KNOWN_HEADERS = [
  'ID do ingresso',
  'ID do contato',
  'Primeiro nome',
  'Último nome',
  'Empresa',
  'Cargo / Posição',
  'Email',
  'CPF / CNPJ',
  'Telefone / WhatsApp',
  'Segmento de atuação',
  'Membro ativo',
  'Nome do ingresso',
  'Preço do ingresso',
  'Status do pagamento',
] as const

export const MIN_HEADER_SCORE = 10 // out of 14

/** Conta quantos KNOWN_HEADERS aparecem (case-insensitive, trim) em `row`. */
export function scoreHeader(row: ReadonlyArray<string | null | undefined>): number {
  const normalizedRow = new Set(
    row.map((v) => (typeof v === 'string' ? v.trim().toLowerCase() : ''))
  )
  return KNOWN_HEADERS.reduce(
    (acc, h) => acc + (normalizedRow.has(h.trim().toLowerCase()) ? 1 : 0),
    0
  )
}
