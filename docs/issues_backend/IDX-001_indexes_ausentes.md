---
title: "[IDX-001] 9 indexes críticos ausentes — performance e queries sem índice"
labels: performance, backend, database
---

## Descrição

Análise do schema revelou 9 indexes críticos ausentes em colunas frequentemente consultadas. Queries de dashboard, notificações e boletim estão fazendo full table scan.

## Impacto por index

| Index | Tabela | Query afetada | Severidade |
|---|---|---|---|
| `data_aula` | `agenda_professor` | Dashboard "aulas hoje" do professor (carrega a cada login) | 🔴 Alta |
| `(data_aula, professor_id)` | `agenda_professor` | Seção "Resumo do Dia" | 🔴 Alta |
| `(user_id, lida)` | `notificacoes` | Badge de notificações (carrega a cada página) | 🔴 Alta |
| `(user_id, disciplina_id)` | `notas` | Boletim do aluno | 🟡 Média |
| `aluno_id` | `contratos` | Tela financeiro / ficha do aluno | 🟡 Média |
| `aluno_id` | `fichas_matricula` | JOIN em documentos e contratos | 🟡 Média |
| `(tipo, segmento)` | `users` | Filtros de coordenador/gestor | 🟡 Média |
| `(segmento, criado_em DESC)` | `comunicados` | Lista de comunicados por segmento | 🟡 Média |
| `(segmento, ativa)` | `series` | Dropdown de séries | 🟢 Baixa |

## Correção — SQL a executar no Supabase Dashboard

```sql
-- Todos são CREATE INDEX IF NOT EXISTS — completamente seguros, sem risco algum

-- Alta prioridade (impacto em dashboard do professor a cada login)
CREATE INDEX IF NOT EXISTS idx_agenda_data_aula
  ON agenda_professor(data_aula);

CREATE INDEX IF NOT EXISTS idx_agenda_data_professor
  ON agenda_professor(data_aula, professor_id);

-- Alta prioridade (notificações carregam em toda navegação)
CREATE INDEX IF NOT EXISTS idx_notif_user_lida
  ON notificacoes(user_id, lida);

-- Média prioridade
CREATE INDEX IF NOT EXISTS idx_notas_user_disciplina
  ON notas(user_id, disciplina_id);

CREATE INDEX IF NOT EXISTS idx_contratos_aluno
  ON contratos(aluno_id);

CREATE INDEX IF NOT EXISTS idx_fichas_aluno
  ON fichas_matricula(aluno_id);

CREATE INDEX IF NOT EXISTS idx_users_tipo_segmento
  ON users(tipo, segmento);

CREATE INDEX IF NOT EXISTS idx_comunicados_seg_data
  ON comunicados(segmento, criado_em DESC);

-- Baixa prioridade
CREATE INDEX IF NOT EXISTS idx_series_segmento_ativa
  ON series(segmento, ativa);
```

## Risco de aplicação

🟢 **Zero** — Criar índices é a operação mais segura possível em banco de dados. Nunca quebra funcionalidade. Pode ser executado a qualquer momento, inclusive em horário de pico. O Supabase cria indexes de forma não-bloqueante por padrão.
