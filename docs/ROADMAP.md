# ROADMAP — Portal Conexão AVA
> Backlog priorizado · Atualizado em: 2026-05-28 · Última revisão: 2026-05-28  
> Status: 🔴 Crítico · 🟡 Importante · 🟢 Melhoria · ✅ Concluído · 🚫 Descartado

---

## Como usar este documento

Antes de abrir o Claude para implementar algo:
1. Abra (ou crie) uma issue no GitHub com o template adequado
2. Cole o link da issue no início da conversa com o Claude
3. Após o Claude implementar, marque como ✅ neste arquivo

---

## Bugs mapeados (ANALISE_COMPLETA.md)

### 🔴 Críticos

| ID | Componente | Descrição | Issue |
|---|---|---|---|
| ~~BUG-001~~ | ~~`usePresence.ts`~~ | ~~`sendBeacon` sem autenticação~~ — já corrigido antes desta sessão | ✅ #6 |
| ~~BUG-002~~ | ~~`DashboardAluno.tsx`~~ | ~~Datas exibidas com 1 dia a menos no Brasil (UTC-3)~~ | ✅ #2 |
| ~~BUG-003~~ | ~~`EnviarComunicado.tsx:222,253`~~ | ~~`window.confirm()` em vez de `AlertDialog`~~ | ✅ #7 |
| ~~BUG-004~~ | ~~`AgendaProfessor.tsx:156`, `AgendaProfessores.tsx:200`~~ | ~~`window.confirm()` em vez de `AlertDialog`~~ | ✅ #7 |

### 🟡 Importantes

| ID | Componente | Descrição | Issue |
|---|---|---|---|
| ~~BUG-005~~ | ~~`RelatorioConteudo.tsx`~~ | ~~Dados mockados — componente abandonado~~ | ✅ #4 |
| ~~BUG-006~~ | ~~`EstatisticasConteudista.tsx`~~ | ~~Dark mode quebrado — componente abandonado~~ | ✅ #4 |
| ~~BUG-007~~ | ~~`ConquistasEstudante.tsx`, `EstatisticasEstudo.tsx`~~ | ~~Componentes abandonados (só usados por MaterialEstudoModerno, também abandonado)~~ | ✅ #4 |
| ~~BUG-008~~ | ~~múltiplos~~ | ~~Nome "Colégio Conexão EAD Maranhense" errado em 8 componentes~~ | ✅ #1 |
| ~~BUG-009~~ | ~~`ControlePagamentos.tsx`~~ | ~~Método de pagamento sem coluna própria — PIX/Boleto/Dinheiro embutido em `observacao`~~ | ✅ #9 |
| ~~BUG-010~~ | ~~`UploadConteudoPDF.tsx`~~ | ~~Séries hardcoded — componente abandonado~~ | ✅ #4 |
| ~~BUG-011~~ | ~~`GestaoEscola.tsx:363`~~ | ~~DELETE de série sem `count` check — turmas órfãs~~ | ✅ #8 |

### 🟢 Melhorias / Baixo impacto

| ID | Componente | Descrição | Issue |
|---|---|---|---|
| ~~BUG-012~~ | ~~`FloatingHelpButton.tsx`~~ | ~~Componente abandonado — importava `AcessoRapidoCorrecoes` inexistente~~ | ✅ #4-padrão |
| ~~BUG-013~~ | ~~`AdvancedUploadComponent.tsx`~~ | ~~Arquivo utilitário abandonado~~ | ✅ #4 |
| ~~BUG-014~~ | ~~`AgendaCoordenador.tsx`~~ | ~~Não é duplicação — design intencional. Ver comentário no arquivo.~~ | ✅ #5 |
| ~~BUG-015~~ | ~~`App.tsx`, `AulasAoVivoProfessor`, `MaterialEstudoModerno`~~ | ~~`console.log` de debug expondo dados em produção~~ | ✅ #3 |

---

## Bugs já corrigidos ✅

| ID | Descrição | Issue | Commit |
|---|---|---|---|
| — | `notas_length_placeholder` undefined em `DashboardCoordenador` | — | sessão anterior |
| — | `status: 'corrigido'` faltando no CHECK constraint de `atividades_alunos` | — | SQL direto |
| — | Coordenador EAD via filtro `.neq()` incluía dados Presencial | — | `e7f20f16` |
| — | `Desempenho Geral` contava registros de notas em vez de alunos únicos | — | `214d5dfb` |
| — | Labels "Reprovados" substituídas por faixas de desempenho | — | `6cf65ff0` |
| — | Agenda chegava ao aluno sem aprovação do coordenador | — | `a4c651f0` |
| — | `FrequenciaProfessor` agrupava aulas — refatorado para aula independente | — | `9d80ce2c` |
| BUG-008 | Nome "Colégio Conexão EAD Maranhense" errado em 8 componentes | #1 | `e339bc85` |
| BUG-002 | Datas com 1 dia a menos em 3 componentes (bug UTC-3) | #2 | `51986a06` |
| BUG-015 | `console.log` de debug expondo dados em produção | #3 | `03106af6` |
| BUG-005/006/007/010/013 | 7 componentes abandonados deletados (RelatorioConteudo, EstatisticasConteudista, MaterialEstudoModerno, ConquistasEstudante, EstatisticasEstudo, UploadConteudoPDF, AdvancedUploadComponent) | #4 | — |
| BUG-014 | AgendaCoordenador "Configurar Grade" não é duplicação — design documentado | #5 | — |
| BUG-001 | `sendBeacon` sem autenticação — já estava corrigido antes desta sessão | #6 | — |
| BUG-003/004 | 7 `confirm()` → `AlertDialog` em 6 componentes | #7 | `3e7b6fe2` |
| BUG-011 | count check no DELETE série→turmas em `GestaoEscola` | #8 | `c8821464` |
| BUG-009 | Coluna `metodo_pagamento` (pix/boleto/dinheiro/cartao/outro) em `financeiro_mensalidades` | #9 | `01a5fbb3` |
| BUG-012 | `FloatingHelpButton` — componente abandonado deletado | — | `45f2fcad` |
| — | `AdminUsuariosSimple` — componente abandonado deletado (auditoria segmento) | — | `e6a71161` |

---

## Features planejadas

### Fase 1 — Correções (prioridade imediata)

Estas não adicionam funcionalidade, apenas corrigem o que está quebrado:

- [x] ~~**BUG-008**~~ — ~~Corrigir nome da escola~~ ✅ #1
- [x] ~~**BUG-002**~~ — ~~Fix UTC-3 em datas~~ ✅ #2
- [x] ~~**BUG-015**~~ — ~~Remover `console.log` de debug~~ ✅ #3
- [x] ~~**BUG-005/006/007/010/013**~~ — ~~Remover componentes abandonados~~ ✅ #4
- [x] ~~**BUG-014**~~ — ~~Documentar design de AgendaCoordenador~~ ✅ #5
- [x] ~~**BUG-001**~~ — ~~sendBeacon sem autenticação~~ — já estava corrigido ✅ #6
- [x] ~~**BUG-003 + BUG-004**~~ — ~~Substituir todos os `window.confirm` por `AlertDialog`~~ ✅ #7

> **Progresso Fase 1:** 7/7 concluídos ✅ · Fase 1 completa!

---

### Fase 2 — Melhorias pedagógicas

- [ ] **Notificação de agenda aprovada** — Professor recebe notificação quando coordenador aprova sua agenda
- [ ] **Resumo do dia no dashboard do professor** — Cards rápidos: aulas hoje, faltas lançadas, agenda pendente
- [x] ~~**Dashboard do aluno — frequência**~~ — ~~Mini card mostrando % de presença no mês atual~~ — já implementado em `DashboardAluno.tsx` ✅
- [x] ~~**Atividades — contador de entregas pendentes**~~ — ~~Badge no menu do professor~~ — já implementado em `DashboardProfessor.tsx` (`totalPendentesCorrecao`) ✅
- [x] ~~**BUG-010**~~ — ~~Séries dinâmicas em `UploadConteudoPDF`~~ — componente deletado em #4 ✅
- [x] ~~**BUG-005**~~ — ~~`RelatorioConteudo` com dados reais~~ — componente deletado em #4 ✅

---

### Fase 3 — Multi-tenant (futuro)

> ⚠️ Alta complexidade — só iniciar após Fase 1 completa e todos os count checks nos DELETEs

- [ ] Tabela `escolas` (id, nome, cnpj, segmentos_ativos)
- [ ] Campo `escola_id` em todas as tabelas com dados de alunos/professores
- [ ] RLS baseado em `escola_id` do JWT
- [ ] Portal de onboarding para novas escolas
- [ ] `school.ts` dinâmico (buscar configuração do banco por `escola_id`)

---

## Segmentos com risco de vazamento (auditoria)

Auditoria concluída em 2026-05-28. Nenhum vazamento EAD ↔ Presencial confirmado.

| Componente | Resultado | Observação |
|---|---|---|
| ~~`AdminUsuariosSimple`~~ | ✅ Deletado | Componente órfão — nunca chegou a nenhum usuário |
| `Forum` | ✅ Sem risco | Placeholder puro, sem queries |
| `ForumProfessor` | ✅ Sem risco | Filtra por `disciplina_id` (já é segmento-específico) |
| `FrequenciaProfessores` | ✅ Sem risco | `segmentoForcado` aplicado em todas as queries |
| `GestaoHorarios` | ✅ Sem risco | Usa `useSegmento()` hook corretamente |

### ✅ Tech debt resolvido em 2026-05-28

**Migration SQL `series.segmento fundamental→ead`** — executada e código atualizado.
`GestaoHorarios`, `AgendaCoordenador` e `AgendaProfessores` usam `.eq('segmento', segmento)` diretamente. Commit `4aa9c9b7`.

---

## Como criar uma issue para este projeto

Use os templates em `.github/ISSUE_TEMPLATE/`:

- **Bug:** `.github/ISSUE_TEMPLATE/bug.md`
- **Feature:** `.github/ISSUE_TEMPLATE/feature.md`

**Regra de ouro:** Uma issue = uma coisa. Nunca misturar bug + feature na mesma issue.
