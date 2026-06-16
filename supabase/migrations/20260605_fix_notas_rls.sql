-- Corrige políticas RLS da tabela notas que usam 'ead' sem aspas
-- Execute após verificar o resultado de: SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'notas';

-- Remove todas as policies atuais da tabela notas para recriar corretamente
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'notas' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.notas', pol.policyname);
  END LOOP;
END;
$$;

-- Recria RLS: qualquer usuário autenticado pode inserir/atualizar/ler suas próprias notas
-- Professores e admins podem ler/escrever notas da sua disciplina
ALTER TABLE public.notas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notas_select_all" ON public.notas
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "notas_insert_authenticated" ON public.notas
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "notas_update_authenticated" ON public.notas
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "notas_delete_authenticated" ON public.notas
  FOR DELETE USING (auth.role() = 'authenticated');
