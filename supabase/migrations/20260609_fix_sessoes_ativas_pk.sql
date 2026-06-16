-- Reestrutura sessoes_ativas: usa usuario_id como PRIMARY KEY
-- Remove o id UUID auxiliar que causava conflito no ON CONFLICT do PostgREST
-- quando a PK (id) e a conflict column (usuario_id) eram diferentes.

-- 1. Remove FK e constraints existentes
ALTER TABLE public.sessoes_ativas DROP CONSTRAINT IF EXISTS sessoes_ativas_usuario_id_fkey;
ALTER TABLE public.sessoes_ativas DROP CONSTRAINT IF EXISTS sessoes_ativas_usuario_id_key;
ALTER TABLE public.sessoes_ativas DROP CONSTRAINT IF EXISTS sessoes_ativas_pkey;
DROP INDEX  IF EXISTS public.sessoes_ativas_pkey;
DROP INDEX  IF EXISTS public.sessoes_ativas_usuario_id_key;

-- 2. Remove coluna id desnecessária
ALTER TABLE public.sessoes_ativas DROP COLUMN IF EXISTS id;

-- 3. Torna usuario_id a PRIMARY KEY (já é NOT NULL pelo ALTER anterior)
ALTER TABLE public.sessoes_ativas
  ADD CONSTRAINT sessoes_ativas_pkey PRIMARY KEY (usuario_id);

-- 4. Recria FK para auth.users
ALTER TABLE public.sessoes_ativas
  ADD CONSTRAINT sessoes_ativas_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. Garante NOT NULL nos demais campos essenciais
ALTER TABLE public.sessoes_ativas
  ALTER COLUMN nome     SET DEFAULT '',
  ALTER COLUMN tipo     SET DEFAULT 'aluno',
  ALTER COLUMN segmento SET DEFAULT 'ead',
  ALTER COLUMN last_seen SET DEFAULT NOW(),
  ALTER COLUMN entrou_em SET DEFAULT NOW();
