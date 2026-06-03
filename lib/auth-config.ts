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
  console.log('[isEmailAllowed] raw:', JSON.stringify(email), 'normalized:', JSON.stringify(normalized), 'endsWith:', endsWith, 'inSet:', inSet, 'setSize:', ALLOWED_EMAILS.size)
  return endsWith && inSet
}
