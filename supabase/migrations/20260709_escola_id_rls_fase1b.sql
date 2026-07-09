-- F1.1 Multi-tenant — Fase 1b: "AND escola_id = get_escola_usuario()" na 2ª leva
-- de tabelas com RLS customizada (a 1ª leva — users, notas, frequencia_diaria,
-- agenda_professor, grade_horaria — foi feita em 20260708_escola_id_rls_prioritarias.sql).
--
-- Aplicado em 5 etapas por domínio, cada uma verificada por SQL (contagem de linhas
-- inalterada) antes da próxima:
-- 1. matrícula/PII (fichas_matricula, documentos_matricula, contratos)
-- 2. financeiro (financeiro_mensalidades, financeiro_despesas)
-- 3. atividades e comunicados (atividades, atividades_alunos, comunicados)
-- 4. estrutura curricular (disciplinas, series, turmas)
-- 5. sessoes_ativas
--
-- Validado com sessão simulada (SET LOCAL request.jwt.claims): aluno real vê 11
-- registros em atividades_alunos com escola_id correto, 0 com escola_id da outra
-- escola (Ariane) -- isolamento confirmado.
--
-- Achado extra: a policy "leitura_autenticado" de sessoes_ativas tinha qual = true
-- (qualquer usuário autenticado via qualquer escola conseguia ler todas as sessões
-- ativas do sistema, de qualquer escola) -- corrigido para escola_id = get_escola_usuario(),
-- fechando um vazamento cross-tenant real que existia mesmo antes desta migração
-- (mitigado até agora só pelo fato de existir 1 única escola com dados).

-- ─── fichas_matricula ────────────────────────────────────────────────────────
alter policy "fichas_delete_admin" on public.fichas_matricula
  using (eh_admin() and escola_id = get_escola_usuario());
alter policy "fichas_delete_staff" on public.fichas_matricula
  using (tem_tipo(array['gestor_geral','secretaria']) and segmento = get_segmento_usuario() and escola_id = get_escola_usuario());
alter policy "fichas_insert_admin" on public.fichas_matricula
  with check (eh_admin() and escola_id = get_escola_usuario());
alter policy "fichas_insert_staff" on public.fichas_matricula
  with check (tem_tipo(array['gestor_geral','secretaria']) and segmento = get_segmento_usuario() and escola_id = get_escola_usuario());
alter policy "fichas_select_admin" on public.fichas_matricula
  using (eh_admin() and escola_id = get_escola_usuario());
alter policy "fichas_select_aluno" on public.fichas_matricula
  using (tem_tipo(array['aluno']) and aluno_id = auth.uid() and escola_id = get_escola_usuario());
alter policy "fichas_select_responsavel" on public.fichas_matricula
  using (tem_tipo(array['responsavel']) and email_responsavel = (select users.email from users where users.id = auth.uid()) and escola_id = get_escola_usuario());
alter policy "fichas_select_staff" on public.fichas_matricula
  using (tem_tipo(array['gestor_geral','secretaria','coordenador','financeiro']) and segmento = get_segmento_usuario() and escola_id = get_escola_usuario());
alter policy "fichas_update_admin" on public.fichas_matricula
  using (eh_admin() and escola_id = get_escola_usuario());
alter policy "fichas_update_staff" on public.fichas_matricula
  using (tem_tipo(array['gestor_geral','secretaria']) and segmento = get_segmento_usuario() and escola_id = get_escola_usuario());

-- ─── documentos_matricula ────────────────────────────────────────────────────
alter policy "docs_delete_admin" on public.documentos_matricula
  using (eh_admin() and escola_id = get_escola_usuario());
alter policy "docs_insert_admin" on public.documentos_matricula
  with check (eh_admin() and escola_id = get_escola_usuario());
alter policy "docs_insert_staff" on public.documentos_matricula
  with check (tem_tipo(array['gestor_geral','secretaria']) and (exists (select 1 from fichas_matricula f where f.id = documentos_matricula.ficha_id and f.segmento = get_segmento_usuario())) and escola_id = get_escola_usuario());
alter policy "docs_select_admin" on public.documentos_matricula
  using (eh_admin() and escola_id = get_escola_usuario());
alter policy "docs_select_aluno" on public.documentos_matricula
  using (tem_tipo(array['aluno']) and aluno_id = auth.uid() and escola_id = get_escola_usuario());
alter policy "docs_select_staff" on public.documentos_matricula
  using (tem_tipo(array['gestor_geral','secretaria','coordenador']) and (exists (select 1 from fichas_matricula f where f.id = documentos_matricula.ficha_id and f.segmento = get_segmento_usuario())) and escola_id = get_escola_usuario());
alter policy "docs_update_admin" on public.documentos_matricula
  using (eh_admin() and escola_id = get_escola_usuario());
alter policy "docs_update_staff" on public.documentos_matricula
  using (tem_tipo(array['gestor_geral','secretaria']) and (exists (select 1 from fichas_matricula f where f.id = documentos_matricula.ficha_id and f.segmento = get_segmento_usuario())) and escola_id = get_escola_usuario());

-- ─── contratos ───────────────────────────────────────────────────────────────
alter policy "contratos_delete_admin" on public.contratos
  using (eh_admin() and escola_id = get_escola_usuario());
alter policy "contratos_delete_staff" on public.contratos
  using (tem_tipo(array['gestor_geral','secretaria']) and segmento = get_segmento_usuario() and escola_id = get_escola_usuario());
alter policy "contratos_insert_admin" on public.contratos
  with check (eh_admin() and escola_id = get_escola_usuario());
alter policy "contratos_insert_staff" on public.contratos
  with check (tem_tipo(array['gestor_geral','secretaria','financeiro']) and (exists (select 1 from fichas_matricula f where f.id = contratos.ficha_id and f.segmento = get_segmento_usuario())) and escola_id = get_escola_usuario());
alter policy "contratos_select_admin" on public.contratos
  using (eh_admin() and escola_id = get_escola_usuario());
alter policy "contratos_select_aluno" on public.contratos
  using (tem_tipo(array['aluno']) and (exists (select 1 from fichas_matricula f where f.id = contratos.ficha_id and f.aluno_id = auth.uid())) and escola_id = get_escola_usuario());
alter policy "contratos_select_staff" on public.contratos
  using (tem_tipo(array['gestor_geral','secretaria','financeiro','coordenador']) and (exists (select 1 from fichas_matricula f where f.id = contratos.ficha_id and f.segmento = get_segmento_usuario())) and escola_id = get_escola_usuario());
alter policy "contratos_update_admin" on public.contratos
  using (eh_admin() and escola_id = get_escola_usuario());
alter policy "contratos_update_staff" on public.contratos
  using (tem_tipo(array['gestor_geral','secretaria','financeiro']) and (exists (select 1 from fichas_matricula f where f.id = contratos.ficha_id and f.segmento = get_segmento_usuario())) and escola_id = get_escola_usuario());

-- ─── financeiro_mensalidades ─────────────────────────────────────────────────
alter policy "mens_delete_admin" on public.financeiro_mensalidades
  using (eh_admin() and escola_id = get_escola_usuario());
alter policy "mens_delete_staff" on public.financeiro_mensalidades
  using (tem_tipo(array['gestor_geral','secretaria']) and segmento = get_segmento_usuario() and escola_id = get_escola_usuario());
alter policy "mens_insert_admin" on public.financeiro_mensalidades
  with check (eh_admin() and escola_id = get_escola_usuario());
alter policy "mens_insert_staff" on public.financeiro_mensalidades
  with check (tem_tipo(array['gestor_geral','financeiro','secretaria']) and segmento = get_segmento_usuario() and escola_id = get_escola_usuario());
alter policy "mens_select_admin" on public.financeiro_mensalidades
  using (eh_admin() and escola_id = get_escola_usuario());
alter policy "mens_select_aluno" on public.financeiro_mensalidades
  using (tem_tipo(array['aluno']) and aluno_id = auth.uid() and escola_id = get_escola_usuario());
alter policy "mens_select_staff" on public.financeiro_mensalidades
  using (tem_tipo(array['gestor_geral','financeiro','secretaria','coordenador']) and segmento = get_segmento_usuario() and escola_id = get_escola_usuario());
alter policy "mens_update_admin" on public.financeiro_mensalidades
  using (eh_admin() and escola_id = get_escola_usuario());
alter policy "mens_update_staff" on public.financeiro_mensalidades
  using (tem_tipo(array['gestor_geral','financeiro','secretaria']) and segmento = get_segmento_usuario() and escola_id = get_escola_usuario());

-- ─── financeiro_despesas ─────────────────────────────────────────────────────
alter policy "desp_delete_admin" on public.financeiro_despesas
  using (eh_admin() and escola_id = get_escola_usuario());
alter policy "desp_insert_admin" on public.financeiro_despesas
  with check (eh_admin() and escola_id = get_escola_usuario());
alter policy "desp_insert_staff" on public.financeiro_despesas
  with check (tem_tipo(array['gestor_geral','financeiro']) and escola_id = get_escola_usuario());
alter policy "desp_select_admin" on public.financeiro_despesas
  using (eh_admin() and escola_id = get_escola_usuario());
alter policy "desp_select_staff" on public.financeiro_despesas
  using (tem_tipo(array['gestor_geral','financeiro','secretaria','coordenador']) and escola_id = get_escola_usuario());
alter policy "desp_update_admin" on public.financeiro_despesas
  using (eh_admin() and escola_id = get_escola_usuario());
alter policy "desp_update_staff" on public.financeiro_despesas
  using (tem_tipo(array['gestor_geral','financeiro']) and escola_id = get_escola_usuario());

-- ─── atividades ──────────────────────────────────────────────────────────────
alter policy "atv_admin" on public.atividades
  using (eh_admin() and escola_id = get_escola_usuario());
alter policy "atv_manage" on public.atividades
  using (tem_tipo(array['professor','professor_conteudista']) and professor_id = auth.uid() and escola_id = get_escola_usuario());
alter policy "atv_select" on public.atividades
  using (auth.uid() is not null and escola_id = get_escola_usuario());
alter policy "coordenador le atividades" on public.atividades
  using ((exists (select 1 from users u where u.id = auth.uid() and u.tipo = any (array['coordenador','administrador','admin_geral','admin_synerEduc','gestor_geral','professor']))) and escola_id = get_escola_usuario());

-- ─── atividades_alunos ───────────────────────────────────────────────────────
alter policy "atvaluno_insert_aluno" on public.atividades_alunos
  with check (aluno_id = auth.uid() and escola_id = get_escola_usuario());
alter policy "atvaluno_select_admin" on public.atividades_alunos
  using (eh_admin() and escola_id = get_escola_usuario());
alter policy "atvaluno_select_aluno" on public.atividades_alunos
  using (aluno_id = auth.uid() and escola_id = get_escola_usuario());
alter policy "atvaluno_select_prof" on public.atividades_alunos
  using (tem_tipo(array['professor','professor_conteudista']) and (exists (select 1 from atividades a where a.id = atividades_alunos.atividade_id and a.professor_id = auth.uid())) and escola_id = get_escola_usuario());
alter policy "coordenador le atividades_alunos" on public.atividades_alunos
  using ((exists (select 1 from users u where u.id = auth.uid() and u.tipo = any (array['coordenador','administrador','admin_geral','admin_synerEduc','gestor_geral','professor','aluno']))) and escola_id = get_escola_usuario());
alter policy "atvaluno_update_admin" on public.atividades_alunos
  using (eh_admin() and escola_id = get_escola_usuario());
alter policy "atvaluno_update_prof" on public.atividades_alunos
  using (tem_tipo(array['professor','professor_conteudista']) and (exists (select 1 from atividades a where a.id = atividades_alunos.atividade_id and a.professor_id = auth.uid())) and escola_id = get_escola_usuario());
alter policy "professores_podem_corrigir_submissoes" on public.atividades_alunos
  using ((exists (select 1 from atividades a where a.id = atividades_alunos.atividade_id and a.professor_id = auth.uid())) and escola_id = get_escola_usuario())
  with check ((exists (select 1 from atividades a where a.id = atividades_alunos.atividade_id and a.professor_id = auth.uid())) and escola_id = get_escola_usuario());

-- ─── comunicados ─────────────────────────────────────────────────────────────
alter policy "com_delete_admin" on public.comunicados
  using (eh_admin() and escola_id = get_escola_usuario());
alter policy "com_insert_admin" on public.comunicados
  with check (eh_admin() and escola_id = get_escola_usuario());
alter policy "com_insert_staff" on public.comunicados
  with check (tem_tipo(array['gestor_geral','coordenador','professor','secretaria']) and segmento = get_segmento_usuario() and escola_id = get_escola_usuario());
alter policy "com_select_admin" on public.comunicados
  using (eh_admin() and escola_id = get_escola_usuario());
alter policy "com_select_staff" on public.comunicados
  using ((segmento = get_segmento_usuario() or segmento is null) and escola_id = get_escola_usuario());
alter policy "com_update_admin" on public.comunicados
  using (eh_admin() and escola_id = get_escola_usuario());
alter policy "com_update_staff" on public.comunicados
  using (tem_tipo(array['gestor_geral','coordenador','professor','secretaria']) and segmento = get_segmento_usuario() and escola_id = get_escola_usuario());

-- ─── disciplinas ─────────────────────────────────────────────────────────────
alter policy "disc_admin" on public.disciplinas
  using (eh_admin() and escola_id = get_escola_usuario());
alter policy "disc_manage" on public.disciplinas
  using (tem_tipo(array['gestor_geral','coordenador']) and (segmento = get_segmento_usuario() or segmento is null) and escola_id = get_escola_usuario());
alter policy "disciplinas_admin_presencial" on public.disciplinas
  using (tem_tipo(array['admin_presencial']) and escola_id = get_escola_usuario());
alter policy "disc_select" on public.disciplinas
  using (auth.uid() is not null and escola_id = get_escola_usuario());

-- ─── series ──────────────────────────────────────────────────────────────────
alter policy "series_admin" on public.series
  using (eh_admin() and escola_id = get_escola_usuario());
alter policy "series_admin_presencial" on public.series
  using (tem_tipo(array['admin_presencial']) and segmento = 'presencial' and escola_id = get_escola_usuario())
  with check (tem_tipo(array['admin_presencial']) and segmento = 'presencial' and escola_id = get_escola_usuario());
alter policy "series_manage" on public.series
  using (tem_tipo(array['gestor_geral','coordenador','administrador']) and escola_id = get_escola_usuario());
alter policy "series_select" on public.series
  using (auth.uid() is not null and escola_id = get_escola_usuario());

-- ─── turmas ──────────────────────────────────────────────────────────────────
alter policy "admin_presencial_turmas_manage" on public.turmas
  using (segmento = 'presencial' and tem_tipo(array['admin_presencial']) and escola_id = get_escola_usuario())
  with check (segmento = 'presencial' and tem_tipo(array['admin_presencial']) and escola_id = get_escola_usuario());
alter policy "turmas_admin" on public.turmas
  using (eh_admin() and escola_id = get_escola_usuario());
alter policy "turmas_manage" on public.turmas
  using (tem_tipo(array['gestor_geral','coordenador']) and (segmento = get_segmento_usuario() or segmento is null) and escola_id = get_escola_usuario());
alter policy "turmas_select" on public.turmas
  using (auth.uid() is not null and escola_id = get_escola_usuario());

-- ─── sessoes_ativas ──────────────────────────────────────────────────────────
alter policy "gerenciar_propria_sessao" on public.sessoes_ativas
  using (usuario_id = auth.uid() and escola_id = get_escola_usuario())
  with check (usuario_id = auth.uid() and escola_id = get_escola_usuario());
alter policy "usuario gerencia propria sessao" on public.sessoes_ativas
  using (usuario_id = auth.uid() and escola_id = get_escola_usuario())
  with check (usuario_id = auth.uid() and escola_id = get_escola_usuario());
alter policy "admin ve todas sessoes" on public.sessoes_ativas
  using ((exists (select 1 from users u where u.id = auth.uid() and u.tipo = any (array['admin_geral','admin_synerEduc','administrador','coordenador','gestor_geral']))) and escola_id = get_escola_usuario());
alter policy "admin_le_tudo" on public.sessoes_ativas
  using ((eh_admin() or tem_tipo(array['gestor_geral','admin_presencial'])) and escola_id = get_escola_usuario());
alter policy "leitura_autenticado" on public.sessoes_ativas
  using (escola_id = get_escola_usuario());
