# ANÁLISE COMPLETA — SynerEduc AVA
> Gerado em: 2026-05-26 | Versão do app: 1.5.3 | Arquivos lidos: 85+

---

## 1. MAPA DO PROJETO

### src/App.tsx
Raiz da aplicação. Gerencia `currentView` ("website" | "login" | "ava"), persiste usuário no localStorage, roteia para o dashboard correto via switch no tipo do usuário. Inclui `AVAComPresence` como wrapper que ativa o heartbeat de presença. Erro de renderização capturado por try/catch e exibido via `DashboardFallback`.

---

### src/components/

| Arquivo | Descrição |
|---------|-----------|
| `AdminUsuariosSimple.tsx` | Listagem e exclusão simplificada de usuários (admin) |
| `AdvancedUploadComponent.tsx` | Utilitário de upload para Supabase Storage com hook `useAdvancedUpload` |
| `AgendaAluno.tsx` | Visualização de agenda pelo aluno |
| `AgendaCoordenador.tsx` | Acompanhamento, rastreio diário e configuração de grade horária (coordenador) — NOVO |
| `AgendaProfessor.tsx` | Lançamento de agenda diária pelo professor |
| `AgendaProfessores.tsx` | Visualização de todas as agendas dos professores (coordenador/admin) |
| `AgendamentoAulasVivo.tsx` | Agendamento e gerenciamento de aulas ao vivo |
| `AtividadesAluno.tsx` | Listagem de atividades para o aluno |
| `AtividadesProfessor.tsx` | Criação e gerenciamento de atividades pelo professor |
| `AtividadesRecebidas.tsx` | Atividades recebidas pelo aluno (view alternativa) |
| `AulasAoVivo.tsx` | Exibição de aulas ao vivo para o aluno |
| `AulasAoVivoProfessor.tsx` | Gerenciamento de aulas ao vivo pelo professor |
| `Boletim.tsx` | Boletim de notas do aluno com cálculo multi-bimestre |
| `BoletimCoordenador.tsx` | Impressão de boletim de qualquer aluno pelo coordenador |
| `BoletimProfessor.tsx` | Lançamento de notas pelo professor |
| `BoletinsGerais.tsx` | Visão geral de todos os boletins (coordenador) |
| `CadastrarUsuarioNovo.tsx` | Formulário de cadastro de novo usuário com geração de senha provisória |
| `ComentariosPedagogicos.tsx` | Comentários pedagógicos por aluno |
| `ComunicadosPage.tsx` | Listagem de comunicados recebidos |
| `ConquistasEstudante.tsx` | Sistema de conquistas/gamificação do aluno (client-side only) |
| `ControleDespesas.tsx` | CRUD de despesas financeiras da escola |
| `ControlePagamentos.tsx` | Registro manual de pagamentos recebidos (caixa) |
| `DashboardAdminPresencial.tsx` | Dashboard do administrador do segmento presencial |
| `DashboardAdministrador.tsx` | Dashboard do administrador geral com métricas, presença online, gerenciamento |
| `DashboardAluno.tsx` | Dashboard principal do aluno |
| `DashboardConteudista.tsx` | Dashboard do professor conteudista |
| `DashboardCoordenador.tsx` | Dashboard do coordenador com lazy loading |
| `DashboardFallback.tsx` | Tela de fallback para erros ou tipo de usuário inválido |
| `DashboardFinanceiro.tsx` (Dashboardfinanceiro.tsx) | Dashboard do setor financeiro |
| `DashboardGestorGeral.tsx` | Dashboard do gestor geral |
| `DashboardProfessor.tsx` | Dashboard principal do professor |
| `DashboardSecretaria.tsx` (Dashboardsecretaria.tsx) | Dashboard do setor de secretaria |
| `DisciplinaPage.tsx` | Página de uma disciplina específica (aluno) |
| `DisciplinaProfessor.tsx` | Gerenciamento de disciplina pelo professor |
| `DocumentosRecebidos.tsx` | Upload e gestão de documentos de matrícula |
| `EmissaoContratos.tsx` | Emissão e impressão de contratos de matrícula |
| `EmissaoDocumentos.tsx` | Emissão de declarações, histórico, certificados, etc. |
| `EnviarComunicado.tsx` | Envio de comunicados (coordenador) com agendamento |
| `EstatisticasConteudista.tsx` | Cards de estatísticas do conteudista (props-only, sem Supabase) |
| `EstatisticasEstudo.tsx` | Estatísticas de estudo do aluno (props-only, sem Supabase) |
| `FloatingHelpButton.tsx` | Botão flutuante de ajuda (minimizável) |
| `FormularioMatricula.tsx` | Formulário de ficha de matrícula (nova e segunda via) |
| `Forum.tsx` | Fórum geral de disciplinas |
| `ForumCoordenador.tsx` | Fórum visualizado pelo coordenador |
| `ForumProfessor.tsx` | Criação e moderação de tópicos de fórum pelo professor |
| `FrequenciaAluno.tsx` | Visualização e impressão de frequência dos alunos (coordenador) |
| `FrequenciaProfessor.tsx` | Lançamento de frequência pelo professor |
| `FrequenciaProfessores.tsx` | Visão da frequência dos professores (presença de lançamento) |
| `GerenciadorUsuariosFixed.tsx` | Gerenciamento completo de usuários (admin) |
| `GestaoConteudoPDF.tsx` | CRUD de conteúdos PDF (coordenador/admin) |
| `GestaoEscola.tsx` | Cadastro e gestão de disciplinas, séries e turmas |
| `GestaoHorarios.tsx` | Grade horária das turmas |
| `GestaoVinculos.tsx` | Vínculo professor ↔ disciplina ↔ série |
| `HistoricoIA.tsx` | Digitalização de histórico escolar com IA (Claude) |
| `HorarioEscolar.tsx` | Visualização do horário escolar pelo aluno |
| `LoginCompleto.tsx` | Tela de login com Supabase Auth |
| `MaterialEstudoModerno.tsx` | Visualização de material de estudo com PDF e gamificação |
| `Notificacoes.tsx` | Painel de notificações (overlay lateral) |
| `PDFViewerModerno.tsx` | Visualizador de PDF com timer de estudo e conquistas |
| `PDFViewerProfessor.tsx` | Visualizador de PDF por bimestre (professor/conteudista) |
| `PerfilUsuario.tsx` | Edição de perfil do usuário (Dialog) |
| `RelatorioConteudo.tsx` | Relatório de conteúdo (dados mockados — sem Supabase) |
| `RelatorioFinanceiro.tsx` | Relatório financeiro mensal |
| `RelatorioTurma.tsx` | Relatório de turma com exportação jsPDF |
| `SchoolHeader.tsx` | Header reutilizável com logo, nome da escola e toggle de tema |
| `SiteInstitucional.tsx` | Landing page pública institucional |
| `TrocarSenha.tsx` | Troca de senha no primeiro acesso |
| `UploadConteudoPDF.tsx` | Upload de PDFs pelo professor/conteudista |

---

### src/hooks/

| Arquivo | Descrição |
|---------|-----------|
| `useSegmento.ts` | Retorna `segmento`, `isEAD`, `isPresencial`, `turno`, `nivel` do usuário logado via AuthContext |
| `usePresence.ts` | Heartbeat a cada 30s na tabela `sessoes_ativas`; expõe `contarOnline()` e `listarOnline()` para o admin |

---

### src/contexts/

| Arquivo | Descrição |
|---------|-----------|
| `AuthContext.tsx` | Sessão Supabase Auth + perfil do usuário da tabela `users`. Expõe `session`, `usuario`, `loading`, `logout`, `atualizarPerfil` |
| `ThemeContext.tsx` | Tema light/dark via localStorage + classe no `<html>`. Expõe `theme` e `toggleTheme` |

---

### src/utils/

| Arquivo | Descrição |
|---------|-----------|
| `versaoApp.ts` | Verifica versão no localStorage; se mudou, limpa cache preservando sessão Supabase e recarrega a página |
| `supabase/info.tsx` | Utilitário de informações do Supabase (caminho incomum para um util) |
| `calculoNotas.ts` | Função `calcularNota()` usada pelo Boletim |

---

### src/supabase/

| Arquivo | Descrição |
|---------|-----------|
| `supabaseClient.ts` | Único cliente Supabase: `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)` |
| `migrations/001_initial_schema.sql` | Schema inicial do banco |
| `migrations/002_kv_store.sql` | Tabela de key-value store |

---

### src/config/

| Arquivo | Descrição |
|---------|-----------|
| `school.ts` | `SCHOOL_CONFIG`: name, shortName, logoUrl, primaryColor, description |

---

### src/types/

| Arquivo | Descrição |
|---------|-----------|
| `auth.ts` | Interface `Usuario` com todos os tipos de usuário |

---

## 2. INVENTÁRIO DE COMPONENTES

| Componente | Perfil | Segmento | useSegmento | Tabelas Supabase | PDF | Dependências |
|---|---|---|---|---|---|---|
| AdminUsuariosSimple | administrador | ambos | não | users | — | toast, supabase |
| AgendaAluno | aluno | ambos | não | agenda_professor | — | — |
| AgendaCoordenador | coordenador | ambos | sim | grade_horaria, agenda_professor, series, users, disciplinas, professores_disciplinas_series | — | AgendaProfessores, toast |
| AgendaProfessor | professor | ambos | não | agenda_professor | — | toast |
| AgendaProfessores | coordenador/admin | ambos | não | agenda_professor (+ users join) | — | toast |
| AgendamentoAulasVivo | professor | ambos | não | aulas_ao_vivo | — | toast |
| AtividadesAluno | aluno | ambos | não | atividades | — | — |
| AtividadesProfessor | professor | ambos | não | atividades | — | toast |
| AtividadesRecebidas | aluno | ambos | não | atividades | — | — |
| AulasAoVivo | aluno | ambos | não | aulas_ao_vivo | — | — |
| AulasAoVivoProfessor | professor | ambos | não | aulas_ao_vivo | — | toast |
| Boletim | aluno | ambos | sim | notas (+ disciplinas join) | window.print | toast, calcularNota |
| BoletimCoordenador | coordenador | ambos | sim | notas, users, series | window.print | toast |
| BoletimProfessor | professor | ambos | sim | notas, disciplinas, series, users | — | toast |
| BoletinsGerais | coordenador | ambos | sim | users, notas (+ disciplinas join) | — | toast |
| CadastrarUsuarioNovo | administrador | ambos | não | users (+ supabase.auth) | — | toast |
| ComentariosPedagogicos | professor/coordenador | ambos | não | comentarios_pedagogicos, users | — | toast |
| ComunicadosPage | aluno/professor/todos | ambos | não | comunicados | — | — |
| ConquistasEstudante | aluno | ambos | não (props) | — | — | motion/react |
| ControleDespesas | financeiro/admin | ambos | não | financeiro_despesas | — | toast |
| ControlePagamentos | financeiro/admin | ambos | não | financeiro_mensalidades, users | — | toast |
| DashboardAdminPresencial | admin_presencial | presencial | não | users, notas, frequencia_diaria, sessoes_ativas | — | supabase, usePresence |
| DashboardAdministrador | administrador | ambos | não | users, disciplinas, turmas, sessoes_ativas | — | supabase, usePresence, RelatoriosAdmin, GestaoEscola, CadastrarUsuarioNovo, GerenciadorUsuariosFixed, GestaoConteudoPDF, FrequenciaProfessores, ComunicadosPage, Forum, GestaoVinculos |
| DashboardAluno | aluno | ambos | sim | comunicados, users, turmas, series, disciplinas | — | Boletim, AgendaAluno, HorarioEscolar, DisciplinaPage, ComunicadosPage |
| DashboardConteudista | professor_conteudista | ead | não | pdfs_conteudista, disciplinas, series | — | UploadConteudoPDF, GestaoConteudoPDF, RelatorioConteudo, EstatisticasConteudista |
| DashboardCoordenador | coordenador | ambos | não | — (delega para sub-views) | — | BoletinsGerais, RelatorioTurma, FrequenciaAluno, EnviarComunicado, AgendaCoordenador, GestaoHorarios, ForumCoordenador, BoletimCoordenador |
| DashboardFallback | qualquer | ambos | não | — | — | — |
| DashboardFinanceiro | financeiro | ambos | não | financeiro_mensalidades, financeiro_despesas | — | ControleDespesas, ControlePagamentos, RelatorioFinanceiro |
| DashboardGestorGeral | gestor_geral | ambos | não | users, notas, sessoes_ativas | — | supabase, usePresence |
| DashboardProfessor | professor | ambos | não | users, disciplinas, series, notas | — | BoletimProfessor, AgendaProfessor, AtividadesProfessor, FrequenciaProfessor, ForumProfessor, AulasAoVivoProfessor |
| DashboardSecretaria | secretaria | ambos | não | fichas_matricula, documentos_matricula, contratos | — | FormularioMatricula, DocumentosRecebidos, EmissaoContratos, EmissaoDocumentos, HistoricoIA |
| DisciplinaPage | aluno | ead | não | pdfs_conteudista | — | MaterialEstudoModerno |
| DisciplinaProfessor | professor | ead | não | disciplinas, pdfs_conteudista | — | — |
| DocumentosRecebidos | secretaria/admin | ambos | não (via usuario.segmento) | fichas_matricula, documentos_matricula (+ Storage) | — | toast |
| EmissaoContratos | secretaria | ambos | não | contratos, financeiro_mensalidades, fichas_matricula | window.open+print | toast |
| EmissaoDocumentos | secretaria/admin | ambos | não | fichas_matricula, financeiro_mensalidades, notas (+ joins) | window.open+print | — |
| EnviarComunicado | coordenador | ambos | sim | comunicados, users | — | toast |
| EstatisticasConteudista | professor_conteudista | ead | não (props) | — | — | — |
| EstatisticasEstudo | aluno | ead | não (props) | — | — | motion/react |
| FloatingHelpButton | administrador | ambos | não | — | — | AcessoRapidoCorrecoes (não listado) |
| FormularioMatricula | secretaria/admin | ambos | não | fichas_matricula (+ Storage) | — | toast |
| Forum | aluno/professor/admin | ambos | não | forum_topicos, forum_mensagens | — | toast |
| ForumCoordenador | coordenador | ambos | não | forum_topicos, forum_mensagens | — | toast |
| ForumProfessor | professor | ambos | não | forum_topicos, forum_mensagens | — | toast |
| FrequenciaAluno | coordenador | ambos | sim | frequencia_diaria, users, series, turmas | window.open+print | toast |
| FrequenciaProfessor | professor | ambos | não | frequencia_diaria, agenda_professor | — | toast |
| FrequenciaProfessores | coordenador/admin | ambos | não | frequencia_professor, users, series | — | toast |
| GerenciadorUsuariosFixed | administrador | ambos | não | users | — | toast |
| GestaoConteudoPDF | coordenador/admin | ambos | não | pdfs_conteudista, disciplinas, series (+ Storage) | — | toast |
| GestaoEscola | administrador | ambos | não | disciplinas, series, turmas | — | toast |
| GestaoHorarios | coordenador | ambos | não | grade_horaria, series, disciplinas, users | — | toast |
| GestaoVinculos | administrador | ambos | sim (segmentoForcado) | professores_disciplinas_series, users, disciplinas, series | — | toast |
| HistoricoIA | secretaria/admin | ambos | não | users, notas (+ AI) | — | toast |
| HorarioEscolar | aluno | ambos | não | grade_horaria | — | — |
| LoginCompleto | — | — | não | users (+ supabase.auth) | — | toast |
| MaterialEstudoModerno | aluno | ead | não | pdfs_conteudista | — | PDFViewerModerno, EstatisticasEstudo, ConquistasEstudante |
| Notificacoes | todos | ambos | não | notificacoes | — | — |
| PDFViewerModerno | aluno | ead | não | — | — | motion/react |
| PDFViewerProfessor | professor_conteudista | ead | não | — | — | — |
| PerfilUsuario | todos | ambos | não | users (+ Storage avatars) | — | AuthContext |
| RelatorioConteudo | professor_conteudista | ead | não | **NENHUMA — dados mockados** | — | recharts |
| RelatorioFinanceiro | financeiro/admin | ambos | não | financeiro_mensalidades, financeiro_despesas | window.open+print | — |
| RelatorioTurma | coordenador | ambos | sim | notas, users, series, disciplinas, frequencia_diaria | jsPDF | jspdf, jspdf-autotable |
| SchoolHeader | todos | ambos | não | — | — | ThemeContext, school.ts |
| SiteInstitucional | público | — | não | — | — | ThemeContext |
| TrocarSenha | todos | ambos | não | users (+ supabase.auth) | — | toast |
| UploadConteudoPDF | professor_conteudista/admin | ead | não | disciplinas, pdfs_conteudista (+ Storage) | — | toast |

---

## 3. ANÁLISE DE CONSISTÊNCIA

### a) SEGMENTO — Risco de Vazamento de Dados

**Tabelas com campo `segmento` que precisam de filtro:**

| Componente | Tabela | Filtra segmento? | Risco |
|---|---|---|---|
| `RelatorioConteudo` | Nenhuma (mock) | N/A | 🟢 sem risco (dados falsos) |
| `AdminUsuariosSimple` | `users` | ❌ Não | 🟡 Lista usuários de ambos os segmentos |
| `Forum` | `forum_topicos` | ❌ Não verificado | 🟡 Fórum pode ser cross-segment |
| `ForumProfessor` | `forum_topicos` | ❌ Não verificado | 🟡 Igual ao anterior |
| `FrequenciaProfessores` | `frequencia_professor` | ❌ Não verificado | 🟡 Pode exibir professores do outro segmento |
| `GestaoHorarios` | `grade_horaria` | ❓ Verificar | médio |
| `AgendaProfessores` | `agenda_professor` | ❓ Verificar | médio |
| `GestaoVinculos` | `professores_disciplinas_series` | ✅ via `segmentoForcado` | seguro |
| `EnviarComunicado` | `comunicados` | ✅ `useSegmento()` | seguro |
| `FrequenciaAluno` | `frequencia_diaria` | ✅ `useSegmento()` | seguro |
| `BoletinsGerais` | `notas`, `users` | ✅ `useSegmento()` | seguro |
| `RelatorioTurma` | `notas` | ✅ `useSegmento()` | seguro |
| `AgendaCoordenador` | `grade_horaria` | ✅ `.eq('segmento', segmento)` | seguro |
| `DocumentosRecebidos` | `fichas_matricula` | ✅ `.ilike('segmento')` | seguro |

---

### b) DATAS — Bug UTC-3

| Arquivo | Linha | Uso | Seguro? |
|---|---|---|---|
| `FrequenciaAluno.tsx` | 70-71 | `new Date(iso + 'T12:00:00')` | ✅ Correto |
| `AgendaCoordenador.tsx` | 374 | `new Date().toLocaleDateString(...)` | ✅ Seguro |
| `DashboardAluno.tsx` | 76-80 | `new Date(dataISO).toLocaleDateString("pt-BR")` | 🟡 Potencial bug UTC-3 |
| `EnviarComunicado.tsx` | 211 | `` new Date(`${form.dataEnvio}T${form.horaEnvio}:00`) `` | 🟡 Depende do input type=datetime-local |
| `EmissaoContratos.tsx` | — | Gera datas para parcelas (não verificado completamente) | 🟡 Checar |

**Padrão correto:** `new Date(y, m-1, d, 12, 0, 0)` ou `new Date(iso + 'T12:00:00')`

---

### c) DELETE — Sem Verificação de count

Os seguintes componentes fazem DELETE no Supabase sem checar `count === 0` após a operação:

| Arquivo | Tabela | Linha aprox. |
|---|---|---|
| `AdminUsuariosSimple.tsx` | `users` | 104 |
| `AgendaProfessor.tsx` | `agenda_professor` | 159 |
| `AgendaProfessores.tsx` | `agenda_professor` | 202 |
| `AtividadesProfessor.tsx` | `atividades` | 174 |
| `ControlePagamentos.tsx` | `financeiro_mensalidades` | 345 |
| `DocumentosRecebidos.tsx` | `documentos_matricula` | 215 |
| `EnviarComunicado.tsx` | `comunicados` | 255 |
| `ForumProfessor.tsx` | `forum_topicos` | 174 |
| `GestaoEscola.tsx` | `disciplinas`, `turmas`, `series` | 257, 363, 364 |
| `GestaoVinculos.tsx` | `professores_disciplinas_series` | 241, 251 |
| `GestaoHorarios.tsx` | `grade_horaria` | 135 |
| `FrequenciaProfessores.tsx` | `frequencia_professor` | 442 |
| `AgendamentoAulasVivo.tsx` | `aulas_ao_vivo` | 128 |
| `AulasAoVivoProfessor.tsx` | `aulas_ao_vivo` | 196 |
| `Notificacoes.tsx` | `notificacoes` | 84 |
| `EmissaoContratos.tsx` | `financeiro_mensalidades` | 283 (sem count) |
| `GestaoConteudoPDF.tsx` | `pdfs_conteudista` | 350 |

**Corretos (têm count check):**
- `EmissaoContratos.tsx:284` — `delete({ count: 'exact' })` ✅
- `FormularioMatricula.tsx:336` — `delete({ count: 'exact' })` ✅

---

### d) DARK MODE — Cores Hardcoded

| Arquivo | Problema |
|---|---|
| `EstatisticasConteudista.tsx` | `text-gray-900`, `text-gray-600` hardcoded (sem variante dark:) |
| `ConquistasEstudante.tsx` | Recebe `darkMode` prop e aplica classes `bg-gray-800/border-gray-700` manualmente (não usa ThemeContext) |
| `EstatisticasEstudo.tsx` | Igual ao anterior — `darkMode` prop em vez de ThemeContext |
| `RelatorioConteudo.tsx` | Sem dark mode (componente 100% mock, baixo impacto) |

---

### e) IMPORTS — Segundo Cliente Supabase

✅ **Nenhum** componente cria um segundo cliente Supabase. Todos importam de `'../supabase/supabaseClient'`.

---

### f) NOTIFICAÇÕES — alert() / confirm()

| Arquivo | Linha | Uso problemático |
|---|---|---|
| `AgendaProfessor.tsx` | 156 | `window.confirm('Apagar esta agenda? ...')` |
| `AgendaProfessores.tsx` | 200 | `window.confirm('Tem certeza que deseja deletar ...')` |
| `EnviarComunicado.tsx` | 222 | `window.confirm('Não foi possível fazer upload ...')` |
| `EnviarComunicado.tsx` | 253 | `window.confirm('Tem certeza que deseja excluir ...')` |

**Correto:** usar `AlertDialog` do shadcn/ui ou `toast.error()` com ação de confirmação.

---

### g) NAVEGAÇÃO — React Router

✅ **Nenhuma** importação de React Router encontrada. Navegação 100% via `useState`.

---

## 4. BUGS IDENTIFICADOS

### 🔴 CRÍTICO

---

**BUG-001 — usePresence: sendBeacon sem autenticação**
- **Arquivo:** `src/hooks/usePresence.ts:44`
- **Problema:** `navigator.sendBeacon(url)` envia um DELETE para a REST API do Supabase sem o header `Authorization`. Com RLS ativado, a requisição é ignorada silenciosamente — o usuário fica "online" na tabela `sessoes_ativas` por até 2 minutos após fechar o browser.
- **Atual:** A sessão fica ativa por 2 min (o timeout do heartbeat) mesmo após logout/fechar aba.
- **Esperado:** A linha da sessão deve ser removida imediatamente.
- **Correção:** Remover o `sendBeacon` e confiar apenas no `removerSessao()` (já existe no cleanup do `useEffect`). Alternativamente, usar um Edge Function que aceite o beacon e faça o DELETE com a service key.

---

**BUG-002 — DashboardAluno: formatarData sem horário fixo**
- **Arquivo:** `src/components/DashboardAluno.tsx:76-80`
- **Problema:** `new Date(dataISO)` onde `dataISO` é uma string `'YYYY-MM-DD'`. JavaScript interpreta datas sem horário como **UTC midnight**, resultando em `DD-1` para usuários no fuso UTC-3 (Brasil).
- **Atual:** Uma publicação feita em `2026-05-15` aparece como `14/05/2026`.
- **Esperado:** `15/05/2026`
- **Correção:**
  ```typescript
  // Em vez de:
  new Date(dataISO).toLocaleDateString("pt-BR")
  // Use:
  new Date(dataISO + 'T12:00:00').toLocaleDateString("pt-BR")
  ```

---

**BUG-003 — EnviarComunicado: window.confirm em vez de AlertDialog**
- **Arquivo:** `src/components/EnviarComunicado.tsx:222,253`
- **Problema:** `window.confirm()` é uma API bloqueante nativa do browser — bloqueia a thread JS, não respeita dark mode, e em alguns browsers mobile é desativado por padrão. Viola a regra do projeto.
- **Atual:** Usuário vê popup nativo feio do browser.
- **Esperado:** `AlertDialog` do shadcn/ui ou toast com ação de desfazer.
- **Correção:** Substituir por `AlertDialog` (já importado em outros componentes como `GestaoConteudoPDF`).

---

**BUG-004 — AgendaProfessor/Professores: window.confirm**
- **Arquivo:** `src/components/AgendaProfessor.tsx:156`, `src/components/AgendaProfessores.tsx:200`
- **Problema:** Mesmo problema do BUG-003. Duas ocorrências em componentes do professor.
- **Correção:** Mesmo padrão — substituir por `AlertDialog`.

---

### 🟡 MÉDIO

---

**BUG-005 — RelatorioConteudo: dados completamente mockados**
- **Arquivo:** `src/components/RelatorioConteudo.tsx`
- **Problema:** O componente exibe "247 conteúdos", "89 videoaulas", "1.542 downloads" hardcoded. Os filtros de período/disciplina não fazem nada. Usuários da plataforma nunca verão dados reais.
- **Atual:** Dashboard do conteudista exibe números inventados.
- **Esperado:** Queries reais na tabela `pdfs_conteudista`.

---

**BUG-006 — EstatisticasConteudista: dark mode quebrado**
- **Arquivo:** `src/components/EstatisticasConteudista.tsx`
- **Problema:** Usa `text-gray-900` e `text-gray-600` sem variante `dark:`. Em dark mode, texto fica invisível (cinza escuro sobre fundo escuro).
- **Atual:** Estatísticas do conteudista ilegíveis em dark mode.
- **Esperado:** Usar `text-foreground` e `text-muted-foreground`.

---

**BUG-007 — ConquistasEstudante / EstatisticasEstudo: prop darkMode em vez de ThemeContext**
- **Arquivo:** `src/components/ConquistasEstudante.tsx`, `src/components/EstatisticasEstudo.tsx`
- **Problema:** Esses componentes recebem `darkMode?: boolean` como prop e aplicam classes manuais (`bg-gray-800`, `border-gray-700`). Se o pai não passar a prop, ficam sempre em modo claro, independente do ThemeContext.
- **Correção:** Substituir `darkMode` prop por `useTheme()` do ThemeContext, e trocar classes manuais por variáveis CSS (`bg-card`, `border-border`).

---

**BUG-008 — school.ts: nome da escola inconsistente**
- **Arquivo:** `src/config/school.ts` vs `src/components/FrequenciaAluno.tsx:56`
- **Problema:** `SCHOOL_CONFIG.name = 'Colégio Conexão EAD'` mas `FrequenciaAluno.tsx` usa a constante local `ESCOLA_NOME = 'Colégio Conexão Maranhense'`. O nome impresso nos relatórios de frequência é diferente do resto do sistema.
- **Correção:** Usar `SCHOOL_CONFIG.name` de `../config/school` em todos os componentes que exibem o nome da escola.

---

**BUG-009 — ControlePagamentos: tipo embutido no campo observacao**
- **Arquivo:** `src/components/ControlePagamentos.tsx`
- **Problema:** O tipo do pagamento é armazenado como `tipo:mensalidade|Observação textual` no campo `observacao` da tabela `financeiro_mensalidades`. Isso é um workaround que mistura dados estruturados com texto livre, dificulta queries e relatórios.
- **Impacto:** `RelatorioFinanceiro` não consegue filtrar por tipo de pagamento adequadamente.

---

**BUG-010 — UploadConteudoPDF: séries hardcoded**
- **Arquivo:** `src/components/UploadConteudoPDF.tsx`
- **Problema:** A lista de séries (5º ao 9º ano, 1ª a 3ª série) é hardcoded. O próprio código tem um `// TODO: carregar do banco`. Se a escola adicionar/remover séries via `GestaoEscola`, o upload não reflete.

---

**BUG-011 — GestaoEscola: DELETE sem count em cascata**
- **Arquivo:** `src/components/GestaoEscola.tsx:363-364`
- **Problema:** Ao deletar uma série, o código faz `delete turmas where serie_id = id` seguido de `delete series where id = id` — ambos sem verificar `count === 0`. Se o primeiro delete retornar erro silencioso, a série é removida mas as turmas órfãs ficam no banco.

---

### 🟢 BAIXO

---

**BUG-012 — FloatingHelpButton importa componente não listado**
- **Arquivo:** `src/components/FloatingHelpButton.tsx`
- **Problema:** Importa `AcessoRapidoCorrecoes` que não aparece no glob de `src/components/*.tsx`. Ou o arquivo tem nome diferente, ou está em subdiretório.

---

**BUG-013 — AdvancedUploadComponent.tsx: nome de arquivo errado**
- **Arquivo:** `src/components/AdvancedUploadComponent.tsx`
- **Problema:** O arquivo é na verdade um módulo utilitário (`uploadHandlerAdvanced.ts`), não um componente React. Está na pasta `components/` mas não exporta JSX.

---

**BUG-014 — AgendaCoordenador duplica funcionalidade de GestaoHorarios**
- **Arquivo:** `src/components/AgendaCoordenador.tsx` (aba "Configurar Grade")
- **Problema:** A aba "Configurar Grade" de `AgendaCoordenador` replica parte da funcionalidade de `GestaoHorarios`. O coordenador tem dois caminhos para editar a mesma grade horária, podendo causar confusão.

---

**BUG-015 — AuthContext: console.log com dados do usuário em produção**
- **Arquivo:** `src/contexts/AuthContext.tsx:63,87,96,100,112,117,123`
- **Problema:** Vários `console.log` e `console.error` com emoji expõem dados do usuário (id, email, tipo) no console do browser em produção. Risco de exposição de dados via DevTools.

---

## 5. PADRÕES IDENTIFICADOS

### a) Estrutura dos Dashboards

Todos os dashboards seguem o mesmo padrão:

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

**Componentes lazy-loaded via `lazy(() => import('./X'))`:**
- Coordenador: BoletinsGerais, RelatorioTurma, FrequenciaAluno, EnviarComunicado, ForumCoordenador, AgendaCoordenador, GestaoHorarios, BoletimCoordenador
- Admin não usa lazy (imports diretos)
- Aluno não usa lazy (imports diretos)

---

### b) Queries no Supabase

**Padrão padrão:**
```typescript
const carregarDados = useCallback(async () => {
  setLoading(true);
  setErro(null);
  try {
    const { data, error } = await supabase
      .from('tabela')
      .select('campo1, campo2, join:outra_tabela(campo)')
      .eq('segmento', segmento)
      .order('created_at', { ascending: false });
    if (error) throw error;
    setDados(data || []);
  } catch (err: any) {
    setErro(err.message);
    toast.error('Erro ao carregar: ' + err.message);
  } finally {
    setLoading(false);
  }
}, [segmento]);
```

**Joins com FK nomeada (padrão do projeto):**
```typescript
// FK nomeada explicitamente:
'professor:users!grade_horaria_professor_id_fkey(nome)'
// FK simples (quando só há uma FK para a tabela):
'disciplinas(nome)'
// Relação many-to-many via tabela pivot:
'professores_disciplinas_series!inner(disciplinas(id, nome))'
```

**Queries paralelas com Promise.all:**
```typescript
const [{ data: a, error: ea }, { data: b, error: eb }] =
  await Promise.all([
    supabase.from('tabela_a').select('*'),
    supabase.from('tabela_b').select('*'),
  ]);
```

---

### c) Formulários

**Padrão:** estado local com `useState`, submit assíncrono com loading state, feedback via toast:
```typescript
const [form, setForm]       = useState<FormData>(initialState);
const [salvando, setSalvando] = useState(false);

const handleSubmit = async () => {
  if (!validarCampos()) return;  // validação inline
  setSalvando(true);
  try {
    const { error } = await supabase.from('tabela').insert(form);
    if (error) throw error;
    toast.success('Salvo com sucesso!');
    resetForm();
  } catch (err: any) {
    toast.error(err.message);
  } finally {
    setSalvando(false);
  }
};
```

**Botão de submit:** sempre desabilitado quando `salvando`, exibe `<Loader2 className="animate-spin" />`.

---

### d) Geração de PDFs

| Método | Quando usar | Exemplos |
|---|---|---|
| `window.print()` | Boletins e documentos simples; `@media print` CSS controla o layout | `Boletim.tsx`, `BoletimCoordenador.tsx` |
| `window.open('','_blank') + document.write(html) + setTimeout(print, 400)` | Documentos com HTML completo gerado dinamicamente (contratos, declarações) | `EmissaoContratos.tsx`, `EmissaoDocumentos.tsx`, `RelatorioFinanceiro.tsx` |
| `jsPDF + autoTable` | Relatórios multi-página com tabelas, gráficos e marca d'água | `RelatorioTurma.tsx` |

**Nota sobre jsPDF:** `RelatorioTurma` carrega o logo da escola via `carregarImagemBase64(url)` (canvas) para inserir no PDF, e cria uma marca d'água com opacidade reduzida via `criarWatermark()`.

---

### e) Verificação de Segmento

```typescript
// Em hooks:
const { segmento } = useSegmento();   // retorna 'ead' | 'presencial'

// Em queries de users, disciplinas, séries:
.eq('segmento', segmento)

// Em fichas_matricula (OBRIGATÓRIO usar ilike por inconsistência de case no banco):
.ilike('segmento', `%${segmento}%`)

// Em algumas tabelas sem campo segmento (agenda_professor), filtra por professor_id
// que já pertence ao segmento correto.
```

---

### f) Notificações

```typescript
import { toast } from 'sonner';

toast.success('Operação concluída!');
toast.error('Erro: ' + err.message);
toast.info('Função em desenvolvimento');

// Em App.tsx (global):
<Toaster richColors position="top-center" />
```

**Regra:** Nunca usar `alert()`, `confirm()` ou `window.confirm()`. Confirmações devem usar `AlertDialog` do shadcn/ui.

---

## 6. SKILLS — REGRAS DO PROJETO

> Os arquivos `docs/SKILLS_SUPABASE.md`, `docs/SKILLS_REACT.md` e `docs/SKILLS_PATTERNS.md` contêm as regras completas. Veja esses arquivos.

---

## 7. RECOMENDAÇÕES (por impacto)

| # | O que melhorar | Por que é importante | Esforço | Seguro em produção? |
|---|---|---|---|---|
| 1 | **Corrigir BUG-002** — formatarData em DashboardAluno | Datas erradas aparecem para todos os alunos diariamente | Baixo | ✅ Sim |
| 2 | **Corrigir BUG-001** — sendBeacon sem autenticação em usePresence | Usuários ficam "online" por até 2min após fechar o browser | Baixo | ✅ Sim |
| 3 | **Substituir todos os window.confirm** (BUG-003, BUG-004) | 4 ocorrências que violam UX e regras do projeto | Baixo | ✅ Sim |
| 4 | **Corrigir EstatisticasConteudista dark mode** (BUG-006) | Texto invisível em dark mode para todos os conteudistas | Baixo | ✅ Sim |
| 5 | **Migrar ConquistasEstudante e EstatisticasEstudo** para ThemeContext (BUG-007) | Dark mode inconsistente dependendo de quem renderiza | Baixo | ✅ Sim |
| 6 | **Padronizar ESCOLA_NOME** via school.ts (BUG-008) | Nome diferente em relatórios de frequência vs resto do sistema | Baixo | ✅ Sim |
| 7 | **Implementar RelatorioConteudo** com dados reais (BUG-005) | Dashboard do conteudista mostra dados inventados | Médio | ✅ Sim |
| 8 | **Adicionar count check nos DELETEs principais** (BUG-011) | Deleções silenciosas podem corromper dados em cascata | Médio | ✅ Sim |
| 9 | **Carregar séries do banco em UploadConteudoPDF** (BUG-010) | Upload não reflete mudanças feitas via GestaoEscola | Médio | ✅ Sim |
| 10 | **Remover console.log de produção** (BUG-015) | Dados do usuário expostos no DevTools do browser | Baixo | ✅ Sim |

---

## 8. PRÓXIMOS PASSOS

### Fase 1 — Correções de bugs críticos (1–2 dias)

1. **BUG-002** `DashboardAluno.tsx:77` — `new Date(dataISO + 'T12:00:00')`
2. **BUG-001** `usePresence.ts:44` — remover `navigator.sendBeacon(url)` (o `removerSessao()` já existe no cleanup)
3. **BUG-003/004** — substituir todos os `window.confirm` por `AlertDialog`
4. **BUG-006** `EstatisticasConteudista.tsx` — trocar `text-gray-900` → `text-foreground`
5. **BUG-007** — substituir prop `darkMode` por `useTheme()` em ConquistasEstudante/EstatisticasEstudo
6. **BUG-008** — centralizar `ESCOLA_NOME` via `SCHOOL_CONFIG.name`
7. **BUG-015** — remover `console.log` do AuthContext

### Fase 2 — Implementação dos Agentes de IA (3–5 dias)

**Arquitetura recomendada:**
```
src/components/
  ChatFlutante.tsx          ← componente principal (fixed bottom-right)
  ChatMensagem.tsx          ← item de mensagem (markdown, code blocks)

src/hooks/
  useChat.ts                ← gerencia histórico + chamada à API Claude
  
src/utils/
  sistemaPromptsPorPerfil.ts ← prompts de sistema por tipo de usuário
```

**Contexto por perfil:**
- `aluno`: série, disciplinas matriculadas, média atual, faltas — buscar de Supabase antes de abrir o chat
- `professor`: disciplinas e turmas que leciona, quantidade de alunos
- `coordenador`: estatísticas gerais do segmento, professores com pendências
- `administrador`: métricas globais do sistema

**Integração:** Edge Function Supabase que faz proxy para a API Claude, injetando o contexto do perfil no system prompt. Nunca expor a API key no frontend.

**Considerações de RLS:** O Edge Function precisa ser chamado com o JWT do usuário para que o RLS permita apenas acesso aos dados daquele perfil.

### Fase 3 — Multi-tenant (1–2 semanas)

**Pré-requisitos:** Fase 1 completa (especialmente os count checks nos deletes).

**Ordem de implementação:**
1. Criar tabela `escolas` (id, nome, cnpj, segmentos_ativos, configuracoes)
2. Adicionar `escola_id` (uuid, FK → escolas) em: `users`, `fichas_matricula`, `disciplinas`, `series`, `turmas`, `comunicados`, `notas`, `frequencia_diaria`, `grade_horaria`, `professores_disciplinas_series`, `sessoes_ativas`
3. Migrar dados existentes: `UPDATE users SET escola_id = '<id-colegio-conexao>'`
4. Criar políticas RLS: `USING (escola_id = auth.jwt()->>'escola_id')` (requer school_id no JWT via claim customizado)
5. Atualizar `supabaseClient.ts` para incluir `escola_id` nas queries (ou confiar no RLS)
6. Atualizar `school.ts` para ser dinâmico (buscar de Supabase por `escola_id`)
7. Criar portal de onboarding de novas escolas

**Risco alto:** A adição de `escola_id NOT NULL` requer `DEFAULT '<id-atual>'` temporário durante a migração. Nunca fazer `ALTER TABLE ... ADD COLUMN escola_id uuid NOT NULL` sem o DEFAULT em produção — travará a tabela.
