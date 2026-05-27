# SKILLS_SUPABASE — Regras de Uso do Supabase no SynerEduc

> Derivado do código real do projeto. Sempre preferir estes padrões encontrados no codebase.

---

## 1. CLIENTE ÚNICO

```typescript
// Sempre importar de:
import { supabase } from '../supabase/supabaseClient';

// NUNCA criar um segundo cliente:
// ❌ const supabase = createClient(url, key)  ← proibido
```

O único `createClient()` do projeto está em `src/supabase/supabaseClient.ts`. Duplicar o cliente causa problemas de cache de sessão e canais Realtime.

---

## 2. PADRÃO DE QUERY COM LOADING STATE

```typescript
const [dados, setDados]     = useState<Tipo[]>([]);
const [loading, setLoading] = useState(true);
const [erro, setErro]       = useState<string | null>(null);

const carregarDados = useCallback(async () => {
  setLoading(true);
  setErro(null);
  try {
    const { data, error } = await supabase
      .from('nome_tabela')
      .select('campo1, campo2')
      .eq('campo_filtro', valor)
      .order('created_at', { ascending: false });

    if (error) throw error;
    setDados(data || []);
  } catch (err: any) {
    setErro(err.message);
    toast.error('Erro ao carregar dados: ' + err.message);
  } finally {
    setLoading(false);
  }
}, [valor]); // dependência no useCallback

useEffect(() => { carregarDados(); }, [carregarDados]);
```

---

## 3. QUERIES PARALELAS COM PROMISE.ALL

Quando precisar de múltiplas queries independentes, usar `Promise.all`:

```typescript
const [
  { data: alunos,    error: erroAlunos    },
  { data: turmas,    error: erroTurmas    },
  { data: notas,     error: erroNotas     },
] = await Promise.all([
  supabase.from('users').select('id, nome').eq('tipo', 'aluno'),
  supabase.from('turmas').select('*').eq('ativa', true),
  supabase.from('notas').select('*').eq('user_id', userId),
]);

if (erroAlunos) throw erroAlunos;
if (erroTurmas) throw erroTurmas;
if (erroNotas)  throw erroNotas;
```

---

## 4. JOINS COM FK NOMEADA

O Supabase usa o nome da FK para desambiguar relações quando uma tabela tem múltiplas FKs para a mesma tabela de destino:

```typescript
// FK simples (única FK para a tabela destino):
supabase
  .from('notas')
  .select('disciplina_id, disciplinas(nome)')

// FK nomeada (necessário quando há múltiplas FKs para users):
supabase
  .from('grade_horaria')
  .select(`
    professor_id, disciplina_id,
    professor:users!grade_horaria_professor_id_fkey(nome),
    disciplina:disciplinas(nome),
    series(nome)
  `)
  .eq('dia_semana', dia)

// Relação many-to-many via tabela pivot:
supabase
  .from('professores_disciplinas_series')
  .select('disciplinas(id, nome)')
  .eq('serie_id', serieId)
```

---

## 5. FILTRO DE SEGMENTO — REGRA CRÍTICA

**Tabela `fichas_matricula`** — SEMPRE usar `.ilike()`, nunca `.eq()`:
```typescript
// ✅ Correto (por inconsistência de case nos dados do banco):
.ilike('segmento', `%${segmento}%`)
// equivalente a: WHERE segmento ILIKE '%ead%'

// ❌ Errado (pode perder registros com case diferente):
.eq('segmento', segmento)
```

**Todas as outras tabelas** (`users`, `disciplinas`, `series`, `grade_horaria`, `comunicados`, etc.) — usar `.eq()`:
```typescript
.eq('segmento', segmento)
```

**Usando o hook:**
```typescript
import { useSegmento } from '../hooks/useSegmento';
const { segmento, isEAD, isPresencial } = useSegmento();
```

---

## 6. DELETE — VERIFICAÇÃO DE COUNT

Todo DELETE deve checar se algo foi realmente apagado:

```typescript
// ✅ Padrão correto:
const { error, count } = await supabase
  .from('tabela')
  .delete({ count: 'exact' })
  .eq('id', id);

if (error) throw error;
if (count === 0) {
  toast.error('Registro não encontrado ou sem permissão para excluir.');
  return;
}
toast.success('Excluído com sucesso!');

// ❌ Padrão errado (não verifica se algo foi apagado):
const { error } = await supabase.from('tabela').delete().eq('id', id);
if (error) throw error;
toast.success('Excluído!');  // pode mostrar sucesso mesmo sem apagar nada
```

**Exceções aceitáveis:**
- `Notificacoes.tsx` — delete de notificação própria (RLS garante que só o dono apaga)
- `usePresence.ts` — delete da própria sessão (false negative é tolerável)

---

## 7. UPSERT COM CONFLICT

```typescript
// Para tabelas com chave composta:
await supabase
  .from('grade_horaria')
  .upsert(registros, { onConflict: 'serie_id,dia_semana,ordem' });

// Para tabelas com unique em uma coluna:
await supabase
  .from('sessoes_ativas')
  .upsert({ usuario_id: id, last_seen: new Date().toISOString() }, 
           { onConflict: 'usuario_id' });
```

---

## 8. DATAS — BUG UTC-3 BRASIL

**PROBLEMA:** `new Date('2026-05-15')` interpreta a string como UTC midnight → mostra `14/05/2026` para usuários em UTC-3 (Brasil).

```typescript
// ❌ Errado — bug UTC-3:
new Date('2026-05-15').toLocaleDateString('pt-BR')  // → "14/05/2026"

// ✅ Correto — fixar horário ao meio-dia:
new Date('2026-05-15' + 'T12:00:00').toLocaleDateString('pt-BR')  // → "15/05/2026"

// ✅ Correto — construtor com parâmetros (mês é 0-indexed):
new Date(2026, 4, 15, 12, 0, 0).toLocaleDateString('pt-BR')  // → "15/05/2026"
```

**Padrão encontrado corretamente no `FrequenciaAluno.tsx`:**
```typescript
function formatarData(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR');
}
```

---

## 9. STORAGE — UPLOAD DE ARQUIVOS

```typescript
// Upload (upsert para sobrescrever se existir):
const { data: uploadData, error: uploadError } = await supabase
  .storage
  .from('nome-do-bucket')
  .upload(caminho, arquivo, { upsert: true });

if (uploadError) throw uploadError;

// URL pública (para arquivos sem restrição):
const { data: urlData } = supabase
  .storage
  .from('nome-do-bucket')
  .getPublicUrl(caminho);
const url = urlData.publicUrl;

// URL assinada (para arquivos privados, 7 dias):
const { data: signedData, error: signedError } = await supabase
  .storage
  .from('nome-do-bucket')
  .createSignedUrl(caminho, 7 * 24 * 3600);
```

**Buckets do projeto:**
- `documentos-matricula` — documentos de matrícula (privado)
- `comunicados` — imagens/anexos de comunicados (público)
- `avatars` — fotos de perfil dos usuários
- `pdfs_conteudista` — PDFs de conteúdo pedagógico (inferido)

---

## 10. COMO O RLS AFETA AS QUERIES

O RLS (Row Level Security) está ativo em produção. Isso significa:

1. **Queries de aluno** — RLS retorna apenas os registros do próprio aluno (ex: notas, frequência)
2. **Queries de professor** — RLS retorna apenas os registros das turmas/disciplinas do professor
3. **Queries de admin** — RLS com `BYPASS RLS` ou política `true` (acesso total)
4. **`sessoes_ativas`** — DELETE só funciona para o próprio usuário (exceto admin)
5. **`fichas_matricula`** — política baseada em segmento do usuário

**Implicação em deletes:** Se o RLS bloqueia o delete, o Supabase retorna `error: null` e `count: 0` sem lançar exceção. Por isso é obrigatório checar `count === 0`.

---

## 11. PRESENÇA ONLINE (sessoes_ativas)

```typescript
// Registro/heartbeat (a cada 30s):
await supabase.from('sessoes_ativas').upsert({
  usuario_id: usuario.id,
  nome:       usuario.nome,
  tipo:       usuario.tipo,
  segmento:   usuario.segmento,
  last_seen:  new Date().toISOString(),
}, { onConflict: 'usuario_id' });

// Contar online (considera offline após 2min sem heartbeat):
const limite = new Date(Date.now() - 2 * 60 * 1000).toISOString();
const { count } = await supabase
  .from('sessoes_ativas')
  .select('*', { count: 'exact', head: true })
  .gte('last_seen', limite);
```

---

## 12. AUTH — LOGOUT

```typescript
// Sempre usar window.location.href = '/' para redirecionar após logout:
const { error } = await supabase.auth.signOut();
localStorage.clear();
window.location.href = '/';   // ← SEMPRE '/', nunca '/login'
```

---

## 13. CONTAGEM SEM TRAZER DADOS

```typescript
// Para contar sem trazer linhas (head: true):
const { count, error } = await supabase
  .from('users')
  .select('*', { count: 'exact', head: true })
  .eq('tipo', 'aluno')
  .eq('status', 'ativo');

// count é o número de linhas, data é null (não trafega dados)
```
