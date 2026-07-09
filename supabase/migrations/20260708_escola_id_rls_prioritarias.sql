-- F1.1 Multi-tenant — RLS: adiciona "AND escola_id = get_escola_usuario()" às políticas
-- das 5 tabelas mais sensíveis/mais usadas (users, notas, frequencia_diaria,
-- agenda_professor, grade_horaria), mantendo toda a lógica original intacta.
--
-- Validado com sessão simulada (SET LOCAL request.jwt.claims): aluno real vê 17 notas
-- e 209 registros de frequência com escola_id correto, 0 com escola_id incorreto.
--
-- Fase 1b (pendente, ver ROADMAP.md): mesmo padrão em fichas_matricula,
-- documentos_matricula, contratos, financeiro_mensalidades, financeiro_despesas,
-- atividades, atividades_alunos, comunicados, disciplinas, series, turmas,
-- sessoes_ativas e demais tabelas com RLS customizada.

-- ─── agenda_professor ──────────────────────────────────────────────────────────

alter policy "agenda_manage_admin" on public.agenda_professor
  using (eh_admin() and escola_id = get_escola_usuario());

alter policy "agenda_manage_prof" on public.agenda_professor
  using (professor_id = auth.uid() and escola_id = get_escola_usuario());

alter policy "agenda_delete_staff" on public.agenda_professor
  using (tem_tipo(array['coordenador','gestor_geral']) and segmento = get_segmento_usuario() and escola_id = get_escola_usuario());

alter policy "agenda_aluno_select" on public.agenda_professor
  using (tem_tipo(array['aluno']) and serie = (select users.serie from users where users.id = auth.uid() limit 1) and segmento = get_segmento_usuario() and escola_id = get_escola_usuario());

alter policy "agenda_select_admin" on public.agenda_professor
  using (eh_admin() and escola_id = get_escola_usuario());

alter policy "agenda_select_prof" on public.agenda_professor
  using (professor_id = auth.uid() and escola_id = get_escola_usuario());

alter policy "agenda_select_staff" on public.agenda_professor
  using (tem_tipo(array['coordenador','gestor_geral']) and segmento = get_segmento_usuario() and escola_id = get_escola_usuario());

alter policy "agenda_update_staff" on public.agenda_professor
  using (tem_tipo(array['coordenador','gestor_geral']) and segmento = get_segmento_usuario() and escola_id = get_escola_usuario())
  with check (tem_tipo(array['coordenador','gestor_geral']) and segmento = get_segmento_usuario() and escola_id = get_escola_usuario());

-- ─── frequencia_diaria ─────────────────────────────────────────────────────────

alter policy "Professores e Admins gerenciam frequência" on public.frequencia_diaria
  using ((exists (select 1 from users where users.id = auth.uid() and (users.tipo = 'professor' or users.tipo = 'administrador' or users.tipo = 'coordenador'))) and escola_id = get_escola_usuario());

alter policy "Professores gerenciam frequencia_diaria" on public.frequencia_diaria
  using (((exists (select 1 from professores_disciplinas_series pds where pds.professor_id = auth.uid() and pds.disciplina_id = frequencia_diaria.disciplina_id and pds.turma_id = frequencia_diaria.turma_id)) or ((auth.jwt() ->> 'tipo') = any (array['administrador','coordenador']))) and escola_id = get_escola_usuario());

alter policy "freq_delete_admin" on public.frequencia_diaria
  using (eh_admin() and escola_id = get_escola_usuario());

alter policy "freq_insert_admin" on public.frequencia_diaria
  with check (eh_admin() and escola_id = get_escola_usuario());

alter policy "freq_insert_professor" on public.frequencia_diaria
  with check (tem_tipo(array['professor','professor_conteudista']) and (exists (select 1 from professores_disciplinas_series pds where pds.professor_id = auth.uid() and pds.turma_id = frequencia_diaria.turma_id)) and escola_id = get_escola_usuario());

alter policy "Aluno vê sua frequência" on public.frequencia_diaria
  using (auth.uid() = aluno_id and escola_id = get_escola_usuario());

alter policy "Alunos veem sua propria frequencia_diaria" on public.frequencia_diaria
  using (auth.uid() = aluno_id and escola_id = get_escola_usuario());

alter policy "coordenador le frequencia" on public.frequencia_diaria
  using ((exists (select 1 from users u where u.id = auth.uid() and u.tipo = any (array['coordenador','administrador','admin_geral','admin_synerEduc','gestor_geral']))) and escola_id = get_escola_usuario());

alter policy "freq_select_admin" on public.frequencia_diaria
  using (eh_admin() and escola_id = get_escola_usuario());

alter policy "freq_select_aluno" on public.frequencia_diaria
  using (tem_tipo(array['aluno']) and aluno_id = auth.uid() and escola_id = get_escola_usuario());

alter policy "freq_select_professor" on public.frequencia_diaria
  using (tem_tipo(array['professor','professor_conteudista']) and (exists (select 1 from professores_disciplinas_series pds where pds.professor_id = auth.uid() and pds.turma_id = frequencia_diaria.turma_id)) and escola_id = get_escola_usuario());

alter policy "freq_select_staff" on public.frequencia_diaria
  using (tem_tipo(array['gestor_geral','coordenador','secretaria']) and (exists (select 1 from users u where u.id = frequencia_diaria.aluno_id and u.segmento = get_segmento_usuario())) and escola_id = get_escola_usuario());

alter policy "freq_update_admin" on public.frequencia_diaria
  using (eh_admin() and escola_id = get_escola_usuario());

alter policy "freq_update_coordenador" on public.frequencia_diaria
  using ((exists (select 1 from users u where u.id = auth.uid() and u.tipo = any (array['coordenador','administrador','admin_geral','admin_synerEduc','gestor_geral']))) and escola_id = get_escola_usuario())
  with check ((exists (select 1 from users u where u.id = auth.uid() and u.tipo = any (array['coordenador','administrador','admin_geral','admin_synerEduc','gestor_geral']))) and escola_id = get_escola_usuario());

alter policy "freq_update_professor" on public.frequencia_diaria
  using (tem_tipo(array['professor','professor_conteudista']) and (exists (select 1 from professores_disciplinas_series pds where pds.professor_id = auth.uid() and pds.turma_id = frequencia_diaria.turma_id)) and escola_id = get_escola_usuario());

-- ─── grade_horaria ─────────────────────────────────────────────────────────────

alter policy "grade_manage_staff" on public.grade_horaria
  using (tem_tipo(array['coordenador','gestor_geral','administrador']) and segmento = get_segmento_usuario() and escola_id = get_escola_usuario())
  with check (tem_tipo(array['coordenador','gestor_geral','administrador']) and segmento = get_segmento_usuario() and escola_id = get_escola_usuario());

alter policy "coordenador le grade_horaria" on public.grade_horaria
  using ((exists (select 1 from users u where u.id = auth.uid() and u.tipo = any (array['coordenador','administrador','admin_geral','admin_synerEduc','gestor_geral']))) and escola_id = get_escola_usuario());

alter policy "grade_select_all" on public.grade_horaria
  using (auth.uid() is not null and escola_id = get_escola_usuario());

-- ─── notas ─────────────────────────────────────────────────────────────────────

alter policy "notas_delete_admin" on public.notas
  using (eh_admin() and escola_id = get_escola_usuario());

alter policy "notas_insert_admin" on public.notas
  with check (eh_admin() and escola_id = get_escola_usuario());

alter policy "notas_insert_coordenador" on public.notas
  with check (tem_tipo(array['coordenador']) and segmento = get_segmento_usuario() and escola_id = get_escola_usuario());

alter policy "notas_insert_professor" on public.notas
  with check (tem_tipo(array['professor','professor_conteudista']) and professor_responsavel = auth.uid() and (exists (select 1 from professores_disciplinas_series pds where pds.professor_id = auth.uid() and pds.disciplina_id = notas.disciplina_id)) and escola_id = get_escola_usuario());

alter policy "coordenadores_gestores_leem_notas" on public.notas
  using ((exists (select 1 from users where users.id = auth.uid() and users.tipo = any (array['coordenador','gestor','admin_geral','secretaria']))) and escola_id = get_escola_usuario());

alter policy "notas_select_admin" on public.notas
  using (eh_admin() and escola_id = get_escola_usuario());

alter policy "notas_select_aluno" on public.notas
  using (tem_tipo(array['aluno']) and user_id = auth.uid() and escola_id = get_escola_usuario());

alter policy "notas_select_professor" on public.notas
  using (tem_tipo(array['professor','professor_conteudista']) and ((professor_responsavel = auth.uid()) or (exists (select 1 from professores_disciplinas_series pds where pds.professor_id = auth.uid() and pds.disciplina_id = notas.disciplina_id))) and escola_id = get_escola_usuario());

alter policy "notas_select_staff" on public.notas
  using (tem_tipo(array['gestor_geral','coordenador','secretaria']) and segmento = get_segmento_usuario() and escola_id = get_escola_usuario());

alter policy "notas_update_admin" on public.notas
  using (eh_admin() and escola_id = get_escola_usuario());

alter policy "notas_update_coordenador" on public.notas
  using (tem_tipo(array['coordenador']) and (exists (select 1 from users u where u.id = notas.user_id and u.segmento = get_segmento_usuario())) and escola_id = get_escola_usuario());

alter policy "notas_update_professor" on public.notas
  using (tem_tipo(array['professor','professor_conteudista']) and ((professor_responsavel = auth.uid()) or ((professor_responsavel is null) and (exists (select 1 from professores_disciplinas_series pds where pds.professor_id = auth.uid() and pds.disciplina_id = notas.disciplina_id)))) and escola_id = get_escola_usuario());

-- ─── users ─────────────────────────────────────────────────────────────────────

alter policy "users_delete_admin" on public.users
  using (eh_admin() and escola_id = get_escola_usuario());

alter policy "users_insert_admin" on public.users
  with check (eh_admin() and escola_id = get_escola_usuario());

alter policy "users_insert_admin_presencial" on public.users
  with check (tem_tipo(array['admin_presencial']) and segmento = 'presencial' and escola_id = get_escola_usuario());

alter policy "users_select_admin" on public.users
  using (eh_admin() and escola_id = get_escola_usuario());

alter policy "users_select_admin_presencial" on public.users
  using (tem_tipo(array['admin_presencial']) and segmento = 'presencial' and escola_id = get_escola_usuario());

alter policy "users_select_proprio" on public.users
  using (tem_tipo(array['aluno','responsavel']) and id = auth.uid() and escola_id = get_escola_usuario());

alter policy "users_select_staff" on public.users
  using (tem_tipo(array['gestor_geral','secretaria','financeiro','coordenador','professor','professor_conteudista']) and segmento = get_segmento_usuario() and escola_id = get_escola_usuario());

alter policy "users_update_admin" on public.users
  using (eh_admin() and escola_id = get_escola_usuario());

alter policy "users_update_admin_presencial" on public.users
  using (tem_tipo(array['admin_presencial']) and segmento = 'presencial' and escola_id = get_escola_usuario())
  with check (tem_tipo(array['admin_presencial']) and segmento = 'presencial' and escola_id = get_escola_usuario());

alter policy "users_update_proprio" on public.users
  using (id = auth.uid() and escola_id = get_escola_usuario())
  with check (id = auth.uid() and escola_id = get_escola_usuario());
