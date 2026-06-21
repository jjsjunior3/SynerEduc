# SynerEduc

Plataforma SaaS de gestão escolar com IA integrada para escolas privadas do Brasil.  
Em produção no **Colégio Conexão Maranhense** (São Luís/MA) e **Colégio Ariane** (229 alunos).

Stack: **React 18 + TypeScript + Vite + Supabase (PostgreSQL) + Tailwind CSS + Anthropic Claude**

> ⚠️ Este repositório contém código em produção com dados reais de alunos.  
> Toda alteração deve ser feita em branch separada — **nunca commitar direto na `master`**.

---

## Pré-requisitos

- Node.js 18+
- npm ou yarn
- Acesso ao projeto no Supabase (solicitar ao responsável)

---

## Configuração local

### 1. Clonar o repositório

```bash
git clone https://github.com/jjsjunior3/SynerEduc.git
cd SynerEduc
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
VITE_SUPABASE_URL=sua_url_aqui
VITE_SUPABASE_ANON_KEY=sua_chave_aqui
```

> As credenciais do Supabase devem ser solicitadas ao responsável do projeto.  
> Nunca commitar o arquivo `.env` — ele já está no `.gitignore`.

### 4. Rodar localmente

```bash
npm run dev
```

Acesse: `http://localhost:5173`

---

## Estrutura do projeto

```
SynerEduc/
├── public/
│   └── logo-colegio-conexao.png     # Logo da escola — usada nos PDFs
├── src/
│   ├── components/                  # ~55 componentes React
│   │   ├── ai/                      # Recursos de IA: ChatFlutuante, ChatGabriela,
│   │   │                            #   AgenteInclusao, AssistenteVoz, avatares
│   │   └── ui/                      # shadcn/ui: Button, Input, Dialog, etc.
│   ├── contexts/                    # AuthContext, ThemeContext
│   ├── hooks/                       # useSegmento, usePresence, useChatIA
│   ├── supabase/
│   │   └── supabaseClient.ts        # Cliente único do Supabase (nunca duplicar)
│   ├── types/auth.ts                # TipoUsuario, Usuario e interfaces globais
│   ├── utils/                       # calculoNotas, authUtils, serieUtils, dateUtils
│   └── App.tsx                      # Roteamento: website / login / ava / politica
├── supabase/
│   └── functions/                   # 8 Edge Functions (Deno/TypeScript)
│       ├── agente-gabriela/         # Agente com Tool Use (secretaria/financeiro/gestor)
│       ├── chat-sofia/              # RAG chatbot pedagógico (Pinecone)
│       ├── claude-proxy/            # Proxy seguro para Anthropic API
│       ├── extrair-ficha/           # OCR de fichas de matrícula
│       ├── gerar-plano-aula/        # Geração de plano de aula com RAG
│       ├── dona-maria/              # Geração de atividades inclusivas
│       ├── indexar-documento/       # Indexação de PDFs no Pinecone
│       └── interpretar-voz/         # Speech-to-text + interpretação
├── docs/                            # Documentação técnica (ver tabela abaixo)
├── scripts/
│   └── indexar-imagens-locais.ts    # Pipeline RAG local (Ollama + Pinecone)
├── CLAUDE.md                        # Contexto técnico completo do projeto
├── .env                             # Variáveis de ambiente (não commitar)
├── vite.config.ts
└── package.json
```

---

## Regras críticas do projeto

Leia antes de codar qualquer coisa.

### Navegação
```
Sem React Router. Toda navegação é via useState(currentView) no App.tsx.
Nunca instalar react-router-dom.
```

### Supabase
```typescript
// Sempre importar o cliente existente — nunca criar um segundo
import { supabase } from '../supabase/supabaseClient';

// fichas_matricula.segmento tem inconsistências de case
// SEMPRE usar .ilike(), nunca .eq()
.ilike('segmento', 'presencial')

// DELETE silencioso — RLS pode bloquear sem retornar erro
// Sempre checar count após delete
const { count } = await supabase.from('tabela').delete().eq('id', id);
if (count === 0) toast.error('Não foi possível excluir.');
```

### Datas — bug UTC-3
```typescript
// CORRETO — sempre com horário meio-dia
const data = new Date(ano, mes - 1, dia, 12, 0, 0);

// ERRADO — pode retornar o dia anterior no Brasil
const data = new Date('2026-05-22');
```

### Dark mode
```
Sempre variáveis CSS: bg-background, text-foreground, border-border
Nunca: bg-white, text-black, #ffffff hardcoded
```

### PDFs
```
Boletins e documentos → window.print() via HTML
Relatórios multi-página → jsPDF
Nunca misturar os dois no mesmo componente
```

### Notificações
```typescript
import { toast } from 'sonner';
toast.success('Mensagem de sucesso');
toast.error('Mensagem de erro');
// Nunca usar alert()
```

---

## Fluxos de negócio críticos

### Agenda (Professor → Coordenador → Aluno)
```
1. Professor lança agenda  →  status: 'pendente'
2. Coordenador revisa      →  status: 'enviado'  (ou exclui)
3. Aluno visualiza         →  só agendas com status: 'enviado'
```

### Frequência por aula
```
Cada aula do dia é registrada separadamente.
Professor com 3 aulas faz 3 registros distintos — nunca agrupados.
Status: 'presente' | 'ausente' | 'atrasado' | 'evadido'
```

### Desempenho (boletim / gráficos)
```
Durante o ano letivo → usar faixas de desempenho:
  Bom      ≥ 7,0
  Atenção  5,0 – 6,9
  Em Risco < 5,0

Label "Reprovado" só após todos os 4 bimestres serem lançados.
```

### Isolamento de segmento
```
Coordenador EAD      → vê APENAS dados do segmento 'ead'
Coordenador Presencial → vê APENAS dados do segmento 'presencial'
Administrador / Gestor → vê ambos os segmentos

Filtro obrigatório em todas as queries: .eq('segmento', segmento)
Exceção fichas_matricula: .ilike('segmento', `%${segmento}%`)
```

---

## Segmentos de ensino

O sistema tem dois segmentos isolados. Cada usuário pertence a um deles.

```
EAD        → banco: 'ead'
Presencial → banco: 'presencial'
```

O isolamento é garantido por RLS no Supabase e pelo hook `useSegmento` no frontend.  
Um usuário de um segmento **não consegue ver dados do outro** — nem via interface nem via API.

```typescript
// Hook disponível em qualquer componente
import { useSegmento } from '../hooks/useSegmento';

const { segmento, isEAD, isPresencial } = useSegmento();
```

---

## Fluxo de trabalho

### Criar uma nova feature

```bash
# 1. Sempre partir da main atualizada
git checkout main
git pull

# 2. Criar branch com nome descritivo
git checkout -b feature/nome-da-feature

# 3. Desenvolver e testar localmente

# 4. Commitar com mensagem clara
git add .
git commit -m "feat: descrição do que foi feito"

# 5. Enviar para o repositório
git push origin feature/nome-da-feature
```

### Padrão de commit messages

```
feat: nova funcionalidade
fix: correção de bug
docs: alteração em documentação
refactor: refatoração sem mudança de comportamento
style: ajuste visual sem mudança de lógica
```

### Antes de qualquer alteração em produção

- [ ] Testar localmente com dados reais do `.env`
- [ ] Verificar que não quebrou nenhum outro perfil de acesso
- [ ] Conferir dark mode
- [ ] Confirmar que PDFs ainda funcionam se o componente foi alterado

---

## Perfis de acesso para teste local

| Perfil | Como testar |
|--------|-------------|
| `administrador` | Login com usuário administrador |
| `admin_presencial` | Login com usuário admin_presencial |
| `coordenador` | Testar nos dois segmentos (EAD e Presencial) |
| `professor` | Testar nos dois segmentos |
| `aluno` | Testar nos dois segmentos |
| `secretaria` | Login com usuário secretaria |
| `financeiro` | Login com usuário financeiro |

---

## Documentação interna

| Documento | Descrição |
|-----------|-----------|
| [`docs/PRD.md`](docs/PRD.md) | Requisitos de produto — o "porquê" da plataforma |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Backlog priorizado — bugs e próximas features |
| [`CLAUDE.md`](CLAUDE.md) | **Leia primeiro** — contexto técnico completo: stack, banco, segurança, o que falta para SaaS |
| [`docs/ANALISE_COMPLETA.md`](docs/ANALISE_COMPLETA.md) | Inventário técnico v0.2.0: 90+ arquivos, todos os componentes, Edge Functions, testes |
| [`docs/AGENTES_IA_DECISOES.md`](docs/AGENTES_IA_DECISOES.md) | Decisões técnicas dos recursos de IA com raciocínio detalhado |
| [`docs/SKILLS_SUPABASE.md`](docs/SKILLS_SUPABASE.md) | Padrões de uso do Supabase neste projeto |
| [`docs/SKILLS_REACT.md`](docs/SKILLS_REACT.md) | Convenções de React/TypeScript |
| [`docs/SKILLS_PATTERNS.md`](docs/SKILLS_PATTERNS.md) | Padrões gerais (dark mode, PDF, toast, segmento) |

---

## Perfis de acesso e testes

| Perfil | Acesso |
|--------|--------|
| `administrador` | Visão global + monitoramento de IA |
| `gestor_geral` | KPIs + agente Gabriela |
| `coordenador` | Boletins, agenda, frequência, planos de aula |
| `professor` | Notas, atividades, frequência, plano de aula IA |
| `secretaria` | Matrículas, documentos, importação por IA |
| `financeiro` | Mensalidades, despesas, agente Gabriela |
| `aluno` | Material, atividades, boletim, chat Sofia |
| `admin_presencial` | Dashboard do segmento presencial |

Cada perfil deve ser testado nos dois segmentos (EAD e Presencial) onde aplicável.

---

## Contato

Dúvidas sobre regras de negócio ou acesso ao Supabase: falar diretamente com o responsável do projeto.

---

*SynerEduc — Plataforma SaaS de Gestão Escolar com IA © 2026*