-- =============================================================================
-- Migration: Campos de indexação RAG na tabela pdfs_conteudista (existente)
-- Issue: #20 — F5.1 Pipeline Pinecone
-- Data: 2026-06-03
-- =============================================================================

ALTER TABLE pdfs_conteudista
  ADD COLUMN IF NOT EXISTS tipo_documento TEXT NOT NULL DEFAULT 'material_didatico'
    CHECK (tipo_documento IN ('material_didatico', 'regimento', 'circular', 'manual', 'outro')),
  ADD COLUMN IF NOT EXISTS status_indexacao TEXT NOT NULL DEFAULT 'nao_indexado'
    CHECK (status_indexacao IN ('nao_indexado', 'indexando', 'indexado', 'erro')),
  ADD COLUMN IF NOT EXISTS indexado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS chunks_indexados INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS erro_indexacao TEXT;

-- Index para queries de status no DashboardConteudista
CREATE INDEX IF NOT EXISTS idx_pdfs_status_indexacao
  ON pdfs_conteudista (status_indexacao);

-- Todos os registros existentes ficam marcados como 'nao_indexado'
-- (já é o DEFAULT — nenhum UPDATE necessário)

-- =============================================================================
-- View útil para o painel do conteudista: resumo de indexação por série
-- =============================================================================
CREATE OR REPLACE VIEW vw_resumo_indexacao AS
SELECT
  serie,
  disciplina,
  COUNT(*)                                          AS total_pdfs,
  COUNT(*) FILTER (WHERE status_indexacao = 'indexado')     AS indexados,
  COUNT(*) FILTER (WHERE status_indexacao = 'nao_indexado') AS pendentes,
  COUNT(*) FILTER (WHERE status_indexacao = 'indexando')    AS em_andamento,
  COUNT(*) FILTER (WHERE status_indexacao = 'erro')         AS com_erro,
  SUM(chunks_indexados)                             AS total_chunks
FROM pdfs_conteudista
GROUP BY serie, disciplina
ORDER BY serie, disciplina;
