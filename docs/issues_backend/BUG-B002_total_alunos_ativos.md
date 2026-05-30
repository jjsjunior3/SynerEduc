---
title: "[BUG-B002] total_alunos_ativos(): referencia tabela 'usuarios' inexistente — função quebrada"
labels: bug, backend
---

## Descrição

A função `total_alunos_ativos()` referencia a tabela `usuarios` e a coluna `ativo`, que não existem no schema atual. A tabela é `users` e a coluna é `status`.

## Código atual (quebrado)

```sql
CREATE FUNCTION total_alunos_ativos() RETURNS integer AS $$
  SELECT count(*) FROM usuarios WHERE tipo = 'aluno' AND ativo = true;
  --                        ↑ não existe         ↑ não existe
$$;
```

## Correção — SQL a executar no Supabase Dashboard

```sql
CREATE OR REPLACE FUNCTION total_alunos_ativos()
RETURNS integer LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT count(*)::integer
  FROM users
  WHERE tipo = 'aluno'
    AND status = 'ativo';
$$;
```

## Risco de aplicação

🟢 **Zero** — A função está atualmente quebrada (sempre falha). A correção só pode melhorar.
