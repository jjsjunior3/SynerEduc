-- Catálogo do material indexado no Pinecone (RAG).
-- O Pinecone não suporta listar valores distintos de metadata, então esta
-- tabela espelha o que está indexado para a UI de gestão (GestaoRAG.tsx)
-- poder navegar por série/disciplina/volume e excluir com segurança.
--
-- Escrita por:
--   - scripts/indexar-imagens-locais.ts (script local, roda na máquina do operador)
--   - supabase/functions/rag-status (ação "excluir", remove a linha após excluir do Pinecone)
--
-- Sem policies de RLS para anon/authenticated — acesso apenas via service role
-- (Edge Function rag-status, restrita a professor_conteudista/administrador via JWT).

create table if not exists public.rag_material_indexado (
  livro_id      text primary key,
  serie         text not null,
  disciplina    text not null,
  area          text,
  bimestre      integer,
  volume        integer,
  tipo          text not null default 'didatico',
  total_vetores integer not null default 0,
  indexado      boolean not null default false,
  indexado_em   timestamptz,
  atualizado_em timestamptz not null default now()
);

alter table public.rag_material_indexado enable row level security;

comment on table public.rag_material_indexado is
  'Catálogo do material indexado no Pinecone (RAG). Espelha os vetores para permitir navegação/exclusão pela UI, já que o Pinecone não suporta listar valores distintos de metadata. Escrito pelo script local indexar-imagens-locais.ts e pela Edge Function rag-status (service role apenas — sem policies de RLS para anon/authenticated).';
