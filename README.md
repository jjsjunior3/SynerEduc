# SynerEduc — Repositório Privado

Plataforma de gestão escolar em produção no **Colégio Conexão Maranhense**, São Luís/MA.  
Stack: **React 18 + TypeScript + Vite + Supabase + Tailwind CSS v4**

> ⚠️ Este repositório contém código em produção com dados reais de alunos.  
> Toda alteração deve ser feita em branch separada — **nunca commitar direto na `main`**.

---

## Pré-requisitos

- Node.js 18+
- npm ou yarn
- Acesso ao projeto no Supabase (solicitar ao responsável)

---

## Configuração local

### 1. Clonar o repositório

```bash
git clone https://github.com/jjsjunior3/Ava_ConexaoEAD.git
cd Ava_ConexaoEAD
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
Ava_ConexaoEAD/
├── public/
│   └── logo-colegio-conexao.png   # Logo da escola — usada nos PDFs
├── src/
│   ├── components/                # Todos os componentes React
│   ├── contexts/                  # AuthContext, ThemeContext
│   ├── hooks/                     # useSegmento, usePresence, etc.
│   ├── supabase/
│   │   └── supabaseClient.ts      # Cliente único do Supabase
│   ├── types/                     # Tipos TypeScript globais
│   ├── utils/                     # Funções utilitárias (cálculo de notas, datas)
│   └── App.tsx                    # Navegação principal via useState
├── .env                           # Variáveis de ambiente (não commitar)
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
| [`docs/ANALISE_COMPLETA.md`](docs/ANALISE_COMPLETA.md) | Mapa técnico de todos os 57 componentes + 15 bugs |
| [`docs/SKILLS_SUPABASE.md`](docs/SKILLS_SUPABASE.md) | Padrões de uso do Supabase neste projeto |
| [`docs/SKILLS_REACT.md`](docs/SKILLS_REACT.md) | Convenções de React/TypeScript |
| [`docs/SKILLS_PATTERNS.md`](docs/SKILLS_PATTERNS.md) | Padrões gerais (dark mode, PDF, toast, segmento) |

---

## Contato

**José João Santos Júnior** — responsável pelo projeto  
Dúvidas sobre regras de negócio ou acesso ao Supabase: falar diretamente com o responsável.

---

*SynerEduc — Sistema de Gestão Escolar © 2026*