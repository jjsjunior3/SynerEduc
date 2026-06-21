# Registro de Decisões e Arquitetura — Módulos de IA do SynerEduc
**Para revisão técnica · Destinatário: Lucas**  
**Última atualização: 2026-06-19**

> Este documento registra cada módulo de IA implementado, sua arquitetura, e as decisões técnicas
> tomadas durante o desenvolvimento — com o raciocínio por trás de cada escolha.
> Objetivo: avaliação crítica posterior e rastreabilidade das decisões.

---

## Contexto do projeto

**SynerEduc** é o sistema de gestão escolar do Colégio Conexão Maranhense (escola privada, São Luís/MA).  
Stack: React + TypeScript + Vite + Supabase (PostgreSQL + Edge Functions Deno) + Tailwind.  
Infraestrutura de IA: Anthropic Claude + Pinecone + Ollama local.

---

## Estado atual dos módulos

| # | Módulo | Agente | Componente | Edge Function | Status |
|---|---|---|---|---|---|
| 1 | Geração de Histórico Escolar por IA | — | `ArquivoHistorico.tsx`, `ArquivoMorto.tsx` | `claude-proxy` | ✅ Produção |
| 2 | Agente Pedagógico do Aluno | Professora Sofia | `ChatFlutuante.tsx`, `AvatarSofia.tsx` | `chat-sofia` | ✅ Produção (RAG Pinecone) |
| 3 | Pipeline RAG — Material Didático | — | `scripts/indexar-imagens-locais.ts` | — | 🔄 Indexando (1ª série concluída) |
| 4 | Agente Administrativo | Gabriela | `ChatGabriela.tsx` | `agente-gabriela` | ✅ Produção |
| 5 | Agente Psicopedagógico de Inclusão | Tia Maria José | `AgenteInclusao.tsx`, `AvatarDonaMaria.tsx` | `dona-maria` | ✅ Produção (sem acervo clínico) |
| 6 | Geração de Plano de Aula por IA | — | `PlanoDeAula.tsx` | `gerar-plano-aula` | ✅ Produção |
| 7 | Agentes por perfil completo | — | — | — | 📋 Planejado (F5 ROADMAP) |

---

## Módulo 1 — Geração de Histórico Escolar por IA ✅

### O problema que resolve
Quando um aluno vem transferido de outra escola, a secretaria precisa digitalizar manualmente o histórico em papel — processo que pode levar horas. Com IA, o processo leva segundos.

### Arquitetura

```
Upload (PDF ou foto)
      ↓
Conversão Base64 no browser (FileReader API)
      ↓
POST → supabase/functions/claude-proxy (Edge Function Deno)
  · valida JWT + perfil autorizado
  · injeta ANTHROPIC_API_KEY server-side
  · retry automático: 3x com backoff 1s/2s para erros 429/529/5xx
      ↓
Anthropic API → Claude Sonnet 4.6 (visão de documento)
  · Três prompts especializados: ficha histórica, boletim, histórico externo
      ↓
Resposta JSON estruturada
      ↓
Normalizador TypeScript (corrige variações: vírgula/ponto decimal, casing, campos ausentes)
      ↓
Tela de revisão editável (revisão humana obrigatória)
      ↓
Confirmação → INSERT no Supabase
      ↓
Gerador HTML → impressão via window.print()
```

### Decisões técnicas

**Por que Claude Sonnet e não Haiku:** Haiku falha em documentos antigos com caligrafia digitalizada ou scan de baixa qualidade.  
**Por que Claude e não GPT-4o/Gemini:** Superior em JSON estrito, opt-out de uso para treinamento, tipo "document" interpreta PDFs paginados com mais precisão.  
**Por que HTML + window.print() e não jsPDF:** Suporte limitado a PT-BR e layouts complexos no jsPDF; o browser produz qualidade gráfica superior.  
**Por que revisão humana obrigatória:** Dados escolares têm validade legal — a revisão é o controle de qualidade insubstituível.

---

## Módulo 2 — Professora Sofia ✅

### O que é
Chat flutuante no canto inferior **direito** de todos os dashboards. Responde dúvidas sobre o conteúdo dos livros didáticos com base no material real indexado no Pinecone.

### Identidade
- Nome: **Professora Sofia**
- Personalidade: jovem, animada, paciente, usa emojis ocasionais
- Avatar: SVG cartoon — coque com laço vermelho, óculos roxos, blazer roxo, brincos de estrela
- Histórico: 6 mensagens mantidas em sessão

### Arquitetura

```
Pergunta do aluno/professor
      ↓
supabase.functions.invoke('chat-sofia')  ← JWT injetado automaticamente
      ↓
Edge Function valida JWT + extrai perfil
      ↓
Pinecone Inference API (multilingual-e5-large, 1024 dims)
  ← embedding da pergunta no servidor
      ↓
Pinecone: busca 5 chunks mais relevantes
  · filtro: serie + disciplina (metadados)
      ↓
Claude Haiku 4.5 (custo mínimo, contexto de chat)
  ← system prompt da Professora Sofia + chunks do livro
      ↓
Resposta ao usuário
```

### Decisões técnicas

#### D1.1 — Embeddings na Edge Function: Pinecone Inference API, não Ollama
**Decisão:** `multilingual-e5-large` via Pinecone Inference API.  
**Motivo:** Edge Functions rodam em servidores remotos — não alcançam `localhost:11434` (Ollama). Descoberto empiricamente com erro `fetch failed`.  
**Trade-off:** Vetores dos livros gerados com BGE-M3 (1024 dims). O `multilingual-e5-large` também gera 1024 dims e é compatível semanticamente. Testado e funcionando.

#### D1.2 — Modelo LLM: Claude Haiku 4.5
**Motivo:** Chat pedagógico com contexto dos livros — qualidade do Haiku é suficiente para reformular trechos. Custo ~10x menor que Sonnet. A qualidade real vem dos chunks do livro.

#### D1.3 — Autenticação: supabase.functions.invoke() em vez de fetch manual
**Motivo:** `supabase.functions.invoke()` injeta o JWT automaticamente. A abordagem manual com fetch exigia `VITE_SUPABASE_ANON_KEY` no `.env.local`, que estava faltando — causou erros difíceis de diagnosticar.  
**Lição:** Sempre preferir a abstração do cliente Supabase para Edge Functions autenticadas.

#### D1.4 — Componente de chat: elementos nativos em vez de componentes UI
**Motivo:** Componentes `shadcn/ui` usam `React.forwardRef` internamente — ao passar `ref` diretamente, o React emitia warnings. Elementos nativos aceitam `ref` sem problema. Aparência idêntica.

#### D1.5 — Markdown no chat: parser mínimo próprio, sem biblioteca
**Motivo:** Claude retorna negrito e parágrafos. Importar `react-markdown` seria ~50KB para renderizar dois padrões. Função `MarkdownSimples` tem 15 linhas e cobre 100% do que o Claude gera nesse contexto.

### Status atual
- ✅ Material 1ª série Biologia indexado (35 vetores, Sofia respondendo corretamente)
- 🔄 Demais séries em indexação

---

## Módulo 3 — Pipeline RAG: Material Didático 🔄

### O problema que resolve
A escola possui livros didáticos em PDF (escaneados como imagens) e PNGs. Para que a Sofia responda com base no conteúdo real dos livros, é necessário extrair texto, gerar vetores e armazenar no Pinecone.

### Arquitetura do pipeline (local)

```
Imagens PNG no PC (alta qualidade)
      ↓
gemma3:4b via Ollama local  ← OCR gratuito, ótimo para imagens nítidas
      ↓
Texto completo extraído
      ↓
Chunking local (400 palavras, 50 overlap)
      ↓
BGE-M3 via Ollama local  ← embedding 1024 dims (gratuito)
      ↓
Pinecone  ← upsert com metadados { serie, disciplina, bimestre, chunk_index, texto }
```

### Decisões técnicas

#### D3.1 — OCR local: Ollama gemma3:4b, não Claude API
**Motivo:** Material em PNG de alta qualidade — imagens nítidas, fontes grandes. Modelos locais têm desempenho suficiente e custo zero. Claude fica reservado para PDFs de baixa qualidade.

#### D3.2 — Formato do payload Ollama: campo images[], não content array
**Problema:** Erro `json: cannot unmarshal array into Go value of type string`.  
**Causa:** Implementação inicial usava formato OpenAI (`content: [{ type: 'image_url', ... }]`). O Ollama usa formato próprio: `{ role, content: "string", images: ["base64..."] }`.  
**Lição:** Ollama e OpenAI têm APIs de visão incompatíveis apesar de parecerem similares.

#### D3.3 — BATCH_IMAGENS = 2 (reduzido de 5)
**Motivo:** Com batch de 5 e 3 terminais em paralelo, o Ollama recebia ~15 requisições simultâneas — sobrecarga causava `fetch failed`.  
**Solução:** BATCH=2 + AbortController com timeout de 180s + retry 3x com espera 15/30/45s.

#### D3.4 — IDs Pinecone: toAsciiId() com normalização NFD
**Problema:** Erro "Vector ID must be ASCII" em nomes como "1ª série".  
**Solução:** NFD decompõe "é" em "e" + acento combining — remove o acento, mais confiável que tabela manual.

#### D3.5 — Normalização volume → bimestre
**Fórmula:** `Math.ceil(((volume - 1) % 12 + 1) / 3)` — normaliza volumes 1-24+ para bimestres 1-4 independente da série.

#### D3.6 — Computador: não pode hibernar durante indexação
**Contexto:** Hibernação para o Ollama e falha todos os processos.  
**Solução:** Modo de descanso (desligar tela) é permitido. Configurar "Nunca hibernar" no painel de energia durante a indexação.

### Status atual
- ✅ 1ª série / Biologia / 1º bimestre — 35 vetores indexados
- 🔄 Demais disciplinas da 1ª série em indexação
- ⏳ 2ª e 3ª série + Fundamental (6º-9º) aguardando

---

## Módulo 4 — Agente Gabriela (Administrativo) ✅

### O problema que resolve
Secretárias, gestores e financeiro consultam dados do sistema em linguagem natural, sem navegar por múltiplos painéis.

### Exemplos de perguntas por perfil

| Perfil | Pergunta | Dado consultado |
|---|---|---|
| Secretaria | "Quais alunos estão sem CPF cadastrado?" | `fichas_matricula` |
| Financeiro | "Quem está inadimplente este mês?" | `financeiro_mensalidades` |
| Gestor | "Qual a média geral da 2ª série?" | `notas` |

### Arquitetura

```
Pergunta em linguagem natural
      ↓
Edge Function 'agente-gabriela'
  · valida JWT
  · deriva contexto do perfil JWT (nunca do body do cliente)
  · seleciona tools disponíveis para o perfil
      ↓
Claude com Tool Use — chama tools conforme necessário
      ↓
Edge Function executa query Supabase (com RLS ativo)
      ↓
Claude formula resposta
      ↓
Log assíncrono em agente_ia_log
```

### Tools por perfil
**Secretaria:** `buscar_alunos`, `documentos_pendentes`, `verificar_acesso_portal`, `matriculas_recentes`  
**Financeiro:** `inadimplentes`, `resumo_financeiro`, `historico_aluno`  
**Gestor Geral:** todas acima + `desempenho_turma`, `frequencia_turma`, `indicadores_escola`

### Segurança
- Contexto derivado do JWT — inforjável pelo cliente
- RLS do Supabase ativo em todas as queries como última linha de defesa
- Inputs sanitizados: `sanitizeMes()` (regex YYYY-MM) + `sanitizeStatus()` (allowlist)
- Bloco `<segurança>` no system prompt contra prompt injection
- Limite server-side: mensagem > 4.000 chars → HTTP 413

### Identidade visual
- Chat flutuante **bottom-left** (`fixed bottom-5 left-5`) — diferencia da Sofia (bottom-right)
- Nome: **Gabriela** — assistente administrativa

---

## Módulo 5 — Tia Maria José (Inclusão) ✅

### A origem
Homenagem a Maria José, neuropsicopedagoga com quase 40 anos de experiência. O agente carrega o nome e a missão dela — levar conhecimento clínico a professores sem acesso a suporte especializado.

### O problema que resolve
- Professores sem formação em educação especial obrigados por lei a atender alunos com TDAH, TEA, dislexia, discalculia
- Uma turma pode ter 5+ crianças atípicas — criar atividades adaptadas toma horas
- Psicopedagogos sobrecarregados — impossível atender todas as escolas

### Dois modos de geração

| Modo | O que gera | Para quem |
|---|---|---|
| **Atividade Pronta** | Folha com exercícios, gabarito, pronta para imprimir | Professor (uso individual) |
| **Roteiro Inclusivo** | Guia para conduzir a MESMA atividade com TODA a turma | Professor (turma inteira) |

### Formulário guiado — 4 etapas
1. Sobre a criança (nome opt., idade, condição/atipicidade)
2. Habilidade alvo
3. Modo de saída + tipo de documento + disciplina + recursos
4. Observações + resumo antes de gerar

### Decisões técnicas

#### D2.1 — Dois modos no mesmo agente
**Motivo:** Insight: inclusão real é criar atividade onde todos participam juntos, não uma folha separada. Dois prompts distintos (`buildPromptAtividadePronta` e `buildPromptInclusiva`) na mesma Edge Function.

#### D2.2 — Modelo LLM: Claude Sonnet 4.5
**Motivo:** Adaptar exercícios para TEA é diferente de para dislexia — o Haiku confundia as especificidades. O resultado vai direto para a mão de uma criança atípica. Qualidade não é opcional.

#### D2.3 — Impressão: janela dedicada (window.open)
**Motivo:** `window.print()` direto imprimiria toda a página do sistema. Janela dedicada tem apenas o documento — cabeçalho da escola, atividade, gabarito.

#### D2.4 — Parser markdown para impressão: função própria linha a linha
**Problema:** Output do Claude com `## EXERCÍCIO 1` e `---` renderizavam como texto literal.  
**Solução:** `markdownParaHtml()` — headers `##` viram `<div class="questao">` com `page-break-inside: avoid`. PDF de 4 páginas com layout limpo.

#### D2.5 — Detecção de perfil: usuario.tipo, não usuario.perfil
**Bug corrigido:** Implementação inicial lia `usuario.perfil` (campo inexistente). Coordenadores apareciam como "Professor".  
**Lição:** Checar `src/types/auth.ts` antes de usar campos do usuário. O campo correto é `tipo: TipoUsuario`.

#### D2.6 — Etapa "quem é você" removida
**Motivo:** O sistema já sabe quem está logado. `perfilParaTipo(usuario)` detecta automaticamente, exibe badge "Identificado como Professor(a)" na etapa 1.

### Status atual
- ✅ Formulário guiado completo (4 etapas, 2 modos)
- ✅ Impressão com cabeçalho da escola, marca d'água e page-break correto
- ⏳ Indexação do acervo clínico — aguardando organização do material da especialista

### Pipeline do acervo (fase futura)

```
Acervo digitalizado (PDFs, áudios, vídeos da especialista)
      ↓
Transcrição de áudios/vídeos (Whisper local)
      ↓
Chunking + embeddings BGE-M3
      ↓
Pinecone — índice separado: "acervo-inclusao"
      ↓
Busca vetorial filtrada por tipicidade + faixa etária
      ↓
Claude gera atividade baseada no acervo real da especialista
```

### Potencial de expansão
Produto SaaS independente — inclusão escolar é obrigação legal no Brasil desde 2015 (Lei Brasileira de Inclusão). O acervo clínico real é o diferencial que nenhum concorrente pode replicar.

---

## Segurança — todos os módulos

| Princípio | Implementação |
|---|---|
| Minimização de dados | Somente o mínimo necessário para cada pergunta é enviado à IA. CPF/RG só incluídos quando o perfil tem autorização explícita |
| Isolamento de segmento | EAD e Presencial isolados: filtro no cliente, RLS no banco, e validado no JWT server-side — inforjável |
| Anti-prompt injection | Bloco `<segurança>` no system prompt de todos os agentes, posicionado antes da pergunta do usuário |
| Dados pessoais vs. RAG | Dados de alunos nunca entram no índice Pinecone — apenas conteúdo pedagógico |
| Tool Use seguro | Agente Gabriela chama apenas funções predefinidas — nunca SQL livre. RLS é a última linha de defesa |
| Anthropic opt-out | Opt-out de uso para treinamento ativado. Nunca enviar combinações que identifiquem completamente uma pessoa |
| Limites server-side | Prompt máx 8.000 chars, payload total 50.000 chars, mensagem Gabriela 4.000 chars → HTTP 413 |

---

## Questão em aberto: MCP (Model Context Protocol)
**Levantado por: Lucas · Avaliado em: 2026-06-06**

MCP é o protocolo aberto da Anthropic que padroniza a forma de dar ferramentas e dados ao Claude — como uma interface USB universal. Um MCP Server expõe ferramentas; o Claude as usa sem código customizado por integração.

O que já construímos **é** MCP conceitualmente — só com implementação customizada via Tool Use em Edge Functions.

| Cenário | Recomendação |
|---|---|
| **Agora (1 escola, demo iminente)** | Manter Tool Use em Edge Functions — zero infraestrutura adicional |
| **Desenvolvimento local** | Configurar MCP Supabase no Claude Code — ganho imediato sem custo |
| **F7.4 (SaaS multi-escola)** | Migrar para MCP Server — o mesmo servidor serviria todas as escolas |

**Questão para Lucas:** Faz sentido estruturar as Edge Functions pensando na migração futura para MCP (interfaces bem definidas, ferramentas isoladas)?

---

## Resumo de decisões técnicas

| Decisão | Escolha | Alternativa descartada | Motivo |
|---|---|---|---|
| LLM principal | Claude Sonnet 4.5/4.6 | GPT-4o, Gemini | Superior em JSON estruturado, opt-out treinamento |
| LLM chat pedagógico | Claude Haiku 4.5 | Sonnet | Custo ~10x menor, qualidade vem dos chunks |
| OCR de PDFs | Claude Sonnet 4.6 (API) | pdf-lib + split | pdf-lib usava 4GB de RAM por PDF |
| OCR de imagens locais | Ollama gemma3:4b | Claude API | Custo zero, imagens de alta qualidade |
| Embeddings locais | BGE-M3 via Ollama | Voyage AI, OpenAI | Gratuito, 1024 dims, ótimo para PT-BR |
| Embeddings servidor | Pinecone Inference API (multilingual-e5-large) | Ollama remoto | Ollama inacessível de Edge Functions |
| Banco vetorial | Pinecone | pgvector | Tier gratuito, zero infraestrutura |
| RAG admin/secretaria | Tool Use + Supabase ao vivo | Pinecone | Dados operacionais mudam constantemente |
| Proxy API | Supabase Edge Function (Deno) | Backend Node próprio | Mesma infra, zero manutenção adicional |
| PDF output | HTML + CSS + window.print() | jsPDF, pdfmake | Qualidade gráfica superior, suporte PT-BR nativo |
| Segmento do usuário | JWT server-side | Payload do cliente | Inforjável criptograficamente |
| Limites de tokens | Por perfil/dia | Por escola global | Isola impacto de uso intenso individual |

---

## Pendências para decisão futura

| ID | Questão | Contexto |
|---|---|---|
| P1 | Adotar MCP Server para desenvolvimento local? | Supabase MCP já existe, custo zero |
| P2 | Quando indexar o acervo da Tia Maria José — quanto muda o comportamento? | Hoje usa só o prompt do Sonnet. O RAG do acervo seria o diferencial real |
| P3 | Agente Gabriela: migrar para MCP quando for multi-escola? | Decisão com impacto em F7.4 |
| P4 | Avatares finais Sofia e Tia Maria José: Firefly, Midjourney ou ilustrador? | Ver `docs/avatares-versao-final.md` |
| P5 | Agente de inclusão para responsável: mesmo formulário adaptado ou fluxo diferente? | Responsável tem menos contexto pedagógico — linguagem e perguntas devem mudar |

---

*Documento mantido pelo time de desenvolvimento · SynerEduc*  
*Para dúvidas ou revisões: jrsantosdev1@gmail.com*
