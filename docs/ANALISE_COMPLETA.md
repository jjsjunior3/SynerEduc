# ANÁLISE COMPLETA — SynerEduc AVA
> Atualizado em: 2026-06-19 | Versão do app: 0.2.0 | Arquivos lidos: 110+
> Revisão anterior: 2026-05-26 (v1.5.3)

---

## 1. MAPA DO PROJETO

### src/App.tsx
Raiz da aplicação. Gerencia `currentView` (`"website" | "login" | "ava" | "politica"`), persiste usuário no localStorage, roteia para o dashboard correto via switch no `usuario.tipo`. Inclui `AVAComPresence` como wrapper que ativa o heartbeat de presença. Erros de renderização capturados por try/catch e exibidos via `DashboardFallback`. Link para `PoliticaPrivacidade` acessível a partir do login.

---

### src/components/

| Arquivo | Descrição |
|---------|-----------|
| `AgendaAluno.tsx` | Visualização de agenda pelo aluno |
| `AgendaCoordenador.tsx` | Acompanhamento, rastreio diário e configuração de grade horária (coordenador) |
| `AgendaProfessor.tsx` | Lançamento de agenda diária pelo professor |
| `AgendaProfessores.tsx` | Visualização de todas as agendas dos professores (coordenador/admin) |
| `AgendamentoAulasVivo.tsx` | Agendamento e gerenciamento de aulas ao vivo |
| `ArquivoHistorico.tsx` | Upload e digitalização de fichas e boletins do aluno com IA (botões violet + feedback visual de arquivos salvos) |
| `ArquivoMorto.tsx` | Histórico retroativo unificado: busca aluno, consolida dados de múltiplos anos, pré-visualização de ficha gerada |
| `AtividadesAluno.tsx` | Listagem e envio de atividades pelo aluno (validação de tipo e tamanho no onChange) |
| `AtividadesCoordenador.tsx` | Visualização de atividades pelo coordenador |
| `AtividadesProfessor.tsx` | Criação e gerenciamento de atividades pelo professor |
| `AtividadesRecebidas.tsx` | Correção de atividades recebidas (professor) |
| `AulasAoVivo.tsx` | Exibição de aulas ao vivo para o aluno |
| `AulasAoVivoProfessor.tsx` | Gerenciamento de aulas ao vivo pelo professor |
| `Boletim.tsx` | Boletim de notas do aluno com cálculo multi-bimestre |
| `BoletimCoordenador.tsx` | Impressão de boletim de qualquer aluno pelo coordenador |
| `BoletimProfessor.tsx` | Lançamento de notas pelo professor |
| `BoletinsGerais.tsx` | Visão geral de todos os boletins (coordenador) — query separada para disciplinas (sem join que falhava silenciosamente); RLS corrigido para coordenador presencial |
| `BoletinsGerais.tsx` | Modo "todos": agrega notas dos 4 bimestres; botão Editar sempre visível |
| `CadastrarUsuarioNovo.tsx` | Formulário de cadastro de novo usuário com geração de senha provisória |
| `ComentariosPedagogicos.tsx` | Comentários pedagógicos por aluno (maxLength=2000) |
| `ComunicadosPage.tsx` | Listagem de comunicados recebidos |
| `ConquistasEstudante.tsx` | Sistema de conquistas/gamificação do aluno |
| `ControleDespesas.tsx` | CRUD de despesas financeiras da escola |
| `ControlePagamentos.tsx` | Registro manual de pagamentos recebidos (caixa) |
| `DashboardAdminPresencial.tsx` | Dashboard do administrador do segmento presencial |
| `DashboardAdministrador.tsx` | Dashboard do administrador geral com métricas, presença online, monitoramento de IA |
| `DashboardAluno.tsx` | Dashboard principal do aluno |
| `DashboardConteudista.tsx` | Dashboard do professor conteudista |
| `DashboardCoordenador.tsx` | Dashboard do coordenador com lazy loading |
| `DashboardFallback.tsx` | Tela de fallback para erros ou tipo de usuário inválido |
| `DashboardFinanceiro.tsx` | Dashboard do setor financeiro com agente Gabriela |
| `DashboardGestorGeral.tsx` | Dashboard do gestor geral com agente Gabriela (bottom-left) |
| `DashboardProfessor.tsx` | Dashboard principal do professor |
| `DashboardSecretaria.tsx` | Dashboard do setor de secretaria com agente Gabriela |
| `DisciplinaPage.tsx` | Página de uma disciplina específica (aluno) |
| `DisciplinaProfessor.tsx` | Gerenciamento de disciplina pelo professor |
| `DocumentosRecebidos.tsx` | Upload e gestão de documentos de matrícula |
| `EmissaoContratos.tsx` | Emissão e impressão de contratos de matrícula |
| `EmissaoDocumentos.tsx` | Emissão de declarações, histórico, certificados, etc. |
| `EnviarComunicado.tsx` | Envio de comunicados (coordenador) com agendamento |
| `EstatisticasConteudista.tsx` | Cards de estatísticas do conteudista |
| `EstatisticasEstudo.tsx` | Estatísticas de estudo do aluno |
| `FormularioMatricula.tsx` | Ficha de matrícula com checkbox LGPD obrigatório (`consentimento_lgpd` + `consentimento_em`) |
| `Forum.tsx` | Fórum geral de disciplinas |
| `ForumCoordenador.tsx` | Fórum visualizado pelo coordenador |
| `ForumProfessor.tsx` | Criação e moderação de tópicos de fórum pelo professor |
| `FrequenciaAluno.tsx` | Visualização e impressão de frequência dos alunos (coordenador) |
| `FrequenciaProfessor.tsx` | Lançamento de frequência pelo professor |
| `FrequenciaProfessores.tsx` | Visão da frequência dos professores |
| `GerenciadorUsuariosFixed.tsx` | Gerenciamento completo de usuários (admin) |
| `GestaoConteudoPDF.tsx` | CRUD de conteúdos PDF (coordenador/admin) |
| `GestaoEscola.tsx` | Cadastro e gestão de disciplinas, séries e turmas |
| `GestaoHorarios.tsx` | Grade horária das turmas |
| `GestaoVinculos.tsx` | Vínculo professor ↔ disciplina ↔ série |
| `HistoricoIA.tsx` | Digitalização de histórico escolar com IA (Claude) |
| `HorarioEscolar.tsx` | Visualização do horário escolar pelo aluno |
| `ImportacaoFichas.tsx` | Importação de fichas de matrícula via IA (PDF/imagem → JSON) |
| `LoginCompleto.tsx` | Tela de login com Supabase Auth + link para Política de Privacidade |
| `MaterialEstudoModerno.tsx` | Visualização de material de estudo com PDF e gamificação |
| `MonitoramentoIA.tsx` | Painel de monitoramento de uso dos agentes de IA (administrador) |
| `NotificacaoBalloon.tsx` | Balão de notificação flutuante com animação ao primeiro acesso |
| `Notificacoes.tsx` | Painel de notificações (overlay lateral) |
| `PDFViewerModerno.tsx` | Visualizador de PDF com timer de estudo e conquistas |
| `PDFViewerProfessor.tsx` | Visualizador de PDF por bimestre (professor/conteudista) |
| `PerfilUsuario.tsx` | Edição de perfil do usuário (Dialog) |
| `PlanoDeAula.tsx` | Geração de plano de aula com IA (professor) |
| `PlanosAulaCoordenador.tsx` | Visualização de planos de aula pelo coordenador |
| `PoliticaPrivacidade.tsx` | Página de Política de Privacidade (LGPD — 8 seções, acessível pelo login) |
| `RelatorioConteudo.tsx` | Relatório de conteúdo (dados mockados — pendente implementação real) |
| `RelatorioFinanceiro.tsx` | Relatório financeiro mensal |
| `RelatorioTurma.tsx` | Relatório de turma com exportação jsPDF |
| `SchoolHeader.tsx` | Header reutilizável com logo, nome da escola e toggle de tema |
| `SiteInstitucional.tsx` | Landing page pública institucional |
| `TrocarSenha.tsx` | Troca de senha no primeiro acesso |
| `UploadConteudoPDF.tsx` | Upload de PDFs pelo professor/conteudista |

---

### src/components/ai/

| Arquivo | Descrição |
|---------|-----------|
| `AgenteInclusao.tsx` | Agente Tia Maria José — gera atividades inclusivas e roteiros pedagógicos (4 etapas, dois modos) |
| `AssistenteVoz.tsx` | Assistente por voz com transcrição e interpretação via Edge Function |
| `AvatarDonaMaria.tsx` | SVG do avatar da Tia Maria José |
| `AvatarSofia.tsx` | SVG do avatar da Sofia |
| `ChatFlutuante.tsx` | Chat flutuante da Sofia — persiste histórico via sessionStorage; saudação derivada do perfil real (sem race condition) |
| `ChatGabriela.tsx` | Chat da Gabriela — agente administrativa para secretaria, gestor e financeiro; posicionado bottom-left |

---

### src/hooks/

| Arquivo | Descrição |
|---------|-----------|
| `useSegmento.ts` | Retorna `segmento`, `isEAD`, `isPresencial`, `turno`, `nivel` do usuário logado via AuthContext |
| `usePresence.ts` | Heartbeat a cada 30s na tabela `sessoes_ativas`; expõe `contarOnline()` e `listarOnline()` |
| `useChatIA.ts` | Hook genérico de chat com IA — gerencia histórico de mensagens e chamada ao claude-proxy |

---

### src/contexts/

| Arquivo | Descrição |
|---------|-----------|
| `AuthContext.tsx` | Sessão Supabase Auth + perfil do usuário da tabela `users`. Expõe `session`, `usuario`, `loading`, `logout`, `atualizarPerfil` |
| `ThemeContext.tsx` | Tema light/dark via localStorage + classe no `<html>`. Expõe `theme` e `toggleTheme` |

---

### src/utils/

| Arquivo | Descrição | Testes |
|---------|-----------|--------|
| `calculoNotas.ts` | `calcularNota(dados, segmento)` — EAD: (AV1+AV2)/2, REC substitui menor; Presencial: (AV1+AV2+AV3)/3, REC substitui média | ✅ 25 testes |
| `authUtils.ts` | `perfilLabel`, `isAdmin`, `isProfessor`, `isGestorOuAdmin`, `canAccessFinanceiro`, `canAccessAlunos` | ✅ 22 testes |
| `serieUtils.ts` | `filterSeriesBySegmento`, `filterSeriesAtivas`, `sortSeriesByNome`, `getSeriesParaSegmento`, `serieNomeAbrev` | ✅ 12 testes |
| `dateUtils.ts` | Utilitários de formatação de data com correção UTC-3 | ✅ 6 testes |
| `versaoApp.ts` | Verifica versão no localStorage; se mudou, limpa cache preservando sessão Supabase |  — |

**Total: 65/65 testes passando** (`npm run test:run`)

---

### src/supabase/

| Arquivo | Descrição |
|---------|-----------|
| `supabaseClient.ts` | Único cliente Supabase: `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)` |

---

### src/config/

| Arquivo | Descrição |
|---------|-----------|
| `school.ts` | `SCHOOL_CONFIG`: name="Colégio Conexão Maranhense", shortName, logoUrl, primaryColor, description |

---

### src/types/

| Arquivo | Descrição |
|---------|-----------|
| `auth.ts` | Interface `Usuario` com todos os tipos de usuário |

---

### supabase/functions/ — Edge Functions

| Função | Auth JWT | Perfis autorizados | Descrição |
|--------|:--------:|---|---|
| `claude-proxy` | ✅ | todos autenticados | Proxy para Anthropic API com rate limiting por perfil, system prompt blindado, limite de payload |
| `chat-sofia` | ✅ | todos autenticados | Agente Sofia — contexto de agenda, notas e disciplinas injetado via Pinecone |
| `agente-gabriela` | ✅ | secretaria, gestor_geral, administrador, financeiro | Agente administrativa com tool use — contexto derivado do perfil JWT (não do cliente) |
| `extrair-ficha` | ✅ | secretaria, gestor_geral, administrador, admin_presencial | Extrai dados de ficha de matrícula via Claude Vision — valida MIME e tamanho |
| `gerar-plano-aula` | ✅ | professor, coordenador, admin | Gera plano de aula com RAG (Pinecone + Claude Sonnet) |
| `dona-maria` | ✅ | coordenador, admin | Agente inclusão — gera atividades e roteiros pedagógicos + DALL-E |
| `indexar-documento` | ✅ (service key) | conteudista, admin | Indexa PDFs no Pinecone para RAG |
| `interpretar-voz` | ✅ | professor, coordenador | Transcrição e interpretação de voz |

---

## 2. INVENTÁRIO DE COMPONENTES

| Componente | Perfil | Segmento | Tabelas Supabase | PDF |
|---|---|---|---|---|
| AgendaAluno | aluno | ambos | agenda_professor | — |
| AgendaCoordenador | coordenador | ambos | grade_horaria, agenda_professor, series, users, disciplinas | — |
| AgendaProfessor | professor | ambos | agenda_professor | — |
| AgendaProfessores | coordenador/admin | ambos | agenda_professor | — |
| AgendamentoAulasVivo | professor | ambos | aulas_ao_vivo | — |
| ArquivoHistorico | secretaria/admin | ambos | fichas_matricula, notas, users + Storage | — |
| ArquivoMorto | secretaria/admin | ambos | fichas_matricula, notas, users | — |
| AtividadesAluno | aluno | ambos | atividades + Storage | — |
| AtividadesProfessor | professor | ambos | atividades + Storage | — |
| AtividadesRecebidas | professor | ambos | atividades | — |
| Boletim | aluno | ambos | notas, disciplinas | window.print |
| BoletimCoordenador | coordenador | ambos | notas, users, series | window.print |
| BoletimProfessor | professor | ambos | notas, disciplinas, series, users | — |
| BoletinsGerais | coordenador | ambos | users, notas, disciplinas (queries separadas) | — |
| CadastrarUsuarioNovo | administrador | ambos | users + supabase.auth | — |
| ComentariosPedagogicos | professor/coordenador | ambos | comentarios_pedagogicos, users | — |
| ComunicadosPage | todos | ambos | comunicados | — |
| ControleDespesas | financeiro/admin | ambos | financeiro_despesas | — |
| ControlePagamentos | financeiro/admin | ambos | financeiro_mensalidades, users | — |
| DashboardAdminPresencial | admin_presencial | presencial | users, notas, frequencia_diaria, sessoes_ativas | — |
| DashboardAdministrador | administrador | ambos | users, disciplinas, turmas, sessoes_ativas | — |
| DashboardAluno | aluno | ambos | comunicados, users, turmas, series, disciplinas | — |
| DashboardConteudista | professor_conteudista | ead | pdfs_conteudista, disciplinas, series | — |
| DashboardCoordenador | coordenador | ambos | — (delega para sub-views) | — |
| DashboardFinanceiro | financeiro | ambos | financeiro_mensalidades, financeiro_despesas | — |
| DashboardGestorGeral | gestor_geral | ambos | users, notas, sessoes_ativas | — |
| DashboardProfessor | professor | ambos | users, disciplinas, series, notas | — |
| DashboardSecretaria | secretaria | ambos | fichas_matricula, documentos_matricula, contratos | — |
| DocumentosRecebidos | secretaria/admin | ambos | fichas_matricula, documentos_matricula + Storage | — |
| EmissaoContratos | secretaria | ambos | contratos, financeiro_mensalidades, fichas_matricula | window.open+print |
| EmissaoDocumentos | secretaria/admin | ambos | fichas_matricula, financeiro_mensalidades, notas | window.open+print |
| EnviarComunicado | coordenador | ambos | comunicados, users | — |
| FormularioMatricula | secretaria/admin | ambos | fichas_matricula + Storage | — |
| ForumProfessor | professor | ambos | forum_topicos, forum_mensagens | — |
| FrequenciaAluno | coordenador | ambos | frequencia_diaria, users, series, turmas | window.open+print |
| FrequenciaProfessor | professor | ambos | frequencia_diaria, agenda_professor | — |
| GerenciadorUsuariosFixed | administrador | ambos | users | — |
| GestaoConteudoPDF | coordenador/admin | ambos | pdfs_conteudista, disciplinas, series + Storage | — |
| GestaoEscola | administrador | ambos | disciplinas, series, turmas | — |
| GestaoHorarios | coordenador | ambos | grade_horaria, series, disciplinas, users | — |
| GestaoVinculos | administrador | ambos | professores_disciplinas_series, users, disciplinas, series | — |
| HistoricoIA | secretaria/admin | ambos | users, notas + claude-proxy | — |
| ImportacaoFichas | secretaria/admin | ambos | users, fichas_matricula + extrair-ficha | — |
| LoginCompleto | — | — | users + supabase.auth | — |
| MonitoramentoIA | administrador | ambos | agente_ia_log, agente_uso_diario | — |
| PerfilUsuario | todos | ambos | users + Storage avatars | — |
| PlanoDeAula | professor | ambos | — + gerar-plano-aula | — |
| PoliticaPrivacidade | público | — | — | — |
| RelatorioFinanceiro | financeiro/admin | ambos | financeiro_mensalidades, financeiro_despesas | window.open+print |
| RelatorioTurma | coordenador | ambos | notas, users, series, disciplinas, frequencia_diaria | jsPDF |
| TrocarSenha | todos | ambos | users + supabase.auth | — |
| UploadConteudoPDF | professor_conteudista/admin | ead | disciplinas, pdfs_conteudista + Storage | — |

---

## 3. STATUS DOS BUGS (ANALISE_COMPLETA anterior)

| ID | Descrição | Status |
|---|---|---|
| BUG-001 | `sendBeacon` sem autenticação em `usePresence` | ✅ Corrigido |
| BUG-002 | Datas com 1 dia a menos (bug UTC-3) em 3 componentes | ✅ Corrigido — `dateUtils.ts` |
| BUG-003 | `window.confirm` em `EnviarComunicado` | ✅ Corrigido → `AlertDialog` |
| BUG-004 | `window.confirm` em `AgendaProfessor/Professores` | ✅ Corrigido → `AlertDialog` |
| BUG-005 | `RelatorioConteudo` com dados mockados | 🟡 Pendente |
| BUG-006 | `EstatisticasConteudista` dark mode quebrado | ✅ Corrigido |
| BUG-007 | `ConquistasEstudante`/`EstatisticasEstudo` com prop `darkMode` | ✅ Corrigido → ThemeContext |
| BUG-008 | Nome da escola inconsistente (8 componentes) | ✅ Corrigido → "Colégio Conexão Maranhense" |
| BUG-009 | Tipo de pagamento embutido em `observacao` | 🟡 Pendente — coluna `metodo_pagamento` adicionada |
| BUG-010 | Séries hardcoded em `UploadConteudoPDF` | 🟡 Pendente |
| BUG-011 | DELETE sem count em cascata em `GestaoEscola` | ✅ Corrigido — count check adicionado |
| BUG-012 | `FloatingHelpButton` importa componente não listado | ✅ Removido |
| BUG-013 | `AdvancedUploadComponent` não é componente React | ✅ Removido |
| BUG-014 | `AgendaCoordenador` duplica `GestaoHorarios` | 🟢 Documentado — design intencional |
| BUG-015 | `console.log` com dados do usuário em produção | ✅ Corrigido |
| BUG-B001 | `fn_atualizar_media` — fórmula errada para Presencial | ✅ Corrigido — SQL direto |
| BUG-B002 | `total_alunos_ativos()` referencia tabela inexistente | ✅ Corrigido — SQL direto |
| BUG-B003 | `buscar_agenda_por_data` — 3 versões no banco | ✅ Corrigido — SQL direto |
| BUG-B004 | `eh_admin()` não inclui `gestor_geral` | ✅ Corrigido — SQL direto |
| SEC-001 | `grade_horaria` RLS USING(true) — qualquer usuário escrevia | ✅ Corrigido — SQL direto |
| IDX-001 | 9 indexes críticos ausentes | ✅ Corrigido — SQL direto |

---

## 4. AUDITORIA DE SEGURANÇA (2026-06-19)

> Revisão completa realizada. Ver seção correspondente no ROADMAP para detalhes de cada vetor.

### Vetores corrigidos

| Vulnerabilidade | Componente | Correção |
|---|---|---|
| Auth ausente | `agente-gabriela` | JWT + contexto derivado do perfil JWT (não do body) |
| Auth ausente | `extrair-ficha` | JWT + allowlist de perfis autorizados |
| API Injection | `agente-gabriela` | `sanitizeMes()` + `sanitizeStatus()` com allowlist |
| Prompt Injection | `agente-gabriela`, `claude-proxy` | Bloco `<segurança>` no system prompt |
| Sem limite de chars | todos os inputs/textareas | Padrão global via `ui/input.tsx` e `ui/textarea.tsx` |
| Sem limite server-side | `claude-proxy`, `agente-gabriela` | HTTP 413 para payloads excessivos |
| MIME não validado | `extrair-ficha`, `AtividadesAluno` | Allowlist de tipos + limite de tamanho |
| Dependências críticas | `jspdf`, `vite`, `ws`, `lodash`... | `npm audit fix --force` → 0 vulnerabilidades |
| Headers HTTP ausentes | `vite.config.ts` | `X-Frame-Options`, `X-Content-Type-Options`, CSP, `Referrer-Policy` |

### Vetores verificados — sem vulnerabilidade

SQL Injection, XSS, CSRF, BOLA/IDOR, Path Traversal, SSRF, Desserialização, Mass Assignment, XXE, BFLA, Session Fixation, Criptografia fraca, Enumeração de usuários, CPF/RG em queries indevidas.

### Pendências de infraestrutura (Supabase Dashboard)

| Item | Ação |
|---|---|
| Buckets de Storage | Verificar se `entregas_atividades`, `atividades`, `comunicados`, `pdfs_conteudista` estão como "Private" |
| Rate limiting no login | Auth → Rate Limits → máximo 5 tentativas/minuto |
| CSP em produção | Configurar headers no servidor de hospedagem (Vercel/Netlify/Nginx) |

---

## 5. CONFORMIDADE LGPD (2026-06-19)

| Item | Status |
|---|---|
| Consentimento na matrícula (`consentimento_lgpd` + `consentimento_em`) | ✅ |
| Página de Política de Privacidade (8 seções, Art. 9) | ✅ |
| Controle de acesso por perfil (CPF/RG só para secretaria/gestão) | ✅ |
| Soft-delete (`deletado_em`) | ✅ |
| Contrato DPA Controlador × Operador (escola × SynerEduc) | 🟡 Pendente — jurídico |
| E-mail DPO ativo (`privacidade@colegioconexao.com.br`) | 🟡 Pendente |
| Procedimento de resposta a incidentes | 🟢 Pendente (Set/2026) |

---

## 6. PADRÕES IDENTIFICADOS

### a) Estrutura dos Dashboards

```
Dashboard{Tipo}.tsx
├── Header (sticky, bg-card, border-b, z-50)
│   ├── SchoolHeader subtitle="Painel do X"
│   ├── Avatar button com ref (para posicionar dropdown)
│   └── Dropdown via createPortal (fora do stacking context)
├── viewAtual: ViewType state
├── menuItems[] (cards clicáveis na view dashboard)
├── renderConteudo() switch(viewAtual)
│   └── Cada view lazy-loaded com Suspense
└── Modais: PerfilUsuario (Dialog), Notificacoes (overlay)
```

Dashboards com agente Gabriela: `DashboardGestorGeral`, `DashboardSecretaria`, `DashboardFinanceiro`
→ `<ChatGabriela contexto="gestor|secretaria|financeiro" />` posicionado `fixed bottom-5 left-5`

### b) Queries no Supabase

**Padrão padrão:**
```typescript
const { data, error } = await supabase
  .from('tabela')
  .select('campo1, campo2')   // nunca select('*') em tabelas com CPF/RG
  .eq('segmento', segmento)
  .order('created_at', { ascending: false });
```

**Joins:** preferir queries separadas sobre joins com FK nomeada — joins podem falhar silenciosamente quando FK não existe ou está com nome diferente do esperado pelo PostgREST.

**Segmento obrigatório:** toda query que acessa `users`, `notas`, `fichas_matricula`, `disciplinas`, `series` deve filtrar por `segmento`.

### c) Validação de Upload de Arquivos

**Padrão correto (duas camadas):**
```typescript
// Camada 1 — cliente (onChange do input)
const TIPOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
if (!TIPOS.includes(file.type)) { toast.error('...'); return }
if (file.size > 10 * 1024 * 1024) { toast.error('...'); return }

// Camada 2 — servidor (Edge Function extrair-ficha)
if (!TIPOS_PERMITIDOS.includes(tipo_mime)) return 415
if (imagem.length > MAX_BASE64_CHARS) return 413
```

### d) Agentes de IA — Arquitetura

```
Frontend → supabase.functions.invoke('nome-da-funcao', { body, headers: JWT })
             ↓
Edge Function (Deno)
  1. Valida JWT via /auth/v1/user
  2. Deriva contexto/permissão do perfil JWT
  3. Busca contexto no banco (com SERVICE_KEY)
  4. Chama Anthropic API com system prompt blindado
  5. Loga em agente_ia_log (assíncrono)
             ↓
         Resposta ao cliente
```

**Regras de segurança dos agentes:**
- JWT sempre obrigatório
- Contexto nunca vem do body do cliente — deriva do `user_metadata.tipo` no JWT
- System prompt com bloco `<segurança>` em todos os agentes
- Limite de payload: prompt máximo 8.000 chars, body total 50.000 chars

### e) Limites de Caracteres

| Componente | Limite |
|---|---|
| `<Input>` (base) | 500 chars (padrão global) |
| `<Input type="password">` | 128 chars |
| `<Textarea>` (base) | 5.000 chars (padrão global) |
| Chat Sofia/Gabriela | 2.000 chars |
| Feedback de atividade | 3.000 chars |
| Observações (ArquivoMorto, AgenteInclusao) | 1.000 chars |
| Prompt no claude-proxy (server) | 8.000 chars |
| Payload total no claude-proxy (server) | 50.000 chars |
| Mensagem no agente-gabriela (server) | 4.000 chars |

### f) Geração de PDFs

| Método | Quando usar | Exemplos |
|---|---|---|
| `window.print()` | Boletins simples; `@media print` CSS | `Boletim.tsx`, `BoletimCoordenador.tsx` |
| `window.open + document.write + print` | Documentos HTML completos | `EmissaoContratos.tsx`, `EmissaoDocumentos.tsx` |
| `jsPDF + autoTable` | Relatórios multi-página com tabelas | `RelatorioTurma.tsx` |

---

## 7. BUGS ATIVOS (pendentes)

### 🟡 Médio

**BUG-005 — RelatorioConteudo: dados mockados**
- Componente exibe "247 conteúdos", "89 videoaulas" hardcoded. Pendente implementação com queries reais em `pdfs_conteudista`.

**BUG-010 — UploadConteudoPDF: séries hardcoded**
- Lista de séries hardcoded no componente. TODO já registrado no código. Precisa carregar de `series` no banco.

---

## 8. PRÓXIMOS PASSOS (alinhados com ROADMAP)

| Prioridade | Item | Dependência |
|---|---|---|
| **#1** | F5 — Agentes restantes (6/7) | `chat-sofia` e `claude-proxy` estáveis |
| **#2** | F1.1 — Multi-tenant (`escola_id` em todas as tabelas) | Janela das férias escolares (Jul/2026) |
| **#3** | F10 — Plano de Aula IA completo | Indexação do material do professor |
| **#4** | Contrato DPA LGPD | Jurídico da escola |
| **#5** | Buckets Storage como "Private" | Painel Supabase |
| **#6** | F3 — Portal do Responsável | Após F1.1 (multi-tenant) |
| **#7** | F4 — Financeiro + Asaas | Após F3 |
| **#8** | F1.3 — Virada de ano letivo | Outubro/2026 |
