import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calculator, Save, Loader2, AlertCircle, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { Textarea } from './ui/textarea';

// Importações para o PDF
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BoletimProfessorProps {
  disciplina: { id: string; nome: string };
  serie: { id: string; nome: string };
}

interface NotasBimestre {
  av1: number;
  av2: number;
  rec: number;
  media: number;
}

interface NotaAlunoAvancada {
  id: string;
  nome: string;
  bimestre1: NotasBimestre;
  bimestre2: NotasBimestre;
  bimestre3: NotasBimestre;
  bimestre4: NotasBimestre;
  mediaFinal: number;
  situacao: 'aprovado' | 'recuperacao' | 'reprovado' | 'cursando';
}

interface EstadoEdicao {
  alunoId: string;
  bimestre: string;
  tipoNota: 'av1' | 'av2' | 'rec';
}

export function BoletimProfessor({ disciplina, serie }: BoletimProfessorProps) {
  const { usuario } = useAuth();
  const [bimestreSelecionado, setBimestreSelecionado] = useState('1');
  const [alunos, setAlunos] = useState<NotaAlunoAvancada[]>([]);
  const [loading, setLoading] = useState(true);

  const [editando, setEditando] = useState<EstadoEdicao | null>(null);
  const [notaEditando, setNotaEditando] = useState('');
  const [salvandoNota, setSalvandoNota] = useState(false);

  const [observacaoEditando, setObservacaoEditando] = useState('');
  const [modalObservacao, setModalObservacao] = useState(false);

  const serieNome = serie.nome;

  // ✅ CÁLCULO DE RECUPERAÇÃO (Substitui a menor nota)
  const calcularMediaBimestre = (av1: number, av2: number, rec: number): number => {
    let nota1 = av1;
    let nota2 = av2;

    if (rec > 0) {
      if (nota1 <= nota2 && rec > nota1) {
        nota1 = rec;
      } else if (nota2 < nota1 && rec > nota2) {
        nota2 = rec;
      } else if (nota1 === nota2 && rec > nota1) {
        nota1 = rec;
      }
    }

    if (nota1 > 0 || nota2 > 0) {
      return (nota1 + nota2) / 2;
    }
    return 0;
  };

  const calcularSituacao = (mediaFinal: number): 'aprovado' | 'recuperacao' | 'reprovado' | 'cursando' => {
    if (mediaFinal >= 7) return 'aprovado';
    if (mediaFinal >= 5) return 'recuperacao';
    return 'reprovado';
  };

  const carregarDados = useCallback(async () => {
    if (!disciplina.id || !serieNome) return;

    setLoading(true);
    try {
      const { data: alunosData, error: alunosError } = await supabase
        .from('users')
        .select('id, nome')
        .eq('tipo', 'aluno')
        .eq('serie', serieNome)
        .order('nome', { ascending: true });

      if (alunosError) throw alunosError;

      if (!alunosData || alunosData.length === 0) {
        setAlunos([]);
        setLoading(false);
        return;
      }

      const { data: notasData, error: notasError } = await supabase
        .from('notas')
        .select('*')
        .eq('disciplina_id', disciplina.id)
        .in('user_id', alunosData.map(a => a.id));

      if (notasError) throw notasError;

      const alunosFormatados: NotaAlunoAvancada[] = alunosData.map(aluno => {
        const notasAluno = notasData?.filter(n => n.user_id === aluno.id) || [];

        const getNotasBimestre = (bim: number): NotasBimestre => {
          const registro = notasAluno.find(n => n.bimestre === bim);
          return {
            av1: registro?.av1 || 0,
            av2: registro?.av2 || 0,
            rec: registro?.recuperacao || 0,
            media: registro?.media || 0
          };
        };

        const b1 = getNotasBimestre(1);
        const b2 = getNotasBimestre(2);
        const b3 = getNotasBimestre(3);
        const b4 = getNotasBimestre(4);

        const mediasValidas = [b1.media, b2.media, b3.media, b4.media].filter(m => m > 0);
        const mediaFinal = mediasValidas.length > 0
          ? mediasValidas.reduce((acc, curr) => acc + curr, 0) / mediasValidas.length
          : 0;

        return {
          id: aluno.id,
          nome: aluno.nome,
          bimestre1: b1,
          bimestre2: b2,
          bimestre3: b3,
          bimestre4: b4,
          mediaFinal,
          situacao: calcularSituacao(mediaFinal)
        };
      });

      setAlunos(alunosFormatados);

    } catch (error) {
      console.error('Erro ao carregar boletim:', error);
      toast.error('Erro ao carregar dados do boletim.');
    } finally {
      setLoading(false);
    }
  }, [disciplina.id, serieNome]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const handleEditarNota = (alunoId: string, bimestre: string, tipoNota: 'av1' | 'av2' | 'rec') => {
    const aluno = alunos.find(a => a.id === alunoId);
    if (aluno) {
      const bimestreData = aluno[`bimestre${bimestre}` as keyof NotaAlunoAvancada] as any;
      const notaAtual = bimestreData[tipoNota];
      setNotaEditando(notaAtual > 0 ? notaAtual.toString() : '');
      setEditando({ alunoId, bimestre, tipoNota });
    }
  };

  const handleSalvarNota = async () => {
    if (!editando || !usuario?.id) return;

    const { alunoId, bimestre, tipoNota } = editando;
    const bimestreNumero = parseInt(bimestre);
    let notaValor = parseFloat(notaEditando);

    if (isNaN(notaValor)) notaValor = 0;
    if (notaValor < 0 || notaValor > 10) {
      toast.error('Nota deve ser entre 0 e 10');
      return;
    }

    setSalvandoNota(true);

    try {
      const aluno = alunos.find(a => a.id === alunoId);
      if (!aluno) throw new Error("Aluno não encontrado");

      const bimestreKey = `bimestre${bimestre}` as keyof NotaAlunoAvancada;
      const dadosAtuais = { ...aluno[bimestreKey] as NotasBimestre };

      if (tipoNota === 'av1') dadosAtuais.av1 = notaValor;
      if (tipoNota === 'av2') dadosAtuais.av2 = notaValor;
      if (tipoNota === 'rec') dadosAtuais.rec = notaValor;

      const novaMedia = calcularMediaBimestre(dadosAtuais.av1, dadosAtuais.av2, dadosAtuais.rec);

      const { data: registroExistente } = await supabase
        .from('notas')
        .select('id')
        .eq('user_id', alunoId)
        .eq('disciplina_id', disciplina.id)
        .eq('bimestre', bimestreNumero)
        .maybeSingle();

      const dadosParaSalvar = {
        user_id: alunoId,
        disciplina_id: disciplina.id,
        bimestre: bimestreNumero,
        av1: dadosAtuais.av1,
        av2: dadosAtuais.av2,
        recuperacao: dadosAtuais.rec,
        media: novaMedia,
        professor_responsavel: usuario.id,
        atualizado_em: new Date().toISOString()
      };

      let error;
      if (registroExistente) {
        const { error: updateError } = await supabase
          .from('notas')
          .update(dadosParaSalvar)
          .eq('id', registroExistente.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('notas')
          .insert({ ...dadosParaSalvar, criado_em: new Date().toISOString() });
        error = insertError;
      }

      if (error) throw error;

      setAlunos(prev => prev.map(a => {
        if (a.id === alunoId) {
          const novoAluno = { ...a };
          (novoAluno[bimestreKey] as any) = {
            ...dadosAtuais,
            media: novaMedia
          };

          const medias = [
            novoAluno.bimestre1.media,
            novoAluno.bimestre2.media,
            novoAluno.bimestre3.media,
            novoAluno.bimestre4.media
          ].filter(m => m > 0);

          novoAluno.mediaFinal = medias.length > 0 ? medias.reduce((acc, m) => acc + m, 0) / medias.length : 0;
          novoAluno.situacao = calcularSituacao(novoAluno.mediaFinal);

          return novoAluno;
        }
        return a;
      }));

      toast.success('Nota salva!');
      setEditando(null);
      setNotaEditando('');

    } catch (error) {
      console.error('Erro ao salvar nota:', error);
      toast.error('Erro ao salvar nota.');
    } finally {
      setSalvandoNota(false);
    }
  };

  const handleCancelarEdicao = () => {
    setEditando(null);
    setNotaEditando('');
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

  // ========================================
  // ✅ EXPORTAR PDF PADRONIZADO (IGUAL COORDENAÇÃO)
  // ========================================
  const exportarPDF = async () => {
    try {
      toast.loading('Gerando PDF...');
      const doc = new jsPDF();

      // 1. Carregar Logo
      const logo = new Image();
      logo.src = '/logo-colegio-conexao.png'; // Caminho exato da pasta public

      await new Promise((resolve, reject) => {
        logo.onload = resolve;
        logo.onerror = reject;
      });

      // 2. Cabeçalho Padrão
      doc.addImage(logo, 'PNG', 14, 10, 30, 30);

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('COLÉGIO CONEXÃO', 50, 20);

      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text('Boletim de Notas e Resultados', 50, 28);

      // Metadados alinhados
      doc.setFontSize(10);
      doc.text(`Disciplina: ${disciplina.nome}`, 50, 35);
      doc.text(`Turma: ${serie.nome}`, 50, 40);

      doc.text(`Bimestre: ${bimestreSelecionado}º`, 120, 35);
      doc.text(`Professor: ${usuario?.nome || 'Docente'}`, 120, 40);

      // Data no canto direito (padrão coordenação)
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 150, 20);

      // Linha Azul Separadora
      doc.setDrawColor(0, 0, 255);
      doc.setLineWidth(0.5);
      doc.line(14, 45, 196, 45);

      // 3. Tabela de Notas
      const tableColumn = ["Aluno", "AV1", "AV2", "REC", "Média", "Situação"];
      const tableRows: any[] = [];

      alunos.forEach(aluno => {
        const bimestreData = aluno[`bimestre${bimestreSelecionado}` as keyof NotaAlunoAvancada] as any;
        const rowData = [
          aluno.nome,
          bimestreData.av1 > 0 ? bimestreData.av1.toFixed(1) : '-',
          bimestreData.av2 > 0 ? bimestreData.av2.toFixed(1) : '-',
          bimestreData.rec > 0 ? bimestreData.rec.toFixed(1) : '-',
          bimestreData.media > 0 ? bimestreData.media.toFixed(2) : '-',
          aluno.situacao.toUpperCase()
        ];
        tableRows.push(rowData);
      });

      autoTable(doc, {
        startY: 55, // Ajustado para não bater na linha azul
        head: [tableColumn],
        body: tableRows,
        theme: 'striped',
        headStyles: { 
          fillColor: [41, 128, 185], 
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: { halign: 'left' },
          1: { halign: 'center' },
          2: { halign: 'center' },
          3: { halign: 'center' },
          4: { halign: 'center', fontStyle: 'bold' },
          5: { halign: 'center' }
        },
        styles: { fontSize: 10, cellPadding: 3 },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });

      // Rodapé
      const pageCount = doc.getNumberOfPages();
      for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('Sistema de Gestão Escolar - Conexão', 105, 290, { align: 'center' });
        doc.text(`Página ${i} de ${pageCount}`, 196, 290, { align: 'right' });
      }

      doc.save(`Boletim_${disciplina.nome}_${serie.nome}_${bimestreSelecionado}Bim.pdf`);
      toast.dismiss();
      toast.success('PDF gerado com sucesso!');

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.dismiss();
      toast.error('Erro ao gerar PDF. Verifique se a logo está na pasta public.');
    }
  };

  const { aprovados, recuperacao, reprovados, mediaGeralTurma } = (() => {
    const aprovados = alunos.filter(a => a.situacao === 'aprovado').length;
    const recuperacao = alunos.filter(a => a.situacao === 'recuperacao').length;
    const reprovados = alunos.filter(a => a.situacao === 'reprovado').length;
    const mediaGeralTurma = alunos.length > 0 ? alunos.reduce((acc, a) => acc + a.mediaFinal, 0) / alunos.length : 0;
    return { aprovados, recuperacao, reprovados, mediaGeralTurma };
  })();

  const isEditing = (alunoId: string, bimestre: string, tipo: 'av1' | 'av2' | 'rec') => {
    return editando?.alunoId === alunoId && editando?.bimestre === bimestre && editando?.tipoNota === tipo;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Boletim Avançado</h2>
          <p className="text-sm text-gray-600">
            {disciplina.nome} - {serie.nome}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button onClick={exportarPDF} variant="outline" className="gap-2 bg-red-50 text-red-600 border-red-200 hover:bg-red-100">
            <FileText className="w-4 h-4" />
            Exportar PDF
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

      {/* Tabela de Notas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            {bimestreSelecionado}º Bimestre
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : alunos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-3" />
              <p>Nenhum aluno encontrado nesta turma.</p>
            </div>
          ) : (
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
                          {isEditing(aluno.id, bimestreSelecionado, 'av1') ? (
                            <div className="flex items-center justify-center gap-2">
                              <Input
                                type="number"
                                value={notaEditando}
                                onChange={(e) => setNotaEditando(e.target.value)}
                                className="w-20 text-center"
                                autoFocus
                              />
                              <Button size="sm" onClick={handleSalvarNota} disabled={salvandoNota}>
                                <Save className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={handleCancelarEdicao}>✕</Button>
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
                          {isEditing(aluno.id, bimestreSelecionado, 'av2') ? (
                            <div className="flex items-center justify-center gap-2">
                              <Input
                                type="number"
                                value={notaEditando}
                                onChange={(e) => setNotaEditando(e.target.value)}
                                className="w-20 text-center"
                                autoFocus
                              />
                              <Button size="sm" onClick={handleSalvarNota} disabled={salvandoNota}>
                                <Save className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={handleCancelarEdicao}>✕</Button>
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
                          {isEditing(aluno.id, bimestreSelecionado, 'rec') ? (
                            <div className="flex items-center justify-center gap-2">
                              <Input
                                type="number"
                                value={notaEditando}
                                onChange={(e) => setNotaEditando(e.target.value)}
                                className="w-20 text-center"
                                autoFocus
                              />
                              <Button size="sm" onClick={handleSalvarNota} disabled={salvandoNota}>
                                <Save className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={handleCancelarEdicao}>✕</Button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleEditarNota(aluno.id, bimestreSelecionado, 'rec')}
                              className={`hover:bg-gray-100 px-3 py-2 rounded ${getNotaColor(bimestreData.rec)}`}
                            >
                              {bimestreData.rec > 0 ? bimestreData.rec.toFixed(1) : '-'}
                            </button>
                          )}
                        </td>

                        {/* Média */}
                        <td className="text-center py-3">
                          <span className={`font-bold text-lg ${getNotaColor(bimestreData.media)}`}>
                            {bimestreData.media > 0 ? bimestreData.media.toFixed(2) : '-'}
                          </span>
                        </td>

                        {/* Situação */}
                        <td className="text-center py-3">
                          <Badge className={getSituacaoColor(aluno.situacao)}>
                            {aluno.situacao}
                          </Badge>
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

      {/* Modal de Observações */}
      <Dialog open={modalObservacao} onOpenChange={setModalObservacao}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Observação</DialogTitle>
            <DialogDescription>
              Insira uma observação pedagógica sobre este aluno para compor o relatório.
            </DialogDescription>
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
              <Button onClick={() => {
                toast.success('Observação salva!');
                setModalObservacao(false);
              }}>
                Salvar Observação
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
