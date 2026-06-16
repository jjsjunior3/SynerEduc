# Colégio Conexão Maranhense — IA no Sistema Escolar
**SynerEduc · Documento técnico atualizado em 2026-06-06**

---

## O que estamos construindo

O sistema escolar do Colégio Conexão Maranhense está recebendo seis módulos de Inteligência Artificial:

| # | Módulo | Agente | Status |
|---|---|---|---|
| 1 | Geração de Histórico Escolar por IA | — | ✅ Em produção |
| 2 | Agente Pedagógico do Aluno | Professora Sofia | ✅ Em produção (RAG Pinecone) |
| 3 | Pipeline RAG — Material Didático | — | 🔄 Indexando (1ª série concluída) |
| 4 | Agente Administrativo | A nomear | 🔜 Próximo — sem dependências |
| 5 | Agente Psicopedagógico de Inclusão | Tia Maria José | 🔄 UI pronta, aguardando acervo |
| 6 | Agentes por perfil completo | — | 📋 Planejado (F5 ROADMAP) |

---

## Módulo 1 — Geração de Histórico Escolar por IA ✅

### O problema que resolve
Quando um aluno vem transferido de outra escola, a secretaria precisa digitalizar manualmente o histórico escolar em papel — processo que pode levar horas ou dias.

### Como funciona

```
Upload (PDF ou foto)
      ↓
Conversão Base64 no browser
      ↓
POST → supabase/functions/claude-proxy (Edge Function Deno)
      ↓
Anthropic API → Claude Sonnet 4.6 (visão de documento)
      ↓
Resposta JSON estruturada
      ↓
Normalização e coerção de tipos (frontend)
      ↓
Tela de revisão editável
      ↓
Confirmação → INSERT no Supabase
      ↓
Gerador HTML → impressão/PDF via window.print()
```

### Etapas técnicas

**Etapa 1 — Recepção e codificação**
O arquivo (PDF, JPG, PNG, WebP, máximo 10MB) é convertido para Base64 diretamente no browser via FileReader API. A Anthropic API exige documentos inline Base64 — evita URL temporária e reduz latência.

**Etapa 2 — Proxy seguro (Edge Function)**
O frontend nunca chama a Anthropic diretamente. A Edge Function hospedada no Supabase injeta a `ANTHROPIC_API_KEY` server-side e repassa à API. A chave nunca fica exposta no bundle JavaScript. Retry automático: até 3 tentativas com backoff linear (1s, 2s) para erros 429/529/5xx.

**Etapa 3 — Análise com Claude Sonnet 4.6**
- **Por que Sonnet e não Haiku:** Haiku falha em documentos antigos com caligrafia digitalizada ou scan de baixa qualidade.
- **Por que Sonnet e não Opus:** Qualidade equivalente para extração estruturada, custo 5x menor.
- **Por que Claude e não GPT-4o/Gemini:** Superior em JSON estrito, opt-out de uso para treinamento, tipo "document" interpreta PDFs paginados com mais precisão.
- Três prompts especializados: ficha histórica, boletim, histórico externo — cada um com instruções exatas para o tipo de documento.

**Etapa 4 — Normalização da resposta**
Normalizador TypeScript corrige variações do modelo (vírgula vs ponto decimal, casing, campos ausentes) antes de exibir ao usuário. Garante tipos corretos no banco independente da versão do modelo.

**Etapa 5 — Revisão humana obrigatória**
Todos os campos extraídos aparecem em formulário editável. Dados escolares têm validade legal — a revisão humana é o controle de qualidade insubstituível.

**Etapa 6 — Geração do documento oficial**
HTML + CSS otimizado para impressão A4, renderizado via `window.print()`. Disciplinas de todas as escolas são normalizadas por chave (`normKey` — uppercase sem acento), mescladas em tabela única. Por que não jsPDF/pdfmake: suporte limitado a PT-BR e layouts complexos; o browser produz qualidade gráfica superior.

---

## Módulo 2 — Professora Sofia (Agente Pedagógico) ✅

### O que é
Chat flutuante no canto inferior direito de todos os dashboards. A Professora Sofia responde dúvidas sobre o conteúdo dos livros didáticos da escola com base no material real indexado no Pinecone.

### Arquitetura

```
Pergunta do aluno/professor
      ↓
supabase.functions.invoke('chat-sofia')  ← JWT automático
      ↓
Edge Function valida JWT + extrai perfil
      ↓
Pinecone Inference API (multilingual-e5-large, 1024 dims)
  ← embedding da pergunta no servidor (Ollama inacessível de Edge Functions)
      ↓
Pinecone: busca 5 chunks mais relevantes
  · filtro: serie + disciplina (metadados)
      ↓
Claude Haiku 4.5 (custo mínimo, contexto de chat)
  ← system prompt da Professora Sofia + chunks do livro
      ↓
Resposta ao usuário
```

### Identidade
- Nome: **Professora Sofia**
- Personalidade: jovem, animada, paciente, usa emojis ocasionais
- Avatar: SVG cartoon — coque com laço vermelho, óculos roxos, blazer roxo, brincos de estrela
- Posição: canto inferior **direito**

### Status atual
- ✅ `ChatFlutuante.tsx` — chat com histórico (6 msgs), typing indicator, Enter/Shift+Enter
- ✅ `AvatarSofia.tsx` — SVG cartoon (demo; versão final por Firefly/Midjourney futuramente)
- ✅ Edge Function `chat-sofia` — em produção no Supabase
- ✅ Material 1ª série Biologia indexado (35 vetores, confirmado respondendo corretamente)
- 🔄 Demais séries em indexação

---

## Módulo 3 — Pipeline RAG: Material Didático 🔄

### O problema que resolve
A escola possui livros didáticos em PDF (escaneados como imagens) e imagens PNG. Para que a Professora Sofia consiga responder perguntas com base no conteúdo real dos livros, é necessário extrair o texto, transformar em vetores e armazenar em banco de busca vetorial.

### Arquitetura do pipeline

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
Pinecone  ← upsert com metadados (série, disciplina, bimestre)
```

### Decisões técnicas

**Por que Ollama local (gemma3:4b) e não Claude para OCR:**
Material em PNG de alta qualidade — imagens nítidas, fontes grandes, layout limpo. Modelos locais têm desempenho suficiente e custo zero. Claude fica reservado para PDFs escaneados de baixa qualidade.

**Por que Pinecone e não pgvector:**
Tier gratuito generoso (~2.000 vetores). Zero infraestrutura. Separação clara entre banco transacional e vetorial.

**Por que Pinecone Inference API nas Edge Functions:**
Edge Functions rodam em servidores remotos — `localhost:11434` (Ollama) é inacessível. A Pinecone Inference API (`multilingual-e5-large`, 1024 dims) é compatível com os vetores do BGE-M3 local e não exige infraestrutura adicional.

**Manutenção do computador durante indexação:**
O computador deve permanecer ligado. Modo de descanso (desligar só a tela) é permitido. Hibernação/suspensão interrompe o Ollama.

### Estrutura dos metadados no Pinecone

```json
{
  "serie": "1ª série",
  "disciplina": "Biologia",
  "bimestre": 1,
  "nome_arquivo": "screenshot_001.png",
  "chunk_index": 0,
  "texto": "primeiros 800 chars do chunk"
}
```

### Status atual
- ✅ 1ª série / Biologia / 1º bimestre — 35 vetores indexados, Sofia respondendo corretamente
- 🔄 Demais disciplinas da 1ª série em indexação
- ⏳ 2ª e 3ª série, Fundamental (6º-9º) aguardando

---

## Módulo 4 — Agente Administrativo (Secretaria · Financeiro · Gestor) 🔜

### O problema que resolve
Secretárias, gestores financeiros e gestores gerais precisam consultar dados do sistema rapidamente. Em vez de navegar por múltiplos painéis, fazem a pergunta em linguagem natural e recebem a resposta imediata com dados ao vivo do banco.

### Exemplos de perguntas

| Perfil | Pergunta | Dado consultado |
|---|---|---|
| Secretaria | "Quais alunos estão sem CPF cadastrado?" | `fichas_matricula` |
| Secretaria | "Lucas Silva tem acesso ao portal?" | `usuarios` |
| Financeiro | "Quem está inadimplente este mês?" | `financeiro_mensalidades` |
| Financeiro | "Qual a receita de maio?" | `financeiro_mensalidades` |
| Gestor | "Qual a média geral da 2ª série?" | `notas` |
| Gestor | "Qual turma tem mais faltas?" | `frequencias` |

### Por que é diferente da Professora Sofia

| | Professora Sofia | Agente Administrativo |
|---|---|---|
| Fonte | Pinecone (vetores de livros) | Supabase ao vivo (banco de dados) |
| Dados | Conteúdo pedagógico estático | Dados operacionais em tempo real |
| Técnica | RAG vetorial | Tool Use (SQL dirigido por IA) |
| Usuário | Aluno, professor | Secretaria, financeiro, gestor |

### Arquitetura — Tool Use loop

```
Pergunta em linguagem natural
      ↓
Edge Function 'agente-escolar'
  · valida JWT, extrai perfil e segmento
  · seleciona ferramentas disponíveis para o perfil
      ↓
Claude recebe: pergunta + tools disponíveis
      ↓
Claude chama tool(s) conforme necessário
      ↓
Edge Function executa query Supabase (com RLS ativo)
      ↓
Claude recebe resultado e formula resposta
      ↓
Resposta ao usuário
```

### Tools por perfil

**Secretaria:**
- `buscar_alunos(nome?, turma?)` — lista alunos com filtros
- `documentos_pendentes()` — alunos sem documentos obrigatórios
- `verificar_acesso_portal(nome_aluno)` — tem login ativo?
- `matriculas_recentes(dias?)` — novas matrículas

**Financeiro:**
- `inadimplentes(mes?, ano?)` — mensalidades vencidas
- `resumo_financeiro(mes?, ano?)` — receita total / pago / em aberto
- `historico_aluno(nome_aluno)` — pagamentos de um aluno específico

**Gestor Geral:**
- Todas as ferramentas acima +
- `desempenho_turma(serie?, segmento?)` — médias por série
- `frequencia_turma(turma?)` — % presença por turma
- `indicadores_escola()` — KPIs gerais (alunos ativos, inadimplência, médias)

### Segurança
- RLS do Supabase ativo em todas as queries — mesmo que Claude tente algo indevido, o banco rejeita
- Tools são predefinidas — Claude não executa SQL livre, apenas chama funções com parâmetros validados
- Segmento (EAD/Presencial) sempre filtrado pelo JWT, nunca pelo cliente

### Identidade visual
- Chat flutuante integrado ao dashboard de cada perfil
- Sem nome proprio (é um assistente operacional, não um personagem pedagógico)
- Ícone: `Bot` ou similar, cor neutra (slate/gray)

---

## Módulo 5 — Tia Maria José (Agente Psicopedagógico de Inclusão) 🔄

### A origem
Homenagem a Maria José, neuropsicopedagoga com quase 40 anos de experiência em pesquisa e atendimento de crianças com tipicidades. O agente carrega o nome e a missão dela — levar conhecimento clínico validado a professores e responsáveis que não têm acesso a esse suporte.

### O problema que resolve
- Professores sem formação em educação especial obrigados por lei a atender alunos com TDAH, TEA, dislexia, discalculia, entre outros
- Uma turma pode ter 5+ crianças atípicas — criar atividades adaptadas para cada uma toma horas
- Responsáveis sem orientação prática de como apoiar o filho em casa
- Psicopedagogos sobrecarregados — impossível atender todas as escolas pessoalmente

### Dois modos de geração (implementados)

| Modo | O que gera | Para quem |
|---|---|---|
| **Atividade/Avaliação Pronta** | Folha completa com exercícios reais, gabarito, pronta para imprimir e entregar | Professor (uso individual) |
| **Roteiro Inclusivo** | Guia para o professor conduzir a MESMA atividade com TODA a turma — todos participam, cada um do seu jeito | Professor (turma inteira) |

### Formulário guiado — 4 etapas

1. **Sobre a criança** — nome (opt.), idade, condição/atipicidade (múltipla escolha)
2. **Habilidade alvo** — o que desenvolver
3. **Modo de saída** — Atividade Pronta ou Roteiro Inclusivo + tipo de documento + disciplina + recursos + formato
4. **Observações** — contexto extra + resumo completo antes de gerar

### Impressão
- Cabeçalho com logo da escola
- Marca d'água (logo a 7% de opacidade, -30°)
- Questões com `page-break-inside: avoid` — não quebram entre páginas
- Gabarito ao final (para recortar antes de entregar ao aluno)

### Status atual
- ✅ `AgenteInclusao.tsx` — formulário guiado completo (4 etapas, 2 modos)
- ✅ `AvatarDonaMaria.tsx` — SVG cartoon (cabelo preto, jaleco branco)
- ✅ Edge Function `dona-maria` — em produção, Claude Sonnet 4.5
- ✅ Impressão com escola, marca d'água, page-break correto
- ⏳ Indexação do acervo clínico (arquivos da especialista) — aguardando organização do material

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
Produto SaaS independente — assinatura mensal por escola. Inclusão escolar é obrigação legal no Brasil desde 2015 (Lei Brasileira de Inclusão). O acervo clínico real é o diferencial que nenhum concorrente pode replicar.

---

## Segurança (todos os módulos)

**Minimização de dados:** Somente o mínimo necessário para cada pergunta é enviado à IA. CPF, RG e dados sensíveis só são incluídos quando o perfil tem autorização explícita.

**Isolamento de segmento:** EAD e Presencial são isolados em todos os agentes. Filtro aplicado no cliente, no RLS do banco e validado no JWT do servidor — inforjável criptograficamente.

**Proteção contra manipulação:** System prompts com blocos de segurança posicionados antes da pergunta do usuário. Tentativas de prompt injection são detectadas, recusadas e registradas.

**Dados pessoais vs. documentos:** Dados de alunos nunca entram no índice RAG. Material didático indexado no Pinecone não contém dados pessoais — apenas conteúdo pedagógico.

**Tool Use seguro:** O Agente Administrativo chama apenas funções predefinidas com parâmetros validados — nunca executa SQL livre. RLS do Supabase é a última linha de defesa.

**Anthropic:** Opt-out de uso para treinamento ativado. Estratégia de nunca enviar combinações que identifiquem completamente uma pessoa.

---

## Resumo de decisões técnicas

| Decisão | Escolha | Alternativa descartada | Motivo |
|---|---|---|---|
| LLM principal | Claude Sonnet 4.5/4.6 | GPT-4o, Gemini | Superior em JSON estruturado, opt-out treinamento |
| LLM chat pedagógico | Claude Haiku 4.5 | Sonnet | Custo mínimo para conversas simples |
| OCR de PDFs | Claude Sonnet 4.6 (API) | pdf-lib + split | pdf-lib usava 4GB de RAM por PDF |
| OCR de imagens locais | Ollama gemma3:4b | Claude API | Custo zero, imagens de alta qualidade |
| Embeddings locais | BGE-M3 via Ollama | Voyage AI, OpenAI | Gratuito, 1024 dims, ótimo para PT-BR |
| Embeddings servidor | Pinecone Inference API (multilingual-e5-large) | Ollama remoto | Ollama inacessível de Edge Functions |
| Banco vetorial | Pinecone | pgvector | Tier gratuito, zero infraestrutura |
| RAG admin/secretaria | Tool Use + Supabase ao vivo | Pinecone | Dados operacionais mudam constantemente |
| RAG documental (docs institucionais) | pg_trgm PostgreSQL | pgvector | Suficiente para volume escolar, custo zero |
| Proxy API | Supabase Edge Function (Deno) | Backend Node próprio | Mesma infra, zero manutenção adicional |
| PDF output | HTML + CSS + window.print() | jsPDF, pdfmake | Qualidade gráfica superior, suporte PT-BR nativo |
| Segmento do usuário | JWT server-side | Payload do cliente | Inforjável criptograficamente |
| Limite de tokens | Por perfil/dia | Por escola global | Isola impacto de uso intenso individual |

---

*Documento atualizado em 2026-06-06 · SynerEduc / Colégio Conexão Maranhense*
