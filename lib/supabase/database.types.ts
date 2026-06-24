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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      applications: {
        Row: {
          applied_at: string | null
          ats_submission_id: string | null
          extension_token: string | null
          id: string
          job_id: string | null
          notes: string | null
          pending_questions: Json | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          visa_warning: boolean
        }
        Insert: {
          applied_at?: string | null
          ats_submission_id?: string | null
          extension_token?: string | null
          id?: string
          job_id?: string | null
          notes?: string | null
          pending_questions?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          visa_warning?: boolean
        }
        Update: {
          applied_at?: string | null
          ats_submission_id?: string | null
          extension_token?: string | null
          id?: string
          job_id?: string | null
          notes?: string | null
          pending_questions?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          visa_warning?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_connections: {
        Row: {
          access_token: string
          calendar_id: string | null
          created_at: string
          employer_id: string
          expires_at: string | null
          id: string
          last_synced_at: string | null
          provider: string | null
          provider_account_email: string
          refresh_token: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          calendar_id?: string | null
          created_at?: string
          employer_id: string
          expires_at?: string | null
          id?: string
          last_synced_at?: string | null
          provider?: string | null
          provider_account_email?: string
          refresh_token?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          calendar_id?: string | null
          created_at?: string
          employer_id?: string
          expires_at?: string | null
          id?: string
          last_synced_at?: string | null
          provider?: string | null
          provider_account_email?: string
          refresh_token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_connections_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          availability_date: string | null
          cover_letter_default: string | null
          created_at: string | null
          current_city: string | null
          degree_type: string | null
          disability_status: string | null
          email: string | null
          embedding: string | null
          ethnicity: string | null
          expected_salary_hkd: number | null
          expected_salary_sgd: number | null
          first_name: string | null
          gender: string | null
          gpa: string | null
          grad_month_year: string | null
          hk_residency: string | null
          hk_university: string | null
          id: string
          last_name: string | null
          linkedin_url: string | null
          major: string | null
          minor: string | null
          nationality: string | null
          notice_period: string | null
          ns_status: string | null
          open_to_negotiation: boolean | null
          phone_country_code: string | null
          phone_number: string | null
          preferred_location: string[] | null
          preferred_name: string | null
          preferred_work_type: string[] | null
          referral_source: string | null
          resume_filename: string | null
          resume_url: string | null
          sg_residency: string | null
          sg_university: string | null
          skills: string[]
          target_role: string | null
          updated_at: string | null
          veteran_status: string | null
          website_url: string | null
          years_experience: string | null
        }
        Insert: {
          availability_date?: string | null
          cover_letter_default?: string | null
          created_at?: string | null
          current_city?: string | null
          degree_type?: string | null
          disability_status?: string | null
          email?: string | null
          embedding?: string | null
          ethnicity?: string | null
          expected_salary_hkd?: number | null
          expected_salary_sgd?: number | null
          first_name?: string | null
          gender?: string | null
          gpa?: string | null
          grad_month_year?: string | null
          hk_residency?: string | null
          hk_university?: string | null
          id: string
          last_name?: string | null
          linkedin_url?: string | null
          major?: string | null
          minor?: string | null
          nationality?: string | null
          notice_period?: string | null
          ns_status?: string | null
          open_to_negotiation?: boolean | null
          phone_country_code?: string | null
          phone_number?: string | null
          preferred_location?: string[] | null
          preferred_name?: string | null
          preferred_work_type?: string[] | null
          referral_source?: string | null
          resume_filename?: string | null
          resume_url?: string | null
          sg_residency?: string | null
          sg_university?: string | null
          skills?: string[]
          target_role?: string | null
          updated_at?: string | null
          veteran_status?: string | null
          website_url?: string | null
          years_experience?: string | null
        }
        Update: {
          availability_date?: string | null
          cover_letter_default?: string | null
          created_at?: string | null
          current_city?: string | null
          degree_type?: string | null
          disability_status?: string | null
          email?: string | null
          embedding?: string | null
          ethnicity?: string | null
          expected_salary_hkd?: number | null
          expected_salary_sgd?: number | null
          first_name?: string | null
          gender?: string | null
          gpa?: string | null
          grad_month_year?: string | null
          hk_residency?: string | null
          hk_university?: string | null
          id?: string
          last_name?: string | null
          linkedin_url?: string | null
          major?: string | null
          minor?: string | null
          nationality?: string | null
          notice_period?: string | null
          ns_status?: string | null
          open_to_negotiation?: boolean | null
          phone_country_code?: string | null
          phone_number?: string | null
          preferred_location?: string[] | null
          preferred_name?: string | null
          preferred_work_type?: string[] | null
          referral_source?: string | null
          resume_filename?: string | null
          resume_url?: string | null
          sg_residency?: string | null
          sg_university?: string | null
          skills?: string[]
          target_role?: string | null
          updated_at?: string | null
          veteran_status?: string | null
          website_url?: string | null
          years_experience?: string | null
        }
        Relationships: []
      }
      employers: {
        Row: {
          company_name: string
          contact_name: string | null
          created_at: string | null
          email: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          company_name: string
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          company_name?: string
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      jobs: {
        Row: {
          active: boolean | null
          ats_board_token: string | null
          ats_fallback_url: string | null
          ats_job_id: string | null
          ats_type: string
          company: string
          created_at: string | null
          description: string | null
          division: string | null
          embedding: string | null
          filled_spots: number | null
          id: string
          location: string
          logo_url: string | null
          posted_by: string | null
          role: string
          salary_range: string | null
          source: string | null
          tags: string[] | null
          total_spots: number | null
          visa_sponsorship: boolean | null
        }
        Insert: {
          active?: boolean | null
          ats_board_token?: string | null
          ats_fallback_url?: string | null
          ats_job_id?: string | null
          ats_type: string
          company: string
          created_at?: string | null
          description?: string | null
          division?: string | null
          embedding?: string | null
          filled_spots?: number | null
          id?: string
          location: string
          logo_url?: string | null
          posted_by?: string | null
          role: string
          salary_range?: string | null
          source?: string | null
          tags?: string[] | null
          total_spots?: number | null
          visa_sponsorship?: boolean | null
        }
        Update: {
          active?: boolean | null
          ats_board_token?: string | null
          ats_fallback_url?: string | null
          ats_job_id?: string | null
          ats_type?: string
          company?: string
          created_at?: string | null
          description?: string | null
          division?: string | null
          embedding?: string | null
          filled_spots?: number | null
          id?: string
          location?: string
          logo_url?: string | null
          posted_by?: string | null
          role?: string
          salary_range?: string | null
          source?: string | null
          tags?: string[] | null
          total_spots?: number | null
          visa_sponsorship?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_jobs: {
        Row: {
          job_id: string
          saved_at: string | null
          user_id: string
        }
        Insert: {
          job_id: string
          saved_at?: string | null
          user_id: string
        }
        Update: {
          job_id?: string
          saved_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      skipped_jobs: {
        Row: {
          job_id: string
          skipped_at: string | null
          user_id: string
        }
        Insert: {
          job_id: string
          skipped_at?: string | null
          user_id: string
        }
        Update: {
          job_id?: string
          skipped_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skipped_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skipped_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_candidate_exists: {
        Args: { email_to_check: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
