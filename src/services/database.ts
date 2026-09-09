import { supabase, type Profile, type Hive, type Inspection, type Harvest, type Task } from '../lib/supabase'

// ============================================
// PERFILES
// ============================================

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }
  return data
}

export async function updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating profile:', error)
    return null
  }
  return data
}

// ============================================
// COLMENAS
// ============================================

export async function getHives(userId: string): Promise<Hive[]> {
  const { data, error } = await supabase
    .from('hives')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching hives:', error)
    return []
  }
  return data || []
}

export async function addHive(hive: Omit<Hive, 'id' | 'created_at'>): Promise<Hive | null> {
  const { data, error } = await supabase
    .from('hives')
    .insert([hive])
    .select()
    .single()

  if (error) {
    console.error('Error adding hive:', error)
    return null
  }
  return data
}

export async function updateHive(id: string, updates: Partial<Hive>): Promise<Hive | null> {
  const { data, error } = await supabase
    .from('hives')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating hive:', error)
    return null
  }
  return data
}

export async function deleteHive(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('hives')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting hive:', error)
    return false
  }
  return true
}

// ============================================
// INSPECCIONES
// ============================================

export async function getInspections(userId: string, hiveId?: string): Promise<Inspection[]> {
  let query = supabase
    .from('inspections')
    .select('*')
    .eq('user_id', userId)
    .order('inspection_date', { ascending: false })

  if (hiveId) {
    query = query.eq('hive_id', hiveId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching inspections:', error)
    return []
  }
  return data || []
}

export async function addInspection(inspection: Omit<Inspection, 'id' | 'created_at'>): Promise<Inspection | null> {
  const { data, error } = await supabase
    .from('inspections')
    .insert([inspection])
    .select()
    .single()

  if (error) {
    console.error('Error adding inspection:', error)
    return null
  }

  // Actualizar fecha de última inspección de la colmena
  if (data) {
    await updateHive(inspection.hive_id, {
      last_inspection_date: inspection.inspection_date
    })
  }

  return data
}

export async function deleteInspection(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('inspections')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting inspection:', error)
    return false
  }
  return true
}

// ============================================
// COSECHAS
// ============================================

export async function getHarvests(userId: string, hiveId?: string): Promise<Harvest[]> {
  let query = supabase
    .from('harvests')
    .select('*')
    .eq('user_id', userId)
    .order('harvest_date', { ascending: false })

  if (hiveId) {
    query = query.eq('hive_id', hiveId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching harvests:', error)
    return []
  }
  return data || []
}

export async function addHarvest(harvest: Omit<Harvest, 'id' | 'created_at'>): Promise<Harvest | null> {
  const { data, error } = await supabase
    .from('harvests')
    .insert([harvest])
    .select()
    .single()

  if (error) {
    console.error('Error adding harvest:', error)
    return null
  }
  return data
}

export async function deleteHarvest(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('harvests')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting harvest:', error)
    return false
  }
  return true
}

// ============================================
// TAREAS
// ============================================

export async function getTasks(userId: string, hiveId?: string): Promise<Task[]> {
  let query = supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('due_date', { ascending: true })

  if (hiveId) {
    query = query.eq('hive_id', hiveId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching tasks:', error)
    return []
  }
  return data || []
}

export async function addTask(task: Omit<Task, 'id' | 'created_at' | 'completed_at'>): Promise<Task | null> {
  const { data, error } = await supabase
    .from('tasks')
    .insert([task])
    .select()
    .single()

  if (error) {
    console.error('Error adding task:', error)
    return null
  }
  return data
}

export async function completeTask(id: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from('tasks')
    .update({
      completed: true,
      completed_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error completing task:', error)
    return null
  }
  return data
}

export async function uncompleteTask(id: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from('tasks')
    .update({
      completed: false,
      completed_at: null
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error uncompleting task:', error)
    return null
  }
  return data
}

export async function deleteTask(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting task:', error)
    return false
  }
  return true
}
