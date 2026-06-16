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
  Search, AlertTriangle, CheckCircle, FileText,
  Loader2, Users, Activity, ClipboardCheck, AlertCircle,
  Clock, LogOut, TrendingDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { SCHOOL_CONFIG } from '../config/school';

interface FrequenciaAlunosProps { onVoltar: () => void; }
type Situacao  = 'regular' | 'atencao' | 'critica';
type Aba       = 'alunos' | 'professores';
type StatusFreq = 'presente' | 'ausente' | 'atrasado' | 'evadido' | 'justificada' | 'notificado';

const STATUS_CONFIG: Record<StatusFreq, { label: string; cor: string; peso: number }> = {
  presente: { label: 'Presente', cor: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200',   peso: 1   },
  atrasado: { label: 'Atrasado', cor: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200', peso: 0.5 },
  evadido:  { label: 'Evadido',  cor: 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200', peso: 0   },
  ausente:  { label: 'Ausente',  cor: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200',             peso: 0   },
};

interface ResumoDisciplina {
  disciplina: string;
  totalAulas: number; presencas: number; faltas: number;
  atrasados: number; evadidos: number; justificadas: number;
  percentual: number; percentualAtrasado: number; percentualEvadido: number;
  situacao: Situacao;
}

interface AlunoFrequencia {
  id: string; nome: string; serie: string;
  totalAulas: number; presencas: number; faltas: number;
  atrasados: number; evadidos: number; justificadas: number;
  percentualFrequencia: number; percentualAtrasado: number; percentualEvadido: number;
  ultimasFaltas: string[];
  situacao: Situacao;
  resumoDisciplinas: ResumoDisciplina[];
}

interface RegistroProfessor {
  professor_id: string; professor_nome: string;
  disciplina_nome: string; serie: string; turma: string;
  ordens: number[]; enviou: boolean;
  qtd_enviada: number; qtd_esperada: number;
  aulas_lancadas: number;  // distinct numero_aula submetidos
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const ESCOLA_NOME     = SCHOOL_CONFIG.name;
const LOGO_PATH       = SCHOOL_CONFIG.logoUrl;
const SISTEMA_NOME    = 'Sistema SynerEduc';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getMesAtual() {
  const hoje  = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fim    = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  const fmt    = (d: Date) => d.toISOString().slice(0, 10);
  return { inicio: fmt(inicio), fim: fmt(fim) };
}

function formatarData(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR');
}

function getDiaSemanaISO(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][d.getDay()];
}

function calcularSituacao(pct: number): Situacao {
  return pct >= 85 ? 'regular' : pct >= 75 ? 'atencao' : 'critica';
}

function getSituacaoTexto(s: Situacao) {
  return s === 'regular' ? 'Regular' : s === 'atencao' ? 'Atenção' : 'Crítica';
}

function getSituacaoStyle(s: Situacao) {
  if (s === 'regular') return { bg: '#dcfce7', text: '#14532d', border: '#86efac' };
  if (s === 'atencao') return { bg: '#fef9c3', text: '#713f12', border: '#fde047' };
  return { bg: '#fee2e2', text: '#7f1d1d', border: '#fca5a5' };
}

function getCircleColor(pct: number) {
  return pct >= 85 ? '#16a34a' : pct >= 75 ? '#d97706' : '#dc2626';
}

/** Carrega imagem como base64 via canvas */
async function carregarBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width  = img.width; c.height = img.height;
      c.getContext('2d')!.drawImage(img, 0, 0);
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
}

/** Cria versão transparente para marca d'água */
async function criarWatermark(base64: string, opacidade: number): Promise<string> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width  = img.width; c.height = img.height;
      const ctx = c.getContext('2d')!;
      ctx.globalAlpha = opacidade;
      ctx.drawImage(img, 0, 0);
      resolve(c.toDataURL('image/png'));
    };
    img.src = base64;
  });
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function FrequenciaAlunosCoordenador({ onVoltar }: FrequenciaAlunosProps) {
  const { segmento } = useSegmento();
  const mesAtual     = getMesAtual();

  const [abaAtiva, setAbaAtiva] = useState<Aba>('alunos');

  // Aba Alunos
  const [seriesDisponiveis, setSeriesDisponiveis]   = useState<string[]>([]);
  const [filtroSerie, setFiltroSerie]               = useState('todas');
  const [filtroSituacao, setFiltroSituacao]         = useState('todas');
  const [busca, setBusca]                           = useState('');
  const [dataInicio, setDataInicio]                 = useState(mesAtual.inicio);
  const [dataFim, setDataFim]                       = useState(mesAtual.fim);
  const [periodoConsultado, setPeriodoConsultado]   = useState<{ inicio: string; fim: string } | null>(null);
  const [alunosCarregados, setAlunosCarregados]     = useState(false);
  const [alunosFiltrados, setAlunosFiltrados]       = useState<AlunoFrequencia[]>([]);
  const [loading, setLoading]                       = useState(false);
  const [erro, setErro]                             = useState<string | null>(null);

  // Aba Professores
  const [dataProfessores, setDataProfessores]               = useState(new Date().toISOString().slice(0, 10));
  const [registrosProfessores, setRegistrosProfessores]     = useState<RegistroProfessor[]>([]);
  const [loadingProf, setLoadingProf]                       = useState(false);
  const [erroProf, setErroProf]                             = useState<string | null>(null);
  const [profCarregado, setProfCarregado]                   = useState(false);
  const [filtroSerieProf, setFiltroSerieProf]               = useState('todas');
  const [filtroProfessor, setFiltroProfessor]               = useState('todos');

  // ─── Séries ────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function carregarSeries() {
      const { data } = await supabase
        .from('users').select('serie')
        .eq('tipo', 'aluno').eq('segmento', segmento).not('serie', 'is', null);
      const unicas = Array.from(new Set((data || []).map((s: any) => s.serie))).sort() as string[];
      setSeriesDisponiveis(unicas);
    }
    carregarSeries();
  }, [segmento]);

  // ─── Busca frequência dos alunos ───────────────────────────────────────────
  const buscarFrequenciaAlunos = async () => {
    if (!dataInicio || !dataFim)  { setErro('Selecione as datas.'); return; }
    if (dataInicio > dataFim)     { setErro('Data início deve ser anterior ao fim.'); return; }
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
        setPeriodoConsultado({ inicio: dataInicio, fim: dataFim }); return;
      }

      const alunoIds = usersData.map((a: any) => a.id);
      const mapaAlunos = new Map(usersData.map((a: any) => [a.id, a]));

      const { data: freqData, error: freqError } = await supabase
        .from('frequencia_diaria')
        .select('aluno_id, data_aula, presente, disciplina_id, status, numero_aula')
        .in('aluno_id', alunoIds)
        .gte('data_aula', dataInicio).lte('data_aula', dataFim)
        .order('data_aula').limit(50000);
      if (freqError) throw freqError;

      if (!freqData?.length) {
        setAlunosFiltrados([]); setAlunosCarregados(true);
        setPeriodoConsultado({ inicio: dataInicio, fim: dataFim }); return;
      }

      // Nomes de disciplinas
      const discIds = Array.from(new Set(freqData.map((r: any) => r.disciplina_id).filter(Boolean))) as string[];
      const nomeMap: Record<string, string> = {};
      if (discIds.length) {
        const { data: discData } = await supabase.from('disciplinas').select('id, nome').in('id', discIds);
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

        const mapa: Record<string, {
          totalAulas: number; presencas: number; faltas: number;
          atrasados: number; evadidos: number; justificadas: number; datas: string[];
        }> = {};

        for (const row of registros) {
          const key = row.disciplina_id ?? '__sem__';
          if (!mapa[key]) mapa[key] = { totalAulas: 0, presencas: 0, faltas: 0, atrasados: 0, evadidos: 0, justificadas: 0, datas: [] };
          mapa[key].totalAulas++;

          const st: StatusFreq = row.status ?? (row.presente ? 'presente' : 'ausente');
          if (st === 'presente')      mapa[key].presencas++;
          else if (st === 'atrasado') { mapa[key].atrasados++; mapa[key].presencas++; }
          else if (st === 'evadido')  { mapa[key].evadidos++; }
          else if (st === 'justificada') { mapa[key].faltas++; mapa[key].justificadas++; if (row.data_aula) mapa[key].datas.push(row.data_aula); }
          else if (st === 'notificado')  { mapa[key].faltas++; if (row.data_aula) mapa[key].datas.push(row.data_aula); }
          else                           { mapa[key].faltas++; if (row.data_aula) mapa[key].datas.push(row.data_aula); }
        }

        const resumoDisciplinas: ResumoDisciplina[] = Object.entries(mapa).map(([id, m]) => {
          const pct   = m.totalAulas > 0 ? (m.presencas / m.totalAulas) * 100 : 0;
          const pctAt = m.totalAulas > 0 ? (m.atrasados / m.totalAulas) * 100 : 0;
          const pctEv = m.totalAulas > 0 ? (m.evadidos  / m.totalAulas) * 100 : 0;
          return {
            disciplina:         id === '__sem__' ? 'Sem disciplina' : (nomeMap[id] || id),
            totalAulas:         m.totalAulas, presencas: m.presencas,
            faltas:             m.faltas, atrasados: m.atrasados, evadidos: m.evadidos, justificadas: m.justificadas,
            percentual:         Number(pct.toFixed(1)),
            percentualAtrasado: Number(pctAt.toFixed(1)),
            percentualEvadido:  Number(pctEv.toFixed(1)),
            situacao:           calcularSituacao(pct),
          };
        }).sort((a, b) => a.disciplina.localeCompare(b.disciplina));

        const totalAulas   = resumoDisciplinas.reduce((s, d) => s + d.totalAulas, 0);
        const presencas    = resumoDisciplinas.reduce((s, d) => s + d.presencas, 0);
        const faltas       = resumoDisciplinas.reduce((s, d) => s + d.faltas, 0);
        const atrasados    = resumoDisciplinas.reduce((s, d) => s + d.atrasados, 0);
        const evadidos     = resumoDisciplinas.reduce((s, d) => s + d.evadidos, 0);
        const justificadas = resumoDisciplinas.reduce((s, d) => s + d.justificadas, 0);
        const pct        = totalAulas > 0 ? (presencas / totalAulas) * 100 : 0;
        const ultimasFaltas = Object.values(mapa).flatMap(m => m.datas).sort().slice(-3).map(d => formatarData(d));

        resultado.push({
          id: aluno.id, nome: aluno.nome, serie: aluno.serie ?? 'Sem série',
          totalAulas, presencas, faltas, atrasados, evadidos, justificadas,
          percentualFrequencia:  pct,
          percentualAtrasado:    totalAulas > 0 ? (atrasados / totalAulas) * 100 : 0,
          percentualEvadido:     totalAulas > 0 ? (evadidos  / totalAulas) * 100 : 0,
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

  // ─── Controle de professores ───────────────────────────────────────────────
  const buscarFrequenciaProfessores = async () => {
    if (!dataProfessores) return;
    setLoadingProf(true); setErroProf(null);
    try {
      const diaSemana = getDiaSemanaISO(dataProfessores);

      // 1. Grade do dia via grade_horaria
      const { data: grade, error: gradeErr } = await supabase
        .from('grade_horaria')
        .select(`
          professor_id, disciplina_id, serie_id, ordem,
          professor:users!grade_horaria_professor_id_fkey(id, nome),
          disciplina:disciplinas(id, nome),
          series(id, nome)
        `)
        .eq('dia_semana', diaSemana)
        .eq('segmento', segmento);

      if (gradeErr) throw gradeErr;
      if (!grade?.length) { setRegistrosProfessores([]); setProfCarregado(true); return; }

      // 2. Agrupa por professor + disciplina + série (cada combo = uma linha)
      const grupos = new Map<string, {
        professor_id:    string;
        professor_nome:  string;
        disciplina_id:   string;
        disciplina_nome: string;
        serie_nome:      string;
        ordens:          number[];
      }>();

      (grade || []).forEach((row: any) => {
        const key = `${row.professor_id}__${row.disciplina_id}__${row.serie_id}`;
        if (!grupos.has(key)) {
          grupos.set(key, {
            professor_id:    row.professor_id,
            professor_nome:  row.professor?.nome ?? '—',
            disciplina_id:   row.disciplina_id,
            disciplina_nome: row.disciplina?.nome ?? '—',
            serie_nome:      row.series?.nome ?? '—',
            ordens:          [],
          });
        }
        grupos.get(key)!.ordens.push(row.ordem);
      });

      // 3. Busca alunos de todas as séries em um único request
      const seriesUnicas = [...new Set(Array.from(grupos.values()).map(g => g.serie_nome))];
      const { data: alunosData } = await supabase
        .from('users')
        .select('id, serie')
        .eq('tipo', 'aluno')
        .eq('segmento', segmento)
        .in('serie', seriesUnicas)
        .limit(2000);

      // Mapa aluno_id → serie_nome para cruzar freq com série
      const alunoToSerie = new Map<string, string>();
      (alunosData || []).forEach((a: any) => alunoToSerie.set(a.id, a.serie));

      const todosAlunoIds = (alunosData || []).map((a: any) => a.id);
      const discIds = [...new Set(Array.from(grupos.values()).map(g => g.disciplina_id))];

      // disciplina_id__serie_nome → Set<numero_aula> lançados neste dia
      const aulasLancadasMap = new Map<string, Set<number>>();

      if (todosAlunoIds.length > 0 && discIds.length > 0) {
        const { data: freqData } = await supabase
          .from('frequencia_diaria')
          .select('aluno_id, disciplina_id, numero_aula')
          .eq('data_aula', dataProfessores)
          .in('disciplina_id', discIds)
          .in('aluno_id', todosAlunoIds);

        (freqData || []).forEach((f: any) => {
          const serie = alunoToSerie.get(f.aluno_id);
          if (!serie || f.numero_aula == null) return;
          const key = `${f.disciplina_id}__${serie}`;
          if (!aulasLancadasMap.has(key)) aulasLancadasMap.set(key, new Set());
          aulasLancadasMap.get(key)!.add(f.numero_aula);
        });
      }

      // 4. Cruza grade com registros — cada numero_aula distinto = uma aula lançada
      const resultado: RegistroProfessor[] = Array.from(grupos.values()).map(g => {
        const mapKey      = `${g.disciplina_id}__${g.serie_nome}`;
        const aulasLanc   = aulasLancadasMap.get(mapKey)?.size ?? 0;
        const qtdEsperada = g.ordens.length;
        return {
          professor_id:    g.professor_id,
          professor_nome:  g.professor_nome,
          disciplina_nome: g.disciplina_nome,
          serie:           g.serie_nome,
          turma:           '—',
          ordens:          g.ordens,
          enviou:          aulasLanc >= qtdEsperada && qtdEsperada > 0,
          qtd_enviada:     aulasLanc,
          qtd_esperada:    qtdEsperada,
          aulas_lancadas:  aulasLanc,
        };
      });

      // Não enviou → Parcial → Completo
      resultado.sort((a, b) => {
        const stA = a.aulas_lancadas === 0 ? 0 : a.aulas_lancadas < a.qtd_esperada ? 1 : 2;
        const stB = b.aulas_lancadas === 0 ? 0 : b.aulas_lancadas < b.qtd_esperada ? 1 : 2;
        if (stA !== stB) return stA - stB;
        return a.professor_nome.localeCompare(b.professor_nome, 'pt-BR');
      });

      setRegistrosProfessores(resultado);
      setProfCarregado(true);
    } catch (e: any) {
      setErroProf('Erro ao carregar dados: ' + e.message);
    } finally { setLoadingProf(false); }
  };

  useEffect(() => {
    if (abaAtiva === 'professores') buscarFrequenciaProfessores();
  }, [abaAtiva, dataProfessores, segmento]);

  const handleLimpar = () => {
    setFiltroSerie('todas'); setFiltroSituacao('todas'); setBusca('');
    setDataInicio(mesAtual.inicio); setDataFim(mesAtual.fim);
    setAlunosFiltrados([]); setAlunosCarregados(false);
    setErro(null); setPeriodoConsultado(null);
  };

  // ─── PDF Individual — padronizado ─────────────────────────────────────────
  const handleGerarPDF = async (aluno: AlunoFrequencia) => {
    const toastId = toast.loading('Gerando PDF...');
    try {
      // Carrega logo e cria watermark
      let logoBase64    = '';
      let watermarkB64  = '';
      try {
        logoBase64   = await carregarBase64(LOGO_PATH);
        watermarkB64 = await criarWatermark(logoBase64, 0.05);
      } catch { /* continua sem logo */ }

      const pctGeral    = aluno.percentualFrequencia.toFixed(1);
      const periodoStr  = periodoConsultado
        ? `${formatarData(periodoConsultado.inicio)} a ${formatarData(periodoConsultado.fim)}`
        : '';
      const dataEmissao = new Date().toLocaleString('pt-BR');

      // Cor da situação no cabeçalho do aluno
      const estilo = getSituacaoStyle(aluno.situacao);

      // Linhas da tabela de disciplinas
      const linhasDisc = aluno.resumoDisciplinas.map((d, i) => {
        const bgRow   = i % 2 === 0 ? '#f8fafc' : '#ffffff';
        const corFreq = d.percentual >= 85 ? '#15803d' : d.percentual >= 75 ? '#b45309' : '#dc2626';
        return `
          <tr style="background:${bgRow}">
            <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;font-weight:500">${d.disciplina}</td>
            <td style="padding:7px;text-align:center;border-bottom:1px solid #e2e8f0">${d.totalAulas}</td>
            <td style="padding:7px;text-align:center;border-bottom:1px solid #e2e8f0;color:#15803d;font-weight:600">${d.presencas}</td>
            <td style="padding:7px;text-align:center;border-bottom:1px solid #e2e8f0;color:#b45309">${d.atrasados}</td>
            <td style="padding:7px;text-align:center;border-bottom:1px solid #e2e8f0;color:#ea580c">${d.evadidos}</td>
            <td style="padding:7px;text-align:center;border-bottom:1px solid #e2e8f0;color:#dc2626;font-weight:600">${d.faltas}</td>
            <td style="padding:7px;text-align:center;border-bottom:1px solid #e2e8f0;color:#2563eb;font-weight:600">${d.justificadas > 0 ? d.justificadas : '—'}</td>
            <td style="padding:7px;text-align:center;border-bottom:1px solid #e2e8f0;font-weight:700;color:${corFreq}">${d.percentual.toFixed(1)}%</td>
            <td style="padding:7px;text-align:center;border-bottom:1px solid #e2e8f0">
              <span style="padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600;
                background:${getSituacaoStyle(d.situacao).bg};color:${getSituacaoStyle(d.situacao).text}">
                ${getSituacaoTexto(d.situacao)}
              </span>
            </td>
          </tr>`;
      }).join('');

      const corFreqGeral = Number(pctGeral) >= 85 ? '#15803d' : Number(pctGeral) >= 75 ? '#b45309' : '#dc2626';

      const html = `<!DOCTYPE html>
<html lang="pt-BR"><head>
  <meta charset="UTF-8"/>
  <title>Frequência — ${aluno.nome}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:11px;color:#0f172a;background:#fff;padding:28px}
    @page{size:A4 portrait;margin:14mm}

    /* ── Marca d'água ── */
    .watermark{
      position:fixed;top:50%;left:50%;
      transform:translate(-50%,-50%);
      opacity:1;z-index:0;pointer-events:none;
    }
    .watermark img{width:360px;height:360px;object-fit:contain}
    .content{position:relative;z-index:1}

    .header{display:flex;align-items:center;gap:14px;border-bottom:3px solid #1d4ed8;padding-bottom:12px;margin-bottom:18px}
    .header img{width:58px;height:58px;object-fit:contain;border-radius:6px;flex-shrink:0}
    .header-text h1{font-size:17px;font-weight:800;color:#1d4ed8}
    .header-text h2{font-size:11px;color:#475569;margin-top:2px}
    .header-text p{font-size:10px;color:#64748b;margin-top:3px}

    .aluno-info{
      display:grid;grid-template-columns:1fr 1fr;gap:8px;
      background:#f0f4ff;border:1px solid #c7d7fd;border-radius:8px;
      padding:10px 14px;margin-bottom:16px;font-size:11px
    }
    .aluno-info .label{color:#64748b}
    .aluno-info strong{color:#0f172a}

    .status-bar{
      display:flex;align-items:center;gap:10px;
      padding:8px 14px;border-radius:8px;margin-bottom:16px;font-size:11px
    }

    table{width:100%;border-collapse:collapse;font-size:10px;margin-top:4px}
    thead tr{background:#1d4ed8}
    thead th{color:#fff;padding:8px 10px;text-align:left;font-weight:700}
    thead th:not(:first-child){text-align:center}
    tfoot tr{background:#1e3a8a}
    tfoot td{color:#fff;font-weight:700;padding:8px 10px;text-align:left}
    tfoot td:not(:first-child){text-align:center}

    .legenda{margin-top:14px;font-size:9px;color:#475569;display:flex;gap:20px;flex-wrap:wrap;border-top:1px solid #e2e8f0;padding-top:10px}
    .legenda-item{display:flex;align-items:center;gap:5px}
    .legenda-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}

    .assinatura{margin-top:40px;text-align:center}
    .assinatura .linha{display:inline-block;border-top:1px solid #334155;padding-top:6px;width:240px;font-size:10px;color:#475569;font-weight:600}

    .rodape{margin-top:24px;text-align:center;font-size:9px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px}
  </style>
</head>
<body>
  ${watermarkB64 ? `<div class="watermark"><img src="${watermarkB64}" alt=""/></div>` : ''}

  <div class="content">
    <!-- Header -->
    <div class="header">
      ${logoBase64 ? `<img src="${logoBase64}" alt="Logo"/>` : '<div style="width:58px;height:58px;background:#1d4ed8;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:20px;flex-shrink:0">CM</div>'}
      <div class="header-text">
        <h1>${ESCOLA_NOME}</h1>
        <h2>Relatório de Frequência Individual</h2>
        ${periodoStr ? `<p>Período: ${periodoStr}</p>` : ''}
      </div>
    </div>

    <!-- Info do aluno -->
    <div class="aluno-info">
      <div><span class="label">Aluno: </span><strong>${aluno.nome}</strong></div>
      <div><span class="label">Série: </span><strong>${aluno.serie}</strong></div>
      <div><span class="label">Total de Aulas: </span><strong>${aluno.totalAulas}</strong></div>
      <div><span class="label">Presenças: </span><strong style="color:#15803d">${aluno.presencas}</strong>
           &nbsp;|&nbsp;<span class="label">Faltas: </span><strong style="color:#dc2626">${aluno.faltas}</strong>
           ${aluno.justificadas > 0 ? `&nbsp;|&nbsp;<span class="label">Justificadas: </span><strong style="color:#2563eb">${aluno.justificadas}</strong>` : ''}</div>
      ${aluno.atrasados > 0 ? `<div><span class="label">Atrasados: </span><strong style="color:#b45309">${aluno.atrasados} (${aluno.percentualAtrasado.toFixed(1)}%)</strong></div>` : '<div></div>'}
      ${aluno.evadidos > 0  ? `<div><span class="label">Evadidos: </span><strong style="color:#ea580c">${aluno.evadidos} (${aluno.percentualEvadido.toFixed(1)}%)</strong></div>` : '<div></div>'}
    </div>

    <!-- Barra de situação -->
    <div class="status-bar" style="background:${estilo.bg};border:1px solid ${estilo.border}">
      <div style="font-size:22px;font-weight:800;color:${corFreqGeral}">${pctGeral}%</div>
      <div>
        <div style="font-weight:700;color:${estilo.text};font-size:12px">Frequência Geral — ${getSituacaoTexto(aluno.situacao)}</div>
        <div style="font-size:9px;color:${estilo.text};opacity:0.75;margin-top:2px">
          Regular ≥ 85% &nbsp;|&nbsp; Atenção 75–84% &nbsp;|&nbsp; Crítica &lt; 75%
        </div>
      </div>
    </div>

    <!-- Tabela por disciplina -->
    <table>
      <thead>
        <tr>
          <th>Disciplina</th>
          <th>Aulas</th>
          <th>Presenças</th>
          <th>Atrasados</th>
          <th>Evadidos</th>
          <th>Faltas</th>
          <th>Justif.</th>
          <th>Freq.%</th>
          <th>Situação</th>
        </tr>
      </thead>
      <tbody>${linhasDisc}</tbody>
      <tfoot>
        <tr>
          <td>TOTAL GERAL</td>
          <td style="text-align:center">${aluno.totalAulas}</td>
          <td style="text-align:center">${aluno.presencas}</td>
          <td style="text-align:center">${aluno.atrasados}</td>
          <td style="text-align:center">${aluno.evadidos}</td>
          <td style="text-align:center">${aluno.faltas}</td>
          <td style="text-align:center">${aluno.justificadas > 0 ? aluno.justificadas : '—'}</td>
          <td style="text-align:center">${pctGeral}%</td>
          <td style="text-align:center">${getSituacaoTexto(aluno.situacao)}</td>
        </tr>
      </tfoot>
    </table>

    <!-- Legenda -->
    <div class="legenda">
      <div class="legenda-item"><div class="legenda-dot" style="background:#15803d"></div>Presente: conta como presença</div>
      <div class="legenda-item"><div class="legenda-dot" style="background:#b45309"></div>Atrasado: conta como presença parcial</div>
      <div class="legenda-item"><div class="legenda-dot" style="background:#ea580c"></div>Evadido: saiu antes do fim (não conta)</div>
      <div class="legenda-item"><div class="legenda-dot" style="background:#dc2626"></div>Ausente: falta</div>
      <div class="legenda-item"><div class="legenda-dot" style="background:#2563eb"></div>Justificada: falta com justificativa registrada (ainda conta para o percentual)</div>
    </div>

    <!-- Assinatura -->
    <div class="assinatura">
      <div class="linha">Coordenador(a) Pedagógico(a)</div>
    </div>

    <!-- Rodapé -->
    <div class="rodape">
      Gerado em ${dataEmissao} — ${SISTEMA_NOME} · ${ESCOLA_NOME}
    </div>
  </div>
</body></html>`;

      toast.dismiss(toastId);
      const janela = window.open('', '_blank', 'width=900,height=700');
      if (janela) {
        janela.document.write(html);
        janela.document.close();
        setTimeout(() => { janela.print(); }, 600);
        toast.success('PDF gerado!');
      }
    } catch {
      toast.dismiss(toastId);
      toast.error('Erro ao gerar PDF.');
    }
  };

  // ─── Stats ────────────────────────────────────────────────────────────────
  const totalAlunos = alunosFiltrados.length;
  const mediaFreq   = totalAlunos > 0 ? alunosFiltrados.reduce((a, b) => a + b.percentualFrequencia, 0) / totalAlunos : 0;
  const regulares   = alunosFiltrados.filter(a => a.situacao === 'regular').length;
  const criticos    = alunosFiltrados.filter(a => a.situacao === 'critica').length;

  // Filtros — aba professores (client-side)
  const seriesProf      = ['todas', ...Array.from(new Set(registrosProfessores.map(r => r.serie).filter(Boolean))).sort()];
  const professoresProf = ['todos', ...Array.from(new Set(registrosProfessores.map(r => r.professor_nome).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR'))];

  const registrosProfFiltrados = registrosProfessores
    .filter(r => filtroSerieProf  === 'todas' || r.serie          === filtroSerieProf)
    .filter(r => filtroProfessor  === 'todos' || r.professor_nome === filtroProfessor);

  const profCompletos   = registrosProfFiltrados.filter(r => r.aulas_lancadas >= r.qtd_esperada && r.qtd_esperada > 0).length;
  const profParciais    = registrosProfFiltrados.filter(r => r.aulas_lancadas > 0 && r.aulas_lancadas < r.qtd_esperada).length;
  const profNaoEnviaram = registrosProfFiltrados.filter(r => r.aulas_lancadas === 0).length;
  const totalProf       = registrosProfFiltrados.length;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Abas */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        {([
          { id: 'alunos'      as Aba, label: 'Frequência de Alunos', icon: <Users className="w-4 h-4" /> },
          { id: 'professores' as Aba, label: 'Controle de Envio',    icon: <ClipboardCheck className="w-4 h-4" /> },
        ]).map(aba => (
          <button key={aba.id} onClick={() => setAbaAtiva(aba.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              abaAtiva === aba.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}>
            {aba.icon} {aba.label}
            {aba.id === 'professores' && (profNaoEnviaram + profParciais) > 0 && profCarregado && (
              <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                {profNaoEnviaram + profParciais}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══ ABA ALUNOS ══ */}
      {abaAtiva === 'alunos' && (
        <>
          {alunosCarregados && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Total de Alunos',  value: totalAlunos,               sub: 'Com registros', bg: '#dbeafe', text: '#1e3a8a', iconColor: '#3b82f6', Icon: Users },
                { label: 'Freq. Média',      value: `${mediaFreq.toFixed(1)}%`, sub: 'Média geral',  bg: '#ede9fe', text: '#4c1d95', iconColor: '#7c3aed', Icon: Activity },
                { label: 'Regulares',        value: regulares,                 sub: 'Freq. ≥ 85%',  bg: '#dcfce7', text: '#14532d', iconColor: '#16a34a', Icon: CheckCircle },
                { label: 'Situação Crítica', value: criticos,                  sub: 'Freq. < 75%',  bg: '#fee2e2', text: '#7f1d1d', iconColor: '#dc2626', Icon: AlertTriangle },
              ].map(c => (
                <div key={c.label} className="rounded-xl flex items-center justify-between px-5 py-4" style={{ backgroundColor: c.bg }}>
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
                    <Input className="pl-9" placeholder="Nome do aluno" value={busca} onChange={e => setBusca(e.target.value)} />
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
                const estilo       = getSituacaoStyle(aluno.situacao);
                const circleColor  = getCircleColor(aluno.percentualFrequencia);
                const circumference = 2 * Math.PI * 45;
                const offset       = circumference * (1 - aluno.percentualFrequencia / 100);

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
                          <div className="flex flex-wrap gap-3 text-sm">
                            <span className="text-muted-foreground">Total: <span className="font-semibold text-foreground">{aluno.totalAulas}</span></span>
                            <span className="text-muted-foreground">Presenças: <span className="font-semibold text-green-600 dark:text-green-400">{aluno.presencas}</span></span>
                            <span className="text-muted-foreground">Faltas: <span className="font-semibold text-red-600 dark:text-red-400">{aluno.faltas}</span></span>
                            {aluno.justificadas > 0 && (
                              <span className="text-muted-foreground">Justificadas: <span className="font-semibold text-blue-600 dark:text-blue-400">{aluno.justificadas}</span></span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {aluno.atrasados > 0 && (
                              <Badge className="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 border-0 gap-1">
                                <Clock className="w-3 h-3" />{aluno.atrasados} atrasado(s) ({aluno.percentualAtrasado.toFixed(1)}%)
                              </Badge>
                            )}
                            {aluno.evadidos > 0 && (
                              <Badge className="bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200 border-0 gap-1">
                                <LogOut className="w-3 h-3" />{aluno.evadidos} evasão(ões) ({aluno.percentualEvadido.toFixed(1)}%)
                              </Badge>
                            )}
                          </div>
                          {aluno.ultimasFaltas.length > 0 && (
                            <p className="text-xs text-muted-foreground">Últimas faltas: {aluno.ultimasFaltas.join(', ')}</p>
                          )}
                          <Button variant="outline" size="sm" className="gap-2" onClick={() => handleGerarPDF(aluno)}>
                            <FileText className="w-4 h-4" /> Gerar Relatório PDF
                          </Button>
                        </div>
                        <div className="flex items-center justify-center flex-shrink-0">
                          <div className="relative w-24 h-24">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                              <circle strokeWidth="10" stroke="var(--border)" fill="transparent" r="45" cx="50" cy="50" />
                              <circle strokeWidth="10" strokeDasharray={circumference} strokeDashoffset={offset}
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

      {/* ══ ABA PROFESSORES ══ */}
      {abaAtiva === 'professores' && (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-5">
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Data para verificar</Label>
                  <Input type="date" value={dataProfessores}
                    onChange={e => { setDataProfessores(e.target.value); setFiltroSerieProf('todas'); setFiltroProfessor('todos'); }}
                    className="w-48" />
                </div>
                {profCarregado && seriesProf.length > 1 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Série</Label>
                    <Select value={filtroSerieProf} onValueChange={v => { setFiltroSerieProf(v); setFiltroProfessor('todos'); }}>
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {seriesProf.map(s => (
                          <SelectItem key={s} value={s}>{s === 'todas' ? 'Todas as séries' : s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {profCarregado && professoresProf.length > 1 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Professor</Label>
                    <Select value={filtroProfessor} onValueChange={setFiltroProfessor}>
                      <SelectTrigger className="w-56">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {professoresProf.map(p => (
                          <SelectItem key={p} value={p}>{p === 'todos' ? 'Todos os professores' : p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button onClick={buscarFrequenciaProfessores} disabled={loadingProf} className="gap-2">
                  {loadingProf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Verificar
                </Button>
                <div className="text-sm text-muted-foreground ml-auto">
                  {dataProfessores && (
                    <span className="font-medium text-foreground">
                      {getDiaSemanaISO(dataProfessores)}, {formatarData(dataProfessores)}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {profCarregado && !loadingProf && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total esperado', value: totalProf,       bg: '#dbeafe', text: '#1e3a8a', Icon: Users },
                { label: 'Completo',       value: profCompletos,   bg: '#dcfce7', text: '#14532d', Icon: CheckCircle },
                { label: 'Parcial',        value: profParciais,    bg: '#fef9c3', text: '#713f12', Icon: AlertTriangle },
                { label: 'Não enviou',     value: profNaoEnviaram, bg: '#fee2e2', text: '#7f1d1d', Icon: AlertCircle },
              ].map(c => (
                <div key={c.label} className="rounded-xl flex items-center justify-between px-5 py-4" style={{ backgroundColor: c.bg }}>
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

          {profCarregado && !loadingProf && (
            <Card>
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-base text-foreground">
                  Professores com aula em {getDiaSemanaISO(dataProfessores)}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {registrosProfFiltrados.length === 0 ? (
                  <div className="py-12 text-center">
                    <TrendingDown className="w-10 h-10 mx-auto text-muted-foreground opacity-30 mb-3" />
                    <p className="text-muted-foreground text-sm">
                      {registrosProfessores.length === 0
                        ? 'Nenhum professor encontrado para este dia.'
                        : `Nenhum professor na série "${filtroSerieProf}".`}
                    </p>
                    {registrosProfessores.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-1">Configure a grade em Agenda dos Professores → Configurar Grade.</p>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted border-b border-border">
                        <tr>
                          {['Professor','Disciplina','Série / Turma','Aulas do dia','Status','Registros'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {registrosProfFiltrados.map((r, i) => {
                          const parcial = r.aulas_lancadas > 0 && r.aulas_lancadas < r.qtd_esperada;
                          const completo = r.aulas_lancadas >= r.qtd_esperada && r.qtd_esperada > 0;
                          const borderClass = completo ? '' : parcial
                            ? 'border-l-2 border-l-yellow-400 dark:border-l-yellow-500'
                            : 'border-l-2 border-l-red-400 dark:border-l-red-600';
                          return (
                          <tr key={i} className={`hover:bg-muted/50 transition-colors ${borderClass}`}>
                            <td className="px-4 py-3.5 text-sm font-medium text-foreground">{r.professor_nome}</td>
                            <td className="px-4 py-3.5 text-sm text-muted-foreground">{r.disciplina_nome}</td>
                            <td className="px-4 py-3.5 text-sm text-muted-foreground">{r.serie}{r.turma !== '—' ? ` / ${r.turma}` : ''}</td>
                            <td className="px-4 py-3.5 text-sm text-muted-foreground">
                              {r.ordens.length} aula{r.ordens.length > 1 ? 's' : ''}{' '}
                              <span className="text-xs text-muted-foreground/70">(ordem: {[...r.ordens].sort((a, b) => a - b).join(', ')})</span>
                            </td>
                            <td className="px-4 py-3.5">
                              {completo ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200">
                                  <CheckCircle className="w-3 h-3" /> Completo
                                </span>
                              ) : parcial ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200">
                                  <AlertTriangle className="w-3 h-3" /> Parcial
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200">
                                  <AlertCircle className="w-3 h-3" /> Não enviou
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-sm">
                              <span className={`font-medium ${completo ? 'text-green-600 dark:text-green-400' : parcial ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-500'}`}>
                                {r.aulas_lancadas} de {r.qtd_esperada} aula{r.qtd_esperada !== 1 ? 's' : ''} lançada{r.qtd_esperada !== 1 ? 's' : ''}
                              </span>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {profCarregado && !loadingProf && registrosProfessores.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border">
              <AlertCircle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>A verificação cruza a <strong>grade horária configurada</strong> com os registros em <strong>frequência diária</strong>.</p>
                <p>Um professor aparece como "Não enviou" quando não há nenhum registro de aluno para sua disciplina nesta data.</p>
                <p>Se o professor não estiver na grade, configure em <strong>Agenda dos Professores → Configurar Grade</strong>.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}