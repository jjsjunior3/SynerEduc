import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { BarChart3, Edit2, Save, Users, TrendingUp, TrendingDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { toast } from 'sonner@2.0.3';

interface BoletimProfessorProps {
  disciplina: any;
  serie: any;
}

interface NotaAluno {
  id: string;
  nome: string;
  nota1: number;
  nota2: number;
  nota3: number;
  nota4: number;
  media: number;
  situacao: 'aprovado' | 'recuperacao' | 'reprovado';
}

export function BoletimProfessor({ disciplina, serie }: BoletimProfessorProps) {
  const [bimestreSelecionado, setBimestreSelecionado] = useState('1');
  const [alunoEditando, setAlunoEditando] = useState<string | null>(null);
  const [notaEditando, setNotaEditando] = useState('');

  const [alunos, setAlunos] = useState<NotaAluno[]>([
    {
      id: '1',
      nome: 'Ana Carolina Silva',
      nota1: 8.5,
      nota2: 0,
      nota3: 0,
      nota4: 0,
      media: 8.5,
      situacao: 'aprovado'
    },
    {
      id: '2',
      nome: 'Bruno Santos Costa',
      nota1: 7.2,
      nota2: 0,
      nota3: 0,
      nota4: 0,
      media: 7.2,
      situacao: 'aprovado'
    },
    {
      id: '3',
      nome: 'Carlos Eduardo Lima',
      nota1: 6.8,
      nota2: 0,
      nota3: 0,
      nota4: 0,
      media: 6.8,
      situacao: 'recuperacao'
    },
    {
      id: '4',
      nome: 'Daniel Oliveira',
      nota1: 9.1,
      nota2: 0,
      nota3: 0,
      nota4: 0,
      media: 9.1,
      situacao: 'aprovado'
    },
    {
      id: '5',
      nome: 'Eduardo Pereira',
      nota1: 5.5,
      nota2: 0,
      nota3: 0,
      nota4: 0,
      media: 5.5,
      situacao: 'reprovado'
    },
    {
      id: '6',
      nome: 'Fernanda Costa',
      nota1: 8.0,
      nota2: 0,
      nota3: 0,
      nota4: 0,
      media: 8.0,
      situacao: 'aprovado'
    },
    {
      id: '7',
      nome: 'Gabriel Santos',
      nota1: 7.5,
      nota2: 0,
      nota3: 0,
      nota4: 0,
      media: 7.5,
      situacao: 'aprovado'
    },
    {
      id: '8',
      nome: 'Helena Silva',
      nota1: 8.8,
      nota2: 0,
      nota3: 0,
      nota4: 0,
      media: 8.8,
      situacao: 'aprovado'
    }
  ]);

  const handleEditarNota = (alunoId: string, bimestre: string) => {
    const aluno = alunos.find(a => a.id === alunoId);
    if (aluno) {
      const notaAtual = aluno[`nota${bimestre}` as keyof NotaAluno] as number;
      setNotaEditando(notaAtual.toString());
      setAlunoEditando(`${alunoId}-${bimestre}`);
    }
  };

  const handleSalvarNota = () => {
    if (!alunoEditando) return;
    
    const [alunoId, bimestre] = alunoEditando.split('-');
    const nota = parseFloat(notaEditando);
    
    if (isNaN(nota) || nota < 0 || nota > 10) {
      toast.error('Nota deve ser um número entre 0 e 10');
      return;
    }

    setAlunos(prev => prev.map(aluno => {
      if (aluno.id === alunoId) {
        const alunoAtualizado = {
          ...aluno,
          [`nota${bimestre}`]: nota
        };
        
        // Recalcular média
        const notas = [alunoAtualizado.nota1, alunoAtualizado.nota2, alunoAtualizado.nota3, alunoAtualizado.nota4];
        const notasValidas = notas.filter(n => n > 0);
        const media = notasValidas.length > 0 ? notasValidas.reduce((acc, n) => acc + n, 0) / notasValidas.length : 0;
        
        alunoAtualizado.media = media;
        alunoAtualizado.situacao = media >= 7 ? 'aprovado' : media >= 5 ? 'recuperacao' : 'reprovado';
        
        return alunoAtualizado;
      }
      return aluno;
    }));

    setAlunoEditando(null);
    setNotaEditando('');
    toast.success('Nota salva com sucesso!');
  };

  const handleCancelarEdicao = () => {
    setAlunoEditando(null);
    setNotaEditando('');
  };

  const getNotaColor = (nota: number) => {
    if (nota >= 7) return 'text-green-600';
    if (nota >= 5) return 'text-yellow-600';
    if (nota > 0) return 'text-red-600';
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
    const mediaGeral = alunos.reduce((acc, a) => acc + a.media, 0) / alunos.length;
    
    return { aprovados, recuperacao, reprovados, mediaGeral };
  };

  const { aprovados, recuperacao, reprovados, mediaGeral } = calcularEstatisticas();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Boletim da Turma</h2>
        <div className="flex items-center gap-4">
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
            <div className={`text-2xl font-bold ${getNotaColor(mediaGeral)}`}>
              {mediaGeral.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">Média Geral</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Notas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Notas da Turma - {disciplina.nome}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3">Aluno</th>
                  <th className="text-center py-3">1º Bim</th>
                  <th className="text-center py-3">2º Bim</th>
                  <th className="text-center py-3">3º Bim</th>
                  <th className="text-center py-3">4º Bim</th>
                  <th className="text-center py-3">Média</th>
                  <th className="text-center py-3">Situação</th>
                </tr>
              </thead>
              <tbody>
                {alunos.map((aluno) => (
                  <tr key={aluno.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 font-medium">{aluno.nome}</td>
                    
                    {[1, 2, 3, 4].map((bim) => {
                      const nota = aluno[`nota${bim}` as keyof NotaAluno] as number;
                      const isEditando = alunoEditando === `${aluno.id}-${bim}`;
                      
                      return (
                        <td key={bim} className="text-center py-3">
                          {isEditando ? (
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
                              onClick={() => handleEditarNota(aluno.id, bim.toString())}
                              className={`font-bold hover:bg-gray-100 px-2 py-1 rounded ${getNotaColor(nota)}`}
                            >
                              {nota > 0 ? nota.toFixed(1) : '-'}
                            </button>
                          )}
                        </td>
                      );
                    })}
                    
                    <td className="text-center py-3">
                      <span className={`font-bold ${getNotaColor(aluno.media)}`}>
                        {aluno.media > 0 ? aluno.media.toFixed(1) : '-'}
                      </span>
                    </td>
                    
                    <td className="text-center py-3">
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
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Edit2 className="w-4 h-4" />
            <span>Clique em qualquer nota para editá-la. As médias são calculadas automaticamente.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}