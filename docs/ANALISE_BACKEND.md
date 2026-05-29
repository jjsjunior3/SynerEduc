# Análise completa do backend — Supabase
> Gerado em: 2026-05-29 · Projeto: `dunfxnfqaaixwjxvlzny`  
> Fonte: Management API · Schema `public` · 37 tabelas + 1 view

---

## Resumo executivo

| Categoria | Total | Crítico 🔴 | Importante 🟡 | Melhoria 🟢 |
|---|:---:|:---:|:---:|:---:|
| Bugs em funções SQL | 3 | 2 | 1 | — |
| Falha de segurança RLS | 1 | 1 | — | — |
| Indexes faltando | 11 | — | 6 | 5 |
| Tech debt (tabelas) | 4 | — | — | 4 |
| Função quebrada | 1 | 1 | — | — |

---

## 🔴 Bugs críticos

### BUG-B001 — `fn_atualizar_media`: fórmula errada para Presencial

**Tabela afetada:** `notas` (trigger BEFORE UPDATE/INSERT)  
**Impacto:** Notas de alunos presenciais calculadas errado no banco.

```sql
-- CÓDIGO ATUAL (errado para presencial):
NEW.media := ROUND((COALESCE(NEW.av1,0) + COALESCE(NEW.av2,0)) / 2, 2);
-- ↑ ignora AV3. Presencial tem 3 avaliações — deveria ser (AV1+AV2+AV3)/3

-- Além disso:
NEW.media_final := NEW.recuperacao; -- errado: substitui direto pelo valor da REC,
-- mas a regra correta é: REC substitui a MENOR nota, e APENAS se REC > menor nota
```

**Diagnóstico:** A função `calcularNota()` do front-end em `src/utils/calculoNotas.ts` tem a lógica certa, mas o trigger do banco ignora o segmento e usa fórmula EAD para todos. Isso significa que toda nota de presencial salva no banco pode ter `media` e `media_final` incorretas se calculadas pelo trigger.

**Correção necessária:**
```sql
CREATE OR REPLACE FUNCTION fn_atualizar_media()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_segmento text;
  v_menor    numeric;
BEGIN
  -- Detecta segmento da nota
  v_segmento := COALESCE(NEW.segmento, 'ead');

  -- Calcula média sem recuperação
  IF v_segmento = 'presencial' AND NEW.av3 IS NOT NULL THEN
    NEW.media := ROUND((COALESCE(NEW.av1,0) + COALESCE(NEW.av2,0) + COALESCE(NEW.av3,0)) / 3, 2);
  ELSE
    NEW.media := ROUND((COALESCE(NEW.av1,0) + COALESCE(NEW.av2,0)) / 2, 2);
  END IF;

  -- Aplica recuperação: substitui a MENOR nota se REC > menor
  IF NEW.recuperacao IS NOT NULL AND NEW.recuperacao > 0 THEN
    IF v_segmento = 'presencial' AND NEW.av3 IS NOT NULL THEN
      v_menor := LEAST(COALESCE(NEW.av1,0), COALESCE(NEW.av2,0), COALESCE(NEW.av3,0));
      IF NEW.recuperacao > v_menor THEN
        NEW.media_final := ROUND((
          CASE WHEN COALESCE(NEW.av1,0) = v_menor THEN NEW.recuperacao ELSE COALESCE(NEW.av1,0) END +
          CASE WHEN COALESCE(NEW.av2,0) = v_menor AND COALESCE(NEW.av1,0) != v_menor THEN NEW.recuperacao ELSE COALESCE(NEW.av2,0) END +
          CASE WHEN COALESCE(NEW.av3,0) = v_menor AND COALESCE(NEW.av1,0) != v_menor AND COALESCE(NEW.av2,0) != v_menor THEN NEW.recuperacao ELSE COALESCE(NEW.av3,0) END
        ) / 3, 2);
      ELSE
        NEW.media_final := NEW.media;
      END IF;
    ELSE
      v_menor := LEAST(COALESCE(NEW.av1,0), COALESCE(NEW.av2,0));
      IF NEW.recuperacao > v_menor THEN
        NEW.media_final := ROUND((
          GREATEST(COALESCE(NEW.av1,0), COALESCE(NEW.av2,0)) + NEW.recuperacao
        ) / 2, 2);
      ELSE
        NEW.media_final := NEW.media;
      END IF;
    END IF;
  ELSE
    NEW.media_final := NEW.media;
  END IF;

  -- Situação final
  NEW.status_final := CASE
    WHEN NEW.recuperacao IS NOT NULL THEN
      CASE WHEN NEW.media_final >= 7 THEN 'aprovado' ELSE 'reprovado' END
    ELSE
      CASE WHEN NEW.media_final >= 7 THEN 'aprovado'
           WHEN NEW.media_final >= 5 THEN 'recuperacao'
           ELSE 'reprovado' END
  END;

  NEW.atualizado_em := NOW();
  RETURN NEW;
END;
$$;
```

---

### BUG-B002 — `total_alunos_ativos()`: referencia tabela inexistente

**Impacto:** Função quebrada — sempre falha quando chamada.

```sql
-- CÓDIGO ATUAL (quebrado):
SELECT count(*) FROM usuarios WHERE tipo = 'aluno' AND ativo = true;
-- ↑ tabela 'usuarios' não existe (é 'users') e coluna 'ativo' não existe (é 'status')

-- CORREÇÃO:
SELECT count(*) FROM users WHERE tipo = 'aluno' AND status = 'ativo';
```

---

### BUG-B003 — `buscar_agenda_por_data`: 3 versões sobrepostas, 2 quebradas

**Impacto:** O banco tem 3 overloads da mesma função. Os dois mais antigos referenciam colunas que não existem na tabela atual (`ap.titulo`, `ap.descricao`, `ap.para_casa`, `ap.conteudo`).

```sql
-- Versão 1 (antiga, quebrada): referencia ap.titulo, ap.descricao, ap.conteudo, ap.para_casa
-- Versão 2 (intermediária, quebrada): idem
-- Versão 3 (atual, correta): usa ap.titulo_unidade, ap.conteudo_sala, ap.atividade_casa

-- CORREÇÃO: dropar as 2 versões antigas
-- DROP FUNCTION buscar_agenda_por_data(date, uuid, text);  -- versão 1
-- DROP FUNCTION buscar_agenda_por_data(date, uuid, text);  -- versão 2 (assinatura diferente)
```

---

## 🔴 Falha de segurança

### SEC-001 — `grade_horaria`: RLS permite escrita para qualquer usuário autenticado

**Tabela:** `grade_horaria`  
**Policy:** `coordenador_gerencia_grade`  
**Impacto:** QUALQUER usuário logado (incluindo alunos) pode inserir, alterar e deletar a grade de horários.

```sql
-- ATUAL (perigoso):
CREATE POLICY "coordenador_gerencia_grade" ON grade_horaria
  FOR ALL USING (true) WITH CHECK (true);  -- ← sem restrição alguma

-- CORREÇÃO:
DROP POLICY "coordenador_gerencia_grade" ON grade_horaria;

CREATE POLICY "grade_select_all" ON grade_horaria
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "grade_manage_staff" ON grade_horaria
  FOR ALL USING (
    tem_tipo(ARRAY['coordenador','gestor_geral','administrador'])
    AND (segmento = get_segmento_usuario())
  )
  WITH CHECK (
    tem_tipo(ARRAY['coordenador','gestor_geral','administrador'])
    AND (segmento = get_segmento_usuario())
  );
```

---

## 🟡 Issues importantes

### IDX-001 — Indexes críticos ausentes

Queries executadas frequentemente sem index:

| Tabela | Coluna(s) | Impacto | SQL |
|---|---|---|---|
| `agenda_professor` | `data_aula` | Dashboard "hoje" roda full scan | `CREATE INDEX idx_agenda_data_aula ON agenda_professor(data_aula);` |
| `agenda_professor` | `data_aula, professor_id` | Resumo do dia do professor | `CREATE INDEX idx_agenda_data_prof ON agenda_professor(data_aula, professor_id);` |
| `notificacoes` | `user_id, lida` | Carrega notif. a cada login | `CREATE INDEX idx_notif_user_lida ON notificacoes(user_id, lida);` |
| `notas` | `user_id, disciplina_id` | Boletim e dashboard aluno | `CREATE INDEX idx_notas_user_disc ON notas(user_id, disciplina_id);` |
| `contratos` | `aluno_id` | Financeiro e ficha | `CREATE INDEX idx_contratos_aluno ON contratos(aluno_id);` |
| `fichas_matricula` | `aluno_id` | Join frequente em documentos | `CREATE INDEX idx_fichas_aluno ON fichas_matricula(aluno_id);` |
| `users` | `tipo, segmento` | Filtros por perfil e segmento | `CREATE INDEX idx_users_tipo_segmento ON users(tipo, segmento);` |
| `comunicados` | `segmento, criado_em` | Lista comunicados por segmento | `CREATE INDEX idx_comunicados_seg_data ON comunicados(segmento, criado_em DESC);` |
| `financeiro_mensalidades` | `aluno_id, status` | Inadimplência | já tem `idx_mensalidades_aluno` e `idx_mensalidades_status` individualmente — falta composite |
| `frequencia_diaria` | `professor_id, data_aula` | Resumo do dia (F2.1) | já tem `freq_diaria_data_idx (data_aula, professor_id)` ✅ |
| `series` | `segmento, ativa` | Dropdown de séries | `CREATE INDEX idx_series_segmento_ativa ON series(segmento, ativa);` |

---

### ISSUE-001 — `eh_admin()` não inclui `gestor_geral`

```sql
-- ATUAL:
CREATE FUNCTION eh_admin() RETURNS boolean AS $$
  SELECT public.get_tipo_usuario() = 'administrador';
$$;

-- PROBLEMA: gestor_geral tem acesso de admin em muitas políticas via tem_tipo(),
-- mas eh_admin() retorna false para ele — criando inconsistência nos privilégios.

-- CORREÇÃO:
CREATE OR REPLACE FUNCTION eh_admin() RETURNS boolean AS $$
  SELECT public.get_tipo_usuario() IN ('administrador', 'gestor_geral');
$$;
```

---

### ISSUE-002 — `series.total_alunos` sem trigger de atualização

`turmas.total_alunos` tem triggers (`incrementar_total_alunos`, `decrementar_total_alunos`) que disparam em INSERT/DELETE em `alunos_turmas`.  
`series.total_alunos` **não tem nenhum trigger** — o campo existe mas nunca é atualizado automaticamente. Fica com o valor 0 padrão.

---

### ISSUE-003 — `frequencia_diaria`: 8 policies sobrepostas (4 antigas + 4 novas)

Políticas com nomes em português (antigas) + políticas com prefixo `freq_*` (novas) coexistem. Todas PERMISSIVE — não causam bloqueio, mas:
- Dificulta manutenção (qual é a canonical?)
- Algumas antigas referenciam `users` via subquery sem `get_segmento_usuario()` — pode vazar dados entre segmentos em edge cases

**Ação:** Dropar as 4 antigas (com nomes em português).

---

### ISSUE-004 — `atividades` sem coluna `segmento`

A tabela `atividades` usa `serie` (text) para filtrar alunos, mas **não tem coluna `segmento`**. A RLS policy `atv_select` permite SELECT para qualquer `auth.uid() IS NOT NULL` — ou seja, um aluno EAD pode ver atividades de alunos Presencial se a série coincidir por nome.

---

## 🟢 Tech debt / Tabelas redundantes

### DEBT-001 — Duas tabelas de matrícula

| Tabela | Naming | Status |
|---|---|---|
| `matriculas` | `id_user`, `id_turma` (estilo antigo) | Parece legado |
| `alunos_turmas` | `aluno_id`, `turma_id` (estilo atual) | Canônica (tem triggers, indexes) |

**Recomendação:** Confirmar se `matriculas` ainda é usada por algum componente. Se não, pode ser deletada após migração de dados.

### DEBT-002 — Duas tabelas de grade de horários

| Tabela | Tipo | Status |
|---|---|---|
| `horarios_escolar` | Denormalizada (texto: `disciplina text`, `professor text`) | Legada |
| `grade_horaria` | Relacional (UUIDs: `professor_id`, `disciplina_id`) | Canônica |

`horarios_escolar` não tem indexação útil. `grade_horaria` tem unique constraint e é a que o front usa para "aulas hoje".

### DEBT-003 — Duas tabelas de progresso do aluno

| Tabela | Granularidade |
|---|---|
| `progresso_aluno` | por `(user_id, disciplina_id, bimestre)` |
| `progresso_aluno_disciplina` | por `(aluno_id, disciplina_id, turma_id)` |

Sobreposição de propósito. Nenhuma das duas parece atualizada com frequência. Verificar uso real no front.

### DEBT-004 — `pdfs_conteudista`: colunas duplicadas de migração

A tabela acumulou redundâncias de múltiplas migrations:

| Dado | Coluna 1 | Coluna 2 | Coluna 3 |
|---|---|---|---|
| Bimestre | `id_bimestre` (uuid FK) | `bimestre` (int) | `bimestre_numero` (int) |
| Disciplina | `id_disciplina` (uuid FK) | `disciplina` (text) | `disciplina_slug` (text) |
| Série | `id_turma` (uuid) | `serie` (text) | — |
| Autor | `id_prof_conteudista` (uuid) | `autor_id` (uuid) | `autor_nome` (text) |

---

## Inventário completo de tabelas

### Tabelas por domínio

**Identidade e acesso**
- `users` — perfil de todos os usuários (aluno, professor, coordenador, etc.)
- `sessoes_ativas` — presença online em tempo real
- `segmentos` — EAD e Presencial

**Acadêmico — estrutura**
- `series` — séries (5º Ano → 3ª Série EM)
- `turmas` — turmas por série
- `disciplinas` — disciplinas por série/segmento
- `bimestres` — bimestres do ano letivo
- `ano_letivo` — configuração do ano

**Acadêmico — vínculos professor**
- `professores_disciplinas_series` — professor ↔ disciplina ↔ série ↔ turma
- `professores_turmas` — professor ↔ turma (legado?)
- `grade_horaria` — grade semanal operacional (professor × dia × slot)
- `horarios_escolar` — grade visual denormalizada (texto)

**Acadêmico — aluno**
- `matriculas` — matrícula aluno ↔ turma (legado, naming antigo)
- `alunos_turmas` — matrícula aluno ↔ turma (atual, com triggers)
- `notas` — AV1, AV2, AV3, recuperação, média, status (+ trigger fn_atualizar_media)
- `frequencia_diaria` — presença por aluno × aula × dia
- `frequencia_professor` — presença do próprio professor
- `progresso_aluno` — progresso por disciplina/bimestre (legado?)
- `progresso_aluno_disciplina` — progresso por disciplina/turma (atual?)

**Agenda e atividades**
- `agenda_professor` — planejamento diário de aula (status: pendente/enviado/editado)
- `atividades` — atividades criadas pelo professor
- `atividades_alunos` — entregas dos alunos (+ trigger notificação)
- `proximas_aulas` — próximas aulas agendadas
- `aulas_ao_vivo` — aulas ao vivo (Zoom/Meet)

**Conteúdo**
- `materiais_pdf` — PDFs por disciplina/bimestre
- `pdfs_conteudista` — PDFs enviados pelo professor conteudista (tabela problemática)

**Comunicação**
- `comunicados` — avisos por segmento
- `notificacoes` — notificações in-app por usuário
- `mensagens_chat` — chat direto entre usuários
- `forum_topicos` — tópicos do fórum por disciplina
- `forum_respostas` — respostas dos tópicos

**Matrícula e documentação**
- `fichas_matricula` — ficha completa do aluno (dados pessoais + responsável)
- `documentos_matricula` — documentos enviados por aluno/secretaria
- `contratos` — contrato financeiro vinculado à ficha

**Financeiro**
- `financeiro_mensalidades` — cobranças mensais (agora com `metodo_pagamento` ✅)
- `financeiro_despesas` — despesas da escola

**Views**
- `vw_boletim` — JOIN de notas + users + disciplinas para exibição do boletim

---

## Funções e triggers (inventário)

| Função | Tipo | Status |
|---|---|---|
| `tem_tipo(tipos[])` | SECURITY helper | ✅ OK |
| `eh_admin()` | SECURITY helper | 🟡 Falta `gestor_geral` |
| `get_tipo_usuario()` | SECURITY helper | ✅ OK |
| `get_segmento_usuario()` | SECURITY helper | ✅ OK |
| `sync_user_metadata()` | TRIGGER (users → auth.users) | ✅ OK |
| `fn_atualizar_media()` | TRIGGER (notas) | 🔴 Fórmula errada |
| `atualizar_total_alunos()` | TRIGGER (alunos_turmas → turmas) | ✅ OK |
| `incrementar_total_alunos()` | TRIGGER (legado) | 🟡 Redundante com acima |
| `decrementar_total_alunos()` | TRIGGER (legado) | 🟡 Redundante com acima |
| `set_updated_at()` | TRIGGER genérico | ✅ OK |
| `update_updated_at_column()` | TRIGGER genérico | 🟡 Duplicado de `set_updated_at` |
| `notificar_alunos_nova_atividade()` | TRIGGER (atividades) | 🟡 Rota hardcoded em SQL |
| `buscar_agenda_por_data()` | FUNCTION (3 versões!) | 🔴 2 versões quebradas |
| `get_frequencia_resumo_por_data()` | FUNCTION | ✅ OK |
| `get_all_users_with_auth_data()` | FUNCTION (admin) | ✅ OK |
| `get_all_users_with_details()` | FUNCTION (admin) | ✅ OK |
| `get_users_with_email()` | FUNCTION (admin) | ✅ OK |
| `total_alunos_ativos()` | FUNCTION | 🔴 Tabela inexistente |
| `total_alunos()` | FUNCTION (computed) | ✅ OK |
| `atualizar_status_mensalidades()` | FUNCTION (cron candidate) | ✅ OK — mas sem cron configurado |

---

## RLS — visão geral por tabela

Todas as 37 tabelas têm RLS ativado (`rls_enabled = true`). Padrão geral:
- `eh_admin()` → acesso total
- `tem_tipo([...])` + `get_segmento_usuario()` → acesso por perfil e segmento
- `auth.uid() = campo_id` → acesso ao próprio registro

**Exceções e riscos identificados:**

| Tabela | Risco | Detalhe |
|---|---|---|
| `grade_horaria` | 🔴 CRÍTICO | Policy `USING(true)` — qualquer usuário escreve |
| `forum_topicos` | 🟡 | 2 policies SELECT duplicadas (nomes em PT vs código) |
| `frequencia_diaria` | 🟡 | 8 policies sobrepostas (4 antigas + 4 novas) |
| `atividades` | 🟡 | `atv_select` permite ANY auth user sem filtro de segmento |
| `sessoes_ativas` | 🟢 | `leitura_autenticado` permite todos verem presença de todos |
| `users` | ✅ | Bem isolado por segmento |
| `notas` | ✅ | Bem isolado — professor_responsavel + segmento |
| `financeiro_*` | ✅ | Bem isolado por segmento |

---

## Impacto nas features planejadas

### F2.1 — IA Histórico Escolar

**Dados disponíveis para o prompt:** ✅ completo
- `notas` (AV1, AV2, AV3, média, status) + `vw_boletim` (join otimizado)
- `frequencia_diaria` (presença por aula)
- `fichas_matricula` (dados pessoais)
- `disciplinas` (nomes)
- `bimestres` (períodos)

**Atenção:** `fn_atualizar_media` (BUG-B001) pode causar médias erradas no banco para Presencial. Corrigir antes de usar `notas.media` como entrada do prompt.

### F5 — Agentes de IA

**Dados por agente:**

| Agente | Tabelas principais | Gap |
|---|---|---|
| Secretaria | `fichas_matricula`, `documentos_matricula`, `contratos`, `users` | — |
| Gestor | `users`, `notas`, `financeiro_mensalidades`, `frequencia_diaria` | — |
| Coordenador | `agenda_professor`, `atividades`, `frequencia_diaria`, `notas` | `atividades` sem `segmento` |
| Professor | `agenda_professor`, `notas`, `frequencia_diaria`, `grade_horaria` | — |
| Financeiro | `financeiro_mensalidades`, `financeiro_despesas`, `contratos` | — |
| Aluno | `notas`, `frequencia_diaria`, `atividades_alunos`, `agenda_professor` | — |
| Responsável | `fichas_matricula`, `notas`, `frequencia_diaria`, `contratos` | Precisa de F3 |

### F1.1 — Multi-tenant

**Escopo da migration:**
- 37 tabelas recebem `escola_id UUID REFERENCES escolas(id)`
- RLS: adicionar `AND escola_id = get_escola_usuario()` em todas as policies
- Função `get_escola_usuario()` análoga à `get_segmento_usuario()`
- Tabelas que já têm `segmento` ficam com ambos: `segmento` + `escola_id`
- Tabelas sem `segmento` ainda (`atividades`, `matriculas`, `bimestres`) ganham direto `escola_id`

---

## SQL de correção imediata recomendada

```sql
-- 1. SECURITY: corrigir grade_horaria (qualquer user escreve)
DROP POLICY "coordenador_gerencia_grade" ON grade_horaria;
CREATE POLICY "grade_select_all" ON grade_horaria
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "grade_manage_staff" ON grade_horaria
  FOR ALL USING (tem_tipo(ARRAY['coordenador','gestor_geral','administrador']) AND segmento = get_segmento_usuario())
  WITH CHECK (tem_tipo(ARRAY['coordenador','gestor_geral','administrador']) AND segmento = get_segmento_usuario());

-- 2. Corrigir eh_admin() para incluir gestor_geral
CREATE OR REPLACE FUNCTION eh_admin() RETURNS boolean
  LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT public.get_tipo_usuario() IN ('administrador', 'gestor_geral');
$$;

-- 3. Corrigir total_alunos_ativos()
CREATE OR REPLACE FUNCTION total_alunos_ativos() RETURNS integer
  LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT count(*)::integer FROM users WHERE tipo = 'aluno' AND status = 'ativo';
$$;

-- 4. Indexes críticos ausentes
CREATE INDEX IF NOT EXISTS idx_agenda_data_aula     ON agenda_professor(data_aula);
CREATE INDEX IF NOT EXISTS idx_agenda_data_prof      ON agenda_professor(data_aula, professor_id);
CREATE INDEX IF NOT EXISTS idx_notif_user_lida       ON notificacoes(user_id, lida);
CREATE INDEX IF NOT EXISTS idx_notas_user_disc       ON notas(user_id, disciplina_id);
CREATE INDEX IF NOT EXISTS idx_contratos_aluno       ON contratos(aluno_id);
CREATE INDEX IF NOT EXISTS idx_fichas_aluno          ON fichas_matricula(aluno_id);
CREATE INDEX IF NOT EXISTS idx_users_tipo_seg        ON users(tipo, segmento);
CREATE INDEX IF NOT EXISTS idx_series_seg_ativa      ON series(segmento, ativa);
CREATE INDEX IF NOT EXISTS idx_comunicados_seg_data  ON comunicados(segmento, criado_em DESC);

-- 5. Dropar função total_alunos_ativos original (conflito de nome)
-- (substituída acima)

-- 6. [DEPOIS de confirmar] Dropar as 2 versões antigas de buscar_agenda_por_data
-- (requer identificar as assinaturas exatas com pg_proc)
```

---

## Notas para o MCP Supabase

Para ativar o MCP nas próximas sessões (Claude Code deve ser reiniciado completamente):
```
C:\Users\Junior\.claude\settings.json → configurado com project-ref dunfxnfqaaixwjxvlzny
```
