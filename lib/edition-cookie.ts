import { cookies } from 'next/headers'
import { getEditions } from './data'
import type { Edition } from './database.types'

export const ACTIVE_EDITION_COOKIE = 'active_edition_id'

/**
 * Retorna a edição ativa completa (D-01/D-02):
 *  - lê cookie httpOnly 'active_edition_id'
 *  - se ausente, faz fallback para a edição com maior year (getEditions() já ordena DESC)
 *  - lança Error('Nenhuma edição cadastrada') se getEditions() retorna []
 */
export async function getActiveEdition(): Promise<Edition> {
  const cookieStore = await cookies()
  const stored = cookieStore.get(ACTIVE_EDITION_COOKIE)?.value

  const editions = await getEditions()
  if (editions.length === 0) {
    throw new Error('Nenhuma edição cadastrada')
  }

  // Valida cookie contra o banco — edição pode ter sido deletada
  const found = stored ? editions.find(e => e.id === stored) : undefined
  return found ?? editions[0]
}

export async function getActiveEditionId(): Promise<string> {
  const edition = await getActiveEdition()
  return edition.id
}
