// src/components/BoletinsGerais.tsx
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useSegmento } from '../hooks/useSegmento';

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';

import {
  Search, Filter, ChevronDown, ChevronUp, Edit, Save,
  Loader2, AlertCircle, BookOpen, GraduationCap,
} from 'lucide-react';

import { toast } from 'sonner';

interface BoletinsGeraisProps { onVoltar: () => void; }

interface Aluno { id: string; nome: string; email: string; serie: string; }
interface Disciplina { id: string; nome: string; }
interface Nota {
  id: string; user_id: string; disciplina_id: string; bimestre: number;
  av1: number | null; av2: number | null; av3: number | null; recuperacao: number | null;
  media: number | null; media_final: number | null;
  frequencia: number | null; faltas: number | null; status_final: string | null;
  disciplina: Disciplina | null;
}
interface NotaDisciplinaView {
  disciplinaId: string; disciplinaNome: string;
  av1: number | null; av2: number | null; av3: number | null; rec: number | null;
}
interface BoletimAlunoView {
  id: string; alunoId: string; nomeAluno: string; email: string; serie: string;
  bimestreNumero: number; bimestreLabel: string; notas: NotaDisciplinaView[];
}
interface NotaEmEdicao {
  alunoId: string; disciplinaId: string; disciplinaNome: string;
  bimestre: number; nomeAluno: string;
  av1: number | null; av2: number | null; av3: number | null; rec: number | null;
  notaRegistroId: string | null;
}

export default function BoletinsGerais({ onVoltar }: BoletinsGeraisProps) {
  const { segmento, isPresencial } = useSegmento();

  const [carregando, setCarregando]         = useState(false);
  const [erro, setErro]                     = useState<string | null>(null);
  const [series, setSeries]                 = useState<string[]>([]);
  const [filtroSerie, setFiltroSerie]       = useState('todas');
  const [filtroBimestre, setFiltroBimestre] = useState('todos');
  const [busca, setBusca]                   = useState('');
  const [filtrosAplicados, setFiltrosAplicados] = useState(false);
  const [alunos, setAlunos]                 = useState<Aluno[]>([]);
  const [notas, setNotas]                   = useState<Nota[]>([]);
  const [disciplinasPorSerie, setDisciplinasPorSerie] = useState<Record<string, Disciplina[]>>({});
  const [alunosExpandidos, setAlunosExpandidos] = useState<Set<string>>(new Set());
  const [notaEmEdicao, setNotaEmEdicao]     = useState<NotaEmEdicao | null>(null);
  const [salvandoNota, setSalvandoNota]     = useState(false);

  // ─── Carregar séries do segmento ─────────────────────────────────────────
  useEffect(() => {
    async function carregarSeries() {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('serie')
          .eq('tipo', 'aluno')
          .eq('status', 'ativo')
          .eq('segmento', segmento)
          .not('serie', 'is', null);
        if (error) throw error;
        setSeries(Array.from(new Set((data || []).map((d: any) => d.serie as string))).sort());
      } catch { toast.error('Erro ao carregar séries'); }
    }
    carregarSeries();
  }, [segmento]);

  // ─── Cálculo de média — regras por segmento ───────────────────────────────
  /**
   * EAD:
   *   Média = (AV1 + AV2) / 2
   *   REC substitui a menor nota entre AV1/AV2 se REC > menor → recalcula
   *
   * Presencial:
   *   Média = (AV1 + AV2 + AV3) / 3
   *   REC substitui a média diretamente se REC > média
   */
  const calcularMedia = (nota: {
    av1: number | null; av2: number | null;
    av3: number | null; rec: number | null;
  }): number => {
    if (isPresencial) {
      const av1 = nota.av1 ?? 0;
      const av2 = nota.av2 ?? 0;
      const av3 = nota.av3 ?? 0;
      const media = (av1 + av2 + av3) / 3;
      // REC substitui a média diretamente
      if (nota.rec !== null && nota.rec > media) {
        return Math.round(nota.rec * 100) / 100;
      }
      return Math.round(media * 100) / 100;
    } else {
      const av1 = nota.av1 ?? 0;
      const av2 = nota.av2 ?? 0;
      // REC substitui a menor nota entre AV1/AV2
      if (nota.rec !== null) {
        const menor = Math.min(av1, av2);
        if (nota.rec > menor) {
          const maior = Math.max(av1, av2);
          return Math.round(((maior + nota.rec) / 2) * 100) / 100;
        }
      }
      return Math.round(((av1 + av2) / 2) * 100) / 100;
    }
  };

  /**
   * Situação do bimestre.
   * Presencial: exige AV3 para não ser Pendente.
   * Aprovação: média >= 7.0 (igual para ambos os segmentos).
   */
  const calcularSituacao = (nota: NotaDisciplinaView): 'Aprovado' | 'Recuperação' | 'Pendente' => {
    if (nota.av1 === null && nota.av2 === null) return 'Pendente';
    if (isPresencial && nota.av3 === null) return 'Pendente';
    return calcularMedia(nota) >= 7 ? 'Aprovado' : 'Recuperação';
  };

  // ─── Aplicar filtros ──────────────────────────────────────────────────────
  async function aplicarFiltros() {
    setCarregando(true); setErro(null); setFiltrosAplicados(true); setAlunosExpandidos(new Set());
    try {
      let queryAlunos = supabase
        .from('users')
        .select('id, nome, email, serie')
        .eq('tipo', 'aluno')
        .eq('status', 'ativo')
        .eq('segmento', segmento)
        .order('nome');
      if (filtroSerie !== 'todas') queryAlunos = queryAlunos.eq('serie', filtroSerie);
      const { data: alunosData, error: alunosError } = await queryAlunos;
      if (alunosError) throw alunosError;

      const alunosFiltrados = (alunosData || []).filter((a: any) => {
        if (!busca.trim()) return true;
        const t = busca.toLowerCase();
        return a.nome.toLowerCase().includes(t) || (a.email ?? '').toLowerCase().includes(t);
      });
      setAlunos(alunosFiltrados);

      if (!alunosFiltrados.length) { setNotas([]); setDisciplinasPorSerie({}); return; }

      const seriesNomes = Array.from(new Set(alunosFiltrados.map((a: any) => a.serie))).filter(Boolean) as string[];
      const { data: seriesData, error: seriesError } = await supabase.from('series').select('id, nome').in('nome', seriesNomes);
      if (seriesError) throw seriesError;

      const serieIdToNome: Record<string, string> = {};
      const seriesIds = (seriesData || []).map((s: any) => { serieIdToNome[s.id] = s.nome; return s.id; });

      const { data: relacoesData, error: relacoesError } = await supabase
        .from('professores_disciplinas_series')
        .select('serie_id, disciplinas(id, nome)')
        .in('serie_id', seriesIds);
      if (relacoesError) throw relacoesError;

      const discPorSerieMap: Record<string, Map<string, Disciplina>> = {};
      (relacoesData || []).forEach((rel: any) => {
        const serieNome = serieIdToNome[rel.serie_id];
        const disc = rel.disciplinas;
        if (serieNome && disc) {
          if (!discPorSerieMap[serieNome]) discPorSerieMap[serieNome] = new Map();
          if (!discPorSerieMap[serieNome].has(disc.nome))
            discPorSerieMap[serieNome].set(disc.nome, { id: disc.id, nome: disc.nome });
        }
      });

      const discPorSerieFinal: Record<string, Disciplina[]> = {};
      Object.keys(discPorSerieMap).forEach(serieNome => {
        discPorSerieFinal[serieNome] = Array.from(discPorSerieMap[serieNome].values())
          .sort((a, b) => a.nome.localeCompare(b.nome));
      });
      setDisciplinasPorSerie(discPorSerieFinal);

      const ids = alunosFiltrados.map((a: any) => a.id);

      // Busca notas sem join (igual ao BoletimProfessor) para evitar problemas de FK/RLS
      let queryNotas = supabase.from('notas').select(
        'id, user_id, disciplina_id, bimestre, av1, av2, av3, recuperacao, media, media_final, frequencia, faltas, status_final'
      ).in('user_id', ids);
      if (filtroBimestre !== 'todos') queryNotas = queryNotas.eq('bimestre', parseInt(filtroBimestre));
      const { data: notasData, error: notasError } = await queryNotas;
      if (notasError) throw notasError;

      // Busca nomes das disciplinas separadamente
      const disciplinaIds = Array.from(new Set((notasData || []).map((n: any) => n.disciplina_id).filter(Boolean)));
      const discNomeMap: Record<string, string> = {};
      if (disciplinaIds.length > 0) {
        const { data: discData } = await supabase.from('disciplinas').select('id, nome').in('id', disciplinaIds);
        (discData || []).forEach((d: any) => { discNomeMap[d.id] = d.nome; });
      }

      setNotas((notasData || []).map((n: any) => ({
        ...n,
        av3: n.av3 ?? null,
        disciplina: n.disciplina_id && discNomeMap[n.disciplina_id]
          ? { id: n.disciplina_id, nome: discNomeMap[n.disciplina_id] }
          : null,
      })));
    } catch (err: any) {
      setErro(err.message || 'Erro ao carregar boletins');
      toast.error('Erro ao carregar boletins');
    } finally { setCarregando(false); }
  }

  // ─── Montar boletins ──────────────────────────────────────────────────────
  const boletins: BoletimAlunoView[] = useMemo(() => {
    if (!alunos.length) return [];
    const map = new Map<string, BoletimAlunoView>();

    for (const aluno of alunos) {
      if (filtroBimestre === 'todos') {
        const key = `${aluno.id}-0`;
        if (!map.has(key)) {
          // Agrega notas de todos os bimestres num único boletim
          const notasAluno = notas.filter(n => n.user_id === aluno.id);
          const discMap = new Map<string, NotaDisciplinaView>();
          for (const n of notasAluno) {
            if (!n.disciplina) continue;
            const existing = discMap.get(n.disciplina_id);
            if (!existing) {
              discMap.set(n.disciplina_id, {
                disciplinaId: n.disciplina.id, disciplinaNome: n.disciplina.nome,
                av1: n.av1, av2: n.av2, av3: n.av3, rec: n.recuperacao,
              });
            }
          }
          map.set(key, {
            id: key, alunoId: aluno.id, nomeAluno: aluno.nome, email: aluno.email,
            serie: aluno.serie, bimestreNumero: 0, bimestreLabel: 'Todos os bimestres',
            notas: Array.from(discMap.values()),
          });
        }
        continue;
      }

      const bimestreNumero = parseInt(filtroBimestre);
      const key = `${aluno.id}-${bimestreNumero}`;
      const boletim: BoletimAlunoView = {
        id: key, alunoId: aluno.id, nomeAluno: aluno.nome, email: aluno.email,
        serie: aluno.serie, bimestreNumero, bimestreLabel: `${bimestreNumero}º Bimestre`, notas: [],
      };
      map.set(key, boletim);

      const notasAluno = notas.filter(n => n.user_id === aluno.id && n.bimestre === bimestreNumero);
      const notasPorId   = new Map<string, Nota>();
      const notasPorNome = new Map<string, Nota>();
      notasAluno.forEach(n => {
        if (n.disciplina_id) notasPorId.set(n.disciplina_id, n);
        if (n.disciplina?.nome) notasPorNome.set(n.disciplina.nome.toLowerCase().trim(), n);
      });

      const disciplinasDaSerie = disciplinasPorSerie[aluno.serie] || [];
      if (disciplinasDaSerie.length > 0) {
        for (const disciplina of disciplinasDaSerie) {
          // tenta por ID primeiro, cai no nome como fallback
          const n = notasPorId.get(disciplina.id)
                 ?? notasPorNome.get(disciplina.nome.toLowerCase().trim());
          boletim.notas.push({
            disciplinaId: disciplina.id, disciplinaNome: disciplina.nome,
            av1: n?.av1 ?? null, av2: n?.av2 ?? null,
            av3: n?.av3 ?? null, rec: n?.recuperacao ?? null,
          });
        }
      } else {
        for (const n of notasAluno) {
          if (n.disciplina) boletim.notas.push({
            disciplinaId: n.disciplina.id, disciplinaNome: n.disciplina.nome,
            av1: n.av1, av2: n.av2, av3: n.av3, rec: n.recuperacao,
          });
        }
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      a.nomeAluno.localeCompare(b.nomeAluno, 'pt-BR', { sensitivity: 'base' })
    );
  }, [alunos, notas, filtroBimestre, disciplinasPorSerie]);

  // ─── Helpers visuais ──────────────────────────────────────────────────────
  const getSituacaoStyle = (situacao: string) => {
    if (situacao === 'Aprovado')    return { bg: '#dcfce7', text: '#14532d', border: '#86efac' };
    if (situacao === 'Recuperação') return { bg: '#fef9c3', text: '#713f12', border: '#fde047' };
    return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
  };

  const getMediaColor = (media: number, situacao: string) => {
    if (situacao === 'Pendente') return 'text-muted-foreground';
    if (media >= 7) return 'text-green-600 dark:text-green-400';
    if (media >= 5) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const toggleAluno = (id: string) => setAlunosExpandidos(prev => {
    const novo = new Set(prev);
    novo.has(id) ? novo.delete(id) : novo.add(id);
    return novo;
  });

  // ─── Edição de nota ───────────────────────────────────────────────────────
  function abrirEdicaoNota(boletim: BoletimAlunoView, nota: NotaDisciplinaView) {
    const registro = notas.find(n =>
      n.user_id === boletim.alunoId &&
      n.disciplina_id === nota.disciplinaId &&
      n.bimestre === boletim.bimestreNumero
    );
    setNotaEmEdicao({
      alunoId: boletim.alunoId, disciplinaId: nota.disciplinaId,
      disciplinaNome: nota.disciplinaNome, bimestre: boletim.bimestreNumero,
      nomeAluno: boletim.nomeAluno,
      av1: nota.av1, av2: nota.av2, av3: nota.av3, rec: nota.rec,
      notaRegistroId: registro?.id ?? null,
    });
  }

  function handleChangeNota(campo: 'av1' | 'av2' | 'av3' | 'rec', valor: string) {
    if (!notaEmEdicao) return;
    const num = valor === '' ? null : Number(valor);
    if (num !== null && (isNaN(num) || num < 0 || num > 10)) return;
    setNotaEmEdicao(prev => prev ? { ...prev, [campo]: num } : prev);
  }

  async function salvarNota() {
    if (!notaEmEdicao) return;
    setSalvandoNota(true);
    try {
      const { alunoId, disciplinaId, bimestre, av1, av2, av3, rec, notaRegistroId } = notaEmEdicao;

      const mediaCalculada = calcularMedia({ av1, av2, av3, rec });

      const payload: any = {
        user_id:       alunoId,
        disciplina_id: disciplinaId,
        bimestre,
        av1,
        av2,
        av3:           isPresencial ? (av3 ?? null) : null,
        recuperacao:   rec,
        media:         mediaCalculada,
        media_final:   mediaCalculada,
      };

      const resp = notaRegistroId
        ? await supabase.from('notas').update(payload).eq('id', notaRegistroId).select()
        : await supabase.from('notas').insert(payload).select();

      if (resp.error) throw resp.error;

      const nova = resp.data?.[0] as any;

      // Se RLS bloqueou o retorno da linha, atualiza o estado com os dados locais
      setNotas(prev => {
        const anterior = prev.find(n =>
          n.user_id === alunoId && n.disciplina_id === disciplinaId && n.bimestre === bimestre
        );
        return [
          ...prev.filter(n => !(n.user_id === alunoId && n.disciplina_id === disciplinaId && n.bimestre === bimestre)),
          {
            id:            nova?.id            ?? notaRegistroId ?? crypto.randomUUID(),
            user_id:       nova?.user_id       ?? alunoId,
            disciplina_id: nova?.disciplina_id ?? disciplinaId,
            bimestre:      nova?.bimestre      ?? bimestre,
            av1:           nova?.av1           ?? av1,
            av2:           nova?.av2           ?? av2,
            av3:           nova?.av3           ?? (isPresencial ? av3 : null),
            recuperacao:   nova?.recuperacao   ?? rec,
            media:         nova?.media         ?? mediaCalculada,
            media_final:   nova?.media_final   ?? mediaCalculada,
            frequencia:    nova?.frequencia    ?? null,
            faltas:        nova?.faltas        ?? null,
            status_final:  nova?.status_final  ?? null,
            disciplina:    anterior?.disciplina ?? null,
          },
        ];
      });

      toast.success('Nota salva com sucesso!');
      setNotaEmEdicao(null);
    } catch (err: any) {
      console.error('[BoletinsGerais] Erro ao salvar nota:', err);
      toast.error('Erro ao salvar nota: ' + (err?.message || 'verifique o console'));
    } finally {
      setSalvandoNota(false);
    }
  }

  const notaEmEdicaoPreview = notaEmEdicao
    ? { av1: notaEmEdicao.av1, av2: notaEmEdicao.av2, av3: notaEmEdicao.av3, rec: notaEmEdicao.rec }
    : null;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Filter className="w-5 h-5 text-blue-600" />
            Filtros de Busca
            {isPresencial && (
              <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full ml-1">
                Presencial
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Buscar Aluno</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={busca} onChange={e => setBusca(e.target.value)}
                  placeholder="Nome ou email..." className="pl-9" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Série</Label>
              <Select value={filtroSerie} onValueChange={setFiltroSerie}>
                <SelectTrigger><SelectValue placeholder="Todas as séries" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as Séries</SelectItem>
                  {series.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Bimestre</Label>
              <Select value={filtroBimestre} onValueChange={setFiltroBimestre}>
                <SelectTrigger><SelectValue placeholder="Todos os bimestres" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Bimestres</SelectItem>
                  <SelectItem value="1">1º Bimestre</SelectItem>
                  <SelectItem value="2">2º Bimestre</SelectItem>
                  <SelectItem value="3">3º Bimestre</SelectItem>
                  <SelectItem value="4">4º Bimestre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-5 flex pt-4 justify-end">
            <Button onClick={aplicarFiltros} disabled={carregando}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2 px-8">
              {carregando
                ? <><Loader2 className="w-4 h-4 animate-spin" />Processando...</>
                : <><Search className="w-4 h-4" />Aplicar Filtros</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {erro && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">{erro}</p>
        </div>
      )}

      {carregando && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
          <span className="text-muted-foreground">Buscando registros acadêmicos...</span>
        </div>
      )}

      {!carregando && filtrosAplicados && alunos.length === 0 && (
        <Card className="border-dashed border-2 border-border">
          <CardContent className="p-16 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground opacity-50" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2">Nenhum aluno encontrado</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">Ajuste os filtros e tente novamente.</p>
          </CardContent>
        </Card>
      )}

      {/* Lista de boletins */}
      {!carregando && filtrosAplicados && alunos.length > 0 && (
        <div className="space-y-4">
          {boletins.map(boletim => {
            const expandido = alunosExpandidos.has(boletim.id);
            const comNota = boletim.notas.filter(n =>
              n.av1 !== null || n.av2 !== null || n.rec !== null
            ).length;

            return (
              <Card key={boletim.id}
                className={`overflow-hidden transition-all ${expandido
                  ? 'border-blue-400 dark:border-blue-700 shadow-md'
                  : 'hover:shadow-md'}`}>
                <CardHeader
                  className={`cursor-pointer transition-colors ${expandido ? 'bg-muted/40' : 'hover:bg-muted/20'}`}
                  onClick={() => toggleAluno(boletim.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0 tracking-wide">
                        {boletim.nomeAluno.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <CardTitle className="text-base text-foreground">{boletim.nomeAluno}</CardTitle>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {boletim.serie || 'Série não informada'}
                          </span>
                          <span className="text-xs text-muted-foreground hidden sm:inline">{boletim.email}</span>
                          {boletim.bimestreNumero > 0 && (
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded">
                              {boletim.bimestreLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {filtroBimestre !== 'todos' && (
                        <div className="hidden sm:flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full text-xs text-muted-foreground">
                          <GraduationCap className="w-3.5 h-3.5" />
                          {comNota} de {boletim.notas.length} notas
                        </div>
                      )}
                      <Button variant="ghost" size="icon" className="rounded-full">
                        {expandido ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {expandido && (
                  <CardContent className="border-t border-border p-0">
                    <div className="p-5">
                      {boletim.notas.length === 0 && filtroBimestre !== 'todos' ? (
                        <div className="py-10 text-center">
                          <BookOpen className="w-10 h-10 text-muted-foreground opacity-30 mx-auto mb-3" />
                          <p className="text-muted-foreground text-sm">Nenhuma disciplina vinculada para esta série.</p>
                        </div>
                      ) : filtroBimestre !== 'todos' ? (
                        <div className="space-y-4">
                          <div className="overflow-x-auto rounded-lg border border-border">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-muted/50 border-b border-border">
                                  <th className="py-3 px-4 text-left font-semibold text-foreground">Disciplina</th>
                                  <th className="py-3 px-4 text-center font-semibold text-foreground">AV1</th>
                                  <th className="py-3 px-4 text-center font-semibold text-foreground">AV2</th>
                                  {isPresencial && (
                                    <th className="py-3 px-4 text-center font-semibold text-foreground">AV3</th>
                                  )}
                                  <th className="py-3 px-4 text-center font-semibold text-foreground">REC</th>
                                  <th className="py-3 px-4 text-center font-semibold text-foreground">Média</th>
                                  <th className="py-3 px-4 text-center font-semibold text-foreground">Situação</th>
                                  <th className="py-3 px-4 text-right font-semibold text-foreground">Ações</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {boletim.notas.map(nota => {
                                  const media    = calcularMedia(nota);
                                  const situacao = calcularSituacao(nota);
                                  const estilo   = getSituacaoStyle(situacao);
                                  return (
                                    <tr key={nota.disciplinaId}
                                      className="hover:bg-muted/30 transition-colors group">
                                      <td className="py-3 px-4 font-medium text-foreground">{nota.disciplinaNome}</td>
                                      <td className="py-3 px-4 text-center text-muted-foreground">
                                        {nota.av1 !== null ? nota.av1.toFixed(1) : <span className="opacity-40">—</span>}
                                      </td>
                                      <td className="py-3 px-4 text-center text-muted-foreground">
                                        {nota.av2 !== null ? nota.av2.toFixed(1) : <span className="opacity-40">—</span>}
                                      </td>
                                      {isPresencial && (
                                        <td className="py-3 px-4 text-center text-muted-foreground">
                                          {nota.av3 !== null ? nota.av3.toFixed(1) : <span className="opacity-40">—</span>}
                                        </td>
                                      )}
                                      <td className="py-3 px-4 text-center">
                                        {nota.rec !== null
                                          ? <span className="text-blue-600 dark:text-blue-400 font-semibold">{nota.rec.toFixed(1)}</span>
                                          : <span className="opacity-40">—</span>}
                                      </td>
                                      <td className="py-3 px-4 text-center">
                                        <span className={`font-bold text-base ${getMediaColor(media, situacao)}`}>
                                          {situacao === 'Pendente' ? '—' : media.toFixed(1)}
                                        </span>
                                      </td>
                                      <td className="py-3 px-4 text-center">
                                        <span className="text-xs font-semibold px-3 py-1.5 rounded-full border"
                                          style={{ backgroundColor: estilo.bg, color: estilo.text, borderColor: estilo.border }}>
                                          {situacao}
                                        </span>
                                      </td>
                                      <td className="py-3 px-4 text-right">
                                        <Button size="sm" variant="ghost"
                                          onClick={e => { e.stopPropagation(); abrirEdicaoNota(boletim, nota); }}
                                          className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 gap-1"
                                        >
                                          <Edit className="w-3.5 h-3.5" /> Editar
                                        </Button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Legenda da regra de cálculo */}
                          <div className="flex items-start gap-2 p-3 rounded-lg text-xs"
                            style={{ backgroundColor: '#dbeafe', color: '#1e3a8a' }}>
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>
                              <strong>Regra de cálculo:</strong>{' '}
                              {isPresencial
                                ? 'Presencial — Média = (AV1 + AV2 + AV3) ÷ 3. A REC substitui a média diretamente se for maior. Aprovação ≥ 7,0.'
                                : 'EAD — Média = (AV1 + AV2) ÷ 2. A REC substitui a menor nota entre AV1/AV2 se for maior, recalculando a média. Aprovação ≥ 7,0.'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm text-center py-4">
                          Selecione um bimestre específico para ver as notas detalhadas.
                        </p>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de edição */}
      <Dialog open={!!notaEmEdicao} onOpenChange={() => setNotaEmEdicao(null)}>
        <DialogContent className="max-w-md overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Edit className="w-5 h-5 text-blue-600" /> Lançamento de Notas
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Valores permitidos: 0,0 a 10,0
            </DialogDescription>
          </DialogHeader>

          {notaEmEdicao && (
            <div className="space-y-5">
              {/* Info do aluno */}
              <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg border border-border">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {notaEmEdicao.nomeAluno.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{notaEmEdicao.nomeAluno}</p>
                  <p className="text-xs text-muted-foreground">
                    {notaEmEdicao.disciplinaNome} • {notaEmEdicao.bimestre}º Bimestre
                    {isPresencial && ' • Presencial'}
                  </p>
                </div>
              </div>

              {/* Campos de nota — condicionais por segmento */}
              <div className={`grid gap-4 ${isPresencial ? 'grid-cols-4' : 'grid-cols-3'}`}>
                {(['av1', 'av2', ...(isPresencial ? ['av3'] : []), 'rec'] as const).map(campo => (
                  <div key={campo} className="space-y-2">
                    <Label htmlFor={campo}
                      className={`font-semibold text-sm ${campo === 'rec'
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-foreground'}`}>
                      {campo === 'rec' ? 'REC' : campo.toUpperCase()}
                    </Label>
                    <Input
                      id={campo} type="number" min={0} max={10} step={0.1}
                      value={notaEmEdicao[campo as keyof NotaEmEdicao] !== null
                        ? String(notaEmEdicao[campo as keyof NotaEmEdicao])
                        : ''}
                      onChange={e => handleChangeNota(campo as 'av1' | 'av2' | 'av3' | 'rec', e.target.value)}
                      placeholder="—"
                      className="text-center text-lg font-semibold"
                    />
                  </div>
                ))}
              </div>

              {/* Preview da média com a regra correta */}
              {notaEmEdicaoPreview && (
                <div className="p-4 bg-muted/40 rounded-lg border border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Projeção — regra {isPresencial ? 'Presencial' : 'EAD'}
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Média Final</p>
                      <span className={`text-3xl font-bold ${getMediaColor(
                        calcularMedia(notaEmEdicaoPreview),
                        calcularSituacao({
                          disciplinaId: notaEmEdicao.disciplinaId,
                          disciplinaNome: notaEmEdicao.disciplinaNome,
                          ...notaEmEdicaoPreview,
                        })
                      )}`}>
                        {calcularMedia(notaEmEdicaoPreview).toFixed(1)}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-2">Situação</p>
                      {(() => {
                        const sit = calcularSituacao({
                          disciplinaId: notaEmEdicao.disciplinaId,
                          disciplinaNome: notaEmEdicao.disciplinaNome,
                          ...notaEmEdicaoPreview,
                        });
                        const estilo = getSituacaoStyle(sit);
                        return (
                          <span className="text-sm font-semibold px-3 py-1 rounded-full border"
                            style={{ backgroundColor: estilo.bg, color: estilo.text, borderColor: estilo.border }}>
                            {sit}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  {/* Dica da regra aplicada */}
                  <p className="text-xs text-muted-foreground mt-3">
                    {isPresencial
                      ? 'REC substitui a média diretamente se for maior.'
                      : 'REC substitui a menor nota entre AV1/AV2 se for maior.'}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-1 border-t border-border">
                <Button variant="outline" className="flex-1"
                  onClick={() => setNotaEmEdicao(null)} disabled={salvandoNota}>
                  Cancelar
                </Button>
                <Button onClick={salvarNota} disabled={salvandoNota}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-2">
                  {salvandoNota
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</>
                    : <><Save className="w-4 h-4" />Salvar Notas</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}