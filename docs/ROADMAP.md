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
| BUG-009 | `ControlePagamentos.tsx` | Tipo de pagamento embutido no campo `observacao` — dados estruturados misturados com texto | — |
| ~~BUG-010~~ | ~~`UploadConteudoPDF.tsx`~~ | ~~Séries hardcoded — componente abandonado~~ | ✅ #4 |
| BUG-011 | `GestaoEscola.tsx:363` | DELETE de série sem `count` check — turmas órfãs se o primeiro delete falhar silenciosamente | — |

### 🟢 Melhorias / Baixo impacto

| ID | Componente | Descrição | Issue |
|---|---|---|---|
| BUG-012 | `FloatingHelpButton.tsx` | Importa `AcessoRapidoCorrecoes` que não consta no glob de componentes | — |
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
- [ ] **Dashboard do aluno — frequência** — Mini card mostrando % de presença no mês atual
- [ ] **Atividades — contador de entregas pendentes** — Badge no menu do professor mostrando quantas atividades aguardam correção
- [ ] **BUG-010** — Séries dinâmicas em `UploadConteudoPDF` (carregar do banco)
- [ ] **BUG-005** — `RelatorioConteudo` com dados reais da tabela `pdfs_conteudista`

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

Componentes que **ainda precisam de auditoria de segmento** (identificados no ANALISE_COMPLETA):

| Componente | Tabela | Risco | Status |
|---|---|---|---|
| `AdminUsuariosSimple` | `users` | 🟡 Lista usuários de ambos os segmentos | Não auditado |
| `Forum` / `ForumProfessor` | `forum_topicos` | 🟡 Fórum pode ser cross-segment | Não auditado |
| `FrequenciaProfessores` | `frequencia_professor` | 🟡 Pode exibir professores do outro segmento | Não auditado |
| `GestaoHorarios` | `grade_horaria` | 🟡 Verificar filtro de segmento | Não auditado |

---

## Como criar uma issue para este projeto

Use os templates em `.github/ISSUE_TEMPLATE/`:

- **Bug:** `.github/ISSUE_TEMPLATE/bug.md`
- **Feature:** `.github/ISSUE_TEMPLATE/feature.md`

**Regra de ouro:** Uma issue = uma coisa. Nunca misturar bug + feature na mesma issue.
