import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://demo.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'demo-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipos de base de datos
export type Profile = {
  id: string
  email: string
  full_name: string | null
  apiary_name: string | null
  location: string | null
  created_at: string
}

export type Hive = {
  id: string
  user_id: string
  code: string
  name: string | null
  status: 'saludable' | 'revision' | 'alerta' | 'sin_reina'
  queen_year: number | null
  queen_marked_color: string | null
  location: string | null
  notes: string | null
  last_inspection_date: string | null
  created_at: string
}

export type Inspection = {
  id: string
  hive_id: string
  user_id: string
  inspection_date: string
  queen_present: boolean
  queen_seen: boolean | null
  brood_pattern: 'excelente' | 'bueno' | 'regular' | 'malo' | null
  food_stores: 'alto' | 'medio' | 'bajo' | null
  temperament: 'tranquila' | 'normal' | 'nerviosa' | 'agresiva' | null
  varroa_count: number
  varroa_level: 'bajo' | 'medio' | 'alto' | 'critico' | null
  diseases: string | null
  treatments: string | null
  notes: string | null
  photos: string[] | null
  created_at: string
}

export type Harvest = {
  id: string
  hive_id: string
  user_id: string
  harvest_date: string
  honey_kg: number
  pollen_kg: number
  propolis_g: number
  wax_g: number
  quality: 'premium' | 'estandar' | 'baja' | null
  notes: string | null
  created_at: string
}

export type Task = {
  id: string
  user_id: string
  hive_id: string | null
  title: string
  description: string | null
  due_date: string | null
  priority: 'baja' | 'media' | 'alta' | 'urgente'
  completed: boolean
  completed_at: string | null
  created_at: string
}
