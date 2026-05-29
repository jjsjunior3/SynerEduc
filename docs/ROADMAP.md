# ROADMAP — Portal Conexão AVA · SynerEduc
> Backlog priorizado · Atualizado em: 2026-05-29 · Última revisão: 2026-05-29  
> Status: 🔴 Crítico · 🟡 Importante · 🟢 Melhoria · ✅ Concluído · ⏸ Adiado · 🚫 Descartado

---

## Como usar este documento

Antes de abrir o Claude para implementar algo:
1. Abra (ou crie) uma issue no GitHub com o template adequado
2. Cole o link da issue no início da conversa com o Claude
3. Após o Claude implementar, marque como ✅ neste arquivo

---

## Visão geral — fases estratégicas (SynerEduc Roadmap)

| Fase | Nome | Prazo | Status |
|---|---|---|---|
| **T1** | Testes unitários | Sem. 1 | ✅ Concluído `b5ecf270` |
| **Fase 1** | Correções & melhorias pedagógicas | Maio 2026 | ✅ Concluído |
| **F1.1** | Multi-tenant (fundação multi-escola) | Mês 1-2 | 🔴 Próximo |
| **F1.2** | Liberar acesso portal (secretaria) | Mês 1 | ⏸ Adiado 7 meses |
| **F1.3** | Virada de ano letivo | Mês 2 | 🟢 Planejado |
| **F2.1** | IA — Histórico Escolar | Mês 2-3 | 🟢 Planejado |
| **F3** | Portal do Responsável | Mês 3-4 | 🟢 Planejado |
| **F4** | Financeiro Avançado + Boletos (Asaas) | Mês 4-5 | 🟡 Futuro |
| **F5** | Agentes de IA por Perfil | Mês 5-6 | 🟡 Futuro |
| **F6** | Mobile PWA → React Native | Mês 6+ | 🟡 Futuro |

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

---

### ✅ T1 — Testes unitários · `b5ecf270`

> **Por que começar aqui?** Antes de qualquer mudança estrutural (multi-tenant mexe em _todas_ as tabelas), precisamos de uma rede de segurança. Se um teste quebrar, você sabe exatamente onde o problema está.

- [x] ~~Vitest + @vitest/coverage-v8 instalados (devDependencies, zero impacto em prod)~~
- [x] ~~`vitest.config.ts` separado do `vite.config.ts`~~
- [x] ~~`src/utils/dateUtils.ts` — 8 funções de data sem DOM~~
- [x] ~~`src/utils/authUtils.ts` — 6 helpers de perfil/permissão~~
- [x] ~~`src/utils/serieUtils.ts` — 5 funções de filtragem/ordenação~~
- [x] ~~`src/__tests__/calculoNotas.test.ts` — 10 testes da lógica de notas~~
- [x] ~~`src/__tests__/dateUtils.test.ts` — 15 testes de datas~~
- [x] ~~`src/__tests__/authUtils.test.ts` — 20 testes de permissão~~
- [x] ~~`src/__tests__/serieUtils.test.ts` — 20 testes de séries~~

**Resultado: 65/65 testes passando · `npm run test:run`**

---

### ✅ Fase 1 — Correções (prioridade imediata)

Estas não adicionam funcionalidade, apenas corrigem o que estava quebrado:

- [x] ~~**BUG-008**~~ — ~~Corrigir nome da escola~~ ✅ #1
- [x] ~~**BUG-002**~~ — ~~Fix UTC-3 em datas~~ ✅ #2
- [x] ~~**BUG-015**~~ — ~~Remover `console.log` de debug~~ ✅ #3
- [x] ~~**BUG-005/006/007/010/013**~~ — ~~Remover componentes abandonados~~ ✅ #4
- [x] ~~**BUG-014**~~ — ~~Documentar design de AgendaCoordenador~~ ✅ #5
- [x] ~~**BUG-001**~~ — ~~sendBeacon sem autenticação~~ — já estava corrigido ✅ #6
- [x] ~~**BUG-003 + BUG-004**~~ — ~~Substituir todos os `window.confirm` por `AlertDialog`~~ ✅ #7

> **Progresso Fase 1:** 7/7 concluídos ✅

---

### ✅ Fase 2 — Melhorias pedagógicas

- [x] ~~**Notificação de agenda aprovada**~~ — INSERT em `notificacoes` no `salvarEdicao` de `AgendaProfessores.tsx` ✅
- [x] ~~**Resumo do dia no dashboard do professor**~~ — Seção "Hoje" em `DashboardProfessor.tsx` ✅
- [x] ~~**Dashboard do aluno — frequência**~~ — Mini card com % de presença no mês em `DashboardAluno.tsx` ✅
- [x] ~~**Atividades — contador de entregas pendentes**~~ — `totalPendentesCorrecao` em `DashboardProfessor.tsx` ✅
- [x] ~~**BUG-009**~~ — ~~Coluna `metodo_pagamento` em `financeiro_mensalidades`~~ ✅ #9

> **Progresso Fase 2:** 5/5 concluídos ✅

---

### 🔴 F1.1 — Multi-tenant · Mês 1-2 · PRÓXIMO

> **Por que é crítico?** Em ~6 meses o Colégio Ariane Maria precisa ser cadastrado. Sem multi-tenant, os dados das escolas se misturam — catástrofe em produção. A fundação certa precisa ser construída antes.

- [ ] Criar tabela `escolas` no Supabase (`id`, `nome`, `cnpj`, `segmentos_ativos`, `dominio`)
- [ ] Adicionar campo `escola_id` em todas as tabelas com dados de alunos/professores
- [ ] RLS isolado por `escola_id` (baseado no JWT do usuário)
- [ ] Hook `useEscola()` — detecta escola pelo domínio ou por `escola_id` no perfil
- [ ] Migrar dados existentes (EAD + Presencial) para o registro da escola atual
- [ ] `school.ts` dinâmico — buscar configuração do banco por `escola_id`
- [ ] Portal de onboarding para novas escolas

**Dependências:** T1 ✅ · Fase 1 ✅

---

### ⏸ F1.2 — Liberar acesso portal · Adiado ~7 meses

> **Contexto:** Todos os alunos já estão cadastrados via admin geral. O fluxo de secretaria liberar acesso individual só será necessário no próximo período de matrículas (~dezembro 2026).

- [ ] Botão "Liberar Acesso" na tela de matrícula
- [ ] Criar user no Supabase Auth + enviar e-mail de boas-vindas
- [ ] Vincular user à `fichas_matricula` + campo `tem_acesso_portal = true`

**Reavaliar em:** Dez/2026 (início das matrículas do ano letivo seguinte)

---

### 🟢 F1.3 — Virada de ano letivo · Mês 2

> **Por que no mês 2?** Precisa estar pronto antes do segundo semestre para que a virada de ano seja testada com antecedência — nunca estrear uma migração em produção sem testes.

- [ ] Fluxo de promoção de série com revisão e aprovação do gestor
- [ ] Arquivar frequência e agenda do ano anterior (tabelas `*_arquivo_YYYY`)
- [ ] Preservar notas, contratos e documentos históricos intactos
- [ ] Resetar `status` dos alunos para o novo ano letivo

**Dependências:** F1.1 (escola_id necessário para não misturar históricos)

---

### 🟢 F2.1 — IA — Histórico Escolar · Mês 2-3

> **Por que é diferencial?** Uma secretaria que leva 60 dias para emitir histórico escolar — e você entrega em segundos — é argumento de venda irresistível para novas escolas. Custo estimado: **< R$ 0,10 por histórico**.

- [ ] Integrar Claude API em `EmissaoDocumentos.tsx`
- [ ] Prompt estruturado com notas, frequência e dados completos do aluno
- [ ] Texto gerado editável antes de imprimir / exportar PDF
- [ ] Edge Function Supabase como proxy seguro para a Claude API (não expõe chave no front)
- [ ] Log de emissões por escola (auditoria)

---

### 🟢 F3 — Portal do Responsável · Mês 3-4

> **Valor de mercado estimado:** + R$ 300/mês por escola. Com 10 escolas = + R$ 3.000/mês recorrente adicional.

- [ ] `DashboardResponsavel.tsx` com perfil isolado por RLS (vê apenas filhos vinculados)
- [ ] Frequência, notas e boletim em tempo real
- [ ] Comunicados da coordenação (leitura + confirmação de leitura)
- [ ] Horário escolar do filho
- [ ] Chat com a coordenação (integrado às `notificacoes`)
- [ ] Vinculação responsável → aluno na ficha de matrícula

---

### 🟡 F4 — Financeiro Avançado + Boletos (Asaas) · Mês 4-5

> **Valor de mercado estimado:** + R$ 200/mês por escola. Elimina trabalho manual da secretaria financeira.

- [ ] Integração gateway **Asaas** (boleto + PIX, webhook nativo)
- [ ] Baixa automática de mensalidades via webhook do Asaas
- [ ] Responsável gera o próprio boleto (self-service no Portal do Responsável)
- [ ] Dashboard financeiro com inadimplência em tempo real
- [ ] Notificação automática de vencimento (7 dias antes)

**Dependências:** F3 (Portal do Responsável precisa existir para o self-service)

---

### 🟡 F5 — Agentes de IA por Perfil · Mês 5-6

> **Valor de mercado estimado:** + R$ 400/mês. Maior diferencial competitivo — nenhum sistema escolar no Brasil faz isso com contexto real do banco de dados.

- [ ] Componente `ChatIA.tsx` reutilizável (botão flutuante, posição fixa)
- [ ] Edge Function Supabase como proxy seguro da Claude API (com contexto do usuário)
- [ ] **7 agentes especializados:**
  - `secretaria` — matrícula, documentos, alunos pendentes
  - `gestor` — indicadores, inadimplência, desempenho geral
  - `coordenador` — agenda, frequência, atividades pendentes de correção
  - `professor` — boletins, lançamento de frequência, agenda do dia
  - `financeiro` — mensalidades, relatórios, fluxo de caixa
  - `aluno` — notas, frequência, atividades pendentes
  - `responsavel` — situação do filho, pendências financeiras

**Dependências:** F2.1 (padrão de proxy Claude API estabelecido)

---

### 🟡 F6 — Mobile PWA → React Native · Mês 6+

> **Estratégia:** PWA é instalável como app sem publicar nas lojas — entrega rápida. React Native (Expo) quando o produto web estiver estabilizado (< 2 bugs críticos/mês).

- [ ] `manifest.json` + ícones + `theme-color`
- [ ] Service Worker com cache offline (páginas estáticas)
- [ ] `vite-plugin-pwa` integrado ao build existente
- [ ] Push Notifications via Web Push API
- [ ] **Critério para React Native:** produto web com < 2 bugs críticos/mês por 60 dias consecutivos
- [ ] React Native (Expo) — compartilha lógica de negócio com o web

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
