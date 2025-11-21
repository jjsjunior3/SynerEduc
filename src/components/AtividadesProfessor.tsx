import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Upload, Download, Plus, Calendar, FileText, Trash2, Edit2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner@2.0.3';

interface AtividadesProfessorProps {
  disciplina: any;
  serie: any;
}

interface Atividade {
  id: string;
  titulo: string;
  descricao: string;
  tipo: 'exercicio' | 'trabalho' | 'prova' | 'projeto';
  dataEntrega: string;
  arquivo?: string;
  status: 'ativa' | 'encerrada';
  entregas: number;
  totalAlunos: number;
}

export function AtividadesProfessor({ disciplina, serie }: AtividadesProfessorProps) {
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Atividade | null>(null);
  const [novaAtividade, setNovaAtividade] = useState({
    titulo: '',
    descricao: '',
    tipo: 'exercicio' as 'exercicio' | 'trabalho' | 'prova' | 'projeto',
    dataEntrega: '',
    arquivo: null as File | null
  });

  const [atividades, setAtividades] = useState<Atividade[]>([
    {
      id: '1',
      titulo: 'Lista de Exercícios - Capítulo 1',
      descricao: 'Exercícios sobre os conceitos básicos estudados na primeira unidade.',
      tipo: 'exercicio',
      dataEntrega: '2025-01-20',
      arquivo: 'exercicios_cap1.pdf',
      status: 'ativa',
      entregas: 18,
      totalAlunos: 28
    },
    {
      id: '2',
      titulo: 'Trabalho em Grupo - Pesquisa',
      descricao: 'Pesquisa sobre aplicações práticas dos conceitos estudados.',
      tipo: 'trabalho',
      dataEntrega: '2025-01-25',
      status: 'ativa',
      entregas: 12,
      totalAlunos: 28
    },
    {
      id: '3',
      titulo: 'Avaliação Bimestral',
      descricao: 'Prova sobre todo o conteúdo do primeiro bimestre.',
      tipo: 'prova',
      dataEntrega: '2025-01-15',
      status: 'encerrada',
      entregas: 28,
      totalAlunos: 28
    }
  ]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setNovaAtividade(prev => ({ ...prev, arquivo: file }));
    }
  };

  const handleSalvarAtividade = () => {
    if (!novaAtividade.titulo || !novaAtividade.descricao || !novaAtividade.dataEntrega) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const atividade: Atividade = {
      id: Date.now().toString(),
      titulo: novaAtividade.titulo,
      descricao: novaAtividade.descricao,
      tipo: novaAtividade.tipo,
      dataEntrega: novaAtividade.dataEntrega,
      arquivo: novaAtividade.arquivo?.name,
      status: 'ativa',
      entregas: 0,
      totalAlunos: serie?.totalAlunos || 28
    };

    if (editando) {
      setAtividades(prev => prev.map(a => a.id === editando.id ? { ...atividade, id: editando.id } : a));
      toast.success('Atividade atualizada com sucesso!');
    } else {
      setAtividades(prev => [atividade, ...prev]);
      toast.success('Atividade criada com sucesso!');
    }

    setModalAberto(false);
    setEditando(null);
    setNovaAtividade({
      titulo: '',
      descricao: '',
      tipo: 'exercicio',
      dataEntrega: '',
      arquivo: null
    });
  };

  const handleEditar = (atividade: Atividade) => {
    setEditando(atividade);
    setNovaAtividade({
      titulo: atividade.titulo,
      descricao: atividade.descricao,
      tipo: atividade.tipo,
      dataEntrega: atividade.dataEntrega,
      arquivo: null
    });
    setModalAberto(true);
  };

  const handleExcluir = (id: string) => {
    setAtividades(prev => prev.filter(a => a.id !== id));
    toast.success('Atividade removida com sucesso!');
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'exercicio': return 'bg-blue-100 text-blue-700';
      case 'trabalho': return 'bg-green-100 text-green-700';
      case 'prova': return 'bg-red-100 text-red-700';
      case 'projeto': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'ativa' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Atividades</h2>
        <Dialog open={modalAberto} onOpenChange={setModalAberto}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Atividade
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editando ? 'Editar Atividade' : 'Criar Nova Atividade'}
              </DialogTitle>
              <DialogDescription>
                {editando ? 'Atualize as informações da atividade.' : 'Preencha os dados para criar uma nova atividade para os alunos.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="titulo">Título da Atividade *</Label>
                  <Input
                    id="titulo"
                    value={novaAtividade.titulo}
                    onChange={(e) => setNovaAtividade(prev => ({ ...prev, titulo: e.target.value }))}
                    placeholder="Digite o título"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo de Atividade</Label>
                  <Select 
                    value={novaAtividade.tipo} 
                    onValueChange={(value) => setNovaAtividade(prev => ({ ...prev, tipo: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exercicio">Exercício</SelectItem>
                      <SelectItem value="trabalho">Trabalho</SelectItem>
                      <SelectItem value="prova">Prova</SelectItem>
                      <SelectItem value="projeto">Projeto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição *</Label>
                <Textarea
                  id="descricao"
                  value={novaAtividade.descricao}
                  onChange={(e) => setNovaAtividade(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descreva a atividade..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dataEntrega">Data de Entrega *</Label>
                  <Input
                    id="dataEntrega"
                    type="date"
                    value={novaAtividade.dataEntrega}
                    onChange={(e) => setNovaAtividade(prev => ({ ...prev, dataEntrega: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="arquivo">Arquivo da Atividade</Label>
                  <Input
                    id="arquivo"
                    type="file"
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx,.txt"
                  />
                  {novaAtividade.arquivo && (
                    <p className="text-sm text-gray-600">
                      Arquivo selecionado: {novaAtividade.arquivo.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setModalAberto(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSalvarAtividade}>
                  {editando ? 'Atualizar' : 'Criar'} Atividade
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {atividades.map((atividade) => (
          <Card key={atividade.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-medium text-gray-900">{atividade.titulo}</h3>
                    <Badge className={getTipoColor(atividade.tipo)}>
                      {atividade.tipo}
                    </Badge>
                    <Badge className={getStatusColor(atividade.status)}>
                      {atividade.status}
                    </Badge>
                  </div>
                  
                  <p className="text-gray-600 mb-3">{atividade.descricao}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Entrega: {new Date(atividade.dataEntrega).toLocaleDateString('pt-BR')}
                    </div>
                    {atividade.arquivo && (
                      <div className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        {atividade.arquivo}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Upload className="w-4 h-4" />
                      {atividade.entregas}/{atividade.totalAlunos} entregas
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEditar(atividade)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleExcluir(atividade.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {atividade.entregas > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Progresso das entregas:</span>
                    <span className="font-medium">
                      {Math.round((atividade.entregas / atividade.totalAlunos) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${(atividade.entregas / atividade.totalAlunos) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {atividades.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">Nenhuma atividade cadastrada</h3>
            <p className="text-gray-600 mb-4">
              Comece criando uma nova atividade para seus alunos.
            </p>
            <Button onClick={() => setModalAberto(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeira Atividade
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}