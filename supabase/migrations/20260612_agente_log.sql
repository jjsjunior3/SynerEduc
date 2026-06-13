-- agente_ia_log: observabilidade mínima dos agentes de IA
-- Registra tokens consumidos, latência e turns por chamada

create table if not exists agente_ia_log (
  id            uuid        primary key default gen_random_uuid(),
  criado_em     timestamptz default now(),
  agente        text        not null,   -- 'gabriela' | 'sofia' | 'dona-maria'
  contexto      text,                   -- 'secretaria' | 'gestor' | 'financeiro'
  usuario_id    uuid        references auth.users(id) on delete set null,
  pergunta      text,                   -- primeiros 300 chars da última msg do usuário
  turns         int         default 1,
  input_tokens  int         default 0,
  output_tokens int         default 0,
  latencia_ms   int         default 0,
  erro          boolean     default false,
  erro_msg      text
);

-- Índices para consultas de monitoramento
create index agente_ia_log_agente_idx     on agente_ia_log(agente);
create index agente_ia_log_criado_em_idx  on agente_ia_log(criado_em desc);
create index agente_ia_log_usuario_idx    on agente_ia_log(usuario_id);

-- RLS: apenas service_role escreve, admin lê
alter table agente_ia_log enable row level security;

create policy "service_role_all" on agente_ia_log
  for all to service_role using (true) with check (true);

-- View para dashboard de monitoramento (últimas 24h)
create or replace view agente_ia_log_resumo as
select
  agente,
  contexto,
  count(*)                                   as chamadas,
  round(avg(latencia_ms))::int               as latencia_media_ms,
  sum(input_tokens)                          as total_input_tokens,
  sum(output_tokens)                         as total_output_tokens,
  round(avg(turns), 1)                       as turns_medio,
  sum(case when erro then 1 else 0 end)      as erros
from agente_ia_log
where criado_em > now() - interval '24 hours'
group by agente, contexto
order by chamadas desc;
