import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useGestorDados } from '../hooks/useGestorDados';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { PerfilUsuario } from './PerfilUsuario';
import { ChatGabriela }  from './ai/ChatGabriela';
import {
  LayoutDashboard, DollarSign, Settings,
  FileText, TrendingDown, TrendingUp,
  CheckCircle, Clock, XCircle, AlertCircle,
  LogOut, Menu, X, RefreshCw, BarChart3,
  CreditCard, Sun, Moon, AlertTriangle,
} from 'lucide-react';
import logoEscola from '../assets/e339c695d5503d560f7e53d2039456d52fd95ea5.png';
import { supabase } from '../supabase/supabaseClient';
import { useEffect } from 'react';

// ── Componentes filhos ────────────────────────────────────
import { ControlePagamentos }  from './ControlePagamentos';
import { ControleDespesas }    from './ControleDespesas';
import { RelatorioFinanceiro } from './RelatorioFinanceiro';
import { EmissaoContratos }    from './EmissaoContratos';

// ─── Tipos ───────────────────────────────────────────────
type SecaoAtiva =
  | 'dashboard'
  | 'controle-pagamentos'
  | 'controle-despesas'
  | 'relatorio-financeiro'
  | 'contratos'
  | 'configuracoes';

// ─── Helpers ─────────────────────────────────────────────
function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ─── Hook local: inadimplência detalhada ─────────────────
interface Inadimplente {
  aluno_id: string;
  nome: string;
  qtd_atraso: number;
  total_atraso: number;
}

function useInadimplentes(segmento: string) {
  const [dados, setDados]     = useState<Inadimplente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function buscar() {
      setLoading(true);
      try {
        // Busca parcelas atrasadas agrupadas por aluno
        const { data, error } = await supabase
          .from('financeiro_mensalidades')
          .select('aluno_id, valor, vencimento')
          .ilike('segmento', segmento)
          .eq('status', 'atrasado')
          .order('vencimento', { ascending: true });

        if (error) throw error;

        // Agrupa por aluno_id
        const mapa: Record<string, { qtd: number; total: number }> = {};
        for (const row of data ?? []) {
          if (!row.aluno_id) continue;
          if (!mapa[row.aluno_id]) mapa[row.aluno_id] = { qtd: 0, total: 0 };
          mapa[row.aluno_id].qtd   += 1;
          mapa[row.aluno_id].total += Number(row.valor ?? 0);
        }

        // Busca nomes
        const ids = Object.keys(mapa);
        if (ids.length === 0) { setDados([]); return; }

        const { data: users } = await supabase
          .from('users')
          .select('id, nome')
          .in('id', ids);

        const nomes: Record<string, string> = {};
        for (const u of users ?? []) nomes[u.id] = u.nome;

        const lista: Inadimplente[] = ids
          .map(id => ({
            aluno_id:    id,
            nome:        nomes[id] ?? 'Aluno desconhecido',
            qtd_atraso:  mapa[id].qtd,
            total_atraso: mapa[id].total,
          }))
          .sort((a, b) => b.total_atraso - a.total_atraso)
          .slice(0, 10); // top 10

        setDados(lista);
      } catch {
        setDados([]);
      } finally {
        setLoading(false);
      }
    }
    if (segmento) buscar();
  }, [segmento]);

  return { dados, loading };
}

// ─── Componente principal ─────────────────────────────────
export default function DashboardFinanceiro() {
  const { usuario, logout }               = useAuth();
  const { theme, toggleTheme }            = useTheme();
  const [secaoAtiva, setSecaoAtiva]       = useState<SecaoAtiva>('dashboard');
  const [sidebarAberta, setSidebarAberta] = useState(true);
  const [mostrarPerfil, setMostrarPerfil] = useState(false);

  const dados = useGestorDados();
  const segmentoFinanceiro = dados.segmentoGestor;
  const segmentoLabel      = segmentoFinanceiro === 'presencial' ? 'Presencial' : 'EAD';
  const segmentoCor        = segmentoFinanceiro === 'presencial'
    ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-200'
    : 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200';

  const inadimplentes = useInadimplentes(segmentoFinanceiro ?? '');

  const iniciais = usuario?.nome
    ? usuario.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'FN';

  // ── Menu lateral ─────────────────────────────────────────
  const menuGrupos: {
    titulo: string;
    itens: { id: SecaoAtiva; label: string; icon: React.ReactNode }[];
  }[] = [
    {
      titulo: '',
      itens: [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      ],
    },
    {
      titulo: 'Financeiro',
      itens: [
        { id: 'controle-pagamentos',  label: 'Pagamentos', icon: <CreditCard   className="w-4 h-4" /> },
        { id: 'controle-despesas',    label: 'Despesas',   icon: <TrendingDown className="w-4 h-4" /> },
        { id: 'relatorio-financeiro', label: 'Relatório',  icon: <BarChart3    className="w-4 h-4" /> },
      ],
    },
    {
      titulo: 'Contratos',
      itens: [
        { id: 'contratos', label: 'Contratos', icon: <FileText className="w-4 h-4" /> },
      ],
    },
    {
      titulo: '',
      itens: [
        { id: 'configuracoes', label: 'Configurações', icon: <Settings className="w-4 h-4" /> },
      ],
    },
  ];

  // ── Dashboard ─────────────────────────────────────────────
  const renderDashboard = () => {
    const { resumoFinanceiro, loading, erro, refetch } = dados;

    // Percentual de inadimplência
    const totalParcelas = (resumoFinanceiro?.qtdPagos ?? 0)
      + (resumoFinanceiro?.qtdPendentes ?? 0)
      + (resumoFinanceiro?.qtdAtrasados ?? 0);
    const pctInadimplencia = totalParcelas > 0
      ? Math.round(((resumoFinanceiro?.qtdAtrasados ?? 0) / totalParcelas) * 100)
      : 0;

    const nivelAlerta = pctInadimplencia >= 20 ? 'critico' : pctInadimplencia >= 10 ? 'atencao' : 'ok';

    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Visão Geral — Financeiro</h2>
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

        {/* Alerta de inadimplência */}
        {!loading && nivelAlerta !== 'ok' && (
          <Card className={
            nivelAlerta === 'critico'
              ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
              : 'border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20'
          }>
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                nivelAlerta === 'critico'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-orange-600 dark:text-orange-400'
              }`} />
              <div>
                <p className={`text-sm font-semibold ${
                  nivelAlerta === 'critico'
                    ? 'text-red-800 dark:text-red-200'
                    : 'text-orange-800 dark:text-orange-200'
                }`}>
                  {nivelAlerta === 'critico'
                    ? `Inadimplência crítica: ${pctInadimplencia}% das parcelas em atraso`
                    : `Atenção: ${pctInadimplencia}% das parcelas em atraso`
                  }
                </p>
                <button
                  onClick={() => setSecaoAtiva('controle-pagamentos')}
                  className={`text-xs underline underline-offset-2 mt-0.5 hover:no-underline ${
                    nivelAlerta === 'critico'
                      ? 'text-red-700 dark:text-red-300'
                      : 'text-orange-700 dark:text-orange-300'
                  }`}>
                  Ver pagamentos pendentes →
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cards principais */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
            Resumo do Mês — {new Date().toLocaleDateString('pt-BR', { month: 'long' })}
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                label: 'Recebido no Mês',
                valor: resumoFinanceiro?.recebidoMes ?? 0,
                sub:   `${resumoFinanceiro?.qtdPagos ?? 0} pagamentos confirmados`,
                icon:  <CheckCircle className="w-6 h-6 text-white" />,
                cor:   'from-green-500 to-green-600',
                borda: 'border-green-200 dark:border-green-800',
              },
              {
                label: 'A Receber',
                valor: resumoFinanceiro?.aReceber ?? 0,
                sub:   `${resumoFinanceiro?.qtdPendentes ?? 0} parcelas pendentes`,
                icon:  <Clock className="w-6 h-6 text-white" />,
                cor:   'from-yellow-500 to-yellow-600',
                borda: 'border-yellow-200 dark:border-yellow-800',
              },
              {
                label: 'Em Atraso',
                valor: resumoFinanceiro?.emAtraso ?? 0,
                sub:   `${resumoFinanceiro?.qtdAtrasados ?? 0} inadimplentes`,
                icon:  <XCircle className="w-6 h-6 text-white" />,
                cor:   'from-red-500 to-red-600',
                borda: 'border-red-200 dark:border-red-800',
              },
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

        {/* Indicadores secundários */}
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Taxa de inadimplência */}
          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-foreground">Taxa de Inadimplência</p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  nivelAlerta === 'critico'
                    ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                    : nivelAlerta === 'atencao'
                    ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
                    : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                }`}>
                  {loading ? '—' : `${pctInadimplencia}%`}
                </span>
              </div>
              {/* Barra de progresso */}
              <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    nivelAlerta === 'critico'
                      ? 'bg-red-500'
                      : nivelAlerta === 'atencao'
                      ? 'bg-orange-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: loading ? '0%' : `${Math.min(pctInadimplencia, 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs text-muted-foreground">0%</span>
                <span className="text-xs text-muted-foreground">Meta: &lt;10%</span>
                <span className="text-xs text-muted-foreground">100%</span>
              </div>
            </CardContent>
          </Card>

          {/* Saldo estimado */}
          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-foreground">Saldo Estimado do Mês</p>
                <DollarSign className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mb-4">Recebido − despesas registradas</p>
              <p className="text-2xl font-bold text-foreground">
                {loading ? '—' : formatBRL(
                  (resumoFinanceiro?.recebidoMes ?? 0) - (resumoFinanceiro?.totalDespesasMes ?? 0)
                )}
              </p>
              <div className="flex items-center gap-4 mt-3">
                <span className="text-xs text-green-700 dark:text-green-300 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Receita: {loading ? '—' : formatBRL(resumoFinanceiro?.recebidoMes ?? 0)}
                </span>
                <span className="text-xs text-red-700 dark:text-red-300 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" />
                  Despesas: {loading ? '—' : formatBRL(resumoFinanceiro?.totalDespesasMes ?? 0)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top inadimplentes */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Maiores Inadimplências
            </p>
            <button
              onClick={() => setSecaoAtiva('controle-pagamentos')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline underline-offset-2">
              Ver todos →
            </button>
          </div>

          <Card className="bg-card border-border">
            <CardContent className="p-0">
              {inadimplentes.loading ? (
                <div className="flex items-center justify-center py-10">
                  <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : inadimplentes.dados.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
                  <p className="text-sm font-medium text-foreground">Sem inadimplências!</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Todos os pagamentos estão em dia.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {inadimplentes.dados.map((ina, i) => (
                    <div key={ina.aluno_id}
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className={`
                          w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                          ${i === 0 ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                            : i === 1 ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
                            : 'bg-muted text-muted-foreground'}
                        `}>{i + 1}</span>
                        <div>
                          <p className="text-sm font-medium text-foreground">{ina.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {ina.qtd_atraso} parcela(s) em atraso
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                        {formatBRL(ina.total_atraso)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Ações rápidas */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
            Ações Rápidas
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Registrar Pagamento',  icon: <CreditCard   className="w-5 h-5" />, acao: () => setSecaoAtiva('controle-pagamentos'),  bgL: '#dcfce7', bgD: '#14532d', cor: '#16a34a' },
              { label: 'Lançar Despesa',       icon: <TrendingDown className="w-5 h-5" />, acao: () => setSecaoAtiva('controle-despesas'),     bgL: '#ffedd5', bgD: '#431407', cor: '#ea580c' },
              { label: 'Gerar Relatório',      icon: <BarChart3    className="w-5 h-5" />, acao: () => setSecaoAtiva('relatorio-financeiro'),  bgL: '#ede9fe', bgD: '#2e1065', cor: '#7c3aed' },
              { label: 'Ver Contratos',        icon: <FileText     className="w-5 h-5" />, acao: () => setSecaoAtiva('contratos'),             bgL: '#e0f2fe', bgD: '#0c2a3f', cor: '#0284c7' },
            ].map(a => (
              <button key={a.label} onClick={a.acao}
                className="flex items-center gap-3 p-4 rounded-xl border border-border hover:shadow-md hover:scale-[1.02] transition-all text-left"
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

  // ── Renderização central ──────────────────────────────────
  const renderConteudo = () => {
    switch (secaoAtiva) {
      case 'dashboard': return renderDashboard();

      case 'controle-pagamentos':
        return <ControlePagamentos onVoltar={() => setSecaoAtiva('dashboard')} segmentoGestor={segmentoFinanceiro} />;

      case 'controle-despesas':
        return <ControleDespesas onVoltar={() => setSecaoAtiva('dashboard')} segmentoGestor={segmentoFinanceiro} />;

      case 'relatorio-financeiro':
        return <RelatorioFinanceiro onVoltar={() => setSecaoAtiva('dashboard')} segmentoGestor={segmentoFinanceiro} />;

      case 'contratos':
        // Financeiro visualiza contratos, mas não cria/edita — sem ação contextual
        return (
          <EmissaoContratos
            onVoltar={() => setSecaoAtiva('dashboard')}
            somenteLeitura
          />
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

  // ── Layout ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Header */}
      <header className="bg-card border-b border-border py-4 fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logoEscola} alt="Colégio Conexão" className="w-10 h-10 object-contain" />
              <div>
                <h1 className="font-semibold text-foreground text-base">
                  Colégio Conexão Maranhense
                </h1>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  Painel — Financeiro
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
                  <AvatarFallback className="text-sm bg-emerald-600 text-white">
                    {iniciais}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-foreground hidden sm:inline">
                  {usuario?.nome ?? 'Financeiro'}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 pt-20 gap-6">

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
                    onClick={() => setSecaoAtiva(item.id)}
                    title={!sidebarAberta ? item.label : undefined}
                    className={`
                      w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg
                      transition-colors text-sm font-medium
                      ${secaoAtiva === item.id
                        ? 'bg-emerald-600 text-white'
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

        {/* Conteúdo */}
        <main className="flex-1 min-w-0">
          {renderConteudo()}
        </main>
      </div>

      <PerfilUsuario open={mostrarPerfil} onOpenChange={setMostrarPerfil} />
      <ChatGabriela contexto="financeiro" />
    </div>
  );
}