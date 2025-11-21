import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { ArrowLeft, Plus, Edit2, Trash2, BookOpen, GraduationCap, Loader2, RefreshCw, UserCheck, Users, Save, Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { GerenciarUsuarios } from './GerenciarUsuarios';

interface GestaoEscolaSimplificadaProps {
  onVoltar: () => void;
}

interface DisciplinaSimples {
  id: string;
  nome: string;
  segmento: 'fundamental' | 'medio';
  ativa: boolean;
  criadaEm?: string;
}

interface SerieSimples {
  id: string;
  nome: string;
  segmento: 'fundamental' | 'medio';
  totalAlunos: number;
  ativa: boolean;
  criadaEm?: string;
}

interface VinculoCompleto {
  id: string;
  nome: string;
  segmento: 'fundamental' | 'medio';
  disciplinas: {
    disciplinaId: string;
    disciplinaNome: string;
    professores: {
      professorId: string;
      professorNome: string;
    }[];
  }[];
  totalAlunos: number;
  ativa: boolean;
}

const segmentosDisponiveis = [
  { value: 'fundamental', label: 'Ensino Fundamental' },
  { value: 'medio', label: 'Ensino Médio' }
];

export function GestaoEscolaSimplificada({ onVoltar }: GestaoEscolaSimplificadaProps) {
  const [abaSelecionada, setAbaSelecionada] = useState<'disciplinas' | 'series' | 'vinculos' | 'usuarios'>('disciplinas');
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<any>(null);
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);

  // Dados simplificados
  const [disciplinas, setDisciplinas] = useState<DisciplinaSimples[]>([]);
  const [series, setSeries] = useState<SerieSimples[]>([]);
  const [vinculosCompletos, setVinculosCompletos] = useState<VinculoCompleto[]>([]);

  // Estados do formulário
  const [formData, setFormData] = useState({
    nome: '',
    segmento: '' as 'fundamental' | 'medio' | ''
  });

  // Carregar dados do backend
  const carregarDisciplinas = async () => {
    try {
      console.log('[GESTAO_SIMPL] Carregando disciplinas...');
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/disciplinas`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[GESTAO_SIMPL] Disciplinas recebidas:', data);
        
        let disciplinasArray = [];
        if (data.success && Array.isArray(data.disciplinas)) {
          disciplinasArray = data.disciplinas;
        } else if (Array.isArray(data)) {
          disciplinasArray = data;
        }

        setDisciplinas(disciplinasArray.map((d: any) => ({
          id: d.id || Math.random().toString(),
          nome: d.nome || 'Disciplina sem nome',
          segmento: d.segmento || 'fundamental',
          ativa: d.ativa !== undefined ? d.ativa : true,
          criadaEm: d.criadaEm || d.created_at
        })));
      } else {
        console.warn('[GESTAO_SIMPL] Erro ao carregar disciplinas:', response.status);
        setDisciplinas([]);
      }
    } catch (error) {
      console.error('[GESTAO_SIMPL] Erro ao carregar disciplinas:', error);
      setDisciplinas([]);
    }
  };

  const carregarSeries = async () => {
    try {
      console.log('[GESTAO_SIMPL] Carregando séries...');
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/series`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[GESTAO_SIMPL] Séries recebidas:', data);
        
        let seriesArray = [];
        if (data.success && Array.isArray(data.series)) {
          seriesArray = data.series;
        } else if (Array.isArray(data)) {
          seriesArray = data;
        }

        // Criar séries básicas se não existirem
        if (seriesArray.length === 0) {
          const seriesBasicas = [
            { nome: '5º ano - Ensino Fundamental', segmento: 'fundamental' },
            { nome: '6º ano - Ensino Fundamental', segmento: 'fundamental' },
            { nome: '7º ano - Ensino Fundamental', segmento: 'fundamental' },
            { nome: '8º ano - Ensino Fundamental', segmento: 'fundamental' },
            { nome: '9º ano - Ensino Fundamental', segmento: 'fundamental' },
            { nome: '1ª série - Ensino Médio', segmento: 'medio' },
            { nome: '2ª série - Ensino Médio', segmento: 'medio' },
            { nome: '3ª série - Ensino Médio', segmento: 'medio' }
          ];
          seriesArray = seriesBasicas.map((s, index) => ({
            id: (index + 1).toString(),
            ...s,
            totalAlunos: 0,
            ativa: true
          }));
        }

        setSeries(seriesArray.map((s: any) => ({
          id: s.id || Math.random().toString(),
          nome: s.nome || 'Série sem nome',
          segmento: s.segmento || 'fundamental',
          totalAlunos: s.totalAlunos || s.total_alunos || 0,
          ativa: s.ativa !== undefined ? s.ativa : true,
          criadaEm: s.criadaEm || s.created_at
        })));
      } else {
        console.warn('[GESTAO_SIMPL] Erro ao carregar séries:', response.status);
        setSeries([]);
      }
    } catch (error) {
      console.error('[GESTAO_SIMPL] Erro ao carregar séries:', error);
      setSeries([]);
    }
  };

  const carregarVinculos = async () => {
    try {
      console.log('[GESTAO_SIMPL] Carregando vínculos completos...');
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/series`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[GESTAO_SIMPL] Vínculos recebidos:', data);
        
        let seriesArray = [];
        if (data.success && Array.isArray(data.series)) {
          seriesArray = data.series;
        } else if (Array.isArray(data)) {
          seriesArray = data;
        }

        // Filtrar apenas séries que têm disciplinas vinculadas (séries completas)
        const vinculosComDisciplinas = seriesArray.filter((s: any) => 
          s.disciplinas && Array.isArray(s.disciplinas) && s.disciplinas.length > 0
        );

        setVinculosCompletos(vinculosComDisciplinas.map((s: any) => ({
          id: s.id || Math.random().toString(),
          nome: s.nome || 'Série sem nome',
          segmento: s.segmento || 'fundamental',
          disciplinas: s.disciplinas || [],
          totalAlunos: s.totalAlunos || 0,
          ativa: s.ativa !== undefined ? s.ativa : true
        })));
      }
    } catch (error) {
      console.error('[GESTAO_SIMPL] Erro ao carregar vínculos:', error);
      setVinculosCompletos([]);
    }
  };

  const carregarTodosDados = async () => {
    setCarregando(true);
    try {
      await Promise.all([
        carregarDisciplinas(),
        carregarSeries(),
        carregarVinculos()
      ]);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarTodosDados();
  }, []);

  const salvarNoBackend = async (dados: any, tipo: string, id?: string) => {
    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/${tipo}${id ? `/${id}` : ''}`;
      const method = id ? 'PUT' : 'POST';
      
      console.log('[GESTAO_SIMPL] Salvando:', { url, method, dados, tipo });

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dados)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[GESTAO_SIMPL] Erro ao salvar:', error);
      throw error;
    }
  };

  const handleSalvar = async () => {
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (!formData.segmento) {
      toast.error('Segmento é obrigatório');
      return;
    }

    setSalvando(true);
    
    try {
      const dadosParaSalvar = {
        nome: formData.nome.trim(),
        segmento: formData.segmento,
        ativa: true
      };

      if (abaSelecionada === 'disciplinas') {
        if (editando) {
          await salvarNoBackend(dadosParaSalvar, 'disciplinas', editando.id);
          setDisciplinas(prev => prev.map(d => d.id === editando.id ? { ...d, ...dadosParaSalvar } : d));
          toast.success('Disciplina atualizada com sucesso!');
        } else {
          const response = await salvarNoBackend(dadosParaSalvar, 'disciplinas');
          const nova = { id: response.id || Date.now().toString(), ...dadosParaSalvar };
          setDisciplinas(prev => [...prev, nova]);
          toast.success('Disciplina criada com sucesso!');
        }
        carregarDisciplinas();
        
      } else if (abaSelecionada === 'series') {
        const dadosComTotalAlunos = { ...dadosParaSalvar, totalAlunos: editando?.totalAlunos || 0 };
        
        if (editando) {
          await salvarNoBackend(dadosComTotalAlunos, 'series', editando.id);
          setSeries(prev => prev.map(s => s.id === editando.id ? { ...s, ...dadosComTotalAlunos } : s));
          toast.success('Série atualizada com sucesso!');
        } else {
          const response = await salvarNoBackend(dadosComTotalAlunos, 'series');
          const nova = { id: response.id || Date.now().toString(), ...dadosComTotalAlunos };
          setSeries(prev => [...prev, nova]);
          toast.success('Série criada com sucesso!');
        }
        carregarSeries();
      }
      
      setModalAberto(false);
      setEditando(null);
      setFormData({ nome: '', segmento: '' });
    } catch (error) {
      console.error('[GESTAO_SIMPL] Erro ao salvar:', error);
      toast.error(`Erro ao salvar: ${error.message}`);
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async (id: string) => {
    try {
      if (abaSelecionada === 'disciplinas') {
        await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/disciplinas/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        });
        setDisciplinas(prev => prev.filter(d => d.id !== id));
        toast.success('Disciplina removida com sucesso!');
      } else if (abaSelecionada === 'series') {
        await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/series/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        });
        setSeries(prev => prev.filter(s => s.id !== id));
        toast.success('Série removida com sucesso!');
      }
    } catch (error) {
      console.error('[GESTAO_SIMPL] Erro ao excluir:', error);
      toast.error('Erro ao excluir item');
    }
  };

  const handleEditar = (item: any) => {
    setEditando(item);
    setFormData({
      nome: item.nome,
      segmento: item.segmento
    });
    setModalAberto(true);
  };

  const handleNovo = () => {
    setEditando(null);
    setFormData({ nome: '', segmento: '' });
    setModalAberto(true);
  };

  const abas = [
    { id: 'disciplinas', label: 'Disciplinas', icon: BookOpen, desc: 'Apenas nome + segmento' },
    { id: 'series', label: 'Séries', icon: GraduationCap, desc: 'Apenas nome + segmento' },
    { id: 'vinculos', label: 'Vínculos Existentes', icon: UserCheck, desc: 'Criados via cadastro de professores' },
    { id: 'usuarios', label: 'Usuários', icon: Settings, desc: 'Gerenciar todos os usuários do sistema' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
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
              <h1 className="font-semibold text-gray-900">✨ Gestão Escolar Simplificada</h1>
              <p className="text-sm text-gray-600">Cadastros básicos + visualização de vínculos</p>
            </div>
          </div>
          <Button
            onClick={carregarTodosDados}
            disabled={carregando}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          {/* Aviso importante */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <UserCheck className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900 mb-1">Nova Arquitetura de Vinculação</h3>
                <p className="text-sm text-blue-700 mb-2">
                  Agora os vínculos Professor → Disciplina → Série são criados centralizadamente durante o <strong>cadastro do professor</strong>.
                </p>
                <div className="text-xs text-blue-600 space-y-1">
                  <div>• <strong>Disciplinas & Séries:</strong> Cadastro básico (apenas nome + segmento)</div>
                  <div>• <strong>Vínculos:</strong> Criados automaticamente no cadastro de professores</div>
                  <div>• <strong>Resultado:</strong> Eliminação de erros e vínculos incorretos</div>
                </div>
              </div>
            </div>
          </div>

          {/* Abas */}
          <div className="flex space-x-1 mb-6">
            {(abas || []).map((aba) => {
              const Icon = aba.icon;
              return (
                <button
                  key={aba.id}
                  onClick={() => setAbaSelecionada(aba.id as any)}
                  className={`flex flex-col items-center gap-1 px-4 py-3 rounded-lg transition-colors ${ 
                    abaSelecionada === aba.id 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{aba.label}</span>
                  </div>
                  <span className="text-xs opacity-75">{aba.desc}</span>
                </button>
              );
            })}
          </div>

          {/* Conteúdo */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>
                  {abaSelecionada === 'disciplinas' && `Disciplinas (${disciplinas?.length || 0})`}
                  {abaSelecionada === 'series' && `Séries (${series?.length || 0})`}
                  {abaSelecionada === 'vinculos' && `Vínculos Existentes (${vinculosCompletos?.length || 0})`}
                  {abaSelecionada === 'usuarios' && `Gerenciar Usuários`}
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  {abaSelecionada === 'disciplinas' && 'Cadastro simples: nome + segmento de ensino'}
                  {abaSelecionada === 'series' && 'Cadastro simples: nome + segmento de ensino'}
                  {abaSelecionada === 'vinculos' && 'Vínculos Professor→Disciplina→Série criados automaticamente'}
                  {abaSelecionada === 'usuarios' && 'Visualizar, editar e excluir usuários do sistema'}
                </p>
              </div>
              {abaSelecionada !== 'vinculos' && abaSelecionada !== 'usuarios' && (
                <Button onClick={handleNovo} disabled={carregando}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {carregando ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-600">Carregando dados...</span>
                </div>
              ) : (
                <>
                  {/* Lista de Disciplinas */}
                  {abaSelecionada === 'disciplinas' && (
                    <div className="space-y-4">
                      {(disciplinas?.length || 0) === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                          <p>Nenhuma disciplina cadastrada</p>
                          <p className="text-sm">Clique em "Adicionar" para criar a primeira disciplina</p>
                        </div>
                      ) : (
                        (disciplinas || []).map((disciplina) => (
                          <div key={disciplina.id} className="flex items-center justify-between p-4 border rounded-lg bg-white">
                            <div className="flex items-center gap-3">
                              <BookOpen className="w-5 h-5 text-gray-500" />
                              <div>
                                <h3 className="font-medium">{disciplina.nome}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {disciplina.segmento === 'fundamental' ? 'Ens. Fundamental' : 'Ens. Médio'}
                                  </Badge>
                                  <Badge variant={disciplina.ativa ? 'default' : 'secondary'} className="text-xs">
                                    {disciplina.ativa ? 'Ativa' : 'Inativa'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditar(disciplina)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleExcluir(disciplina.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Lista de Séries */}
                  {abaSelecionada === 'series' && (
                    <div className="space-y-4">
                      {(series?.length || 0) === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <GraduationCap className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                          <p>Nenhuma série cadastrada</p>
                          <p className="text-sm">Clique em "Adicionar" para criar a primeira série</p>
                        </div>
                      ) : (
                        (series || []).map((serie) => (
                          <div key={serie.id} className="flex items-center justify-between p-4 border rounded-lg bg-white">
                            <div className="flex items-center gap-3">
                              <GraduationCap className="w-5 h-5 text-gray-500" />
                              <div>
                                <h3 className="font-medium">{serie.nome}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {serie.segmento === 'fundamental' ? 'Ens. Fundamental' : 'Ens. Médio'}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {serie.totalAlunos} aluno(s)
                                  </Badge>
                                  <Badge variant={serie.ativa ? 'default' : 'secondary'} className="text-xs">
                                    {serie.ativa ? 'Ativa' : 'Inativa'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditar(serie)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleExcluir(serie.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Lista de Vínculos Existentes (somente leitura) */}
                  {abaSelecionada === 'vinculos' && (
                    <div className="space-y-4">
                      {(vinculosCompletos?.length || 0) === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <UserCheck className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                          <p>Nenhum vínculo encontrado</p>
                          <p className="text-sm">Os vínculos aparecerão aqui quando professores forem cadastrados</p>
                          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
                            💡 Para criar vínculos, use o <strong>Cadastro de Usuário</strong> e selecione tipo "Professor"
                          </div>
                        </div>
                      ) : (
                        (vinculosCompletos || []).map((vinculo) => (
                          <div key={vinculo.id} className="border rounded-lg bg-white p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <UserCheck className="w-5 h-5 text-blue-600" />
                                <div>
                                  <h3 className="font-medium">{vinculo.nome}</h3>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs">
                                      {vinculo.segmento === 'fundamental' ? 'Ens. Fundamental' : 'Ens. Médio'}
                                    </Badge>
                                    <Badge variant="secondary" className="text-xs">
                                      {vinculo.disciplinas.length} disciplina(s)
                                    </Badge>
                                    <Badge variant="secondary" className="text-xs">
                                      {vinculo.totalAlunos} aluno(s)
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Disciplinas e Professores */}
                            <div className="space-y-2">
                              {(vinculo.disciplinas || []).map((disc, index) => (
                                <div key={index} className="bg-gray-50 rounded p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <BookOpen className="w-4 h-4 text-gray-600" />
                                    <span className="font-medium text-sm">{disc.disciplinaNome}</span>
                                  </div>
                                  <div className="flex items-center gap-2 ml-6">
                                    <Users className="w-3 h-3 text-gray-500" />
                                    <span className="text-xs text-gray-600">
                                      Professores: {(disc.professores || []).map(p => p.professorNome).join(', ') || 'Nenhum'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Aba de Usuários */}
                  {abaSelecionada === 'usuarios' && (
                    <div className="space-y-4">
                      <GerenciarUsuarios onVoltar={() => {}} />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal para criar/editar */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editando ? 'Editar' : 'Adicionar'} {abaSelecionada === 'disciplinas' ? 'Disciplina' : 'Série'}
            </DialogTitle>
            <DialogDescription>
              Cadastro simplificado - apenas nome e segmento de ensino
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder={abaSelecionada === 'disciplinas' ? 'Ex: Matemática' : 'Ex: 6º ano - Ensino Fundamental'}
              />
            </div>

            <div className="space-y-2">
              <Label>Segmento *</Label>
              <Select 
                value={formData.segmento} 
                onValueChange={(value: 'fundamental' | 'medio') => setFormData(prev => ({ ...prev, segmento: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o segmento" />
                </SelectTrigger>
                <SelectContent>
                  {(segmentosDisponiveis || []).map(seg => (
                    <SelectItem key={seg.value} value={seg.value}>
                      {seg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSalvar}
              disabled={!formData.nome.trim() || !formData.segmento || salvando}
            >
              {salvando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}