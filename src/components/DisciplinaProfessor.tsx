import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { ArrowLeft, Users, FileText, MessageSquare, Calendar, Upload, Clock, CheckCircle, Edit, BarChart3, Video, Calculator, Download } from 'lucide-react';
import { PDFViewerProfessor } from './PDFViewerProfessor';
import { ForumProfessor } from './ForumProfessor';
import { FrequenciaProfessor } from './FrequenciaProfessor';
import { AgendaProfessor } from './AgendaProfessor';
import { BoletimProfessor } from './BoletimProfessor';
import { BoletimProfessorAvancado } from './BoletimProfessorAvancado';
import { AgendamentoAulasVivo } from './AgendamentoAulasVivo';
import { AtividadesProfessor } from './AtividadesProfessor';

interface DisciplinaProfessorProps {
  disciplina: any;
  serie: any;
  onVoltar: () => void;
}

interface BimestrePDF {
  id: string;
  nome: string;
  descricao: string;
  pdfUrl?: string;
  totalAlunos: number;
  alunosVisualizaram: number;
  progresso: number;
}

export function DisciplinaProfessor({ disciplina, serie, onVoltar }: DisciplinaProfessorProps) {
  const [abaAtiva, setAbaAtiva] = useState<'conteudo' | 'atividades' | 'forum' | 'frequencia' | 'agenda' | 'boletim' | 'aulas-vivo'>('conteudo');
  const [bimestreSelecionado, setBimestreSelecionado] = useState<BimestrePDF | null>(null);
  const [mostrarConteudo, setMostrarConteudo] = useState(false);
  const [tipoBoletim, setTipoBoletim] = useState<'simples' | 'avancado'>('avancado');

  // Dados dos bimestres para o professor
  const bimestres: BimestrePDF[] = [
    {
      id: 'bim1',
      nome: '1º Bimestre',
      descricao: 'Fundamentos e conceitos básicos da disciplina',
      totalAlunos: serie?.totalAlunos || 30,
      alunosVisualizaram: 28,
      progresso: 85,
      pdfUrl: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf'
    },
    {
      id: 'bim2',
      nome: '2º Bimestre',
      descricao: 'Aprofundamento teórico e aplicações práticas',
      totalAlunos: serie?.totalAlunos || 30,
      alunosVisualizaram: 25,
      progresso: 60
    },
    {
      id: 'bim3',
      nome: '3º Bimestre',
      descricao: 'Projetos integradores e estudos de caso',
      totalAlunos: serie?.totalAlunos || 30,
      alunosVisualizaram: 0,
      progresso: 0
    },
    {
      id: 'bim4',
      nome: '4º Bimestre',
      descricao: 'Síntese, avaliação final e revisão geral',
      totalAlunos: serie?.totalAlunos || 30,
      alunosVisualizaram: 0,
      progresso: 0
    }
  ];

  const abas = [
    { id: 'conteudo', label: 'Conteúdo', icon: FileText },
    { id: 'atividades', label: 'Atividades', icon: Upload },
    { id: 'forum', label: 'Fórum', icon: MessageSquare },
    { id: 'frequencia', label: 'Frequência', icon: Users },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'boletim', label: 'Boletim', icon: BarChart3 },
    { id: 'aulas-vivo', label: 'Aulas ao Vivo', icon: Video },
  ];

  const handleBimestreClick = (bimestre: BimestrePDF) => {
    setBimestreSelecionado(bimestre);
    setMostrarConteudo(true);
  };

  const handleFecharConteudo = () => {
    setMostrarConteudo(false);
    setBimestreSelecionado(null);
  };

  const handleUploadPDF = (bimestreId: string, file: File) => {
    // Implementar upload do PDF
    console.log('Fazendo upload do PDF para o bimestre:', bimestreId, file);
    // Aqui você integraria com o backend para fazer upload do arquivo
  };

  const handleEditarDescricao = (bimestreId: string, descricao: string) => {
    // Implementar edição da descrição
    console.log('Editando descrição do bimestre:', bimestreId, descricao);
    // Aqui você atualizaria a descrição no backend
  };

  const handleRemoverPDF = (bimestreId: string) => {
    // Implementar remoção do PDF
    console.log('Removendo PDF do bimestre:', bimestreId);
    // Aqui você removeria o PDF do backend
  };

  const handleProximoBimestre = () => {
    if (!bimestreSelecionado) return;
    const currentIndex = bimestres.findIndex(b => b.id === bimestreSelecionado.id);
    if (currentIndex < bimestres.length - 1) {
      setBimestreSelecionado(bimestres[currentIndex + 1]);
    }
  };

  const handleAnteriorBimestre = () => {
    if (!bimestreSelecionado) return;
    const currentIndex = bimestres.findIndex(b => b.id === bimestreSelecionado.id);
    if (currentIndex > 0) {
      setBimestreSelecionado(bimestres[currentIndex - 1]);
    }
  };

  const currentIndex = bimestreSelecionado ? 
    bimestres.findIndex(b => b.id === bimestreSelecionado.id) : -1;

  const calcularProgresso = () => {
    return Math.round(bimestres.reduce((acc, bim) => acc + bim.progresso, 0) / bimestres.length);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header da Disciplina */}
      <div className={`${disciplina.cor} border-b`}>
        <div className="px-6 py-8">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onVoltar}
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </div>
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-gray-700">
              {disciplina.icone}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{disciplina.nome}</h1>
              <p className="text-gray-700 mb-4">
                {serie?.nome} - Turma {serie?.turma} • {serie?.totalAlunos} alunos
              </p>
              <div className="flex items-center gap-4">
                <div className="flex-1 max-w-xs">
                  <div className="flex justify-between text-sm text-gray-700 mb-1">
                    <span>Progresso do Conteúdo</span>
                    <span>{calcularProgresso()}%</span>
                  </div>
                  <Progress value={calcularProgresso()} className="h-2" />
                </div>
                <Badge variant="secondary">
                  Professor: {disciplina.professor}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6">
          <div className="flex space-x-8">
            {abas.map((aba) => {
              const Icon = aba.icon;
              return (
                <button
                  key={aba.id}
                  onClick={() => setAbaAtiva(aba.id as any)}
                  className={`flex items-center gap-2 py-4 border-b-2 font-medium transition-colors ${
                    abaAtiva === aba.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {aba.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Conteúdo das Abas */}
      <div className="flex">
        {/* Lista Principal */}
        <div className={`${mostrarConteudo ? 'w-1/3' : 'w-full'} transition-all duration-300`}>
          <div className="p-6">
            {abaAtiva === 'conteudo' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Material de Estudo por Bimestre</h2>
                  <Badge variant="outline" className="gap-1">
                    <FileText className="w-3 h-3" />
                    Sistema PDF
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bimestres.map((bimestre) => (
                    <Card 
                      key={bimestre.id} 
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        bimestreSelecionado?.id === bimestre.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                      }`}
                      onClick={() => handleBimestreClick(bimestre)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-red-500" />
                            <span className="font-medium">{bimestre.nome}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {bimestre.pdfUrl ? (
                              <Badge variant="default" className="gap-1">
                                <CheckCircle className="w-3 h-3" />
                                PDF
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1">
                                <Upload className="w-3 h-3" />
                                Enviar
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mb-3">{bimestre.descricao}</p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Progress value={bimestre.progresso} className="flex-1 h-2" />
                            <span className="text-xs text-gray-600">{bimestre.progresso}%</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>👥 {bimestre.alunosVisualizaram}/{bimestre.totalAlunos} visualizaram</span>
                            <span>{Math.round((bimestre.alunosVisualizaram / bimestre.totalAlunos) * 100)}%</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {abaAtiva === 'atividades' && (
              <AtividadesProfessor disciplina={disciplina} serie={serie} />
            )}

            {abaAtiva === 'forum' && (
              <ForumProfessor disciplina={disciplina} serie={serie} />
            )}

            {abaAtiva === 'frequencia' && (
              <FrequenciaProfessor disciplina={disciplina} serie={serie} />
            )}

            {abaAtiva === 'agenda' && (
              <AgendaProfessor disciplina={disciplina} serie={serie} />
            )}

            {abaAtiva === 'boletim' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Sistema de Avaliação</h2>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={tipoBoletim === 'simples' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTipoBoletim('simples')}
                      className="gap-2"
                    >
                      <BarChart3 className="w-4 h-4" />
                      Simples
                    </Button>
                    <Button
                      variant={tipoBoletim === 'avancado' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTipoBoletim('avancado')}
                      className="gap-2"
                    >
                      <Calculator className="w-4 h-4" />
                      AV1/AV2/REC
                    </Button>
                  </div>
                </div>
                
                {tipoBoletim === 'simples' && (
                  <BoletimProfessor disciplina={disciplina} serie={serie} />
                )}
                
                {tipoBoletim === 'avancado' && (
                  <BoletimProfessorAvancado disciplina={disciplina} serie={serie} />
                )}
              </div>
            )}

            {abaAtiva === 'aulas-vivo' && (
              <AgendamentoAulasVivo 
                disciplinaId={disciplina.id}
                nomeDisciplina={disciplina.nome}
                professorId="professor-1"
              />
            )}
          </div>
        </div>

        {/* Viewer de PDF */}
        {mostrarConteudo && bimestreSelecionado && (
          <div className="w-2/3 border-l border-gray-200">
            <PDFViewerProfessor 
              bimestre={bimestreSelecionado}
              onClose={handleFecharConteudo}
              onProximo={handleProximoBimestre}
              onAnterior={handleAnteriorBimestre}
              hasProximo={currentIndex >= 0 && currentIndex < bimestres.length - 1}
              hasAnterior={currentIndex > 0}
              onUploadPDF={handleUploadPDF}
              onEditarDescricao={handleEditarDescricao}
              onRemoverPDF={handleRemoverPDF}
            />
          </div>
        )}
      </div>
    </div>
  );
}