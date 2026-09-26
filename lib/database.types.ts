export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      budget_items: {
        Row: {
          budgeted: number
          category: string
          created_at: string | null
          edition_id: string
          id: string
          realized: number
          sort_order: number
          subcategory: string | null
        }
        Insert: {
          budgeted?: number
          category: string
          created_at?: string | null
          edition_id: string
          id?: string
          realized?: number
          sort_order?: number
          subcategory?: string | null
        }
        Update: {
          budgeted?: number
          category?: string
          created_at?: string | null
          edition_id?: string
          id?: string
          realized?: number
          sort_order?: number
          subcategory?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_items_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_categories: {
        Row: {
          category: Database["public"]["Enums"]["coupon_category"]
          coupon_code: string
          created_at: string | null
          edition_id: string
          id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["coupon_category"]
          coupon_code: string
          created_at?: string | null
          edition_id: string
          id?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["coupon_category"]
          coupon_code?: string
          created_at?: string | null
          edition_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_categories_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
        ]
      }
      editions: {
        Row: {
          created_at: string | null
          event_date: string | null
          id: string
          name: string
          registration_goal: number | null
          year: number
        }
        Insert: {
          created_at?: string | null
          event_date?: string | null
          id?: string
          name: string
          registration_goal?: number | null
          year: number
        }
        Update: {
          created_at?: string | null
          event_date?: string | null
          id?: string
          name?: string
          registration_goal?: number | null
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
          vc_day_topics: string[] | null
        }
        Insert: {
          company_segment?:
            | Database["public"]["Enums"]["company_segment"]
            | null
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
          vc_day_topics?: string[] | null
        }
        Update: {
          company_segment?:
            | Database["public"]["Enums"]["company_segment"]
            | null
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
          vc_day_topics?: string[] | null
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
      lp_company_categories: {
        Row: {
          category: Database["public"]["Enums"]["lp_category"]
          company_key: string
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["lp_category"]
          company_key: string
          created_at?: string
          display_name: string
          id?: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["lp_category"]
          company_key?: string
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      lp_excluded_companies: {
        Row: {
          company_key: string
          created_at: string
          display_name: string
          id: string
          reason: string | null
        }
        Insert: {
          company_key: string
          created_at?: string
          display_name: string
          id?: string
          reason?: string | null
        }
        Update: {
          company_key?: string
          created_at?: string
          display_name?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      lp_master_companies: {
        Row: {
          category: Database["public"]["Enums"]["lp_category"] | null
          company_key: string
          country: string | null
          created_at: string
          display_name: string
          id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["lp_category"] | null
          company_key: string
          country?: string | null
          created_at?: string
          display_name: string
          id?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["lp_category"] | null
          company_key?: string
          country?: string | null
          created_at?: string
          display_name?: string
          id?: string
        }
        Relationships: []
      }
      marketing_communications: {
        Row: {
          channel: string
          created_at: string | null
          description: string | null
          edition_id: string
          id: string
          sent_at: string
        }
        Insert: {
          channel: string
          created_at?: string | null
          description?: string | null
          edition_id: string
          id?: string
          sent_at: string
        }
        Update: {
          channel?: string
          created_at?: string | null
          description?: string | null
          edition_id?: string
          id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_communications_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          checked_in: boolean | null
          company: string | null
          company_segment_normalized:
            | Database["public"]["Enums"]["company_segment"]
            | null
          company_segment_raw: string | null
          coupon_code: string | null
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
          registered_at: string | null
          ticket_id: string | null
          ticket_membership: Database["public"]["Enums"]["ticket_membership"]
          ticket_name: string | null
          ticket_value: number | null
          valor_efetivo: number | null
          valor_pago_manual: number | null
        }
        Insert: {
          checked_in?: boolean | null
          company?: string | null
          company_segment_normalized?:
            | Database["public"]["Enums"]["company_segment"]
            | null
          company_segment_raw?: string | null
          coupon_code?: string | null
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
          registered_at?: string | null
          ticket_id?: string | null
          ticket_membership: Database["public"]["Enums"]["ticket_membership"]
          ticket_name?: string | null
          ticket_value?: number | null
          valor_efetivo?: number | null
          valor_pago_manual?: number | null
        }
        Update: {
          checked_in?: boolean | null
          company?: string | null
          company_segment_normalized?:
            | Database["public"]["Enums"]["company_segment"]
            | null
          company_segment_raw?: string | null
          coupon_code?: string | null
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
          registered_at?: string | null
          ticket_id?: string | null
          ticket_membership?: Database["public"]["Enums"]["ticket_membership"]
          ticket_name?: string | null
          ticket_value?: number | null
          valor_efetivo?: number | null
          valor_pago_manual?: number | null
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
      registration_weekly_goals: {
        Row: {
          created_at: string | null
          edition_id: string
          id: string
          target_count: number
          week_start: string
        }
        Insert: {
          created_at?: string | null
          edition_id: string
          id?: string
          target_count: number
          week_start: string
        }
        Update: {
          created_at?: string | null
          edition_id?: string
          id?: string
          target_count?: number
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "registration_weekly_goals_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
        ]
      }
      vcday_app_settings: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      vcday_evaluations: {
        Row: {
          author_name: string | null
          created_at: string
          event_slug: string
          id: string
          improve: string | null
          liked: string | null
          panel_id: string | null
          rating: number
        }
        Insert: {
          author_name?: string | null
          created_at?: string
          event_slug?: string
          id?: string
          improve?: string | null
          liked?: string | null
          panel_id?: string | null
          rating: number
        }
        Update: {
          author_name?: string | null
          created_at?: string
          event_slug?: string
          id?: string
          improve?: string | null
          liked?: string | null
          panel_id?: string | null
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "vcday_evaluations_panel_id_fkey"
            columns: ["panel_id"]
            isOneToOne: false
            referencedRelation: "vcday_panels"
            referencedColumns: ["id"]
          },
        ]
      }
      vcday_nps_responses: {
        Row: {
          answers: Json
          created_at: string
          event_slug: string
          id: string
          nps_score: number | null
          survey_slug: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          event_slug?: string
          id?: string
          nps_score?: number | null
          survey_slug: string
        }
        Update: {
          answers?: Json
          created_at?: string
          event_slug?: string
          id?: string
          nps_score?: number | null
          survey_slug?: string
        }
        Relationships: []
      }
      vcday_panels: {
        Row: {
          created_at: string
          ends_at: string
          event_date: string
          id: string
          name: string
          name_en: string | null
          qa_enabled: boolean
          sort_order: number
          speakers: string | null
          starts_at: string
          status_override: string | null
        }
        Insert: {
          created_at?: string
          ends_at: string
          event_date: string
          id: string
          name: string
          name_en?: string | null
          qa_enabled?: boolean
          sort_order?: number
          speakers?: string | null
          starts_at: string
          status_override?: string | null
        }
        Update: {
          created_at?: string
          ends_at?: string
          event_date?: string
          id?: string
          name?: string
          name_en?: string | null
          qa_enabled?: boolean
          sort_order?: number
          speakers?: string | null
          starts_at?: string
          status_override?: string | null
        }
        Relationships: []
      }
      vcday_questions: {
        Row: {
          author_name: string | null
          created_at: string
          id: string
          panel_id: string
          question_text: string
          status: string
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          created_at?: string
          id?: string
          panel_id: string
          question_text: string
          status?: string
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          created_at?: string
          id?: string
          panel_id?: string
          question_text?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vcday_questions_panel_id_fkey"
            columns: ["panel_id"]
            isOneToOne: false
            referencedRelation: "vcday_panels"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_member_analysis: { Args: { p_edition_id: string }; Returns: Json }
      get_overview_stats: { Args: { p_edition_id: string }; Returns: Json }
      get_revenue_analysis: { Args: { p_edition_id: string }; Returns: Json }
      upsert_form_responses_batch: {
        Args: { p_edition_id: string; p_rows: Json }
        Returns: Json
      }
      upsert_participants_batch: {
        Args: { p_edition_id: string; p_import_job_id: string; p_rows: Json }
        Returns: Json
      }
      vcday_admin_list_evaluations: {
        Args: { p_event_slug?: string; p_passcode: string }
        Returns: {
          author_name: string | null
          created_at: string
          event_slug: string
          id: string
          improve: string | null
          liked: string | null
          panel_id: string | null
          rating: number
        }[]
        SetofOptions: {
          from: "*"
          to: "vcday_evaluations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      vcday_admin_list_nps_responses: {
        Args: { p_event_slug?: string; p_passcode: string }
        Returns: {
          answers: Json
          created_at: string
          event_slug: string
          id: string
          nps_score: number | null
          survey_slug: string
        }[]
        SetofOptions: {
          from: "*"
          to: "vcday_nps_responses"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      vcday_admin_list_questions: {
        Args: { p_panel_id: string; p_passcode: string }
        Returns: {
          author_name: string | null
          created_at: string
          id: string
          panel_id: string
          question_text: string
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "vcday_questions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      vcday_admin_set_status: {
        Args: { p_passcode: string; p_question_id: string; p_status: string }
        Returns: undefined
      }
    }
    Enums: {
      company_segment:
        | "GP"
        | "LP"
        | "FUNDO"
        | "CORPORATIVO"
        | "GOVERNO"
        | "ACADEMIA"
        | "OUTRO"
      coupon_category:
        | "PATROCINADOR"
        | "APOIADOR"
        | "ESTRATEGICO"
        | "PALESTRANTES"
        | "CONVIDADOS_PALESTRANTES"
        | "IMPRENSA"
        | "VIPS"
        | "CONSELHO_ABVCAP"
        | "PARCEIRO"
        | "LPS"
        | "FINANCEIRO"
      import_status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"
      lp_category:
        | "AGENCIA_FOMENTO_DFI"
        | "FAMILY_OFFICE"
        | "FUNDO_PENSAO"
        | "FUNDO_DE_FUNDOS"
        | "RPPS"
        | "WEALTH_MANAGEMENT"
        | "ASSET_MANAGER"
        | "HNI"
      ticket_membership: "MEMBRO" | "NAO_MEMBRO"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      company_segment: [
        "GP",
        "LP",
        "FUNDO",
        "CORPORATIVO",
        "GOVERNO",
        "ACADEMIA",
        "OUTRO",
      ],
      coupon_category: [
        "PATROCINADOR",
        "APOIADOR",
        "ESTRATEGICO",
        "PALESTRANTES",
        "CONVIDADOS_PALESTRANTES",
        "IMPRENSA",
        "VIPS",
        "CONSELHO_ABVCAP",
        "PARCEIRO",
        "LPS",
        "FINANCEIRO",
      ],
      import_status: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"],
      lp_category: [
        "AGENCIA_FOMENTO_DFI",
        "FAMILY_OFFICE",
        "FUNDO_PENSAO",
        "FUNDO_DE_FUNDOS",
        "RPPS",
        "WEALTH_MANAGEMENT",
        "ASSET_MANAGER",
        "HNI",
      ],
      ticket_membership: ["MEMBRO", "NAO_MEMBRO"],
    },
  },
} as const

// ─── Convenience aliases ───────────────────────────────────────────────────

export type TicketMembership = Database["public"]["Enums"]["ticket_membership"]
export type CompanySegment = Database["public"]["Enums"]["company_segment"]
export type ImportStatus = Database["public"]["Enums"]["import_status"]
export type LpCategory = Database["public"]["Enums"]["lp_category"]

export type Participant = Database["public"]["Tables"]["participants"]["Row"]
export type Edition = Database["public"]["Tables"]["editions"]["Row"]
export type ImportJob = Database["public"]["Tables"]["import_jobs"]["Row"]
export type FormResponse = Database["public"]["Tables"]["form_responses"]["Row"]
export type VcDayPanel = Database["public"]["Tables"]["vcday_panels"]["Row"]
export type VcDayQuestion = Database["public"]["Tables"]["vcday_questions"]["Row"]
export type VcDayEvaluation = Database["public"]["Tables"]["vcday_evaluations"]["Row"]
export type LpCompanyCategory = Database["public"]["Tables"]["lp_company_categories"]["Row"]
export type LpMasterCompanyRow = Database["public"]["Tables"]["lp_master_companies"]["Row"]
export type LpExcludedCompanyRow = Database["public"]["Tables"]["lp_excluded_companies"]["Row"]

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
