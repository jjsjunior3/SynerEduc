import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { BarChart3, Edit2, Save, Users, TrendingUp, TrendingDown, Calculator, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { toast } from 'sonner@2.0.3';
import { Textarea } from './ui/textarea';

interface BoletimProfessorAvancadoProps {
  disciplina: any;
  serie: any;
}

interface NotaAlunoAvancada {
  id: string;
  nome: string;
  bimestre1: {
    av1: number;
    av2: number;
    rec: number;
    media: number;
  };
  bimestre2: {
    av1: number;
    av2: number;
    rec: number;
    media: number;
  };
  bimestre3: {
    av1: number;
    av2: number;
    rec: number;
    media: number;
  };
  bimestre4: {
    av1: number;
    av2: number;
    rec: number;
    media: number;
  };
  mediaFinal: number;
  situacao: 'aprovado' | 'recuperacao' | 'reprovado';
}

export function BoletimProfessorAvancado({ disciplina, serie }: BoletimProfessorAvancadoProps) {
  const [bimestreSelecionado, setBimestreSelecionado] = useState('1');
  const [alunoEditando, setAlunoEditando] = useState<string | null>(null);
  const [notaEditando, setNotaEditando] = useState('');
  const [observacaoEditando, setObservacaoEditando] = useState('');
  const [modalObservacao, setModalObservacao] = useState(false);
  const [alunoObservacao, setAlunoObservacao] = useState<string | null>(null);

  const [alunos, setAlunos] = useState<NotaAlunoAvancada[]>([
    {
      id: '1',
      nome: 'Ana Carolina Silva',
      bimestre1: { av1: 8.5, av2: 9.0, rec: 0, media: 8.75 },
      bimestre2: { av1: 0, av2: 0, rec: 0, media: 0 },
      bimestre3: { av1: 0, av2: 0, rec: 0, media: 0 },
      bimestre4: { av1: 0, av2: 0, rec: 0, media: 0 },
      mediaFinal: 8.75,
      situacao: 'aprovado'
    },
    {
      id: '2',
      nome: 'Bruno Santos Costa',
      bimestre1: { av1: 7.2, av2: 6.8, rec: 0, media: 7.0 },
      bimestre2: { av1: 0, av2: 0, rec: 0, media: 0 },
      bimestre3: { av1: 0, av2: 0, rec: 0, media: 0 },
      bimestre4: { av1: 0, av2: 0, rec: 0, media: 0 },
      mediaFinal: 7.0,
      situacao: 'aprovado'
    },
    {
      id: '3',
      nome: 'Carlos Eduardo Lima',
      bimestre1: { av1: 6.0, av2: 5.5, rec: 7.0, media: 6.5 },
      bimestre2: { av1: 0, av2: 0, rec: 0, media: 0 },
      bimestre3: { av1: 0, av2: 0, rec: 0, media: 0 },
      bimestre4: { av1: 0, av2: 0, rec: 0, media: 0 },
      mediaFinal: 6.5,
      situacao: 'recuperacao'
    },
    {
      id: '4',
      nome: 'Daniel Oliveira',
      bimestre1: { av1: 9.1, av2: 8.8, rec: 0, media: 8.95 },
      bimestre2: { av1: 0, av2: 0, rec: 0, media: 0 },
      bimestre3: { av1: 0, av2: 0, rec: 0, media: 0 },
      bimestre4: { av1: 0, av2: 0, rec: 0, media: 0 },
      mediaFinal: 8.95,
      situacao: 'aprovado'
    },
    {
      id: '5',
      nome: 'Eduardo Pereira',
      bimestre1: { av1: 4.5, av2: 5.0, rec: 6.5, media: 5.75 },
      bimestre2: { av1: 0, av2: 0, rec: 0, media: 0 },
      bimestre3: { av1: 0, av2: 0, rec: 0, media: 0 },
      bimestre4: { av1: 0, av2: 0, rec: 0, media: 0 },
      mediaFinal: 5.75,
      situacao: 'recuperacao'
    },
    {
      id: '6',
      nome: 'Fernanda Costa',
      bimestre1: { av1: 8.0, av2: 7.8, rec: 0, media: 7.9 },
      bimestre2: { av1: 0, av2: 0, rec: 0, media: 0 },
      bimestre3: { av1: 0, av2: 0, rec: 0, media: 0 },
      bimestre4: { av1: 0, av2: 0, rec: 0, media: 0 },
      mediaFinal: 7.9,
      situacao: 'aprovado'
    },
    {
      id: '7',
      nome: 'Gabriel Santos',
      bimestre1: { av1: 7.5, av2: 7.2, rec: 0, media: 7.35 },
      bimestre2: { av1: 0, av2: 0, rec: 0, media: 0 },
      bimestre3: { av1: 0, av2: 0, rec: 0, media: 0 },
      bimestre4: { av1: 0, av2: 0, rec: 0, media: 0 },
      mediaFinal: 7.35,
      situacao: 'aprovado'
    },
    {
      id: '8',
      nome: 'Helena Silva',
      bimestre1: { av1: 8.8, av2: 9.2, rec: 0, media: 9.0 },
      bimestre2: { av1: 0, av2: 0, rec: 0, media: 0 },
      bimestre3: { av1: 0, av2: 0, rec: 0, media: 0 },
      bimestre4: { av1: 0, av2: 0, rec: 0, media: 0 },
      mediaFinal: 9.0,
      situacao: 'aprovado'
    }
  ]);

  // Função para calcular a média do bimestre
  const calcularMediaBimestre = (av1: number, av2: number, rec: number): number => {
    // Se tem recuperação, usar a maior nota entre média das AV's e REC
    if (rec > 0) {
      const mediaAVs = (av1 + av2) / 2;
      return Math.max(mediaAVs, rec);
    }
    // Se não tem recuperação, média simples das AV's
    if (av1 > 0 && av2 > 0) {
      return (av1 + av2) / 2;
    }
    // Se só tem uma AV
    if (av1 > 0) return av1;
    if (av2 > 0) return av2;
    return 0;
  };

  // Função para recalcular médias
  const recalcularMedias = (aluno: NotaAlunoAvancada): NotaAlunoAvancada => {
    const novoAluno = { ...aluno };
    
    // Recalcular média de cada bimestre
    novoAluno.bimestre1.media = calcularMediaBimestre(
      novoAluno.bimestre1.av1, 
      novoAluno.bimestre1.av2, 
      novoAluno.bimestre1.rec
    );
    novoAluno.bimestre2.media = calcularMediaBimestre(
      novoAluno.bimestre2.av1, 
      novoAluno.bimestre2.av2, 
      novoAluno.bimestre2.rec
    );
    novoAluno.bimestre3.media = calcularMediaBimestre(
      novoAluno.bimestre3.av1, 
      novoAluno.bimestre3.av2, 
      novoAluno.bimestre3.rec
    );
    novoAluno.bimestre4.media = calcularMediaBimestre(
      novoAluno.bimestre4.av1, 
      novoAluno.bimestre4.av2, 
      novoAluno.bimestre4.rec
    );

    // Calcular média final (média das médias dos bimestres que têm nota)
    const medias = [
      novoAluno.bimestre1.media,
      novoAluno.bimestre2.media,
      novoAluno.bimestre3.media,
      novoAluno.bimestre4.media
    ].filter(m => m > 0);

    novoAluno.mediaFinal = medias.length > 0 ? medias.reduce((acc, m) => acc + m, 0) / medias.length : 0;
    
    // Definir situação
    if (novoAluno.mediaFinal >= 7) {
      novoAluno.situacao = 'aprovado';
    } else if (novoAluno.mediaFinal >= 5) {
      novoAluno.situacao = 'recuperacao';
    } else {
      novoAluno.situacao = 'reprovado';
    }

    return novoAluno;
  };

  const handleEditarNota = (alunoId: string, bimestre: string, tipoNota: string) => {
    const aluno = alunos.find(a => a.id === alunoId);
    if (aluno) {
      const bimestreData = aluno[`bimestre${bimestre}` as keyof NotaAlunoAvancada] as any;
      const notaAtual = bimestreData[tipoNota];
      setNotaEditando(notaAtual > 0 ? notaAtual.toString() : '');
      setAlunoEditando(`${alunoId}-${bimestre}-${tipoNota}`);
    }
  };

  const handleSalvarNota = () => {
    if (!alunoEditando) return;
    
    const [alunoId, bimestre, tipoNota] = alunoEditando.split('-');
    const nota = parseFloat(notaEditando);
    
    if (isNaN(nota) || nota < 0 || nota > 10) {
      toast.error('Nota deve ser um número entre 0 e 10');
      return;
    }

    setAlunos(prev => prev.map(aluno => {
      if (aluno.id === alunoId) {
        const alunoAtualizado = { ...aluno };
        (alunoAtualizado[`bimestre${bimestre}` as keyof NotaAlunoAvancada] as any)[tipoNota] = nota;
        return recalcularMedias(alunoAtualizado);
      }
      return aluno;
    }));

    setAlunoEditando(null);
    setNotaEditando('');
    toast.success('Nota salva e médias recalculadas!');
  };

  const handleCancelarEdicao = () => {
    setAlunoEditando(null);
    setNotaEditando('');
  };

  const handleAbrirObservacao = (alunoId: string) => {
    setAlunoObservacao(alunoId);
    setObservacaoEditando('');
    setModalObservacao(true);
  };

  const handleSalvarObservacao = () => {
    toast.success('Observação salva com sucesso!');
    setModalObservacao(false);
    setAlunoObservacao(null);
    setObservacaoEditando('');
  };

  const exportarBoletim = () => {
    const dados = alunos.map(aluno => ({
      Nome: aluno.nome,
      '1º Bim - AV1': aluno.bimestre1.av1 || '-',
      '1º Bim - AV2': aluno.bimestre1.av2 || '-',
      '1º Bim - REC': aluno.bimestre1.rec || '-',
      '1º Bim - Média': aluno.bimestre1.media.toFixed(2),
      '2º Bim - AV1': aluno.bimestre2.av1 || '-',
      '2º Bim - AV2': aluno.bimestre2.av2 || '-',
      '2º Bim - REC': aluno.bimestre2.rec || '-',
      '2º Bim - Média': aluno.bimestre2.media > 0 ? aluno.bimestre2.media.toFixed(2) : '-',
      'Média Final': aluno.mediaFinal.toFixed(2),
      'Situação': aluno.situacao
    }));

    const csv = [
      Object.keys(dados[0]).join(','),
      ...dados.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boletim_${disciplina.nome}_${serie.nome}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Boletim exportado com sucesso!');
  };

  const getNotaColor = (nota: number) => {
    if (nota >= 7) return 'text-green-600 font-semibold';
    if (nota >= 5) return 'text-yellow-600 font-semibold';
    if (nota > 0) return 'text-red-600 font-semibold';
    return 'text-gray-400';
  };

  const getSituacaoColor = (situacao: string) => {
    switch (situacao) {
      case 'aprovado': return 'bg-green-100 text-green-700';
      case 'recuperacao': return 'bg-yellow-100 text-yellow-700';
      case 'reprovado': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const calcularEstatisticas = () => {
    const aprovados = alunos.filter(a => a.situacao === 'aprovado').length;
    const recuperacao = alunos.filter(a => a.situacao === 'recuperacao').length;
    const reprovados = alunos.filter(a => a.situacao === 'reprovado').length;
    const mediaGeralTurma = alunos.reduce((acc, a) => acc + a.mediaFinal, 0) / alunos.length;
    
    return { aprovados, recuperacao, reprovados, mediaGeralTurma };
  };

  const { aprovados, recuperacao, reprovados, mediaGeralTurma } = calcularEstatisticas();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Boletim Avançado - Sistema AV1/AV2/REC</h2>
          <p className="text-sm text-gray-600">
            {disciplina.nome} - {serie.nome} | Médias calculadas automaticamente
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button onClick={exportarBoletim} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Exportar
          </Button>
          <Select value={bimestreSelecionado} onValueChange={setBimestreSelecionado}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1º Bimestre</SelectItem>
              <SelectItem value="2">2º Bimestre</SelectItem>
              <SelectItem value="3">3º Bimestre</SelectItem>
              <SelectItem value="4">4º Bimestre</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{aprovados}</div>
            <div className="text-sm text-gray-600">Aprovados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{recuperacao}</div>
            <div className="text-sm text-gray-600">Recuperação</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{reprovados}</div>
            <div className="text-sm text-gray-600">Reprovados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${getNotaColor(mediaGeralTurma)}`}>
              {mediaGeralTurma.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">Média Geral</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Notas por Bimestre */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            {bimestreSelecionado}º Bimestre - {disciplina.nome}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 min-w-[200px]">Aluno</th>
                  <th className="text-center py-3 min-w-[80px]">AV1</th>
                  <th className="text-center py-3 min-w-[80px]">AV2</th>
                  <th className="text-center py-3 min-w-[80px]">REC</th>
                  <th className="text-center py-3 min-w-[100px]">Média</th>
                  <th className="text-center py-3 min-w-[120px]">Situação</th>
                  <th className="text-center py-3 min-w-[100px]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {alunos.map((aluno) => {
                  const bimestreData = aluno[`bimestre${bimestreSelecionado}` as keyof NotaAlunoAvancada] as any;
                  
                  return (
                    <tr key={aluno.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 font-medium">{aluno.nome}</td>
                      
                      {/* AV1 */}
                      <td className="text-center py-3">
                        {alunoEditando === `${aluno.id}-${bimestreSelecionado}-av1` ? (
                          <div className="flex items-center justify-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              max="10"
                              step="0.1"
                              value={notaEditando}
                              onChange={(e) => setNotaEditando(e.target.value)}
                              className="w-20 text-center"
                              autoFocus
                            />
                            <Button size="sm" onClick={handleSalvarNota}>
                              <Save className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancelarEdicao}>
                              ✕
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditarNota(aluno.id, bimestreSelecionado, 'av1')}
                            className={`hover:bg-gray-100 px-3 py-2 rounded ${getNotaColor(bimestreData.av1)}`}
                          >
                            {bimestreData.av1 > 0 ? bimestreData.av1.toFixed(1) : '-'}
                          </button>
                        )}
                      </td>

                      {/* AV2 */}
                      <td className="text-center py-3">
                        {alunoEditando === `${aluno.id}-${bimestreSelecionado}-av2` ? (
                          <div className="flex items-center justify-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              max="10"
                              step="0.1"
                              value={notaEditando}
                              onChange={(e) => setNotaEditando(e.target.value)}
                              className="w-20 text-center"
                              autoFocus
                            />
                            <Button size="sm" onClick={handleSalvarNota}>
                              <Save className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancelarEdicao}>
                              ✕
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditarNota(aluno.id, bimestreSelecionado, 'av2')}
                            className={`hover:bg-gray-100 px-3 py-2 rounded ${getNotaColor(bimestreData.av2)}`}
                          >
                            {bimestreData.av2 > 0 ? bimestreData.av2.toFixed(1) : '-'}
                          </button>
                        )}
                      </td>

                      {/* REC */}
                      <td className="text-center py-3">
                        {alunoEditando === `${aluno.id}-${bimestreSelecionado}-rec` ? (
                          <div className="flex items-center justify-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              max="10"
                              step="0.1"
                              value={notaEditando}
                              onChange={(e) => setNotaEditando(e.target.value)}
                              className="w-20 text-center"
                              autoFocus
                            />
                            <Button size="sm" onClick={handleSalvarNota}>
                              <Save className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancelarEdicao}>
                              ✕
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditarNota(aluno.id, bimestreSelecionado, 'rec')}
                            className={`hover:bg-gray-100 px-3 py-2 rounded ${getNotaColor(bimestreData.rec)} ${
                              bimestreData.rec > 0 ? 'bg-blue-50 border border-blue-200' : ''
                            }`}
                          >
                            {bimestreData.rec > 0 ? bimestreData.rec.toFixed(1) : '-'}
                          </button>
                        )}
                      </td>

                      {/* Média */}
                      <td className="text-center py-3">
                        <span className={`font-bold text-lg ${getNotaColor(bimestreData.media)} 
                          ${bimestreData.media > 0 ? 'bg-gray-50 px-3 py-1 rounded border' : ''}`}>
                          {bimestreData.media > 0 ? bimestreData.media.toFixed(2) : '-'}
                        </span>
                      </td>
                      
                      {/* Situação */}
                      <td className="text-center py-3">
                        <Badge className={getSituacaoColor(aluno.situacao)}>
                          {aluno.situacao}
                        </Badge>
                      </td>

                      {/* Ações */}
                      <td className="text-center py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAbrirObservacao(aluno.id)}
                          className="gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          Obs
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Resumo Anual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Resumo Anual Completo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 min-w-[160px]">Aluno</th>
                  <th className="text-center py-2">1º Bim</th>
                  <th className="text-center py-2">2º Bim</th>
                  <th className="text-center py-2">3º Bim</th>
                  <th className="text-center py-2">4º Bim</th>
                  <th className="text-center py-2 font-bold">Média Final</th>
                  <th className="text-center py-2">Situação</th>
                </tr>
              </thead>
              <tbody>
                {alunos.map((aluno) => (
                  <tr key={aluno.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 font-medium">{aluno.nome}</td>
                    <td className={`text-center py-2 ${getNotaColor(aluno.bimestre1.media)}`}>
                      {aluno.bimestre1.media > 0 ? aluno.bimestre1.media.toFixed(1) : '-'}
                    </td>
                    <td className={`text-center py-2 ${getNotaColor(aluno.bimestre2.media)}`}>
                      {aluno.bimestre2.media > 0 ? aluno.bimestre2.media.toFixed(1) : '-'}
                    </td>
                    <td className={`text-center py-2 ${getNotaColor(aluno.bimestre3.media)}`}>
                      {aluno.bimestre3.media > 0 ? aluno.bimestre3.media.toFixed(1) : '-'}
                    </td>
                    <td className={`text-center py-2 ${getNotaColor(aluno.bimestre4.media)}`}>
                      {aluno.bimestre4.media > 0 ? aluno.bimestre4.media.toFixed(1) : '-'}
                    </td>
                    <td className="text-center py-2">
                      <span className={`font-bold text-lg ${getNotaColor(aluno.mediaFinal)} 
                        bg-gray-100 px-2 py-1 rounded border-2`}>
                        {aluno.mediaFinal > 0 ? aluno.mediaFinal.toFixed(2) : '-'}
                      </span>
                    </td>
                    <td className="text-center py-2">
                      <Badge className={getSituacaoColor(aluno.situacao)}>
                        {aluno.situacao}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Instruções */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                <span className="font-medium">Sistema de Cálculo:</span>
              </div>
              <ul className="space-y-1 ml-6">
                <li>• Sem recuperação: Média = (AV1 + AV2) / 2</li>
                <li>• Com recuperação: Média = Maior nota entre [(AV1+AV2)/2] e [REC]</li>
                <li>• Média Final = Média dos bimestres com nota</li>
              </ul>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4" />
                <span className="font-medium">Como usar:</span>
              </div>
              <ul className="space-y-1 ml-6">
                <li>• Clique em qualquer nota para editá-la</li>
                <li>• As médias são recalculadas automaticamente</li>
                <li>• Use o botão "Obs" para adicionar observações</li>
                <li>• Export para salvar planilha completa</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Observações */}
      <Dialog open={modalObservacao} onOpenChange={setModalObservacao}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Observação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="observacao">Observação sobre o aluno:</Label>
              <Textarea
                id="observacao"
                value={observacaoEditando}
                onChange={(e) => setObservacaoEditando(e.target.value)}
                placeholder="Digite suas observações sobre o desempenho do aluno..."
                rows={4}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalObservacao(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSalvarObservacao}>
                Salvar Observação
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}