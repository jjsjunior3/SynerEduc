-- Corrige get_segmento_usuario() sem recursão infinita
-- Problema da v1: ler de public.users dentro de um SECURITY DEFINER não quebra o ciclo
--   porque o postgres chama a policy users_select_staff → get_segmento_usuario()
--   → SELECT FROM public.users → users_select_staff → ... (stack overflow → 500)
--
-- Solução: ler de auth.users (schema auth não tem RLS público) e fazer COALESCE
--   com user_metadata, app_metadata e fallback para a tabela via SET row_security=off

CREATE OR REPLACE FUNCTION public.get_segmento_usuario()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_segmento TEXT;
BEGIN
  -- 1. Tenta user_metadata do JWT (rápido, sem query)
  v_segmento := auth.jwt() -> 'user_metadata' ->> 'segmento';
  IF v_segmento IS NOT NULL THEN
    RETURN v_segmento;
  END IF;

  -- 2. Tenta app_metadata do JWT
  v_segmento := auth.jwt() -> 'app_metadata' ->> 'segmento';
  IF v_segmento IS NOT NULL THEN
    RETURN v_segmento;
  END IF;

  -- 3. Lê direto de auth.users (sem RLS, sem recursão)
  SELECT raw_user_meta_data ->> 'segmento'
  INTO   v_segmento
  FROM   auth.users
  WHERE  id = auth.uid();

  IF v_segmento IS NOT NULL THEN
    RETURN v_segmento;
  END IF;

  -- 4. Lê app_metadata de auth.users
  SELECT raw_app_meta_data ->> 'segmento'
  INTO   v_segmento
  FROM   auth.users
  WHERE  id = auth.uid();

  RETURN v_segmento;  -- pode ser NULL se nunca foi preenchido
END;
$$;
