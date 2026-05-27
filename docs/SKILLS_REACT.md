# SKILLS_REACT — Regras de React/TypeScript no SynerEduc

> Derivado do código real do projeto. Padrões que devem ser seguidos em novos componentes.

---

## 1. NAVEGAÇÃO — SEM REACT ROUTER

O projeto usa **zero** React Router. A navegação é totalmente via `useState`:

```typescript
// Em App.tsx:
const [currentView, setCurrentView] = useState<"website" | "login" | "ava">("website");

// Em cada dashboard:
type ViewType = 'dashboard' | 'boletins' | 'relatorio' | 'frequencia';
const [viewAtual, setViewAtual] = useState<ViewType>('dashboard');
```

**Regras:**
- Nunca importar `Link`, `useNavigate`, `BrowserRouter` ou qualquer coisa de `react-router-dom`
- Para voltar à view anterior, sempre passar `onVoltar: () => void` como prop para o sub-componente
- Transição entre views via troca de estado → re-render → conditional rendering

**Por que:** A app é um SPA com apenas 3 rotas públicas (site, login, ava). Toda a navegação interna é gerenciada por estado, o que elimina a complexidade de URLs, história do browser e code-splitting manual.

---

## 2. PADRÃO DOS DASHBOARDS

### Estrutura de arquivos

```typescript
// src/components/Dashboard{Tipo}.tsx
export default function Dashboard{Tipo}({ onBackToSite, usuario, logout }: Props) {
  const { theme, toggleTheme } = useTheme();

  // Estado de UI
  const [mostrarPerfil,         setMostrarPerfil]         = useState(false);
  const [mostrarNotificacoes,   setMostrarNotificacoes]   = useState(false);
  const [mostrarMenuUsuario,    setMostrarMenuUsuario]    = useState(false);
  const [viewAtual,             setViewAtual]             = useState<ViewType>('dashboard');
  const avatarRef = useRef<HTMLButtonElement>(null);
```

### Header padrão

```tsx
const Header = () => (
  <header className="bg-card border-b border-border py-3 sm:py-4 sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex items-center justify-between">
      <SchoolHeader subtitle="Painel do Coordenador" />
      {/* Avatar + dropdown via createPortal */}
    </div>
  </header>
);
```

### Dropdown de usuário via createPortal

```tsx
// Para evitar problemas de z-index/overflow em headers sticky:
const getDropdownPos = () => {
  if (!avatarRef.current) return { top: 68, right: 16 };
  const rect = avatarRef.current.getBoundingClientRect();
  return { top: rect.bottom + 8, right: window.innerWidth - rect.right };
};

// No render:
{mostrarMenuUsuario && createPortal(
  <div style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999 }}>
    {/* menu items */}
  </div>,
  document.body
)}
```

---

## 3. LAZY LOADING COM SUSPENSE

Todos os sub-componentes pesados devem ser lazy-loaded:

```typescript
// No topo do arquivo do dashboard (não dentro do componente):
const BoletinsGerais   = lazy(() => import('./BoletinsGerais'));
const RelatorioTurma   = lazy(() => import('./RelatorioTurma'));
const FrequenciaAlunos = lazy(() => import('./FrequenciaAluno'));

// No render:
const renderConteudo = () => {
  switch (viewAtual) {
    case 'boletins':
      return (
        <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>}>
          <BoletinsGerais onVoltar={() => setViewAtual('dashboard')} />
        </Suspense>
      );
    // ...
  }
};
```

**Quando usar lazy:**
- Componentes pesados com muitas dependências (jsPDF, recharts)
- Componentes que o usuário raramente acessa (relatórios, configurações)
- Qualquer componente > ~150 linhas de lógica

**Quando NÃO usar lazy:**
- SchoolHeader, PerfilUsuario, Notificacoes (abertos frequentemente)
- Componentes simples sem bibliotecas pesadas

---

## 4. HOOKS CUSTOMIZADOS

### useSegmento

```typescript
import { useSegmento } from '../hooks/useSegmento';

const { segmento, isEAD, isPresencial, turno, nivel } = useSegmento();
// segmento: 'ead' | 'presencial'
// isEAD: boolean
// isPresencial: boolean
// turno: 'matutino' | 'vespertino' | 'noturno' | null
// nivel: 'fundamental1' | 'fundamental2' | 'medio' | null
```

**Regra:** Usar `useSegmento()` em vez de `usuario?.segmento` diretamente, pois fornece tipagem e defaults seguros.

### usePresence

```typescript
// Registra heartbeat automático (usado somente no wrapper AVAComPresence em App.tsx):
usePresence(user);

// Para o admin consultar quem está online:
import { contarOnline, listarOnline } from '../hooks/usePresence';
const count = await contarOnline();
const users = await listarOnline();
```

### useTheme

```typescript
import { useTheme } from '../contexts/ThemeContext';
const { theme, toggleTheme } = useTheme();
// theme: 'light' | 'dark'
```

### useAuth

```typescript
import { useAuth } from '../contexts/AuthContext';
const { session, usuario, loading, logout, atualizarPerfil } = useAuth();
```

---

## 5. ESTADOS DE LOADING E ERRO

**Padrão para listas:**
```tsx
{loading ? (
  <div className="flex justify-center py-20">
    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
  </div>
) : erro ? (
  <div className="flex items-center gap-2 text-red-600 p-4">
    <AlertCircle className="w-5 h-5" />
    <span>{erro}</span>
  </div>
) : dados.length === 0 ? (
  <Card>
    <CardContent className="py-12 text-center">
      <p className="text-muted-foreground">Nenhum registro encontrado.</p>
    </CardContent>
  </Card>
) : (
  <div className="space-y-3">
    {dados.map(item => <ItemCard key={item.id} {...item} />)}
  </div>
)}
```

**Estado de botão de submit:**
```tsx
<Button onClick={handleSalvar} disabled={salvando} className="gap-2">
  {salvando ? (
    <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</>
  ) : (
    <><Save className="w-4 h-4" />Salvar</>
  )}
</Button>
```

---

## 6. TIPOS E INTERFACES

**Onde declarar:**
- Interfaces usadas em apenas um arquivo: dentro do arquivo
- Interfaces compartilhadas entre arquivos: em `src/types/`

**Interface `Usuario` (definida em `src/types/auth.ts`):**
```typescript
interface Usuario {
  id:       string;
  email:    string;
  nome:     string;
  tipo:     'administrador' | 'admin_presencial' | 'professor' | 'aluno'
          | 'responsavel' | 'coordenador' | 'professor_conteudista'
          | 'gestor_geral' | 'secretaria' | 'financeiro' | 'estoque';
  avatar?:    string;
  serie?:     string;
  segmento?:  'ead' | 'presencial';
  turno?:     'matutino' | 'vespertino' | 'noturno';
  nivel?:     'fundamental1' | 'fundamental2' | 'medio';
  status?:    string;
  criado_em?: string;
  updated_at?: string;
}
```

---

## 7. CALLBACKS E DEPENDÊNCIAS DO USEEFFECT

**Padrão para evitar re-renders e loops infinitos:**

```typescript
// useCallback para funções de carregamento (evita re-criação a cada render):
const carregarDados = useCallback(async () => {
  // ...query...
}, [segmento, userId]); // lista apenas as dependências que mudam

// useEffect chamando o callback:
useEffect(() => {
  carregarDados();
}, [carregarDados]); // dependência no callback (ESLint rule)

// Para chamar ao voltar ao dashboard:
useEffect(() => {
  if (viewAtual === 'dashboard') carregarMetricas();
}, [viewAtual]); // recarrega toda vez que volta
```

---

## 8. DARK MODE — TAILWIND CSS V4

**Regras obrigatórias:**
- Usar **variáveis CSS do Tailwind** — nunca cores hardcoded
- O tema dark é aplicado via classe `.dark` no `<html>` pelo ThemeContext

```tsx
// ✅ Correto — variáveis CSS:
className="bg-card text-foreground border-border"
className="bg-muted text-muted-foreground"
className="bg-background"

// ✅ Correto com variante dark: quando necessário:
className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"

// ❌ Errado — cores hardcoded:
className="bg-white text-gray-900"
className="bg-gray-800 border-gray-700"

// ❌ Errado — prop darkMode manual (herança de componente antigo):
const { darkMode } = props;
className={darkMode ? 'bg-gray-800' : 'bg-white'}
// → Deve usar useTheme() ou variáveis CSS
```

---

## 9. PADRÃO DE MENU ITEMS (CARDS DO DASHBOARD)

```typescript
const menuItems = [
  {
    id: 'boletins',
    title: 'Boletins Gerais',
    description: 'Visualizar boletins de todos os alunos',
    icon: FileText,
    bg: '#dbeafe',        // cor de fundo do ícone (hardcoded para os cards)
    iconColor: '#2563eb', // cor do ícone
  },
  // ...
];

// Render:
{viewAtual === 'dashboard' && (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {menuItems.map(item => (
      <Card
        key={item.id}
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setViewAtual(item.id as ViewType)}
      >
        <CardContent className="p-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
               style={{ backgroundColor: item.bg }}>
            <item.icon className="w-6 h-6" style={{ color: item.iconColor }} />
          </div>
          <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
          <p className="text-sm text-muted-foreground">{item.description}</p>
        </CardContent>
      </Card>
    ))}
  </div>
)}
```

---

## 10. BARRA AZUL (BREADCRUMB DE VOLTA)

Quando o usuário navega para uma sub-view, exibir uma barra de contexto:

```tsx
{viewAtual !== 'dashboard' && (
  <div className="bg-blue-600 text-white py-2 px-4">
    <div className="max-w-7xl mx-auto flex items-center gap-2">
      <button onClick={() => setViewAtual('dashboard')}
              className="hover:underline text-sm flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>
      <span className="text-blue-300">›</span>
      <span className="text-sm font-medium">{tituloPorView[viewAtual]}</span>
    </div>
  </div>
)}
```

---

## 11. PROP DRILLING VS CONTEXT

**Regra do projeto:**
- `usuario` (perfil completo) é passado via props de App.tsx para cada dashboard
- `AuthContext` é usado por componentes aninhados que precisam do usuário sem passar por props
- `ThemeContext` é acessado diretamente onde necessário (sem prop drilling)
- `useSegmento()` é chamado diretamente no componente que precisa — nunca passar `segmento` como prop

---

## 12. ANIMAÇÕES — motion/react vs framer-motion

O projeto usa **ambas** as bibliotecas (inconsistência existente):
- `PDFViewerModerno.tsx`, `ConquistasEstudante.tsx`, `EstatisticasEstudo.tsx` → `motion/react`
- `MaterialEstudoModerno.tsx` → `framer-motion`

**Recomendação para novos componentes:** usar `motion/react` (mais recente).

```typescript
import { motion, AnimatePresence } from 'motion/react';
```

---

## 13. SCHEMA.TS / TIPOS DA UI

Os componentes UI (`src/components/ui/`) são do shadcn/ui. Ao usar:

```typescript
// Imports corretos:
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel,
         AlertDialogContent, AlertDialogFooter, AlertDialogHeader,
         AlertDialogTitle } from './ui/alert-dialog';
import { toast } from 'sonner';  // não de './ui/sonner'
```
