# SynerEduc — Contexto do Projeto para IA e Co-fundadores

> **Para leitura técnica:** Este arquivo descreve o produto, as decisões tomadas, o estado atual e o que falta construir.
> Leitura complementar obrigatória: `docs/ANALISE_COMPLETA.md`, `docs/ROADMAP.md`, `docs/AGENTES_IA_DECISOES.md`

---

## O que é o SynerEduc

Sistema de gestão escolar com IA integrada, desenvolvido inicialmente para o **Colégio Conexão Maranhense** (São Luís/MA) e em processo de transformação em produto SaaS para escolas privadas do Brasil.

**Fundador:** José João Santos Júnior (Junior) — bacharel em Administração, empresário com 18 anos de experiência, fundador do Instituto SynerTech.

**Visão:** Plataforma SaaS de gestão escolar com IA nativa — gestão + pedagógico + administrativo + financeiro em um único sistema, acessível para escolas de pequeno e médio porte.

---

## Stack tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| UI Components | shadcn/ui (Radix UI) |
| Backend / Banco | Supabase (PostgreSQL + RLS + Auth) |
| Serverless | Supabase Edge Functions (Deno/TypeScript) |
| IA | Anthropic Claude (Sonnet 4.6 / Haiku 4.5) |
| Busca vetorial | Pinecone |
| OCR local | Ollama (gemma3:4b + BGE-M3) |
| Testes | Vitest (65/65 passando) |
| Build | Vite — output em `/build` |

---

## Situação atual (Junho/2026)

### Clientes ativos
- **Colégio Conexão Maranhense** — cliente fundador, em produção, Junior é sócio da escola (sem cobrança por enquanto, serve como laboratório)
- **Colégio Ariane** — 229 alunos, contrato fechado em R$1.490/mês (escola de porte médio)

### O que está funcionando em produção
- Sistema completo de gestão: matrículas, notas, frequência, comunicados, agenda, boletins, documentos, contratos, financeiro
- 10 perfis de usuário: aluno, professor, coordenador, secretaria, administrador, gestor_geral, financeiro, admin_presencial, professor_conteudista, responsável
- Suporte a dois segmentos: EAD e Presencial (isolados por RLS)
- **6 agentes de IA em produção:**
  - Professora Sofia (chat pedagógico com RAG Pinecone)
  - Tia Maria José (atividades inclusivas para crianças atípicas)
  - Gabriela (agente administrativa: secretaria, financeiro, gestor)
  - Histórico IA (digitalização de fichas e históricos por visão)
  - Plano de Aula IA (geração com RAG)
  - Assistente de Voz

### Segurança (auditoria realizada em Jun/2026)
- Todas as Edge Functions com JWT obrigatório
- RLS ativo em todas as tabelas
- 0 vulnerabilidades npm (audit limpo)
- Inputs com limites de caracteres (base components + server-side 413)
- MIME validation em uploads
- HTTP security headers configurados
- LGPD: consentimento na matrícula + Política de Privacidade publicada

---

## O que falta construir — prioridades

### 🔴 Crítico para SaaS (multi-tenant)

O sistema foi construído para **uma escola**. Para virar SaaS com N escolas, o principal trabalho de backend é:

1. **`escola_id` em todas as tabelas** — hoje o isolamento é por `segmento` (EAD/Presencial). Para multi-tenant real, cada escola precisa de um identificador próprio em todas as tabelas do banco.
2. **Onboarding automatizado** — hoje uma escola nova exige setup manual no Supabase. Precisa de fluxo automático de criação de escola, admin inicial e configurações.
3. **Billing integrado** — sem sistema de cobrança ainda. Contratos fechados manualmente.
4. **Dashboard de super-admin** — visão de todas as escolas, métricas globais, suporte.
5. **Isolamento de Storage** — buckets de arquivos precisam ser segregados por escola.

### 🟡 Importantes para crescimento

- Pipeline RAG completo (material didático das demais séries ainda em indexação)
- Acervo clínico da Tia Maria José (indexação de material da especialista)
- Portal do Responsável (ainda não implementado)
- Financeiro integrado com gateway de pagamento (Asaas)
- Virada de ano letivo automatizada

### 🟢 Qualidade e escala

- Rate limiting por escola nas Edge Functions
- Observabilidade (logs estruturados, métricas de uso de IA por escola)
- CI/CD pipeline
- Testes E2E
- Buckets de Storage como Private no Supabase

---

## Arquitetura de IA — decisões principais

Ver `docs/AGENTES_IA_DECISOES.md` para detalhes completos. Resumo:

- **Claude Sonnet 4.6** para extração de documentos e geração de conteúdo pedagógico complexo
- **Claude Haiku 4.5** para chat em tempo real (custo mínimo)
- **Pinecone** para busca vetorial (tier gratuito, zero infraestrutura)
- **Ollama local** para OCR de imagens de alta qualidade (custo zero)
- **Tool Use** no agente Gabriela — Claude chama funções predefinidas, nunca SQL livre
- Contexto de usuário sempre derivado do JWT, nunca do payload do cliente

---

## Estrutura de arquivos relevante

```
src/
  App.tsx                    — roteamento principal, 4 views: website/login/ava/politica
  components/                — ~55 componentes de UI
    ai/                      — 6 componentes de agentes IA
    ui/                      — shadcn/ui base components
  contexts/                  — AuthContext, ThemeContext
  hooks/                     — useSegmento, usePresence, useChatIA
  utils/                     — calculoNotas, authUtils, serieUtils, dateUtils (testados)
  types/auth.ts              — TipoUsuario e interfaces principais

supabase/
  functions/                 — 8 Edge Functions (Deno)
    agente-gabriela/         — agente administrativo com tool use
    chat-sofia/              — agente pedagógico com RAG
    claude-proxy/            — proxy seguro para Anthropic API
    extrair-ficha/           — OCR de fichas de matrícula
    gerar-plano-aula/        — geração de plano de aula com RAG
    dona-maria/              — agente de inclusão
    indexar-documento/       — indexação de PDFs no Pinecone
    interpretar-voz/         — transcrição de voz

docs/
  ROADMAP.md                 — backlog priorizado com status
  ANALISE_COMPLETA.md        — inventário completo v0.2.0 (Jun/2026)
  AGENTES_IA_DECISOES.md     — decisões técnicas de IA com raciocínio
  PRD.md                     — produto: usuários, fluxos, regras de negócio
  SKILLS_SUPABASE.md         — padrões de código Supabase
  SKILLS_REACT.md            — padrões de código React
  SKILLS_PATTERNS.md         — padrões gerais (PDF, toast, upload, etc.)
```

---

## Regras de desenvolvimento

1. **Nunca `select('*')`** em tabelas com CPF/RG — selecionar apenas campos necessários
2. **Queries separadas** em vez de joins com FK nomeada — joins falham silenciosamente no PostgREST
3. **Segmento sempre filtrado** em queries de `users`, `notas`, `fichas_matricula`, `disciplinas`, `series`
4. **JWT obrigatório** em todas as Edge Functions — contexto do usuário vem do JWT, nunca do body
5. **Datas:** usar `dateUtils.ts` para evitar bug UTC-3
6. **Dark mode:** via `ThemeContext`, não via prop `darkMode`
7. **Navegação:** sem React Router — `viewAtual` state dentro de cada Dashboard
8. **Sem `window.confirm`** — usar `AlertDialog` do shadcn/ui
9. **Testes:** rodar `npm run test:run` antes de qualquer deploy (65/65 devem passar)

---

## Modelo de negócio

**SaaS por número de alunos:**

| Faixa | Alunos | Mensalidade |
|---|---|---|
| Pequena | até 200 | R$ 890/mês |
| Média | 201–500 | R$ 1.490/mês |
| Grande | 501–1.000 | R$ 2.290/mês |
| Extra | acima de 1.000 | negociação |

**Taxas únicas:** Implantação R$1.500–2.500 · Migração de dados R$500–1.000

**Concorrentes diretos:** Escola na Nuvem (R$300–600, gestão básica), Lyceum/TOTVS (R$1.500–5.000, ERP). O SynerEduc é o único que combina gestão completa + IA nativa nessa faixa de preço.

---

## Contexto societário

- Produto desenvolvido pelo fundador (Junior) com auxílio de IA (Claude Code)
- Em processo de formalização como empresa SaaS independente (novo CNPJ)
- Busca co-fundador técnico (CTO) para arquitetura multi-tenant e escala
- Visão de expansão para mercado americano (EB-2 NIW — EdTech + IA)
