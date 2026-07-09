-- F1.1 Multi-tenant — Fase 1: adiciona escola_id em todas as tabelas de dados.
-- escola_config já existe e já tem as 2 escolas cadastradas (Conexão e Ariane) —
-- reusamos escola_config.id como escola_id, sem criar tabela "escolas" nova.
-- Default = Conexão (única escola com dados reais até o onboarding do Ariane em ago/2026).
--
-- Aplicado em 7 etapas por domínio (para reduzir o blast radius de cada mudança):
-- 1. base (identidade + estrutura curricular)
-- 2. dados acadêmicos
-- 3. matrícula/documentos (PII)
-- 4. financeiro
-- 5. comunicação e atividades
-- 6. histórico e conteúdo
-- 7. calendário, vínculos e observabilidade de IA
--
-- Cada etapa foi verificada por SQL (0 linhas com escola_id nulo) antes da próxima.

do $$
declare
  conexao_id uuid := 'e6ddd149-9858-418f-94be-3b0e4c554cd7';
  tabelas text[] := array[
    -- Etapa 1 — base
    'users','series','disciplinas','turmas','grade_horaria','horarios_escolar',
    -- Etapa 2 — acadêmico
    'notas','frequencia_diaria','frequencia_professor',
    'agenda_professor','aulas_ao_vivo','proximas_aulas',
    'progresso_aluno','progresso_aluno_disciplina',
    -- Etapa 3 — matrícula/PII
    'matriculas','fichas_matricula','documentos_matricula','contratos',
    -- Etapa 4 — financeiro
    'financeiro_mensalidades','financeiro_despesas',
    -- Etapa 5 — comunicação e atividades
    'comunicados','forum_topicos','forum_respostas','mensagens_chat','notificacoes',
    'atividades','atividades_alunos',
    -- Etapa 6 — histórico e conteúdo
    'historico_externo','alunos_historicos','boletins_historicos',
    'pdfs_conteudista','materiais_pdf','planos_aula','planos_aula_dias','plano_aula_config',
    -- Etapa 7 — calendário, vínculos e observabilidade de IA
    'ano_letivo','bimestres',
    'professores_turmas','professores_disciplinas_series','alunos_turmas',
    'registro_hora_aula','sessoes_ativas',
    'agente_ia_log','agente_uso_diario','agente_limites','agente_log','uso_atividades_ia',
    'segmentos'
  ];
  t text;
begin
  foreach t in array tabelas loop
    execute format(
      'alter table public.%I add column if not exists escola_id uuid references public.escola_config(id) default %L',
      t, conexao_id
    );
    execute format(
      'update public.%I set escola_id = %L where escola_id is null',
      t, conexao_id
    );
  end loop;
end $$;
