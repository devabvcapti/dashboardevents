export const ALLOWED_DOMAIN = '@abvcap.com.br'

export const ALLOWED_EMAILS = new Set([
  'rlima@abvcap.com.br',
  'mbarea@abvcap.com.br',
  'afernandes@abvcap.com.br',
  'rlujan@abvcap.com.br',
  'ti@abvcap.com.br',
  'admin@abvcap.com.br',
])

export function isEmailAllowed(email: string): boolean {
  const normalized = email.toLowerCase().trim()
  const endsWith = normalized.endsWith(ALLOWED_DOMAIN)
  const inSet = ALLOWED_EMAILS.has(normalized)
  const codes = Array.from(normalized).map(c => c.charCodeAt(0).toString(16)).join('-')
  console.log('[A]ok:', inSet, 'sz:', ALLOWED_EMAILS.size, 'hex:', codes)
  return endsWith && inSet
}
