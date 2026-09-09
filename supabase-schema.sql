-- ============================================
-- SUPABASE DATABASE SCHEMA - APIARIOS CARRIÓN
-- ============================================
-- Ejecuta este SQL en el SQL Editor de Supabase
-- para crear todas las tablas necesarias

-- ============================================
-- 1. TABLA DE PERFILES DE USUARIOS
-- ============================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  apiary_name TEXT DEFAULT 'Mi Apiario',
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. TABLA DE COLMENAS
-- ============================================
CREATE TABLE hives (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,
  name TEXT,
  status TEXT DEFAULT 'saludable' CHECK (status IN ('saludable', 'revision', 'alerta', 'sin_reina')),
  queen_year INTEGER,
  queen_marked_color TEXT,
  location TEXT,
  notes TEXT,
  last_inspection_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. TABLA DE INSPECCIONES
-- ============================================
CREATE TABLE inspections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hive_id UUID REFERENCES hives(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  queen_present BOOLEAN DEFAULT true,
  queen_seen BOOLEAN,
  brood_pattern TEXT CHECK (brood_pattern IN ('excelente', 'bueno', 'regular', 'malo')),
  food_stores TEXT CHECK (food_stores IN ('alto', 'medio', 'bajo')),
  temperament TEXT CHECK (temperament IN ('tranquila', 'normal', 'nerviosa', 'agresiva')),
  varroa_count INTEGER DEFAULT 0,
  varroa_level TEXT CHECK (varroa_level IN ('bajo', 'medio', 'alto', 'critico')),
  diseases TEXT,
  treatments TEXT,
  notes TEXT,
  photos TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. TABLA DE COSECHAS
-- ============================================
CREATE TABLE harvests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hive_id UUID REFERENCES hives(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  harvest_date DATE NOT NULL,
  honey_kg DECIMAL(10,2) DEFAULT 0,
  pollen_kg DECIMAL(10,2) DEFAULT 0,
  propolis_g DECIMAL(10,2) DEFAULT 0,
  wax_g DECIMAL(10,2) DEFAULT 0,
  quality TEXT CHECK (quality IN ('premium', 'estandar', 'baja')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. TABLA DE TAREAS
-- ============================================
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  hive_id UUID REFERENCES hives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  priority TEXT DEFAULT 'media' CHECK (priority IN ('baja', 'media', 'alta', 'urgente')),
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 6. HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hives ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE harvests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. POLÍTICAS RLS - PERFILES
-- ============================================
CREATE POLICY "Users can view own profile" ON profiles 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles 
  FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- 8. POLÍTICAS RLS - COLMENAS
-- ============================================
CREATE POLICY "Users can view own hives" ON hives 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own hives" ON hives 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own hives" ON hives 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own hives" ON hives 
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 9. POLÍTICAS RLS - INSPECCIONES
-- ============================================
CREATE POLICY "Users can view own inspections" ON inspections 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own inspections" ON inspections 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own inspections" ON inspections 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own inspections" ON inspections 
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 10. POLÍTICAS RLS - COSECHAS
-- ============================================
CREATE POLICY "Users can view own harvests" ON harvests 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own harvests" ON harvests 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own harvests" ON harvests 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own harvests" ON harvests 
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 11. POLÍTICAS RLS - TAREAS
-- ============================================
CREATE POLICY "Users can view own tasks" ON tasks 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks" ON tasks 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks" ON tasks 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks" ON tasks 
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 12. FUNCIÓN PARA CREAR PERFIL AUTOMÁTICAMENTE
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 13. TRIGGER PARA CREAR PERFIL AL REGISTRARSE
-- ============================================
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 14. ÍNDICES PARA MEJOR RENDIMIENTO
-- ============================================
CREATE INDEX idx_hives_user_id ON hives(user_id);
CREATE INDEX idx_hives_status ON hives(status);
CREATE INDEX idx_inspections_user_id ON inspections(user_id);
CREATE INDEX idx_inspections_hive_id ON inspections(hive_id);
CREATE INDEX idx_inspections_date ON inspections(inspection_date DESC);
CREATE INDEX idx_harvests_user_id ON harvests(user_id);
CREATE INDEX idx_harvests_hive_id ON harvests(hive_id);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_completed ON tasks(completed);

-- ============================================
-- FIN DEL SCHEMA
-- ============================================
-- ¡Listo! Tu base de datos está configurada.
-- Ahora puedes usar la aplicación con datos reales persistentes.
