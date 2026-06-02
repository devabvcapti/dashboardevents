export const ALLOWED_DOMAIN = '@abvcap.com.br'

export const ALLOWED_EMAILS = new Set([
  'rlima@abvcap.com.br',
  'mbarea@abvcap.com.br',
  'afernandes@abvcap.com.br',
  'rlujan@abvcap.com.br',
  'ti@abvcap.com.br',
])

export function isEmailAllowed(email: string): boolean {
  const normalized = email.toLowerCase().trim()
  return normalized.endsWith(ALLOWED_DOMAIN) && ALLOWED_EMAILS.has(normalized)
}
