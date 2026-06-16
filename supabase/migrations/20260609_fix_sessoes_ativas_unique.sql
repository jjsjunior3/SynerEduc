-- Corrige sessoes_ativas: adiciona UNIQUE em usuario_id para o upsert funcionar
-- O onConflict: 'usuario_id' no usePresence.ts requer um unique index nessa coluna.
-- Sem ele o PostgreSQL lança erro 500 ao tentar INSERT ON CONFLICT (usuario_id).

-- 1. Garante NOT NULL (não faz sentido ter sessão sem usuário)
ALTER TABLE public.sessoes_ativas
  ALTER COLUMN usuario_id SET NOT NULL;

-- 2. Adiciona unique constraint (ignora se já existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sessoes_ativas_usuario_id_key'
      AND conrelid = 'public.sessoes_ativas'::regclass
  ) THEN
    ALTER TABLE public.sessoes_ativas
      ADD CONSTRAINT sessoes_ativas_usuario_id_key UNIQUE (usuario_id);
  END IF;
END;
$$;

-- 3. Remove duplicatas antes de criar o índice (mantém o mais recente)
DELETE FROM public.sessoes_ativas a
USING public.sessoes_ativas b
WHERE a.id < b.id
  AND a.usuario_id = b.usuario_id;
