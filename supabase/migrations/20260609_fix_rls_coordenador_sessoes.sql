-- =============================================================================
-- Migration: Corrige RLS da tabela sessoes_ativas + acesso de leitura do
--            coordenador às tabelas de dados (users, frequencia_diaria, notas,
--            atividades, atividades_alunos, grade_horaria)
-- Data: 2026-06-09
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. sessoes_ativas — cria a tabela se não existir e garante as policies
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sessoes_ativas (
  usuario_id  UUID        PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  nome        TEXT        NOT NULL DEFAULT '',
  tipo        TEXT        NOT NULL DEFAULT 'aluno',
  segmento    TEXT        NOT NULL DEFAULT 'ead',
  last_seen   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entrou_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sessoes_ativas ENABLE ROW LEVEL SECURITY;

-- Remove policies antigas para recriar sem conflito
DROP POLICY IF EXISTS "usuario gerencia propria sessao"  ON public.sessoes_ativas;
DROP POLICY IF EXISTS "usuario insere propria sessao"    ON public.sessoes_ativas;
DROP POLICY IF EXISTS "usuario atualiza propria sessao"  ON public.sessoes_ativas;
DROP POLICY IF EXISTS "usuario deleta propria sessao"    ON public.sessoes_ativas;
DROP POLICY IF EXISTS "admin ve todas sessoes"           ON public.sessoes_ativas;
DROP POLICY IF EXISTS "autenticado ve sessoes"           ON public.sessoes_ativas;

-- Cada usuário autenticado pode upsert/delete a própria linha
CREATE POLICY "usuario gerencia propria sessao"
  ON public.sessoes_ativas
  FOR ALL
  USING     (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

-- Admin e coordenador podem ler todas as sessões ativas
CREATE POLICY "admin ve todas sessoes"
  ON public.sessoes_ativas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.tipo IN (
          'admin_geral', 'admin_synerEduc', 'administrador',
          'coordenador', 'gestor_geral'
        )
    )
  );

-- -----------------------------------------------------------------------------
-- 2. users — garante que coordenador/admin leia outros usuários
--    (necessário para o dashboard mostrar total de alunos e professores)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "coordenador le users"    ON public.users;
DROP POLICY IF EXISTS "admin le todos users"    ON public.users;
DROP POLICY IF EXISTS "usuario le proprio perfil" ON public.users;

-- Qualquer autenticado lê o próprio perfil
CREATE POLICY "usuario le proprio perfil"
  ON public.users
  FOR SELECT
  USING (id = auth.uid());

-- Coordenador, gestor e admin leem todos os users do sistema
CREATE POLICY "gestores le todos users"
  ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.tipo IN (
          'coordenador', 'administrador', 'admin_geral',
          'admin_synerEduc', 'gestor_geral', 'secretaria'
        )
    )
  );

-- -----------------------------------------------------------------------------
-- 3. frequencia_diaria — coordenador precisa ler para os gráficos do dashboard
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "coordenador le frequencia" ON public.frequencia_diaria;

CREATE POLICY "coordenador le frequencia"
  ON public.frequencia_diaria
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.tipo IN (
          'coordenador', 'administrador', 'admin_geral',
          'admin_synerEduc', 'gestor_geral'
        )
    )
  );

-- -----------------------------------------------------------------------------
-- 4. grade_horaria — coordenador precisa ler para detectar professores ativos hoje
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "coordenador le grade_horaria" ON public.grade_horaria;

CREATE POLICY "coordenador le grade_horaria"
  ON public.grade_horaria
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.tipo IN (
          'coordenador', 'administrador', 'admin_geral',
          'admin_synerEduc', 'gestor_geral'
        )
    )
  );

-- -----------------------------------------------------------------------------
-- 5. atividades + atividades_alunos — coordenador lê para contar entregas
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "coordenador le atividades"        ON public.atividades;
DROP POLICY IF EXISTS "coordenador le atividades_alunos" ON public.atividades_alunos;

CREATE POLICY "coordenador le atividades"
  ON public.atividades
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.tipo IN (
          'coordenador', 'administrador', 'admin_geral',
          'admin_synerEduc', 'gestor_geral', 'professor'
        )
    )
  );

CREATE POLICY "coordenador le atividades_alunos"
  ON public.atividades_alunos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.tipo IN (
          'coordenador', 'administrador', 'admin_geral',
          'admin_synerEduc', 'gestor_geral', 'professor', 'aluno'
        )
    )
  );
