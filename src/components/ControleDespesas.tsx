import { useState, useEffect, useCallback } from 'react';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import {
  ArrowLeft, Plus, TrendingDown, CheckCircle,
  Clock, Loader2, Edit, Save, X, RefreshCw,
  DollarSign, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Tipos ───────────────────────────────────────────────
interface ControleDespesasProps {
  onVoltar: () => void;
}

type StatusDespesa = 'pendente' | 'em_dia' | 'quitado';
type CategoriaDespesa =
  | 'funcionarios' | 'agua' | 'luz' | 'impostos'
  | 'emprestimos'  | 'aluguel' | 'outros';

interface Despesa {
  id: string;
  descricao: string;
  categoria: CategoriaDespesa;
  valor_total: number;
  parcelas: number;
  parcelas_pagas: number;
  status: StatusDespesa;
  data_inicio: string | null;
  criado_em: string;
}

interface FormDespesa {
  descricao: string;
  categoria: CategoriaDespesa;
  valor_total: string;
  parcelas: string;
  data_inicio: string;
}

const FORM_INICIAL: FormDespesa = {
  descricao:   '',
  categoria:   'outros',
  valor_total: '',
  parcelas:    '1',
  data_inicio: new Date().toISOString().split('T')[0],
};

const CATEGORIAS: Record<CategoriaDespesa, { label: string; cor: string }> = {
  funcionarios: { label: 'Funcionários', cor: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200' },
  agua:         { label: 'Água',         cor: 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-200' },
  luz:          { label: 'Luz',          cor: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200' },
  impostos:     { label: 'Impostos',     cor: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200' },
  emprestimos:  { label: 'Empréstimos',  cor: 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200' },
  aluguel:      { label: 'Aluguel',      cor: 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200' },
  outros:       { label: 'Outros',       cor: 'bg-muted text-muted-foreground' },
};

const STATUS_CONFIG: Record<StatusDespesa, { label: string; cls: string }> = {
  pendente: { label: 'Pendente', cls: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700' },
  em_dia:   { label: 'Em Dia',  cls: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700' },
  quitado:  { label: 'Quitado', cls: 'bg-muted text-muted-foreground border-border' },
};

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

function CategoriaBadge({ cat }: { cat: CategoriaDespesa }) {
  const c = CATEGORIAS[cat];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${c.cor}`}>
      {c.label}
    </span>
  );
}

function StatusBadge({ status }: { status: StatusDespesa }) {
  const s = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${s.cls}`}>
      {s.label}
    </span>
  );
}

// ─── Componente principal ─────────────────────────────────
export function ControleDespesas({ onVoltar }: ControleDespesasProps) {
  const [despesas, setDespesas]         = useState<Despesa[]>([]);
  const [loading, setLoading]           = useState(true);
  const [salvando, setSalvando]         = useState(false);
  const [modalNova, setModalNova]       = useState(false);
  const [editando, setEditando]         = useState<Despesa | null>(null);
  const [form, setForm]                 = useState<FormDespesa>(FORM_INICIAL);
  const [filtroCateg, setFiltroCateg]   = useState('todas');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [versao, setVersao]             = useState(0);
  const [confirmId, setConfirmId]       = useState<string | null>(null);

  // Totais
  const totalGeral   = despesas.reduce((s, d) => s + d.valor_total, 0);
  const totalPago    = despesas.filter(d => d.status === 'quitado' || d.status === 'em_dia')
    .reduce((s, d) => s + (d.valor_total / d.parcelas) * d.parcelas_pagas, 0);
  const totalPendente = totalGeral - totalPago;

  // ── Carregar ─────────────────────────────────────────
  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('financeiro_despesas')
        .select('*')
        .order('criado_em', { ascending: false });

      if (filtroCateg !== 'todas') query = query.eq('categoria', filtroCateg);
      if (filtroStatus !== 'todos') query = query.eq('status', filtroStatus);

      const { data, error } = await query;
      if (error) throw error;
      setDespesas(data ?? []);
    } catch (e: any) {
      toast.error('Erro ao carregar: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [filtroCateg, filtroStatus, versao]);

  useEffect(() => { carregar(); }, [carregar]);

  const set = (campo: keyof FormDespesa, valor: string) =>
    setForm(prev => ({ ...prev, [campo]: valor }));

  // ── Abrir edição ─────────────────────────────────────
  function abrirEdicao(d: Despesa) {
    setEditando(d);
    setForm({
      descricao:   d.descricao,
      categoria:   d.categoria,
      valor_total: d.valor_total.toFixed(2).replace('.', ','),
      parcelas:    String(d.parcelas),
      data_inicio: d.data_inicio?.split('T')[0] ?? '',
    });
    setModalNova(true);
  }

  function fecharModal() {
    setModalNova(false);
    setEditando(null);
    setForm(FORM_INICIAL);
  }

  // ── Salvar ───────────────────────────────────────────
  async function salvar() {
    if (!form.descricao.trim()) { toast.error('Informe a descrição'); return; }
    if (!form.valor_total)      { toast.error('Informe o valor');      return; }

    setSalvando(true);
    try {
      const payload = {
        descricao:   form.descricao.trim(),
        categoria:   form.categoria,
        valor_total: parseFloat(form.valor_total.replace(',', '.')),
        parcelas:    parseInt(form.parcelas) || 1,
        data_inicio: form.data_inicio || null,
      };

      if (editando) {
        const { error } = await supabase
          .from('financeiro_despesas')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editando.id);
        if (error) throw error;
        toast.success('Despesa atualizada!');
      } else {
        const { error } = await supabase
          .from('financeiro_despesas')
          .insert({ ...payload, status: 'pendente', parcelas_pagas: 0 });
        if (error) throw error;
        toast.success('Despesa cadastrada!');
      }

      fecharModal();
      setVersao(v => v + 1);
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    } finally {
      setSalvando(false);
    }
  }

  // ── Registrar pagamento de parcela ───────────────────
  async function registrarParcela(d: Despesa) {
    if (d.parcelas_pagas >= d.parcelas) {
      toast.info('Todas as parcelas já foram pagas');
      return;
    }
    try {
      const novasPagas = d.parcelas_pagas + 1;
      const novoStatus: StatusDespesa =
        novasPagas >= d.parcelas ? 'quitado' : 'em_dia';

      const { error } = await supabase
        .from('financeiro_despesas')
        .update({
          parcelas_pagas: novasPagas,
          status:         novoStatus,
          updated_at:     new Date().toISOString(),
        })
        .eq('id', d.id);
      if (error) throw error;
      toast.success(`Parcela ${novasPagas}/${d.parcelas} registrada!`);
      setVersao(v => v + 1);
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    }
  }

  // ── Excluir ──────────────────────────────────────────
  function excluir(id: string) {
    setConfirmId(id);
  }

  // ─── Render ───────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onVoltar}
            className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Controle de Despesas</h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              Gerencie despesas fixas e parceladas
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"
            onClick={() => setVersao(v => v + 1)}
            className="border-border text-foreground hover:bg-muted">
            <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
          </Button>
          <Button onClick={() => setModalNova(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" /> Nova Despesa
          </Button>
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: 'Total de Despesas', valor: formatBRL(totalGeral),    icon: <TrendingDown className="w-6 h-6 text-white" />, cor: 'from-slate-500 to-slate-600',  borda: 'border-slate-200 dark:border-slate-700' },
          { label: 'Total Pago',        valor: formatBRL(totalPago),     icon: <CheckCircle  className="w-6 h-6 text-white" />, cor: 'from-green-500 to-green-600',   borda: 'border-green-200 dark:border-green-800' },
          { label: 'Total Pendente',    valor: formatBRL(totalPendente), icon: <Clock        className="w-6 h-6 text-white" />, cor: 'from-red-500 to-red-600',       borda: 'border-red-200 dark:border-red-800' },
        ].map(c => (
          <Card key={c.label} className={`bg-card border-2 ${c.borda}`}>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-xl font-bold text-foreground mt-1">{c.valor}</p>
              </div>
              <div className={`w-12 h-12 bg-gradient-to-br ${c.cor} rounded-xl flex items-center justify-center`}>
                {c.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-foreground">Categoria</Label>
              <Select value={filtroCateg} onValueChange={setFiltroCateg}>
                <SelectTrigger className="mt-1 bg-background border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as categorias</SelectItem>
                  {(Object.keys(CATEGORIAS) as CategoriaDespesa[]).map(k => (
                    <SelectItem key={k} value={k}>{CATEGORIAS[k].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-foreground">Status</Label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="mt-1 bg-background border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_dia">Em Dia</SelectItem>
                  <SelectItem value="quitado">Quitado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de despesas */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : despesas.length === 0 ? (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="p-12 text-center">
            <DollarSign className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Nenhuma despesa cadastrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {despesas.map(d => {
            const valorParcela = d.valor_total / d.parcelas;
            const pct = Math.round((d.parcelas_pagas / d.parcelas) * 100);

            return (
              <Card key={d.id} className="bg-card border-border hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">

                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <CategoriaBadge cat={d.categoria} />
                        <StatusBadge status={d.status} />
                      </div>
                      <h3 className="font-semibold text-foreground text-sm mt-1">
                        {d.descricao}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Criado em: {formatDate(d.criado_em)}
                        {d.data_inicio && ` · Início: ${formatDate(d.data_inicio)}`}
                      </p>

                      {/* Barra de progresso */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">
                            Parcelas: {d.parcelas_pagas}/{d.parcelas}
                          </span>
                          <span className="text-xs text-muted-foreground">{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              pct === 100 ? 'bg-green-500' :
                              pct > 0     ? 'bg-blue-500'  : 'bg-muted-foreground/30'
                            }`}
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* Valores */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-muted-foreground">Valor Total</p>
                      <p className="text-lg font-bold text-foreground">
                        {formatBRL(d.valor_total)}
                      </p>
                      {d.parcelas > 1 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatBRL(valorParcela)}/parcela
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                    {d.status !== 'quitado' && (
                      <Button size="sm"
                        onClick={() => registrarParcela(d)}
                        className="bg-green-600 hover:bg-green-700 text-white text-xs h-7 px-3">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Registrar Parcela
                      </Button>
                    )}
                    <Button size="sm" variant="outline"
                      onClick={() => abrirEdicao(d)}
                      className="border-border text-foreground hover:bg-muted text-xs h-7 px-3">
                      <Edit className="w-3 h-3 mr-1" /> Editar
                    </Button>
                    <Button size="sm" variant="outline"
                      onClick={() => excluir(d.id)}
                      className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs h-7 px-3 ml-auto">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal — Nova / Editar despesa */}
      <Dialog open={modalNova} onOpenChange={fecharModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              {editando
                ? <><Edit className="w-4 h-4 text-blue-500" /> Editar Despesa</>
                : <><Plus className="w-4 h-4 text-blue-500" /> Nova Despesa</>}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {editando ? 'Altere os dados da despesa.' : 'Cadastre uma nova despesa fixa ou parcelada.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-foreground text-xs font-semibold uppercase">Descrição *</Label>
              <Input className="mt-1 bg-background border-border text-foreground"
                placeholder="Ex: Folha de Pagamento - Janeiro/2026"
                value={form.descricao}
                onChange={e => set('descricao', e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-foreground text-xs font-semibold uppercase">Categoria</Label>
                <Select value={form.categoria}
                  onValueChange={v => set('categoria', v as CategoriaDespesa)}>
                  <SelectTrigger className="mt-1 bg-background border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CATEGORIAS) as CategoriaDespesa[]).map(k => (
                      <SelectItem key={k} value={k}>{CATEGORIAS[k].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-foreground text-xs font-semibold uppercase">Valor Total (R$) *</Label>
                <Input className="mt-1 bg-background border-border text-foreground"
                  placeholder="0,00"
                  value={form.valor_total}
                  onChange={e => set('valor_total', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-foreground text-xs font-semibold uppercase">Nº de Parcelas</Label>
                <Select value={form.parcelas} onValueChange={v => set('parcelas', v)}>
                  <SelectTrigger className="mt-1 bg-background border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8,9,10,11,12,18,24,36,48,60].map(n => (
                      <SelectItem key={n} value={String(n)}>
                        {n === 1 ? 'À vista' : `${n}x`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-foreground text-xs font-semibold uppercase">Data de Início</Label>
                <Input type="date" className="mt-1 bg-background border-border text-foreground"
                  value={form.data_inicio}
                  onChange={e => set('data_inicio', e.target.value)} />
              </div>
            </div>

            {/* Preview valor por parcela */}
            {form.valor_total && parseInt(form.parcelas) > 1 && (
              <div className="p-3 bg-muted/30 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground">Valor por parcela</p>
                <p className="text-base font-bold text-foreground mt-0.5">
                  {formatBRL(
                    parseFloat(form.valor_total.replace(',', '.')) /
                    (parseInt(form.parcelas) || 1)
                  )}
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-2 border-t border-border">
              <Button variant="outline" className="flex-1 border-border text-foreground"
                onClick={fecharModal}>
                Cancelar
              </Button>
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={salvando} onClick={salvar}>
                {salvando
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Salvando...</>
                  : <><Save className="w-4 h-4 mr-2" />Salvar</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmId} onOpenChange={() => setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta despesa?</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground px-1">Esta ação não pode ser desfeita.</p>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirmId) return;
                try {
                  const { error } = await supabase
                    .from('financeiro_despesas')
                    .delete()
                    .eq('id', confirmId);
                  if (error) throw error;
                  toast.success('Despesa removida!');
                  setVersao(v => v + 1);
                } catch (e: any) {
                  toast.error('Erro: ' + e.message);
                }
                setConfirmId(null);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}