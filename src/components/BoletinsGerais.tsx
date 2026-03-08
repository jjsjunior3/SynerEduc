// src/components/BoletinsGerais.tsx
/**
 * Boletins Gerais - Coordenação
 * Visualizar e editar boletins dos alunos por série e bimestre,
 * mostrando também alunos sem notas lançadas.
 */

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase/supabaseClient';

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from './ui/dialog';
import { Label } from './ui/label';

import {
  ArrowLeft,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  User,
  Edit,
  Save,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';

import { toast } from 'sonner';

interface BoletinsGeraisProps {
  onVoltar: () => void;
}

interface Aluno {
  id: string;
  nome: string;
  email: string;
  serie: string;
}

interface Disciplina {
  id: string;
  nome: string;
}

interface Nota {
  id: string;
  user_id: string;
  disciplina_id: string;
  bimestre: number;
  av1: number | null;
  av2: number | null;
  recuperacao: number | null;
  media: number | null;
  media_final: number | null;
  frequencia: number | null;
  faltas: number | null;
  status_final: string | null;
  disciplina: Disciplina | null;
}

interface NotaDisciplinaView {
  disciplinaId: string;
  disciplinaNome: string;
  av1: number | null;
  av2: number | null;
  rec: number | null;
}

interface BoletimAlunoView {
  id: string;             // alunoId-bimestre
  alunoId: string;
  nomeAluno: string;
  email: string;
  serie: string;
  bimestreNumero: number;
  bimestreLabel: string;
  notas: NotaDisciplinaView[]; // pode ser []
}

interface NotaEmEdicao {
  alunoId: string;
  disciplinaId: string;
  disciplinaNome: string;
  bimestre: number;
  nomeAluno: string;
  av1: number | null;
  av2: number | null;
  rec: number | null;
  notaRegistroId: string | null;
}

export default function BoletinsGerais({ onVoltar }: BoletinsGeraisProps) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // filtros
  const [series, setSeries] = useState<string[]>([]);
  const [filtroSerie, setFiltroSerie] = useState<string>('todas');
  const [filtroBimestre, setFiltroBimestre] = useState<string>('todos');
  const [busca, setBusca] = useState<string>('');
  const [filtrosAplicados, setFiltrosAplicados] = useState(false);

  // dados crus
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [notas, setNotas] = useState<Nota[]>([]);

  // UI
  const [alunosExpandidos, setAlunosExpandidos] = useState<Set<string>>(
    new Set(),
  );

  // edição
  const [notaEmEdicao, setNotaEmEdicao] = useState<NotaEmEdicao | null>(null);
  const [salvandoNota, setSalvandoNota] = useState(false);

  // ===================== CARREGAR SÉRIES =====================
  useEffect(() => {
    async function carregarSeries() {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('serie')
          .eq('tipo', 'aluno')
          .not('serie', 'is', null);

        if (error) throw error;

        const unicas = Array.from(
          new Set((data || []).map(d => d.serie as string)),
        ).sort();

        setSeries(unicas);
      } catch (err) {
        console.error('Erro ao carregar séries:', err);
        toast.error('Erro ao carregar séries');
      }
    }

    carregarSeries();
  }, []);

  // ===================== APLICAR FILTROS =====================
  async function aplicarFiltros() {
    setCarregando(true);
    setErro(null);
    setFiltrosAplicados(true);
    setAlunosExpandidos(new Set());

    try {
      // 1) alunos
      let queryAlunos = supabase
        .from('users')
        .select('id, nome, email, serie')
        .eq('tipo', 'aluno')
        .order('nome', { ascending: true });

      if (filtroSerie !== 'todas') {
        queryAlunos = queryAlunos.eq('serie', filtroSerie);
      }

      const { data: alunosData, error: alunosError } = await queryAlunos;
      if (alunosError) throw alunosError;

      const alunosFiltrados =
        (alunosData || []).filter(a => {
          if (!busca.trim()) return true;
          const texto = busca.toLowerCase();
          return (
            a.nome.toLowerCase().includes(texto) ||
            (a.email ?? '').toLowerCase().includes(texto)
          );
        }) || [];

      setAlunos(alunosFiltrados);

      // mesmo que não tenha aluno, não dá erro – só mostra mensagem
      if (alunosFiltrados.length === 0) {
        setNotas([]);
        return;
      }

      // 2) notas
      const ids = alunosFiltrados.map(a => a.id);

      let queryNotas = supabase
        .from('notas')
        .select(
          `
          id,
          user_id,
          disciplina_id,
          bimestre,
          av1,
          av2,
          recuperacao,
          media,
          media_final,
          frequencia,
          faltas,
          status_final,
          disciplinas:disciplinas!disciplina_id(id, nome)
        `,
        )
        .in('user_id', ids);

      if (filtroBimestre !== 'todos') {
        queryNotas = queryNotas.eq('bimestre', parseInt(filtroBimestre));
      }

      const { data: notasData, error: notasError } = await queryNotas;
      if (notasError) throw notasError;

      const normalizadas: Nota[] =
        (notasData || []).map((n: any) => ({
          ...n,
          disciplina: n.disciplinas
            ? { id: n.disciplinas.id, nome: n.disciplinas.nome }
            : null,
        })) || [];

      setNotas(normalizadas);
    } catch (err: any) {
      console.error('Erro ao carregar boletins:', err);
      setErro(err.message || 'Erro ao carregar boletins');
      toast.error('Erro ao carregar boletins');
    } finally {
      setCarregando(false);
    }
  }

  // ===================== MONTAR VIEW DOS BOLETINS =====================
  const boletins: BoletimAlunoView[] = useMemo(() => {
    if (!alunos.length) return [];

    const map = new Map<string, BoletimAlunoView>();

    for (const aluno of alunos) {
      // se filtro de bimestre estiver em "todos", vamos criar UMA linha por aluno,
      // mas aí não faz muito sentido para boletim; neste layout, assumimos 1 bimestre
      // então, se "todos", vamos mostrar apenas alunos (sem bimestre definido)
      if (filtroBimestre === 'todos') {
        const key = `${aluno.id}-0`;
        if (!map.has(key)) {
          map.set(key, {
            id: key,
            alunoId: aluno.id,
            nomeAluno: aluno.nome,
            email: aluno.email,
            serie: aluno.serie,
            bimestreNumero: 0,
            bimestreLabel: 'Todos os bimestres',
            notas: [],
          });
        }
        continue;
      }

      const bimestreNumero = parseInt(filtroBimestre);

      const notasAluno =
        notas.filter(
          n => n.user_id === aluno.id && n.bimestre === bimestreNumero,
        ) || [];

      const key = `${aluno.id}-${bimestreNumero}`;

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          alunoId: aluno.id,
          nomeAluno: aluno.nome,
          email: aluno.email,
          serie: aluno.serie,
          bimestreNumero,
          bimestreLabel: `${bimestreNumero}º Bimestre`,
          notas: [],
        });
      }

      const boletim = map.get(key)!;

      for (const n of notasAluno) {
        boletim.notas.push({
          disciplinaId: n.disciplina_id,
          disciplinaNome: n.disciplina?.nome || 'Disciplina',
          av1: n.av1,
          av2: n.av2,
          rec: n.recuperacao,
        });
      }
    }

    const lista = Array.from(map.values());
    lista.sort((a, b) =>
      a.nomeAluno.localeCompare(b.nomeAluno, 'pt-BR', { sensitivity: 'base' }),
    );
    return lista;
  }, [alunos, notas, filtroBimestre]);

  // ===================== CÁLCULOS DE NOTA =====================
  const calcularMedia = (nota: NotaDisciplinaView) => {
    const av1 = nota.av1 ?? 0;
    const av2 = nota.av2 ?? 0;

    if (nota.rec !== null && nota.rec !== undefined) {
      const menor = Math.min(av1, av2);
      const maior = Math.max(av1, av2);
      return (maior + nota.rec) / 2;
    }

    if (nota.av1 === null && nota.av2 === null) return 0;
    return (av1 + av2) / 2;
  };

  const calcularSituacao = (
    nota: NotaDisciplinaView,
  ): 'Aprovado' | 'Recuperação' => {
    const media = calcularMedia(nota);
    return media >= 7 ? 'Aprovado' : 'Recuperação';
  };

  const getSituacaoColor = (situacao: 'Aprovado' | 'Recuperação') =>
    situacao === 'Aprovado'
      ? 'bg-green-100 text-green-700 border-green-300'
      : 'bg-yellow-100 text-yellow-700 border-yellow-300';

  const getMediaColor = (media: number) => {
    if (media >= 7) return 'text-green-600';
    if (media >= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  // ===================== EXPAND / COLLAPSE =====================
  const toggleAluno = (id: string) => {
    setAlunosExpandidos(prev => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  };

  // ===================== EDIÇÃO DE NOTAS =====================
  function abrirEdicaoNota(boletim: BoletimAlunoView, nota: NotaDisciplinaView) {
    const registro = notas.find(
      n =>
        n.user_id === boletim.alunoId &&
        n.disciplina_id === nota.disciplinaId &&
        n.bimestre === boletim.bimestreNumero,
    );

    setNotaEmEdicao({
      alunoId: boletim.alunoId,
      disciplinaId: nota.disciplinaId,
      disciplinaNome: nota.disciplinaNome,
      bimestre: boletim.bimestreNumero,
      nomeAluno: boletim.nomeAluno,
      av1: nota.av1,
      av2: nota.av2,
      rec: nota.rec,
      notaRegistroId: registro?.id ?? null,
    });
  }

  function handleChangeNota(
    campo: 'av1' | 'av2' | 'rec',
    valor: string,
  ) {
    if (!notaEmEdicao) return;
    const num = valor === '' ? null : Number(valor);
    if (num !== null && (Number.isNaN(num) || num < 0 || num > 10)) return;

    setNotaEmEdicao(prev =>
      prev
        ? {
            ...prev,
            [campo]: num,
          }
        : prev,
    );
  }

  function cancelarEdicao() {
    setNotaEmEdicao(null);
  }

  async function salvarNota() {
    if (!notaEmEdicao) return;
    setSalvandoNota(true);

    try {
      const {
        alunoId,
        disciplinaId,
        bimestre,
        av1,
        av2,
        rec,
        notaRegistroId,
      } = notaEmEdicao;

      const payload: any = {
        user_id: alunoId,
        disciplina_id: disciplinaId,
        bimestre,
        av1,
        av2,
        recuperacao: rec,
      };

      let resp;
      if (notaRegistroId) {
        resp = await supabase
          .from('notas')
          .update(payload)
          .eq('id', notaRegistroId)
          .select();
      } else {
        resp = await supabase.from('notas').insert(payload).select();
      }

      if (resp.error) throw resp.error;

      const nova = resp.data?.[0] as any;

      // atualizar notas no estado
      setNotas(prev => {
        const semAntiga = prev.filter(
          n =>
            !(
              n.user_id === alunoId &&
              n.disciplina_id === disciplinaId &&
              n.bimestre === bimestre
            ),
        );

        const novaNormalizada: Nota = {
          id: nova.id,
          user_id: nova.user_id,
          disciplina_id: nova.disciplina_id,
          bimestre: nova.bimestre,
          av1: nova.av1,
          av2: nova.av2,
          recuperacao: nova.recuperacao,
          media: nova.media,
          media_final: nova.media_final,
          frequencia: nova.frequencia,
          faltas: nova.faltas,
          status_final: nova.status_final,
          disciplina: null, // não vem no retorno; será reconstruído em próximas cargas
        };

        return [...semAntiga, novaNormalizada];
      });

      toast.success('Nota salva com sucesso');
      setNotaEmEdicao(null);
    } catch (err: any) {
      console.error('Erro ao salvar nota:', err);
      toast.error('Erro ao salvar nota');
    } finally {
      setSalvandoNota(false);
    }
  }

  // ===================== RENDER =====================
  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onVoltar}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div>
            <h1 className="font-semibold text-gray-900">Boletins Gerais</h1>
            <p className="text-sm text-gray-600">
              Visualizar e editar boletins dos alunos por série e bimestre
            </p>
          </div>
        </div>
      </div>

      {/* CONTEÚDO */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* FILTROS */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Busca */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Buscar Aluno</label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      value={busca}
                      onChange={e => setBusca(e.target.value)}
                      placeholder="Nome ou email..."
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Série */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Série</label>
                  <Select
                    value={filtroSerie}
                    onValueChange={setFiltroSerie}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as séries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      {series.map(serie => (
                        <SelectItem key={serie} value={serie}>
                          {serie}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Bimestre */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Bimestre</label>
                  <Select
                    value={filtroBimestre}
                    onValueChange={setFiltroBimestre}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os bimestres" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="1">1º Bimestre</SelectItem>
                      <SelectItem value="2">2º Bimestre</SelectItem>
                      <SelectItem value="3">3º Bimestre</SelectItem>
                      <SelectItem value="4">4º Bimestre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  onClick={aplicarFiltros}
                  disabled={carregando}
                  className="bg-black text-white px-6"
                >
                  {carregando ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Aplicando...
                    </>
                  ) : (
                    'Aplicar filtros'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ERRO GLOBAL */}
          {erro && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="flex items-center gap-3 p-4">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-sm font-semibold text-red-800">
                    Erro ao carregar boletins
                  </p>
                  <p className="text-sm text-red-700">{erro}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* LISTA DE BOLETINS */}
          {!carregando && filtrosAplicados && alunos.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Search className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="font-medium text-gray-900 mb-2">
                  Nenhum aluno encontrado
                </h3>
                <p className="text-gray-600">
                  Não foram encontrados alunos com os filtros selecionados.
                  Ajuste os filtros e tente novamente.
                </p>
              </CardContent>
            </Card>
          )}

          {!carregando && filtrosAplicados && alunos.length > 0 && (
            <>
              {boletins.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <User className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="font-medium text-gray-900 mb-2">
                      Alunos encontrados, mas sem notas lançadas
                    </h3>
                    <p className="text-gray-600">
                      Há alunos na série/bimestre selecionados, porém ainda não
                      existem notas lançadas pelos professores.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {boletins.map(boletim => {
                    const expandido = alunosExpandidos.has(boletim.id);

                    return (
                      <Card
                        key={boletim.id}
                        className="overflow-hidden border border-gray-200"
                      >
                        <CardHeader
                          className="bg-white cursor-pointer"
                          onClick={() => toggleAluno(boletim.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-500 to-green-500 flex items-center justify-center text-white font-semibold">
                                {boletim.nomeAluno
                                  .split(' ')
                                  .map(p => p[0])
                                  .join('')
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </div>
                              <div>
                                <CardTitle className="text-base">
                                  {boletim.nomeAluno}
                                </CardTitle>
                                <p className="text-xs text-gray-500">
                                  {boletim.email || 'Sem e-mail'} •{' '}
                                  {boletim.serie || 'Série não informada'}{' '}
                                  {boletim.bimestreNumero > 0 &&
                                    `• ${boletim.bimestreLabel}`}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <User className="w-4 h-4 text-gray-400" />
                                <span className="text-xs text-gray-500">
                                  {boletim.notas.length} disciplinas com nota
                                </span>
                              </div>
                              <Button
                                variant="outline"
                                size="icon"
                                className="rounded-full"
                              >
                                {expandido ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="bg-gray-50">
                          {expandido && (
                            <div className="pt-4">
                              {boletim.notas.length === 0 ? (
                                <div className="py-8 text-center text-sm text-gray-500">
                                  Nenhuma nota lançada para este aluno no{' '}
                                  {boletim.bimestreNumero > 0
                                    ? boletim.bimestreLabel
                                    : 'período selecionado'}
                                  .
                                </div>
                              ) : (
                                <>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="bg-white">
                                          <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600">
                                            Disciplina
                                          </th>
                                          <th className="py-2 px-4 text-center text-xs font-semibold text-gray-600">
                                            AV1
                                          </th>
                                          <th className="py-2 px-4 text-center text-xs font-semibold text-gray-600">
                                            AV2
                                          </th>
                                          <th className="py-2 px-4 text-center text-xs font-semibold text-gray-600">
                                            REC
                                          </th>
                                          <th className="py-2 px-4 text-center text-xs font-semibold text-gray-600">
                                            Média
                                          </th>
                                          <th className="py-2 px-4 text-center text-xs font-semibold text-gray-600">
                                            Situação
                                          </th>
                                          <th className="py-2 px-4 text-center text-xs font-semibold text-gray-600">
                                            Ações
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {boletim.notas.map(nota => {
                                          const media = calcularMedia(nota);
                                          const situacao =
                                            calcularSituacao(nota);

                                          return (
                                            <tr
                                              key={nota.disciplinaId}
                                              className="border-t"
                                            >
                                              <td className="py-3 px-4 text-sm text-gray-900">
                                                {nota.disciplinaNome}
                                              </td>
                                              <td className="py-3 px-4 text-center text-sm">
                                                {nota.av1 !== null
                                                  ? nota.av1.toFixed(1)
                                                  : '-'}
                                              </td>
                                              <td className="py-3 px-4 text-center text-sm">
                                                {nota.av2 !== null
                                                  ? nota.av2.toFixed(1)
                                                  : '-'}
                                              </td>
                                              <td className="py-3 px-4 text-center text-sm">
                                                {nota.rec !== null ? (
                                                  <span className="text-blue-600 font-semibold">
                                                    {nota.rec.toFixed(1)}
                                                  </span>
                                                ) : (
                                                  '-'
                                                )}
                                              </td>
                                              <td className="py-3 px-4 text-center text-sm font-semibold">
                                                <span
                                                  className={getMediaColor(
                                                    media,
                                                  )}
                                                >
                                                  {media.toFixed(1)}
                                                </span>
                                              </td>
                                              <td className="py-3 px-4 text-center">
                                                <Badge
                                                  className={getSituacaoColor(
                                                    situacao,
                                                  )}
                                                >
                                                  {situacao}
                                                </Badge>
                                              </td>
                                              <td className="py-3 px-4 text-center">
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={e => {
                                                    e.stopPropagation();
                                                    abrirEdicaoNota(
                                                      boletim,
                                                      nota,
                                                    );
                                                  }}
                                                  className="border-orange-500 text-orange-600 hover:bg-orange-50"
                                                >
                                                  <Edit className="w-3 h-3 mr-1" />
                                                  Editar
                                                </Button>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>

                                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                    <p className="text-sm text-blue-900">
                                      <strong>Legenda:</strong> A média é
                                      calculada por (AV1 + AV2) / 2. Se houver
                                      REC (Recuperação), a nota substitui a
                                      menor entre AV1 e AV2. Média ≥ 7,0 =
                                      Aprovado | Média menor 7,0 = Recuperação.
                                    </p>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {carregando && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span>Carregando boletins...</span>
            </div>
          )}
        </div>
      </div>

      {/* DIALOG DE EDIÇÃO */}
      <Dialog open={!!notaEmEdicao} onOpenChange={cancelarEdicao}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-orange-600" />
              Editar Nota
            </DialogTitle>
            <DialogDescription>
              Edite as notas do aluno. As notas devem estar entre 0 e 10.
            </DialogDescription>
          </DialogHeader>

          {notaEmEdicao && (
            <div className="space-y-4 py-4">
              <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                <p className="text-sm font-semibold text-orange-900">
                  {notaEmEdicao.nomeAluno}
                </p>
                <p className="text-sm text-orange-700">
                  {notaEmEdicao.disciplinaNome} • {notaEmEdicao.bimestre}º
                  Bimestre
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="av1">AV1</Label>
                  <Input
                    id="av1"
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    value={
                      notaEmEdicao.av1 !== null ? notaEmEdicao.av1 : ''
                    }
                    onChange={e => handleChangeNota('av1', e.target.value)}
                    placeholder="0.0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="av2">AV2</Label>
                  <Input
                    id="av2"
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    value={
                      notaEmEdicao.av2 !== null ? notaEmEdicao.av2 : ''
                    }
                    onChange={e => handleChangeNota('av2', e.target.value)}
                    placeholder="0.0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rec">REC</Label>
                  <Input
                    id="rec"
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    value={
                      notaEmEdicao.rec !== null ? notaEmEdicao.rec : ''
                    }
                    onChange={e => handleChangeNota('rec', e.target.value)}
                    placeholder="0.0"
                  />
                </div>
              </div>

              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-900">
                    Média Calculada:
                  </span>
                  <span
                    className={`text-lg font-bold ${getMediaColor(
                      calcularMedia({
                        disciplinaId: notaEmEdicao.disciplinaId,
                        disciplinaNome: notaEmEdicao.disciplinaNome,
                        av1: notaEmEdicao.av1,
                        av2: notaEmEdicao.av2,
                        rec: notaEmEdicao.rec,
                      }),
                    )}`}
                  >
                    {calcularMedia({
                      disciplinaId: notaEmEdicao.disciplinaId,
                      disciplinaNome: notaEmEdicao.disciplinaNome,
                      av1: notaEmEdicao.av1,
                      av2: notaEmEdicao.av2,
                      rec: notaEmEdicao.rec,
                    }).toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-medium text-green-900">
                    Situação:
                  </span>
                  <Badge
                    className={getSituacaoColor(
                      calcularSituacao({
                        disciplinaId: notaEmEdicao.disciplinaId,
                        disciplinaNome: notaEmEdicao.disciplinaNome,
                        av1: notaEmEdicao.av1,
                        av2: notaEmEdicao.av2,
                        rec: notaEmEdicao.rec,
                      }),
                    )}
                  >
                    {calcularSituacao({
                      disciplinaId: notaEmEdicao.disciplinaId,
                      disciplinaNome: notaEmEdicao.disciplinaNome,
                      av1: notaEmEdicao.av1,
                      av2: notaEmEdicao.av2,
                      rec: notaEmEdicao.rec,
                    })}
                  </Badge>
                </div>
              </div>

              <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                💡 Deixe o campo vazio para indicar nota não lançada. A
                recuperação substitui a menor nota entre AV1 e AV2.
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={cancelarEdicao}
              disabled={salvandoNota}
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={salvarNota}
              disabled={salvandoNota}
              className="bg-gradient-to-r from-orange-500 to-green-600 hover:from-orange-600 hover:to-green-700"
            >
              {salvandoNota ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
