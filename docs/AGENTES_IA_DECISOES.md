# Registro de Decisões — Módulos de IA do SynerEduc
**Para revisão técnica · Destinatário: Lucas**  
**Última atualização: 2026-06-06**

> Este documento registra cada decisão técnica tomada no desenvolvimento dos agentes de IA,
> com o raciocínio por trás de cada escolha. O objetivo é permitir avaliação crítica posterior
> e rastreabilidade das decisões.

---

## Contexto do projeto

**SynerEduc** é o sistema de gestão escolar do Colégio Conexão Maranhense (escola privada, São Luís/MA).  
Stack: React + TypeScript + Vite + Supabase (banco PostgreSQL + Edge Functions Deno) + Tailwind.  
Infraestrutura de IA: Anthropic Claude + Pinecone + Ollama local.

---

## Agente 1 — Professora Sofia
**Chat pedagógico sobre material didático**  
Implementado em: 2026-06-05/06

### O que faz
Chat flutuante (canto inferior direito) em todos os dashboards. Responde dúvidas sobre o conteúdo dos livros didáticos da escola, com base no material real indexado em banco vetorial.

### Decisões técnicas

#### D1.1 — Embeddings na Edge Function: Pinecone Inference API, não Ollama
**Decisão:** Usar `multilingual-e5-large` via Pinecone Inference API para gerar embeddings das perguntas nas Edge Functions.  
**Alternativa descartada:** Ollama local (`bge-m3`, 1024 dims).  
**Motivo:** Edge Functions da Supabase rodam em servidores remotos da Supabase — não conseguem alcançar `localhost:11434` onde o Ollama roda. Descoberto empiricamente com erro `fetch failed`.  
**Trade-off:** Os vetores dos livros foram gerados com BGE-M3 (1024 dims) via Ollama. O `multilingual-e5-large` da Pinecone também gera 1024 dims e é compatível semanticamente. Testado e funcionando — Sofia respondeu corretamente sobre coloides com material real do livro.  
**Custo:** Gratuito no tier atual do Pinecone.

#### D1.2 — Modelo LLM: Claude Haiku 4.5
**Decisão:** `claude-haiku-4-5-20251001` para o chat da Sofia.  
**Alternativa descartada:** Claude Sonnet.  
**Motivo:** Chat pedagógico com contexto dos livros — qualidade do Haiku é suficiente para reformular trechos e responder perguntas de aluno. Custo ~10x menor que Sonnet. A qualidade real vem dos chunks do livro, não da capacidade de raciocínio do modelo.

#### D1.3 — Autenticação: supabase.functions.invoke() em vez de fetch manual
**Decisão:** Usar o cliente Supabase do React para chamar a Edge Function.  
**Alternativa descartada:** `fetch()` manual com header `Authorization: Bearer <token>`.  
**Motivo:** `supabase.functions.invoke()` injeta o JWT do usuário logado automaticamente. A abordagem manual exigia `VITE_SUPABASE_ANON_KEY` no `.env.local`, que estava faltando — causou erros `fetch failed` que levaram tempo para diagnosticar.  
**Lição:** Sempre preferir a abstração do cliente Supabase para Edge Functions autenticadas.

#### D1.4 — Componente de chat: elementos nativos em vez de componentes UI
**Decisão:** `<textarea>` nativo e `<div>` com `ref` para scroll, em vez de `<Textarea>` e `<ScrollArea>` da biblioteca de UI.  
**Alternativa descartada:** Componentes da `shadcn/ui`.  
**Motivo:** Os componentes UI da biblioteca usam `React.forwardRef` internamente — ao tentar passar `ref` para eles diretamente, o React emitia warnings de `forwardRef`. Os elementos nativos aceitam `ref` sem problema.  
**Impacto:** Nenhum visual — aparência idêntica, apenas CSS do Tailwind.

#### D1.5 — Markdown no chat: parser mínimo próprio, sem biblioteca
**Decisão:** Função `MarkdownSimples` que parseia `**negrito**` e quebras de linha manualmente.  
**Alternativa descartada:** `react-markdown`, `marked`.  
**Motivo:** Claude retorna respostas com negrito e parágrafos. Importar uma biblioteca de markdown completa seria ~50KB para renderizar dois padrões. A função tem 15 linhas e cobre 100% do que o Claude gera nesse contexto.

---

## Agente 2 — Tia Maria José
**Geração de atividades/avaliações adaptadas para crianças atípicas**  
Homenagem a Maria José, neuropsicopedagoga, mãe do fundador.  
Implementado em: 2026-06-05/06

### O que faz
Formulário guiado em 4 etapas que coleta o perfil da criança (condição, habilidade alvo, recursos) e gera um documento completo via Claude Sonnet — pronto para imprimir e entregar ao aluno ou aplicar com a turma.

### Decisões técnicas

#### D2.1 — Dois modos de geração no mesmo agente
**Decisão:** `modoSaida: 'atividade_pronta' | 'instrucao_inclusiva'` — seleção na etapa 3 do formulário.  
**Contexto:** Insight do usuário: inclusão real não é dar uma folha diferente ao aluno atípico — é criar uma atividade onde todos participam juntos. Isso levou à criação do modo "Roteiro Inclusivo".  
**Implementação:** Mesmo Edge Function (`dona-maria`), dois prompts distintos (`buildPromptAtividadePronta` e `buildPromptInclusiva`). A escolha do prompt é feita com base em `form.modoSaida`.  
**Trade-off:** Poderia ser dois agentes separados. Mantemos em um por simplicidade — mesma autenticação, mesmo fluxo de formulário.

#### D2.2 — Modelo LLM: Claude Sonnet 4.5
**Decisão:** `claude-sonnet-4-5` para o agente de inclusão.  
**Alternativa descartada:** Haiku.  
**Motivo:** Geração de atividades pedagógicas adaptadas exige raciocínio clínico real — adaptar exercícios para TEA é diferente de adaptar para dislexia, e o Haiku confundia as especificidades. O Sonnet mantém consistência pedagógica mesmo com prompts longos e detalhados.  
**Custo vs. qualidade:** Justificado — o resultado vai direto para a mão de uma criança atípica. Qualidade aqui não é opcional.

#### D2.3 — Impressão: janela dedicada em vez de window.print() direto
**Decisão:** `imprimirAtividade()` abre `window.open('', '_blank')` com HTML completo e chama `print()` nessa janela.  
**Alternativa descartada:** `window.print()` direto na página.  
**Motivo:** `window.print()` imprimiria toda a página do sistema (menus, sidebar, header). A janela dedicada tem apenas o documento — cabeçalho da escola, atividade, gabarito.

#### D2.4 — Parser markdown para impressão: função própria linha a linha
**Decisão:** `markdownParaHtml()` — parser linha a linha que detecta `##`, `---`, `**negrito**` e gera HTML semântico.  
**Problema que motivou:** O output do Claude continha `## EXERCÍCIO 1 - TÍTULO` e `---` sendo renderizados como texto literal na janela de impressão (o HTML só tinha `.replace(/\n/g, '<br/>')`).  
**Solução:** Headers `##` viram `<div class="questao">` com `page-break-inside: avoid` — questões não quebram entre páginas. Separadores `---` viram `<hr>`. Linhas vazias viram `<div style="height:5px">`.  
**Resultado:** PDF de 4 páginas com layout limpo, questões intactas.

#### D2.5 — page-break-inside: avoid por bloco de questão
**Decisão:** Cada questão (`##`) é envolta em `<div class="questao">` com `page-break-inside: avoid; break-inside: avoid`.  
**Motivo:** Sem isso, uma questão pode ter o enunciado na página 2 e as opções de resposta na página 3 — ilegível para crianças atípicas.  
**Complemento no CSS de impressão:** `@media print { .questao { page-break-inside: avoid; break-inside: avoid; } }` para garantir que o browser respeite em todos os motores de renderização de impressão.

#### D2.6 — Detecção de perfil: usuario.tipo, não usuario.perfil
**Decisão:** `perfilParaTipo()` lê `usuario.tipo` (campo real no banco).  
**Bug corrigido:** A implementação inicial lia `usuario.perfil` — campo que não existe no tipo `UsuarioLogado`. Resultado: coordenadores eram identificados como "Professor" no formulário.  
**Lição:** Sempre checar `src/types/auth.ts` antes de usar campos do usuário logado. O campo correto é `tipo: TipoUsuario` ('professor' | 'coordenador' | 'responsavel' | etc).

#### D2.7 — Remoção da etapa "quem é você"
**Decisão:** Formulário começa na etapa 1 (sobre a criança), sem etapa 0 pedindo o perfil.  
**Contexto:** Implementação inicial tinha uma etapa 0 perguntando "Você é professor, coordenador ou responsável?". O usuário apontou: o sistema já sabe quem está logado.  
**Implementação:** `perfilParaTipo(usuario)` detecta automaticamente, exibe badge "Identificado como Professor(a)" na etapa 1. Formulário passa de 5 para 4 etapas.

---

## Pipeline de Indexação — Material Didático
**Livros da escola em Pinecone para a Professora Sofia**  
Implementado em: 2026-06-05/06

### Decisões técnicas

#### D3.1 — OCR local: Ollama gemma3:4b, não Claude API
**Decisão:** `gemma3:4b` via Ollama para extrair texto das imagens PNG dos livros.  
**Alternativa considerada:** Claude Sonnet (API paga).  
**Motivo:** Material em PNG de alta qualidade — imagens nítidas, fontes grandes, layout limpo. O modelo local tem desempenho suficiente e custo zero. Claude fica reservado para PDFs escaneados de baixa qualidade.  
**Resultado prático:** 35 vetores indexados com sucesso para 1ª série Biologia.

#### D3.2 — Formato do payload Ollama: campo images[], não content array
**Problema:** Erro `json: cannot unmarshal array into Go value of type string` ao enviar base64 para o Ollama.  
**Causa:** Implementação inicial usava formato OpenAI (`content: [{ type: 'image_url', ... }]`). O Ollama usa formato próprio: `{ role, content: "string", images: ["base64..."] }`.  
**Lição:** Ollama e OpenAI têm APIs de visão incompatíveis apesar de parecerem similares.

#### D3.3 — BATCH_IMAGENS = 2 (reduzido de 5)
**Decisão:** Processar 2 imagens em paralelo por vez, não 5.  
**Motivo:** Com 3 terminais em paralelo e batch de 5, o Ollama recebia ~15 requisições simultâneas de OCR — sobrecarga causava `fetch failed` em todas.  
**Solução completa:** BATCH=2 + AbortController com timeout de 180s + retry 3x com espera 15/30/45s.

#### D3.4 — IDs Pinecone: toAsciiId() com normalização NFD
**Problema:** Erro Pinecone "Vector ID must be ASCII" ao indexar livros com nomes como "1ª série", "Biologia 2º bimestre".  
**Solução:** `toAsciiId()`:
```typescript
texto.normalize('NFD')
     .replace(/[̀-ί]/g, '')  // remove diacríticos
     .replace(/[ªº]/g, '')             // remove ordinais
     .replace(/[^a-zA-Z0-9_\-]/g, '_') // substitui resto por _
```
**Por que NFD:** NFD decompõe "é" em "e" + acento combining — o replace seguinte remove o acento, deixando "e". Mais confiável que uma tabela de substituição manual.

#### D3.5 — Normalização volume → bimestre
**Problema:** Material organizado por volume (1-24+). A 2ª série tem volumes 13-24 — volume 13 estava sendo mapeado para "5º bimestre" (inexistente).  
**Fórmula correta:** `Math.ceil(((volume - 1) % 12 + 1) / 3)`  
**Lógica:** `(volume-1) % 12` normaliza qualquer volume para 0-11. +1 torna 1-12. Dividir por 3 e arredondar para cima dá bimestres 1-4.

#### D3.6 — Computador: não pode hibernar durante indexação
**Contexto:** Usuário deixou o computador entrar em hibernação durante a noite. O Ollama parou, todos os processos de indexação falharam.  
**Solução:** Modo de descanso (desligar tela) é permitido. Hibernação e suspensão não. Configurar "Nunca hibernar" no painel de energia durante a indexação.

---

## Questão em aberto: MCP (Model Context Protocol)
**Levantado por: Lucas**  
**Avaliado em: 2026-06-06**

### O que é MCP
Protocolo aberto da Anthropic que padroniza a forma de dar ferramentas e dados ao Claude. Define uma interface universal (como USB) — um MCP Server expõe ferramentas, o Claude as usa sem código customizado para cada integração.

### Avaliação para o SynerEduc

**MCP no desenvolvimento (viável agora, custo zero):**
Existe um MCP Server oficial da Supabase. Plugar no Claude Code permitiria ao Claude consultar o banco de dados real durante o desenvolvimento — útil para escrever queries certas, entender o schema, validar dados.

**MCP em produção (agentes para usuários):**
Para o agente da secretaria rodar no browser, o MCP Server precisaria estar hospedado em um servidor acessível. Isso adiciona infraestrutura (hosting, deploy, manutenção) que as Edge Functions da Supabase já resolvem sem custo adicional.

### Comparação com a abordagem atual (Tool Use em Edge Functions)

Conceitualmente, o que já construímos **é** MCP — só que com uma implementação customizada. O Tool Use do Claude com funções predefinidas na Edge Function implementa o mesmo padrão: Claude decide qual "ferramenta" chamar, a função executa, o resultado volta para o Claude.

A diferença é padronização vs. customização:
- **MCP:** Padrão universal, reaproveitável entre projetos/escolas
- **Tool Use customizado:** Mais controle, sem dependência de protocolo externo

### Recomendação para Lucas avaliar

| Cenário | Recomendação |
|---|---|
| **Agora (1 escola, demo iminente)** | Manter Tool Use em Edge Functions — zero infraestrutura adicional |
| **Desenvolvimento local** | Configurar MCP Supabase no Claude Code — ganho imediato sem custo |
| **F7.4 (SaaS multi-escola)** | Migrar para MCP Server — o mesmo servidor serviria todas as escolas sem reescrever a lógica |

**Questão para Lucas:** Faz sentido já estruturar o código das Edge Functions pensando na migração futura para MCP (interfaces bem definidas, ferramentas isoladas)? Ou a refatoração quando chegar nessa fase será natural?

---

## Estado atual dos módulos (2026-06-06)

| Módulo | Componente | Edge Function | Status |
|---|---|---|---|
| Histórico IA | `ArquivoHistorico.tsx`, `ArquivoMorto.tsx` | `claude-proxy` | ✅ Produção |
| Professora Sofia | `ChatFlutuante.tsx`, `AvatarSofia.tsx` | `chat-sofia` | ✅ Produção |
| Tia Maria José | `AgenteInclusao.tsx`, `AvatarDonaMaria.tsx` | `dona-maria` | ✅ Produção (sem acervo) |
| Pipeline Pinecone | `scripts/indexar-imagens-locais.ts` | — | 🔄 Rodando |
| Agente Administrativo | — | — | 📋 Planejado |

---

## Pendências para decisão futura

| ID | Questão | Contexto |
|---|---|---|
| P1 | Adotar MCP Server para desenvolvimento local? | Supabase MCP já existe, custo zero |
| P2 | Quando indexar o acervo da Tia Maria José muda o comportamento do agente? | Hoje usa só o prompt do Claude Sonnet — o RAG do acervo seria o diferencial real |
| P3 | Agente administrativo: Tool Use customizado ou MCP desde o início? | Decisão arquitetural com impacto no F7.4 |
| P4 | Avatares finais Sofia e Tia Maria José: Firefly, Midjourney ou ilustrador? | Ver `docs/avatares-versao-final.md` |
| P5 | Agente de inclusão para responsável: mesmo formulário adaptado ou fluxo diferente? | Responsável tem menos contexto pedagógico — linguagem e perguntas devem mudar |

---

*Documento mantido pelo time de desenvolvimento · SynerEduc*  
*Para dúvidas ou revisões: jrsantosdev1@gmail.com*
