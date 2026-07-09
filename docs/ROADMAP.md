# ROADMAP — Portal Conexão AVA · SynerEduc
> Backlog priorizado por dependência estrutural · Atualizado em: 2026-07-08  
> Status: 🔴 Crítico · 🟡 Importante · 🟢 Melhoria · ✅ Concluído · 🔄 Em andamento · ⏸ Adiado · 🚫 Descartado

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
 ✅  F2.1 → IA Histórico Escolar  ← Edge Function + proxy Claude API
 ✅  F2.2 → Arquivo Histórico     ← fichas + boletins + escola anterior com IA
 ✅  F2.3 → Arquivo Morto         ← histórico retroativo unificado + pré-visualização
              │
              ▼
 ✅  F5   → Agentes de IA — 6/7 perfis  ← reutiliza F2.1 imediatamente · fechado em 2026-07-08
              │   (secretaria, gestor, coord, prof, financeiro, aluno)
              │   ┌─────────────────────────────────────────────────────────┐
              │   │  ENTREGUES NA SESSÃO 2026-07-08                        │
              │   │  ✅ Sofia: contexto extra p/ coordenador (freq+ativid.) │
              │   │  ✅ Agente NEXUS (Admin Geral) — Tool Use, 3 ferramentas│
              │   │  ✅ Gestão do RAG — aba dedicada no painel Conteudista, │
              │   │       navegador série→disciplina→volume/bimestre,      │
              │   │       catálogo rag_material_indexado (Supabase espelha │
              │   │       o Pinecone), exclusão individual/lote c/ barreiras│
              │   │  ✅ Sofia: Tool Use estruturado p/ aluno — notas        │
              │   │       (calcularNota real), frequência, grade horária e │
              │   │       agenda recente. Queries com JWT do próprio aluno │
              │   │       (RLS real, não service key). Testado ao vivo:    │
              │   │       recusa corretamente pedido de nota de colega     │
              │   │                                                         │
              │   │  ENTREGUES NA SESSÃO 2026-06-06                        │
              │   │  ✅ F5.1 Pinecone pipeline — 313/465 imgs indexadas     │
              │   │  ✅ F5.2 ChatFlutuante — Professora Sofia (RAG chat)    │
              │   │  ✅ F5.3/5.5/5.8 Agente Secretaria/Gestor/Financeiro   │
              │   │       → Gabriela v7 (Tool Use) — em produção           │
              │   │  ✅ F5.6/5.7 Sofia v6 — agenda de hoje + turma + RAG   │
              │   │       Sofia adicionada ao Dashboard Coordenador         │
              │   │  ✅ F5.11 Monitoramento de IA (admin) — em produção     │
              │   │  ✅ F8.3 FrequenciaRealtime — Realtime Supabase         │
              │   │  ✅ F8.4 WhatsApp MVP (wa.me) — notif. responsável      │
              │   │  ✅ agente_ia_log — observabilidade todos os agentes    │
              │   │                                                         │
              │   │  ENTREGUES NA SESSÃO 2026-06-17                        │
              │   │  ✅ Sofia: saudação corrigida por tipo (ref por ID)     │
              │   │  ✅ Sofia: histórico por sessão (sessionStorage/logout) │
              │   │  ✅ Sofia v9: agenda no system prompt, sem repetição    │
              │   │  ✅ claude-proxy v7: JWT via /auth/v1/user (fix 401)    │
              │   │  ✅ Gabriela: movida para canto inferior esquerdo       │
              │   │  ✅ Arquivo Morto: extração ficha+boletim com IA        │
              │   │       extrair-ficha Edge Function, soft-delete, RG      │
              │   │       botões upload violeta, painel boletins salvos     │
              │   │  ✅ Importar Fichas IA: fix busca (.tipo) + rg_resp     │
              │   │       coluna rg_responsavel + UNIQUE aluno_id no banco  │
              │   │  ✅ BoletinsGerais: notas presencial visíveis (RLS +    │
              │   │       query sem join, fallback por nome de disciplina)  │
              │   │  ✅ Botão Editar nota sempre visível (fix opacity-0)    │
              │   └─────────────────────────────────────────────────────────┘
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

AGENTE DE INCLUSÃO — módulo independente / futuro SaaS
 F7  → Tia Maria José — Agente Psicopedagógico de Inclusão
              │   ← homenagem a Maria José, neuropsicopedagoga (40 anos de experiência)
              │   ┌─────────────────────────────────────────────────────────────┐
              │   │  ENTREGUES NA SESSÃO 2026-06-06                            │
              │   │  ✅ F7.2 UI completa (AgenteInclusao.tsx) — 4 etapas       │
              │   │  ✅ Dois modos: Atividade Pronta + Roteiro Inclusivo        │
              │   │  ✅ Edge Function dona-maria — em produção                  │
              │   │  ✅ Impressão: cabeçalho escola, marca d'água, page-break   │
              │   │  ⏳ F7.1 Acervo clínico — aguardando material da especialista│
              │   └─────────────────────────────────────────────────────────────┘
              │
              ├──► F7.1 → Indexação do acervo (pesquisas + atividades da especialista)
              ├──► F7.3 → Agente do Responsável (orientações para casa)
              └──► F7.4 → SaaS independente (venda por escola)

ADIADO
 ⏸  F1.2 → Liberar acesso portal  ← dez/2026 (matrículas do ano seguinte)
```

### Resumo executivo

| Prioridade | Fase | Por que esta posição | Esforço est. | Janela |
|:---:|---|---|:---:|---|
| ~~**#1**~~ | ~~F2.1/2.2/2.3 IA Histórico~~ | ~~Edge Function proxy + arquivo histórico + arquivo morto~~ | ~~2 sem~~ | ✅ Jun/2026 |
| ~~**#1**~~ | ~~F5 Agentes (6/7)~~ | ~~Objetivo principal — reutiliza F2.1 direto~~ | ~~3-4 sem~~ | ✅ Jul/2026 |
| **#2** | F1.1 Multi-tenant | Férias escolares — sistema pode sair do ar · Colégio Ariane entra pós-migração | 3-4 sem | **Jul** |
| **#3** | F10 Plano de Aula IA | Esqueleto na demo Ariane (jun/17) · completo após indexação | 1-2 sem | Jun-Jul |
| **#2.5** | F12 Painel Super-Admin | synereduc.com — controle central, onboarding automático de escolas | 1-2 sem | Ago |
| **#6** | F1.3 Virada de ano | Deadline dez/2026 — testar com 2 meses de antecedência | 1-2 sem | Set-Out |
| **#6.5** | F11 Modularização | Camada comercial (3 planos) — depende de F1.1 para `escola_id` | 1-2 sem | Ago-Set |
| **#7** | F4 Financeiro+Asaas | Após F1.1 (multi-tenant) = zero retrabalho | 2-3 sem | Out-Nov |
| **#8** | F6 PWA | Produto estável — após tudo acima consolidado | 1-2 sem | Nov-Dez |
| **#9** | F7 Agente de Inclusão | Produto independente — acervo especialista pronto | 4-6 sem | 2027 |
| **⏸** | F1.2 Liberar acesso | Todos os alunos já cadastrados — retomar nas matrículas | — | Dez/2026 |

---

## F10 — Plano de Aula com IA · Professor
> Ideia capturada em 2026-06-12 — diferencial pedagógico de alto impacto

### F10.1 · Gerador de Plano de Aula com IA 🟡

**O que é:** Componente exclusivo no Dashboard do Professor para geração assistida de planos de aula usando o material didático já indexado no Pinecone como contexto.

**Problema resolvido:** Professor precisa pegar o material didático, planejar e entregar o plano para o coordenador — processo trabalhoso e frequentemente atrasado. Com o material no Pinecone, a IA pode gerar o planejamento com base nas respostas do professor a um formulário estruturado.

**Fluxo:**
1. Professor preenche formulário (disciplina, série, bimestre/volume, tema, duração, tipo de aula, recursos disponíveis, projetos interdisciplinares)
2. Edge Function busca conteúdo relevante no Pinecone (mesmo livro/volume do professor)
3. Claude gera rascunho completo do plano (objetivos, BNCC, metodologia, avaliação, referências do livro)
4. Professor revisa, edita ou descarta o rascunho
5. Salva no banco + gera PDF com logo e marca d'água da escola → envia para coordenador

**Perguntas do formulário (a refinar com o modelo da escola):**
- Disciplina / Série / Turma (pré-preenchido do perfil)
- Bimestre / Volume e tema/conteúdo específico
- Duração (1 aula, 2 aulas, semana?)
- Tipo de aula (expositiva, prática, avaliação, revisão, projeto)
- Recursos disponíveis (quadro, datashow, laboratório, etc.)
- Projetos interdisciplinares envolvidos?
- Necessidades especiais na turma?

**Output do plano de aula:**
- Cabeçalho com logo da escola + dados da turma
- Objetivos de aprendizagem
- Competências BNCC relacionadas
- Sequência didática (início, desenvolvimento, fechamento)
- Avaliação sugerida
- Referências do material didático (volume/página)
- Marca d'água da escola
- PDF pronto para impressão

**Componente coordenador (F10.2):** Painel de entrega de planos — quem entregou, quem está pendente, por disciplina e período.

**Configuração por escola (coordenador define):**
- Periodicidade do plano: `semanal` | `mensal` | `bimestral`
- Essa variável determina quantas linhas a IA gera na tabela e qual o recorte temporal do plano
- Salva em `configuracoes_escola` (tabela de settings por escola, reutilizável em F1.1 multi-tenant)

**Template base:** Colégio Ariane (modelo recebido em 2026-06-12) — adotado como padrão universal do sistema. Logo do cabeçalho troca dinamicamente pelo `escola_id`.

**Dependências:** F5.1 (Pinecone indexado), F1.1 (multi-tenant para `escola_id` — pode ser antecipado com `segmento` como chave provisória)
**Status:** ⏳ **Aguardando** — demo Colégio Ariane realizada em 2026-06-17. Implementação após F1.1 multi-tenant (usa `escola_id` para logo dinâmico)

---

## F8 — Voz, Automação e Comunicação em Tempo Real
> Ideias capturadas em 2026-06-10 — alta prioridade para experiência do professor e coordenador

### F8.1 · Lançamento por voz — Professor 🟡
**O que é:** Botão fixo no centro inferior do painel do professor. O professor fala e o sistema interpreta o comando, abre o componente correto já preenchido e aguarda confirmação.

**Status atual:**
- ✅ **Agenda por voz — funcionando em produção** (`AgendaProfessor`)
- ⚠️ **Frequência por voz — testes não foram satisfatórios** (pausado para revisão)

**Exemplos de comando:**
- *"Lançar agenda de geografia — assunto: Movimento da Terra, aula de hoje: Translação, atividade para casa na página 10"* → abre `AgendaProfessor` pré-preenchida ✅
- *"Lançar frequência da turma 3B"* → `FrequenciaProfessor` — ⚠️ em revisão
- *"Observação: João estava agitado hoje, conversar com coordenador"* → cria entrada no diário de sala (F8.2)

**Como implementa:**
- Edge Function `interpretar-voz` (já existe no projeto!) → enviar áudio → Claude extrai intent + campos
- Frontend: `VoiceCommandButton.tsx` (FAB circular, pulsa quando ativo)
- Retorna JSON: `{ intent: "agenda" | "frequencia" | "observacao", fields: {...} }`
- Componente destino abre em modal com campos pré-preenchidos para revisão e confirmação

**Dependências:** `interpretar-voz` Edge Function (já criada), Web Speech API ou MediaRecorder

---

### F8.2 · Diário de Sala por Voz — Professor 🟡
**O que é:** Botão de microfone fixo no dashboard do professor. Com um toque, o professor fala um registro rápido — ocorrência, lembrete ou recado para coordenação — sem precisar digitar nada.

**Por que voz faz sentido aqui (e não na frequência):**
- Texto livre sem nomes próprios específicos → reconhecimento de voz muito mais confiável
- Professor está em sala, com as mãos ocupadas — voz é o canal mais natural
- Frequência por voz foi descartada: nomes de alunos são pronunciados de formas variadas por cada professor, risco de erro alto demais

**Exemplos de uso real:**
- *"Registrar no diário de aula, o aluno Fulano está se comportando mal, informar a coordenação"*
- *"Registrar no diário de aula, trazer para amanhã cartolina para atividade"*
- *"Registrar no diário de aula, preparar avaliação adaptada do aluno tal"*
- *"Registrar no diário de aula, conteúdo de hoje não foi concluído, continua amanhã"*

**Fluxo:**
1. Professor toca o ícone de microfone (FAB ou botão no dashboard)
2. Fala o registro (transcrição em tempo real via Web Speech API)
3. IA categoriza automaticamente: `comportamento` | `lembrete` | `coordenacao` | `conteudo` | `outro`
4. Se categoria = `coordenacao` → entrada fica visível no painel do coordenador com badge de atenção
5. Registro salvo com data/turma/hora — professor vê histórico do dia na tela

**Tabela nova:** `diario_sala` (professor_id, turma_id, aluno_id nullable, texto, categoria, data, visivel_coordenador, origem: 'voz' | 'texto')

**Dependências:** Edge Function `interpretar-voz` (já existe), Web Speech API

---

### ✅ F8.3 · Frequência em Tempo Real — Coordenador
**O que é:** Quando o professor lança uma falta ou atraso, o evento aparece imediatamente no dashboard do coordenador — sem precisar recarregar.

**Fluxo completo:**
1. Professor lança falta → `frequencias` inserida no Supabase
2. Supabase Realtime emite evento para o coordenador (já usa Realtime em outros lugares)
3. Dashboard do coordenador mostra notificação ao vivo: *"Ana Lima — faltou — Matemática 3B — 10:15"*
4. Coordenador vê painel consolidado: quantas faltas por turma hoje, quais professores ainda não lançaram

**Ações do coordenador no painel:**
- ✅ **Marcar como justificada** — muda status da falta, registra motivo
- 📲 **Notificar responsável** → dispara mensagem pelo sistema (portal do aluno/responsável)
- 💬 **Notificar responsável via WhatsApp** → ver F8.4

**Entregue em 2026-06-13:** `FrequenciaRealtime.tsx` + Supabase Realtime em `frequencia_diaria` + coluna `notificado_em` + DashboardCoordenador integrado.

---

### ✅ F8.4 · Notificação WhatsApp — MVP entregue
**O que é:** Coordenador clica "Notificar via WhatsApp" e o responsável recebe mensagem automática no celular.

**Mensagem padrão (personalizável por escola):**
> *"Olá [Nome do Responsável], informamos que [Nome do Aluno] faltou à aula de [Disciplina] em [Data]. Acesse o portal para mais informações ou entre em contato com a escola."*

**Como implementar:**
- API: **WhatsApp Business Cloud API** (Meta) — gratuita até 1.000 conversas/mês por número
- Edge Function `notificar-whatsapp` → recebe payload → chama API Meta
- Custo: ~R$ 0,08 por mensagem após limite gratuito (baixo para o volume de uma escola)
- Número da escola cadastrado no painel do gestor
- Log de todas as mensagens enviadas por aluno

**MVP entregue em 2026-06-13:** link `wa.me/55NUMERO?text=MENSAGEM_CODIFICADA` integrado ao `FrequenciaRealtime` — zero custo, funciona no botão "Notificar Responsável". WhatsApp Business API (Meta) fica para F8.4 full quando o volume justificar.

**Dependência:** F8.3 ✅

---

## F9 — Comunicação Avançada com Responsáveis
> Capturado em 2026-06-11 — features exibidas no site synereduc.com, ainda não implementadas

### F9.1 · Notificações automáticas — faltas, notas e comunicados 🟡
**O que é:** Quando uma falta é registrada, uma nota é lançada ou um comunicado é publicado, o responsável recebe notificação automática — sem ação manual da escola.

**Canais planejados:**
- Push notification via portal do responsável (PWA)
- E-mail (SendGrid ou Resend — low cost)
- WhatsApp → ver F8.4 (já documentado)

**Eventos que disparam notificação:**
- Falta registrada → notifica responsável imediatamente
- Nota lançada/atualizada → notifica ao final do período
- Comunicado publicado → notifica todos os responsáveis da turma
- Atividade com nota abaixo de 5,0 → alerta especial

**Dependências:** F3 (Portal Responsável), F8.4 (WhatsApp)

---

### F9.2 · Chatbot de atendimento — pais e responsáveis 🟢
**O que é:** Canal de atendimento assíncrono dentro do portal do responsável. Responsável envia mensagem → escola responde (ou IA responde perguntas simples automaticamente).

**Fluxo:**
- Responsável pergunta: *"Qual a nota da Ana em Matemática?"* → IA responde com os dados reais
- Perguntas sobre agenda, faltas, comunicados → respondidas pela IA automaticamente
- Perguntas complexas (reunião, problema comportamental) → encaminha para secretaria ou coordenação

**Arquitetura:**
- Tabela `mensagens_responsavel` (já existe — `agenda_mensagens_privadas.sql` criado em 2026-06-05)
- Edge Function → Claude com contexto do aluno (notas, frequência, agenda)
- Painel da escola: fila de mensagens não respondidas pela IA

**Dependências:** F3 (Portal Responsável), F5.3 (Agente Secretaria com Tool Use)

---

### F9.3 · Histórico completo de interações por aluno 🟢
**O que é:** Timeline unificada de tudo que aconteceu com um aluno — faltas, notas, atividades, comunicados recebidos, mensagens do responsável, observações do professor — acessível para coordenação e responsável.

**Casos de uso:**
- Coordenador consulta histórico antes de reunião com responsável
- Responsável vê tudo que a escola comunicou sobre seu filho
- Evidência para relatório pedagógico ou AEE

**Tabela:** `historico_aluno` (aluno_id, tipo, descricao, origem, data, usuario_id) — view ou tabela materializada

**Dependências:** F9.1 (notificações), F9.2 (chatbot), F8.2 (diário de sala)

---

## F4 expandido — Financeiro Inteligente
> Features do financeiro exibidas no site synereduc.com — ainda não implementadas (2026-06-11)
> Complementam o F4 (Financeiro Avançado + Asaas) já no roadmap

### F4.1 · Painel de inadimplência com IA 🔴
**O que é:** Dashboard financeiro com visão de inadimplência por turma, aluno e período. IA prevê probabilidade de recebimento com base no histórico.

**KPIs do painel:**
- A receber no mês
- Recebido até hoje
- Inadimplente (valor + lista de alunos)
- Taxa de adimplência (%)
- Previsão de fechamento do mês pela IA

**Implementação:**
- Integração Asaas (já planejado em F4)
- Edge Function → Claude analisa histórico de pagamentos → gera previsão
- Alert: turmas com maior concentração de inadimplência

---

### F4.2 · Cobrança automatizada + régua de comunicação 🟡
**O que é:** Sequência configurável de ações automáticas quando um pagamento vence sem baixa.

**Régua padrão (configurável por escola):**
- D+1: notificação push no portal do responsável
- D+3: e-mail automático
- D+7: WhatsApp (via F8.4)
- D+15: alerta para secretaria no painel

**Dependências:** F4.1, F9.1 (notificações), F8.4 (WhatsApp)

---

### F4.3 · Relatório mensal automático para diretoria 🟢
**O que é:** No primeiro dia útil de cada mês, a IA gera automaticamente um relatório financeiro completo do mês anterior — sem ação manual.

**Conteúdo do relatório:**
- Receita total prevista vs. realizada
- Inadimplência por turma
- Evolução mês a mês (últimos 6 meses)
- Insights da IA: anomalias, tendências, recomendações
- PDF pronto para apresentar na reunião de diretoria

**Dependências:** F4.1, F4.2, integração Asaas

---

## Auditoria de Segurança — 2026-06-17

> Revisão completa realizada na sessão 2026-06-17. Vetores investigados e status de cada um.

### Vulnerabilidades corrigidas nesta sessão

| Vetor | Componente | Correção | Commit |
|---|---|---|---|
| Auth ausente | `agente-gabriela` | JWT obrigatório + contexto derivado do perfil real | `02fcba5a` |
| API Injection | `agente-gabriela` | `sanitizeMes()` + `sanitizeStatus()` com allowlist | `42f7e592` |
| Prompt Injection | `agente-gabriela`, `claude-proxy` | Bloco `<segurança>` no system prompt de todos os agentes | `42f7e592` |
| Dependências críticas | `jspdf`, `vite`, `ws`, `lodash`... | `npm audit fix --force` → 0 vulnerabilidades | `433072ab` |
| Sem limite de caracteres | Todos os `<Input>` e `<Textarea>` | Padrão global: 500 chars (input), 5000 (textarea) | `433072ab` |
| Sem limite server-side | `claude-proxy`, `agente-gabriela` | Rejeita payload > 50k chars / prompt > 8k chars (HTTP 413) | `433072ab` |
| Auth ausente | `extrair-ficha` | JWT obrigatório + allowlist de perfis (secretaria/gestor) | `(esta sessão)` |
| MIME não validado server-side | `extrair-ficha` | Allowlist de tipos + limite 10MB no servidor | `(esta sessão)` |
| MIME não validado client-side | `AtividadesAluno` | Validação de `file.type` + tamanho antes do upload | `(esta sessão)` |
| Cabeçalhos HTTP ausentes | `vite.config.ts` | `X-Frame-Options`, `X-Content-Type-Options`, CSP, `Referrer-Policy` | `(esta sessão)` |

### Vetores investigados — sem vulnerabilidade

| Vetor | Resultado |
|---|---|
| SQL Injection | ✅ N/A — PostgREST trata params como valores, não SQL |
| XSS | ✅ `dangerouslySetInnerHTML` apenas em chart.tsx com dados internos |
| CSRF | ✅ N/A — autenticação por JWT no header, não por cookie |
| BOLA / IDOR | ✅ RLS do Supabase valida `auth.uid()` no servidor |
| Path Traversal | ✅ Sem acesso a filesystem; Storage usa URLs assinadas |
| SSRF | ✅ URL do PDF vem do banco, não do usuário diretamente |
| Desserialização insegura | ✅ Apenas `JSON.parse` de respostas de APIs confiáveis |
| Mass Assignment | ✅ Campos sempre extraídos explicitamente, sem `...body` |
| XXE | ✅ Sem parser XML em nenhum ponto do sistema |
| BFLA | ✅ SPA com roteamento por estado React, não por URL |
| Session Fixation | ✅ JWT renovado a cada login pelo Supabase Auth |
| Criptografia fraca | ✅ Senhas gerenciadas pelo Supabase Auth (bcrypt) |
| Enumeração de usuários | ✅ Mensagem genérica: "Usuário ou senha incorretos" |
| CPF/RG em queries indevidas | ✅ Apenas `EmissaoContratos`, `EmissaoDocumentos`, `FormularioMatricula` (perfis autorizados) |
| console.log com dados sensíveis | ✅ Nenhum log expõe senha, CPF, token ou RG |

### Pendências — requerem ação na infraestrutura (Supabase Dashboard)

| Status | Item | Detalhe |
|:---:|---|---|
| 🟡 | **Políticas dos buckets de Storage** | `entregas_atividades`, `atividades`, `comunicados`, `pdfs_conteudista` usam `getPublicUrl` — verificar se os buckets estão como "Private" no painel Supabase (requer autenticação para acesso) |
| 🟡 | **Rate limiting no login** | Supabase Auth tem proteção básica; confirmar no painel: Auth → Rate Limits — recomendado máximo 5 tentativas/minuto |
| 🟡 | **CSP em produção** | Os headers do `vite.config.ts` valem apenas para dev/preview. Em produção (hospedagem), configurar os mesmos headers no servidor/CDN (Vercel, Netlify, Nginx) |

---

## Conformidade Legal — LGPD

> Implementação técnica concluída em 2026-06-17. Itens abaixo são **obrigações jurídicas**, não melhorias opcionais.

| Status | Item | Detalhe | Prazo sugerido |
|:---:|---|---|---|
| ✅ | Consentimento registrado na matrícula | `consentimento_lgpd` + `consentimento_em` no banco | Jun/2026 |
| ✅ | Política de Privacidade pública | Página acessível no login — 8 seções (Art. 9) | Jun/2026 |
| ✅ | Controle de acesso por perfil | CPF/RG visível só para secretaria e gestão | Jun/2026 |
| ✅ | Soft-delete (não apaga dados permanentemente) | `deletado_em` — guarda histórico conforme Art. 16 | Jun/2026 |
| 🟡 | **Contrato DPA Controlador × Operador** | **Instrumento formal entre Colégio Conexão (Controlador) e SynerEduc (Operador) — Art. 39. Sem esse contrato a escola não pode provar que delegou o tratamento com segurança.** | **Ago/2026** |
| 🟡 | E-mail DPO ativo | `privacidade@colegioconexao.com.br` citado na política precisa existir e ter responsável | Ago/2026 |
| 🟢 | Procedimento de resposta a incidentes | Roteiro interno: o que fazer se houver vazamento (notificar ANPD em 72h — Art. 48) | Set/2026 |
| 🟢 | ROPA — Registro de Atividades de Tratamento | Documento interno listando cada fluxo de dado: quem coleta, finalidade, retenção | Set/2026 |

> **Próximo passo jurídico:** redigir o contrato DPA entre escola e SynerEduc. Quando solicitado, o Claude pode gerar um modelo base.

---

## Bugs backend — descobertos via análise do Supabase (2026-05-30)

| ID | Componente | Descrição | Issue | Risco |
|---|---|---|---|:---:|
| ~~BUG-B001~~ | ~~`fn_atualizar_media`~~ | ~~Fórmula errada para Presencial — AV3 ignorado e REC incorreta~~ | ✅ #11 | — |
| ~~BUG-B002~~ | ~~`total_alunos_ativos()`~~ | ~~Referencia tabela 'usuarios' inexistente~~ | ✅ #12 | — |
| ~~BUG-B003~~ | ~~`buscar_agenda_por_data`~~ | ~~3 versões no banco, 2 quebradas~~ | ✅ #13 | — |
| ~~BUG-B004~~ | ~~`eh_admin()`~~ | ~~Não inclui gestor_geral — inconsistência de privilégios~~ | ✅ #14 | — |
| ~~SEC-001~~ | ~~`grade_horaria`~~ | ~~RLS USING(true) — qualquer usuário pode escrever~~ | ✅ #10 | — |
| ~~IDX-001~~ | ~~múltiplas tabelas~~ | ~~9 indexes críticos ausentes~~ | ✅ #15 | — |

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
| — | Sofia: saudação errada para professor/aluno (race condition auth) | — | `44786c86` |
| — | Sofia: repetia agenda em cada resposta (agenda movida pro system prompt) | — | `44786c86` |
| — | Sofia: histórico apagado ao navegar (persistência sessionStorage) | — | `44786c86` |
| — | claude-proxy: 401 em boletim (JWT JWKS→/auth/v1/user) | — | `44786c86` |
| — | Arquivo Morto: 504 timeout em ficha (sem header PDF beta) | — | `44786c86` |
| — | Arquivo Morto: deletados apareciam na busca (filtro soft-delete) | — | `44786c86` |
| — | Importar Fichas IA: busca 400 (.role→.tipo), rg_responsavel ausente | — | `c1d2c930` |
| — | BoletinsGerais: coordenador presencial via RLS + fix query join | — | `c1d2c930` |
| — | Botão Editar nota invisível (opacity-0 group-hover removido) | — | `c1d2c930` |
| — | `BoletinsGerais`: segmento ausente no payload → RLS bloqueava UPDATE coordenador presencial | — | `c29056fa` |
| — | `ImportacaoFichas`: segmento ausente no payload → ficha salva mas não aparecia em Gerenciar Alunos | — | `9b933b3e` |
| — | `BoletimProfessor`: segmento ausente → notas professor presencial gravadas como EAD e invisíveis ao coordenador | — | `0023e99f` |
| — | RLS `notas_update_professor`: bloqueava UPDATE quando `professor_responsavel` era null (notas sem dono) | — | SQL direto |
| — | Notas duplicadas no banco (mesmo aluno/disciplina/bimestre): removidas, constraint UNIQUE adicionada | — | SQL direto |
| — | `calculoNotas`: `reprovado` removido do nível de bimestre — só existe no boletim anual final | — | `c67fb5e4` |
| — | `BoletimCoordenador`: React key duplicada `REC-3`/`MÉD-4` nos cabeçalhos da tabela | — | `04fbc59d` |
| — | Cache de localStorage stale em secretaria (instrução: limpar via DevTools Application) | — | sem código |

---

## Features — por prioridade de dependência estrutural

---

### ✅ T1 — Testes unitários · `b5ecf270`

> **Posição:** Primeiro de tudo — rede de segurança antes de qualquer mudança estrutural.

- [x] ~~Vitest + @vitest/coverage-v8 (devDependencies — zero impacto em prod)~~
- [x] ~~`vitest.config.ts` separado do `vite.config.ts`~~
- [x] ~~`dateUtils.ts`, `authUtils.ts`, `serieUtils.ts` — utils puras testáveis~~
- [x] ~~4 suítes de teste — `calculoNotas`, `dateUtils`, `authUtils`, `serieUtils`~~
- **101/101 testes passando · `npm run test:run`**
- Sessão 2026-06-23: +36 novos casos (calculoNotas: limites exatos, zero≠null, REC=0; authUtils: todos os 10 perfis cobertos)

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

### ✅ F2.1/F2.2/F2.3 · IA Histórico Escolar + Arquivo Histórico + Arquivo Morto · Jun/2026

> Concluído em 2026-06-02.

- [x] Edge Function `claude-proxy` — proxy seguro, chave nunca exposta no front
- [x] `HistoricoIA.tsx` — extração de histórico externo com IA + revisão humana
- [x] `ArquivoHistorico.tsx` — digitalização de ficha de matrícula + boletins com IA (3 etapas)
- [x] `ArquivoMorto.tsx` — gestão de egressos, histórico retroativo unificado, pré-visualização editável
- [x] Tabela unificada de disciplinas (mescla escolas anteriores + Conexão numa só tabela)
- [x] Formato oficial do documento (timbre, dados do aluno, certificado, assinaturas, marca d'água)
- [x] Modelo atualizado `claude-opus-4-5` → `claude-sonnet-4-6` + retry automático
- [x] Normalizadores de JSON com coerção de tipos em todos os 3 fluxos de extração

---

### 🔄 #1 — F5 · Agentes de IA — 6/7 perfis · Jun-Jul/2026 · ~3-4 semanas

> **Por que é o #1?** Reutiliza diretamente a Edge Function criada em F2.1.
> O 7º agente (responsável) fica para após o Portal do Responsável (F3) existir.
> **Nenhuma dependência de multi-tenant — funciona perfeitamente em single-tenant.**
>
> **Status do RAG:** Material didático (6º ano → 3ª série EM) disponível para indexação imediata.
> Regimento escolar pendente — agentes que dependem do regimento sobem sem RAG documental
> e são atualizados assim que o documento chegar.

#### F5 — Sub-etapas (cada uma = 1 issue)

| Sub-etapa | Issue | Depende de | Bloqueado por regimento? |
|---|:---:|---|:---:|
| F5.0 · Infraestrutura base (claude-proxy v2 + SQL) | #19 | — | ❌ |
| F5.1 · Pipeline indexação Pinecone (material didático) | #20 | F5.0 | ❌ |
| F5.2 · `ChatIA.tsx` + `useChatIA` (componente base) | #21 | F5.0 | ❌ |
| F5.3 · Agente Secretaria | #22 | F5.2 | ⚠️ parcial |
| F5.4 · Agente Coordenador | #23 | F5.2 | ⚠️ parcial |
| F5.5 · Agente Gestor | #24 | F5.2 | ⚠️ parcial |
| F5.6 · Agente Professor (Pedagógico) | #25 | F5.1 + F5.2 | ❌ |
| F5.7 · Agente Aluno (Pedagógico) | #26 | F5.1 + F5.2 | ❌ |
| F5.8 · Agente Financeiro | #27 | F5.2 | ❌ |
| F5.9 · Agente Admin Geral | #28 | F5.2 | ✅ |
| F5.10 · DashboardConteudista → interface de gestão do RAG | #29 | F5.1 | ✅ |
| F5.11 · Painel de Monitoramento de IA (Admin SynerEduc) | #30 | F5.0 | ✅ |

> Tabela de sub-etapas mantida como histórico do planejamento original — o F5 como um todo está ✅ fechado (ver diagrama acima). Alguns status "❌ bloqueado por regimento" acima ficaram desatualizados; confiar no resumo consolidado, não linha a linha.

> ⚠️ parcial = funciona com dados ao vivo; apenas a consulta ao regimento fica pendente até o documento chegar.

**Tarefas F5.0 (infra):**
- [x] ~~SQL: tabelas `agente_log`, `agente_uso_diario`, `agente_limites`~~ — confirmado em produção (Supabase)

**Tarefas F5.1 (Pinecone):**
- [x] ~~Script de indexação PNG via Ollama gemma3:4b (OCR) + multilingual-e5-large → Pinecone~~
- [x] ~~1ª série / Biologia / 1º bimestre — primeiros vetores indexados e funcionando~~
- [ ] 🔄 **Completar indexação demais séries e disciplinas** — 313 imagens indexadas no checkpoint local (`scripts/indexar-imagens-checkpoint.json`), rodando em background na máquina do operador. Confirmar total restante antes de fechar o item.
- [ ] Utilitário de deleção + re-upsert para atualização futura

**Tarefas F5.2 (componente base):**
- [x] ~~`ChatFlutuante.tsx` — Professora Sofia (botão flutuante inferior direito, chat completo)~~
- [x] ~~Edge Function `chat-sofia` v6 — RAG + agenda de hoje + turma do aluno, em produção~~
- [x] ~~Sofia adicionada ao DashboardCoordenador~~

**Tarefas F5.3/5.5/5.8 — Agente Gabriela (Secretaria · Gestor · Financeiro):**
- [x] ~~Edge Function `agente-gabriela` v7 — Tool Use loop (MAX_TURNS=5), em produção~~
- [x] ~~Tools: busca alunos, documentos pendentes, inadimplentes, resumo financeiro, indicadores~~
- [x] ~~`ChatGabriela.tsx` — widget flutuante plugado nos 3 dashboards administrativos~~
- [x] ~~Observabilidade: agente_ia_log (tokens, latência, turns)~~

**Tarefas restantes F5 (agentes pedagógicos):**
- [x] ~~**Agente Pedagógico · Professor/Aluno** — Sofia v6 (RAG + agenda de hoje)~~
- [x] ~~**Agente Coordenador** — Sofia v8 recebe contexto extra (frequência dos últimos 7 dias + atividades aguardando correção) via `<contexto_coordenador>` no system prompt, filtrado por segmento~~
- [x] ~~**Agente Admin Geral "NEXUS"** (#28) — Edge Function `agente-nexus` (Tool Use, mesmo padrão de agente-gabriela) com 3 ferramentas: `status_sistema`, `consumo_ia`, `logs_seguranca` (tentativas de prompt injection via `agente_log.tentativa_violacao` + erros de execução via `agente_ia_log`). `ChatNexus.tsx` plugado no `DashboardAdministrador.tsx`, restrito a `tipo === 'administrador'`~~
- [x] ~~**F5.10** (#29) — aba dedicada "Gestão do RAG" no painel do Professor Conteudista: navegador hierárquico série → disciplina → volume/bimestre, alimentado pela tabela `rag_material_indexado` (espelha o Pinecone no Supabase, já que o Pinecone não lista valores distintos de metadata — sincronizada pelo próprio `indexar-imagens-locais.ts`). Exclusão individual (confirmação simples) e em lote (exige digitar o nome da disciplina) via `rag-status`, restrito a `professor_conteudista`/`administrador`~~
- [x] ~~**Sofia — Tool Use estruturado para o aluno**: 4 tools novas (`obter_notas_aluno` com `calcularNota` real, `obter_frequencia_aluno`, `obter_grade_horaria_aluno`, `obter_agenda_recente_aluno`). Consultas com o JWT do próprio aluno (RLS real como 2ª camada de defesa, não a service key). Decisões registradas em `docs/AGENTES_IA_DECISOES.md` (D1.6)~~

> Checagem de código em 2026-07-08 confirmou o status acima. Contexto do coordenador, NEXUS, gestão do RAG (aba dedicada + catálogo Supabase) e Tool Use estruturado da Sofia — tudo implementado, deployado e testado ao vivo (isolamento entre alunos confirmado com aluna real) na mesma sessão. Um bug real foi encontrado e corrigido em produção: `frequencia_diaria` tinha 2 FKs duplicadas para `disciplinas`, causando erro 300 (embedding ambíguo) no PostgREST — corrigido nomeando a FK explicitamente (`chat-sofia` v12).

**Entrega:** 6 perfis com IA contextual no ar. O 7º (responsável) entra no #4. **F5 fechado em 2026-07-08.**

---

### 🚫 F3 · Portal do Responsável — DESCARTADO

> **Decisão 2026-06-13:** Ambas as escolas (Conexão Maranhense e Colégio Ariane) têm parceria com **Isaac**, que já oferece portal financeiro e contratos para os responsáveis. Criar um portal próprio duplicaria funcionalidade já disponível sem agregar valor. O painel do aluno já expõe notas, frequência e comunicados — suficiente.

---

### 🔄 Colégio Ariane — Onboarding (Ago/2026)

> Segunda escola contratada. 229 alunos, segmento Presencial, do Maternal ao 9º ano.
> Contrato: R$1.490/mês. Onboarding previsto para Agosto/2026.

**Preparação técnica iniciada em 2026-06-23:**
- [x] Tabela `escola_config` criada no Supabase (nome, logo, cores, domínio)
- [x] Colégio Conexão e Colégio Ariane cadastrados na `escola_config`
- [x] Hook `useEscolaConfig.ts` criado — detecta escola pelo domínio, aplica logo/cores/título
- [ ] Comprar domínio do Colégio Ariane no Hostgator
- [ ] Criar addon domain no cPanel + subir build na pasta do Ariane
- [ ] Upload da logo do Ariane no Storage
- [ ] Plugar `useEscolaConfig` no `SchoolHeader`, login e PDFs
- [ ] Cadastrar séries, turmas e disciplinas do Ariane no banco
- [ ] Criar usuários da escola (secretaria, coordenador, professores, alunos)
- [ ] Lançar notas do 1º semestre já existentes

**Nota técnica:** deploy manual por escola (mesmo build, pastas separadas no Hostgator). A partir da 3ª-4ª escola, migrar para F1.1 multi-tenant se torna necessário.

---

### 🔴 #2 — F1.1 · Multi-tenant · **Jul/2026** · ~3-4 semanas

> **Janela:** Julho/2026 — férias escolares. Sistema pode ficar fora do ar para atualização sem impacto nos usuários. Colégio Ariane previsto para entrar no sistema após esta migração.

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

### 🔴 #2.5 — F12 · Painel Super-Admin (synereduc.com) · Ago/2026 · ~1-2 semanas

> **Por que aqui?** Depende de F1.1 (multi-tenant + `escola_id`) para ter dados de todas as escolas isolados corretamente. É a peça de controle central do SaaS — sem ela, cada escola nova exige operação manual.

**Contexto:** Painel exclusivo em `synereduc.com` para o operador da plataforma (Junior). Login com perfil `super_admin`, branding SynerEduc, acesso cross-escola sem entrar em cada domínio individualmente.

**Tarefas:**

- [ ] Perfil `super_admin` no Supabase Auth (`user_metadata.tipo = 'super_admin'`, `escola_id: null`)
- [ ] RLS: policy `BYPASS RLS` ou `USING(true)` para `super_admin` em todas as tabelas
- [ ] `useEscolaConfig`: quando domínio = `synereduc.com` → retorna modo super-admin
- [ ] Tela de login exclusiva com logo/cores do SynerEduc (detectado pelo domínio)
- [ ] `DashboardSuperAdmin.tsx` com:
  - KPIs globais: escolas ativas, usuários totais, MRR, uso de IA no mês
  - Lista de escolas com status (ativa/suspensa), plano contratado, nº de usuários
  - Seletor de escola ativa — todas as telas abaixo operam no contexto da escola selecionada
- [ ] `CadastroEscola.tsx` — formulário completo:
  - Nome, CNPJ, domínio, segmento padrão, plano (módulos), logo, cores
  - Ao salvar: INSERT em `escola_config` + cria usuário admin no Supabase Auth + envia e-mail de boas-vindas com credenciais
- [ ] Edge Function `criar-escola` — automação do onboarding (substitui operação manual)
- [ ] **Gestão completa por escola (suporte remoto)** — reutiliza componentes existentes com `escola_id` injetado pelo seletor:
  - Usuários: cadastrar alunos, professores, coordenadores, secretaria — mesmo `GestaoUsuarios` já existente
  - Vínculos: professor ↔ disciplina ↔ série — mesmo `VinculosProfessores` já existente
  - Disciplinas e séries: criar, editar, remover — mesmo `GestaoDisciplinas` / `GestaoSeries` já existentes
  - Turmas: criar e associar alunos — mesmo `GestaoTurmas` já existente
  - Notas e boletins: consultar e corrigir em nome da escola se necessário
  - Tudo isso sem precisar de login separado na escola, sem sair do `synereduc.com`
- [ ] Registro do SynerEduc em `escola_config` (domínio `synereduc.com`, cores `#6366F1`/`#8B5CF6`)
- [ ] Adicionar `synereduc.com` como domínio customizado no Vercel

**Dependência:** F1.1 (multi-tenant)
**Destrava:** onboarding de novas escolas sem operação manual — de horas para minutos

---

### 🟡 #6.5 — F11 · Modularização do Produto (Planos Pedagógico / Secretaria+Financeiro / IA) · Ago-Set/2026 · ~1-2 semanas

> **Por que aqui?** Depende de F1.1 (multi-tenant) porque o campo `modulos` fica em `escola_config`, que precisa de `escola_id`. Não bloqueia nenhuma feature existente — é uma camada sobre o que já existe.

**Contexto:** Divisão do produto em 3 módulos comercialmente independentes para ampliar o alcance e permitir precificação por camada:

| Módulo | Perfis incluídos | Funcionalidades |
|---|---|---|
| **Pedagógico** (base) | Aluno, Professor, Coordenador, Admin básico | Notas, boletim, frequência, agenda, comunicados, fórum, atividades |
| **Secretaria + Financeiro** | Secretaria, Financeiro, Gestor Geral | Matrículas, fichas, contratos, mensalidades, despesas |
| **IA** (add-on) | Todos os perfis habilitados | Sofia, Gabriela, Plano de Aula, Tia Maria José, Assistente de Voz |

**Tarefas:**
- [ ] Campo `modulos text[]` em `escola_config` (default: `'{pedagogico}'`)
- [ ] Hook `useModulos()` — expõe `temFinanceiro`, `temIA`, `temSecretaria`
- [ ] Esconder rotas/menus dos módulos não contratados (menu lateral, Dashboard routing)
- [ ] Edge Functions de IA: verificar `modulos` inclui `'ia'` antes de processar (HTTP 403 se não tiver)
- [ ] Impedir criação de usuários com perfis de módulos não contratados (`secretaria`, `financeiro`, `gestor_geral` bloqueados sem módulo financeiro)
- [ ] Dashboard super-admin: exibir qual plano cada escola tem contratado

**Dependência:** F1.1 (multi-tenant — `escola_id` + `escola_config` com isolamento real)
**Não bloqueia:** nenhuma feature existente — é controle de acesso sobre o que já existe

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
