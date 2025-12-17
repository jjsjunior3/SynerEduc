// src/components/EnviarComunicado.tsx
/**
 * Enviar Comunicado - Coordenação
 * Permite enviar comunicados para diferentes grupos de usuários (alunos, professores, séries)
 * e visualizar o histórico de comunicados enviados.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ArrowLeft, Send, Users, Clock, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { Badge } from './ui/badge';
import { toast } from 'sonner'; // Usando sonner sem versão específica

import { useAuth } from '../contexts/AuthContext'; // Importar useAuth

interface EnviarComunicadoProps {
  onVoltar: () => void;
}

interface ComunicadoForm {
  titulo: string;
  conteudo: string;
  destinatarios: string[]; // IDs dos grupos de destino
  prioridade: 'baixa' | 'media' | 'alta';
  agendarEnvio: boolean;
  dataEnvio?: string; // Formato YYYY-MM-DD
  horaEnvio?: string; // Formato HH:MM
}

interface GrupoDestino {
  id: string; // UUID da série ou string como 'todos-alunos'
  label: string;
  tipo: 'alunos' | 'professores' | 'serie' | 'todos';
}

interface ComunicadoHistorico {
  id: string;
  titulo: string;
  conteudo: string;
  autorNome: string; // Nome do autor (JOIN com users)
  publico_alvo: string; // String separada por vírgulas
  importante: boolean;
  criado_em: string; // Data de envio/agendamento
}

export default function EnviarComunicado({ onVoltar }: EnviarComunicadoProps) {
  const { usuario } = useAuth(); // Pegar o usuário logado
  const [aba, setAba] = useState<'novo' | 'historico'>('novo');
  const [comunicadoForm, setComunicadoForm] = useState<ComunicadoForm>({
    titulo: '',
    conteudo: '',
    destinatarios: [],
    prioridade: 'media',
    agendarEnvio: false
  });
  const [loadingEnvio, setLoadingEnvio] = useState(false);
  const [loadingHistorico, setLoadingHistorico] = useState(true);
  const [erroHistorico, setErroHistorico] = useState<string | null>(null);
  const [historicoComunicados, setHistoricoComunicados] = useState<ComunicadoHistorico[]>([]);
  const [gruposDestinoDisponiveis, setGruposDestinoDisponiveis] = useState<GrupoDestino[]>([]);

  // ========================================
  // 1️⃣ CARREGAR GRUPOS DE DESTINO (Séries, Alunos, Professores)
  // ========================================
  useEffect(() => {
    carregarGruposDestino();
  }, []);

  async function carregarGruposDestino() {
    try {
      const grupos: GrupoDestino[] = [
        { id: 'todos-alunos', label: 'Todos os Alunos', tipo: 'todos' },
        { id: 'todos-professores', label: 'Todos os Professores', tipo: 'todos' },
        { id: 'todos-responsaveis', label: 'Todos os Responsáveis', tipo: 'todos' },
      ];

      // Buscar séries para criar grupos de turma
      const { data: seriesData, error: seriesError } = await supabase
        .from('users')
        .select('serie')
        .eq('tipo', 'aluno')
        .not('serie', 'is', null);

      if (seriesError) throw seriesError;

      const uniqueSeries = Array.from(new Set(seriesData?.map(item => item.serie) || []));
      uniqueSeries.sort().forEach(serie => {
        grupos.push({ id: `serie-${serie.toLowerCase().replace(/[^a-z0-9]/g, '')}`, label: `${serie}`, tipo: 'serie' });
      });

      setGruposDestinoDisponiveis(grupos);
    } catch (error: any) {
      console.error('Erro ao carregar grupos de destino:', error);
      toast.error('Erro ao carregar opções de destinatários', { description: error.message });
    }
  }

  // ========================================
  // 2️⃣ CARREGAR HISTÓRICO DE COMUNICADOS
  // ========================================
  useEffect(() => {
    if (aba === 'historico' && usuario?.id) {
      carregarHistoricoComunicados();
    }
  }, [aba, usuario?.id]);

  async function carregarHistoricoComunicados() {
    setLoadingHistorico(true);
    setErroHistorico(null);
    try {
      const { data, error } = await supabase
        .from('comunicados')
        .select(`
          *,
          autor:users!autor_id(nome)
        `)
        .order('criado_em', { ascending: false });

      if (error) throw error;

      const comunicadosFormatados: ComunicadoHistorico[] = data.map(c => ({
        id: c.id,
        titulo: c.titulo,
        conteudo: c.conteudo,
        autorNome: c.autor?.nome || 'Desconhecido',
        publico_alvo: c.publico_alvo,
        importante: c.importante,
        criado_em: c.criado_em,
      }));
      setHistoricoComunicados(comunicadosFormatados);
    } catch (error: any) {
      console.error('Erro ao carregar histórico de comunicados:', error);
      setErroHistorico(error.message || 'Erro ao carregar histórico.');
    } finally {
      setLoadingHistorico(false);
    }
  }

  // ========================================
  // 3️⃣ LÓGICA DE ENVIO DE COMUNICADO
  // ========================================
  const handleDestinatarioChange = (grupoId: string, checked: boolean) => {
    setComunicadoForm(prev => ({
      ...prev,
      destinatarios: checked
        ? [...prev.destinatarios, grupoId]
        : prev.destinatarios.filter(d => d !== grupoId)
    }));
  };

  const handleEnviar = async () => {
    if (!usuario?.id) {
      toast.error('Você precisa estar logado para enviar comunicados.');
      return;
    }
    if (!comunicadoForm.titulo.trim() || !comunicadoForm.conteudo.trim() || comunicadoForm.destinatarios.length === 0) {
      toast.error('Preencha todos os campos obrigatórios (Título, Conteúdo e Destinatários).');
      return;
    }

    let dataEnvioFinal = new Date(); // Data atual por padrão

    if (comunicadoForm.agendarEnvio) {
      if (!comunicadoForm.dataEnvio || !comunicadoForm.horaEnvio) {
        toast.error('Informe a data e hora para o agendamento.');
        return;
      }
      // Concatena data e hora para criar um objeto Date
      dataEnvioFinal = new Date(`${comunicadoForm.dataEnvio}T${comunicadoForm.horaEnvio}:00`);
      if (isNaN(dataEnvioFinal.getTime())) {
        toast.error('Data ou hora de agendamento inválida.');
        return;
      }
      if (dataEnvioFinal.getTime() < new Date().getTime()) {
        toast.error('A data/hora de agendamento não pode ser no passado.');
        return;
      }
    }

    setLoadingEnvio(true);
    try {
      const { data, error } = await supabase
        .from('comunicados')
        .insert({
          titulo: comunicadoForm.titulo.trim(),
          conteudo: comunicadoForm.conteudo.trim(),
          autor_id: usuario.id,
          publico_alvo: comunicadoForm.destinatarios.join(','), // Salva como string separada por vírgulas
          importante: comunicadoForm.prioridade === 'alta', // Mapeia prioridade para 'importante'
          criado_em: dataEnvioFinal.toISOString(), // Usa a data de envio final
        })
        .select();

      if (error) throw error;

      if (comunicadoForm.agendarEnvio) {
        toast.success(`Comunicado agendado para ${new Date(dataEnvioFinal).toLocaleString('pt-BR')}`);
      } else {
        toast.success(`Comunicado enviado com sucesso!`);
      }

      // Resetar formulário
      setComunicadoForm({
        titulo: '',
        conteudo: '',
        destinatarios: [],
        prioridade: 'media',
        agendarEnvio: false,
        dataEnvio: undefined,
        horaEnvio: undefined,
      });

      // Se estiver na aba de histórico, recarregar para mostrar o novo comunicado
      if (aba === 'historico') {
        carregarHistoricoComunicados();
      }

    } catch (error: any) {
      console.error('Erro ao enviar comunicado:', error);
      toast.error('Erro ao enviar comunicado', { description: error.message });
    } finally {
      setLoadingEnvio(false);
    }
  };

  const getPrioridadeColor = (importante: boolean) => {
    return importante ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700';
  };

  const getPrioridadeLabel = (importante: boolean) => {
    return importante ? 'Alta' : 'Normal';
  };

  const formatarDataHistorico = (dataStr: string) => {
    return new Date(dataStr).toLocaleString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ========================================
  // 4️⃣ RENDERIZAÇÃO
  // ========================================
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
            <h1 className="font-semibold text-gray-900">Comunicados</h1>
            <p className="text-sm text-gray-600">Enviar mensagens para alunos, professores e responsáveis</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* Abas */}
          <div className="flex space-x-1 mb-6">
            <button
              onClick={() => setAba('novo')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                aba === 'novo'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Send className="w-4 h-4" />
              Novo Comunicado
            </button>
            <button
              onClick={() => setAba('historico')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                aba === 'historico'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Clock className="w-4 h-4" />
              Histórico
            </button>
          </div>

          {aba === 'novo' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  Novo Comunicado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="titulo">Título do Comunicado *</Label>
                    <Input
                      id="titulo"
                      value={comunicadoForm.titulo}
                      onChange={(e) => setComunicadoForm(prev => ({ ...prev, titulo: e.target.value }))}
                      placeholder="Digite o título"
                      disabled={loadingEnvio}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prioridade">Prioridade</Label>
                    <Select
                      value={comunicadoForm.prioridade}
                      onValueChange={(value) => setComunicadoForm(prev => ({ ...prev, prioridade: value as any }))}
                      disabled={loadingEnvio}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="conteudo">Conteúdo da Mensagem *</Label>
                  <Textarea
                    id="conteudo"
                    value={comunicadoForm.conteudo}
                    onChange={(e) => setComunicadoForm(prev => ({ ...prev, conteudo: e.target.value }))}
                    placeholder="Digite o conteúdo do comunicado..."
                    rows={6}
                    disabled={loadingEnvio}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Destinatários *</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {gruposDestinoDisponiveis.map((grupo) => (
                      <div key={grupo.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={grupo.id}
                          checked={comunicadoForm.destinatarios.includes(grupo.id)}
                          onCheckedChange={(checked) => handleDestinatarioChange(grupo.id, checked as boolean)}
                          disabled={loadingEnvio}
                        />
                        <Label htmlFor={grupo.id} className="text-sm cursor-pointer">
                          {grupo.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Agendamento */}
                <div className="border-t pt-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="agendarEnvio"
                      checked={comunicadoForm.agendarEnvio}
                      onCheckedChange={(checked) => setComunicadoForm(prev => ({ ...prev, agendarEnvio: checked as boolean }))}
                      disabled={loadingEnvio}
                    />
                    <Label htmlFor="agendarEnvio">Agendar envio</Label>
                  </div>

                  {comunicadoForm.agendarEnvio && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dataEnvio">Data de Envio</Label>
                        <Input
                          id="dataEnvio"
                          type="date"
                          value={comunicadoForm.dataEnvio || ''}
                          onChange={(e) => setComunicadoForm(prev => ({ ...prev, dataEnvio: e.target.value }))}
                          disabled={loadingEnvio}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="horaEnvio">Hora de Envio</Label>
                        <Input
                          id="horaEnvio"
                          type="time"
                          value={comunicadoForm.horaEnvio || ''}
                          onChange={(e) => setComunicadoForm(prev => ({ ...prev, horaEnvio: e.target.value }))}
                          disabled={loadingEnvio}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-4 pt-6 border-t">
                  <Button variant="outline" onClick={onVoltar} disabled={loadingEnvio}>
                    Cancelar
                  </Button>
                  <Button onClick={handleEnviar} disabled={loadingEnvio}>
                    {loadingEnvio && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {comunicadoForm.agendarEnvio ? 'Agendar Envio' : 'Enviar Agora'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {aba === 'historico' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Histórico de Comunicados
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingHistorico ? (
                  <div className="flex items-center justify-center p-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600">Carregando histórico...</span>
                  </div>
                ) : erroHistorico ? (
                  <div className="p-12 text-center text-red-600">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-2">Erro ao carregar histórico</h3>
                    <p className="text-sm">{erroHistorico}</p>
                    <Button variant="outline" size="sm" onClick={carregarHistoricoComunicados} className="mt-4">
                      Tentar novamente
                    </Button>
                  </div>
                ) : historicoComunicados.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <h3 className="font-semibold text-lg mb-2">Nenhum comunicado enviado ainda</h3>
                    <p className="text-sm">Envie seu primeiro comunicado na aba "Novo Comunicado".</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {historicoComunicados.map((item) => (
                      <div key={item.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900 mb-1">{item.titulo}</h3>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {item.publico_alvo.split(',').map((destId, index) => {
                                const grupo = gruposDestinoDisponiveis.find(g => g.id === destId);
                                return (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {grupo ? grupo.label : destId}
                                  </Badge>
                                );
                              })}
                            </div>
                            <p className="text-sm text-gray-600">
                              Enviado por {item.autorNome} em {formatarDataHistorico(item.criado_em)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`${getPrioridadeColor(item.importante)} flex items-center gap-1`}>
                              {item.importante ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                              {getPrioridadeLabel(item.importante)}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 mt-3 whitespace-pre-wrap">{item.conteudo}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
