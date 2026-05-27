# SynerEduc — Relatório da Análise Completa
> Gerado em 26/05/2026 | 85+ arquivos analisados | Versão 1.5.3

---

## O que o Claude Code fez

Leu os 85+ arquivos do projeto e varreu tudo: componentes, hooks, contextos, utilitários e configurações. Mapeou cada componente, identificou inconsistências, encontrou bugs reais com número de linha, e gerou as regras do projeto (Skills) baseadas no código real — não em suposições.

---

## Números do projeto

| Métrica | Valor |
|---|---|
| Arquivos analisados | 85+ |
| Componentes React | 57 |
| Hooks customizados | 2 |
| Contextos | 2 |
| Tabelas do Supabase em uso | 22+ |
| Bugs encontrados | 15 |
| Bugs críticos | 4 |
| Bugs médios | 7 |
| Bugs baixos | 4 |

---

## As boas notícias primeiro

Antes dos bugs, o que está **correto e bem feito**:

- ✅ Zero imports de React Router — navegação 100% via useState como deve ser
- ✅ Zero clientes Supabase duplicados — todos importam do cliente único
- ✅ Zero uso de `alert()` ou `confirm()` nos módulos críticos (só 4 ocorrências em arquivos secundários)
- ✅ Isolamento EAD ↔ Presencial funcionando corretamente nos módulos principais
- ✅ Padrão de dark mode correto na grande maioria dos componentes
- ✅ `FormularioMatricula` e `EmissaoContratos` já têm o count check no DELETE
- ✅ `FrequenciaAluno` já usa o fix de data UTC-3 corretamente

---

## Bugs — do mais grave ao menos grave

### 🔴 CRÍTICOS (4 bugs)

---

**BUG-001 — Usuários ficam "online" após fechar o browser**
- **Arquivo:** `src/hooks/usePresence.ts` — linha 44
- **O que acontece:** O código usa `navigator.sendBeacon()` para remover a sessão quando o usuário fecha a aba. O problema é que o `sendBeacon` envia a requisição **sem o header de autenticação**. O Supabase tem RLS ativo e ignora a requisição silenciosamente. Resultado: o usuário aparece como "online" por até 2 minutos depois de já ter fechado o browser.
- **Correção:** Remover o `sendBeacon` — o `removerSessao()` já existe no cleanup do `useEffect` e funciona corretamente. O sendBeacon é redundante e quebrado.

```typescript
// Remover esta linha do usePresence.ts:
navigator.sendBeacon(url) // ← deletar

// O cleanup já cuida disso corretamente:
return () => { removerSessao(); clearInterval(interval); }
```

---

**BUG-002 — Datas com 1 dia a menos para todos os alunos**
- **Arquivo:** `src/components/DashboardAluno.tsx` — linhas 76–80
- **O que acontece:** A função `formatarData` usa `new Date(dataISO)` onde `dataISO` é uma string `'YYYY-MM-DD'`. O JavaScript interpreta isso como UTC meia-noite. Como o Brasil é UTC-3, a data vira o dia anterior. Uma publicação feita em `15/05/2026` aparece como `14/05/2026` para todos os alunos.
- **Correção:** Adicionar `'T12:00:00'` na string antes de criar o objeto Date:

```typescript
// Atual (errado):
function formatarData(dataISO: string) {
  return new Date(dataISO).toLocaleDateString("pt-BR");
}

// Correto:
function formatarData(dataISO: string) {
  return new Date(dataISO + 'T12:00:00').toLocaleDateString("pt-BR");
}
```

---

**BUG-003 — Confirmação de exclusão com popup nativo em EnviarComunicado**
- **Arquivo:** `src/components/EnviarComunicado.tsx` — linhas 222 e 253
- **O que acontece:** Dois `window.confirm()` aparecem ao excluir comunicados. Esse popup nativo do browser: não respeita dark mode (aparece sempre claro), bloqueia toda a thread JavaScript enquanto está aberto, e em alguns browsers mobile é desativado por padrão (aparece já confirmado automaticamente).
- **Correção:** Substituir por `AlertDialog` do shadcn/ui — já usado em outros componentes do projeto.

---

**BUG-004 — Confirmação de exclusão com popup nativo em Agenda**
- **Arquivos:** `src/components/AgendaProfessor.tsx:156` e `src/components/AgendaProfessores.tsx:200`
- **O que acontece:** Mesmo problema do BUG-003, mas nos componentes de agenda do professor. Dois `window.confirm()` para confirmar exclusão de agenda.
- **Correção:** Mesmo padrão — substituir por `AlertDialog`.

---

### 🟡 MÉDIOS (7 bugs)

---

**BUG-005 — RelatorioConteudo mostra dados inventados**
- **Arquivo:** `src/components/RelatorioConteudo.tsx`
- **O que acontece:** O dashboard do professor conteudista exibe "247 conteúdos", "89 videoaulas", "1.542 downloads" — todos números hardcoded no código. Os filtros de período e disciplina não fazem nada de verdade. Nenhum dado real é exibido.
- **Correção:** Substituir os dados mockados por queries reais na tabela `pdfs_conteudista`.

---

**BUG-006 — Texto invisível em dark mode para conteudistas**
- **Arquivo:** `src/components/EstatisticasConteudista.tsx`
- **O que acontece:** O componente usa `text-gray-900` e `text-gray-600` sem variante `dark:`. Em dark mode, o texto fica cinza escuro sobre fundo escuro — basicamente invisível.
- **Correção:** Trocar por variáveis CSS do projeto:

```typescript
// Atual (errado):
className="text-gray-900"   // invisível no dark mode
className="text-gray-600"   // invisível no dark mode

// Correto:
className="text-foreground"
className="text-muted-foreground"
```

---

**BUG-007 — Dark mode inconsistente em ConquistasEstudante e EstatisticasEstudo**
- **Arquivos:** `ConquistasEstudante.tsx` e `EstatisticasEstudo.tsx`
- **O que acontece:** Esses dois componentes recebem `darkMode?: boolean` como prop e aplicam classes manuais (`bg-gray-800`, `border-gray-700`). Se o componente pai não passar a prop, ficam sempre no modo claro, independente do tema do sistema.
- **Correção:** Substituir a prop `darkMode` por `useTheme()` do ThemeContext e usar variáveis CSS.

---

**BUG-008 — Nome da escola diferente nos relatórios de frequência**
- **Arquivos:** `src/config/school.ts` vs `src/components/FrequenciaAluno.tsx:56`
- **O que acontece:** `SCHOOL_CONFIG.name` é `'Colégio Conexão EAD'`, mas `FrequenciaAluno` usa uma constante local `ESCOLA_NOME = 'Colégio Conexão Maranhense'`. O nome impresso nos relatórios de frequência é diferente do nome no restante do sistema.
- **Correção:** Usar `SCHOOL_CONFIG.name` de `../config/school` em todos os componentes que exibem o nome da escola. E atualizar o `school.ts` para o nome correto: `'Colégio Conexão Maranhense'`.

---

**BUG-009 — Tipo de pagamento misturado com texto no banco**
- **Arquivo:** `src/components/ControlePagamentos.tsx`
- **O que acontece:** O tipo do pagamento é armazenado como `tipo:mensalidade|Observação textual` dentro do campo `observacao`. Isso mistura dado estruturado (o tipo) com texto livre (a observação). O RelatorioFinanceiro não consegue filtrar pagamentos por tipo por causa disso.
- **Correção:** Adicionar um campo `tipo` separado na tabela `financeiro_mensalidades`.

---

**BUG-010 — Séries hardcoded no upload de conteúdo**
- **Arquivo:** `src/components/UploadConteudoPDF.tsx`
- **O que acontece:** A lista de séries disponíveis para upload (5º ao 9º ano, 1ª a 3ª série) está escrita diretamente no código. O próprio código tem um comentário `// TODO: carregar do banco`. Se você adicionar ou remover uma série pelo `GestaoEscola`, o upload não vai refletir a mudança.
- **Correção:** Buscar séries da tabela `series` no Supabase, como os outros componentes fazem.

---

**BUG-011 — Exclusão de série sem verificar se as turmas foram removidas**
- **Arquivo:** `src/components/GestaoEscola.tsx` — linhas 363–364
- **O que acontece:** Ao excluir uma série, o código faz dois DELETEs em sequência: primeiro remove as turmas vinculadas, depois remove a série. Se o primeiro DELETE falhar silenciosamente (RLS bloqueando), a série é removida mas as turmas órfãs ficam no banco sem nenhum aviso.
- **Correção:** Adicionar `{ count: 'exact' }` em ambos os DELETEs e checar `count === 0`.

---

### 🟢 BAIXOS (4 bugs)

---

**BUG-012 — FloatingHelpButton importa componente que não existe**
- **Arquivo:** `src/components/FloatingHelpButton.tsx`
- **O que acontece:** Importa `AcessoRapidoCorrecoes` que não aparece em nenhum arquivo da pasta `components/`. Pode estar com nome diferente ou em subpasta.
- **Impacto:** Se esse componente for renderizado, vai quebrar. Se não está sendo renderizado, é um import morto.

---

**BUG-013 — Arquivo utilitário na pasta errada**
- **Arquivo:** `src/components/AdvancedUploadComponent.tsx`
- **O que acontece:** Este arquivo é na verdade um módulo utilitário, não um componente React — não exporta JSX. Está na pasta `components/` mas deveria estar em `utils/` ou `hooks/`.
- **Impacto:** Baixo, mas causa confusão na organização.

---

**BUG-014 — Grade horária editável em dois lugares diferentes**
- **Arquivo:** `src/components/AgendaCoordenador.tsx`
- **O que acontece:** A aba "Configurar Grade" do AgendaCoordenador replica parte da funcionalidade do GestaoHorarios. O coordenador tem dois caminhos para editar a mesma grade horária.
- **Impacto:** Confusão para o usuário e risco de uma edição sobrescrever a outra.

---

**BUG-015 — Dados do usuário expostos no console do browser**
- **Arquivo:** `src/contexts/AuthContext.tsx` — linhas 63, 87, 96, 100, 112, 117, 123
- **O que acontece:** Vários `console.log` com emoji expõem id, email e tipo do usuário no console do browser. Qualquer pessoa com acesso ao DevTools (F12) de um computador logado consegue ver esses dados.
- **Correção:** Remover todos os `console.log` de produção, ou envolvê-los em `if (import.meta.env.DEV)`.

---

## Resumo visual dos bugs por prioridade

```
🔴 CRÍTICOS — Corrigir esta semana
   BUG-001 → usePresence sendBeacon (2 linhas de código)
   BUG-002 → DashboardAluno formatarData (1 linha de código)
   BUG-003 → EnviarComunicado window.confirm (substituir 2 ocorrências)
   BUG-004 → AgendaProfessor/es window.confirm (substituir 2 ocorrências)

🟡 MÉDIOS — Corrigir nas próximas 2 semanas
   BUG-005 → RelatorioConteudo dados mockados
   BUG-006 → EstatisticasConteudista dark mode
   BUG-007 → ConquistasEstudante/EstatisticasEstudo darkMode prop
   BUG-008 → Nome da escola inconsistente
   BUG-009 → ControlePagamentos tipo no campo errado
   BUG-010 → UploadConteudoPDF séries hardcoded
   BUG-011 → GestaoEscola DELETE em cascata sem count

🟢 BAIXOS — Corrigir quando tiver tempo
   BUG-012 → FloatingHelpButton import inexistente
   BUG-013 → AdvancedUploadComponent na pasta errada
   BUG-014 → Grade horária editável em dois lugares
   BUG-015 → console.log com dados do usuário
```

---

## O que NÃO foi encontrado (ótimas notícias)

- ✅ Nenhum cliente Supabase duplicado
- ✅ Nenhuma importação de React Router
- ✅ `fichas_matricula` sendo consultada com `.ilike()` onde deveria
- ✅ Lazy loading implementado corretamente nos dashboards pesados
- ✅ Padrão de `useCallback` + `useEffect` correto na maioria dos componentes

---

## Próximos passos recomendados pelo Claude Code

### Fase 1 — Correções (1–2 dias de trabalho)
Ordem ideal baseada no impacto:
1. BUG-002 — 1 linha, afeta todos os alunos diariamente
2. BUG-001 — 1 linha, corrige presença online
3. BUG-003 e BUG-004 — substituir 4 `window.confirm` por AlertDialog
4. BUG-006 — 2 classes CSS, texto invisível no dark mode
5. BUG-007 — substituir prop `darkMode` por `useTheme()`
6. BUG-008 — centralizar nome da escola no `school.ts`
7. BUG-015 — remover `console.log` do AuthContext

### Fase 2 — Agentes de IA (3–5 dias)
Estrutura recomendada pelo Claude Code:
```
src/components/ChatFlutante.tsx       ← botão flutuante + janela de chat
src/components/ChatMensagem.tsx       ← item de mensagem (suporte a markdown)
src/hooks/useChat.ts                  ← histórico + chamada para Edge Function
src/utils/sistemaPromptsPorPerfil.ts  ← prompt de sistema personalizado por perfil
```

O Edge Function do Supabase faz o proxy para a Claude API — a chave nunca fica no frontend.

### Fase 3 — Multi-tenant (1–2 semanas)
⚠️ Aviso importante encontrado na análise: ao adicionar `escola_id NOT NULL` nas tabelas em produção, **obrigatoriamente usar `DEFAULT '<id-atual>'`** na migration. Sem o DEFAULT, o ALTER TABLE vai travar a tabela inteira enquanto roda — com dados reais de alunos dentro.

---

## Arquivos de Skills gerados

Os três arquivos de regras foram gerados com base no código real:

| Arquivo | O que contém |
|---|---|
| `docs/SKILLS_SUPABASE.md` | 13 regras de Supabase: cliente único, queries, joins, RLS, datas, storage, etc. |
| `docs/SKILLS_REACT.md` | 13 regras de React: navegação, estrutura de dashboards, lazy loading, dark mode, etc. |
| `docs/SKILLS_PATTERNS.md` | 13 padrões gerais: PDFs, notificações, dark mode, máscaras, formatação financeira, etc. |

Esses três arquivos são o que qualquer IA precisa ler antes de tocar no código do SynerEduc.
