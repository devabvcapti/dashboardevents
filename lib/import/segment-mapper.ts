import type { CompanySegment } from '../database.types'

/**
 * Per CONTEXT.md "Normalização de company_segment":
 * Mapeia o texto livre de col 11 ("Segmento de atuação") para enum.
 * Match é case-insensitive, contains-based, ordem importa (regras mais específicas primeiro).
 */
const RULES: Array<{ patterns: RegExp[]; segment: CompanySegment }> = [
  { patterns: [/private equity/i, /\bgp\b/i, /gestora de pe/i, /gestora de venture/i, /venture capital/i, /\bvc\b/i], segment: 'GP' },
  { patterns: [/fundo de pens/i, /endowment/i, /investidor institucional/i, /\blp\b/i], segment: 'LP' },
  { patterns: [/fundo de fundos/i, /\bfof\b/i], segment: 'FUNDO' },
  { patterns: [/banco/i, /seguradora/i, /corporativ/i, /family office/i, /tesouraria/i], segment: 'CORPORATIVO' },
  { patterns: [/governo/i, /agência regul/i, /agencia regul/i, /regulador/i, /minist[ée]rio/i, /\bbndes\b/i, /\bcvm\b/i], segment: 'GOVERNO' },
  { patterns: [/universidade/i, /academia/i, /pesquisa/i, /faculdade/i], segment: 'ACADEMIA' },
]

export function normalizeCompanySegment(raw: string | null | undefined): CompanySegment | null {
  if (!raw || typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (trimmed === '') return null
  for (const { patterns, segment } of RULES) {
    if (patterns.some((p) => p.test(trimmed))) return segment
  }
  return 'OUTRO'
}
