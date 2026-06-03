-- =============================================================================
-- Migration: Tabelas de controle dos Agentes de IA
-- Issue: #19 — F5.0 Infraestrutura base
-- Data: 2026-06-03
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. agente_limites — limites por perfil, configurável pelo gestor
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agente_limites (
  perfil            TEXT PRIMARY KEY,
  tokens_dia        INTEGER NOT NULL DEFAULT 50000,
  requisicoes_dia   INTEGER NOT NULL DEFAULT 100,
  atualizado_em     TIMESTAMPTZ DEFAULT NOW()
);

-- Valores iniciais por perfil (ajustáveis pelo gestor)
INSERT INTO agente_limites (perfil, tokens_dia, requisicoes_dia) VALUES
  ('secretaria',   80000, 150),
  ('coordenador',  60000, 100),
  ('gestor',       80000, 150),
  ('professor',    60000, 120),
  ('aluno',        20000,  50),
  ('financeiro',   60000, 100),
  ('admin_geral',  50000, 100),
  ('admin_synerEduc', 200000, 500)
ON CONFLICT (perfil) DO NOTHING;

-- RLS: apenas admin pode alterar limites
ALTER TABLE agente_limites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin pode gerenciar limites"
  ON agente_limites
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.tipo IN ('admin_geral', 'admin_synerEduc')
    )
  );

CREATE POLICY "autenticados podem ler limites"
  ON agente_limites
  FOR SELECT
  USING (auth.role() = 'authenticated');


-- -----------------------------------------------------------------------------
-- 2. agente_uso_diario — consumo acumulado por usuário/dia
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agente_uso_diario (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID        REFERENCES auth.users ON DELETE CASCADE,
  data            DATE        NOT NULL DEFAULT CURRENT_DATE,
  tokens_input    INTEGER     NOT NULL DEFAULT 0,
  tokens_output   INTEGER     NOT NULL DEFAULT 0,
  requisicoes     INTEGER     NOT NULL DEFAULT 0,
  override_ativo  BOOLEAN     NOT NULL DEFAULT false,
  override_expira TIMESTAMPTZ,
  UNIQUE (user_id, data)
);

CREATE INDEX IF NOT EXISTS idx_agente_uso_user_data
  ON agente_uso_diario (user_id, data);

CREATE INDEX IF NOT EXISTS idx_agente_uso_data
  ON agente_uso_diario (data);

-- RLS
ALTER TABLE agente_uso_diario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuario ve proprio uso"
  ON agente_uso_diario
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "admin ve todo uso"
  ON agente_uso_diario
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.tipo IN ('admin_geral', 'admin_synerEduc', 'gestor_geral')
    )
  );

-- Edge Function usa service_role — sem restrição de RLS para escrita via service_role

-- -----------------------------------------------------------------------------
-- 3. agente_log — log de auditoria de todas as interações
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agente_log (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID        REFERENCES auth.users ON DELETE SET NULL,
  segmento            TEXT,
  perfil              TEXT,
  pergunta_resumo     TEXT,         -- máx 100 chars — interações normais
  pergunta_violacao   TEXT,         -- máx 400 chars — apenas quando tentativa_violacao = true
  tokens_usados       INTEGER,
  override_ativo      BOOLEAN     NOT NULL DEFAULT false,
  tentativa_violacao  BOOLEAN     NOT NULL DEFAULT false,
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agente_log_user
  ON agente_log (user_id);

CREATE INDEX IF NOT EXISTS idx_agente_log_criado_em
  ON agente_log (criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_agente_log_violacao
  ON agente_log (tentativa_violacao)
  WHERE tentativa_violacao = true;

-- RLS
ALTER TABLE agente_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin ve todos os logs"
  ON agente_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.tipo IN ('admin_geral', 'admin_synerEduc', 'gestor_geral')
    )
  );

CREATE POLICY "usuario ve proprio log"
  ON agente_log
  FOR SELECT
  USING (user_id = auth.uid());
