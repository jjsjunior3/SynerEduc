# SKILLS_PATTERNS — Padrões Gerais do Projeto SynerEduc

> Anti-patterns, boas práticas e convenções encontradas no código real.

---

## 1. DARK MODE — IMPLEMENTAÇÃO

### Como funciona

O dark mode é controlado pelo `ThemeContext`:
1. O usuário clica no botão Sun/Moon no header
2. `toggleTheme()` alterna entre `'light'` e `'dark'`
3. O `ThemeProvider` adiciona/remove a classe `.dark` no `<html>`
4. Tailwind CSS v4 aplica variantes `dark:` automaticamente

### Variáveis CSS que devem ser usadas

| Classe Tailwind | Uso |
|---|---|
| `bg-background` | Fundo da página/main |
| `bg-card` | Fundo de cards e headers |
| `bg-muted` | Fundo de seções secundárias |
| `text-foreground` | Texto principal |
| `text-muted-foreground` | Texto secundário/labels |
| `border-border` | Bordas de cards, inputs, tabelas |
| `text-primary` | Texto de ação/link |
| `bg-primary` | Botão primário |

### Para cores com variante dark explícita

Quando a variável CSS não for suficiente (ex: alertas coloridos):
```tsx
// ✅ Padrão com dark: explícito:
className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
className="bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800"
className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
```

---

## 2. GERAÇÃO DE PDFs

### Regra de qual método usar

| Situação | Método | Exemplo |
|---|---|---|
| Boletim único de um aluno, layout definido por CSS | `window.print()` com `@media print` | `Boletim.tsx`, `BoletimCoordenador.tsx` |
| Documento formal (contrato, declaração) com HTML completo | `window.open() + document.write(html) + print()` | `EmissaoContratos.tsx`, `EmissaoDocumentos.tsx` |
| Relatório multi-página com tabelas e gráficos | `jsPDF + autoTable` | `RelatorioTurma.tsx` |

### Padrão window.open + document.write

```typescript
const imprimirDocumento = (htmlContent: string) => {
  const popup = window.open('', '_blank', 'width=900,height=700');
  if (!popup) {
    toast.error('Popup bloqueado. Permita popups para imprimir.');
    return;
  }
  popup.document.write(htmlContent);
  popup.document.close();
  setTimeout(() => {
    popup.print();
    // popup.close(); // opcional — fechar após print
  }, 400); // 400-500ms para garantir que o HTML carregou
};
```

### Padrão jsPDF (RelatorioTurma.tsx)

```typescript
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const gerarPDF = async () => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Cabeçalho com logo
  const logoBase64 = await carregarImagemBase64('/logo-colegio-conexao.png');
  doc.addImage(logoBase64, 'PNG', 10, 10, 30, 30);

  // Tabela principal
  autoTable(doc, {
    head: [['Coluna1', 'Coluna2', 'Coluna3']],
    body: dados.map(d => [d.col1, d.col2, d.col3]),
    startY: 50,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235] }, // blue-600
  });

  doc.save('relatorio.pdf');
};
```

---

## 3. NOTIFICAÇÕES — TOAST (SONNER)

### Regras

```typescript
import { toast } from 'sonner';  // import SEMPRE de 'sonner', não de './ui/sonner'

// Sucesso:
toast.success('Salvo com sucesso!');

// Erro (incluir mensagem técnica para debug):
toast.error('Erro ao salvar: ' + err.message);

// Info (funcionalidade em desenvolvimento):
toast.info('Função em desenvolvimento');

// Alerta:
toast.warning('Atenção: isso não pode ser desfeito.');
```

### NUNCA usar

```typescript
// ❌ Proibidos:
alert('Mensagem');
window.alert('Mensagem');
window.confirm('Confirma?');  // usar AlertDialog do shadcn/ui
confirm('Confirma?');
```

### Para confirmações destrutivas — usar AlertDialog

```tsx
import { AlertDialog, AlertDialogAction, AlertDialogCancel,
         AlertDialogContent, AlertDialogFooter, AlertDialogHeader,
         AlertDialogTitle } from './ui/alert-dialog';

const [confirmExcluir, setConfirmExcluir] = useState<string | null>(null);

// No render:
<AlertDialog open={!!confirmExcluir} onOpenChange={() => setConfirmExcluir(null)}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
    </AlertDialogHeader>
    <p className="text-muted-foreground text-sm">Esta ação não pode ser desfeita.</p>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction onClick={() => excluir(confirmExcluir!)}
                         className="bg-red-600 hover:bg-red-700">
        Excluir
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## 4. NOMES DE ARQUIVOS E COMPONENTES

### Convenções encontradas no projeto

| Tipo | Convenção | Exemplo |
|---|---|---|
| Componente React | PascalCase, `.tsx` | `DashboardCoordenador.tsx` |
| Hook customizado | `use` + PascalCase, `.ts` | `useSegmento.ts` |
| Context | PascalCase + `Context`, `.tsx` | `ThemeContext.tsx` |
| Utilitário | camelCase, `.ts` | `versaoApp.ts`, `calculoNotas.ts` |
| Configuração | camelCase, `.ts` | `school.ts` |
| UI shadcn | kebab-case, `.tsx` | `ui/alert-dialog.tsx` |

### Nomes de export

```typescript
// Dashboards principais — default export:
export default function DashboardCoordenador() {}

// Componentes reutilizáveis — named export:
export function GestaoVinculos() {}
export function SchoolHeader() {}
export function Notificacoes() {}

// Exceção: alguns dashboards usam named export (DashboardAdministrador, DashboardAdminPresencial)
```

---

## 5. ESCOLA — CONSTANTES CENTRALIZADAS

```typescript
// src/config/school.ts — usar para toda referência à escola:
import { SCHOOL_CONFIG } from '../config/school';

SCHOOL_CONFIG.name          // 'Colégio Conexão EAD'
SCHOOL_CONFIG.shortName     // 'Conexão EAD'
SCHOOL_CONFIG.logoUrl       // '/logo-colegio-conexao.png'
SCHOOL_CONFIG.primaryColor  // 'from-blue-600 to-purple-600'
SCHOOL_CONFIG.description   // 'Educação de qualidade ao seu alcance'
```

**Informações adicionais hardcoded nos contratos/documentos** (não estão no school.ts ainda):
- CNPJ: `08.660.860/0001-63`
- INEP: `21612668`
- CEE: `67/2019`
- Diretora: `Ariane M.S.S Alencar`
- Coordenador: `José João Santos Júnior`
- WhatsApp: `5598983532145`
- Foro: `São Luís/MA`

---

## 6. VERSIONAMENTO DO APP

```typescript
// src/utils/versaoApp.ts
import { verificarVersao, getVersaoAtual } from '../utils/versaoApp';

// Chamar no início da app (main.tsx ou App.tsx):
verificarVersao(); // limpa cache se a versão mudou

// Obter versão atual para exibir no footer/header:
const versao = getVersaoAtual(); // '1.5.3'
```

**Ao lançar nova versão:** apenas incrementar `VERSAO_ATUAL` em `versaoApp.ts`.

---

## 7. PRESENÇA ONLINE

```typescript
// Em App.tsx — wrapper que ativa o heartbeat:
function AVAComPresence({ user, ... }) {
  usePresence(user); // ativa heartbeat automático a cada 30s
  return <>{renderDashboard(user)}</>;
}

// No DashboardAdministrador — polling de usuários online:
useEffect(() => {
  if (viewAtual !== 'dashboard') return;
  const interval = setInterval(async () => {
    const [count, users] = await Promise.all([contarOnline(), listarOnline()]);
    setMetricas(prev => ({ ...prev, onlineAgora: count, usuariosOnline: users }));
  }, 30_000); // a cada 30s
  return () => clearInterval(interval);
}, [viewAtual]);
```

---

## 8. LOGO DA ESCOLA

```tsx
// Em componentes que exibem o logo:
<img
  src={SCHOOL_CONFIG.logoUrl}  // '/logo-colegio-conexao.png' (da pasta public/)
  alt={SCHOOL_CONFIG.name}
  className="h-10 w-auto"
  onError={(e) => {
    // Fallback se o logo não carregar:
    (e.target as HTMLImageElement).style.display = 'none';
  }}
/>

// Em SchoolHeader.tsx — padrão com fallback para ícone:
import { GraduationCap } from 'lucide-react';
// Se logo não carrega → mostra GraduationCap
```

**No jsPDF** — converter logo para base64 antes de inserir:
```typescript
async function carregarImagemBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
}
```

---

## 9. SISTEMA DE SEGMENTOS

| Segmento | Tipos de usuário | Tabelas filtradas |
|---|---|---|
| `ead` | aluno, professor, professor_conteudista, coordenador (EAD) | users, fichas_matricula, disciplinas, series, grade_horaria, comunicados |
| `presencial` | aluno, professor, admin_presencial, coordenador (Presencial) | users, fichas_matricula, disciplinas, series, grade_horaria |
| (sem segmento) | administrador, gestor_geral, secretaria, financeiro | Acesso a ambos |

**Isolamento garantido por:**
1. RLS no banco de dados (políticas por segmento)
2. Filtros explícitos nas queries (`.eq('segmento', segmento)`)
3. `useSegmento()` hook que lê o segmento do usuário autenticado

---

## 10. O QUE NUNCA FAZER — ANTI-PATTERNS

### Supabase
- ❌ `createClient()` em qualquer lugar fora de `supabaseClient.ts`
- ❌ `.delete().eq()` sem verificar `count === 0` depois (para operações críticas)
- ❌ `.eq('segmento', ...)` na tabela `fichas_matricula` — usar `.ilike()`
- ❌ `new Date('YYYY-MM-DD')` para exibir datas — adicionar `'T12:00:00'`

### React
- ❌ `import { Link } from 'react-router-dom'` ou qualquer outro react-router
- ❌ `useNavigate()`, `BrowserRouter`, `Route`
- ❌ Prop `darkMode: boolean` em novos componentes — usar `useTheme()` do ThemeContext
- ❌ `bg-white` ou `text-black` hardcoded — usar variáveis CSS (`bg-card`, `text-foreground`)
- ❌ `window.alert()` ou `window.confirm()` — usar `toast` ou `AlertDialog`

### Autenticação
- ❌ `window.location.href = '/login'` no logout — sempre `'/'`
- ❌ Armazenar dados sensíveis do usuário em qualquer lugar além do AuthContext/localStorage
- ❌ Confiar em dados do `localStorage` sem verificar com Supabase Auth

### Código
- ❌ `console.log` em código de produção (especialmente com dados de usuário)
- ❌ Séries/turmas hardcoded em formulários — carregar do banco via `series` table
- ❌ Dados de escola (CNPJ, nome, logo) hardcoded fora de `school.ts`
- ❌ Criar arquivos `.md` de documentação no `src/` — usar `docs/`

### Performance
- ❌ Importar componentes pesados sem `lazy()` em dashboards
- ❌ Chamar Supabase dentro do render — sempre em `useEffect` ou handlers
- ❌ `setInterval` sem `clearInterval` no cleanup do `useEffect`

---

## 11. PADRÃO DE FILTROS COM DEBOUNCE

Para campos de busca/autocomplete:

```typescript
const [busca, setBusca] = useState('');

useEffect(() => {
  const timer = setTimeout(() => {
    if (busca.length >= 2) {
      buscarUsuarios(busca);
    }
  }, 400); // debounce de 400ms (padrão do projeto)

  return () => clearTimeout(timer);
}, [busca]);
```

---

## 12. MÁSCARAS DE INPUT

O projeto implementa máscaras via funções puras (não usa bibliotecas de máscara):

```typescript
// CPF: 000.000.000-00
function mascaraCPF(valor: string): string {
  return valor
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
}

// Telefone: (00) 00000-0000
function mascaraTelefone(valor: string): string {
  return valor
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
}
```

---

## 13. FORMATAÇÃO DE VALORES FINANCEIROS

```typescript
// Padrão encontrado em ControleDespesas, ControlePagamentos, RelatorioFinanceiro:
function formatBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
// Resultado: "R$ 1.255,00"

// Alternativa sem símbolo:
valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
// Resultado: "1.255,00"
```
