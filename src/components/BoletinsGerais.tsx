import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ArrowLeft, Search, Download, Eye, Filter } from 'lucide-react';

interface BoletinsGeraisProps {
  onVoltar: () => void;
}

interface BoletimAluno {
  id: string;
  nomeAluno: string;
  serie: string;
  turma: string;
  mediaGeral: number;
  situacao: 'aprovado' | 'recuperacao' | 'reprovado';
  disciplinas: {
    nome: string;
    nota1: number;
    nota2: number;
    nota3: number;
    nota4: number;
    media: number;
    faltas: number;
  }[];
}

export function BoletinsGerais({ onVoltar }: BoletinsGeraisProps) {
  const [filtroSerie, setFiltroSerie] = useState('todas');
  const [filtroTurma, setFiltroTurma] = useState('todas');
  const [busca, setBusca] = useState('');

  const boletins: BoletimAluno[] = [
    {
      id: '1',
      nomeAluno: 'Maria Silva Santos',
      serie: '3ª série',
      turma: 'A',
      mediaGeral: 8.2,
      situacao: 'aprovado',
      disciplinas: [
        { nome: 'Matemática', nota1: 8.5, nota2: 7.8, nota3: 8.2, nota4: 8.0, media: 8.1, faltas: 2 },
        { nome: 'Português', nota1: 9.0, nota2: 8.5, nota3: 8.8, nota4: 8.7, media: 8.8, faltas: 1 },
        { nome: 'Física', nota1: 7.5, nota2: 8.0, nota3: 7.8, nota4: 8.2, media: 7.9, faltas: 3 }
      ]
    },
    {
      id: '2',
      nomeAluno: 'João Pedro Oliveira',
      serie: '3ª série',
      turma: 'A',
      mediaGeral: 6.8,
      situacao: 'recuperacao',
      disciplinas: [
        { nome: 'Matemática', nota1: 6.0, nota2: 6.5, nota3: 7.0, nota4: 6.8, media: 6.6, faltas: 5 },
        { nome: 'Português', nota1: 7.5, nota2: 7.0, nota3: 7.2, nota4: 7.3, media: 7.3, faltas: 2 },
        { nome: 'Física', nota1: 5.5, nota2: 6.0, nota3: 6.5, nota4: 6.2, media: 6.1, faltas: 4 }
      ]
    },
    {
      id: '3',
      nomeAluno: 'Ana Carolina Lima',
      serie: '2ª série',
      turma: 'B',
      mediaGeral: 9.1,
      situacao: 'aprovado',
      disciplinas: [
        { nome: 'Matemática', nota1: 9.5, nota2: 9.0, nota3: 9.2, nota4: 9.0, media: 9.2, faltas: 0 },
        { nome: 'Português', nota1: 8.8, nota2: 9.2, nota3: 9.0, nota4: 9.1, media: 9.0, faltas: 1 },
        { nome: 'História', nota1: 9.0, nota2: 9.5, nota3: 8.8, nota4: 9.2, media: 9.1, faltas: 0 }
      ]
    }
  ];

  const getSituacaoColor = (situacao: string) => {
    switch (situacao) {
      case 'aprovado': return 'bg-green-100 text-green-700';
      case 'recuperacao': return 'bg-yellow-100 text-yellow-700';
      case 'reprovado': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getMediaColor = (media: number) => {
    if (media >= 7) return 'text-green-600';
    if (media >= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const boletinsFiltrados = boletins.filter(boletim => {
    const matchBusca = boletim.nomeAluno.toLowerCase().includes(busca.toLowerCase());
    const matchSerie = filtroSerie === 'todas' || boletim.serie === filtroSerie;
    const matchTurma = filtroTurma === 'todas' || boletim.turma === filtroTurma;
    return matchBusca && matchSerie && matchTurma;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
            <p className="text-sm text-gray-600">Visualizar boletins de todos os alunos</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Buscar Aluno</label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      placeholder="Nome do aluno..."
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Série</label>
                  <Select value={filtroSerie} onValueChange={setFiltroSerie}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as séries</SelectItem>
                      <SelectItem value="1ª série">1ª série</SelectItem>
                      <SelectItem value="2ª série">2ª série</SelectItem>
                      <SelectItem value="3ª série">3ª série</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Turma</label>
                  <Select value={filtroTurma} onValueChange={setFiltroTurma}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as turmas</SelectItem>
                      <SelectItem value="A">Turma A</SelectItem>
                      <SelectItem value="B">Turma B</SelectItem>
                      <SelectItem value="C">Turma C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar Tudo
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Boletins */}
          <div className="space-y-4">
            {boletinsFiltrados.map((boletim) => (
              <Card key={boletim.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">{boletim.nomeAluno}</h3>
                      <p className="text-sm text-gray-600">
                        {boletim.serie} - Turma {boletim.turma}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Média Geral</p>
                        <p className={`font-bold ${getMediaColor(boletim.mediaGeral)}`}>
                          {boletim.mediaGeral.toFixed(1)}
                        </p>
                      </div>
                      <Badge className={getSituacaoColor(boletim.situacao)}>
                        {boletim.situacao}
                      </Badge>
                    </div>
                  </div>

                  {/* Disciplinas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    {boletim.disciplinas.map((disciplina, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <h4 className="font-medium text-sm mb-2">{disciplina.nome}</h4>
                        <div className="flex justify-between items-center text-xs text-gray-600 mb-1">
                          <span>1º Bim: {disciplina.nota1}</span>
                          <span>2º Bim: {disciplina.nota2}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-600 mb-2">
                          <span>3º Bim: {disciplina.nota3}</span>
                          <span>4º Bim: {disciplina.nota4}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Média:</span>
                          <span className={`text-sm font-bold ${getMediaColor(disciplina.media)}`}>
                            {disciplina.media.toFixed(1)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Faltas: {disciplina.faltas}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-1" />
                      Visualizar
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-1" />
                      Baixar PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {boletinsFiltrados.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Search className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="font-medium text-gray-900 mb-2">Nenhum boletim encontrado</h3>
                <p className="text-gray-600">
                  Tente ajustar os filtros ou a busca para encontrar os boletins desejados.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}