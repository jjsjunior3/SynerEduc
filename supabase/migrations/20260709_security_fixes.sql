-- Correções de segurança (advisors do Supabase, auditados em 2026-07-09)
-- Ver docs/ROADMAP.md — seção "Auditoria de Segurança" para o registro completo.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. search_path mutável em 21 funções (22 assinaturas contando a sobrecarga
--    de buscar_agenda_por_data). Sem search_path fixo, uma função
--    SECURITY DEFINER pode ser enganada por um search_path malicioso definido
--    pelo caller, resolvendo objetos de outro schema.
-- ═══════════════════════════════════════════════════════════════════════════

alter function public.update_updated_at_column() set search_path = 'public', 'pg_temp';
alter function public.total_alunos_ativos() set search_path = 'public', 'pg_temp';
alter function public.atualizar_status_mensalidades() set search_path = 'public', 'pg_temp';
alter function public.get_media_turma(p_serie text, p_segmento text) set search_path = 'public', 'pg_temp';
alter function public.get_all_users_with_auth_data() set search_path = 'public', 'pg_temp';
alter function public.atualizar_total_alunos() set search_path = 'public', 'pg_temp';
alter function public.total_alunos(turmas_row turmas) set search_path = 'public', 'pg_temp';
alter function public.buscar_agenda_por_data(data_inicio date, data_fim date, prof_id uuid) set search_path = 'public', 'pg_temp';
alter function public.buscar_agenda_por_data(data_param date, prof_id_param uuid, serie_param text) set search_path = 'public', 'pg_temp';
alter function public.notificar_alunos_nova_atividade() set search_path = 'public', 'pg_temp';
alter function public.get_tipo_usuario() set search_path = 'public', 'pg_temp';
alter function public.tem_tipo(tipos text[]) set search_path = 'public', 'pg_temp';
alter function public.eh_admin() set search_path = 'public', 'pg_temp';
alter function public.sync_user_metadata() set search_path = 'public', 'pg_temp';
alter function public.incrementar_uso_ia(p_usuario_id uuid, p_semana text) set search_path = 'public', 'pg_temp';
alter function public.incrementar_total_alunos() set search_path = 'public', 'pg_temp';
alter function public.decrementar_total_alunos() set search_path = 'public', 'pg_temp';
alter function public.update_updated_at() set search_path = 'public', 'pg_temp';
alter function public.get_users_with_email() set search_path = 'public', 'pg_temp';
alter function public.get_frequencia_resumo_por_data(p_disciplina_id uuid, p_turma_id uuid) set search_path = 'public', 'pg_temp';
alter function public.set_updated_at() set search_path = 'public', 'pg_temp';
alter function public.fn_atualizar_media() set search_path = 'public', 'pg_temp';

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Funções SECURITY DEFINER expostas via RPC sem controle de acesso interno
-- ═══════════════════════════════════════════════════════════════════════════

-- get_all_users_with_auth_data(): retornava TODOS os usuários (nome, email,
-- tipo, serie, status...) sem checar quem chama. Não usada em lugar nenhum do
-- frontend/edge functions (confirmado via busca no código) -- era uma função
-- morta explorável por qualquer anon via /rest/v1/rpc/get_all_users_with_auth_data.
-- REVOKE ... FROM anon/authenticated não bastou (a função ainda tinha grant
-- implícito a PUBLIC, herdado por anon) -- precisou revogar de PUBLIC.
revoke execute on function public.get_all_users_with_auth_data() from public;

-- atualizar_status_mensalidades(): UPDATE em massa em financeiro_mensalidades,
-- sem controle de acesso. Não chamada por nada no código nem por cron
-- (pg_cron não está instalado no projeto).
revoke execute on function public.atualizar_status_mensalidades() from public;

-- incrementar_uso_ia(p_usuario_id, p_semana): aceitava QUALQUER usuario_id
-- como parâmetro sem checar se é o próprio caller -- um usuário autenticado
-- podia adulterar o contador de uso de IA de outra pessoa. Só é chamada pela
-- Edge Function dona-maria usando a service role key, nunca via RPC direto do
-- frontend.
revoke execute on function public.incrementar_uso_ia(uuid, text) from public;

-- get_users_with_email(): retorna todos os usuários com email, usada
-- legitimamente por GerenciadorUsuariosFixed.tsx (só renderizado nos painéis
-- de administrador e admin_presencial). Não tinha NENHUM controle de acesso
-- interno -- qualquer usuário autenticado (ex: um aluno) podia chamar o RPC
-- direto e pegar o email de todo mundo. Adiciona guarda de autorização
-- (tem_tipo) em vez de revogar totalmente, já que a função continua em uso
-- legítimo; reforça também o grant (remove PUBLIC/anon, mantém authenticated).
create or replace function public.get_users_with_email()
returns table(id uuid, nome text, tipo text, segmento text, serie text, status text, turno text, nivel text, criado_em timestamp with time zone, email text)
language sql
security definer
set search_path = 'public', 'pg_temp'
as $function$
  select
    pu.id,
    pu.nome,
    pu.tipo,
    pu.segmento,
    pu.serie,
    pu.status,
    pu.turno,
    pu.nivel,
    au.created_at,
    au.email
  from public.users pu
  left join auth.users au on au.id = pu.id
  where public.tem_tipo(array['administrador','admin_presencial','gestor_geral'])
$function$;

revoke execute on function public.get_users_with_email() from public;
grant execute on function public.get_users_with_email() to authenticated;

-- IMPORTANTE: NÃO tocar no grant de eh_admin(), tem_tipo(), get_tipo_usuario(),
-- get_segmento_usuario(), get_escola_usuario(), get_media_turma(),
-- total_alunos_ativos(), sync_user_metadata() -- essas são chamadas de DENTRO
-- das políticas de RLS na avaliação de queries de usuários "authenticated"
-- normais; revogar de PUBLIC sem regrant explícito pra authenticated quebraria
-- toda política de RLS que as usa. Ficam com o aviso do advisor aceito
-- conscientemente (são só introspecção da própria sessão do caller, inofensivas
-- mesmo se chamadas por anon -- um anon não tem auth.uid(), então essas
-- funções simplesmente retornam null/false pra ele).

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Buckets públicos permitindo listagem via API/SDK
-- ═══════════════════════════════════════════════════════════════════════════

-- atividades, avatars, comunicados, pdfs-conteudista são buckets public:true.
-- Tinham policies de SELECT amplas em storage.objects, permitindo LISTAR todos
-- os arquivos do bucket via API/SDK (não só buscar por URL conhecida). Buckets
-- públicos não precisam dessa policy para acesso via getPublicUrl -- o Storage
-- do Supabase serve objetos de bucket público sem checar RLS quando acessados
-- pela URL pública direta (confirmado: URL pública de avatar continuou
-- retornando 200 após remover a policy). Remover fecha a enumeração (ex:
-- listar todos os avatares/todas as fotos de atividades de todos os alunos).

drop policy if exists "Todos podem visualizar arquivos do bucket atividades" on storage.objects;
drop policy if exists "Avatares são publicos" on storage.objects;
drop policy if exists "Public read access" on storage.objects;
drop policy if exists "Leitura Pública PDFs" on storage.objects;

-- ═══════════════════════════════════════════════════════════════════════════
-- Pendências que NÃO dão pra corrigir via SQL (requerem painel do Supabase):
--   - Leaked Password Protection (Authentication > Providers > Email)
--   - Upgrade de versão do Postgres (Settings > Infrastructure -- envolve
--     janela de manutenção/restart, não fazer sem confirmação explícita)
-- ═══════════════════════════════════════════════════════════════════════════
