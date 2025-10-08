import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Database types for TypeScript
export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          subdomain: string | null
          acronym: string | null
          brand_name: string | null
          tagline: string | null
          colors: string
          street1: string | null
          street2: string | null
          city: string | null
          state: string | null
          postal_code: string | null
          country: string
          phone: string | null
          fax: string | null
          email: string | null
          website: string | null
          clia_id: string | null
          taxonomy: string | null
          timezone: string
          client_name: string
          patient_id_title: string
          clinician_title: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          subdomain?: string | null
          acronym?: string | null
          brand_name?: string | null
          tagline?: string | null
          colors?: string
          street1?: string | null
          street2?: string | null
          city?: string | null
          state?: string | null
          postal_code?: string | null
          country?: string
          phone?: string | null
          fax?: string | null
          email?: string | null
          website?: string | null
          clia_id?: string | null
          taxonomy?: string | null
          timezone?: string
          client_name?: string
          patient_id_title?: string
          clinician_title?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          subdomain?: string | null
          acronym?: string | null
          brand_name?: string | null
          tagline?: string | null
          colors?: string
          street1?: string | null
          street2?: string | null
          city?: string | null
          state?: string | null
          postal_code?: string | null
          country?: string
          phone?: string | null
          fax?: string | null
          email?: string | null
          website?: string | null
          clia_id?: string | null
          taxonomy?: string | null
          timezone?: string
          client_name?: string
          patient_id_title?: string
          clinician_title?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          encrypted_password: string | null
          first_name: string | null
          last_name: string | null
          phone: string | null
          npi: string | null
          license_number: string | null
          specialty: string | null
          is_active: boolean
          email_verified: boolean
          phone_verified: boolean
          created_at: string
          updated_at: string
          last_sign_in_at: string | null
        }
        Insert: {
          id?: string
          email: string
          encrypted_password?: string | null
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          npi?: string | null
          license_number?: string | null
          specialty?: string | null
          is_active?: boolean
          email_verified?: boolean
          phone_verified?: boolean
          created_at?: string
          updated_at?: string
          last_sign_in_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          encrypted_password?: string | null
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          npi?: string | null
          license_number?: string | null
          specialty?: string | null
          is_active?: boolean
          email_verified?: boolean
          phone_verified?: boolean
          created_at?: string
          updated_at?: string
          last_sign_in_at?: string | null
        }
      }
      patients: {
        Row: {
          id: string
          organization_id: string
          facility_id: string | null
          assigned_provider_id: string | null
          patient_id_alt: string | null
          first_name: string
          middle_name: string | null
          last_name: string
          suffix: string | null
          date_of_birth: string | null
          gender: string | null
          gender_identity: string | null
          race: string | null
          ethnicity: string | null
          phone1: string | null
          phone1_verified: boolean
          phone2: string | null
          phone3: string | null
          email: string | null
          email_verified: boolean
          street1: string | null
          street2: string | null
          city: string | null
          state: string | null
          postal_code: string | null
          country: string
          ssn: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          last_active_at: string | null
          cycle_start_date: string
        }
        Insert: {
          id?: string
          organization_id: string
          cycle_start_date?: string
          facility_id?: string | null
          assigned_provider_id?: string | null
          patient_id_alt?: string | null
          first_name: string
          middle_name?: string | null
          last_name: string
          suffix?: string | null
          date_of_birth?: string | null
          gender?: string | null
          gender_identity?: string | null
          race?: string | null
          ethnicity?: string | null
          phone1?: string | null
          phone1_verified?: boolean
          phone2?: string | null
          phone3?: string | null
          email?: string | null
          email_verified?: boolean
          street1?: string | null
          street2?: string | null
          city?: string | null
          state?: string | null
          postal_code?: string | null
          country?: string
          ssn?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          last_active_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          facility_id?: string | null
          assigned_provider_id?: string | null
          patient_id_alt?: string | null
          first_name?: string
          middle_name?: string | null
          last_name?: string
          suffix?: string | null
          date_of_birth?: string | null
          gender?: string | null
          gender_identity?: string | null
          race?: string | null
          ethnicity?: string | null
          phone1?: string | null
          phone1_verified?: boolean
          phone2?: string | null
          phone3?: string | null
          email?: string | null
          email_verified?: boolean
          street1?: string | null
          street2?: string | null
          city?: string | null
          state?: string | null
          postal_code?: string | null
          country?: string
          ssn?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          last_active_at?: string | null
        }
      }
    }
  }
} 