---
title: "[BUG-B004] eh_admin() não inclui gestor_geral — inconsistência de privilégios RLS"
labels: bug, backend, security, rls
---

## Descrição

A função helper `eh_admin()` verifica apenas `tipo = 'administrador'`, mas `gestor_geral` é um papel equivalente de administração escolar. Como resultado, `gestor_geral` não passa pelas policies que usam `eh_admin()` diretamente, criando inconsistência de acesso.

## Código atual

```sql
CREATE FUNCTION eh_admin() RETURNS boolean AS $$
  SELECT public.get_tipo_usuario() = 'administrador';
  --     ↑ gestor_geral não é incluído
$$;
```

## Impacto

Políticas que usam `eh_admin()` (em vez de `tem_tipo(ARRAY['gestor_geral',...])`):
- `agenda_professor` — `agenda_manage_admin`, `agenda_select_admin`
- `notas` — `notas_delete_admin`, `notas_insert_admin`, `notas_select_admin`, `notas_update_admin`
- `users` — `users_delete_admin`, `users_insert_admin`, `users_select_admin`, `users_update_admin`
- + todos os demais `*_admin` em todas as tabelas

Isso significa que `gestor_geral` pode estar sendo barrado em operações que deveria ter acesso total.

## Correção — SQL a executar no Supabase Dashboard

```sql
CREATE OR REPLACE FUNCTION eh_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT public.get_tipo_usuario() IN ('administrador', 'gestor_geral');
$$;
```

## Risco de aplicação

🟢 **Zero** — A mudança **expande** acesso do `gestor_geral` para operações que já deveria ter. Não remove acesso de ninguém. Pode ser aplicada a qualquer momento.
