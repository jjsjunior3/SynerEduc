// src/components/GerenciadorUsuariosFixed.tsx
import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Label } from './ui/label';
import {
  ArrowLeft, Search, Edit, Trash2, Users, RefreshCw,
  Eye, EyeOff, Loader2, ShieldCheck, X, KeyRound, Copy, Check,
  AlertTriangle, UserX, Archive,
} from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner';
import { supabase } from '../supabase/supabaseClient';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface GerenciadorUsuariosProps {
  onVoltar: () => void;
  segmentoForcado?: 'ead' | 'presencial';
}

type StatusUsuario = 'ativo' | 'inativo' | 'transferido' | 'formado' | 'evadido';

interface Usuario {
  id: string; nome: string; email: string; tipo: string;
  serie?: string; status: StatusUsuario;
  segmento: 'ead' | 'presencial';
  turno?: string | null; nivel?: string | null;
  criadoEm: string;
}

// ─── Dados estáticos ──────────────────────────────────────────────────────────
// Modal de edição: apenas os tipos relevantes para o admin presencial
const tiposUsuario = [
  { value: 'aluno',                 label: 'Aluno' },
  { value: 'professor',             label: 'Professor' },
  { value: 'coordenador',           label: 'Coordenador' },
  { value: 'administrador',         label: 'Administrador' },
  { value: 'admin_presencial',      label: 'Admin Presencial' },
  { value: 'professor_conteudista', label: 'Prof. Conteudista' },
  { value: 'gestor_geral',          label: 'Gestor Geral' },
  { value: 'secretaria',            label: 'Secretaria' },
  { value: 'financeiro',            label: 'Financeiro' },
  { value: 'responsavel',           label: 'Responsável' },
];

const STATUS_CONFIG: Record<StatusUsuario, { label: string; className: string }> = {
  ativo:       { label: 'Ativo',       className: 'bg-green-100  text-green-800  dark:bg-green-900/30  dark:text-green-300'  },
  inativo:     { label: 'Inativo',     className: 'bg-muted      text-muted-foreground'                                      },
  transferido: { label: 'Transferido', className: 'bg-blue-100   text-blue-800   dark:bg-blue-900/30   dark:text-blue-300'   },
  formado:     { label: 'Formado',     className: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300' },
  evadido:     { label: 'Evadido',     className: 'bg-amber-100  text-amber-800  dark:bg-amber-900/30  dark:text-amber-300'  },
};

// Status que significam "arquivo morto" — não aparecem no filtro padrão
const STATUS_ARQUIVO: StatusUsuario[] = ['inativo', 'transferido', 'formado', 'evadido'];

const TIPO_CORES: Record<string, string> = {
  aluno:                 'bg-blue-100   text-blue-800   dark:bg-blue-900/30   dark:text-blue-300',
  professor:             'bg-green-100  text-green-800  dark:bg-green-900/30  dark:text-green-300',
  coordenador:           'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  administrador:         'bg-red-100    text-red-800    dark:bg-red-900/30    dark:text-red-300',
  professor_conteudista: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  gestor_geral:          'bg-cyan-100   text-cyan-800   dark:bg-cyan-900/30   dark:text-cyan-300',
  secretaria:            'bg-pink-100   text-pink-800   dark:bg-pink-900/30   dark:text-pink-300',
  financeiro:            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  responsavel:           'bg-teal-100   text-teal-800   dark:bg-teal-900/30   dark:text-teal-300',
  admin_presencial:      'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
};

const TipoBadge = ({ tipo }: { tipo: string }) => (
  <Badge className={`${TIPO_CORES[tipo] || 'bg-muted text-muted-foreground'} border-0 text-xs font-medium`}>
    {tiposUsuario.find(t => t.value === tipo)?.label || tipo}
  </Badge>
);

const StatusBadge = ({ status }: { status: StatusUsuario }) => {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.inativo;
  return <Badge className={`${cfg.className} border-0 text-xs font-medium`}>{cfg.label}</Badge>;
};

// ─── Componente principal ─────────────────────────────────────────────────────
export function GerenciadorUsuarios({ onVoltar, segmentoForcado }: GerenciadorUsuariosProps) {
  const [usuarios, setUsuarios]   = useState<Usuario[]>([]);
  const [loading, setLoading]     = useState(true);

  // Filtros
  const [filtroBusca, setFiltroBusca]         = useState('');
  const [filtroTipo, setFiltroTipo]           = useState('todos');
  const [filtroSegmento, setFiltroSegmento]   = useState(segmentoForcado ?? 'todos');
  const [filtroSerie, setFiltroSerie]         = useState('todas');
  const [filtroStatus, setFiltroStatus]       = useState<'ativos' | 'arquivo' | 'todos'>('ativos');

  // Séries disponíveis para filtro e edição
  const [seriesDisponiveis, setSeriesDisponiveis] = useState<string[]>([]);

  // Modal de edição
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [mostrarDialog, setMostrarDialog]     = useState(false);
  const [mostrarSenha, setMostrarSenha]       = useState(false);
  const [salvandoEdicao, setSalvandoEdicao]   = useState(false);
  const [copiado, setCopiado]                 = useState(false);
  const [edicao, setEdicao] = useState({
    nome: '', email: '', tipo: 'aluno',
    serie: '', status: 'ativo' as StatusUsuario,
    segmento: (segmentoForcado ?? 'ead') as 'ead' | 'presencial',
    turno: '', nivel: '', novaSenha: '',
  });

  // Modal de confirmação de exclusão
  const [modalExclusao, setModalExclusao]     = useState<Usuario | null>(null);
  const [verificandoRegistros, setVerificandoRegistros] = useState(false);
  const [temRegistros, setTemRegistros]       = useState(false);
  const [excluindo, setExcluindo]             = useState(false);

  const mostrarTurno = edicao.segmento === 'presencial';
  const mostrarNivel = edicao.segmento === 'presencial' && edicao.tipo === 'coordenador';

  const getToken = async () => (await supabase.auth.getSession()).data.session?.access_token;

  // ─── Loaders ────────────────────────────────────────────────────────────────
  const carregarSeries = async () => {
    const { data } = await supabase
      .from('series').select('nome, ativa, segmento').order('nome');
    const filtradas = segmentoForcado
      ? (data || []).filter((s: any) => s.segmento === segmentoForcado)
      : data || [];
    setSeriesDisponiveis(
      filtradas.filter((s: any) => s.ativa !== false).map((s: any) => s.nome).filter(Boolean)
    );
  };

  const carregarUsuarios = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_users_with_email');
      if (error) throw error;

      let arr = (data || []) as any[];
      if (segmentoForcado) arr = arr.filter(u => u.segmento === segmentoForcado);

      setUsuarios(arr.map(u => ({
        id:       u.id,
        nome:     u.nome     || 'Nome não informado',
        email:    u.email    || '—',
        tipo:     u.tipo     || 'aluno',
        serie:    u.serie    || '',
        status:   (u.status  || 'ativo') as StatusUsuario,
        segmento: u.segmento || 'ead',
        turno:    u.turno    || null,
        nivel:    u.nivel    || null,
        criadoEm: u.criado_em || new Date().toISOString(),
      })));
    } catch (err: any) {
      toast.error(`Erro ao carregar usuários: ${err.message}`);
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([carregarUsuarios(), carregarSeries()]);
  }, []);

  useEffect(() => { setFiltroSerie('todas'); }, [filtroSegmento]);

  // ─── Filtros computados ──────────────────────────────────────────────────────
  const seriesUnicas = React.useMemo(() => {
    const base = filtroSegmento === 'todos'
      ? usuarios : usuarios.filter(u => u.segmento === filtroSegmento);
    return Array.from(new Set(base.map(u => u.serie).filter(Boolean))).sort() as string[];
  }, [usuarios, filtroSegmento]);

  const usuariosFiltrados = React.useMemo(() => {
    return usuarios.filter(u => {
      const q            = filtroBusca.toLowerCase().trim();
      const matchBusca   = !q || u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchTipo    = filtroTipo     === 'todos' || u.tipo     === filtroTipo;
      const matchSeg     = filtroSegmento === 'todos' || u.segmento === filtroSegmento;
      const matchSerie   = filtroSerie    === 'todas' || u.serie    === filtroSerie;
      const matchStatus  =
        filtroStatus === 'todos'   ? true :
        filtroStatus === 'ativos'  ? u.status === 'ativo' :
        STATUS_ARQUIVO.includes(u.status);
      return matchBusca && matchTipo && matchSeg && matchSerie && matchStatus;
    });
  }, [usuarios, filtroBusca, filtroTipo, filtroSegmento, filtroSerie, filtroStatus]);

  const filtrosAtivos =
    filtroBusca || filtroTipo !== 'todos' ||
    (segmentoForcado ? false : filtroSegmento !== 'todos') ||
    filtroSerie !== 'todas' || filtroStatus !== 'ativos';

  const limparFiltros = () => {
    setFiltroBusca(''); setFiltroTipo('todos');
    setFiltroSegmento(segmentoForcado ?? 'todos');
    setFiltroSerie('todas'); setFiltroStatus('ativos');
  };

  // ─── Edição ──────────────────────────────────────────────────────────────────
  const abrirEdicao = (u: Usuario) => {
    setUsuarioEditando(u);
    setMostrarSenha(false); setCopiado(false);
    setEdicao({
      nome: u.nome, email: u.email === '—' ? '' : u.email,
      tipo: u.tipo, serie: u.serie || '',
      status: u.status,
      segmento: segmentoForcado ?? u.segmento ?? 'ead',
      turno: u.turno || '', nivel: u.nivel || '', novaSenha: '',
    });
    setMostrarDialog(true);
  };

  const gerarSenha = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
    const senha = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setEdicao(p => ({ ...p, novaSenha: senha }));
    setMostrarSenha(true);
  };

  const copiarSenha = async () => {
    if (!edicao.novaSenha) return;
    await navigator.clipboard.writeText(edicao.novaSenha);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const salvarEdicao = async () => {
    if (!usuarioEditando) return;
    setSalvandoEdicao(true);
    try {
      const token = await getToken();
      if (!token) { toast.error('Sessão expirada.'); return; }

      const payload: any = {
        id: usuarioEditando.id,
        nome: edicao.nome, email: edicao.email,
        tipo: edicao.tipo, serie: edicao.serie,
        status: edicao.status,
        segmento: edicao.segmento,
        turno:  mostrarTurno ? edicao.turno  || null : null,
        nivel:  mostrarNivel ? edicao.nivel  || null : null,
      };
      if (edicao.novaSenha) payload.novaSenha = edicao.novaSenha;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/admin-manage-users`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) throw new Error(await response.text());
      toast.success('Usuário atualizado com sucesso!');
      setMostrarDialog(false); setUsuarioEditando(null);
      carregarUsuarios();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setSalvandoEdicao(false);
    }
  };

  // ─── Exclusão com proteção ────────────────────────────────────────────────────
  const abrirConfirmacaoExclusao = async (u: Usuario) => {
    setModalExclusao(u);
    setVerificandoRegistros(true);
    setTemRegistros(false);

    try {
      // Verifica se tem ficha de matrícula — principal indicador de aluno real
      const { count } = await supabase
        .from('fichas_matricula')
        .select('*', { count: 'exact', head: true })
        .eq('aluno_id', u.id);

      setTemRegistros((count ?? 0) > 0);
    } catch {
      // Se não conseguir verificar, assume que tem registros (mais seguro)
      setTemRegistros(true);
    } finally {
      setVerificandoRegistros(false);
    }
  };

  const confirmarExclusao = async () => {
    if (!modalExclusao) return;
    setExcluindo(true);
    try {
      const token = await getToken();
      if (!token) { toast.error('Sessão expirada.'); return; }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/admin-manage-users`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: modalExclusao.id }),
        }
      );
      if (!response.ok) throw new Error(await response.text());
      toast.success('Usuário excluído permanentemente.');
      setModalExclusao(null);
      carregarUsuarios();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setExcluindo(false);
    }
  };

  const inativarDiretamente = async (u: Usuario, novoStatus: StatusUsuario) => {
    try {
      const token = await getToken();
      if (!token) { toast.error('Sessão expirada.'); return; }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/admin-manage-users`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: u.id, nome: u.nome, email: u.email, tipo: u.tipo, serie: u.serie, status: novoStatus, segmento: u.segmento, turno: u.turno, nivel: u.nivel }),
        }
      );
      if (!response.ok) throw new Error(await response.text());

      const labels: Record<StatusUsuario, string> = {
        ativo: 'ativado', inativo: 'inativado', transferido: 'marcado como transferido',
        formado: 'marcado como formado', evadido: 'marcado como evadido',
      };
      toast.success(`${u.nome} ${labels[novoStatus] ?? 'atualizado'}.`);
      setModalExclusao(null);
      carregarUsuarios();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  // ─── Contadores ──────────────────────────────────────────────────────────────
  const counts = React.useMemo(() => ({
    total:        usuarios.length,
    ativos:       usuarios.filter(u => u.status === 'ativo').length,
    arquivo:      usuarios.filter(u => STATUS_ARQUIVO.includes(u.status)).length,
    alunos:       usuarios.filter(u => u.tipo === 'aluno' && u.status === 'ativo').length,
    professores:  usuarios.filter(u => u.tipo === 'professor').length,
    coordenadores:usuarios.filter(u => u.tipo === 'coordenador').length,
  }), [usuarios]);

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-16">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onVoltar} className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" /> Gerenciar Usuários
            </h1>
            <p className="text-xs text-muted-foreground">
              Visualizar, editar e gerenciar usuários{segmentoForcado ? ` presenciais` : ''}
            </p>
          </div>
        </div>
        <Button onClick={() => Promise.all([carregarUsuarios(), carregarSeries()])}
          disabled={loading} variant="outline" size="sm" className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { label: 'Total',         value: counts.total,         color: 'text-foreground' },
          { label: 'Ativos',        value: counts.ativos,        color: 'text-green-600 dark:text-green-400' },
          { label: 'Arquivo',       value: counts.arquivo,       color: 'text-muted-foreground' },
          { label: 'Alunos',        value: counts.alunos,        color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Professores',   value: counts.professores,   color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Coordenadores', value: counts.coordenadores, color: 'text-violet-600 dark:text-violet-400' },
        ].map(s => (
          <Card key={s.label} className="border-border">
            <CardContent className="p-4 text-center">
              <div className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <Card className="border-border">
        <CardContent className="p-5 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input placeholder="Buscar por nome ou email..." value={filtroBusca}
              onChange={e => setFiltroBusca(e.target.value)}
              className="pl-10 bg-background" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Status — toggle rápido */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Situação</Label>
              <div className="flex rounded-lg border border-border overflow-hidden">
                {([
                  { value: 'ativos',  label: 'Ativos' },
                  { value: 'arquivo', label: 'Arquivo' },
                  { value: 'todos',   label: 'Todos'  },
                ] as const).map(opt => (
                  <button key={opt.value} onClick={() => setFiltroStatus(opt.value)}
                    className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                      filtroStatus === opt.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background text-muted-foreground hover:bg-muted'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="bg-background h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  {tiposUsuario.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {!segmentoForcado && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Segmento</Label>
                <Select value={filtroSegmento} onValueChange={setFiltroSegmento}>
                  <SelectTrigger className="bg-background h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">EAD + Presencial</SelectItem>
                    <SelectItem value="ead">Somente EAD</SelectItem>
                    <SelectItem value="presencial">Somente Presencial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Série</Label>
              <Select value={filtroSerie} onValueChange={setFiltroSerie}>
                <SelectTrigger className="bg-background h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as séries</SelectItem>
                  {seriesUnicas.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {filtrosAtivos && (
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{usuariosFiltrados.length}</span>
                {' '}usuário{usuariosFiltrados.length !== 1 ? 's' : ''} encontrado{usuariosFiltrados.length !== 1 ? 's' : ''}
              </p>
              <Button variant="ghost" size="sm" onClick={limparFiltros}
                className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3" /> Limpar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card className="border-border">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="flex items-center gap-2 text-foreground text-base">
            <Users className="w-4 h-4 text-primary" />
            {filtrosAtivos ? 'Resultado da busca' : 'Todos os usuários'}
            <Badge variant="secondary" className="ml-1">{usuariosFiltrados.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-muted-foreground">Carregando usuários...</span>
            </div>
          ) : usuariosFiltrados.length === 0 ? (
            <div className="text-center py-16">
              <Search className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-20" />
              <p className="text-foreground font-medium mb-1">Nenhum usuário encontrado</p>
              <p className="text-muted-foreground text-sm mb-4">Tente ajustar os filtros.</p>
              {filtrosAtivos && (
                <Button variant="outline" size="sm" onClick={limparFiltros} className="gap-2">
                  <X className="w-4 h-4" /> Limpar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground font-medium">Nome</TableHead>
                    <TableHead className="text-muted-foreground font-medium">Email de acesso</TableHead>
                    <TableHead className="text-muted-foreground font-medium">Tipo</TableHead>
                    <TableHead className="text-muted-foreground font-medium">Turno</TableHead>
                    <TableHead className="text-muted-foreground font-medium">Série</TableHead>
                    <TableHead className="text-muted-foreground font-medium">Status</TableHead>
                    <TableHead className="text-muted-foreground font-medium text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuariosFiltrados.map(u => (
                    <TableRow key={u.id} className={`border-border hover:bg-muted/30 ${
                      STATUS_ARQUIVO.includes(u.status) ? 'opacity-60' : ''
                    }`}>
                      <TableCell className="font-medium text-foreground">{u.nome}</TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground font-mono truncate max-w-[180px] block">
                          {u.email}
                        </span>
                      </TableCell>
                      <TableCell><TipoBadge tipo={u.tipo} /></TableCell>
                      <TableCell>
                        {u.turno
                          ? <span className="text-sm text-foreground capitalize">{u.turno}</span>
                          : <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                      <TableCell>
                        {u.tipo === 'aluno' && (
                          <Badge variant="outline" className="text-xs border-border text-foreground">
                            {u.serie || 'Não definida'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell><StatusBadge status={u.status} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => abrirEdicao(u)}
                            className="hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 h-8 w-8 p-0"
                            title="Editar">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => abrirConfirmacaoExclusao(u)}
                            className="hover:bg-destructive/10 hover:text-destructive h-8 w-8 p-0"
                            title="Excluir / Inativar">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ══ Modal de Edição (sem disciplinas/séries — Bug 4 fix) ══ */}
      <Dialog open={mostrarDialog} onOpenChange={open => { if (!open) { setMostrarDialog(false); setUsuarioEditando(null); } }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Editar Usuário</DialogTitle>
            <DialogDescription>
              {usuarioEditando?.email && (
                <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{usuarioEditando.email}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">Nome Completo</Label>
              <Input value={edicao.nome}
                onChange={e => setEdicao(p => ({ ...p, nome: e.target.value }))}
                className="bg-background" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">Email de acesso</Label>
              <Input type="email" value={edicao.email}
                onChange={e => setEdicao(p => ({ ...p, email: e.target.value }))}
                className="bg-background" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">Tipo de Usuário</Label>
              <Select value={edicao.tipo} onValueChange={v => setEdicao(p => ({ ...p, tipo: v, nivel: '' }))}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tiposUsuario.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className={`grid gap-3 ${mostrarTurno ? (mostrarNivel ? 'grid-cols-3' : 'grid-cols-2') : 'grid-cols-1'}`}>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Segmento</Label>
                {segmentoForcado ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted text-sm">
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Presencial</span>
                    <span className="text-xs text-muted-foreground">fixo</span>
                  </div>
                ) : (
                  <Select value={edicao.segmento}
                    onValueChange={(v: 'ead' | 'presencial') => setEdicao(p => ({ ...p, segmento: v, turno: '', nivel: '' }))}>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ead">EAD</SelectItem>
                      <SelectItem value="presencial">Presencial</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              {mostrarTurno && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-foreground">Turno</Label>
                  <Select value={edicao.turno} onValueChange={v => setEdicao(p => ({ ...p, turno: v }))}>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="matutino">Matutino</SelectItem>
                      <SelectItem value="vespertino">Vespertino</SelectItem>
                      <SelectItem value="noturno">Noturno</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {mostrarNivel && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-foreground">Nível</Label>
                  <Select value={edicao.nivel} onValueChange={v => setEdicao(p => ({ ...p, nivel: v }))}>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fundamental1">Fund. I</SelectItem>
                      <SelectItem value="fundamental2">Fund. II</SelectItem>
                      <SelectItem value="medio">Ens. Médio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Série — apenas aluno */}
            {edicao.tipo === 'aluno' && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Série</Label>
                <Select value={edicao.serie} onValueChange={v => setEdicao(p => ({ ...p, serie: v }))}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione a série" /></SelectTrigger>
                  <SelectContent>
                    {seriesDisponiveis.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Para vincular disciplinas use o módulo Gestão de Vínculos.
                </p>
              </div>
            )}

            {/* Redefinir senha */}
            <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-4">
              <div className="flex items-center gap-2 mb-1">
                <KeyRound className="w-4 h-4 text-primary" />
                <Label className="text-sm font-semibold text-foreground">Redefinir Senha</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Digite uma nova senha ou gere uma aleatória. Deixe em branco para não alterar.
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={mostrarSenha ? 'text' : 'password'}
                    value={edicao.novaSenha}
                    onChange={e => setEdicao(p => ({ ...p, novaSenha: e.target.value }))}
                    placeholder="Nova senha..."
                    className="bg-background pr-10 font-mono"
                  />
                  <button type="button" onClick={() => setMostrarSenha(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {edicao.novaSenha && (
                  <Button type="button" variant="outline" size="sm" onClick={copiarSenha} className="gap-1.5 shrink-0">
                    {copiado ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    {copiado ? 'Copiado' : 'Copiar'}
                  </Button>
                )}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={gerarSenha} className="gap-2 w-full">
                <KeyRound className="w-3.5 h-3.5" /> Gerar senha aleatória segura
              </Button>
              {edicao.novaSenha && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  ⚠️ Anote ou copie a senha antes de salvar.
                </p>
              )}
            </div>

            {/* Status — expandido */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">Status</Label>
              <Select value={edicao.status}
                onValueChange={(v: StatusUsuario) => setEdicao(p => ({ ...p, status: v }))}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="transferido">Transferido</SelectItem>
                  <SelectItem value="formado">Formado</SelectItem>
                  <SelectItem value="evadido">Evadido</SelectItem>
                </SelectContent>
              </Select>
              {edicao.status !== 'ativo' && (
                <p className="text-xs text-muted-foreground">
                  Usuários não-ativos ficam no arquivo morto e preservam todo o histórico.
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-2 border-t border-border">
              <Button onClick={salvarEdicao} disabled={!edicao.nome || !edicao.email || salvandoEdicao} className="flex-1 gap-2">
                {salvandoEdicao ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Salvar Alterações'}
              </Button>
              <Button variant="outline" onClick={() => { setMostrarDialog(false); setUsuarioEditando(null); }}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══ Modal de exclusão com proteção ══ */}
      <Dialog open={!!modalExclusao} onOpenChange={open => { if (!open) setModalExclusao(null); }}>
        <DialogContent className="sm:max-w-md bg-background border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Excluir usuário
            </DialogTitle>
            <DialogDescription>
              {modalExclusao?.nome && (
                <span className="font-semibold text-foreground">{modalExclusao.nome}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          {verificandoRegistros ? (
            <div className="flex items-center justify-center py-8 gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Verificando registros...</span>
            </div>
          ) : temRegistros ? (
            /* Tem registros reais — bloqueia exclusão, oferece arquivo */
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
                <Archive className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Este usuário tem registros no sistema</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                    Fichas de matrícula, notas, contratos e/ou frequência foram encontrados.
                    A exclusão permanente apagaria o histórico escolar.
                  </p>
                </div>
              </div>

              <p className="text-sm text-foreground font-medium">O que deseja fazer?</p>

              <div className="space-y-2">
                {([
                  { status: 'inativo'     as StatusUsuario, label: 'Inativar', desc: 'Mantém o acesso desativado mas preserva todo o histórico', icon: UserX,   color: 'border-border hover:border-muted-foreground' },
                  { status: 'transferido' as StatusUsuario, label: 'Transferido', desc: 'Aluno foi para outra escola', icon: Archive, color: 'border-blue-200 dark:border-blue-800 hover:border-blue-400' },
                  { status: 'evadido'     as StatusUsuario, label: 'Evadido',      desc: 'Abandonou sem transferência formal', icon: Archive, color: 'border-amber-200 dark:border-amber-800 hover:border-amber-400' },
                  { status: 'formado'     as StatusUsuario, label: 'Formado',      desc: 'Concluiu o ciclo escolar', icon: Archive, color: 'border-violet-200 dark:border-violet-800 hover:border-violet-400' },
                ]).map(opt => (
                  <button key={opt.status} onClick={() => modalExclusao && inativarDiretamente(modalExclusao, opt.status)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 bg-background text-left transition-colors ${opt.color}`}>
                    <opt.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Para excluir permanentemente, primeiro remova todos os registros vinculados.
              </p>
            </div>
          ) : (
            /* Sem registros — pode deletar */
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-destructive">Exclusão permanente e irreversível</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Nenhum registro vinculado encontrado. O usuário será removido do sistema definitivamente.
                  </p>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setModalExclusao(null)}>Cancelar</Button>
                <Button variant="destructive" onClick={confirmarExclusao} disabled={excluindo} className="gap-2">
                  {excluindo ? <><Loader2 className="w-4 h-4 animate-spin" /> Excluindo...</> : <><Trash2 className="w-4 h-4" /> Excluir permanentemente</>}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}