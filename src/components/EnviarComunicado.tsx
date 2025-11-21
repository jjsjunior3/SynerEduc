import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ArrowLeft, Send, Users, Clock, CheckCircle } from 'lucide-react';
import { Badge } from './ui/badge';
import { toast } from 'sonner@2.0.3';

interface EnviarComunicadoProps {
  onVoltar: () => void;
}

interface Comunicado {
  titulo: string;
  conteudo: string;
  destinatarios: string[];
  prioridade: 'baixa' | 'media' | 'alta';
  agendarEnvio: boolean;
  dataEnvio?: string;
  horaEnvio?: string;
}

const gruposDestino = [
  { id: 'todos-alunos', label: 'Todos os Alunos', tipo: 'alunos' },
  { id: 'todos-professores', label: 'Todos os Professores', tipo: 'professores' },
  { id: '1-serie-a', label: '1ª Série A', tipo: 'turma' },
  { id: '1-serie-b', label: '1ª Série B', tipo: 'turma' },
  { id: '2-serie-a', label: '2ª Série A', tipo: 'turma' },
  { id: '2-serie-b', label: '2ª Série B', tipo: 'turma' },
  { id: '3-serie-a', label: '3ª Série A', tipo: 'turma' },
  { id: '3-serie-b', label: '3ª Série B', tipo: 'turma' },
];

const comunicadosEnviados = [
  {
    id: '1',
    titulo: 'Reunião de Pais - 1º Bimestre',
    destinatarios: ['Todos os Alunos'],
    dataEnvio: '2025-01-10',
    status: 'enviado'
  },
  {
    id: '2',
    titulo: 'Alteração no Horário das Aulas',
    destinatarios: ['3ª Série A', '3ª Série B'],
    dataEnvio: '2025-01-08',
    status: 'enviado'
  },
  {
    id: '3',
    titulo: 'Recesso Escolar',
    destinatarios: ['Todos os Professores'],
    dataEnvio: '2025-01-05',
    status: 'enviado'
  }
];

export function EnviarComunicado({ onVoltar }: EnviarComunicadoProps) {
  const [aba, setAba] = useState<'novo' | 'historico'>('novo');
  const [comunicado, setComunicado] = useState<Comunicado>({
    titulo: '',
    conteudo: '',
    destinatarios: [],
    prioridade: 'media',
    agendarEnvio: false
  });

  const handleDestinatarioChange = (grupoId: string, checked: boolean) => {
    setComunicado(prev => ({
      ...prev,
      destinatarios: checked 
        ? [...prev.destinatarios, grupoId]
        : prev.destinatarios.filter(d => d !== grupoId)
    }));
  };

  const handleEnviar = () => {
    if (!comunicado.titulo || !comunicado.conteudo || comunicado.destinatarios.length === 0) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (comunicado.agendarEnvio && (!comunicado.dataEnvio || !comunicado.horaEnvio)) {
      toast.error('Informe a data e hora para o agendamento');
      return;
    }

    const destinatariosNomes = comunicado.destinatarios.map(id => 
      gruposDestino.find(g => g.id === id)?.label || id
    );

    if (comunicado.agendarEnvio) {
      toast.success(`Comunicado agendado para ${comunicado.dataEnvio} às ${comunicado.horaEnvio}`);
    } else {
      toast.success(`Comunicado enviado para: ${destinatariosNomes.join(', ')}`);
    }

    // Resetar formulário
    setComunicado({
      titulo: '',
      conteudo: '',
      destinatarios: [],
      prioridade: 'media',
      agendarEnvio: false
    });
  };

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'alta': return 'bg-red-100 text-red-700';
      case 'media': return 'bg-yellow-100 text-yellow-700';
      case 'baixa': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

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
            <p className="text-sm text-gray-600">Enviar mensagens para alunos e professores</p>
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
                      value={comunicado.titulo}
                      onChange={(e) => setComunicado(prev => ({ ...prev, titulo: e.target.value }))}
                      placeholder="Digite o título"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prioridade">Prioridade</Label>
                    <Select 
                      value={comunicado.prioridade} 
                      onValueChange={(value) => setComunicado(prev => ({ ...prev, prioridade: value as any }))}
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
                    value={comunicado.conteudo}
                    onChange={(e) => setComunicado(prev => ({ ...prev, conteudo: e.target.value }))}
                    placeholder="Digite o conteúdo do comunicado..."
                    rows={6}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Destinatários *</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {gruposDestino.map((grupo) => (
                      <div key={grupo.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={grupo.id}
                          checked={comunicado.destinatarios.includes(grupo.id)}
                          onCheckedChange={(checked) => handleDestinatarioChange(grupo.id, checked as boolean)}
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
                      checked={comunicado.agendarEnvio}
                      onCheckedChange={(checked) => setComunicado(prev => ({ ...prev, agendarEnvio: checked as boolean }))}
                    />
                    <Label htmlFor="agendarEnvio">Agendar envio</Label>
                  </div>

                  {comunicado.agendarEnvio && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dataEnvio">Data de Envio</Label>
                        <Input
                          id="dataEnvio"
                          type="date"
                          value={comunicado.dataEnvio || ''}
                          onChange={(e) => setComunicado(prev => ({ ...prev, dataEnvio: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="horaEnvio">Hora de Envio</Label>
                        <Input
                          id="horaEnvio"
                          type="time"
                          value={comunicado.horaEnvio || ''}
                          onChange={(e) => setComunicado(prev => ({ ...prev, horaEnvio: e.target.value }))}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-4 pt-6 border-t">
                  <Button variant="outline" onClick={onVoltar}>
                    Cancelar
                  </Button>
                  <Button onClick={handleEnviar}>
                    <Send className="w-4 h-4 mr-2" />
                    {comunicado.agendarEnvio ? 'Agendar Envio' : 'Enviar Agora'}
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
                <div className="space-y-4">
                  {comunicadosEnviados.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 mb-1">{item.titulo}</h3>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {item.destinatarios.map((dest, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {dest}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-sm text-gray-600">
                            Enviado em {new Date(item.dataEnvio).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <span className="text-sm text-green-600">Enviado</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}