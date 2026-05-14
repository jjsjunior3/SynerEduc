// src/components/GerenciadorUsuariosFixed.tsx
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
  Eye, EyeOff, Loader2, ShieldCheck, X, KeyRound, Copy, Check,
} from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner';
import { supabase } from '../supabase/supabaseClient';

interface GerenciadorUsuariosProps {
  onVoltar: () => void;
  segmentoForcado?: 'ead' | 'presencial';
}

interface Usuario {
  id: string; nome: string; email: string;
  tipo: string;
  serie?: string; disciplinas?: string[]; series?: string[];
  status: 'ativo' | 'inativo';
  segmento: 'ead' | 'presencial';
  turno?: string | null; nivel?: string | null;
  criadoEm: string;
}

const tiposUsuario = [
  { value: 'aluno',                label: 'Aluno' },
  { value: 'professor',            label: 'Professor' },
  { value: 'coordenador',          label: 'Coordenador' },
  { value: 'administrador',        label: 'Administrador' },
  { value: 'professor_conteudista',label: 'Prof. Conteudista' },
  { value: 'gestor_geral',         label: 'Gestor Geral' },
  { value: 'secretaria',           label: 'Secretaria' },
  { value: 'financeiro',           label: 'Financeiro' },
  { value: 'estoque',              label: 'Estoque' },
  { value: 'responsavel',          label: 'Responsável' },
];

const TIPO_CORES: Record<string, string> = {
  aluno:                 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  professor:             'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  coordenador:           'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  administrador:         'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  professor_conteudista: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  gestor_geral:          'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  secretaria:            'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  financeiro:            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  estoque:               'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-300',
  responsavel:           'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  admin_presencial:      'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
};

const TipoBadge = ({ tipo }: { tipo: string }) => (
  <Badge className={`${TIPO_CORES[tipo] || 'bg-muted text-muted-foreground'} border-0 text-xs font-medium`}>
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

export function GerenciadorUsuarios({ onVoltar, segmentoForcado }: GerenciadorUsuariosProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading]   = useState(true);

  const [filtroBusca, setFiltroBusca]       = useState('');
  const [filtroTipo, setFiltroTipo]         = useState('todos');
  const [filtroSegmento, setFiltroSegmento] = useState(segmentoForcado ?? 'todos');
  const [filtroSerie, setFiltroSerie]       = useState('todas');

  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [mostrarDialog, setMostrarDialog]     = useState(false);
  const [mostrarSenha, setMostrarSenha]       = useState(false);
  const [salvandoEdicao, setSalvandoEdicao]   = useState(false);
  const [copiado, setCopiado]                 = useState(false);
  const [disciplinasDisponiveis, setDisciplinasDisponiveis] = useState<string[]>([]);
  const [seriesDisponiveis, setSeriesDisponiveis]           = useState<string[]>([]);

  const [edicao, setEdicao] = useState({
    nome: '', email: '', tipo: 'aluno',
    serie: '', disciplinas: [] as string[], series: [] as string[],
    status: 'ativo' as 'ativo' | 'inativo',
    segmento: (segmentoForcado ?? 'ead') as 'ead' | 'presencial',
    turno: '', nivel: '', novaSenha: '',
  });

  const mostrarTurno = edicao.segmento === 'presencial';
  const mostrarNivel = edicao.segmento === 'presencial' && edicao.tipo === 'coordenador';

  const getToken = async () => (await supabase.auth.getSession()).data.session?.access_token;

  const carregarDisciplinas = async () => {
    const { data } = await supabase.from('disciplinas').select('nome, ativa').order('nome');
    setDisciplinasDisponiveis(
      (data || []).filter((d: any) => d.ativa !== false).map((d: any) => d.nome).filter(Boolean)
    );
  };

  const carregarSeries = async () => {
    const { data } = await supabase.from('series').select('nome, ativa').order('nome');
    setSeriesDisponiveis(
      (data || []).filter((s: any) => s.ativa !== false).map((s: any) => s.nome).filter(Boolean)
    );
  };

  const carregarUsuarios = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_users_with_email');
      if (error) throw error;

      let arr = (data || []) as any[];

      // Filtra no cliente quando segmento é forçado
      if (segmentoForcado) {
        arr = arr.filter(u => u.segmento === segmentoForcado);
      }

      setUsuarios(arr.map(u => ({
        id:          u.id,
        nome:        u.nome        || 'Nome não informado',
        email:       u.email       || '—',
        tipo:        u.tipo        || 'aluno',
        serie:       u.serie       || '',
        disciplinas: u.disciplinas || [],
        series:      u.series      || [],
        status:      u.status      || 'ativo',
        segmento:    u.segmento    || 'ead',
        turno:       u.turno       || null,
        nivel:       u.nivel       || null,
        criadoEm:    u.criado_em   || new Date().toISOString(),
      })));
    } catch (err: any) {
      toast.error(`Erro ao carregar usuários: ${err.message}`);
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([carregarUsuarios(), carregarDisciplinas(), carregarSeries()]);
  }, []);

  useEffect(() => { setFiltroSerie('todas'); }, [filtroSegmento]);

  const seriesUnicas = React.useMemo(() => {
    const base = filtroSegmento === 'todos'
      ? usuarios
      : usuarios.filter(u => u.segmento === filtroSegmento);
    const set = new Set(base.map(u => u.serie).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [usuarios, filtroSegmento]);

  const usuariosFiltrados = React.useMemo(() => {
    return usuarios.filter(u => {
      const q = filtroBusca.toLowerCase().trim();
      const matchBusca    = !q || u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchTipo     = filtroTipo     === 'todos' || u.tipo     === filtroTipo;
      const matchSegmento = filtroSegmento === 'todos' || u.segmento === filtroSegmento;
      const matchSerie    = filtroSerie    === 'todas' || u.serie    === filtroSerie;
      return matchBusca && matchTipo && matchSegmento && matchSerie;
    });
  }, [usuarios, filtroBusca, filtroTipo, filtroSegmento, filtroSerie]);

  const filtrosAtivos =
    filtroBusca || filtroTipo !== 'todos' ||
    (segmentoForcado ? false : filtroSegmento !== 'todos') ||
    filtroSerie !== 'todas';

  const limparFiltros = () => {
    setFiltroBusca('');
    setFiltroTipo('todos');
    setFiltroSegmento(segmentoForcado ?? 'todos');
    setFiltroSerie('todas');
  };

  const abrirEdicao = (u: Usuario) => {
    setUsuarioEditando(u);
    setMostrarSenha(false);
    setCopiado(false);
    setEdicao({
      nome: u.nome, email: u.email === '—' ? '' : u.email,
      tipo: u.tipo, serie: u.serie || '',
      disciplinas: u.disciplinas || [], series: u.series || [],
      status: u.status,
      segmento: segmentoForcado ?? u.segmento ?? 'ead',
      turno: u.turno || '', nivel: u.nivel || '', novaSenha: '',
    });
    setMostrarDialog(true);
  };

  const gerarSenha = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
    const senha = Array.from({ length: 12 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
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
        id:          usuarioEditando.id,
        nome:        edicao.nome,
        email:       edicao.email,
        tipo:        edicao.tipo,
        serie:       edicao.serie,
        disciplinas: edicao.disciplinas,
        series:      edicao.series,
        status:      edicao.status,
        segmento:    edicao.segmento,
        turno:       mostrarTurno ? edicao.turno || null : null,
        nivel:       mostrarNivel ? edicao.nivel || null : null,
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
      setMostrarDialog(false);
      setUsuarioEditando(null);
      carregarUsuarios();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const excluirUsuario = async (id: string, nome: string) => {
    if (!confirm(`Excluir "${nome}"? Esta ação é irreversível.`)) return;
    try {
      const token = await getToken();
      if (!token) { toast.error('Sessão expirada.'); return; }
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/admin-manage-users`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: id }),
        }
      );
      if (!response.ok) throw new Error(await response.text());
      toast.success('Usuário excluído!');
      carregarUsuarios();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">

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
              <p className="text-xs text-muted-foreground">
                Visualizar, editar e gerenciar todos os usuários do sistema
              </p>
            </div>
          </div>
          <Button
            onClick={() => Promise.all([carregarUsuarios(), carregarDisciplinas(), carregarSeries()])}
            disabled={loading} variant="outline" size="sm" className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">

        <Card className="border-border shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={filtroBusca}
                onChange={e => setFiltroBusca(e.target.value)}
                className="pl-10 bg-background border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Tipo</Label>
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger className="bg-background border-border text-foreground h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    {tiposUsuario.map(t =>
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Segmento</Label>
                <Select
                  value={filtroSegmento}
                  disabled={!!segmentoForcado}
                  onValueChange={setFiltroSegmento}
                >
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
                    {seriesUnicas.map(s =>
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    )}
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

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          <Card className="border-border shadow-sm">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{usuarios.length}</div>
              <div className="text-xs text-muted-foreground mt-1">Total</div>
            </CardContent>
          </Card>
          {['aluno','professor','coordenador','administrador','professor_conteudista'].map(tipo => (
            <Card key={tipo} className="border-border shadow-sm">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-foreground">
                  {usuarios.filter(u => u.tipo === tipo).length}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {tiposUsuario.find(t => t.value === tipo)?.label}s
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

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
                      <TableHead className="text-muted-foreground font-medium">Email de acesso</TableHead>
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
                        <TableCell>
                          <span className="text-sm text-muted-foreground font-mono">{u.email}</span>
                        </TableCell>
                        <TableCell><TipoBadge tipo={u.tipo} /></TableCell>
                        <TableCell><SegmentoBadge segmento={u.segmento} /></TableCell>
                        <TableCell>
                          {u.turno
                            ? <span className="text-sm text-foreground capitalize">{u.turno}</span>
                            : <span className="text-muted-foreground text-sm">—</span>}
                        </TableCell>
                        <TableCell>
                          {u.tipo === 'aluno'
                            ? <Badge variant="outline" className="text-xs border-border text-foreground">
                                {u.serie || 'Não definida'}
                              </Badge>
                            : ['professor', 'professor_conteudista'].includes(u.tipo) && u.disciplinas?.length
                            ? (
                              <div className="flex flex-wrap gap-1">
                                {u.disciplinas.slice(0, 2).map((d, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">{d}</Badge>
                                ))}
                                {u.disciplinas.length > 2 && (
                                  <Badge variant="outline" className="text-xs border-border">
                                    +{u.disciplinas.length - 2}
                                  </Badge>
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
                            <Button variant="ghost" size="sm"
                              onClick={() => excluirUsuario(u.id, u.nome)}
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

      <Dialog open={mostrarDialog} onOpenChange={open => { if (!open) { setMostrarDialog(false); setUsuarioEditando(null); } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Editar Usuário</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {usuarioEditando?.email && (
                <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                  {usuarioEditando.email}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">Nome Completo</Label>
              <Input value={edicao.nome}
                onChange={e => setEdicao(p => ({ ...p, nome: e.target.value }))}
                className="bg-background border-border text-foreground" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">Email de acesso</Label>
              <Input type="email" value={edicao.email}
                onChange={e => setEdicao(p => ({ ...p, email: e.target.value }))}
                className="bg-background border-border text-foreground" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">Tipo de Usuário</Label>
              <Select value={edicao.tipo} onValueChange={v => setEdicao(p => ({ ...p, tipo: v, nivel: '' }))}>
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tiposUsuario.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className={`grid gap-3 ${mostrarTurno ? (mostrarNivel ? 'grid-cols-3' : 'grid-cols-2') : 'grid-cols-1'}`}>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Segmento</Label>
                <Select
                  value={edicao.segmento}
                  disabled={!!segmentoForcado}
                  onValueChange={(v: 'ead' | 'presencial') =>
                    setEdicao(p => ({ ...p, segmento: v, turno: '', nivel: '' }))}>
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
                    {disciplinasDisponiveis.map(d => (
                      <div key={d} className="flex items-center gap-2">
                        <Checkbox checked={edicao.disciplinas.includes(d)}
                          onCheckedChange={checked => setEdicao(p => ({
                            ...p, disciplinas: checked ? [...p.disciplinas, d] : p.disciplinas.filter(x => x !== d),
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
                            ...p, series: checked ? [...p.series, s] : p.series.filter(x => x !== s),
                          }))} />
                        <Label className="text-sm text-foreground cursor-pointer">{s}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-4">
              <div className="flex items-center gap-2 mb-1">
                <KeyRound className="w-4 h-4 text-primary" />
                <Label className="text-sm font-semibold text-foreground">Redefinir Senha</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Digite uma nova senha manualmente ou gere uma aleatória. Deixe em branco para não alterar.
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={mostrarSenha ? 'text' : 'password'}
                    value={edicao.novaSenha}
                    onChange={e => setEdicao(p => ({ ...p, novaSenha: e.target.value }))}
                    placeholder="Nova senha..."
                    className="bg-background border-border text-foreground pr-10 font-mono"
                  />
                  <Button type="button" variant="ghost" size="sm"
                    className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setMostrarSenha(p => !p)}>
                    {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {edicao.novaSenha && (
                  <Button type="button" variant="outline" size="sm" onClick={copiarSenha} className="gap-1.5 shrink-0">
                    {copiado ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    {copiado ? 'Copiado' : 'Copiar'}
                  </Button>
                )}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={gerarSenha} className="gap-2 w-full mt-1">
                <KeyRound className="w-3.5 h-3.5" /> Gerar senha aleatória segura
              </Button>
              {edicao.novaSenha && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
                  ⚠️ Anote ou copie a senha antes de salvar.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">Status</Label>
              <Select value={edicao.status}
                onValueChange={(v: 'ativo' | 'inativo') => setEdicao(p => ({ ...p, status: v }))}>
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
              <Button onClick={salvarEdicao} disabled={!edicao.nome || !edicao.email || salvandoEdicao} className="flex-1 gap-2">
                {salvandoEdicao ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</> : 'Salvar Alterações'}
              </Button>
              <Button variant="outline" onClick={() => { setMostrarDialog(false); setUsuarioEditando(null); }}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}