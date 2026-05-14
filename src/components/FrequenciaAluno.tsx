// src/components/FrequenciaAluno.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useSegmento } from '../hooks/useSegmento';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import {
  Search, AlertTriangle, CheckCircle, X, FileText,
  Loader2, Users, Activity, ClipboardCheck, AlertCircle,
  Clock, LogOut, TrendingDown,
} from 'lucide-react';
import { toast } from 'sonner';

interface FrequenciaAlunosProps { onVoltar: () => void; }
type Situacao = 'regular' | 'atencao' | 'critica';
type Aba = 'alunos' | 'professores';

// ── Status de frequência com pesos ───────────────────────────────────────────
type StatusFreq = 'presente' | 'ausente' | 'atrasado' | 'evadido';

const STATUS_CONFIG: Record<StatusFreq, { label: string; cor: string; peso: number }> = {
  presente: { label: 'Presente',  cor: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200',   peso: 1   },
  atrasado: { label: 'Atrasado',  cor: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200', peso: 0.5 },
  evadido:  { label: 'Evadido',   cor: 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200', peso: 0   },
  ausente:  { label: 'Ausente',   cor: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200',             peso: 0   },
};

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface ResumoDisciplina {
  disciplina: string;
  totalAulas: number;
  presencas: number;
  faltas: number;
  atrasados: number;
  evadidos: number;
  percentual: number;
  percentualAtrasado: number;
  percentualEvadido: number;
  situacao: Situacao;
}

interface AlunoFrequencia {
  id: string;
  nome: string;
  serie: string;
  totalAulas: number;
  presencas: number;
  faltas: number;
  atrasados: number;
  evadidos: number;
  percentualFrequencia: number;
  percentualAtrasado: number;
  percentualEvadido: number;
  ultimasFaltas: string[];
  situacao: Situacao;
  resumoDisciplinas: ResumoDisciplina[];
}

// ── Painel de professores ─────────────────────────────────────────────────────
interface RegistroProfessor {
  professor_id: string;
  professor_nome: string;
  disciplina_nome: string;
  serie: string;
  turma: string;
  ordens: number[];        // aulas do dia (ordem 1-5)
  enviou: boolean;
  qtd_enviada: number;     // registros encontrados em frequencia_diaria
  qtd_esperada: number;    // aulas esperadas conforme horario_escolar
}

// ── Config escola ─────────────────────────────────────────────────────────────
const ESCOLA_CONFIG = {
  nome: 'Colégio Conexão Maranhense',
  logoPath: '/logo-colegio-conexao.png',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function getMesAtual() {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { inicio: fmt(inicio), fim: fmt(fim) };
}

function formatarData(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR');
}

function getDiaSemanaISO(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][d.getDay()];
}

function calcularSituacao(pct: number): Situacao {
  return pct >= 85 ? 'regular' : pct >= 75 ? 'atencao' : 'critica';
}

function getSituacaoStyle(s: Situacao) {
  if (s === 'regular') return { bg: '#dcfce7', text: '#14532d', border: '#86efac' };
  if (s === 'atencao') return { bg: '#fef9c3', text: '#713f12', border: '#fde047' };
  return { bg: '#fee2e2', text: '#7f1d1d', border: '#fca5a5' };
}

function getSituacaoTexto(s: Situacao) {
  return s === 'regular' ? 'Regular' : s === 'atencao' ? 'Atenção' : 'Crítica';
}

function getCircleColor(pct: number) {
  return pct >= 85 ? '#16a34a' : pct >= 75 ? '#d97706' : '#dc2626';
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function FrequenciaAlunosCoordenador({ onVoltar }: FrequenciaAlunosProps) {
  const { segmento } = useSegmento();
  const mesAtual = getMesAtual();

  // ── Aba ativa ──────────────────────────────────────────────────────────────
  const [abaAtiva, setAbaAtiva] = useState<Aba>('alunos');

  // ── Aba Alunos ─────────────────────────────────────────────────────────────
  const [seriesDisponiveis, setSeriesDisponiveis] = useState<string[]>([]);
  const [filtroSerie, setFiltroSerie]             = useState('todas');
  const [filtroSituacao, setFiltroSituacao]       = useState('todas');
  const [busca, setBusca]                         = useState('');
  const [dataInicio, setDataInicio]               = useState(mesAtual.inicio);
  const [dataFim, setDataFim]                     = useState(mesAtual.fim);
  const [periodoConsultado, setPeriodoConsultado] = useState<{ inicio: string; fim: string } | null>(null);
  const [alunosCarregados, setAlunosCarregados]   = useState(false);
  const [alunosFiltrados, setAlunosFiltrados]     = useState<AlunoFrequencia[]>([]);
  const [loading, setLoading]                     = useState(false);
  const [erro, setErro]                           = useState<string | null>(null);

  // ── Aba Professores ────────────────────────────────────────────────────────
  const [dataProfessores, setDataProfessores]         = useState(new Date().toISOString().slice(0, 10));
  const [registrosProfessores, setRegistrosProfessores] = useState<RegistroProfessor[]>([]);
  const [loadingProf, setLoadingProf]                 = useState(false);
  const [erroProf, setErroProf]                       = useState<string | null>(null);
  const [profCarregado, setProfCarregado]              = useState(false);

  // ── Carrega séries ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function carregarSeries() {
      const { data } = await supabase
        .from('users').select('serie')
        .eq('tipo', 'aluno').eq('segmento', segmento)
        .not('serie', 'is', null);
      const unicas = Array.from(new Set((data || []).map((s: any) => s.serie))).sort() as string[];
      setSeriesDisponiveis(unicas);
    }
    carregarSeries();
  }, [segmento]);

  // ── Busca frequência dos alunos ────────────────────────────────────────────
  const buscarFrequenciaAlunos = async () => {
    if (!dataInicio || !dataFim) { setErro('Selecione as datas.'); return; }
    if (dataInicio > dataFim)   { setErro('Data início deve ser anterior ao fim.'); return; }

    setLoading(true); setErro(null);
    try {
      let usersQuery = supabase
        .from('users').select('id, nome, serie')
        .eq('tipo', 'aluno').eq('segmento', segmento).limit(500);

      if (busca.trim())            usersQuery = usersQuery.ilike('nome', `%${busca.trim()}%`);
      if (filtroSerie !== 'todas') usersQuery = usersQuery.eq('serie', filtroSerie);

      const { data: usersData, error: usersError } = await usersQuery;
      if (usersError) throw usersError;
      if (!usersData?.length) {
        setAlunosFiltrados([]); setAlunosCarregados(true);
        setPeriodoConsultado({ inicio: dataInicio, fim: dataFim });
        return;
      }

      const alunoIds = usersData.map((a: any) => a.id);
      const mapaAlunos = new Map(usersData.map((a: any) => [a.id, a]));

      const { data: freqData, error: freqError } = await supabase
        .from('frequencia_diaria')
        .select('aluno_id, data_aula, presente, disciplina_id, status, numero_aula')
        .in('aluno_id', alunoIds)
        .gte('data_aula', dataInicio)
        .lte('data_aula', dataFim)
        .order('data_aula')
        .limit(50000);

      if (freqError) throw freqError;
      if (!freqData?.length) {
        setAlunosFiltrados([]); setAlunosCarregados(true);
        setPeriodoConsultado({ inicio: dataInicio, fim: dataFim });
        return;
      }

      // Nomes de disciplinas em lote
      const discIds = Array.from(new Set(freqData.map((r: any) => r.disciplina_id).filter(Boolean))) as string[];
      const nomeMap: Record<string, string> = {};
      if (discIds.length) {
        const { data: discData } = await supabase
          .from('disciplinas').select('id, nome').in('id', discIds);
        (discData || []).forEach((d: any) => { nomeMap[d.id] = d.nome; });
      }

      // Agrupa por aluno
      const registrosPorAluno = new Map<string, typeof freqData>();
      for (const reg of freqData) {
        if (!mapaAlunos.has(reg.aluno_id)) continue;
        if (!registrosPorAluno.has(reg.aluno_id)) registrosPorAluno.set(reg.aluno_id, []);
        registrosPorAluno.get(reg.aluno_id)!.push(reg);
      }

      const resultado: AlunoFrequencia[] = [];

      for (const [alunoId, registros] of registrosPorAluno.entries()) {
        const aluno = mapaAlunos.get(alunoId);
        if (!aluno) continue;

        // Agrupa por disciplina
        const mapa: Record<string, {
          totalAulas: number; presencas: number; faltas: number;
          atrasados: number; evadidos: number; datas: string[];
        }> = {};

        for (const row of registros) {
          const key = row.disciplina_id ?? '__sem__';
          if (!mapa[key]) mapa[key] = { totalAulas: 0, presencas: 0, faltas: 0, atrasados: 0, evadidos: 0, datas: [] };
          mapa[key].totalAulas++;

          // Compatibilidade: status NULL ou presente=true → 'presente'
          const st: StatusFreq = row.status ?? (row.presente ? 'presente' : 'ausente');

          if (st === 'presente') mapa[key].presencas++;
          else if (st === 'atrasado') { mapa[key].atrasados++; mapa[key].presencas++; /* conta como presença */ }
          else if (st === 'evadido')  { mapa[key].evadidos++; }
          else { mapa[key].faltas++; if (row.data_aula) mapa[key].datas.push(row.data_aula); }
        }

        const resumoDisciplinas: ResumoDisciplina[] = Object.entries(mapa).map(([id, m]) => {
          const pct    = m.totalAulas > 0 ? (m.presencas / m.totalAulas) * 100 : 0;
          const pctAt  = m.totalAulas > 0 ? (m.atrasados / m.totalAulas) * 100 : 0;
          const pctEv  = m.totalAulas > 0 ? (m.evadidos  / m.totalAulas) * 100 : 0;
          return {
            disciplina:         id === '__sem__' ? 'Sem disciplina' : (nomeMap[id] || id),
            totalAulas:         m.totalAulas,
            presencas:          m.presencas,
            faltas:             m.faltas,
            atrasados:          m.atrasados,
            evadidos:           m.evadidos,
            percentual:         Number(pct.toFixed(1)),
            percentualAtrasado: Number(pctAt.toFixed(1)),
            percentualEvadido:  Number(pctEv.toFixed(1)),
            situacao:           calcularSituacao(pct),
          };
        }).sort((a, b) => a.disciplina.localeCompare(b.disciplina));

        const totalAulas  = resumoDisciplinas.reduce((s, d) => s + d.totalAulas, 0);
        const presencas   = resumoDisciplinas.reduce((s, d) => s + d.presencas, 0);
        const faltas      = resumoDisciplinas.reduce((s, d) => s + d.faltas, 0);
        const atrasados   = resumoDisciplinas.reduce((s, d) => s + d.atrasados, 0);
        const evadidos    = resumoDisciplinas.reduce((s, d) => s + d.evadidos, 0);
        const pct         = totalAulas > 0 ? (presencas / totalAulas) * 100 : 0;

        const ultimasFaltas = Object.values(mapa)
          .flatMap(m => m.datas).sort().slice(-3).map(d => formatarData(d));

        resultado.push({
          id: aluno.id, nome: aluno.nome, serie: aluno.serie ?? 'Sem série',
          totalAulas, presencas, faltas, atrasados, evadidos,
          percentualFrequencia: pct,
          percentualAtrasado: totalAulas > 0 ? (atrasados / totalAulas) * 100 : 0,
          percentualEvadido:  totalAulas > 0 ? (evadidos  / totalAulas) * 100 : 0,
          ultimasFaltas, situacao: calcularSituacao(pct), resumoDisciplinas,
        });
      }

      const filtrado = filtroSituacao !== 'todas'
        ? resultado.filter(a => a.situacao === filtroSituacao as Situacao)
        : resultado;

      setAlunosFiltrados(filtrado);
      setAlunosCarregados(true);
      setPeriodoConsultado({ inicio: dataInicio, fim: dataFim });
    } catch {
      setErro('Erro ao carregar frequência dos alunos.');
      toast.error('Erro ao carregar frequência dos alunos.');
    } finally { setLoading(false); }
  };

  // ── Busca controle de professores ──────────────────────────────────────────
  const buscarFrequenciaProfessores = async () => {
    if (!dataProfessores) return;
    setLoadingProf(true); setErroProf(null);

    try {
      const diaSemana = getDiaSemanaISO(dataProfessores);

      // 1. Horários do dia para o segmento
      const { data: horarios, error: horErr } = await supabase
        .from('horarios_escolar')
        .select('id, serie, turma, disciplina, professor, ordem, segmento')
        .eq('dia_semana', diaSemana)
        .ilike('segmento', segmento)
        .order('serie').order('ordem');

      if (horErr) throw horErr;
      if (!horarios?.length) {
        setRegistrosProfessores([]);
        setProfCarregado(true);
        return;
      }

      // 2. Nomes únicos de disciplinas do horário
      const nomesDisc = Array.from(new Set(horarios.map((h: any) => h.disciplina).filter(Boolean)));
      const nomesSerie = Array.from(new Set(horarios.map((h: any) => h.serie).filter(Boolean)));

      // 3. Busca disciplinas pelo nome para obter IDs
      const { data: disciplinasData } = await supabase
        .from('disciplinas').select('id, nome')
        .in('nome', nomesDisc);

      const discPorNome: Record<string, string> = {};
      (disciplinasData || []).forEach((d: any) => { discPorNome[d.nome] = d.id; });

      // 4. Busca séries para obter IDs
      const { data: seriesData } = await supabase
        .from('series').select('id, nome')
        .in('nome', nomesSerie);

      const seriePorNome: Record<string, string> = {};
      (seriesData || []).forEach((s: any) => { seriePorNome[s.nome] = s.id; });

      // 5. Busca vínculos professor-disciplina-série
      const discIds = Object.values(discPorNome);
      const serieIds = Object.values(seriePorNome);

      let vinculos: any[] = [];
      if (discIds.length && serieIds.length) {
        const { data: vinculosData } = await supabase
          .from('professores_disciplinas_series')
          .select('professor_id, disciplina_id, serie_id')
          .in('disciplina_id', discIds)
          .in('serie_id', serieIds)
          .ilike('segmento', segmento);
        vinculos = vinculosData || [];
      }

      // Mapa: disciplina_id + serie_id → professor_id (pega o primeiro vínculo)
      const profPorDiscSerie: Record<string, string> = {};
      for (const v of vinculos) {
        const chave = `${v.disciplina_id}__${v.serie_id}`;
        if (!profPorDiscSerie[chave]) profPorDiscSerie[chave] = v.professor_id;
      }

      // 6. Busca nomes dos professores
      const profIds = Array.from(new Set(Object.values(profPorDiscSerie)));
      const profNomes: Record<string, string> = {};
      if (profIds.length) {
        const { data: profData } = await supabase
          .from('users').select('id, nome').in('id', profIds);
        (profData || []).forEach((p: any) => { profNomes[p.id] = p.nome; });
      }

      // 7. Agrupa horários por professor + disciplina + série
      type ChavePDS = string; // `${profId}__${discId}__${serieId}`
      const grupos: Record<ChavePDS, {
        professor_id: string; professor_nome: string;
        disciplina_nome: string; serie: string; turma: string;
        ordens: number[];
      }> = {};

      for (const h of horarios) {
        const discId  = discPorNome[h.disciplina];
        const serieId = seriePorNome[h.serie];
        if (!discId || !serieId) continue;

        const profId = profPorDiscSerie[`${discId}__${serieId}`];
        if (!profId) continue;

        const chave = `${profId}__${discId}__${serieId}`;
        if (!grupos[chave]) {
          grupos[chave] = {
            professor_id:   profId,
            professor_nome: profNomes[profId] ?? 'Desconhecido',
            disciplina_nome: h.disciplina,
            serie:           h.serie,
            turma:           h.turma ?? '—',
            ordens:          [],
          };
        }
        grupos[chave].ordens.push(h.ordem);
      }

      // 8. Para cada grupo, verifica quantos registros existem em frequencia_diaria
      //    (conta registros distintos de alunos que tiveram aula lançada)
      const resultado: RegistroProfessor[] = [];

      for (const [, g] of Object.entries(grupos)) {
        const discId  = discPorNome[g.disciplina_nome];
        const serieId = seriePorNome[g.serie];

        // Conta alunos com registro no dia para essa disciplina e série
        let qtd = 0;
        if (discId && serieId) {
          // Pega alunos da série
          const { data: alunosSerie } = await supabase
            .from('users').select('id')
            .eq('tipo', 'aluno')
            .eq('serie', g.serie)
            .eq('segmento', segmento)
            .limit(200);

          const alunoIds = (alunosSerie || []).map((a: any) => a.id);

          if (alunoIds.length > 0) {
            const { count } = await supabase
              .from('frequencia_diaria')
              .select('*', { count: 'exact', head: true })
              .eq('disciplina_id', discId)
              .eq('data_aula', dataProfessores)
              .in('aluno_id', alunoIds);
            qtd = count ?? 0;
          }
        }

        resultado.push({
          ...g,
          enviou:       qtd > 0,
          qtd_enviada:  qtd,
          qtd_esperada: g.ordens.length,
        });
      }

      // Ordena: não enviados primeiro, depois por nome
      resultado.sort((a, b) => {
        if (a.enviou !== b.enviou) return a.enviou ? 1 : -1;
        return a.professor_nome.localeCompare(b.professor_nome, 'pt-BR');
      });

      setRegistrosProfessores(resultado);
      setProfCarregado(true);
    } catch (e: any) {
      setErroProf('Erro ao carregar dados de professores: ' + e.message);
    } finally {
      setLoadingProf(false);
    }
  };

  // Carrega automaticamente ao trocar de aba ou data
  useEffect(() => {
    if (abaAtiva === 'professores') {
      buscarFrequenciaProfessores();
    }
  }, [abaAtiva, dataProfessores, segmento]);

  const handleLimpar = () => {
    setFiltroSerie('todas'); setFiltroSituacao('todas'); setBusca('');
    setDataInicio(mesAtual.inicio); setDataFim(mesAtual.fim);
    setAlunosFiltrados([]); setAlunosCarregados(false);
    setErro(null); setPeriodoConsultado(null);
  };

  // ── Geração de PDF ─────────────────────────────────────────────────────────
  const handleGerarPDF = async (aluno: AlunoFrequencia) => {
    try {
      const logoResp = await fetch(ESCOLA_CONFIG.logoPath);
      let logoBase64 = '';
      if (logoResp.ok) {
        const blob = await logoResp.blob();
        logoBase64 = await new Promise<string>(res => {
          const r = new FileReader();
          r.onloadend = () => res(r.result as string);
          r.readAsDataURL(blob);
        });
      }

      const pctGeral = aluno.percentualFrequencia.toFixed(1);

      const linhasDisc = aluno.resumoDisciplinas.map((d, i) => `
        <tr style="background:${i % 2 === 0 ? '#f8fafc' : 'white'}">
          <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;">${d.disciplina}</td>
          <td style="padding:7px;text-align:center;border-bottom:1px solid #e2e8f0;">${d.totalAulas}</td>
          <td style="padding:7px;text-align:center;border-bottom:1px solid #e2e8f0;">${d.presencas}</td>
          <td style="padding:7px;text-align:center;border-bottom:1px solid #e2e8f0;">${d.atrasados}</td>
          <td style="padding:7px;text-align:center;border-bottom:1px solid #e2e8f0;">${d.evadidos}</td>
          <td style="padding:7px;text-align:center;border-bottom:1px solid #e2e8f0;">${d.faltas}</td>
          <td style="padding:7px;text-align:center;border-bottom:1px solid #e2e8f0;font-weight:bold;">${d.percentual.toFixed(1)}%</td>
          <td style="padding:7px;text-align:center;border-bottom:1px solid #e2e8f0;">${getSituacaoTexto(d.situacao)}</td>
        </tr>
      `).join('');

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
        <style>
          body{font-family:Arial,sans-serif;margin:40px;color:#1e293b;}
          h1{margin:0;font-size:16px;} h2{margin:0;font-size:13px;color:#475569;}
          table{width:100%;border-collapse:collapse;font-size:11px;margin-top:16px;}
          th{background:#1e40af;color:white;padding:8px 10px;text-align:left;}
          th:not(:first-child){text-align:center;}
          tfoot td{background:#1e3a8a;color:white;font-weight:bold;padding:8px 10px;}
          @media print{body{margin:20px;}}
        </style></head><body>
        <div style="display:flex;align-items:center;gap:16px;border-bottom:3px solid #1e40af;padding-bottom:12px;margin-bottom:20px;">
          ${logoBase64 ? `<img src="${logoBase64}" style="width:60px;height:60px;object-fit:contain;"/>` : ''}
          <div>
            <h1>${ESCOLA_CONFIG.nome}</h1>
            <h2>Relatório de Frequência Individual</h2>
            ${periodoConsultado ? `<p style="font-size:11px;color:#64748b;margin:2px 0 0;">
              Período: ${formatarData(periodoConsultado.inicio)} a ${formatarData(periodoConsultado.fim)}
            </p>` : ''}
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;margin-bottom:20px;">
          <div><strong>Aluno:</strong> ${aluno.nome}</div>
          <div><strong>Série:</strong> ${aluno.serie}</div>
          <div><strong>Frequência Geral:</strong> ${pctGeral}% — ${getSituacaoTexto(aluno.situacao)}</div>
          <div><strong>Total de Aulas:</strong> ${aluno.totalAulas} | Presenças: ${aluno.presencas} | Faltas: ${aluno.faltas}</div>
          <div><strong>Atrasados:</strong> ${aluno.atrasados} (${aluno.percentualAtrasado.toFixed(1)}%)</div>
          <div><strong>Evadidos:</strong> ${aluno.evadidos} (${aluno.percentualEvadido.toFixed(1)}%)</div>
        </div>
        <table>
          <thead><tr>
            <th>Disciplina</th><th>Aulas</th><th>Presenças</th>
            <th>Atrasados</th><th>Evadidos</th><th>Faltas</th>
            <th>Freq.%</th><th>Situação</th>
          </tr></thead>
          <tbody>${linhasDisc}</tbody>
          <tfoot><tr>
            <td>TOTAL GERAL</td>
            <td style="text-align:center">${aluno.totalAulas}</td>
            <td style="text-align:center">${aluno.presencas}</td>
            <td style="text-align:center">${aluno.atrasados}</td>
            <td style="text-align:center">${aluno.evadidos}</td>
            <td style="text-align:center">${aluno.faltas}</td>
            <td style="text-align:center">${pctGeral}%</td>
            <td style="text-align:center">${getSituacaoTexto(aluno.situacao)}</td>
          </tr></tfoot>
        </table>
        <div style="margin-top:60px;text-align:center;">
          <div style="display:inline-block;border-top:1px solid #1e293b;padding-top:8px;width:280px;">
            <p style="font-size:11px;color:#475569;">Coordenador(a) Pedagógico(a)</p>
          </div>
        </div>
        <p style="margin-top:30px;font-size:9px;color:#94a3b8;text-align:center;">
          Gerado em ${new Date().toLocaleString('pt-BR')} — Sistema SynerEduc
        </p>
        </body></html>`;

      const janela = window.open('', '_blank');
      if (janela) {
        janela.document.write(html);
        janela.document.close();
        setTimeout(() => janela.print(), 500);
      }
    } catch {
      toast.error('Erro ao gerar relatório PDF.');
    }
  };

  // ── Stats alunos ───────────────────────────────────────────────────────────
  const totalAlunos = alunosFiltrados.length;
  const mediaFreq   = totalAlunos > 0
    ? alunosFiltrados.reduce((a, b) => a + b.percentualFrequencia, 0) / totalAlunos : 0;
  const regulares   = alunosFiltrados.filter(a => a.situacao === 'regular').length;
  const criticos    = alunosFiltrados.filter(a => a.situacao === 'critica').length;

  // ── Stats professores ──────────────────────────────────────────────────────
  const profEnviaram    = registrosProfessores.filter(r => r.enviou).length;
  const profNaoEnviaram = registrosProfessores.filter(r => !r.enviou).length;
  const totalProf       = registrosProfessores.length;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Abas */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        {([
          { id: 'alunos',      label: 'Frequência de Alunos',     icon: <Users className="w-4 h-4" /> },
          { id: 'professores', label: 'Controle de Envio',        icon: <ClipboardCheck className="w-4 h-4" /> },
        ] as { id: Aba; label: string; icon: React.ReactNode }[]).map(aba => (
          <button key={aba.id}
            onClick={() => setAbaAtiva(aba.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${abaAtiva === aba.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'}
            `}>
            {aba.icon}
            {aba.label}
            {aba.id === 'professores' && profNaoEnviaram > 0 && profCarregado && (
              <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                {profNaoEnviaram}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ════════════════ ABA: ALUNOS ════════════════ */}
      {abaAtiva === 'alunos' && (
        <>
          {/* Cards de resumo */}
          {alunosCarregados && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Total de Alunos',  value: totalAlunos,               sub: 'Com registros', bg: '#dbeafe', text: '#1e3a8a', iconColor: '#3b82f6', Icon: Users },
                { label: 'Freq. Média',      value: `${mediaFreq.toFixed(1)}%`, sub: 'Média geral',  bg: '#ede9fe', text: '#4c1d95', iconColor: '#7c3aed', Icon: Activity },
                { label: 'Regulares',        value: regulares,                 sub: 'Freq. ≥ 85%',  bg: '#dcfce7', text: '#14532d', iconColor: '#16a34a', Icon: CheckCircle },
                { label: 'Situação Crítica', value: criticos,                  sub: 'Freq. < 75%',  bg: '#fee2e2', text: '#7f1d1d', iconColor: '#dc2626', Icon: AlertTriangle },
              ].map(c => (
                <div key={c.label} className="rounded-xl flex items-center justify-between px-5 py-4"
                  style={{ backgroundColor: c.bg }}>
                  <div>
                    <p className="text-xs font-semibold mb-1" style={{ color: c.text }}>{c.label}</p>
                    <p className="text-3xl font-bold mb-0.5" style={{ color: c.text }}>{c.value}</p>
                    <p className="text-xs" style={{ color: c.text, opacity: 0.7 }}>{c.sub}</p>
                  </div>
                  <c.Icon style={{ width: 32, height: 32, color: c.iconColor, opacity: 0.7 }} />
                </div>
              ))}
            </div>
          )}

          {periodoConsultado && (
            <p className="text-sm text-muted-foreground">
              Exibindo de <span className="font-semibold text-foreground">{formatarData(periodoConsultado.inicio)}</span>
              {' '}a{' '}
              <span className="font-semibold text-foreground">{formatarData(periodoConsultado.fim)}</span>
            </p>
          )}

          {/* Filtros */}
          <Card>
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-foreground text-base">Filtros de Busca</CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Buscar aluno</Label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input className="pl-9" placeholder="Nome do aluno" value={busca}
                      onChange={e => setBusca(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Série</Label>
                  <Select value={filtroSerie} onValueChange={setFiltroSerie}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      {seriesDisponiveis.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Situação</Label>
                  <Select value={filtroSituacao} onValueChange={setFiltroSituacao}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="atencao">Atenção</SelectItem>
                      <SelectItem value="critica">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Período — De</Label>
                  <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Período — Até</Label>
                  <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
                </div>
                <div className="flex items-end gap-2">
                  <Button variant="outline" className="flex-1" onClick={handleLimpar}>Limpar</Button>
                  <Button className="flex-1 gap-2" onClick={buscarFrequenciaAlunos} disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Buscar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {erro && (
            <div className="flex items-center gap-3 p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400">{erro}</p>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-7 h-7 animate-spin text-blue-600 mr-2" />
              <span className="text-muted-foreground">Carregando dados...</span>
            </div>
          )}

          {/* Lista alunos */}
          {alunosCarregados && !loading && (
            <div className="space-y-4">
              {alunosFiltrados.length === 0 ? (
                <Card className="border-dashed border-2">
                  <CardContent className="p-12 text-center">
                    <Search className="w-10 h-10 mx-auto text-muted-foreground opacity-30 mb-4" />
                    <p className="text-muted-foreground text-sm">Nenhum aluno encontrado.</p>
                    <Button variant="outline" onClick={handleLimpar} className="mt-4">Limpar Filtros</Button>
                  </CardContent>
                </Card>
              ) : alunosFiltrados.map(aluno => {
                const estilo = getSituacaoStyle(aluno.situacao);
                const circleColor = getCircleColor(aluno.percentualFrequencia);
                const circumference = 2 * Math.PI * 45;
                const offset = circumference * (1 - aluno.percentualFrequencia / 100);

                return (
                  <Card key={aluno.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="font-semibold text-foreground text-base">{aluno.nome}</h3>
                            <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border"
                              style={{ backgroundColor: estilo.bg, color: estilo.text, borderColor: estilo.border }}>
                              {getSituacaoTexto(aluno.situacao)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Série: <span className="font-medium text-foreground">{aluno.serie}</span>
                          </p>

                          {/* Estatísticas */}
                          <div className="flex flex-wrap gap-3 text-sm">
                            <span className="text-muted-foreground">
                              Total: <span className="font-semibold text-foreground">{aluno.totalAulas}</span>
                            </span>
                            <span className="text-muted-foreground">
                              Presenças: <span className="font-semibold text-green-600 dark:text-green-400">{aluno.presencas}</span>
                            </span>
                            <span className="text-muted-foreground">
                              Faltas: <span className="font-semibold text-red-600 dark:text-red-400">{aluno.faltas}</span>
                            </span>
                          </div>

                          {/* Badges de status especiais */}
                          <div className="flex flex-wrap gap-2">
                            {aluno.atrasados > 0 && (
                              <Badge className="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 border-0 gap-1">
                                <Clock className="w-3 h-3" />
                                {aluno.atrasados} atrasado(s) ({aluno.percentualAtrasado.toFixed(1)}%)
                              </Badge>
                            )}
                            {aluno.evadidos > 0 && (
                              <Badge className="bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200 border-0 gap-1">
                                <LogOut className="w-3 h-3" />
                                {aluno.evadidos} evasão(ões) ({aluno.percentualEvadido.toFixed(1)}%)
                              </Badge>
                            )}
                          </div>

                          {aluno.ultimasFaltas.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Últimas faltas: {aluno.ultimasFaltas.join(', ')}
                            </p>
                          )}

                          <Button variant="outline" size="sm" className="gap-2"
                            onClick={() => handleGerarPDF(aluno)}>
                            <FileText className="w-4 h-4" /> Gerar Relatório PDF
                          </Button>
                        </div>

                        {/* Gráfico circular */}
                        <div className="flex items-center justify-center flex-shrink-0">
                          <div className="relative w-24 h-24">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                              <circle strokeWidth="10" stroke="var(--border)" fill="transparent" r="45" cx="50" cy="50" />
                              <circle strokeWidth="10"
                                strokeDasharray={circumference} strokeDashoffset={offset}
                                strokeLinecap="round" fill="transparent" r="45" cx="50" cy="50"
                                style={{ stroke: circleColor, transition: 'stroke-dashoffset 0.5s' }} />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-lg font-bold" style={{ color: circleColor }}>
                                {aluno.percentualFrequencia.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ════════════════ ABA: CONTROLE DE PROFESSORES ════════════════ */}
      {abaAtiva === 'professores' && (
        <div className="space-y-6">

          {/* Seletor de data */}
          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Data para verificar</Label>
                  <Input type="date" value={dataProfessores}
                    onChange={e => setDataProfessores(e.target.value)}
                    className="w-48 bg-background border-border text-foreground" />
                </div>
                <Button onClick={buscarFrequenciaProfessores} disabled={loadingProf} className="gap-2">
                  {loadingProf
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Search className="w-4 h-4" />}
                  Verificar
                </Button>
                <div className="text-sm text-muted-foreground ml-auto">
                  {dataProfessores && (
                    <span className="font-medium text-foreground">
                      {getDiaSemanaISO(dataProfessores)},{' '}
                      {formatarData(dataProfessores)}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cards de resumo de professores */}
          {profCarregado && !loadingProf && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Total esperado',  value: totalProf,       bg: '#dbeafe', text: '#1e3a8a', Icon: Users },
                { label: 'Enviaram',        value: profEnviaram,    bg: '#dcfce7', text: '#14532d', Icon: CheckCircle },
                { label: 'Não enviaram',    value: profNaoEnviaram, bg: '#fee2e2', text: '#7f1d1d', Icon: AlertCircle },
              ].map(c => (
                <div key={c.label} className="rounded-xl flex items-center justify-between px-5 py-4"
                  style={{ backgroundColor: c.bg }}>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: c.text }}>{c.label}</p>
                    <p className="text-3xl font-bold mt-1" style={{ color: c.text }}>{c.value}</p>
                  </div>
                  <c.Icon style={{ width: 32, height: 32, color: c.text, opacity: 0.5 }} />
                </div>
              ))}
            </div>
          )}

          {erroProf && (
            <div className="flex items-center gap-3 p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400">{erroProf}</p>
            </div>
          )}

          {loadingProf && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-7 h-7 animate-spin text-blue-600 mr-2" />
              <span className="text-muted-foreground">Verificando envios...</span>
            </div>
          )}

          {/* Tabela de professores */}
          {profCarregado && !loadingProf && (
            <Card className="bg-card border-border">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-base text-foreground">
                  Professores com aula em {getDiaSemanaISO(dataProfessores)}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {registrosProfessores.length === 0 ? (
                  <div className="py-12 text-center">
                    <TrendingDown className="w-10 h-10 mx-auto text-muted-foreground opacity-30 mb-3" />
                    <p className="text-muted-foreground text-sm">
                      Nenhum professor encontrado para este dia.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Verifique se o horário escolar está cadastrado.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted border-b border-border">
                        <tr>
                          {['Professor', 'Disciplina', 'Série / Turma', 'Aulas do dia', 'Status', 'Registros'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {registrosProfessores.map((r, i) => (
                          <tr key={i}
                            className={`hover:bg-muted/50 transition-colors ${
                              !r.enviou ? 'border-l-2 border-l-red-400 dark:border-l-red-600' : ''
                            }`}>
                            <td className="px-4 py-3.5 text-sm font-medium text-foreground">
                              {r.professor_nome}
                            </td>
                            <td className="px-4 py-3.5 text-sm text-muted-foreground">
                              {r.disciplina_nome}
                            </td>
                            <td className="px-4 py-3.5 text-sm text-muted-foreground">
                              {r.serie}{r.turma !== '—' ? ` / ${r.turma}` : ''}
                            </td>
                            <td className="px-4 py-3.5 text-sm text-muted-foreground">
                              {r.ordens.length}ª aula{r.ordens.length > 1 ? 's' : ''}{' '}
                              <span className="text-xs text-muted-foreground/70">
                                (ordem: {r.ordens.sort().join(', ')})
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              {r.enviou ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200">
                                  <CheckCircle className="w-3 h-3" /> Enviou
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200">
                                  <AlertCircle className="w-3 h-3" /> Não enviou
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-sm text-muted-foreground">
                              {r.enviou
                                ? <span className="text-green-600 dark:text-green-400 font-medium">{r.qtd_enviada} registro(s)</span>
                                : <span className="text-red-500 font-medium">0 registros</span>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Legenda */}
          {profCarregado && !loadingProf && registrosProfessores.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border">
              <AlertCircle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>A verificação cruza o <strong>horário escolar cadastrado</strong> com os registros em <strong>frequência diária</strong>.</p>
                <p>Um professor aparece como "Não enviou" quando não há nenhum registro de aluno para sua disciplina nesta data.</p>
                <p>Se o horário não estiver cadastrado em <strong>Gestão de Horários</strong>, o professor não aparecerá aqui.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}