import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

let _client: SupabaseClient<Database> | null = null

export function getSupabase(): SupabaseClient<Database> {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || url.startsWith('your_') || !key || key.startsWith('your_')) {
    throw new Error(
      'Supabase não configurado. Preencha .env.local com ' +
      'NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.'
    )
  }
  _client = createClient<Database>(url, key)
  return _client
}
