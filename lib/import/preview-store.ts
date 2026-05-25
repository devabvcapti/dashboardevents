/**
 * Shared in-memory store for import previews.
 * Used by POST /api/import/preview (write) and POST /api/import/commit (read).
 * Stored on globalThis so the same Map is reused across Next.js hot reloads.
 *
 * Acceptable because commit always runs in the same process within minutes of preview.
 * TODO v2: persist in Redis or import_jobs PENDING for multi-instance deployments.
 */
import type { ParticipantRow } from './types'

export type StoredPreview = {
  rows: ParticipantRow[]
  filename: string
  expiresAt: number
}

declare global {
  // eslint-disable-next-line no-var
  var __importPreviewStore: Map<string, StoredPreview> | undefined
}
globalThis.__importPreviewStore ??= new Map()

const STORE = globalThis.__importPreviewStore
const TTL_MS = 15 * 60 * 1000 // 15 min

function cleanupExpired(): void {
  const now = Date.now()
  for (const [k, v] of STORE.entries()) {
    if (v.expiresAt < now) STORE.delete(k)
  }
}

/**
 * Store validated rows for a given serverToken.
 * Overwrites any existing entry (safe — tokens are unique random hex strings).
 */
export function storePreview(
  serverToken: string,
  data: { rows: ParticipantRow[]; filename: string }
): void {
  cleanupExpired()
  STORE.set(serverToken, {
    rows: data.rows,
    filename: data.filename,
    expiresAt: Date.now() + TTL_MS,
  })
}

/**
 * Consume (read + delete) a preview by token.
 * Returns null if expired or not found.
 * One-time use: calling twice returns null on the second call.
 */
export function consumePreview(serverToken: string): StoredPreview | null {
  cleanupExpired()
  const entry = STORE.get(serverToken)
  if (!entry) return null
  STORE.delete(serverToken)
  return entry
}

/**
 * Peek at a preview without consuming it (for debugging / tests).
 */
export function peekPreview(serverToken: string): StoredPreview | null {
  cleanupExpired()
  return STORE.get(serverToken) ?? null
}
