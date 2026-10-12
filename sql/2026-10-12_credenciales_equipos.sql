-- SURTICORE: credenciales de acceso (usuario / clave) para desbloquear equipos
-- Ejecutar en Supabase > SQL Editor
ALTER TABLE public.equipos ADD COLUMN IF NOT EXISTS "credUsuario" text;
ALTER TABLE public.equipos ADD COLUMN IF NOT EXISTS "credClave"   text;
