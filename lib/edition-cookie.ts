import { cookies } from 'next/headers'
import { getEditions } from './data'

export const ACTIVE_EDITION_COOKIE = 'active_edition_id'

/**
 * Retorna o editionId ativo (D-01/D-02):
 *  - lê cookie httpOnly 'active_edition_id'
 *  - se ausente, faz fallback para a edição com maior year (getEditions() já ordena DESC)
 *  - lança Error('Nenhuma edição cadastrada') se getEditions() retorna []
 */
export async function getActiveEditionId(): Promise<string> {
  const cookieStore = await cookies()
  const stored = cookieStore.get(ACTIVE_EDITION_COOKIE)?.value
  if (stored) return stored

  const editions = await getEditions()
  if (editions.length === 0) {
    throw new Error('Nenhuma edição cadastrada')
  }
  return editions[0].id
}
