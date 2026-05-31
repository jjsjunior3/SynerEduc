import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useGestorDados } from '../hooks/useGestorDados';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { PerfilUsuario } from './PerfilUsuario';
import {
  LayoutDashboard, Users, DollarSign, Settings,
  Search, FileText, Plus, GraduationCap,
  TrendingUp, TrendingDown, CheckCircle, Clock,
  XCircle, CreditCard, LogOut, Menu, X,
  RefreshCw, AlertCircle, Building2, BarChart3,
  Upload, BookOpen, Sun, Moon, ArrowRight,
  Stamp, History, Archive,
} from 'lucide-react';
import logoEscola from '../assets/e339c695d5503d560f7e53d2039456d52fd95ea5.png';
import { useAlunosPendencias } from '../hooks/useAlunosPendencias';

// ── Componentes filhos ────────────────────────────────────
import { FormularioMatricula }  from './FormularioMatricula';
import { DocumentosRecebidos }  from './DocumentosRecebidos';
import { EmissaoContratos }     from './EmissaoContratos';
import { ControlePagamentos }   from './ControlePagamentos';
import { ControleDespesas }     from './ControleDespesas';
import { RelatorioFinanceiro }  from './RelatorioFinanceiro';
import BoletimCoordenador       from './BoletimCoordenador';
import EmissaoDocumentos        from './EmissaoDocumentos';
import HistoricoIA              from './HistoricoIA';
import ArquivoMorto             from './ArquivoMorto';

// ─── Tipos ───────────────────────────────────────────────
type SecaoAtiva =
  | 'dashboard'
  | 'alunos'
  | 'matriculas'
  | 'documentos-recebidos'
  | 'emissao-contratos'
  | 'boletins'
  | 'controle-pagamentos'
  | 'controle-despesas'
  | 'relatorio-financeiro'
  | 'emissao-documentos'
  | 'historico-ia'
  | 'arquivo-morto'
  | 'configuracoes';

// Estado de navegação contextual — passado como prop para os filhos
type AcaoContextual =
  | { tipo: 'criar-ficha';    alunoId: string; nomeAluno: string }
  | { tipo: 'criar-contrato'; fichaId: string; nomeAluno: string }
  | { tipo: 'ver-documentos'; fichaId: string; nomeAluno: string }
  | null;

// ─── Helpers ─────────────────────────────────────────────
function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ativo:       'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700',
    pendente:    'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700',
    atrasado:    'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700',
    pago:        'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700',
    inativo:     'bg-muted text-muted-foreground border-border',
    transferido: 'bg-muted text-muted-foreground border-border',
  };
  const cls   = map[status?.toLowerCase()] ?? map['inativo'];
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : '—';
  return <Badge className={`${cls} border text-xs`}>{label}</Badge>;
}

// ─── Componente principal ─────────────────────────────────
export default function DashboardGestorGeral() {
  const { usuario, logout }               = useAuth();
  const { theme, toggleTheme }            = useTheme();
  const [secaoAtiva, setSecaoAtiva]       = useState<SecaoAtiva>('dashboard');
  const [sidebarAberta, setSidebarAberta] = useState(true);
  const [mostrarPerfil, setMostrarPerfil] = useState(false);

  // ── Estado de ação contextual — navegação pré-preenchida ──
  const [acaoContextual, setAcaoContextual] = useState<AcaoContextual>(null);

  const dados      = useGestorDados();
  const pendencias = useAlunosPendencias();

  // Segmento do gestor logado — isola tudo por segmento
  const segmentoGestor = dados.segmentoGestor;
  const segmentoLabel  = segmentoGestor === 'presencial' ? 'Presencial' : 'EAD';
  const segmentoCor    = segmentoGestor === 'presencial'
    ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-200'
    : 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200';

  const iniciais = usuario?.nome
    ? usuario.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'G';

  // ── Navegar para seção com contexto de aluno ─────────────
  const navegarComContexto = (acao: AcaoContextual, secao: SecaoAtiva) => {
    setAcaoContextual(acao);
    setSecaoAtiva(secao);
  };

  // ── Voltar para alunos e limpar contexto ─────────────────
  const voltarParaAlunos = () => {
    setAcaoContextual(null);
    setSecaoAtiva('alunos');
  };

  // ── Grupos do menu lateral ───────────────────────────
  const menuGrupos: { titulo: string; itens: { id: SecaoAtiva; label: string; icon: React.ReactNode }[] }[] = [
    {
      titulo: '',
      itens: [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      ],
    },
    {
      titulo: 'Secretaria',
      itens: [
        { id: 'alunos',               label: 'Gerenciar Alunos', icon: <Users          className="w-4 h-4" /> },
        { id: 'matriculas',           label: 'Matrículas',       icon: <GraduationCap  className="w-4 h-4" /> },
        { id: 'documentos-recebidos', label: 'Documentos',       icon: <Upload         className="w-4 h-4" /> },
        { id: 'emissao-contratos',    label: 'Contratos',        icon: <FileText       className="w-4 h-4" /> },
        { id: 'boletins',             label: 'Boletins',         icon: <BookOpen       className="w-4 h-4" /> },
        { id: 'emissao-documentos',   label: 'Emitir Documentos',icon: <Stamp          className="w-4 h-4" /> },
        { id: 'historico-ia',         label: 'Histórico c/ IA',  icon: <History        className="w-4 h-4" /> },
        { id: 'arquivo-morto',        label: 'Arquivo Morto',    icon: <Archive        className="w-4 h-4" /> },
      ],
    },
    {
      titulo: 'Financeiro',
      itens: [
        { id: 'controle-pagamentos',  label: 'Pagamentos',       icon: <CreditCard     className="w-4 h-4" /> },
        { id: 'controle-despesas',    label: 'Despesas',         icon: <TrendingDown   className="w-4 h-4" /> },
        { id: 'relatorio-financeiro', label: 'Relatório',        icon: <BarChart3      className="w-4 h-4" /> },
      ],
    },
    {
      titulo: '',
      itens: [
        { id: 'configuracoes', label: 'Configurações', icon: <Settings className="w-4 h-4" /> },
      ],
    },
  ];

  // ── Views ────────────────────────────────────────────
  const renderDashboard = () => {
    const { resumoAlunos, resumoFinanceiro, loading, erro, refetch } = dados;
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Visão Geral</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Segmento: <span className="font-semibold text-foreground">{segmentoLabel}</span> ·{' '}
              {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={refetch} disabled={loading}
            className="border-border text-foreground hover:bg-muted">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {erro && (
          <Card className="border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20">
            <CardContent className="p-4 flex items-center gap-3 text-red-700 dark:text-red-300">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{erro}</span>
            </CardContent>
          </Card>
        )}

        {/* Alunos */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
            Alunos
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Ativos',  valor: resumoAlunos?.total ?? 0,     sub: segmentoLabel,            icon: <Users         className="w-6 h-6 text-white" />, cor: 'from-blue-500 to-blue-600',     borda: 'border-blue-200 dark:border-blue-800' },
              { label: segmentoLabel,   valor: resumoAlunos?.total ?? 0,     sub: segmentoGestor === 'ead' ? 'A distância' : 'Em sala', icon: <GraduationCap className="w-6 h-6 text-white" />, cor: segmentoGestor === 'ead' ? 'from-indigo-500 to-indigo-600' : 'from-violet-500 to-violet-600', borda: segmentoGestor === 'ead' ? 'border-indigo-200 dark:border-indigo-800' : 'border-violet-200 dark:border-violet-800' },
              { label: 'Pendentes',     valor: resumoAlunos?.pendentes ?? 0, sub: 'Aguardando confirmação', icon: <Clock         className="w-6 h-6 text-white" />, cor: 'from-orange-500 to-orange-600', borda: 'border-orange-200 dark:border-orange-800' },
            ].map(c => (
              <Card key={c.label} className={`border-2 ${c.borda} bg-card`}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{c.label}</p>
                      <p className="text-3xl font-bold text-foreground mt-1">
                        {loading ? '—' : c.valor.toLocaleString('pt-BR')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
                    </div>
                    <div className={`w-12 h-12 bg-gradient-to-br ${c.cor} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      {c.icon}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Financeiro */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
            Financeiro — {new Date().toLocaleDateString('pt-BR', { month: 'long' })}
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: 'Recebido no Mês', valor: resumoFinanceiro?.recebidoMes ?? 0, sub: `${resumoFinanceiro?.qtdPagos ?? 0} pagamentos`,      icon: <CheckCircle className="w-6 h-6 text-white" />, cor: 'from-green-500 to-green-600',  borda: 'border-green-200 dark:border-green-800' },
              { label: 'A Receber',       valor: resumoFinanceiro?.aReceber ?? 0,    sub: `${resumoFinanceiro?.qtdPendentes ?? 0} pendentes`,    icon: <Clock       className="w-6 h-6 text-white" />, cor: 'from-yellow-500 to-yellow-600', borda: 'border-yellow-200 dark:border-yellow-800' },
              { label: 'Em Atraso',       valor: resumoFinanceiro?.emAtraso ?? 0,    sub: `${resumoFinanceiro?.qtdAtrasados ?? 0} inadimplentes`, icon: <XCircle    className="w-6 h-6 text-white" />, cor: 'from-red-500 to-red-600',      borda: 'border-red-200 dark:border-red-800' },
            ].map(c => (
              <Card key={c.label} className={`border-2 ${c.borda} bg-card`}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{c.label}</p>
                      <p className="text-2xl font-bold text-foreground mt-1">
                        {loading ? '—' : formatBRL(c.valor)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
                    </div>
                    <div className={`w-12 h-12 bg-gradient-to-br ${c.cor} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      {c.icon}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Atalhos */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
            Ações Rápidas
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: 'Nova Matrícula',       icon: <Plus         className="w-5 h-5" />, acao: () => setSecaoAtiva('matriculas'),            bgL: '#dbeafe', bgD: '#1e3a5f', cor: '#2563eb' },
              { label: 'Documentos',           icon: <Upload       className="w-5 h-5" />, acao: () => setSecaoAtiva('documentos-recebidos'),  bgL: '#d1fae5', bgD: '#064e3b', cor: '#059669' },
              { label: 'Emitir Contrato',      icon: <FileText     className="w-5 h-5" />, acao: () => setSecaoAtiva('emissao-contratos'),     bgL: '#ede9fe', bgD: '#2e1065', cor: '#7c3aed' },
              { label: 'Registrar Pagamento',  icon: <CreditCard   className="w-5 h-5" />, acao: () => setSecaoAtiva('controle-pagamentos'),   bgL: '#dcfce7', bgD: '#14532d', cor: '#16a34a' },
              { label: 'Controle de Despesas', icon: <TrendingDown className="w-5 h-5" />, acao: () => setSecaoAtiva('controle-despesas'),     bgL: '#ffedd5', bgD: '#431407', cor: '#ea580c' },
              { label: 'Emitir Documentos',    icon: <Stamp        className="w-5 h-5" />, acao: () => setSecaoAtiva('emissao-documentos'),    bgL: '#e0f2fe', bgD: '#0c2a3f', cor: '#0284c7' },
              { label: 'Histórico c/ IA',     icon: <History      className="w-5 h-5" />, acao: () => setSecaoAtiva('historico-ia'),           bgL: '#f0fdf4', bgD: '#052e16', cor: '#16a34a' },
            ].map(a => (
              <button key={a.label} onClick={a.acao}
                className="flex items-center gap-4 p-5 rounded-xl border border-border hover:shadow-md hover:scale-[1.02] transition-all text-left"
                style={{ backgroundColor: theme === 'dark' ? a.bgD : a.bgL }}>
                <span className="flex-shrink-0 rounded-full p-2 bg-white/20" style={{ color: a.cor }}>
                  {a.icon}
                </span>
                <span className="font-medium text-foreground text-sm">{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ─── renderAlunos — com ações contextuais por linha ──────
  const renderAlunos = () => {
    const {
      alunos, resumo, loading, total,
      pagina, setPagina,
      busca, setBusca,
      filtro, setFiltro,
      filtroSegmento, setFiltroSegmento,
      refetch, porPagina,
    } = pendencias;

    const totalPendencias = resumo.sem_ficha + resumo.sem_contrato + resumo.docs_pendentes;

    return (
      <div className="space-y-6">

        {/* Título */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Gerenciar Alunos</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Segmento <span className="font-semibold text-foreground">{segmentoLabel}</span> · matrículas, contratos e documentação
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={refetch}
            className="border-border text-foreground hover:bg-muted">
            <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
          </Button>
        </div>

        {/* Banner de alerta */}
        {totalPendencias > 0 && (
          <Card className="border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-orange-800 dark:text-orange-200">
                  Atenção: existem pendências que precisam de ação da secretaria
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-300 mt-0.5">
                  Clique diretamente nos badges coloridos de cada aluno para resolver a pendência.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cards de resumo de pendências */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              id:         'sem_ficha' as const,
              label:      'Sem Ficha de Matrícula',
              valor:      resumo.sem_ficha,
              icon:       <FileText className="w-5 h-5" />,
              corAtiva:   'bg-red-600 text-white border-red-600',
              corInativa: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
              corNumero:  'text-red-600 dark:text-red-400',
            },
            {
              id:         'sem_contrato' as const,
              label:      'Sem Contrato',
              valor:      resumo.sem_contrato,
              icon:       <FileText className="w-5 h-5" />,
              corAtiva:   'bg-orange-600 text-white border-orange-600',
              corInativa: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
              corNumero:  'text-orange-600 dark:text-orange-400',
            },
            {
              id:         'docs_pendentes' as const,
              label:      'Documentos Pendentes',
              valor:      resumo.docs_pendentes,
              icon:       <Upload className="w-5 h-5" />,
              corAtiva:   'bg-yellow-600 text-white border-yellow-600',
              corInativa: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
              corNumero:  'text-yellow-600 dark:text-yellow-400',
            },
            {
              id:         'sem_acesso_portal' as const,
              label:      'Sem Acesso ao Portal',
              valor:      resumo.sem_acesso_portal,
              icon:       <Users className="w-5 h-5" />,
              corAtiva:   'bg-blue-600 text-white border-blue-600',
              corInativa: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
              corNumero:  'text-blue-600 dark:text-blue-400',
            },
          ].map(c => (
            <button key={c.id}
              onClick={() => setFiltro(filtro === c.id ? 'todos' : c.id)}
              className={`
                p-4 rounded-xl border-2 text-left transition-all hover:shadow-md
                ${filtro === c.id ? c.corAtiva : c.corInativa}
              `}>
              <div className="flex items-center justify-between mb-2">
                {c.icon}
                {filtro === c.id && (
                  <span className="text-xs font-medium opacity-80">Filtrando</span>
                )}
              </div>
              <p className={`text-3xl font-bold ${filtro === c.id ? 'text-white' : c.corNumero}`}>
                {loading ? '—' : c.valor}
              </p>
              <p className={`text-xs mt-1 ${filtro === c.id ? 'text-white/80' : ''}`}>
                {c.label}
              </p>
            </button>
          ))}
        </div>

        {/* Filtros de busca */}
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-foreground mb-1.5 block">Buscar aluno</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Nome do aluno..."
                    className="pl-9 bg-background border-border text-foreground"
                    value={busca}
                    onChange={e => setBusca(e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-sm text-foreground mb-1.5 block">Pendência</Label>
                <Select value={filtro} onValueChange={v => setFiltro(v as any)}>
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os alunos</SelectItem>
                    <SelectItem value="sem_ficha">Sem ficha de matrícula</SelectItem>
                    <SelectItem value="sem_contrato">Sem contrato</SelectItem>
                    <SelectItem value="docs_pendentes">Documentos pendentes</SelectItem>
                    <SelectItem value="sem_acesso_portal">Sem acesso ao portal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {filtro !== 'todos' && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Filtro ativo:</span>
                <button
                  onClick={() => setFiltro('todos')}
                  className="inline-flex items-center gap-1.5 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 px-2.5 py-1 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors">
                  {filtro === 'sem_ficha'         && 'Sem ficha de matrícula'}
                  {filtro === 'sem_contrato'      && 'Sem contrato'}
                  {filtro === 'docs_pendentes'    && 'Documentos pendentes'}
                  {filtro === 'sem_acesso_portal' && 'Sem acesso ao portal'}
                  <X className="w-3 h-3" />
                </button>
                <span className="text-xs text-muted-foreground">{total} aluno(s)</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Legenda dos badges clicáveis ── */}
        <div className="flex items-center gap-2 px-1">
          <AlertCircle className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Badges de pendência são clicáveis — clique para ir direto ao formulário correspondente.
          </p>
        </div>

        {/* ── Tabela ── */}
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    {['Nome', 'Série', 'Status', 'Ficha', 'Contrato', 'Documentos', 'Portal'].map(h => (
                      <th key={h} className="px-4 py-4 text-left text-sm font-semibold text-muted-foreground whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center">
                        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Carregando...</p>
                      </td>
                    </tr>
                  ) : alunos.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center">
                        <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Nenhum aluno encontrado.</p>
                      </td>
                    </tr>
                  ) : alunos.map(a => {
                    const temPendencia = !a.tem_ficha || !a.tem_contrato || a.docs_pendentes;
                    return (
                      <tr key={a.id}
                        className={`hover:bg-muted/50 transition-colors ${
                          temPendencia ? 'border-l-2 border-l-orange-400 dark:border-l-orange-600' : ''
                        }`}>

                        {/* Nome */}
                        <td className="px-4 py-3.5 text-sm font-medium text-foreground max-w-[180px]">
                          <span className="block truncate" title={a.nome}>{a.nome}</span>
                        </td>

                        {/* Série */}
                        <td className="px-4 py-3.5 text-sm text-muted-foreground whitespace-nowrap">
                          {a.serie ?? '—'}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          <StatusBadge status={a.status ?? ''} />
                        </td>

                        {/* ── Ficha — clicável se pendente ── */}
                        <td className="px-4 py-3.5">
                          {a.tem_ficha ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/40 px-2 py-0.5 rounded-full font-medium">
                              <CheckCircle className="w-3 h-3" /> OK
                            </span>
                          ) : (
                            <button
                              onClick={() => navegarComContexto(
                                { tipo: 'criar-ficha', alunoId: a.id, nomeAluno: a.nome },
                                'matriculas'
                              )}
                              title={`Criar ficha de matrícula para ${a.nome}`}
                              className="group inline-flex items-center gap-1.5 text-xs text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-800/60 border border-red-300 dark:border-red-700 hover:border-red-400 dark:hover:border-red-500 px-2 py-1 rounded-full font-medium transition-all cursor-pointer hover:shadow-sm active:scale-95"
                            >
                              <AlertCircle className="w-3 h-3" />
                              Criar Ficha
                              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity -ml-0.5" />
                            </button>
                          )}
                        </td>

                        {/* ── Contrato — clicável se tem ficha mas não tem contrato ── */}
                        <td className="px-4 py-3.5">
                          {a.tem_contrato ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/40 px-2 py-0.5 rounded-full font-medium">
                              <CheckCircle className="w-3 h-3" /> OK
                            </span>
                          ) : a.tem_ficha ? (
                            <button
                              onClick={() => navegarComContexto(
                                { tipo: 'criar-contrato', fichaId: a.ficha_id!, nomeAluno: a.nome },
                                'emissao-contratos'
                              )}
                              title={`Criar contrato para ${a.nome}`}
                              className="group inline-flex items-center gap-1.5 text-xs text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/40 hover:bg-orange-200 dark:hover:bg-orange-800/60 border border-orange-300 dark:border-orange-700 hover:border-orange-400 dark:hover:border-orange-500 px-2 py-1 rounded-full font-medium transition-all cursor-pointer hover:shadow-sm active:scale-95"
                            >
                              <Clock className="w-3 h-3" />
                              Criar Contrato
                              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity -ml-0.5" />
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground px-2 py-0.5 rounded-full"
                              title="Crie a ficha primeiro">
                              — aguarda ficha
                            </span>
                          )}
                        </td>

                        {/* ── Documentos — clicável se tem ficha e docs pendentes ── */}
                        <td className="px-4 py-3.5">
                          {!a.tem_ficha ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : a.docs_pendentes ? (
                            <button
                              onClick={() => navegarComContexto(
                                { tipo: 'ver-documentos', fichaId: a.ficha_id!, nomeAluno: a.nome },
                                'documentos-recebidos'
                              )}
                              title={`Gerenciar documentos de ${a.nome}`}
                              className="group inline-flex items-center gap-1.5 text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/40 hover:bg-yellow-200 dark:hover:bg-yellow-800/60 border border-yellow-300 dark:border-yellow-700 hover:border-yellow-400 dark:hover:border-yellow-500 px-2 py-1 rounded-full font-medium transition-all cursor-pointer hover:shadow-sm active:scale-95"
                            >
                              <AlertCircle className="w-3 h-3" />
                              Ver Docs
                              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity -ml-0.5" />
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/40 px-2 py-0.5 rounded-full font-medium">
                              <CheckCircle className="w-3 h-3" /> Completo
                            </span>
                          )}
                        </td>

                        {/* Portal */}
                        <td className="px-4 py-3.5">
                          {a.tem_acesso_portal ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/40 px-2 py-0.5 rounded-full font-medium">
                              <CheckCircle className="w-3 h-3" /> Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/40 px-2 py-0.5 rounded-full font-medium">
                              <AlertCircle className="w-3 h-3" /> Sem acesso
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            <div className="px-5 py-4 border-t border-border flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {loading ? '...' : `${total} aluno(s) encontrado(s)`}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm"
                  disabled={pagina === 1}
                  onClick={() => setPagina(p => p - 1)}>
                  Anterior
                </Button>
                {Array.from({ length: Math.min(Math.ceil(total / porPagina), 5) }, (_, i) => i + 1).map(p => (
                  <Button key={p} variant="outline" size="sm"
                    className={pagina === p ? 'bg-blue-600 text-white border-blue-600' : ''}
                    onClick={() => setPagina(p)}>{p}</Button>
                ))}
                <Button variant="outline" size="sm"
                  disabled={pagina >= Math.ceil(total / porPagina)}
                  onClick={() => setPagina(p => p + 1)}>
                  Próximo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderConteudo = () => {
    switch (secaoAtiva) {
      case 'dashboard': return renderDashboard();
      case 'alunos':    return renderAlunos();

      case 'matriculas':
        return (
          <FormularioMatricula
            onVoltar={voltarParaAlunos}
            segmentoInicial={segmentoGestor}
            alunoIdInicial={
              acaoContextual?.tipo === 'criar-ficha' ? acaoContextual.alunoId : undefined
            }
            nomeAlunoInicial={
              acaoContextual?.tipo === 'criar-ficha' ? acaoContextual.nomeAluno : undefined
            }
          />
        );

      case 'emissao-contratos':
        return (
          <EmissaoContratos
            onVoltar={voltarParaAlunos}
            fichaIdInicial={
              acaoContextual?.tipo === 'criar-contrato' ? acaoContextual.fichaId : undefined
            }
            nomeAlunoInicial={
              acaoContextual?.tipo === 'criar-contrato' ? acaoContextual.nomeAluno : undefined
            }
          />
        );

      case 'documentos-recebidos':
        return (
          <DocumentosRecebidos
            onVoltar={voltarParaAlunos}
            fichaIdInicial={
              acaoContextual?.tipo === 'ver-documentos' ? acaoContextual.fichaId : undefined
            }
            nomeAlunoInicial={
              acaoContextual?.tipo === 'ver-documentos' ? acaoContextual.nomeAluno : undefined
            }
          />
        );

      case 'boletins':
        return <BoletimCoordenador onVoltar={() => setSecaoAtiva('dashboard')} />;

      case 'controle-pagamentos':
        return <ControlePagamentos onVoltar={() => setSecaoAtiva('dashboard')} segmentoGestor={segmentoGestor} />;

      case 'controle-despesas':
        return <ControleDespesas onVoltar={() => setSecaoAtiva('dashboard')} segmentoGestor={segmentoGestor} />;

      case 'relatorio-financeiro':
        return <RelatorioFinanceiro onVoltar={() => setSecaoAtiva('dashboard')} segmentoGestor={segmentoGestor} />;

      case 'emissao-documentos':
        return <EmissaoDocumentos usuario={usuario!} />;

      case 'historico-ia':
        return (
          <div className="p-6">
            <HistoricoIA
              usuario={{ id: usuario!.id, nome: usuario!.nome, tipo: usuario!.tipo, segmento: (usuario!.segmento ?? 'ead') as 'ead' | 'presencial' }}
            />
          </div>
        );

      case 'arquivo-morto':
        return (
          <div className="p-6">
            <ArquivoMorto
              usuario={{ id: usuario!.id, nome: usuario!.nome, tipo: usuario!.tipo, segmento: (usuario!.segmento ?? 'ead') as 'ead' | 'presencial' }}
            />
          </div>
        );

      case 'configuracoes':
        return (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
              <Settings className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Configurações</h3>
            <p className="text-muted-foreground">Em desenvolvimento</p>
          </div>
        );

      default:
        return renderDashboard();
    }
  };

  // ─── Layout principal ─────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Header */}
      <header className="bg-card border-b border-border py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logoEscola} alt="Colégio Conexão"
                className="w-10 h-10 object-contain" />
              <div>
                <h1 className="font-semibold text-foreground text-base">
                  Colégio Conexão Maranhense
                </h1>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  Painel — Gestor Geral
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${segmentoCor}`}>
                    {segmentoLabel}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={toggleTheme}
                className="p-2 rounded-full bg-secondary text-secondary-foreground hover:bg-accent transition-colors border border-border"
                aria-label="Alternar tema">
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
              <Button variant="ghost" className="flex items-center gap-2"
                onClick={() => setMostrarPerfil(true)}>
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-sm bg-blue-600 text-white">
                    {iniciais}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-foreground hidden sm:inline">
                  {usuario?.nome ?? 'Gestor'}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 gap-6">

        {/* Sidebar */}
        <aside className={`
          ${sidebarAberta ? 'w-56' : 'w-14'}
          flex-shrink-0 bg-card border border-border rounded-xl
          transition-all duration-300 flex flex-col self-start sticky top-24
        `}>
          <div className="p-3 border-b border-border flex items-center justify-between min-h-[48px]">
            {sidebarAberta ? (
              <>
                <p className="text-sm font-semibold text-foreground">Menu</p>
                <button onClick={() => setSidebarAberta(false)}
                  className="text-muted-foreground hover:text-foreground p-1">
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button onClick={() => setSidebarAberta(true)}
                className="text-muted-foreground hover:text-foreground mx-auto p-1">
                <Menu className="w-4 h-4" />
              </button>
            )}
          </div>

          <nav className="flex-1 p-2 space-y-0.5">
            {menuGrupos.map((grupo, gi) => (
              <div key={gi}>
                {sidebarAberta && grupo.titulo && (
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-4 pb-1.5">
                    {grupo.titulo}
                  </p>
                )}
                {!sidebarAberta && grupo.titulo && gi > 0 && (
                  <div className="border-t border-border my-2" />
                )}
                {grupo.itens.map(item => (
                  <button key={item.id}
                    onClick={() => { setAcaoContextual(null); setSecaoAtiva(item.id); }}
                    title={!sidebarAberta ? item.label : undefined}
                    className={`
                      w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg
                      transition-colors text-sm font-medium
                      ${secaoAtiva === item.id
                        ? 'bg-blue-600 text-white'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }
                      ${!sidebarAberta ? 'justify-center' : ''}
                    `}>
                    {item.icon}
                    {sidebarAberta && <span>{item.label}</span>}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          <div className="p-2 border-t border-border">
            <Button onClick={logout} variant="outline" size="sm"
              className="w-full border-border text-muted-foreground hover:text-red-600 hover:border-red-400 dark:hover:border-red-700 transition-colors">
              <LogOut className="w-4 h-4" />
              {sidebarAberta && <span className="ml-2">Sair</span>}
            </Button>
          </div>
        </aside>

        {/* Conteúdo principal */}
        <main className="flex-1 min-w-0">
          {renderConteudo()}
        </main>
      </div>

      <PerfilUsuario open={mostrarPerfil} onOpenChange={setMostrarPerfil} />
    </div>
  );
}