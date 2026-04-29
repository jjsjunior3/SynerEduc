// GerenciadorUsuariosFixed.tsx
import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import {
  ArrowLeft, Search, Edit, Trash2, Users, RefreshCw,
  Eye, EyeOff, Loader2, ShieldCheck, X,
} from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner';
import { supabase } from '../supabase/supabaseClient';

interface GerenciadorUsuariosProps { onVoltar: () => void; }

interface Usuario {
  id: string; nome: string; email: string;
  tipo: 'aluno' | 'professor' | 'coordenador' | 'administrador' | 'professor_conteudista';
  serie?: string; disciplinas?: string[]; series?: string[];
  status: 'ativo' | 'inativo';
  segmento: 'ead' | 'presencial';
  turno?: string | null; nivel?: string | null;
  criadoEm: string;
}

const tiposUsuario = [
  { value: 'aluno', label: 'Aluno' },
  { value: 'professor', label: 'Professor' },
  { value: 'coordenador', label: 'Coordenador' },
  { value: 'administrador', label: 'Administrador' },
  { value: 'professor_conteudista', label: 'Prof. Conteudista' },
];

const TIPO_CORES: Record<string, string> = {
  aluno: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  professor: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  coordenador: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  administrador: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  professor_conteudista: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
};

const TipoBadge = ({ tipo }: { tipo: string }) => (
  <Badge className={`${TIPO_CORES[tipo] || TIPO_CORES.aluno} border-0 text-xs font-medium`}>
    {tiposUsuario.find(t => t.value === tipo)?.label || tipo}
  </Badge>
);

const SegmentoBadge = ({ segmento }: { segmento: string }) => (
  <Badge className={segmento === 'presencial'
    ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 border-0 text-xs'
    : 'bg-muted text-muted-foreground border-0 text-xs'}>
    {segmento === 'presencial' ? 'Presencial' : 'EAD'}
  </Badge>
);

export function GerenciadorUsuarios({ onVoltar }: GerenciadorUsuariosProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Filtros ──────────────────────────────────────────────────────────────
  const [filtroBusca, setFiltroBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroSegmento, setFiltroSegmento] = useState('todos');
  const [filtroSerie, setFiltroSerie] = useState('todas');

  // ── Edição ───────────────────────────────────────────────────────────────
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [mostrarDialog, setMostrarDialog] = useState(false);
  const [mostrarSenhas, setMostrarSenhas] = useState<Record<string, boolean>>({});
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [disciplinasDisponiveis, setDisciplinasDisponiveis] = useState<string[]>([]);
  const [seriesDisponiveis, setSeriesDisponiveis] = useState<string[]>([]);

  const [edicao, setEdicao] = useState({
    nome: '', email: '', tipo: 'aluno' as Usuario['tipo'],
    serie: '', disciplinas: [] as string[], series: [] as string[],
    status: 'ativo' as Usuario['status'],
    segmento: 'ead' as 'ead' | 'presencial',
    turno: '', nivel: '', novaSenha: '',
  });

  const mostrarTurno = edicao.segmento === 'presencial';
  const mostrarNivel = edicao.segmento === 'presencial' && edicao.tipo === 'coordenador';

  const getToken = async () => (await supabase.auth.getSession()).data.session?.access_token;

  // ── Loaders ──────────────────────────────────────────────────────────────
  const carregarDisciplinas = async () => {
    const { data } = await supabase.from('disciplinas').select('nome, ativa').order('nome');
    setDisciplinasDisponiveis((data || []).filter((d: any) => d.ativa !== false).map((d: any) => d.nome).filter(Boolean));
  };

  const carregarSeries = async () => {
    const { data } = await supabase.from('series').select('nome, ativa').order('nome');
    const nomes = (data || []).filter((s: any) => s.ativa !== false).map((s: any) => s.nome).filter(Boolean);
    setSeriesDisponiveis(nomes.length > 0 ? nomes : []);
  };

  const carregarUsuarios = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) { toast.error('Sessão expirada.'); setLoading(false); return; }
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/admin-manage-users`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      const arr = data.success && Array.isArray(data.usuarios) ? data.usuarios : [];
      setUsuarios(arr.map((u: any) => ({
        id: u.id, nome: u.nome || 'Nome não informado', email: u.email || '',
        tipo: u.tipo || 'aluno', serie: u.serie || '',
        disciplinas: u.disciplinas || [], series: u.series || [],
        status: u.status || 'ativo',
        segmento: u.segmento || 'ead',
        turno: u.turno || null, nivel: u.nivel || null,
        criadoEm: u.criadoEm || u.criado_em || new Date().toISOString(),
      })));
    } catch (err: any) {
      toast.error(`Erro ao carregar usuários: ${err.message}`);
      setUsuarios([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { Promise.all([carregarUsuarios(), carregarDisciplinas(), carregarSeries()]); }, []);
  useEffect(() => { setFiltroSerie('todas');}, [filtroSegmento]);

  // ── Séries únicas dos usuários carregados (para o filtro de série) ────────
  // DEPOIS — séries só dos usuários do segmento selecionado
  const seriesUnicas = React.useMemo(() => {
    const base = filtroSegmento === 'todos'
      ? usuarios
      : usuarios.filter(u => u.segmento === filtroSegmento);
    const set = new Set(base.map(u => u.serie).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [usuarios, filtroSegmento]);

  // ── Filtragem ─────────────────────────────────────────────────────────────
  const usuariosFiltrados = React.useMemo(() => {
    return usuarios.filter(u => {
      const matchBusca = !filtroBusca.trim() ||
        u.nome.toLowerCase().includes(filtroBusca.toLowerCase()) ||
        u.email.toLowerCase().includes(filtroBusca.toLowerCase());
      const matchTipo = filtroTipo === 'todos' || u.tipo === filtroTipo;
      const matchSegmento = filtroSegmento === 'todos' || u.segmento === filtroSegmento;
      const matchSerie = filtroSerie === 'todas' || u.serie === filtroSerie;
      return matchBusca && matchTipo && matchSegmento && matchSerie;
    });
  }, [usuarios, filtroBusca, filtroTipo, filtroSegmento, filtroSerie]);

  const filtrosAtivos = filtroBusca || filtroTipo !== 'todos' || filtroSegmento !== 'todos' || filtroSerie !== 'todas';

  const limparFiltros = () => {
    setFiltroBusca(''); setFiltroTipo('todos');
    setFiltroSegmento('todos'); setFiltroSerie('todas');
  };

  // ── Edição ───────────────────────────────────────────────────────────────
  const abrirEdicao = (u: Usuario) => {
    setUsuarioEditando(u);
    setEdicao({
      nome: u.nome, email: u.email, tipo: u.tipo, serie: u.serie || '',
      disciplinas: u.disciplinas || [], series: u.series || [],
      status: u.status, segmento: u.segmento || 'ead',
      turno: u.turno || '', nivel: u.nivel || '', novaSenha: '',
    });
    setMostrarDialog(true);
  };

  const salvarEdicao = async () => {
    if (!usuarioEditando) return;
    setSalvandoEdicao(true);
    try {
      const token = await getToken();
      if (!token) { toast.error('Sessão expirada.'); return; }
      const payload: any = {
        id: usuarioEditando.id, nome: edicao.nome, email: edicao.email,
        tipo: edicao.tipo, serie: edicao.serie,
        disciplinas: edicao.disciplinas, series: edicao.series,
        status: edicao.status, segmento: edicao.segmento,
        turno: mostrarTurno ? edicao.turno || null : null,
        nivel: mostrarNivel ? edicao.nivel || null : null,
      };
      if (edicao.novaSenha) payload.novaSenha = edicao.novaSenha;
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/admin-manage-users`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await response.text());
      toast.success('Usuário atualizado!');
      setMostrarDialog(false);
      setUsuarioEditando(null);
      carregarUsuarios();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally { setSalvandoEdicao(false); }
  };

  const excluirUsuario = async (id: string) => {
    if (!confirm('Excluir este usuário? Esta ação é irreversível.')) return;
    try {
      const token = await getToken();
      if (!token) { toast.error('Sessão expirada.'); return; }
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/admin-manage-users`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id }),
      });
      if (!response.ok) throw new Error(await response.text());
      toast.success('Usuário excluído!');
      carregarUsuarios();
    } catch (err: any) { toast.error(`Erro: ${err.message}`); }
  };

  return (
    <div className="min-h-screen bg-background">

      {/* Header sticky */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onVoltar}
              className="gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" /> Gerenciar Usuários
              </h1>
              <p className="text-xs text-muted-foreground">Visualizar, editar e gerenciar todos os usuários do sistema</p>
            </div>
          </div>
          <Button onClick={() => Promise.all([carregarUsuarios(), carregarDisciplinas(), carregarSeries()])}
            disabled={loading} variant="outline" size="sm" className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">

        {/* ── Filtros ── */}
        <Card className="border-border shadow-sm">
          <CardContent className="p-5 space-y-4">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input placeholder="Buscar por nome ou email..."
                value={filtroBusca} onChange={e => setFiltroBusca(e.target.value)}
                className="pl-10 bg-background border-border text-foreground placeholder:text-muted-foreground" />
            </div>

            {/* Selects de filtro */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Tipo</Label>
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger className="bg-background border-border text-foreground h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    {tiposUsuario.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Segmento</Label>
                <Select value={filtroSegmento} onValueChange={setFiltroSegmento}>
                  <SelectTrigger className="bg-background border-border text-foreground h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">EAD + Presencial</SelectItem>
                    <SelectItem value="ead">Somente EAD</SelectItem>
                    <SelectItem value="presencial">Somente Presencial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Série</Label>
                <Select value={filtroSerie} onValueChange={setFiltroSerie}>
                  <SelectTrigger className="bg-background border-border text-foreground h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as séries</SelectItem>
                    {seriesUnicas.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Indicador de filtros ativos */}
            {filtrosAtivos && (
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{usuariosFiltrados.length}</span> usuário{usuariosFiltrados.length !== 1 ? 's' : ''} encontrado{usuariosFiltrados.length !== 1 ? 's' : ''}
                </p>
                <Button variant="ghost" size="sm" onClick={limparFiltros}
                  className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3" /> Limpar filtros
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Estatísticas ── */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          <Card className="border-border shadow-sm">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{usuarios.length}</div>
              <div className="text-xs text-muted-foreground mt-1">Total</div>
            </CardContent>
          </Card>
          {tiposUsuario.map(tipo => (
            <Card key={tipo.value} className="border-border shadow-sm">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-foreground">
                  {usuarios.filter(u => u.tipo === tipo.value).length}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{tipo.label}s</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Tabela ── */}
        <Card className="border-border shadow-sm">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Users className="w-5 h-5 text-primary" />
              {filtrosAtivos ? 'Resultado da busca' : 'Todos os usuários'}
              <Badge variant="secondary" className="ml-2">{usuariosFiltrados.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-20 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-muted-foreground">Carregando usuários...</span>
              </div>
            ) : usuariosFiltrados.length === 0 ? (
              <div className="text-center py-20">
                <Search className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
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
                      <TableHead className="text-muted-foreground font-medium">Email</TableHead>
                      <TableHead className="text-muted-foreground font-medium">Tipo</TableHead>
                      <TableHead className="text-muted-foreground font-medium">Segmento</TableHead>
                      <TableHead className="text-muted-foreground font-medium">Turno</TableHead>
                      <TableHead className="text-muted-foreground font-medium">Série / Disciplinas</TableHead>
                      <TableHead className="text-muted-foreground font-medium">Status</TableHead>
                      <TableHead className="text-muted-foreground font-medium text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usuariosFiltrados.map(u => (
                      <TableRow key={u.id} className="border-border hover:bg-muted/30">
                        <TableCell className="font-medium text-foreground">{u.nome}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                        <TableCell><TipoBadge tipo={u.tipo} /></TableCell>
                        <TableCell><SegmentoBadge segmento={u.segmento} /></TableCell>
                        <TableCell>
                          {u.turno
                            ? <span className="text-sm text-foreground capitalize">{u.turno}</span>
                            : <span className="text-muted-foreground text-sm">—</span>}
                        </TableCell>
                        <TableCell>
                          {u.tipo === 'aluno'
                            ? <Badge variant="outline" className="text-xs border-border text-foreground">{u.serie || 'Não definida'}</Badge>
                            : ['professor', 'professor_conteudista'].includes(u.tipo) && u.disciplinas?.length
                            ? (
                              <div className="flex flex-wrap gap-1">
                                {u.disciplinas.slice(0, 2).map((d, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">{d}</Badge>
                                ))}
                                {u.disciplinas.length > 2 && (
                                  <Badge variant="outline" className="text-xs border-border">+{u.disciplinas.length - 2}</Badge>
                                )}
                              </div>
                            ) : <span className="text-muted-foreground text-sm">—</span>}
                        </TableCell>
                        <TableCell>
                          <Badge className={u.status === 'ativo'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-0 text-xs'
                            : 'bg-muted text-muted-foreground border-0 text-xs'}>
                            {u.status === 'ativo' ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => abrirEdicao(u)}
                              className="hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 h-8 w-8 p-0">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => excluirUsuario(u.id)}
                              className="hover:bg-destructive/10 hover:text-destructive h-8 w-8 p-0">
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
      </div>

      {/* ── Dialog Edição ── */}
      <Dialog open={mostrarDialog} onOpenChange={setMostrarDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Editar Usuário</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Modifique as informações do usuário.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">Nome Completo</Label>
              <Input value={edicao.nome} onChange={e => setEdicao(p => ({ ...p, nome: e.target.value }))}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">Email</Label>
              <Input type="email" value={edicao.email} onChange={e => setEdicao(p => ({ ...p, email: e.target.value }))}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">Tipo de Usuário</Label>
              <Select value={edicao.tipo}
                onValueChange={(v: Usuario['tipo']) => setEdicao(p => ({ ...p, tipo: v, nivel: '' }))}>
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tiposUsuario.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Segmento + Turno + Nível em grid */}
            <div className={`grid gap-3 ${mostrarTurno ? (mostrarNivel ? 'grid-cols-3' : 'grid-cols-2') : 'grid-cols-1'}`}>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Segmento</Label>
                <Select value={edicao.segmento}
                  onValueChange={(v: 'ead' | 'presencial') => setEdicao(p => ({ ...p, segmento: v, turno: '', nivel: '' }))}>
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ead">EAD</SelectItem>
                    <SelectItem value="presencial">Presencial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {mostrarTurno && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-foreground">Turno</Label>
                  <Select value={edicao.turno} onValueChange={v => setEdicao(p => ({ ...p, turno: v }))}>
                    <SelectTrigger className="bg-background border-border text-foreground">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
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
                    <SelectTrigger className="bg-background border-border text-foreground">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fundamental1">Fund. 1</SelectItem>
                      <SelectItem value="fundamental2">Fund. 2</SelectItem>
                      <SelectItem value="medio">Médio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {edicao.tipo === 'aluno' && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Série</Label>
                <Select value={edicao.serie} onValueChange={v => setEdicao(p => ({ ...p, serie: v }))}>
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue placeholder="Selecione a série" />
                  </SelectTrigger>
                  <SelectContent>
                    {seriesDisponiveis.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {['professor', 'professor_conteudista'].includes(edicao.tipo) && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-foreground">Disciplinas que leciona</Label>
                  <div className="max-h-36 overflow-y-auto border border-border rounded-lg p-3 bg-muted/20 space-y-2">
                    {disciplinasDisponiveis.length === 0
                      ? <p className="text-sm text-muted-foreground">Nenhuma disciplina cadastrada.</p>
                      : disciplinasDisponiveis.map(d => (
                        <div key={d} className="flex items-center gap-2">
                          <Checkbox checked={edicao.disciplinas.includes(d)}
                            onCheckedChange={checked => setEdicao(p => ({
                              ...p, disciplinas: checked ? [...p.disciplinas, d] : p.disciplinas.filter(x => x !== d)
                            }))} />
                          <Label className="text-sm text-foreground cursor-pointer">{d}</Label>
                        </div>
                      ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-foreground">Séries que leciona</Label>
                  <div className="max-h-36 overflow-y-auto border border-border rounded-lg p-3 bg-muted/20 space-y-2">
                    {seriesDisponiveis.map(s => (
                      <div key={s} className="flex items-center gap-2">
                        <Checkbox checked={edicao.series.includes(s)}
                          onCheckedChange={checked => setEdicao(p => ({
                            ...p, series: checked ? [...p.series, s] : p.series.filter(x => x !== s)
                          }))} />
                        <Label className="text-sm text-foreground cursor-pointer">{s}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">
                Nova Senha <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
              </Label>
              <div className="relative">
                <Input
                  type={mostrarSenhas[usuarioEditando?.id || 'tmp'] ? 'text' : 'password'}
                  value={edicao.novaSenha}
                  onChange={e => setEdicao(p => ({ ...p, novaSenha: e.target.value }))}
                  placeholder="Deixe em branco para não alterar"
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground pr-10" />
                <Button type="button" variant="ghost" size="sm"
                  className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                  onClick={() => setMostrarSenhas(p => ({ ...p, [usuarioEditando?.id || 'tmp']: !p[usuarioEditando?.id || 'tmp'] }))}>
                  {mostrarSenhas[usuarioEditando?.id || 'tmp'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">Status</Label>
              <Select value={edicao.status}
                onValueChange={(v: Usuario['status']) => setEdicao(p => ({ ...p, status: v }))}>
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4 border-t border-border">
              <Button onClick={salvarEdicao}
                disabled={!edicao.nome || !edicao.email || salvandoEdicao} className="flex-1 gap-2">
                {salvandoEdicao
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</>
                  : 'Salvar Alterações'}
              </Button>
              <Button variant="outline"
                onClick={() => { setMostrarDialog(false); setUsuarioEditando(null); }}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}