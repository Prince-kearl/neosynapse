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
      appointments: {
        Row: {
          appointment_type: string
          created_at: string
          facility_id: string | null
          id: string
          patient_id: string
          professional_id: string | null
          reason_for_visit: string | null
          scheduled_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          appointment_type?: string
          created_at?: string
          facility_id?: string | null
          id?: string
          patient_id: string
          professional_id?: string | null
          reason_for_visit?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_type?: string
          created_at?: string
          facility_id?: string | null
          id?: string
          patient_id?: string
          professional_id?: string | null
          reason_for_visit?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      clinical_notes: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          draft_json: Json | null
          encounter_id: string
          final_json: Json | null
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          draft_json?: Json | null
          encounter_id: string
          final_json?: Json | null
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          draft_json?: Json | null
          encounter_id?: string
          final_json?: Json | null
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      consents: {
        Row: {
          consent_type: string
          created_at: string
          encounter_id: string | null
          granted: boolean
          id: string
          patient_id: string
          version: string | null
        }
        Insert: {
          consent_type: string
          created_at?: string
          encounter_id?: string | null
          granted?: boolean
          id?: string
          patient_id: string
          version?: string | null
        }
        Update: {
          consent_type?: string
          created_at?: string
          encounter_id?: string | null
          granted?: boolean
          id?: string
          patient_id?: string
          version?: string | null
        }
        Relationships: []
      }
      consultation_rooms: {
        Row: {
          answer: Json | null
          consent_recording: boolean
          created_at: string
          created_by: string
          doctor_id: string
          encounter_id: string | null
          id: string
          offer: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          answer?: Json | null
          consent_recording?: boolean
          created_at?: string
          created_by: string
          doctor_id: string
          encounter_id?: string | null
          id?: string
          offer?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          answer?: Json | null
          consent_recording?: boolean
          created_at?: string
          created_by?: string
          doctor_id?: string
          encounter_id?: string | null
          id?: string
          offer?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_rooms_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
        ]
      }
      encounters: {
        Row: {
          appointment_id: string | null
          created_at: string
          encounter_type: string
          ended_at: string | null
          id: string
          patient_id: string
          professional_id: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          encounter_type?: string
          ended_at?: string | null
          id?: string
          patient_id: string
          professional_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          encounter_type?: string
          ended_at?: string | null
          id?: string
          patient_id?: string
          professional_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      facilities: {
        Row: {
          contact_phone: string | null
          created_at: string
          facility_type: string | null
          id: string
          location: string | null
          name: string
          updated_at: string
        }
        Insert: {
          contact_phone?: string | null
          created_at?: string
          facility_type?: string | null
          id?: string
          location?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          contact_phone?: string | null
          created_at?: string
          facility_type?: string | null
          id?: string
          location?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          meal_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meal_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meal_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
        ]
      }
      ice_candidates: {
        Row: {
          candidate: Json
          created_at: string
          id: string
          room_id: string
          sender: string
        }
        Insert: {
          candidate: Json
          created_at?: string
          id?: string
          room_id: string
          sender: string
        }
        Update: {
          candidate?: Json
          created_at?: string
          id?: string
          room_id?: string
          sender?: string
        }
        Relationships: [
          {
            foreignKeyName: "ice_candidates_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "consultation_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          facility_id: string | null
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: string
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          facility_id?: string | null
          id?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["user_role"]
          status?: string
          token?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          facility_id?: string | null
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          token?: string
        }
        Relationships: []
      }
      meals: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          original_price: number | null
          price: number
          rating: number | null
          tags: string[] | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          original_price?: number | null
          price: number
          rating?: number | null
          tags?: string[] | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          original_price?: number | null
          price?: number
          rating?: number | null
          tags?: string[] | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meals_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_reports: {
        Row: {
          created_at: string
          encounter_id: string | null
          id: string
          patient_id: string
          report_json: Json | null
          report_type: string
        }
        Insert: {
          created_at?: string
          encounter_id?: string | null
          id?: string
          patient_id: string
          report_json?: Json | null
          report_type: string
        }
        Update: {
          created_at?: string
          encounter_id?: string | null
          id?: string
          patient_id?: string
          report_json?: Json | null
          report_type?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          meal_id: string
          order_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          meal_id: string
          order_id: string
          quantity?: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          meal_id?: string
          order_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
      medical_history: {
        Row: {
          allergies: string[]
          completed_at: string | null
          created_at: string
          current_medications: string[]
          existing_conditions: string[]
          family_medical_history: string | null
          id: string
          last_reviewed_at: string | null
          notes: string | null
          onboarding_completed: boolean
          past_surgeries: string[]
          privacy_acknowledged_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allergies?: string[]
          completed_at?: string | null
          created_at?: string
          current_medications?: string[]
          existing_conditions?: string[]
          family_medical_history?: string | null
          id?: string
          last_reviewed_at?: string | null
          notes?: string | null
          onboarding_completed?: boolean
          past_surgeries?: string[]
          privacy_acknowledged_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allergies?: string[]
          completed_at?: string | null
          created_at?: string
          current_medications?: string[]
          existing_conditions?: string[]
          family_medical_history?: string | null
          id?: string
          last_reviewed_at?: string | null
          notes?: string | null
          onboarding_completed?: boolean
          past_surgeries?: string[]
          privacy_acknowledged_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      medical_history_files: {
        Row: {
          created_at: string
          document_type: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          medical_history_id: string
          mime_type: string | null
          storage_bucket: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_type?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          medical_history_id: string
          mime_type?: string | null
          storage_bucket?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          medical_history_id?: string
          mime_type?: string | null
          storage_bucket?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_history_files_medical_history_id_fkey"
            columns: ["medical_history_id"]
            isOneToOne: false
            referencedRelation: "medical_history"
            referencedColumns: ["id"]
          },
        ]
      }
            foreignKeyName: "order_items_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          delivery_address: string
          delivery_notes: string | null
          delivery_phone: string
          id: string
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at: string
          user_id: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          delivery_address: string
          delivery_notes?: string | null
          delivery_phone: string
          id?: string
          status?: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at?: string
          user_id: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          delivery_address?: string
          delivery_notes?: string | null
          delivery_phone?: string
          id?: string
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_profiles: {
        Row: {
          created_at: string
          date_of_birth: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          gender: string | null
          id: string
          insurance_info: Json | null
          phone: string | null
          preferred_language: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          gender?: string | null
          id?: string
          insurance_info?: Json | null
          phone?: string | null
          preferred_language?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          gender?: string | null
          id?: string
          insurance_info?: Json | null
          phone?: string | null
          preferred_language?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      professional_profiles: {
        Row: {
          created_at: string
          facility_id: string | null
          id: string
          license_number: string | null
          profession_type: string | null
          settings_json: Json | null
          specialty: string | null
          updated_at: string
          user_id: string
          verification_status: string
        }
        Insert: {
          created_at?: string
          facility_id?: string | null
          id?: string
          license_number?: string | null
          profession_type?: string | null
          settings_json?: Json | null
          specialty?: string | null
          updated_at?: string
          user_id: string
          verification_status?: string
        }
        Update: {
          created_at?: string
          facility_id?: string | null
          id?: string
          license_number?: string | null
          profession_type?: string | null
          settings_json?: Json | null
          specialty?: string | null
          updated_at?: string
          user_id?: string
          verification_status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          default_budget: number | null
          diet_preferences: string[] | null
          display_name: string | null
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          settings_json: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          default_budget?: number | null
          diet_preferences?: string[] | null
          display_name?: string | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          settings_json?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          default_budget?: number | null
          diet_preferences?: string[] | null
          display_name?: string | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          settings_json?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          meal_id: string | null
          rating: number
          user_id: string
          vendor_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          meal_id?: string | null
          rating: number
          user_id: string
          vendor_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          meal_id?: string | null
          rating?: number
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      transcripts: {
        Row: {
          created_at: string
          encounter_id: string
          id: string
          speaker_map: Json | null
          transcript_json: Json | null
        }
        Insert: {
          created_at?: string
          encounter_id: string
          id?: string
          speaker_map?: Json | null
          transcript_json?: Json | null
        }
        Update: {
          created_at?: string
          encounter_id?: string
          id?: string
          speaker_map?: Json | null
          transcript_json?: Json | null
        }
        Relationships: []
      }
      triage_sessions: {
        Row: {
          created_at: string
          id: string
          inputs_json: Json | null
          patient_id: string
          result_json: Json | null
          urgency_level: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          inputs_json?: Json | null
          patient_id: string
          result_json?: Json | null
          urgency_level?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          inputs_json?: Json | null
          patient_id?: string
          result_json?: Json | null
          urgency_level?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendor_follows: {
        Row: {
          created_at: string
          id: string
          user_id: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_follows_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string
          categories: string[] | null
          created_at: string
          description: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          open_hours: string | null
          phone: string
          rating: number | null
          total_orders: number | null
          total_reviews: number | null
          updated_at: string
        }
        Insert: {
          address: string
          categories?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          open_hours?: string | null
          phone: string
          rating?: number | null
          total_orders?: number | null
          total_reviews?: number | null
          updated_at?: string
        }
        Update: {
          address?: string
          categories?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          open_hours?: string | null
          phone?: string
          rating?: number | null
          total_orders?: number | null
          total_reviews?: number | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: { Args: { user_uuid: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_patient: { Args: never; Returns: boolean }
      is_professional: { Args: never; Returns: boolean }
      professional_has_encounter_access: {
        Args: { p_encounter_id: string }
        Returns: boolean
      }
      professional_has_patient_access: {
        Args: { p_patient_id: string }
        Returns: boolean
      }
    }
    Enums: {
      order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "ready"
        | "delivered"
        | "cancelled"
      user_role: "patient" | "professional" | "admin"
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
      order_status: [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "delivered",
        "cancelled",
      ],
      user_role: ["patient", "professional", "admin"],
    },
  },
} as const
