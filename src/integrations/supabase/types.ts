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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      daily_digests: {
        Row: {
          completed_at: string | null
          created_at: string
          digest_data: Json | null
          digest_date: string
          email_sent: boolean
          error: string | null
          id: string
          model: string | null
          sources_summary: Json | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          digest_data?: Json | null
          digest_date: string
          email_sent?: boolean
          error?: string | null
          id?: string
          model?: string | null
          sources_summary?: Json | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          digest_data?: Json | null
          digest_date?: string
          email_sent?: boolean
          error?: string | null
          id?: string
          model?: string | null
          sources_summary?: Json | null
          status?: string
        }
        Relationships: []
      }
      landing_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          referrer: string | null
          session_key: string
          survey_type: string
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          referrer?: string | null
          session_key: string
          survey_type?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          referrer?: string | null
          session_key?: string
          survey_type?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      partial_submissions: {
        Row: {
          abandoned: boolean
          completed: boolean
          current_step: number
          current_step_name: string | null
          form_data: Json | null
          id: string
          session_id: string
          session_secret_hash: string | null
          started_at: string
          submission_id: string | null
          survey_type: string
          total_steps: number
          updated_at: string
        }
        Insert: {
          abandoned?: boolean
          completed?: boolean
          current_step?: number
          current_step_name?: string | null
          form_data?: Json | null
          id?: string
          session_id: string
          session_secret_hash?: string | null
          started_at?: string
          submission_id?: string | null
          survey_type: string
          total_steps: number
          updated_at?: string
        }
        Update: {
          abandoned?: boolean
          completed?: boolean
          current_step?: number
          current_step_name?: string | null
          form_data?: Json | null
          id?: string
          session_id?: string
          session_secret_hash?: string | null
          started_at?: string
          submission_id?: string | null
          survey_type?: string
          total_steps?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partial_submissions_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "survey_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_submissions: {
        Row: {
          active_flows: string[] | null
          benchmark_email_revenue: number | null
          company_name: string | null
          created_at: string
          current_email_revenue: number | null
          custom_sector: string | null
          disqualification_reason: string | null
          email: string
          email_health_score: number | null
          email_revenue_percentage: string | null
          email_satisfaction: string | null
          full_name: string
          ghl_synced: boolean | null
          id: string
          lead_quality: string | null
          list_size: string | null
          make_synced: boolean | null
          monthly_revenue: string | null
          motivation: string | null
          phone: string | null
          qualified: boolean | null
          report_data: Json | null
          revenue_gap: number | null
          sector: string | null
          status: string | null
          website: string | null
          yearly_potential: number | null
        }
        Insert: {
          active_flows?: string[] | null
          benchmark_email_revenue?: number | null
          company_name?: string | null
          created_at?: string
          current_email_revenue?: number | null
          custom_sector?: string | null
          disqualification_reason?: string | null
          email: string
          email_health_score?: number | null
          email_revenue_percentage?: string | null
          email_satisfaction?: string | null
          full_name: string
          ghl_synced?: boolean | null
          id?: string
          lead_quality?: string | null
          list_size?: string | null
          make_synced?: boolean | null
          monthly_revenue?: string | null
          motivation?: string | null
          phone?: string | null
          qualified?: boolean | null
          report_data?: Json | null
          revenue_gap?: number | null
          sector?: string | null
          status?: string | null
          website?: string | null
          yearly_potential?: number | null
        }
        Update: {
          active_flows?: string[] | null
          benchmark_email_revenue?: number | null
          company_name?: string | null
          created_at?: string
          current_email_revenue?: number | null
          custom_sector?: string | null
          disqualification_reason?: string | null
          email?: string
          email_health_score?: number | null
          email_revenue_percentage?: string | null
          email_satisfaction?: string | null
          full_name?: string
          ghl_synced?: boolean | null
          id?: string
          lead_quality?: string | null
          list_size?: string | null
          make_synced?: boolean | null
          monthly_revenue?: string | null
          motivation?: string | null
          phone?: string | null
          qualified?: boolean | null
          report_data?: Json | null
          revenue_gap?: number | null
          sector?: string | null
          status?: string | null
          website?: string | null
          yearly_potential?: number | null
        }
        Relationships: []
      }
      saved_news_items: {
        Row: {
          created_at: string
          digest_date: string | null
          digest_id: string | null
          id: string
          item_data: Json
          last_reproposed_at: string | null
          notes: string | null
          source: string | null
          status: string
          tags: string[]
          times_reproposed: number
          title: string
          url: string | null
          used_at: string | null
        }
        Insert: {
          created_at?: string
          digest_date?: string | null
          digest_id?: string | null
          id?: string
          item_data: Json
          last_reproposed_at?: string | null
          notes?: string | null
          source?: string | null
          status?: string
          tags?: string[]
          times_reproposed?: number
          title: string
          url?: string | null
          used_at?: string | null
        }
        Update: {
          created_at?: string
          digest_date?: string | null
          digest_id?: string | null
          id?: string
          item_data?: Json
          last_reproposed_at?: string | null
          notes?: string | null
          source?: string | null
          status?: string
          tags?: string[]
          times_reproposed?: number
          title?: string
          url?: string | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_news_items_digest_id_fkey"
            columns: ["digest_id"]
            isOneToOne: false
            referencedRelation: "daily_digests"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_session_secret_hash: { Args: never; Returns: string }
      get_report_by_id: { Args: { report_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
