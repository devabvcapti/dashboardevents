/** Sanitiza células que começam com =, +, -, @ (formula injection no Excel). */
export function sanitizeFormulaInjection(value: string): string {
  if (!value) return value
  const c = value.charAt(0)
  if (c === '=' || c === '+' || c === '-' || c === '@') {
    return "'" + value
  }
  return value
}

/** Decodifica entidades HTML comuns em headers Excel exportados (ex.: &amp; → &, &iacute; → í). */
export function decodeHtmlEntities(s: string): string {
  if (!s) return s
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&aacute;/gi, 'á').replace(/&Aacute;/g, 'Á')
    .replace(/&eacute;/gi, 'é').replace(/&Eacute;/g, 'É')
    .replace(/&iacute;/gi, 'í').replace(/&Iacute;/g, 'Í')
    .replace(/&oacute;/gi, 'ó').replace(/&Oacute;/g, 'Ó')
    .replace(/&uacute;/gi, 'ú').replace(/&Uacute;/g, 'Ú')
    .replace(/&atilde;/gi, 'ã').replace(/&Atilde;/g, 'Ã')
    .replace(/&otilde;/gi, 'õ').replace(/&Otilde;/g, 'Õ')
    .replace(/&ccedil;/gi, 'ç').replace(/&Ccedil;/g, 'Ç')
    .replace(/&ntilde;/gi, 'ñ').replace(/&Ntilde;/g, 'Ñ')
    .replace(/&nbsp;/g, ' ')
}

/**
 * Parse de valor monetário BRL. Aceita "R$ 1.234,56" ou "1234.56" ou number.
 * Por CONTEXT.md, col 52 já vem como number — esta função é fallback se admin remapear.
 */
export function parseBRLCurrency(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  const cleaned = value
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

/** CPF normalizer: aceita number/string, retorna string de 11 dígitos zero-padded ou null. */
export function normalizeCpf(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  const digits = String(value).replace(/\D/g, '')
  if (digits.length === 0 || digits.length > 14) return null
  // Se tiver 14 dígitos é CNPJ; manter como está. Se ≤ 11 padStart pra 11.
  if (digits.length > 11) return digits
  return digits.padStart(11, '0')
}
