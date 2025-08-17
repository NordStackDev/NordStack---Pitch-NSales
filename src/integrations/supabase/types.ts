// types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      users: {
        Row: UserProfile
        Insert: Omit<UserProfile, "created_at"> & { created_at?: string }
        Update: Partial<UserProfile>
        Relationships: [
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      pitches: {
        Row: Pitch
        Insert: Omit<Pitch, "id" | "created_at"> & { id?: string; created_at?: string }
        Update: Partial<Pitch>
        Relationships: [
          {
            foreignKeyName: "pitches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      sales: {
        Row: Sale
        Insert: Omit<Sale, "id" | "created_at"> & { id?: string; created_at?: string }
        Update: Partial<Sale>
        Relationships: [
          {
            foreignKeyName: "sales_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Enums: {
      user_role: "team_lead" | "seller"
    }
  }
}

// === App-specific helper types ===

export type UserProfile = {
  id: string
  email: string
  name: string
  company_id: string
  role: "team_lead" | "seller"
  created_at: string
}

export type Pitch = {
  id: string
  user_id: string
  value: number
  date: string
  created_at: string
}

export type Sale = {
  id: string
  user_id: string
  value: number
  date: string
  created_at: string
}
