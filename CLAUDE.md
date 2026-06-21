# SynerEduc — Documentação Técnica do Projeto

> Leitura complementar: `docs/ANALISE_COMPLETA.md`, `docs/ROADMAP.md`, `docs/AGENTES_IA_DECISOES.md`

---

## O que é o SynerEduc

Sistema de gestão escolar com IA integrada, desenvolvido para escolas privadas do Brasil. Cobre gestão acadêmica, administrativa e financeira em uma única plataforma — matrículas, notas, frequência, comunicados, agenda, boletins, documentos, contratos, financeiro e funcionalidades de IA.

Suporta dois segmentos operacionais isolados: **EAD** e **Presencial**, com 10 perfis de usuário distintos.

**Clientes ativos:**
- Colégio Conexão Maranhense (São Luís/MA) — em produção, serve como laboratório
- Colégio Ariane — 229 alunos, contrato fechado em R$1.490/mês

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| UI Components | shadcn/ui (Radix UI primitives) |
| Backend / Banco | Supabase (PostgreSQL 15 + PostgREST + Auth) |
| Serverless | Supabase Edge Functions (Deno / TypeScript) |
| LLM | Anthropic Claude (Sonnet 4.6 / Haiku 4.5) |
| Busca vetorial | Pinecone (índice `multilingual-e5-large`, 1024 dims) |
| OCR local | Ollama (gemma3:4b + BGE-M3) — roda na máquina do operador |
| Testes | Vitest — 65/65 passando |
| Build | Vite — output em `/build` |

---

## Backend — Supabase (PostgreSQL)

### Autenticação

Supabase Auth com JWT. O `user_metadata` do token carrega `tipo` (perfil do usuário) e `segmento` (EAD/Presencial). Toda autorização nas Edge Functions é derivada do JWT — nunca do payload enviado pelo cliente.

Fluxo de autenticação:
```
Login → supabase.auth.signInWithPassword()
      ↓
JWT emitido com user_metadata: { tipo, segmento, escola_id }
      ↓
Frontend armazena sessão via supabase.auth.getSession()
      ↓
Cada requisição ao banco usa o JWT automaticamente (RLS)
Edge Functions recebem o JWT no header Authorization e o validam via /auth/v1/user
```

### Row Level Security (RLS)

RLS ativo em todas as tabelas. As políticas seguem o padrão:

- **Aluno:** lê/escreve apenas seus próprios registros
- **Professor:** acessa apenas registros das suas turmas/disciplinas
- **Coordenador:** acessa todos os registros do seu segmento
- **Admin / Gestor Geral:** acesso total via política `USING(true)` ou `BYPASS RLS`
- **Segmento:** isolamento entre EAD e Presencial em todas as queries

Implicação importante: se o RLS bloqueia um DELETE, o Supabase retorna `error: null` e `count: 0` sem lançar exceção. Por isso todo DELETE verifica `count === 0` explicitamente.

### Principais tabelas

| Tabela | Descrição |
|---|---|
| `users` | Perfis dos usuários — `tipo`, `segmento`, `status`, `nome`, `email`, `avatar_url` |
| `fichas_matricula` | Dados completos de matrícula: aluno, responsável, CPF, RG, endereço, `consentimento_lgpd` |
| `documentos_matricula` | Documentos enviados por aluno (Storage) |
| `notas` | Notas por aluno/disciplina/bimestre — `av1`, `av2`, `av3`, `recuperacao`, `media_final` |
| `frequencia_diaria` | Presença diária por aluno/disciplina |
| `disciplinas` | Catálogo de disciplinas por segmento |
| `series` | Séries/anos escolares por segmento |
| `turmas` | Turmas associadas a séries |
| `professores_disciplinas_series` | Tabela pivot: vínculo professor ↔ disciplina ↔ série |
| `grade_horaria` | Grade de horários por série/dia/ordem — chave composta `(serie_id, dia_semana, ordem)` |
| `agenda_professor` | Agenda diária lançada pelo professor |
| `aulas_ao_vivo` | Agendamento de aulas ao vivo (link, data, status) |
| `comunicados` | Comunicados enviados para perfis/turmas |
| `forum_topicos` | Tópicos do fórum por disciplina |
| `forum_mensagens` | Mensagens dentro de um tópico |
| `atividades` | Atividades criadas pelo professor + entregas dos alunos (Storage) |
| `contratos` | Contratos de matrícula gerados |
| `financeiro_mensalidades` | Mensalidades: valor, vencimento, status de pagamento |
| `financeiro_despesas` | Despesas operacionais da escola |
| `pdfs_conteudista` | PDFs de conteúdo pedagógico por disciplina/série/bimestre (Storage) |
| `comentarios_pedagogicos` | Comentários do professor/coordenador sobre um aluno |
| `sessoes_ativas` | Heartbeat de presença online — upsert a cada 30s, `last_seen` |
| `agente_ia_log` | Log de uso dos recursos de IA: perfil, tokens, custo estimado |
| `agente_uso_diario` | Agregado diário de uso de IA por perfil |

### Padrão de acesso ao banco (frontend)

Cliente único em `src/supabase/supabaseClient.ts` — nunca instanciar um segundo `createClient()`.

```typescript
// Padrão de query:
const { data, error } = await supabase
  .from('notas')
  .select('av1, av2, av3, recuperacao, media_final, disciplina_id')
  .eq('user_id', userId)
  .eq('segmento', segmento)   // ← obrigatório em toda query
  .order('created_at', { ascending: false });

// Nunca select('*') em tabelas com CPF/RG
// Joins por FK nomeada quando há múltiplas FKs para a mesma tabela
// Queries independentes em paralelo via Promise.all
```

### Peculiaridades do banco

- **`fichas_matricula.segmento`** — usar `.ilike('%ead%')` e não `.eq('ead')` por inconsistência de case nos dados históricos
- **Datas** — strings ISO `YYYY-MM-DD` interpretadas como UTC midnight causam bug de -1 dia no Brasil (UTC-3). Correção: `new Date(iso + 'T12:00:00')` — encapsulado em `src/utils/dateUtils.ts`
- **Upsert com chave composta** — `grade_horaria` usa `onConflict: 'serie_id,dia_semana,ordem'`
- **Cálculo de notas** — feito no frontend (`src/utils/calculoNotas.ts`), não por função SQL, para evitar bugs de fórmula no banco (funções SQL anteriores tinham fórmulas erradas)

---

## Edge Functions (Deno)

8 funções serverless no Supabase. Todas validam JWT antes de qualquer processamento.

| Função | Perfis autorizados | Descrição |
|---|---|---|
| `claude-proxy` | todos autenticados | Proxy seguro para Anthropic API. Injeta a API key server-side, nunca exposta no bundle |
| `chat-sofia` | todos autenticados | Chat pedagógico com RAG — busca chunks relevantes no Pinecone e responde com Haiku 4.5 |
| `agente-gabriela` | secretaria, gestor_geral, administrador, financeiro | Único agente real do sistema — Tool Use com funções predefinidas que consultam o banco ao vivo |
| `extrair-ficha` | secretaria, gestor_geral, administrador, admin_presencial | OCR de fichas de matrícula via Claude Vision (PDF/imagem → JSON estruturado) |
| `gerar-plano-aula` | professor, coordenador, administrador | Geração de plano de aula com RAG (Pinecone + Sonnet 4.6) |
| `dona-maria` | professor, coordenador | Geração de atividades/avaliações adaptadas para crianças atípicas |
| `indexar-documento` | professor_conteudista, administrador | Indexa PDFs no Pinecone para RAG (extração de texto + chunking + embedding) |
| `interpretar-voz` | professor, coordenador | Transcrição de áudio + interpretação via Claude |

### Padrão de autenticação nas Edge Functions

```typescript
// 1. Extrair token do header
const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim() ?? ''
if (!token) return new Response(JSON.stringify({ erro: 'Não autorizado' }), { status: 401 })

// 2. Validar com Supabase Auth
const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
  headers: { Authorization: `Bearer ${token}`, apikey: SERVICE_KEY }
})
if (!userResp.ok) return new Response(..., { status: 401 })

// 3. Derivar contexto do JWT — NUNCA do body do cliente
const userAuth = await userResp.json()
const tipo = userAuth.user_metadata?.tipo ?? ''
if (!perfisPermitidos.includes(tipo)) return new Response(..., { status: 403 })
```

---

## Funcionalidades de IA — classificação técnica

O sistema usa IA de quatro formas distintas. Apenas uma delas é um agente no sentido técnico:

### Agente com Tool Use — Gabriela
Único recurso que se qualifica como agente. O Claude recebe uma pergunta e uma lista de ferramentas predefinidas, decide autonomamente quais chamar e em que ordem, executa as queries no banco, raciocina sobre os resultados e formula a resposta. O Claude não executa SQL livre — apenas chama funções com parâmetros validados.

```
Pergunta → Claude analisa + escolhe tool → Edge Function executa query →
resultado volta para o Claude → Claude formula resposta final
```

Tools disponíveis variam por perfil (secretaria, financeiro, gestor_geral).

### RAG Chatbot — Sofia
Recuperação de contexto + geração. Não toma ações, não chama ferramentas. Busca os chunks mais relevantes do material didático no Pinecone e os injeta no contexto do Haiku 4.5.

```
Pergunta → embedding (Pinecone Inference API) → busca vetorial →
5 chunks mais relevantes → Haiku 4.5 com contexto → resposta
```

### Geração com IA (prompt → documento estruturado)
- **Tia Maria José:** formulário guiado (4 etapas) → Sonnet 4.6 → documento pedagógico completo para impressão
- **Plano de Aula:** parâmetros do professor + RAG → Sonnet 4.6 → plano de aula formatado
- **Extração de Ficha:** PDF/imagem em base64 → Claude Vision → JSON com campos da ficha preenchidos

### Speech-to-text + IA
- **Assistente de Voz:** áudio → transcrição → Claude interpreta a intenção → resposta contextual

---

## Segurança

### O que foi auditado e corrigido (Jun/2026)

| Vetor | Status | Implementação |
|---|---|---|
| Autenticação nas Edge Functions | ✅ | JWT obrigatório em todas as 8 funções |
| Autorização por perfil | ✅ | Allowlist de `tipo` derivado do JWT, não do body |
| Injeção via parâmetros de API | ✅ | `sanitizeMes()` (regex YYYY-MM) + `sanitizeStatus()` (allowlist) |
| Prompt injection | ✅ | Bloco `<segurança>` no system prompt de todos os recursos de IA |
| Limite de payload | ✅ | Prompt máx 8.000 chars, body total 50.000 chars → HTTP 413 |
| Validação de upload de arquivo | ✅ | MIME allowlist + limite de tamanho no cliente e no servidor |
| Limites de input | ✅ | `maxLength` padrão nos componentes base (`Input`: 500, `Textarea`: 5.000) |
| Dependências com CVE | ✅ | `npm audit fix` — 0 vulnerabilidades |
| HTTP security headers | ✅ | `X-Frame-Options`, `X-Content-Type-Options`, CSP, `Referrer-Policy` |
| SQL Injection | ✅ sem risco | PostgREST trata valores como parâmetros, não concatena SQL |
| IDOR / BOLA | ✅ sem risco | RLS no banco garante isolamento — não depende de validação no frontend |
| CSRF | ✅ sem risco | Supabase Auth usa tokens Bearer, não cookies de sessão |

### Pendências de infraestrutura (requer acesso ao painel Supabase)
- Buckets de Storage ainda como "Public" — precisam ser "Private" com signed URLs
- Rate limiting de Auth (tentativas de login) não configurado
- Headers de segurança em produção dependem da hospedagem (Vercel/Netlify/Nginx) — vite.config.ts só cobre dev/preview

### LGPD
- Consentimento registrado na matrícula (`consentimento_lgpd` + `consentimento_em`)
- Política de Privacidade publicada na plataforma (`/politica`)
- CPF/RG acessíveis apenas para secretaria, gestor_geral e administrador
- Contrato DPA Controlador × Operador pendente (jurídico)

---

## O que falta para virar SaaS multi-tenant

Este é o principal trabalho de backend a ser feito. O sistema foi construído para uma escola — para N escolas isoladas:

### Crítico

1. **`escola_id` em todas as tabelas** — hoje o isolamento é por `segmento` (EAD/Presencial). Para multi-tenant real, cada escola precisa de identificador próprio em todas as tabelas e em todas as políticas de RLS.

2. **Onboarding automatizado** — hoje uma escola nova exige setup manual no Supabase (criar usuário admin, configurar segmento, etc.). Precisa de fluxo automático: escola preenche formulário → API cria o schema/configuração → envia credenciais do admin.

3. **Isolamento de Storage** — buckets precisam ser segregados por escola (prefixo `escola_id/` nos caminhos ou buckets separados).

4. **Dashboard de super-admin** — visão de todas as escolas, métricas globais, controle de acesso e suporte.

5. **Billing integrado** — contratos fechados manualmente hoje. Precisa integrar gateway de pagamento (Asaas ou similar) com gestão de assinatura por escola.

### Importante

- Observabilidade: logs estruturados por escola, métricas de uso de IA (tabelas `agente_ia_log` e `agente_uso_diario` existem mas precisam de `escola_id`)
- Rate limiting por escola nas Edge Functions (hoje é global)
- CI/CD pipeline — deploy é manual
- Portal do Responsável — não implementado ainda
- Virada de ano letivo automatizada — hoje é operação manual
- Pipeline RAG completo — material didático das demais séries ainda em indexação local

---

## Estrutura de arquivos

```
src/
  App.tsx                    — roteamento: website / login / ava / politica
  components/                — ~55 componentes
    ai/                      — recursos de IA: ChatFlutuante, ChatGabriela,
                               AgenteInclusao, AssistenteVoz, avatares SVG
    ui/                      — shadcn/ui: Button, Input, Textarea, Dialog, etc.
  contexts/
    AuthContext.tsx           — sessão + perfil do usuário
    ThemeContext.tsx          — dark/light mode
  hooks/
    useSegmento.ts            — segmento, isEAD, isPresencial do usuário logado
    usePresence.ts            — heartbeat de presença (30s)
    useChatIA.ts              — hook genérico de chat com IA
  utils/
    calculoNotas.ts           — fórmulas EAD e Presencial (testado)
    authUtils.ts              — perfilLabel, isAdmin, canAccessFinanceiro (testado)
    serieUtils.ts             — filtros e ordenação de séries (testado)
    dateUtils.ts              — formatação de datas com correção UTC-3 (testado)
  supabase/
    supabaseClient.ts         — único createClient() do projeto
  types/
    auth.ts                   — TipoUsuario, Usuario, interfaces principais

supabase/
  functions/                  — 8 Edge Functions (Deno/TypeScript)

docs/
  ROADMAP.md                  — backlog priorizado com status
  ANALISE_COMPLETA.md         — inventário completo v0.2.0
  AGENTES_IA_DECISOES.md      — decisões técnicas de IA com raciocínio detalhado
  PRD.md                      — regras de negócio, fluxos, perfis de usuário
  SKILLS_SUPABASE.md          — padrões de código Supabase (13 regras)
  SKILLS_REACT.md             — padrões de código React
  SKILLS_PATTERNS.md          — padrões gerais: PDF, toast, upload, formatação

scripts/
  indexar-imagens-locais.ts   — pipeline de indexação do material didático no Pinecone
                                 roda localmente com Ollama
```

---

## Regras de desenvolvimento

1. **Nunca `select('*')`** em tabelas com CPF/RG
2. **Segmento obrigatório** em toda query nas tabelas `users`, `notas`, `fichas_matricula`, `disciplinas`, `series`
3. **`fichas_matricula.segmento`** usa `.ilike()`, não `.eq()`
4. **Queries separadas** em vez de joins quando há múltiplas FKs para a mesma tabela
5. **JWT obrigatório** em todas as Edge Functions — contexto deriva do JWT, nunca do body
6. **Datas** — usar `dateUtils.ts` (bug UTC-3)
7. **Dark mode** — via `ThemeContext`, nunca via prop `darkMode`
8. **Navegação** — sem React Router; `viewAtual` é estado local em cada Dashboard
9. **Sem `window.confirm`** — usar `AlertDialog` do shadcn/ui
10. **Testes** — `npm run test:run` deve passar 65/65 antes de qualquer deploy
