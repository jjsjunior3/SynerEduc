import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

// ─── Tipos ───────────────────────────────────────────────
export interface ResumoFinanceiro {
  recebidoMes: number;
  aReceber: number;
  emAtraso: number;
  qtdPagos: number;
  qtdPendentes: number;
  qtdAtrasados: number;
}

export interface ResumoAlunos {
  total: number;
  ead: number;
  presencial: number;
  pendentes: number;
}

export interface AlunoRow {
  id: string;
  nome: string;
  serie: string | null;
  segmento: string | null;
  turno: string | null;
  status: string | null;
  email: string | null;
}

export interface MensalidadeRow {
  id: string;
  aluno_id: string;
  aluno_nome: string;
  aluno_serie: string | null;
  valor: number;
  vencimento: string;
  status: string;
  pago_em: string | null;
  segmento: string | null;
}

interface UseGestorDadosReturn {
  resumoFinanceiro: ResumoFinanceiro | null;
  resumoAlunos: ResumoAlunos | null;
  alunos: AlunoRow[];
  mensalidades: MensalidadeRow[];
  loading: boolean;
  loadingAlunos: boolean;
  loadingMensalidades: boolean;
  erro: string | null;
  refetch: () => void;
  segmentoGestor: string; // 'ead' | 'presencial'
  // Paginação alunos
  totalAlunos: number;
  paginaAlunos: number;
  setPaginaAlunos: (p: number) => void;
  buscaAluno: string;
  setBuscaAluno: (b: string) => void;
  filtroStatus: string;
  setFiltroStatus: (s: string) => void;
  // Paginação mensalidades
  totalMensalidades: number;
  paginaMensalidades: number;
  setPaginaMensalidades: (p: number) => void;
  filtroStatusMensalidade: string;
  setFiltroStatusMensalidade: (s: string) => void;
}

const POR_PAGINA = 10;

function inicioFimMesAtual() {
  const agora = new Date();
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1)
    .toISOString().split('T')[0];
  const fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0)
    .toISOString().split('T')[0];
  return { inicio, fim };
}

// ─── Hook principal ──────────────────────────────────────
export function useGestorDados(): UseGestorDadosReturn {
  const { usuario } = useAuth();

  // Segmento do gestor logado — fallback 'ead' por segurança
  const segmentoGestor: string = usuario?.segmento ?? 'ead';

  const [resumoFinanceiro, setResumoFinanceiro] = useState<ResumoFinanceiro | null>(null);
  const [resumoAlunos, setResumoAlunos]         = useState<ResumoAlunos | null>(null);
  const [alunos, setAlunos]                     = useState<AlunoRow[]>([]);
  const [mensalidades, setMensalidades]         = useState<MensalidadeRow[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [loadingAlunos, setLoadingAlunos]       = useState(false);
  const [loadingMensalidades, setLoadingMensalidades] = useState(false);
  const [erro, setErro]                         = useState<string | null>(null);
  const [versao, setVersao]                     = useState(0);

  const [totalAlunos, setTotalAlunos]           = useState(0);
  const [paginaAlunos, setPaginaAlunos]         = useState(1);
  const [buscaAluno, setBuscaAluno]             = useState('');
  const [filtroStatus, setFiltroStatus]         = useState('ativo');

  const [totalMensalidades, setTotalMensalidades] = useState(0);
  const [paginaMensalidades, setPaginaMensalidades] = useState(1);
  const [filtroStatusMensalidade, setFiltroStatusMensalidade] = useState('todos');

  const refetch = useCallback(() => setVersao(v => v + 1), []);

  // ── Cards de resumo ───────────────────────────────────
  useEffect(() => {
    if (!segmentoGestor) return;

    async function carregarResumos() {
      setLoading(true);
      setErro(null);
      try {
        const { inicio, fim } = inicioFimMesAtual();

        // Alunos — filtrados pelo segmento do gestor
        const [
          { count: totalAtivos },
          { count: totalPendentes },
        ] = await Promise.all([
          supabase.from('users').select('*', { count: 'exact', head: true })
            .eq('tipo', 'aluno').eq('status', 'ativo').eq('segmento', segmentoGestor),
          supabase.from('users').select('*', { count: 'exact', head: true })
            .eq('tipo', 'aluno').eq('status', 'pendente').eq('segmento', segmentoGestor),
        ]);

        // O card mostra o segmento do gestor no campo correto
        setResumoAlunos({
          total:      totalAtivos   ?? 0,
          ead:        segmentoGestor === 'ead'       ? (totalAtivos ?? 0) : 0,
          presencial: segmentoGestor === 'presencial' ? (totalAtivos ?? 0) : 0,
          pendentes:  totalPendentes ?? 0,
        });

        // Financeiro — filtrado pelo segmento
        const [
          { data: pagos,     error: errPagos },
          { data: pendentes, error: errPend  },
          { data: atrasados, error: errAtras },
        ] = await Promise.all([
          supabase.from('financeiro_mensalidades').select('valor')
            .eq('status', 'pago').eq('segmento', segmentoGestor)
            .gte('pago_em', `${inicio}T00:00:00`)
            .lte('pago_em', `${fim}T23:59:59`),
          supabase.from('financeiro_mensalidades').select('valor')
            .eq('status', 'pendente').eq('segmento', segmentoGestor),
          supabase.from('financeiro_mensalidades').select('valor')
            .eq('status', 'atrasado').eq('segmento', segmentoGestor),
        ]);

        if (errPagos || errPend || errAtras) {
          setResumoFinanceiro({
            recebidoMes: 0, aReceber: 0, emAtraso: 0,
            qtdPagos: 0, qtdPendentes: 0, qtdAtrasados: 0,
          });
        } else {
          const soma = (arr: { valor: number }[] | null) =>
            (arr ?? []).reduce((acc, r) => acc + Number(r.valor), 0);

          setResumoFinanceiro({
            recebidoMes:  soma(pagos),
            aReceber:     soma(pendentes),
            emAtraso:     soma(atrasados),
            qtdPagos:     pagos?.length     ?? 0,
            qtdPendentes: pendentes?.length ?? 0,
            qtdAtrasados: atrasados?.length ?? 0,
          });
        }
      } catch (e: any) {
        setErro(e.message ?? 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    }

    carregarResumos();
  }, [versao, segmentoGestor]);

  // ── Lista de alunos ───────────────────────────────────
  useEffect(() => {
    if (!segmentoGestor) return;

    async function carregarAlunos() {
      setLoadingAlunos(true);
      try {
        const from = (paginaAlunos - 1) * POR_PAGINA;
        const to   = from + POR_PAGINA - 1;

        let query = supabase
          .from('users')
          .select('id, nome, serie, segmento, turno, status, email', { count: 'exact' })
          .eq('tipo', 'aluno')
          .eq('segmento', segmentoGestor)   // ← filtro fixo pelo segmento do gestor
          .order('nome', { ascending: true })
          .range(from, to);

        if (filtroStatus !== 'todos') query = query.eq('status', filtroStatus);
        if (buscaAluno.trim())        query = query.ilike('nome', `%${buscaAluno.trim()}%`);

        const { data, count, error } = await query;
        if (error) throw error;

        setAlunos(data ?? []);
        setTotalAlunos(count ?? 0);
      } catch (e: any) {
        console.error('Erro ao carregar alunos:', e.message);
      } finally {
        setLoadingAlunos(false);
      }
    }

    carregarAlunos();
  }, [paginaAlunos, buscaAluno, filtroStatus, versao, segmentoGestor]);

  // ── Lista de mensalidades ─────────────────────────────
  useEffect(() => {
    if (!segmentoGestor) return;

    async function carregarMensalidades() {
      setLoadingMensalidades(true);
      try {
        const from = (paginaMensalidades - 1) * POR_PAGINA;
        const to   = from + POR_PAGINA - 1;

        let query = supabase
          .from('financeiro_mensalidades')
          .select(`
            id, aluno_id, valor, vencimento, status, pago_em, segmento,
            users!financeiro_mensalidades_aluno_id_fkey (nome, serie)
          `, { count: 'exact' })
          .eq('segmento', segmentoGestor)   // ← filtro fixo pelo segmento do gestor
          .order('vencimento', { ascending: false })
          .range(from, to);

        if (filtroStatusMensalidade !== 'todos')
          query = query.eq('status', filtroStatusMensalidade);

        const { data, count, error } = await query;

        if (error) {
          if (error.code === '42P01') {
            setMensalidades([]); setTotalMensalidades(0); return;
          }
          throw error;
        }

        const rows: MensalidadeRow[] = (data ?? []).map((r: any) => ({
          id:          r.id,
          aluno_id:    r.aluno_id,
          aluno_nome:  r.users?.nome  ?? '—',
          aluno_serie: r.users?.serie ?? null,
          valor:       Number(r.valor),
          vencimento:  r.vencimento,
          status:      r.status,
          pago_em:     r.pago_em,
          segmento:    r.segmento,
        }));

        setMensalidades(rows);
        setTotalMensalidades(count ?? 0);
      } catch (e: any) {
        console.error('Erro ao carregar mensalidades:', e.message);
      } finally {
        setLoadingMensalidades(false);
      }
    }

    carregarMensalidades();
  }, [paginaMensalidades, filtroStatusMensalidade, versao, segmentoGestor]);

  return {
    resumoFinanceiro, resumoAlunos,
    alunos, mensalidades,
    loading, loadingAlunos, loadingMensalidades,
    erro, refetch,
    segmentoGestor,
    totalAlunos, paginaAlunos, setPaginaAlunos,
    buscaAluno, setBuscaAluno,
    filtroStatus, setFiltroStatus,
    totalMensalidades, paginaMensalidades, setPaginaMensalidades,
    filtroStatusMensalidade, setFiltroStatusMensalidade,
  };
}