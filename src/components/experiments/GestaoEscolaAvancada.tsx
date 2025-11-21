import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ArrowLeft, Plus, Edit2, Trash2, BookOpen, Users, GraduationCap, Loader2, RefreshCw, UserCheck, Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface GestaoEscolaAvancadaProps {
  onVoltar: () => void;
}

// Interfaces atualizadas para nova lógica
interface Disciplina {
  id: string;
  nome: string;
  descricao: string;
  cargaHoraria: number;
  ativa: boolean;
  criadaEm?: string;
}

interface Professor {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  ultimoLogin?: string;
}

interface VinculoProfessorDisciplina {
  professorId: string;
  professorNome: string;
  disciplinaId: string;
  disciplinaNome: string;
}

interface SerieAvancada {
  id: string;
  nome: string;
  segmento: 'fundamental' | 'medio';
  disciplinas: {
    disciplinaId: string;
    disciplinaNome: string;
    professores: VinculoProfessorDisciplina[];
  }[];
  totalAlunos: number;
  ativa: boolean;
  criadaEm?: string;
}

const segmentosDisponiveis = [
  { value: 'fundamental', label: 'Ensino Fundamental' },
  { value: 'medio', label: 'Ensino Médio' }
];

const seriesPadrao = {
  fundamental: [
    '5º ano - Ensino Fundamental',
    '6º ano - Ensino Fundamental', 
    '7º ano - Ensino Fundamental',
    '8º ano - Ensino Fundamental',
    '9º ano - Ensino Fundamental'
  ],
  medio: [
    '1ª série - Ensino Médio',
    '2ª série - Ensino Médio',
    '3ª série - Ensino Médio'
  ]
};

export function GestaoEscolaAvancada({ onVoltar }: GestaoEscolaAvancadaProps) {
  const [abaSelecionada, setAbaSelecionada] = useState<'disciplinas' | 'professores' | 'series'>('series');
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<any>(null);
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);

  // Estados para dados
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [series, setSeries] = useState<SerieAvancada[]>([]);

  // Estados para formulário de série
  const [formSerie, setFormSerie] = useState({
    nome: '',
    segmento: '' as 'fundamental' | 'medio' | '',
    disciplinasSelecionadas: [] as string[],
    vinculosProfessores: {} as Record<string, string[]> // disciplinaId -> professorIds[]
  });

  // Carregar dados do backend
  const carregarDisciplinas = async () => {
    try {
      console.log('[GESTAO_AVANCADA] Carregando disciplinas...');
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/disciplinas`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[GESTAO_AVANCADA] Disciplinas recebidas:', data);
        
        let disciplinasArray = [];
        if (data.success && Array.isArray(data.disciplinas)) {
          disciplinasArray = data.disciplinas;
        } else if (Array.isArray(data)) {
          disciplinasArray = data;
        }

        setDisciplinas(disciplinasArray.map((d: any) => ({
          id: d.id || Math.random().toString(),
          nome: d.nome || 'Disciplina sem nome',
          descricao: d.descricao || '',
          cargaHoraria: d.cargaHoraria || d.carga_horaria || 1,
          ativa: d.ativa !== undefined ? d.ativa : true,
          criadaEm: d.criadaEm || d.created_at
        })));
      } else {
        console.warn('[GESTAO_AVANCADA] Erro ao carregar disciplinas:', response.status);
        setDisciplinas([]);
      }
    } catch (error) {
      console.error('[GESTAO_AVANCADA] Erro ao carregar disciplinas:', error);
      setDisciplinas([]);
    }
  };

  const carregarProfessores = async () => {
    try {
      console.log('[GESTAO_AVANCADA] Carregando professores...');
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios?tipo=professor`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[GESTAO_AVANCADA] Professores recebidos:', data);
        
        let professoresArray = [];
        if (data.success && Array.isArray(data.usuarios)) {
          professoresArray = data.usuarios.filter((u: any) => 
            u.tipo === 'professor' || u.tipo === 'professor_conteudista'
          );
        } else if (Array.isArray(data)) {
          professoresArray = data.filter((u: any) => 
            u.tipo === 'professor' || u.tipo === 'professor_conteudista'
          );
        }

        setProfessores(professoresArray
          .filter(p => p.id || p.user_id)
          .map((p: any) => ({
            id: p.id || p.user_id,
            nome: p.nome || p.name || 'Professor sem nome',
            email: p.email || 'Email não informado',
            ativo: p.ativo !== undefined ? p.ativo : true,
            ultimoLogin: p.ultimoLogin || p.last_login
          })));
      } else {
        console.warn('[GESTAO_AVANCADA] Erro ao carregar professores:', response.status);
        setProfessores([]);
      }
    } catch (error) {
      console.error('[GESTAO_AVANCADA] Erro ao carregar professores:', error);
      setProfessores([]);
    }
  };

  const carregarSeries = async () => {
    try {
      console.log('[GESTAO_AVANCADA] Carregando séries...');
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/series`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[GESTAO_AVANCADA] Séries recebidas:', data);
        
        let seriesArray = [];
        if (data.success && Array.isArray(data.series)) {
          seriesArray = data.series;
        } else if (Array.isArray(data)) {
          seriesArray = data;
        }

        setSeries(seriesArray.map((s: any) => ({
          id: s.id || Math.random().toString(),
          nome: s.nome || 'Série sem nome',
          segmento: s.segmento || 'fundamental',
          disciplinas: s.disciplinas || [],
          totalAlunos: s.totalAlunos || 0,
          ativa: s.ativa !== undefined ? s.ativa : true,
          criadaEm: s.criadaEm || s.created_at
        })));
      } else {
        console.warn('[GESTAO_AVANCADA] Erro ao carregar séries:', response.status);
        setSeries([]);
      }
    } catch (error) {
      console.error('[GESTAO_AVANCADA] Erro ao carregar séries:', error);
      setSeries([]);
    }
  };

  const carregarTodosDados = async () => {
    setCarregando(true);
    try {
      await Promise.all([
        carregarDisciplinas(),
        carregarProfessores(),
        carregarSeries()
      ]);
    } catch (error) {
      console.error('[GESTAO_AVANCADA] Erro ao carregar dados:', error);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarTodosDados();
  }, []);

  // Funções de manipulação de séries
  const abrirModalSerie = (serie?: SerieAvancada) => {
    if (serie) {
      // Editar série existente
      setEditando(serie);
      setFormSerie({
        nome: serie.nome,
        segmento: serie.segmento,
        disciplinasSelecionadas: serie.disciplinas.map(d => d.disciplinaId),
        vinculosProfessores: serie.disciplinas.reduce((acc, disc) => {
          acc[disc.disciplinaId] = disc.professores.map(p => p.professorId);
          return acc;
        }, {} as Record<string, string[]>)
      });
    } else {
      // Nova série
      setEditando(null);
      setFormSerie({
        nome: '',
        segmento: '',
        disciplinasSelecionadas: [],
        vinculosProfessores: {}
      });
    }
    setModalAberto(true);
  };

  const handleDisciplinaChange = (disciplinaId: string, checked: boolean) => {
    setFormSerie(prev => {
      const novasDisciplinas = checked 
        ? [...prev.disciplinasSelecionadas, disciplinaId]
        : prev.disciplinasSelecionadas.filter(id => id !== disciplinaId);
      
      // Se removendo disciplina, limpar vínculos de professores
      const novosVinculos = { ...prev.vinculosProfessores };
      if (!checked) {
        delete novosVinculos[disciplinaId];
      }
      
      return {
        ...prev,
        disciplinasSelecionadas: novasDisciplinas,
        vinculosProfessores: novosVinculos
      };
    });
  };

  const handleProfessorChange = (disciplinaId: string, professorId: string, checked: boolean) => {
    setFormSerie(prev => {
      const vinculos = prev.vinculosProfessores[disciplinaId] || [];
      const novosVinculos = checked
        ? [...vinculos, professorId]
        : vinculos.filter(id => id !== professorId);
      
      return {
        ...prev,
        vinculosProfessores: {
          ...prev.vinculosProfessores,
          [disciplinaId]: novosVinculos
        }
      };
    });
  };

  const salvarSerie = async () => {
    if (!formSerie.nome.trim()) {
      toast.error('Nome da série é obrigatório');
      return;
    }

    if (!formSerie.segmento) {
      toast.error('Segmento é obrigatório');
      return;
    }

    if (formSerie.disciplinasSelecionadas.length === 0) {
      toast.error('Pelo menos uma disciplina deve ser selecionada');
      return;
    }

    // Verificar se todas as disciplinas têm pelo menos um professor
    for (const discId of formSerie.disciplinasSelecionadas) {
      const professoresDisciplina = formSerie.vinculosProfessores[discId] || [];
      if (professoresDisciplina.length === 0) {
        const disciplina = disciplinas.find(d => d.id === discId);
        toast.error(`A disciplina "${disciplina?.nome}" deve ter pelo menos um professor`);
        return;
      }
    }

    setSalvando(true);
    try {
      // Montar dados da série
      const dadosSerie = {
        nome: formSerie.nome.trim(),
        segmento: formSerie.segmento,
        disciplinas: formSerie.disciplinasSelecionadas.map(discId => {
          const disciplina = disciplinas.find(d => d.id === discId);
          const professoresDisciplina = formSerie.vinculosProfessores[discId] || [];
          
          return {
            disciplinaId: discId,
            disciplinaNome: disciplina?.nome || '',
            professores: professoresDisciplina.map(profId => {
              const professor = professores.find(p => p.id === profId);
              return {
                professorId: profId,
                professorNome: professor?.nome || '',
                disciplinaId: discId,
                disciplinaNome: disciplina?.nome || ''
              };
            })
          };
        }),
        ativa: true,
        totalAlunos: editando?.totalAlunos || 0
      };

      console.log('[GESTAO_AVANCADA] Salvando série:', dadosSerie);

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/series${editando ? `/${editando.id}` : ''}`;
      const method = editando ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosSerie)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }

      const resultado = await response.json();
      console.log('[GESTAO_AVANCADA] Série salva:', resultado);

      // Atualizar lista local
      if (editando) {
        setSeries(prev => prev.map(s => s.id === editando.id ? { ...s, ...dadosSerie } : s));
        toast.success('Série atualizada com sucesso!');
      } else {
        const novaSerie = { id: resultado.id || Date.now().toString(), ...dadosSerie };
        setSeries(prev => [...prev, novaSerie]);
        toast.success('Série criada com sucesso!');
      }

      setModalAberto(false);
      carregarSeries(); // Recarregar para garantir sincronia
    } catch (error) {
      console.error('[GESTAO_AVANCADA] Erro ao salvar série:', error);
      toast.error(`Erro ao salvar série: ${error.message}`);
    } finally {
      setSalvando(false);
    }
  };

  const excluirSerie = async (id: string) => {
    try {
      await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/series/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });
      setSeries(prev => prev.filter(s => s.id !== id));
      toast.success('Série removida com sucesso!');
    } catch (error) {
      console.error('[GESTAO_AVANCADA] Erro ao excluir série:', error);
      toast.error('Erro ao excluir série');
    }
  };

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Carregando dados da gestão escolar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onVoltar}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Gestão Escolar Avançada</h1>
            <p className="text-sm text-gray-600">
              Sistema de vinculação específica: Série → Segmento → Disciplinas → Professores
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        <Tabs value={abaSelecionada} onValueChange={(value: any) => setAbaSelecionada(value)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="series" className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              Séries & Vínculos
            </TabsTrigger>
            <TabsTrigger value="disciplinas" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Disciplinas
            </TabsTrigger>
            <TabsTrigger value="professores" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Professores
            </TabsTrigger>
          </TabsList>

          {/* Aba Séries & Vínculos */}
          <TabsContent value="series" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">Gestão de Séries e Vínculos</h2>
                <p className="text-sm text-gray-600">
                  Configure séries, suas disciplinas e professores responsáveis
                </p>
              </div>
              <Button onClick={() => abrirModalSerie()}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Série
              </Button>
            </div>

            {/* Lista de Séries */}
            <div className="grid gap-4">
              {series.map((serie) => (
                <Card key={serie.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <GraduationCap className="w-5 h-5" />
                          {serie.nome}
                        </CardTitle>
                        <div className="flex items-center gap-4 mt-2">
                          <Badge variant="outline">
                            {segmentosDisponiveis.find(s => s.value === serie.segmento)?.label}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {serie.disciplinas.length} disciplina(s)
                          </span>
                          <span className="text-sm text-gray-500">
                            {serie.totalAlunos} aluno(s)
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => abrirModalSerie(serie)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => excluirSerie(serie.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {serie.disciplinas.map((disc, index) => (
                        <div key={index} className="border rounded-lg p-3 bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium">{disc.disciplinaNome}</h4>
                            <Badge variant="secondary">
                              {disc.professores.length} professor(es)
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {disc.professores.map((vinculo, profIndex) => (
                              <Badge key={profIndex} variant="outline" className="text-xs">
                                <UserCheck className="w-3 h-3 mr-1" />
                                {vinculo.professorNome}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                      
                      {serie.disciplinas.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">
                          Nenhuma disciplina configurada para esta série
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {series.length === 0 && (
                <Card>
                  <CardContent className="text-center py-8">
                    <GraduationCap className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Nenhuma série cadastrada
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Crie sua primeira série para começar a organizar as disciplinas e professores
                    </p>
                    <Button onClick={() => abrirModalSerie()}>
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Primeira Série
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Aba Disciplinas */}
          <TabsContent value="disciplinas" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">Disciplinas Cadastradas</h2>
                <p className="text-sm text-gray-600">
                  {disciplinas.length} disciplina(s) disponível(is) para vinculação
                </p>
              </div>
              <Button onClick={carregarDisciplinas} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {disciplinas.map((disciplina) => (
                <Card key={disciplina.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium">{disciplina.nome}</h3>
                      <Badge variant={disciplina.ativa ? "default" : "secondary"}>
                        {disciplina.ativa ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                    {disciplina.descricao && (
                      <p className="text-sm text-gray-600 mb-2">{disciplina.descricao}</p>
                    )}
                    <div className="text-xs text-gray-500">
                      Carga horária: {disciplina.cargaHoraria}h
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {disciplinas.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <BookOpen className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhuma disciplina encontrada
                  </h3>
                  <p className="text-gray-600">
                    Cadastre disciplinas na gestão escolar tradicional primeiro
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Aba Professores */}
          <TabsContent value="professores" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">Professores Cadastrados</h2>
                <p className="text-sm text-gray-600">
                  {professores.length} professor(es) disponível(is) para vinculação
                </p>
              </div>
              <Button onClick={carregarProfessores} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {professores.map((professor) => (
                <Card key={professor.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium">{professor.nome}</h3>
                      <Badge variant={professor.ativo ? "default" : "secondary"}>
                        {professor.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{professor.email}</p>
                    {professor.ultimoLogin && (
                      <div className="text-xs text-gray-500">
                        Último login: {new Date(professor.ultimoLogin).toLocaleDateString()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {professores.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhum professor encontrado
                  </h3>
                  <p className="text-gray-600">
                    Cadastre professores no painel administrativo primeiro
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de Criação/Edição de Série */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editando ? `Editar Série: ${editando.nome}` : 'Nova Série'}
            </DialogTitle>
            <DialogDescription>
              Configure a série, selecione disciplinas e defina professores responsáveis
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Informações básicas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Série *</Label>
                <Input
                  id="nome"
                  value={formSerie.nome}
                  onChange={(e) => setFormSerie(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: 1ª série - Ensino Médio"
                />
              </div>
              <div className="space-y-2">
                <Label>Segmento *</Label>
                <Select
                  value={formSerie.segmento}
                  onValueChange={(value: 'fundamental' | 'medio') => 
                    setFormSerie(prev => ({ ...prev, segmento: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o segmento" />
                  </SelectTrigger>
                  <SelectContent>
                    {segmentosDisponiveis.map(segmento => (
                      <SelectItem key={segmento.value} value={segmento.value}>
                        {segmento.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sugestões de nome baseadas no segmento */}
            {formSerie.segmento && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium mb-2">Sugestões de nome:</h4>
                <div className="flex flex-wrap gap-2">
                  {seriesPadrao[formSerie.segmento].map((sugestao) => (
                    <Button
                      key={sugestao}
                      variant="outline"
                      size="sm"
                      onClick={() => setFormSerie(prev => ({ ...prev, nome: sugestao }))}
                    >
                      {sugestao}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Seleção de disciplinas */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Disciplinas da Série</h3>
              
              {disciplinas.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto border rounded-lg p-4">
                  {disciplinas
                    .filter(d => d.ativa)
                    .map((disciplina) => (
                      <div key={disciplina.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`disc-${disciplina.id}`}
                          checked={formSerie.disciplinasSelecionadas.includes(disciplina.id)}
                          onCheckedChange={(checked) => 
                            handleDisciplinaChange(disciplina.id, !!checked)
                          }
                        />
                        <Label
                          htmlFor={`disc-${disciplina.id}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {disciplina.nome}
                        </Label>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BookOpen className="w-8 h-8 mx-auto mb-2" />
                  <p>Nenhuma disciplina disponível</p>
                  <p className="text-xs">Cadastre disciplinas primeiro</p>
                </div>
              )}
            </div>

            {/* Vinculação de professores por disciplina */}
            {formSerie.disciplinasSelecionadas.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Professores por Disciplina</h3>
                
                {formSerie.disciplinasSelecionadas.map((disciplinaId) => {
                  const disciplina = disciplinas.find(d => d.id === disciplinaId);
                  const professoresSelecionados = formSerie.vinculosProfessores[disciplinaId] || [];
                  
                  return (
                    <Card key={disciplinaId} className="bg-gray-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <BookOpen className="w-4 h-4" />
                          {disciplina?.nome}
                          <Badge variant="outline" className="ml-auto">
                            {professoresSelecionados.length} professor(es)
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {professores.length > 0 ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                            {professores
                              .filter(p => p.ativo)
                              .map((professor) => (
                                <div key={professor.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`prof-${disciplinaId}-${professor.id}`}
                                    checked={professoresSelecionados.includes(professor.id)}
                                    onCheckedChange={(checked) => 
                                      handleProfessorChange(disciplinaId, professor.id, !!checked)
                                    }
                                  />
                                  <Label
                                    htmlFor={`prof-${disciplinaId}-${professor.id}`}
                                    className="text-sm font-normal cursor-pointer"
                                  >
                                    {professor.nome}
                                  </Label>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-500">
                            <Users className="w-6 h-6 mx-auto mb-1" />
                            <p className="text-xs">Nenhum professor disponível</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={salvarSerie} disabled={salvando}>
              {salvando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                <>
                  <Settings className="w-4 h-4 mr-2" />
                  {editando ? 'Atualizar' : 'Criar'} Série
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}