-- F10: Planos de Aula com IA
-- Professor preenche um plano por período (semana/mês), com entrada por dia de aula.
-- Coordenador acompanha entregas e configura periodicidade.

-- Config de periodicidade por segmento (coordenador define)
create table if not exists plano_aula_config (
  id             uuid primary key default gen_random_uuid(),
  segmento       text not null unique,          -- 'presencial' | 'ead'
  periodicidade  text not null default 'semanal', -- 'semanal' | 'mensal'
  criado_por     uuid references auth.users(id),
  atualizado_em  timestamptz default now()
);

-- Plano por professor × disciplina × turma × período
create table if not exists planos_aula (
  id             uuid primary key default gen_random_uuid(),
  professor_id   uuid references auth.users(id) not null,
  disciplina_id  uuid references disciplinas(id) not null,
  turma_id       uuid references turmas(id) not null,
  periodo_inicio date not null,
  periodo_fim    date not null,
  periodicidade  text not null,                 -- 'semanal' | 'mensal'
  status         text not null default 'rascunho', -- 'rascunho' | 'entregue' | 'aprovado' | 'atrasado'
  entregue_em    timestamptz,
  aprovado_em    timestamptz,
  aprovado_por   uuid references auth.users(id),
  obs_coord      text,                          -- comentário/notificação da coordenação
  criado_em      timestamptz default now(),
  atualizado_em  timestamptz default now(),
  unique(professor_id, disciplina_id, turma_id, periodo_inicio)
);

-- Uma entrada por dia de aula dentro do período
create table if not exists planos_aula_dias (
  id            uuid primary key default gen_random_uuid(),
  plano_id      uuid references planos_aula(id) on delete cascade not null,
  data_aula     date not null,
  tema          text not null,
  tipo          text,
  recursos      text,
  observacoes   text,
  plano_gerado  jsonb,    -- JSON retornado pela IA para este dia
  ia_usada      boolean default false,
  criado_em     timestamptz default now(),
  unique(plano_id, data_aula)
);

-- Índices
create index if not exists idx_planos_aula_professor on planos_aula(professor_id);
create index if not exists idx_planos_aula_status    on planos_aula(status);
create index if not exists idx_planos_aula_periodo   on planos_aula(periodo_inicio);
create index if not exists idx_planos_aula_dias_plano on planos_aula_dias(plano_id);

-- RLS
alter table plano_aula_config  enable row level security;
alter table planos_aula        enable row level security;
alter table planos_aula_dias   enable row level security;

-- Config: coordenador e gestor leem/escrevem; professor só lê
create policy "config_leitura" on plano_aula_config
  for select using (true);

create policy "config_escrita" on plano_aula_config
  for all using (
    exists (select 1 from users where id = auth.uid() and role in ('coordenador','gestor_geral','admin'))
  );

-- Planos: professor vê os próprios; coordenador e gestor veem todos
create policy "planos_professor_proprios" on planos_aula
  for all using (professor_id = auth.uid());

create policy "planos_coord_leitura" on planos_aula
  for select using (
    exists (select 1 from users where id = auth.uid() and role in ('coordenador','gestor_geral','admin'))
  );

create policy "planos_coord_update" on planos_aula
  for update using (
    exists (select 1 from users where id = auth.uid() and role in ('coordenador','gestor_geral','admin'))
  );

-- Dias: professor vê os próprios via plano; coordenador vê todos
create policy "dias_professor" on planos_aula_dias
  for all using (
    exists (select 1 from planos_aula p where p.id = plano_id and p.professor_id = auth.uid())
  );

create policy "dias_coord_leitura" on planos_aula_dias
  for select using (
    exists (select 1 from users where id = auth.uid() and role in ('coordenador','gestor_geral','admin'))
  );

-- Seed de config padrão (semanal para ambos os segmentos)
insert into plano_aula_config (segmento, periodicidade) values
  ('presencial', 'semanal'),
  ('ead', 'semanal')
on conflict (segmento) do nothing;
