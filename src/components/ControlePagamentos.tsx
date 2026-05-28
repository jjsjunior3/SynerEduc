import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from './ui/select';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from './ui/dialog';
import {
  ArrowLeft, Plus, Search, CheckCircle,
  Loader2, DollarSign, RefreshCw, Save,
  TrendingDown, Banknote, FileCheck,
  HandshakeIcon, MoreHorizontal, X, User,
  CalendarDays, Pencil, Trash2, Printer,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Tipos ───────────────────────────────────────────────
interface ControlePagamentosProps { onVoltar: () => void; segmentoGestor?: string; }

type TipoPagamento = 'mensalidade' | 'atrasado' | 'acordo' | 'outros';

interface EntradaCaixa {
  id: string;
  aluno_id: string;
  aluno_nome: string;
  aluno_serie: string | null;
  valor: number;
  data_entrada: string;
  tipo: TipoPagamento;
  observacao: string | null;
  segmento: string | null;
}

interface AlunoOpcao {
  id: string;
  nome: string;
  serie: string | null;
  segmento: string | null;
}

interface FormNova {
  aluno_id: string;
  aluno_nome: string;
  valor: string;
  data_entrada: string;
  tipo: TipoPagamento;
  observacao: string;
  segmento: string;
}

const hoje = () => new Date().toISOString().split('T')[0];

const FORM_INICIAL: FormNova = {
  aluno_id: '', aluno_nome: '', valor: '',
  data_entrada: hoje(), tipo: 'mensalidade',
  observacao: '', segmento: 'ead',
};

const POR_PAGINA = 10;

const TIPOS_PAGAMENTO: { value: TipoPagamento; label: string; icon: React.ReactNode; cor: string }[] = [
  { value: 'mensalidade', label: 'Mensalidade', icon: <FileCheck      className="w-4 h-4" />, cor: 'text-blue-600 dark:text-blue-400' },
  { value: 'atrasado',    label: 'Atrasado',    icon: <TrendingDown   className="w-4 h-4" />, cor: 'text-red-600 dark:text-red-400' },
  { value: 'acordo',      label: 'Acordo',      icon: <HandshakeIcon  className="w-4 h-4" />, cor: 'text-orange-600 dark:text-orange-400' },
  { value: 'outros',      label: 'Outros',      icon: <MoreHorizontal className="w-4 h-4" />, cor: 'text-muted-foreground' },
];

function tipoBadge(tipo: TipoPagamento) {
  const t = TIPOS_PAGAMENTO.find(x => x.value === tipo);
  const cores: Record<TipoPagamento, string> = {
    mensalidade: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800',
    atrasado:    'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800',
    acordo:      'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-800',
    outros:      'bg-muted text-muted-foreground border-border',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cores[tipo]}`}>
      {t?.label ?? tipo}
    </span>
  );
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso: string) {
  if (!iso) return '—';
  const d = iso.split('T')[0].split('-');
  return `${d[2]}/${d[1]}/${d[0]}`;
}

function mesAtual() {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}`;
}


// ─── Autocomplete ─────────────────────────────────────────
function AutocompleteAluno({ alunos, value, onSelect }: {
  alunos: AlunoOpcao[];
  value: { id: string; nome: string };
  onSelect: (a: AlunoOpcao) => void;
}) {
  const [busca, setBusca]   = useState(value.nome);
  const [aberto, setAberto] = useState(false);
  const ref                 = useRef<HTMLDivElement>(null);

  useEffect(() => { setBusca(value.nome); }, [value.nome]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtrados = busca.trim().length >= 1
    ? alunos.filter(a => a.nome.toLowerCase().includes(busca.toLowerCase())).slice(0, 8)
    : [];

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9 pr-9 bg-background border-border text-foreground"
          placeholder="Digite o nome do aluno..."
          value={busca} autoComplete="off"
          onChange={e => {
            setBusca(e.target.value); setAberto(true);
            if (!e.target.value) onSelect({ id: '', nome: '', serie: null, segmento: null });
          }}
          onFocus={() => busca.length >= 1 && setAberto(true)}
        />
        {busca && (
          <button type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => { setBusca(''); setAberto(false); onSelect({ id: '', nome: '', serie: null, segmento: null }); }}>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {aberto && filtrados.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          {filtrados.map(a => (
            <button key={a.id} type="button"
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors text-left"
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onSelect(a); setBusca(a.nome); setAberto(false); }}>
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {a.nome.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{a.nome}</p>
                {a.serie && <p className="text-xs text-muted-foreground">{a.serie} · {a.segmento ?? ''}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
      {aberto && busca.trim().length >= 2 && filtrados.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg px-4 py-3">
          <p className="text-sm text-muted-foreground">Nenhum aluno encontrado.</p>
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────
export function ControlePagamentos({ onVoltar, segmentoGestor = "ead" }: ControlePagamentosProps) {
  const [entradas, setEntradas]         = useState<EntradaCaixa[]>([]);
  const [alunos, setAlunos]             = useState<AlunoOpcao[]>([]);
  const [loading, setLoading]           = useState(true);
  const [salvando, setSalvando]         = useState(false);
  const [excluindo, setExcluindo]       = useState<string | null>(null);
  const [modalAberto, setModalAberto]   = useState(false);
  const [modalExcluir, setModalExcluir] = useState<EntradaCaixa | null>(null);
  const [editando, setEditando]         = useState<EntradaCaixa | null>(null);
  const [form, setForm]                 = useState<FormNova>(FORM_INICIAL);
  const [versao, setVersao]             = useState(0);

  const [busca, setBusca]           = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroMes, setFiltroMes]   = useState(mesAtual);
  const [pagina, setPagina]         = useState(1);
  const [total, setTotal]           = useState(0);

  const [totalMes, setTotalMes]                   = useState(0);
  const [qtdMes, setQtdMes]                       = useState(0);
  const [totalMensalidade, setTotalMensalidade]   = useState(0);
  const [totalAcordo, setTotalAcordo]             = useState(0);

  useEffect(() => {
    supabase.from('users').select('id, nome, serie, segmento')
      .eq('tipo', 'aluno').eq('status', 'ativo')
      .eq('segmento', segmentoGestor)   // ← só alunos do segmento do gestor
      .order('nome')
      .then(({ data }) => setAlunos(data ?? []));
  }, [segmentoGestor]);

  const carregarEntradas = useCallback(async () => {
    setLoading(true);
    try {
      const from = (pagina - 1) * POR_PAGINA;
      const to   = from + POR_PAGINA - 1;
      let q = supabase
        .from('financeiro_mensalidades')
        .select(`id, aluno_id, tipo, valor, vencimento, status, pago_em, observacao, segmento,
          users!financeiro_mensalidades_aluno_id_fkey (nome, serie)`, { count: 'exact' })
        .eq('status', 'pago')
        .eq('segmento', segmentoGestor)
        .order('pago_em', { ascending: false })
        .range(from, to);

      if (filtroMes) {
        const [ano, mes] = filtroMes.split('-');
        const fimDia = new Date(parseInt(ano), parseInt(mes), 0).getDate();
        q = q
          .gte('pago_em', `${ano}-${mes}-01T00:00:00`)
          .lte('pago_em', `${ano}-${mes}-${String(fimDia).padStart(2,'0')}T23:59:59`);
      }
      if (filtroTipo !== 'todos') q = q.eq('tipo', filtroTipo);

      const { data, count, error } = await q;
      if (error) throw error;

      let rows: EntradaCaixa[] = (data ?? []).map((r: any) => ({
        id: r.id, aluno_id: r.aluno_id,
        aluno_nome:   r.users?.nome  ?? '—',
        aluno_serie:  r.users?.serie ?? null,
        valor:        Number(r.valor),
        data_entrada: r.pago_em ?? r.vencimento,
        tipo:         (r.tipo ?? 'mensalidade') as TipoPagamento,
        observacao:   r.observacao || null,
        segmento:     r.segmento,
      }));

      if (busca.trim()) rows = rows.filter(r => r.aluno_nome.toLowerCase().includes(busca.toLowerCase()));
      setEntradas(rows);
      setTotal(count ?? 0);
    } catch (e: any) {
      toast.error('Erro ao carregar: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [pagina, filtroTipo, filtroMes, busca, versao]);

  const carregarResumo = useCallback(async () => {
    if (!filtroMes) return;
    const [ano, mes] = filtroMes.split('-');
    const fimDia = new Date(parseInt(ano), parseInt(mes), 0).getDate();
    const { data } = await supabase
      .from('financeiro_mensalidades').select('valor, tipo').eq('status', 'pago').eq('segmento', segmentoGestor)
      .gte('pago_em', `${ano}-${mes}-01T00:00:00`)
      .lte('pago_em', `${ano}-${mes}-${String(fimDia).padStart(2,'0')}T23:59:59`);
    const rows = data ?? [];
    setTotalMes(rows.reduce((s, r) => s + Number(r.valor), 0));
    setQtdMes(rows.length);
    setTotalMensalidade(rows.filter(r => !r.tipo || r.tipo === 'mensalidade').reduce((s, r) => s + Number(r.valor), 0));
    setTotalAcordo(rows.filter(r => r.tipo === 'acordo').reduce((s, r) => s + Number(r.valor), 0));
  }, [filtroMes, versao]);

  useEffect(() => { carregarResumo(); }, [carregarResumo]);
  useEffect(() => { if (filtroMes) carregarEntradas(); }, [carregarEntradas, filtroMes]);

  // ── Abrir edição ─────────────────────────────────────
  function abrirEdicao(e: EntradaCaixa) {
    setEditando(e);
    setForm({
      aluno_id:     e.aluno_id,
      aluno_nome:   e.aluno_nome,
      valor:        e.valor.toFixed(2).replace('.', ','),
      data_entrada: e.data_entrada.split('T')[0],
      tipo:         e.tipo,
      observacao:   e.observacao ?? '',
      segmento:     e.segmento ?? 'ead',
    });
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setEditando(null);
    setForm({ ...FORM_INICIAL, data_entrada: hoje() });
  }

  // ── Salvar (criar ou editar) ─────────────────────────
  async function salvar() {
    if (!form.aluno_id)     { toast.error('Selecione o aluno'); return; }
    if (!form.valor)        { toast.error('Informe o valor'); return; }
    if (!form.data_entrada) { toast.error('Informe a data de entrada'); return; }
    setSalvando(true);
    try {
      const payload = {
        aluno_id:   form.aluno_id,
        valor:      parseFloat(form.valor.replace(',', '.')),
        vencimento: form.data_entrada,
        status:     'pago',
        pago_em:    `${form.data_entrada}T12:00:00`,
        segmento:   segmentoGestor,
        tipo:       form.tipo,
        observacao: form.observacao.trim() || null,
      };
      if (editando) {
        const { error } = await supabase.from('financeiro_mensalidades').update(payload).eq('id', editando.id);
        if (error) throw error;
        toast.success('Registro atualizado!');
      } else {
        const { error } = await supabase.from('financeiro_mensalidades').insert(payload);
        if (error) throw error;
        toast.success('Entrada registrada no caixa!');
      }
      fecharModal();
      setVersao(v => v + 1);
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    } finally {
      setSalvando(false);
    }
  }

  // ── Excluir ──────────────────────────────────────────
  async function excluir(id: string) {
    setExcluindo(id);
    try {
      const { error } = await supabase.from('financeiro_mensalidades').delete().eq('id', id);
      if (error) throw error;
      toast.success('Registro excluído.');
      setModalExcluir(null);
      setVersao(v => v + 1);
    } catch (e: any) {
      toast.error('Erro ao excluir: ' + e.message);
    } finally {
      setExcluindo(null);
    }
  }

  // ── Impressão mensal ─────────────────────────────────
  async function imprimirCaixa() {
    if (!filtroMes) return;
    const [ano, mes] = filtroMes.split('-');
    const fimDia = new Date(parseInt(ano), parseInt(mes), 0).getDate();

    const { data, error } = await supabase
      .from('financeiro_mensalidades')
      .select(`id, tipo, valor, pago_em, observacao,
        users!financeiro_mensalidades_aluno_id_fkey (nome, serie)`)
      .eq('status', 'pago')
      .eq('segmento', segmentoGestor)
      .gte('pago_em', `${ano}-${mes}-01T00:00:00`)
      .lte('pago_em', `${ano}-${mes}-${String(fimDia).padStart(2,'0')}T23:59:59`)
      .order('pago_em', { ascending: true });

    if (error) { toast.error('Erro ao buscar dados para impressão'); return; }

    const mesNome = new Date(parseInt(ano), parseInt(mes) - 1, 1)
      .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    const rows = (data ?? []).map((r: any) => ({
      nome:  r.users?.nome  ?? '—',
      serie: r.users?.serie ?? '—',
      tipo:  (r.tipo ?? 'mensalidade') as TipoPagamento,
      obs:   r.observacao ?? '',
      valor: Number(r.valor),
      data:  formatDate(r.pago_em ?? ''),
    }));

    const totalGeral = rows.reduce((s, r) => s + r.valor, 0);
    const totalPorTipo = TIPOS_PAGAMENTO.map(t => ({
      label: t.label,
      valor: rows.filter(r => r.tipo === t.value).reduce((s, r) => s + r.valor, 0),
      count: rows.filter(r => r.tipo === t.value).length,
    }));

    const corTipo: Record<TipoPagamento, string> = {
      mensalidade: '#1d4ed8', atrasado: '#dc2626',
      acordo: '#ea580c',      outros:   '#6b7280',
    };

    const linhas = rows.map((r, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'}">
        <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#374151">${r.data}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;font-weight:600">${r.nome}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:11px">${r.serie}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb">
          <span style="background:${corTipo[r.tipo]}18;color:${corTipo[r.tipo]};border:1px solid ${corTipo[r.tipo]}40;padding:2px 10px;border-radius:999px;font-size:11px;font-weight:700">
            ${TIPOS_PAGAMENTO.find(t => t.value === r.tipo)?.label ?? r.tipo}
          </span>
        </td>
        <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:11px">${r.obs || '—'}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:800;color:#15803d;font-size:13px">
          ${formatBRL(r.valor)}
        </td>
      </tr>`).join('');

    const resumoCards = totalPorTipo.filter(t => t.valor > 0).map(t => `
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 16px;min-width:130px">
        <div style="font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:700;letter-spacing:.5px">${t.label}</div>
        <div style="font-size:15px;font-weight:800;color:#15803d;margin-top:3px">${formatBRL(t.valor)}</div>
        <div style="font-size:10px;color:#9ca3af;margin-top:1px">${t.count} entrada${t.count !== 1 ? 's' : ''}</div>
      </div>`).join('');

    const html = `<!DOCTYPE html><html lang="pt-BR"><head>
      <meta charset="UTF-8"/>
      <title>Relatório de Caixa — ${mesNome}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:16px 20px;}
        @page{size:A4;margin:12mm 14mm;}
        table{width:100%;border-collapse:collapse;}
        th{background:#1e3a5f;color:#fff;padding:8px 10px;text-align:left;font-size:11px;font-weight:700;}
        th.right{text-align:right;}
        .total-row td{font-weight:800;font-size:13px;background:#ecfdf5;border-top:2px solid #15803d;padding:9px 10px;color:#14532d;}
        .total-row td.right{text-align:right;color:#15803d;font-size:15px;}
        .rodape{margin-top:20px;font-size:9px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:8px;text-align:center;}
        @media print{body{padding:0;}}
      </style>
    </head><body>

      <!-- Cabeçalho -->
      <div style="border-bottom:3px solid #1d4ed8;padding-bottom:12px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:flex-end">
        <div>
          <div style="font-size:18px;font-weight:800;color:#1d4ed8">Relatório de Caixa</div>
          <div style="font-size:11px;color:#6b7280;margin-top:3px;text-transform:capitalize">
            Colégio Conexão Maranhense &nbsp;·&nbsp; ${mesNome}
          </div>
        </div>
        <div style="text-align:right;font-size:10px;color:#9ca3af">
          Emitido em: ${new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })}
        </div>
      </div>

      <!-- Cards de resumo -->
      <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
        <div style="background:#1e3a5f;border-radius:8px;padding:10px 20px;color:#fff;min-width:150px">
          <div style="font-size:10px;opacity:.7;text-transform:uppercase;font-weight:700;letter-spacing:.5px">Total no Caixa</div>
          <div style="font-size:18px;font-weight:800;margin-top:3px">${formatBRL(totalGeral)}</div>
          <div style="font-size:10px;opacity:.6;margin-top:1px">${rows.length} entradas no mês</div>
        </div>
        ${resumoCards}
      </div>

      <!-- Tabela principal -->
      <table>
        <thead>
          <tr>
            <th style="width:85px">Data</th>
            <th>Aluno</th>
            <th style="width:120px">Série</th>
            <th style="width:110px">Tipo</th>
            <th>Descrição</th>
            <th class="right" style="width:120px">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${linhas}
          <tr class="total-row">
            <td colspan="5">TOTAL DO MÊS · ${rows.length} entrada${rows.length !== 1 ? 's' : ''}</td>
            <td class="right">${formatBRL(totalGeral)}</td>
          </tr>
        </tbody>
      </table>

      <div class="rodape">
        COLÉGIO CONEXÃO MARANHENSE &nbsp;|&nbsp; CNPJ: 08.660.860/0001-63 &nbsp;|&nbsp;
        RECONHECIDO PELO CEE Nº 67/2019 &nbsp;|&nbsp;
        AVENIDA JOÃO PESSOA, 262 - OUTEIRO DA CRUZ, SÃO LUÍS – MA
      </div>
    </body></html>`;

    const janela = window.open('', '_blank', 'width=900,height=700');
    if (!janela) { toast.error('Permita pop-ups para imprimir'); return; }
    janela.document.write(html);
    janela.document.close();
    janela.focus();
    setTimeout(() => { janela.print(); }, 500);
  }

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  const mesLabel = (() => {
    if (!filtroMes) return '';
    const [ano, mes] = filtroMes.split('-');
    return new Date(parseInt(ano), parseInt(mes) - 1, 1)
      .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  })();

  // ─── Render ───────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onVoltar}
            className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Controle de Caixa</h2>
            <p className="text-muted-foreground text-sm mt-0.5 capitalize">
              Segmento <span className="font-semibold text-foreground capitalize">{segmentoGestor}</span> · {mesLabel}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setVersao(v => v + 1)}
            className="border-border text-foreground hover:bg-muted">
            <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={imprimirCaixa}
            className="border-border text-foreground hover:bg-muted">
            <Printer className="w-4 h-4 mr-2" /> Imprimir Mês
          </Button>
          <Button
            onClick={() => { setEditando(null); setForm({ ...FORM_INICIAL, data_entrada: hoje() }); setModalAberto(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" /> Registrar Entrada
          </Button>
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total no Caixa', valor: formatBRL(totalMes),                                  sub: `${qtdMes} entrada${qtdMes !== 1 ? 's' : ''}`, icon: <Banknote       className="w-5 h-5 text-white" />, cor: 'from-green-500 to-green-600',   borda: 'border-green-200 dark:border-green-800' },
          { label: 'Mensalidades',   valor: formatBRL(totalMensalidade),                          sub: 'Pagamentos regulares',                         icon: <FileCheck      className="w-5 h-5 text-white" />, cor: 'from-blue-500 to-blue-600',    borda: 'border-blue-200 dark:border-blue-800' },
          { label: 'Acordos',        valor: formatBRL(totalAcordo),                               sub: 'Negociações',                                  icon: <HandshakeIcon  className="w-5 h-5 text-white" />, cor: 'from-orange-500 to-orange-600', borda: 'border-orange-200 dark:border-orange-800' },
          { label: 'Outros',         valor: formatBRL(totalMes - totalMensalidade - totalAcordo), sub: 'Atrasados + outros',                           icon: <DollarSign     className="w-5 h-5 text-white" />, cor: 'from-violet-500 to-violet-600', borda: 'border-violet-200 dark:border-violet-800' },
        ].map(c => (
          <Card key={c.label} className={`bg-card border-2 ${c.borda}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                  <p className="text-lg font-bold text-foreground mt-1">{c.valor}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.sub}</p>
                </div>
                <div className={`w-10 h-10 bg-gradient-to-br ${c.cor} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  {c.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-foreground">Buscar aluno</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Nome do aluno..." className="pl-9 bg-background border-border text-foreground"
                  value={busca} onChange={e => { setBusca(e.target.value); setPagina(1); }} />
              </div>
            </div>
            <div>
              <Label className="text-xs text-foreground">Tipo</Label>
              <Select value={filtroTipo} onValueChange={v => { setFiltroTipo(v); setPagina(1); }}>
                <SelectTrigger className="mt-1 bg-background border-border text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  {TIPOS_PAGAMENTO.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-foreground">Mês/Ano</Label>
              <Input type="month" className="mt-1 bg-background border-border text-foreground"
                value={filtroMes} onChange={e => { setFiltroMes(e.target.value); setPagina(1); }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-foreground flex items-center gap-2">
              <Banknote className="w-4 h-4 text-green-600" /> Entradas no Caixa
            </CardTitle>
            <span className="text-xs text-muted-foreground capitalize">{mesLabel}</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b border-border">
                <tr>
                  {['Aluno', 'Série', 'Tipo', 'Valor', 'Data Entrada', 'Descrição', 'Ações'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={7} className="px-5 py-10 text-center">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto" />
                  </td></tr>
                ) : entradas.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center">
                    <Banknote className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">Nenhuma entrada registrada neste período.</p>
                    <p className="text-xs text-muted-foreground mt-1">Use "Registrar Entrada" para lançar um pagamento recebido.</p>
                  </td></tr>
                ) : entradas.map(e => (
                  <tr key={e.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-foreground max-w-[150px] truncate" title={e.aluno_nome}>
                      {e.aluno_nome}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{e.aluno_serie ?? '—'}</td>
                    <td className="px-4 py-3">{tipoBadge(e.tipo)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-green-700 dark:text-green-400 whitespace-nowrap">
                      {formatBRL(e.valor)}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {formatDate(e.data_entrada)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-[160px] truncate" title={e.observacao ?? ''}>
                      {e.observacao || <span className="opacity-30">—</span>}
                    </td>
                    {/* ── Ações ── */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => abrirEdicao(e)} title="Editar"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setModalExcluir(e)} title="Excluir"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{total} registro{total !== 1 ? 's' : ''}</p>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}>Anterior</Button>
              {Array.from({ length: Math.min(totalPaginas, 5) }, (_, i) => i + 1).map(p => (
                <Button key={p} variant="outline" size="sm"
                  className={pagina === p ? 'bg-blue-600 text-white border-blue-600' : ''}
                  onClick={() => setPagina(p)}>{p}</Button>
              ))}
              <Button variant="outline" size="sm" disabled={pagina === totalPaginas} onClick={() => setPagina(p => p + 1)}>Próximo</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Modal: Criar / Editar ── */}
      <Dialog open={modalAberto} onOpenChange={v => { if (!v) fecharModal(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              {editando
                ? <><Pencil  className="w-5 h-5 text-blue-600"  /> Editar Registro</>
                : <><Banknote className="w-5 h-5 text-green-600" /> Registrar Entrada no Caixa</>}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {editando ? `Editando entrada de ${editando.aluno_nome}` : 'Registre um valor que entrou no caixa da escola.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Aluno */}
            <div>
              <Label className="text-foreground text-xs font-semibold uppercase tracking-wide">Aluno *</Label>
              <div className="mt-1">
                <AutocompleteAluno
                  alunos={alunos}
                  value={{ id: form.aluno_id, nome: form.aluno_nome }}
                  onSelect={a => setForm(prev => ({ ...prev, aluno_id: a.id, aluno_nome: a.nome, segmento: a.segmento ?? 'ead' }))}
                />
              </div>
              {form.aluno_id && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Aluno selecionado
                </p>
              )}
            </div>

            {/* Tipo */}
            <div>
              <Label className="text-foreground text-xs font-semibold uppercase tracking-wide">Tipo *</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {TIPOS_PAGAMENTO.map(t => (
                  <button key={t.value} type="button"
                    onClick={() => setForm(prev => ({ ...prev, tipo: t.value }))}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      form.tipo === t.value
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-background border-border text-foreground hover:bg-muted'
                    }`}>
                    <span className={form.tipo === t.value ? 'text-white' : t.cor}>{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Valor + Data */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-foreground text-xs font-semibold uppercase tracking-wide">Valor (R$) *</Label>
                <Input className="mt-1 bg-background border-border text-foreground" placeholder="0,00"
                  value={form.valor} onChange={e => setForm(prev => ({ ...prev, valor: e.target.value }))} />
              </div>
              <div>
                <Label className="text-foreground text-xs font-semibold uppercase tracking-wide">Data de Entrada *</Label>
                <Input type="date" className="mt-1 bg-background border-border text-foreground"
                  value={form.data_entrada} onChange={e => setForm(prev => ({ ...prev, data_entrada: e.target.value }))} />
              </div>
            </div>

            {/* Descrição */}
            <div>
              <Label className="text-foreground text-xs font-semibold uppercase tracking-wide">
                Descrição <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input className="mt-1 bg-background border-border text-foreground"
                placeholder="Ex: referente a março/2026, desconto aplicado..."
                value={form.observacao} onChange={e => setForm(prev => ({ ...prev, observacao: e.target.value }))} />
            </div>

            {/* Preview */}
            {form.aluno_id && form.valor && (
              <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3">
                <p className="text-xs font-semibold text-green-800 dark:text-green-200 uppercase tracking-wide mb-1">Resumo</p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  <span className="font-semibold">{form.aluno_nome}</span>
                  {' · '}<span className="font-bold">{formatBRL(parseFloat(form.valor.replace(',', '.')) || 0)}</span>
                  {' · '}{TIPOS_PAGAMENTO.find(t => t.value === form.tipo)?.label}
                  {' · '}{formatDate(form.data_entrada)}
                </p>
              </div>
            )}

            {/* Botões */}
            <div className="flex gap-3 pt-2 border-t border-border">
              <Button variant="outline" className="flex-1 border-border text-foreground" onClick={fecharModal}>
                Cancelar
              </Button>
              <Button
                className={`flex-1 text-white ${editando ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
                disabled={salvando} onClick={salvar}>
                {salvando
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Salvando...</>
                  : editando
                    ? <><Save     className="w-4 h-4 mr-2" />Salvar Alterações</>
                    : <><Banknote className="w-4 h-4 mr-2" />Confirmar Entrada</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Confirmar exclusão ── */}
      <Dialog open={!!modalExcluir} onOpenChange={v => { if (!v) setModalExcluir(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" /> Confirmar Exclusão
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          {modalExcluir && (
            <div className="space-y-4 pt-1">
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 space-y-2">
                {[
                  { l: 'Aluno',  v: modalExcluir.aluno_nome },
                  { l: 'Valor',  v: formatBRL(modalExcluir.valor) },
                  { l: 'Tipo',   v: TIPOS_PAGAMENTO.find(t => t.value === modalExcluir.tipo)?.label ?? modalExcluir.tipo },
                  { l: 'Data',   v: formatDate(modalExcluir.data_entrada) },
                ].map(({ l, v }) => (
                  <div key={l} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{l}:</span>
                    <span className="font-semibold text-foreground">{v}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setModalExcluir(null)}>Cancelar</Button>
                <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  disabled={excluindo === modalExcluir.id}
                  onClick={() => excluir(modalExcluir.id)}>
                  {excluindo === modalExcluir.id
                    ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Excluindo...</>
                    : <><Trash2  className="w-4 h-4 mr-2" />Excluir Registro</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}