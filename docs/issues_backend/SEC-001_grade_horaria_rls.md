---
title: "[SEC-001] grade_horaria: RLS USING(true) permite escrita por qualquer usuário"
labels: security, critical, backend
---

## Descrição

A policy `coordenador_gerencia_grade` na tabela `grade_horaria` está configurada com `USING(true) WITH CHECK(true)`, o que significa que **qualquer usuário autenticado** — incluindo alunos — pode inserir, atualizar e deletar registros da grade de horários.

## Evidência (via Management API)

```sql
-- Policy atual (perigosa):
CREATE POLICY "coordenador_gerencia_grade" ON grade_horaria
  FOR ALL USING (true) WITH CHECK (true);
```

## Impacto

- Um aluno logado pode modificar a grade horária de qualquer professor
- Um professor pode apagar a grade de outra turma/segmento
- Não há isolamento por segmento (EAD vs Presencial)

## Correção — SQL a executar no Supabase Dashboard

```sql
-- 1. Dropar policy insegura
DROP POLICY IF EXISTS "coordenador_gerencia_grade" ON grade_horaria;

-- 2. Criar policies corretas
CREATE POLICY "grade_select_all" ON grade_horaria
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "grade_manage_staff" ON grade_horaria
  FOR ALL
  USING (
    tem_tipo(ARRAY['coordenador','gestor_geral','administrador'])
    AND (segmento = get_segmento_usuario())
  )
  WITH CHECK (
    tem_tipo(ARRAY['coordenador','gestor_geral','administrador'])
    AND (segmento = get_segmento_usuario())
  );
```

## Verificação pós-correção

```sql
-- Confirmar que as policies estão corretas:
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'grade_horaria';
-- Esperado: 2 policies (grade_select_all e grade_manage_staff), sem USING(true) geral
```

## Risco de aplicação

🟢 **Baixo** — A correção apenas restringe o que já deveria estar restrito. O único fluxo afetado é `GestaoHorarios.tsx` (coordenador/gestor), que continuará funcionando normalmente pois passa pelo filtro de segmento.

## Não afeta

- Leitura da grade (SELECT permanece liberado para todos autenticados)
- Dashboards de professores e alunos (só leem)
- Qualquer componente que não seja `GestaoHorarios.tsx`
