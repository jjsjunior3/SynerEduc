# ROADMAP — Portal Conexão AVA · SynerEduc
> Backlog priorizado por dependência estrutural · Atualizado em: 2026-05-29  
> Status: 🔴 Crítico · 🟡 Importante · 🟢 Melhoria · ✅ Concluído · ⏸ Adiado · 🚫 Descartado

---

## Como usar este documento

Antes de abrir o Claude para implementar algo:
1. Abra (ou crie) uma issue no GitHub com o template adequado
2. Cole o link da issue no início da conversa com o Claude
3. Após o Claude implementar, marque como ✅ neste arquivo

---

## Cronograma por prioridade de dependência estrutural

> A ordem abaixo não é arbitrária — cada item está onde está porque algo abaixo dele depende de ele existir primeiro. Nada está na frente de outro sem motivo técnico real.

```
CONCLUÍDO
 ✅ T1   → Testes unitários (rede de segurança para tudo abaixo)
 ✅ F1   → Correções críticas (bugs, nome, datas, confirm → dialog)
 ✅ F2   → Melhorias pedagógicas (resumo do dia, notificações, frequência)

DEPENDÊNCIA ESTRUTURAL PARA IA
 #1  F2.1 → IA Histórico Escolar  ← Edge Function + proxy Claude API
              │                      (foundation de TODA a IA do sistema)
              ▼
 #2  F5   → Agentes de IA — 6/7 perfis  ← reutiliza F2.1 imediatamente
              │   (secretaria, gestor, coord, prof, financeiro, aluno)
              │
 #3  F3   → Portal do Responsável  ← novo perfil, RLS isolado
              │
              ├──► #4  F5++ → 7º agente (responsavel) ← fecha F5 completo
              │
              └──► #7  F4  → Financeiro Avançado + Asaas

REFACTOR ESTRUTURAL (antes da 2ª escola + antes de F4 para evitar retrabalho)
 #5  F1.1 → Multi-tenant  ← escola_id em todas as tabelas + RLS
              │
              └──► deadline natural: Colégio Ariane Maria (~nov/2026)

DEADLINE SAZONAL (independente, mas tem data limite)
 #6  F1.3 → Virada de ano letivo  ← deadline: outubro/2026 (testar antes de dez)

PRODUTO ESTABILIZADO
 #8  F6  → Mobile PWA → React Native  ← critério: < 2 bugs críticos/mês

ADIADO
 ⏸  F1.2 → Liberar acesso portal  ← dez/2026 (matrículas do ano seguinte)
```

### Resumo executivo

| Prioridade | Fase | Por que esta posição | Esforço est. | Janela |
|:---:|---|---|:---:|---|
| **#1** | F2.1 IA Histórico | **Foundation de toda IA** — Edge Function proxy Claude API | 2 sem | Jun/2026 |
| **#2** | F5 Agentes (6/7) | Objetivo principal — reutiliza F2.1 direto | 3-4 sem | Jun-Jul |
| **#3** | F3 Portal Responsável | Fecha F5 (7º agente) + habilita F4 | 2-3 sem | Jul |
| **#4** | F5 completo (7º ag.) | 1 semana após F3 estar no ar | 1 sem | Jul-Ago |
| **#5** | F1.1 Multi-tenant | Antes da 2ª escola + antes de F4 (evita retrabalho Asaas) | 3-4 sem | Ago-Set |
| **#6** | F1.3 Virada de ano | Deadline dez/2026 — testar com 2 meses de antecedência | 1-2 sem | Set-Out |
| **#7** | F4 Financeiro+Asaas | Após F3 (portal) + F1.1 (multi-tenant) = zero retrabalho | 2-3 sem | Out-Nov |
| **#8** | F6 PWA | Produto estável — após tudo acima consolidado | 1-2 sem | Nov-Dez |
| **⏸** | F1.2 Liberar acesso | Todos os alunos já cadastrados — retomar nas matrículas | — | Dez/2026 |

---

## Bugs mapeados (ANALISE_COMPLETA.md) — todos resolvidos

### 🔴 Críticos — ✅ todos corrigidos

| ID | Componente | Descrição | Issue |
|---|---|---|---|
| ~~BUG-001~~ | ~~`usePresence.ts`~~ | ~~`sendBeacon` sem autenticação~~ | ✅ #6 |
| ~~BUG-002~~ | ~~`DashboardAluno.tsx`~~ | ~~Datas exibidas com 1 dia a menos no Brasil (UTC-3)~~ | ✅ #2 |
| ~~BUG-003~~ | ~~`EnviarComunicado.tsx:222,253`~~ | ~~`window.confirm()` em vez de `AlertDialog`~~ | ✅ #7 |
| ~~BUG-004~~ | ~~`AgendaProfessor.tsx:156`, `AgendaProfessores.tsx:200`~~ | ~~`window.confirm()` em vez de `AlertDialog`~~ | ✅ #7 |

### 🟡 Importantes — ✅ todos corrigidos

| ID | Componente | Descrição | Issue |
|---|---|---|---|
| ~~BUG-005~~ | ~~`RelatorioConteudo.tsx`~~ | ~~Dados mockados — componente abandonado~~ | ✅ #4 |
| ~~BUG-006~~ | ~~`EstatisticasConteudista.tsx`~~ | ~~Dark mode quebrado — componente abandonado~~ | ✅ #4 |
| ~~BUG-007~~ | ~~`ConquistasEstudante.tsx`, `EstatisticasEstudo.tsx`~~ | ~~Componentes abandonados~~ | ✅ #4 |
| ~~BUG-008~~ | ~~múltiplos~~ | ~~Nome "Colégio Conexão EAD Maranhense" errado em 8 componentes~~ | ✅ #1 |
| ~~BUG-009~~ | ~~`ControlePagamentos.tsx`~~ | ~~Método de pagamento sem coluna própria~~ | ✅ #9 |
| ~~BUG-010~~ | ~~`UploadConteudoPDF.tsx`~~ | ~~Séries hardcoded — componente abandonado~~ | ✅ #4 |
| ~~BUG-011~~ | ~~`GestaoEscola.tsx:363`~~ | ~~DELETE de série sem `count` check — turmas órfãs~~ | ✅ #8 |

### 🟢 Melhorias — ✅ todas corrigidas

| ID | Componente | Descrição | Issue |
|---|---|---|---|
| ~~BUG-012~~ | ~~`FloatingHelpButton.tsx`~~ | ~~Componente abandonado~~ | ✅ #4 |
| ~~BUG-013~~ | ~~`AdvancedUploadComponent.tsx`~~ | ~~Arquivo utilitário abandonado~~ | ✅ #4 |
| ~~BUG-014~~ | ~~`AgendaCoordenador.tsx`~~ | ~~Não é duplicação — design intencional documentado~~ | ✅ #5 |
| ~~BUG-015~~ | ~~`App.tsx`, `AulasAoVivoProfessor`~~ | ~~`console.log` de debug em produção~~ | ✅ #3 |

---

## Histórico de correções ✅

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
| BUG-005/006/007/010/013 | 7 componentes abandonados deletados | #4 | — |
| BUG-014 | AgendaCoordenador — design documentado | #5 | — |
| BUG-001 | `sendBeacon` sem autenticação — já corrigido antes | #6 | — |
| BUG-003/004 | 7 `confirm()` → `AlertDialog` em 6 componentes | #7 | `3e7b6fe2` |
| BUG-011 | count check no DELETE série→turmas em `GestaoEscola` | #8 | `c8821464` |
| BUG-009 | Coluna `metodo_pagamento` em `financeiro_mensalidades` | #9 | `01a5fbb3` |
| BUG-012 | `FloatingHelpButton` — componente abandonado deletado | — | `45f2fcad` |
| — | `AdminUsuariosSimple` — componente abandonado deletado | — | `e6a71161` |

---

## Features — por prioridade de dependência estrutural

---

### ✅ T1 — Testes unitários · `b5ecf270`

> **Posição:** Primeiro de tudo — rede de segurança antes de qualquer mudança estrutural.

- [x] ~~Vitest + @vitest/coverage-v8 (devDependencies — zero impacto em prod)~~
- [x] ~~`vitest.config.ts` separado do `vite.config.ts`~~
- [x] ~~`dateUtils.ts`, `authUtils.ts`, `serieUtils.ts` — utils puras testáveis~~
- [x] ~~4 suítes de teste — `calculoNotas`, `dateUtils`, `authUtils`, `serieUtils`~~
- **65/65 testes passando · `npm run test:run`**

---

### ✅ Fase 1 — Correções críticas

- [x] ~~BUG-008 Nome da escola~~ ✅ · ~~BUG-002 UTC-3~~ ✅ · ~~BUG-015 console.log~~ ✅
- [x] ~~BUG-005/006/007/010/013 Componentes abandonados~~ ✅
- [x] ~~BUG-003/004 window.confirm → AlertDialog~~ ✅
- [x] ~~BUG-001/011/009 sendBeacon, count check, metodo_pagamento~~ ✅

> **7/7 concluídos ✅**

---

### ✅ Fase 2 — Melhorias pedagógicas

- [x] ~~Notificação quando coordenador revisa agenda do professor~~ ✅
- [x] ~~Seção "Hoje" no dashboard do professor (aulas, freq, agenda)~~ ✅
- [x] ~~Mini card de frequência % no dashboard do aluno~~ ✅
- [x] ~~Badge de entregas pendentes de correção~~ ✅

> **5/5 concluídos ✅**

---

### 🔴 #1 — F2.1 · IA — Histórico Escolar · Jun/2026 · ~2 semanas

> **Por que é o #1?** É a peça de infraestrutura que habilita TODA a IA do sistema.
> Sem a Edge Function proxy + integração Claude API, o F5 (Agentes) não tem onde rodar.
> Além disso, entrega valor imediato — histórico escolar em segundos vs. 60 dias na secretaria.
> **Custo estimado: < R$ 0,10 por histórico.**

**Tarefas:**
- [ ] Edge Function Supabase `claude-proxy` — proxy seguro para Claude API (chave nunca no front)
- [ ] Integrar em `EmissaoDocumentos.tsx` — botão "Gerar com IA"
- [ ] Prompt estruturado com notas, frequência e dados completos do aluno
- [ ] Texto gerado editável antes de imprimir / exportar PDF
- [ ] Adicionar testes unitários do prompt builder em `src/__tests__/`
- [ ] Log de emissões por escola (auditoria de uso da IA)

**Entrega:** secretaria gera histórico em segundos, com revisão humana antes de imprimir.

---

### 🔴 #2 — F5 · Agentes de IA — 6/7 perfis · Jun-Jul/2026 · ~3-4 semanas

> **Por que é o #2?** Reutiliza diretamente a Edge Function criada em F2.1.
> Nenhuma nova infraestrutura necessária — só o componente de chat e os prompts por perfil.
> O 7º agente (responsável) fica para após o Portal do Responsável (F3) existir.
> **Nenhuma dependência de multi-tenant — funciona perfeitamente em single-tenant.**

**Tarefas:**
- [ ] Componente `ChatIA.tsx` — botão flutuante reutilizável (posição fixa, estilo consistente)
- [ ] Hook `useChatIA(perfil)` — gerencia histórico da conversa + calls à Edge Function
- [ ] **Agente 1 · Secretaria** — matrícula, documentos, alunos pendentes, fichas
- [ ] **Agente 2 · Gestor** — indicadores gerais, inadimplência, desempenho por série
- [ ] **Agente 3 · Coordenador** — agenda pendente, frequência da semana, atividades a corrigir
- [ ] **Agente 4 · Professor** — boletins do dia, lançamento de frequência, agenda de hoje
- [ ] **Agente 5 · Financeiro** — mensalidades em aberto, fluxo de caixa, relatórios
- [ ] **Agente 6 · Aluno** — notas, frequência, atividades pendentes, próximas provas
- [ ] Adicionar `ChatIA` nos dashboards dos 6 perfis acima

**Entrega:** 6 perfis com IA contextual no ar. O 7º (responsável) entra no #4.

---

### 🟢 #3 — F3 · Portal do Responsável · Jul/2026 · ~2-3 semanas

> **Por que é o #3?** Duas dependências simultâneas:
> (a) fecha o F5 ao adicionar o 7º agente de IA;
> (b) é pré-requisito do F4 (o self-service de boletos precisa do portal para existir).
> **Valor de mercado estimado: + R$ 300/mês por escola.**

**Tarefas:**
- [ ] Novo tipo de usuário `responsavel` com RLS isolado (vê apenas filhos vinculados)
- [ ] `DashboardResponsavel.tsx` — frequência, notas, comunicados, horário do filho
- [ ] Vinculação `responsavel_id → aluno_id` na ficha de matrícula
- [ ] Chat com coordenação (integrado ao sistema de notificações existente)
- [ ] Confirmação de leitura de comunicados

---

### 🟢 #4 — F5 completo · 7º Agente (Responsável) · Jul-Ago/2026 · ~1 semana

> **Por que é o #4?** Depende do F3 existir. Com o Portal do Responsável no ar,
> adicionar o 7º agente é questão de escrever o prompt especializado e plugar o `ChatIA`.

**Tarefas:**
- [ ] **Agente 7 · Responsável** — situação do filho (notas, frequência, pendências financeiras, próximas provas)
- [ ] Adicionar `ChatIA` no `DashboardResponsavel.tsx`

---

### 🔴 #5 — F1.1 · Multi-tenant · Ago-Set/2026 · ~3-4 semanas

> **Por que é o #5 e não o #1?** A IA funciona perfeitamente em single-tenant.
> Colocar F1.1 antes de F5 seria bloquear o objetivo principal sem nenhum ganho prático.
> **Por que está no #5 e não no final?** F4 (Asaas) feito sem multi-tenant = retrabalho
> garantido em todas as tabelas financeiras. E a 2ª escola (Ariane Maria) precisa estar
> pronta para ser onboardada por volta de nov/2026.

**Tarefas:**
- [ ] Tabela `escolas` (`id`, `nome`, `cnpj`, `segmentos_ativos`, `dominio`)
- [ ] Campo `escola_id` em todas as tabelas de dados (users, notas, frequência, agenda, financeiro…)
- [ ] RLS policies baseadas em `escola_id` do JWT — isolamento total entre escolas
- [ ] Hook `useEscola()` — detecta escola pelo domínio ou `escola_id` no perfil
- [ ] Migration dos dados existentes para o registro da escola atual
- [ ] `school.ts` dinâmico (busca configurações do banco por `escola_id`)
- [ ] Atualizar queries dos agentes de IA (F5) para filtrar por `escola_id`

**Dependência reversa:** F4 e F6 devem ser feitos APÓS F1.1 para evitar retrabalho.

---

### 🟢 #6 — F1.3 · Virada de ano letivo · Set-Out/2026 · ~1-2 semanas

> **Por que é o #6?** Não depende de nada estrutural, mas tem **deadline sazonal: dezembro/2026**.
> Recomendado testar com 2 meses de antecedência — nunca estrear migração em produção sem testes.
> Feito após F1.1 = tabelas de arquivo já nascem com `escola_id` (mais limpo).

**Tarefas:**
- [ ] Fluxo de promoção de série com revisão e aprovação do gestor
- [ ] Arquivar frequência e agenda do ano anterior (`*_arquivo_2026`)
- [ ] Preservar notas, contratos e documentos históricos intactos
- [ ] Resetar status dos alunos para o novo ano letivo
- [ ] Tela de confirmação com lista de alunos afetados antes de executar

**Deadline:** testar em outubro, executar em dezembro/2026.

---

### 🟡 #7 — F4 · Financeiro Avançado + Boletos (Asaas) · Out-Nov/2026 · ~2-3 semanas

> **Por que é o #7?** Duas dependências reais:
> (a) F3 — o self-service do responsável precisa do portal;
> (b) F1.1 — construir integração Asaas em single-tenant e depois migrar para multi-tenant
> é retrabalho garantido em webhook handlers, tabelas e RLS.
> **Valor de mercado estimado: + R$ 200/mês por escola.**

**Tarefas:**
- [ ] Integração gateway **Asaas** (boleto + PIX, webhook nativo)
- [ ] Webhook handler para baixa automática de mensalidades
- [ ] Responsável gera o próprio boleto (self-service no portal F3)
- [ ] Dashboard financeiro com inadimplência em tempo real
- [ ] Notificação automática de vencimento (7 dias antes)

---

### 🟡 #8 — F6 · Mobile PWA → React Native · Nov-Dez/2026 · ~1-2 semanas

> **Por que é o #8?** Produto web deve estar consolidado e estável antes de virar PWA.
> PWA instalável sem publicar nas lojas — entrega rápida, sem reescrita.
> React Native (Expo) apenas quando critério objetivo for atingido.

**Tarefas:**
- [ ] `manifest.json` + ícones 192/512px + `theme-color`
- [ ] Service Worker com cache offline (páginas estáticas + assets)
- [ ] `vite-plugin-pwa` integrado ao build existente (zero impacto no dev)
- [ ] Push Notifications via Web Push API
- [ ] **Critério para React Native:** < 2 bugs críticos/mês por 60 dias consecutivos
- [ ] React Native (Expo) — reutiliza toda a lógica de negócio e hooks

---

### ⏸ F1.2 · Liberar acesso portal · Dez/2026

> **Contexto:** Todos os alunos já estão cadastrados via admin geral.
> O fluxo de secretaria liberar acesso individual só será necessário
> no próximo período de matrículas (~dezembro 2026).

**Tarefas (quando retomar):**
- [ ] Botão "Liberar Acesso" na tela de matrícula
- [ ] Criar user no Supabase Auth + enviar e-mail de boas-vindas
- [ ] Vincular user à `fichas_matricula` + `tem_acesso_portal = true`

**Reavaliar em:** Dez/2026 (início das matrículas do ano letivo seguinte).

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
