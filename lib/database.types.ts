export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      editions: {
        Row: {
          created_at: string | null
          id: string
          name: string
          year: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          year: number
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          year?: number
        }
        Relationships: []
      }
      form_responses: {
        Row: {
          company_segment: Database["public"]["Enums"]["company_segment"] | null
          company_size: string | null
          content_interests: string[] | null
          created_at: string | null
          dietary_details: string | null
          dietary_restrictions: string | null
          id: string
          interested_in_events: string[] | null
          opt_in_communication: boolean | null
          origin_state: string | null
          participant_id: string
          preferred_channels: string[] | null
          professional_role: string | null
          raw_data: Json | null
          topics_of_interest: string[] | null
        }
        Insert: {
          company_segment?: Database["public"]["Enums"]["company_segment"] | null
          company_size?: string | null
          content_interests?: string[] | null
          created_at?: string | null
          dietary_details?: string | null
          dietary_restrictions?: string | null
          id?: string
          interested_in_events?: string[] | null
          opt_in_communication?: boolean | null
          origin_state?: string | null
          participant_id: string
          preferred_channels?: string[] | null
          professional_role?: string | null
          raw_data?: Json | null
          topics_of_interest?: string[] | null
        }
        Update: {
          company_segment?: Database["public"]["Enums"]["company_segment"] | null
          company_size?: string | null
          content_interests?: string[] | null
          created_at?: string | null
          dietary_details?: string | null
          dietary_restrictions?: string | null
          id?: string
          interested_in_events?: string[] | null
          opt_in_communication?: boolean | null
          origin_state?: string | null
          participant_id?: string
          preferred_channels?: string[] | null
          professional_role?: string | null
          raw_data?: Json | null
          topics_of_interest?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "form_responses_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      import_jobs: {
        Row: {
          created_at: string | null
          edition_id: string | null
          error_log: Json | null
          error_rows: number | null
          filename: string
          id: string
          imported_by: string | null
          inserted_rows: number | null
          status: Database["public"]["Enums"]["import_status"] | null
          total_rows: number | null
          updated_rows: number | null
        }
        Insert: {
          created_at?: string | null
          edition_id?: string | null
          error_log?: Json | null
          error_rows?: number | null
          filename: string
          id?: string
          imported_by?: string | null
          inserted_rows?: number | null
          status?: Database["public"]["Enums"]["import_status"] | null
          total_rows?: number | null
          updated_rows?: number | null
        }
        Update: {
          created_at?: string | null
          edition_id?: string | null
          error_log?: Json | null
          error_rows?: number | null
          filename?: string
          id?: string
          imported_by?: string | null
          inserted_rows?: number | null
          status?: Database["public"]["Enums"]["import_status"] | null
          total_rows?: number | null
          updated_rows?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "import_jobs_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          company: string | null
          company_segment_normalized: Database["public"]["Enums"]["company_segment"] | null
          company_segment_raw: string | null
          cpf: string | null
          created_at: string | null
          edition_id: string
          email: string
          full_name: string
          id: string
          import_job_id: string | null
          is_company_member: boolean | null
          job_title: string | null
          payment_status: string | null
          phone: string | null
          ticket_membership: Database["public"]["Enums"]["ticket_membership"]
          ticket_name: string | null
          ticket_value: number | null
        }
        Insert: {
          company?: string | null
          company_segment_normalized?: Database["public"]["Enums"]["company_segment"] | null
          company_segment_raw?: string | null
          cpf?: string | null
          created_at?: string | null
          edition_id: string
          email: string
          full_name: string
          id?: string
          import_job_id?: string | null
          is_company_member?: boolean | null
          job_title?: string | null
          payment_status?: string | null
          phone?: string | null
          ticket_membership: Database["public"]["Enums"]["ticket_membership"]
          ticket_name?: string | null
          ticket_value?: number | null
        }
        Update: {
          company?: string | null
          company_segment_normalized?: Database["public"]["Enums"]["company_segment"] | null
          company_segment_raw?: string | null
          cpf?: string | null
          created_at?: string | null
          edition_id?: string
          email?: string
          full_name?: string
          id?: string
          import_job_id?: string | null
          is_company_member?: boolean | null
          job_title?: string | null
          payment_status?: string | null
          phone?: string | null
          ticket_membership?: Database["public"]["Enums"]["ticket_membership"]
          ticket_name?: string | null
          ticket_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "participants_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_overview_stats: { Args: { p_edition_id: string }; Returns: Json }
      get_member_analysis: { Args: { p_edition_id: string }; Returns: Json }
      get_revenue_analysis: { Args: { p_edition_id: string }; Returns: Json }
      upsert_form_responses_batch: {
        Args: {
          p_rows: Json
          p_edition_id: string
        }
        Returns: Json
      }
      upsert_participants_batch: {
        Args: {
          p_rows: Json
          p_edition_id: string
          p_import_job_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      company_segment: "GP" | "LP" | "FUNDO" | "CORPORATIVO" | "GOVERNO" | "ACADEMIA" | "OUTRO"
      import_status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"
      ticket_membership: "MEMBRO" | "NAO_MEMBRO"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ─── Convenience aliases ───────────────────────────────────────────────────

export type TicketMembership = Database["public"]["Enums"]["ticket_membership"]
export type CompanySegment = Database["public"]["Enums"]["company_segment"]
export type ImportStatus = Database["public"]["Enums"]["import_status"]

export type Participant = Database["public"]["Tables"]["participants"]["Row"]
export type Edition = Database["public"]["Tables"]["editions"]["Row"]
export type ImportJob = Database["public"]["Tables"]["import_jobs"]["Row"]
export type FormResponse = Database["public"]["Tables"]["form_responses"]["Row"]

export interface OverviewStats {
  total: number
  membro: number
  nao_membro: number
  total_revenue: number
  avg_ticket: number
  unique_companies: number
  states_represented: number
}

export interface MemberAnalysisRow {
  segment: string
  membro_count: number
  nao_membro_count: number
  total: number
  membership_pct: number
}

export interface RevenueByMembership {
  ticket_membership: TicketMembership
  count: number
  total_revenue: number
  avg_ticket: number
}

export interface RevenueHistogramBucket {
  faixa: string
  count: number
  min_val: number | null
  max_val: number | null
}

export interface RevenueAnalysis {
  by_membership: RevenueByMembership[]
  histogram: RevenueHistogramBucket[]
}

export interface PaginatedParticipants {
  data: Participant[]
  count: number
}

export interface ParticipantWithState extends Participant {
  origin_state: string | null
}
