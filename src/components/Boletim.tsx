// src/components/Boletim.tsx
/**
 * Componente de Boletim do Aluno.
 * Exibe as notas do aluno por disciplina e bimestre, com estatísticas e funcionalidade de impressão.
 * Integra o layout do Figma com dados reais do Supabase.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  ArrowLeft,
  Printer,
  Download,
  Trophy,
  TrendingUp,
  AlertCircle,
  Loader2,
  AlertTriangle,
  Info,
} from 'lucide-react';

// Interfaces dos dados
interface UsuarioProps {
  id: string;
  nome: string;
  serie?: string; // Nome da série (ex: "8º ano")
}

interface DisciplinaData {
  id: string;
  nome: string;
  cor?: string;
}

interface TurmaProps {
  id: string;
  nome: string;
  serieId: string;
  serieNome: string;
  totalAlunos: number;
  disciplinas: DisciplinaData[]; // Lista de disciplinas da turma
}

interface BoletimProps {
  onVoltar: () => void;
  usuario: UsuarioProps | null;
  turma: TurmaProps | null; // Necessário para obter série e disciplinas
}

interface NotaBimestre {
  av1: number | null;
  av2: number | null;
  rec: number | null;
  med: number | null; // Média do bimestre
}

interface NotaDisciplina {
  disciplina_id: string;
  disciplina_nome: string;
  bimestre1: NotaBimestre;
  bimestre2: NotaBimestre;
  bimestre3: NotaBimestre;
  bimestre4: NotaBimestre;
  ptsTotal: number | null;
  mediaFinal: number | null;
  recupFinal: number | null;
  situacao: 'Aprovado' | 'Reprovado' | 'Recuperação' | 'N/A';
}

export default function Boletim({ onVoltar, usuario, turma }: BoletimProps) {
  const [notasBoletim, setNotasBoletim] = useState<NotaDisciplina[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [vaiImprimir, setVaiImprimir] = useState(false);

  // -------------------------------------------------
  // Busca de notas
  // -------------------------------------------------
  const buscarBoletim = useCallback(async () => {
    // Verifica se temos as informações necessárias
    if (!usuario?.id || !turma?.serieNome || !turma?.disciplinas) {
      setErro('Informações do aluno, série ou disciplinas não disponíveis.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setErro(null);

    try {
      // 1️⃣ Busca todas as notas do aluno
      const { data: notasExistentes, error: notasError } = await supabase
        .from('notas')
        .select(
          `
            disciplina_id,
            bimestre,
            av1,
            av2,
            recuperacao,
            media,
            media_final,
            status_final,
            disciplinas(nome)
          `
        )
        .eq('user_id', usuario.id)
        .order('nome', { foreignTable: 'disciplinas', ascending: true })
        .order('bimestre', { ascending: true });

      if (notasError) throw notasError;

      // 2️⃣ Cria estrutura vazia para **todas** as disciplinas da turma
      const notasPorDisciplina: Record<string, NotaDisciplina> = {};
      turma.disciplinas.forEach(disc => {
        notasPorDisciplina[disc.id] = {
          disciplina_id: disc.id,
          disciplina_nome: disc.nome,
          bimestre1: { av1: null, av2: null, rec: null, med: null },
          bimestre2: { av1: null, av2: null, rec: null, med: null },
          bimestre3: { av1: null, av2: null, rec: null, med: null },
          bimestre4: { av1: null, av2: null, rec: null, med: null },
          ptsTotal: null,
          mediaFinal: null,
          recupFinal: null,
          situacao: 'N/A',
        };
      });

      // 3️⃣ Preenche a estrutura com as notas que realmente existem
      (notasExistentes || []).forEach((nota: any) => {
        const disciplinaId = nota.disciplina_id;
        const bimestreNum = nota.bimestre;

        // Caso a nota pertença a uma disciplina que não está na lista da turma,
        // criamos dinamicamente (proteção contra dados inconsistentes)
        if (!notasPorDisciplina[disciplinaId]) {
          notasPorDisciplina[disciplinaId] = {
            disciplina_id: disciplinaId,
            disciplina_nome: nota.disciplinas?.nome || 'Disciplina Desconhecida',
            bimestre1: { av1: null, av2: null, rec: null, med: null },
            bimestre2: { av1: null, av2: null, rec: null, med: null },
            bimestre3: { av1: null, av2: null, rec: null, med: null },
            bimestre4: { av1: null, av2: null, rec: null, med: null },
            ptsTotal: null,
            mediaFinal: null,
            recupFinal: null,
            situacao: 'N/A',
          };
        }

        const notaBimestre: NotaBimestre = {
          av1: nota.av1,
          av2: nota.av2,
          rec: nota.recuperacao,
          med: nota.media,
        };

        // Distribui a nota no bimestre correto
        switch (bimestreNum) {
          case 1:
            notasPorDisciplina[disciplinaId].bimestre1 = notaBimestre;
            break;
          case 2:
            notasPorDisciplina[disciplinaId].bimestre2 = notaBimestre;
            break;
          case 3:
            notasPorDisciplina[disciplinaId].bimestre3 = notaBimestre;
            break;
          case 4:
            notasPorDisciplina[disciplinaId].bimestre4 = notaBimestre;
            break;
          default:
            break;
        }

        // Média final e situação podem já vir do DB
        if (nota.media_final !== null) {
          notasPorDisciplina[disciplinaId].mediaFinal = nota.media_final;
        }
        if (nota.status_final) {
          notasPorDisciplina[disciplinaId].situacao =
            (nota.status_final.charAt(0).toUpperCase() +
              nota.status_final.slice(1)) as NotaDisciplina['situacao'];
        }
        // Por enquanto não há coluna de recuperação final
        notasPorDisciplina[disciplinaId].recupFinal = null;
      });

      // 4️⃣ Calcula total de pontos, média final (se não vier do DB) e situação
      Object.values(notasPorDisciplina).forEach(nd => {
        let somaMedias = 0;
        let bimestresComMedia = 0;

        [nd.bimestre1, nd.bimestre2, nd.bimestre3, nd.bimestre4].forEach(b => {
          if (b.med !== null) {
            somaMedias += b.med;
            bimestresComMedia++;
          }
        });

        nd.ptsTotal = somaMedias;
        if (bimestresComMedia > 0) {
          if (nd.mediaFinal === null) {
            nd.mediaFinal = somaMedias / bimestresComMedia;
          }
        } else {
          nd.mediaFinal = null;
        }

        // Caso a situação ainda seja "N/A", determina-a a partir da média
        if (nd.situacao === 'N/A' && nd.mediaFinal !== null) {
          if (nd.mediaFinal >= 7) nd.situacao = 'Aprovado';
          else if (nd.mediaFinal >= 5) nd.situacao = 'Recuperação';
          else nd.situacao = 'Reprovado';
        }
      });

      // Ordena disciplinas por nome antes de atualizar o estado
      const finalNotasBoletim = Object.values(notasPorDisciplina).sort((a, b) =>
        a.disciplina_nome.localeCompare(b.disciplina_nome)
      );

      setNotasBoletim(finalNotasBoletim);
    } catch (err: any) {
      console.error('❌ Erro ao buscar boletim:', err);
      setErro(err.message || 'Erro ao carregar boletim. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  }, [usuario?.id, turma?.serieNome, turma?.disciplinas]); // ← dependências corretas

  // -------------------------------------------------
  // Efeito de carregamento
  // -------------------------------------------------
  useEffect(() => {
    buscarBoletim();
  }, [buscarBoletim]);

  // -------------------------------------------------
  // Cálculo de estatísticas gerais
  // -------------------------------------------------
  const calcularEstatisticas = () => {
    if (notasBoletim.length === 0) {
      return { mediaGeral: 0, aprovados: 0, totalDisciplinas: 0, melhorNota: 0, disciplinaMelhorNota: '' };
    }

    const mediasValidas = notasBoletim
      .filter(n => n.mediaFinal !== null)
      .map(n => n.mediaFinal as number);

    const mediaGeral =
      mediasValidas.length > 0
        ? mediasValidas.reduce((s, m) => s + m, 0) / mediasValidas.length
        : 0;

    const aprovados = notasBoletim.filter(n => n.situacao === 'Aprovado').length;
    const totalDisciplinas = notasBoletim.length;

    const melhorObj = notasBoletim.reduce(
      (prev, cur) => {
        if (cur.mediaFinal === null) return prev;
        if (prev.mediaFinal === null || cur.mediaFinal > prev.mediaFinal) return cur;
        return prev;
      },
      { mediaFinal: null, disciplina_nome: '' } as Partial<NotaDisciplina>
    );

    return {
      mediaGeral,
      aprovados,
      totalDisciplinas,
      melhorNota: melhorObj.mediaFinal || 0,
      disciplinaMelhorNota: melhorObj.disciplina_nome || '',
    };
  };

  const { mediaGeral, aprovados, totalDisciplinas, melhorNota, disciplinaMelhorNota } =
    calcularEstatisticas();

  // -------------------------------------------------
  // Funções auxiliares de estilo
  // -------------------------------------------------
  const getNotaColor = (nota: number | null) => {
    if (nota === null) return 'text-gray-400';
    if (nota >= 9) return 'text-green-700 font-bold';
    if (nota >= 7) return 'text-green-600';
    if (nota >= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSituacaoColor = (situacao: NotaDisciplina['situacao']) => {
    switch (situacao) {
      case 'Aprovado':
        return 'bg-green-100 text-green-700 border border-green-300';
      case 'Recuperação':
        return 'bg-yellow-100 text-yellow-700 border border-yellow-300';
      case 'Reprovado':
        return 'bg-red-100 text-red-700 border border-red-300';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // -------------------------------------------------
  // Impressão
  // -------------------------------------------------
  const handleImprimir = () => {
    setVaiImprimir(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => setVaiImprimir(false), 100);
    }, 100);
  };

  // -------------------------------------------------
  // Renderização
  // -------------------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-blue-600 dark:text-blue-400">
        <Loader2 className="animate-spin w-6 h-6 mr-2" />
        Carregando boletim...
      </div>
    );
  }

  if (erro) {
    return (
      <div className="text-center mt-10 p-4">
        <div className="flex items-center justify-center mb-4 text-red-600 dark:text-red-400">
          <AlertTriangle className="w-6 h-6 mr-2" />
          <span>{erro}</span>
        </div>
        <Button
          variant="outline"
          onClick={buscarBoletim}
          className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 hover:dark:bg-gray-600"
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  // Nenhuma disciplina encontrada para a turma do aluno
  if (turma?.disciplinas?.length === 0 || !turma?.disciplinas) {
    return (
      <div className="text-center text-gray-600 dark:text-gray-400 mt-10 p-4">
        <Info className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Nenhuma disciplina encontrada para este aluno.
        </h3>
        <p className="text-sm">
          Por favor, verifique a matrícula do aluno e as disciplinas associadas à sua turma.
        </p>
      </div>
    );
  }

  // ✅ REMOVIDO: O bloco condicional `if (todasSemNotas)` foi removido.
  // O componente agora sempre renderizará a tabela.

  // -------------------------------------------------
  // Boletim completo
  // -------------------------------------------------
  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950 ${
        vaiImprimir ? 'print-mode' : ''
      }`}
    >
      {/* Header (não aparece na impressão) */}
      <div className="print:hidden sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                onClick={onVoltar}
                variant="ghost"
                size="sm"
                className="hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-100"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>

              <div className="h-8 w-px bg-gray-300 dark:bg-gray-700" />

              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Boletim Escolar
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Visualize suas notas e desempenho
                </p>
              </div>
            </div>

            <Button
              onClick={handleImprimir}
              variant="outline"
              className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900"
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:px-8 print:py-4">
        {/* Cabeçalho (visível apenas na impressão) */}
        <div className="hidden print:block mb-6 text-center border-b-2 border-gray-800 pb-4">
          <img src="/logo-colegio-conexao.png" alt="Logo" className="h-16 mx-auto mb-2" />
          <h1 className="text-2xl font-bold text-gray-900">Colégio Conexão EAD Maranhense</h1>
          <h2 className="text-lg font-semibold mt-2">
            Boletim Escolar - Ano Letivo {new Date().getFullYear()}
          </h2>
          <div className="mt-3 text-sm">
            <p><strong>Aluno:</strong> {usuario?.nome || 'N/A'}</p>
            <p><strong>Série:</strong> {turma?.serieNome || 'N/A'}</p>
            <p><strong>Data de emissão:</strong> {new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        {/* Cards de estatísticas (não imprimem) */}
        <div className="print:hidden grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 dark:from-blue-700 dark:to-blue-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Média Geral</p>
                  <p className="text-3xl font-bold mt-1">{mediaGeral.toFixed(1)}</p>
                </div>
                <TrendingUp className="w-12 h-12 text-blue-200 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 dark:from-green-700 dark:to-green-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Disciplinas Aprovadas</p>
                  <p className="text-3xl font-bold mt-1">{aprovados}/{totalDisciplinas}</p>
                </div>
                <Trophy className="w-12 h-12 text-green-200 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 dark:from-purple-700 dark:to-purple-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Melhor Desempenho</p>
                  <p className="text-lg font-bold mt-1">{disciplinaMelhorNota}</p>
                  <p className="text-purple-100 text-sm">Nota: {melhorNota.toFixed(1)}</p>
                </div>
                <Trophy className="w-12 h-12 text-purple-200 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Informações do aluno (não imprimem) */}
        <Card className="print:hidden mb-6 dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="dark:text-gray-100">Informações do Aluno</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Nome:</span>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{usuario?.nome || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Série:</span>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{turma?.serieNome || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Ano Letivo:</span>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{new Date().getFullYear()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de notas */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="print:hidden">
            <CardTitle className="flex items-center gap-2 dark:text-gray-100">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Notas por Disciplina
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 print:p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs print:text-[10px] border-collapse">
                <thead className="bg-gray-100 dark:bg-gray-700 print:bg-gray-200">
                  <tr>
                    <th
                      rowSpan={2}
                      className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left font-bold sticky left-0 bg-gray-100 dark:bg-gray-700 print:bg-gray-200 dark:text-gray-100"
                    >
                      Disciplina
                    </th>

                    {/* Cabeçalhos dos bimestres */}
                    <th colSpan={4} className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center font-bold bg-blue-100 dark:bg-blue-900 dark:text-blue-100">
                      1º Bimestre
                    </th>
                    <th colSpan={4} className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center font-bold bg-green-100 dark:bg-green-900 dark:text-green-100">
                      2º Bimestre
                    </th>
                    <th colSpan={4} className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center font-bold bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-100">
                      3º Bimestre
                    </th>
                    <th colSpan={4} className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center font-bold bg-purple-100 dark:bg-purple-900 dark:text-purple-100">
                      4º Bimestre
                    </th>

                    {/* Totais */}
                    <th rowSpan={2} className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-center font-bold bg-gray-100 dark:bg-gray-700 dark:text-gray-100">
                      Pts Total
                    </th>
                    <th rowSpan={2} className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-center font-bold bg-gray-100 dark:bg-gray-700 dark:text-gray-100">
                      Média Final
                    </th>
                    <th rowSpan={2} className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-center font-bold bg-gray-100 dark:bg-gray-700 dark:text-gray-100">
                      Recup Final
                    </th>
                    <th rowSpan={2} className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-center font-bold bg-gray-100 dark:bg-gray-700 dark:text-gray-100">
                      Situação
                    </th>
                  </tr>
                  <tr>
                    {/* 1º Bimestre */}
                    <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center bg-blue-50 dark:bg-blue-800 dark:text-blue-100">
                      AV1
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center bg-blue-50 dark:bg-blue-800 dark:text-blue-100">
                      AV2
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center bg-blue-50 dark:bg-blue-800 dark:text-blue-100">
                      REC
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center bg-blue-50 dark:bg-blue-800 dark:text-blue-100">
                      MÉD
                    </th>

                    {/* 2º Bimestre */}
                    <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center bg-green-50 dark:bg-green-800 dark:text-green-100">
                      AV1
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center bg-green-50 dark:bg-green-800 dark:text-green-100">
                      AV2
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center bg-green-50 dark:bg-green-800 dark:text-green-100">
                      REC
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center bg-green-50 dark:bg-green-800 dark:text-green-100">
                      MÉD
                    </th>

                    {/* 3º Bimestre */}
                    <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center bg-yellow-50 dark:bg-yellow-800 dark:text-yellow-100">
                      AV1
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center bg-yellow-50 dark:bg-yellow-800 dark:text-yellow-100">
                      AV2
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center bg-yellow-50 dark:bg-yellow-800 dark:text-yellow-100">
                      REC
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center bg-yellow-50 dark:bg-yellow-800 dark:text-yellow-100">
                      MÉD
                    </th>

                    {/* 4º Bimestre */}
                    <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center bg-purple-50 dark:bg-purple-800 dark:text-purple-100">
                      AV1
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center bg-purple-50 dark:bg-purple-800 dark:text-purple-100">
                      AV2
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center bg-purple-50 dark:bg-purple-800 dark:text-purple-100">
                      REC
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center bg-purple-50 dark:bg-purple-800 dark:text-purple-100">
                      MÉD
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {notasBoletim.map((nota, idx) => (
                    <tr key={nota.disciplina_id || idx} className="hover:bg-gray-50 dark:hover:bg-gray-700 print:hover:bg-transparent">
                      {/* Disciplina */}
                      <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 font-semibold sticky left-0 bg-white dark:bg-gray-800 dark:text-gray-100">
                        {nota.disciplina_nome}
                      </td>

                      {/* 1º Bimestre */}
                      <td className={`border border-gray-300 dark:border-gray-600 px-2 py-2 text-center ${getNotaColor(nota.bimestre1.av1)}`}>
                        {nota.bimestre1.av1 !== null ? nota.bimestre1.av1.toFixed(1) : '-'}
                      </td>
                      <td className={`border border-gray-300 dark:border-gray-600 px-2 py-2 text-center ${getNotaColor(nota.bimestre1.av2)}`}>
                        {nota.bimestre1.av2 !== null ? nota.bimestre1.av2.toFixed(1) : '-'}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-center text-gray-400">
                        {nota.bimestre1.rec !== null && nota.bimestre1.rec > 0 ? nota.bimestre1.rec.toFixed(1) : '-'}
                      </td>
                      <td className={`border border-gray-300 dark:border-gray-600 px-2 py-2 text-center font-bold ${getNotaColor(nota.bimestre1.med)}`}>
                        {nota.bimestre1.med !== null ? nota.bimestre1.med.toFixed(1) : '-'}
                      </td>

                      {/* 2º Bimestre */}
                      <td className={`border border-gray-300 dark:border-gray-600 px-2 py-2 text-center ${getNotaColor(nota.bimestre2.av1)}`}>
                        {nota.bimestre2.av1 !== null ? nota.bimestre2.av1.toFixed(1) : '-'}
                      </td>
                      <td className={`border border-gray-300 dark:border-gray-600 px-2 py-2 text-center ${getNotaColor(nota.bimestre2.av2)}`}>
                        {nota.bimestre2.av2 !== null ? nota.bimestre2.av2.toFixed(1) : '-'}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-center text-gray-400">
                        {nota.bimestre2.rec !== null && nota.bimestre2.rec > 0 ? nota.bimestre2.rec.toFixed(1) : '-'}
                      </td>
                      <td className={`border border-gray-300 dark:border-gray-600 px-2 py-2 text-center font-bold ${getNotaColor(nota.bimestre2.med)}`}>
                        {nota.bimestre2.med !== null ? nota.bimestre2.med.toFixed(1) : '-'}
                      </td>

                      {/* 3º Bimestre */}
                      <td className={`border border-gray-300 dark:border-gray-600 px-2 py-2 text-center ${getNotaColor(nota.bimestre3.av1)}`}>
                        {nota.bimestre3.av1 !== null ? nota.bimestre3.av1.toFixed(1) : '-'}
                      </td>
                      <td className={`border border-gray-300 dark:border-gray-600 px-2 py-2 text-center ${getNotaColor(nota.bimestre3.av2)}`}>
                        {nota.bimestre3.av2 !== null ? nota.bimestre3.av2.toFixed(1) : '-'}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-center text-gray-400">
                        {nota.bimestre3.rec !== null && nota.bimestre3.rec > 0 ? nota.bimestre3.rec.toFixed(1) : '-'}
                      </td>
                      <td className={`border border-gray-300 dark:border-gray-600 px-2 py-2 text-center font-bold ${getNotaColor(nota.bimestre3.med)}`}>
                        {nota.bimestre3.med !== null ? nota.bimestre3.med.toFixed(1) : '-'}
                      </td>

                      {/* 4º Bimestre */}
                      <td className={`border border-gray-300 dark:border-gray-600 px-2 py-2 text-center ${getNotaColor(nota.bimestre4.av1)}`}>
                        {nota.bimestre4.av1 !== null ? nota.bimestre4.av1.toFixed(1) : '-'}
                      </td>
                      <td className={`border border-gray-300 dark:border-gray-600 px-2 py-2 text-center ${getNotaColor(nota.bimestre4.av2)}`}>
                        {nota.bimestre4.av2 !== null ? nota.bimestre4.av2.toFixed(1) : '-'}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-center text-gray-400">
                        {nota.bimestre4.rec !== null && nota.bimestre4.rec > 0 ? nota.bimestre4.rec.toFixed(1) : '-'}
                      </td>
                      <td className={`border border-gray-300 dark:border-gray-600 px-2 py-2 text-center font-bold ${getNotaColor(nota.bimestre4.med)}`}>
                        {nota.bimestre4.med !== null ? nota.bimestre4.med.toFixed(1) : '-'}
                      </td>

                      {/* Totais */}
                      <td className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-center font-bold text-blue-700 dark:text-blue-300">
                        {nota.ptsTotal !== null ? nota.ptsTotal.toFixed(1) : '-'}
                      </td>
                      <td className={`border border-gray-300 dark:border-gray-600 px-2 py-2 text-center font-bold text-lg ${getNotaColor(nota.mediaFinal)}`}>
                        {nota.mediaFinal !== null ? nota.mediaFinal.toFixed(1) : '-'}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-center text-gray-400">
                        {nota.recupFinal !== null && nota.recupFinal > 0 ? nota.recupFinal.toFixed(1) : '-'}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-center">
                        <Badge className={getSituacaoColor(nota.situacao)}>
                          {nota.situacao}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Legenda */}
        <Card className="mt-6 dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Legenda:</h4>
                <ul className="space-y-1 text-gray-600 dark:text-gray-300">
                  <li><strong>AV1/AV2:</strong> Avaliações 1 e 2</li>
                  <li><strong>REC:</strong> Recuperação do Bimestre</li>
                  <li><strong>MÉD:</strong> Média do Bimestre (AV1 + AV2) ÷ 2</li>
                  <li><strong>Pts Total:</strong> Soma das médias dos 4 bimestres</li>
                  <li><strong>Média Final:</strong> Pts Total ÷ 4</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Critérios de Aprovação:</h4>
                <ul className="space-y-1 text-gray-600 dark:text-gray-300">
                  <li className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>Média Final ≥ 7.0: Aprovado</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span>Média Final menor que 7.0: Recuperação</span>
                  </li>
              
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assinatura para impressão */}
        <div className="hidden print:block mt-12 pt-8 border-t-2 border-gray-300">
          <div className="grid grid-cols-2 gap-8">
            <div className="text-center">
              <div className="border-t border-gray-800 pt-2 mt-12">
                <p className="text-sm">Coordenação Pedagógica</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-gray-800 pt-2 mt-12">
                <p className="text-sm">Direção Escolar</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Estilos de impressão */}
      <style>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .print\\:px-8 {
            padding-left: 2rem !important;
            padding-right: 2rem !important;
          }
          .print\\:py-4 {
            padding-top: 1rem !important;
            padding-bottom: 1rem !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:text-\|$10px\$| {
            font-size: 10px !important;
          }
          .print\\:bg-gray-200 {
            background-color: #e5e7eb !important;
          }
          .print\\:hover\\:bg-transparent:hover {
            background-color: transparent !important;
          }
          @page {
            size: landscape;
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
}
