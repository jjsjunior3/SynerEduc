---
title: "[BUG-B003] buscar_agenda_por_data: 3 versões sobrepostas, 2 referenciam colunas inexistentes"
labels: bug, backend, agenda
---

## Descrição

A função `buscar_agenda_por_data` existe em **3 overloads** no banco. As duas versões mais antigas referenciam colunas que não existem mais na tabela `agenda_professor` (`ap.titulo`, `ap.descricao`, `ap.para_casa`, `ap.conteudo`). A versão atual e correta usa `ap.titulo_unidade`, `ap.conteudo_sala`, `ap.atividade_casa`.

## Diagnóstico

| Versão | Colunas acessadas | Status |
|---|---|---|
| v1 (mais antiga) | `ap.titulo`, `ap.descricao` | 🔴 Quebrada |
| v2 (intermediária) | `ap.titulo`, `ap.descricao`, `ap.conteudo`, `ap.para_casa` | 🔴 Quebrada |
| v3 (atual) | `ap.titulo_unidade`, `ap.conteudo_sala`, `ap.atividade_casa` | ✅ Correta |

## Ação necessária antes da correção

Identificar as assinaturas exatas com:

```sql
SELECT proname, pg_get_function_arguments(oid) AS args, pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'buscar_agenda_por_data'
ORDER BY oid;
```

## Correção — dropar as versões antigas

```sql
-- Executar após identificar as assinaturas com a query acima
-- Substituir os tipos de argumento pelos corretos da v1 e v2

-- Exemplo (ajustar conforme a query de diagnóstico retornar):
-- DROP FUNCTION buscar_agenda_por_data(date, uuid);          -- v1
-- DROP FUNCTION buscar_agenda_por_data(date, uuid, text);    -- v2

-- Manter apenas a v3 (a atual que funciona)
```

## Risco de aplicação

🟡 **Médio** — Verificar primeiro qual assinatura o front-end está usando antes de dropar. O componente `AgendaCoordenador.tsx` e `AgendaProfessores.tsx` podem chamar a função. Se chamarem pela assinatura errada, a remoção pode quebrar a chamada — mas como as versões antigas já estão quebradas, qualquer chamada delas já estaria falhando silenciosamente.

## Recomendação

Executar a query de diagnóstico primeiro, confirmar qual versão o front chama, depois dropar as quebradas.
