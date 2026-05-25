import type { CompanySegment } from '../database.types'

export interface ColumnMapping {
  // Mapa: índice da coluna Excel (0-based) → campo destino canonical
  // ou null/'ignore' para descartar a coluna.
  [excelColIndex: number]: TargetField | 'ignore'
}

export type TargetField =
  | 'ticket_id' | 'full_name' | 'company' | 'job_title' | 'email'
  | 'cpf' | 'phone' | 'company_segment_raw'
  | 'topics_of_interest'      // grupo multi-select 13-23
  | 'interested_in_events'    // grupo multi-select 24-26
  | 'preferred_channels'      // grupo multi-select 27-30
  | 'content_interests'       // grupo multi-select 31-35
  | 'dietary_restrictions'    // col 37
  | 'dietary_details'         // col 38
  | 'ticket_membership'       // col 44
  | 'is_company_member'       // col 45
  | 'ticket_value'            // col 52
  | 'payment_status'          // col 53

export interface ParticipantRow {
  excel_row: number               // 1-based, primeira linha de DADOS é tipicamente 3
  ticket_id: string | null
  full_name: string
  email: string
  company: string | null
  job_title: string | null
  cpf: string | null
  phone: string | null
  company_segment_raw: string | null
  company_segment_normalized: CompanySegment | null
  is_company_member: boolean | null
  ticket_membership: 'MEMBRO' | 'NAO_MEMBRO'
  ticket_value: number | null
  payment_status: string | null
  // form-related (vão para form_responses no commit)
  topics_of_interest: string[]
  interested_in_events: string[]
  preferred_channels: string[]
  content_interests: string[]
  dietary_restrictions: 'Sim' | 'Não' | null
  dietary_details: string | null
}

export interface ParseResult {
  filename: string
  headerRowIndex: number          // 0-based; linha que melhor casou KNOWN_HEADERS
  headerScore: number             // 0..14
  detectedMapping: ColumnMapping  // sugestão inicial; admin pode override
  rawHeaders: { row1: string[]; row2: string[] }
  totalRows: number               // linhas de dados (excluindo cabeçalho)
}

export interface ValidationResult {
  validRows: ParticipantRow[]
  errors: Array<{
    excel_row: number
    field: string | null
    message: string  // PT-BR
  }>
}

export interface PreviewResponse {
  parseResult: ParseResult
  validation: ValidationResult
  // serverToken: identificador opaco para Plan 04 referenciar este parse
  // (Plan 04 reusa o validRows armazenado em memória curta ou em import_jobs PENDING)
  serverToken: string
}
