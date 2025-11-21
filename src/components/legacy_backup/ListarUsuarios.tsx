import { useState, useEffect } from 'react';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ArrowLeft, User, Mail, Calendar, Search, Filter, Loader2, Eye, Edit, Trash2, Save, AlertTriangle, EyeOff, Lock, UserCheck, GraduationCap, BookOpen, CheckCircle } from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

interface ListarUsuariosProps {
  onVoltar: () => void;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
  nomeUsuario: string;
  tipo: 'aluno' | 'professor' | 'coordenador' | 'administrador' | 'professor_conteudista';
  ativo: boolean;
  avatar?: string;
  serie?: string;
  serie_escolar?: string;
  disciplinas?: string[];
  series?: string[];
  created_at: string;
  criadoEm: string;
  last_login?: string;
}

interface EditarUsuarioData {
  nome: string;
  email: string;
  tipo: string;
  serie?: string;
  disciplinas: string[];
  series: string[];
  senha?: string;
  confirmarSenha?: string;
}

export function ListarUsuarios({ onVoltar }: ListarUsuariosProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const { usuario: usuarioLogado } = useAuth();

  // Lista de séries disponíveis  
  const seriesDisponiveis = [
    '5º ano - Ensino Fundamental',
    '6º ano - Ensino Fundamental', 
    '7º ano - Ensino Fundamental',
    '8º ano - Ensino Fundamental',
    '9º ano - Ensino Fundamental',
    '1ª série - Ensino Médio',
    '2ª série - Ensino Médio',
    '3ª série - Ensino Médio'
  ];

  const tiposUsuarioEdicao = [
    { value: 'aluno', label: 'Aluno' },
    { value: 'professor', label: 'Professor' },
    { value: 'coordenador', label: 'Coordenador' },
    { value: 'administrador', label: 'Administrador' },
    { value: 'professor_conteudista', label: 'Professor Conteudista' }
  ];
  
  // Estados para edição
  const [editandoUsuario, setEditandoUsuario] = useState<Usuario | null>(null);
  const [dadosEdicao, setDadosEdicao] = useState<EditarUsuarioData>({
    nome: '',
    email: '',
    tipo: '',
    serie: '',
    disciplinas: [],
    series: [],
    senha: '',
    confirmarSenha: ''
  });
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [alterarSenha, setAlterarSenha] = useState(false);
  
  // Estados para deleção
  const [usuarioParaDeletar, setUsuarioParaDeletar] = useState<Usuario | null>(null);
  const [deletandoUsuario, setDeletandoUsuario] = useState(false);
  
  // Estados para disciplinas
  const [disciplinasDisponiveis, setDisciplinasDisponiveis] = useState<string[]>([
    'Matemática', 'Português', 'História', 'Geografia', 'Ciências',
    'Biologia', 'Física', 'Química', 'Filosofia', 'Sociologia',
    'Inglês', 'Educação Física', 'Arte'
  ]);
  
  // Estado para operações em andamento
  const [operacaoEmAndamento, setOperacaoEmAndamento] = useState<string | null>(null);

  const tiposUsuario = [
    { value: 'todos', label: 'Todos os tipos' },
    { value: 'aluno', label: 'Alunos' },
    { value: 'professor', label: 'Professores' },
    { value: 'coordenador', label: 'Coordenadores' },
    { value: 'administrador', label: 'Administradores' },
    { value: 'professor_conteudista', label: 'Professores Conteudistas' }
  ];

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'aluno':
        return 'bg-blue-100 text-blue-800';
      case 'professor':
        return 'bg-green-100 text-green-800';
      case 'coordenador':
        return 'bg-purple-100 text-purple-800';
      case 'administrador':
        return 'bg-red-100 text-red-800';
      case 'professor_conteudista':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'aluno':
        return 'Aluno';
      case 'professor':
        return 'Professor';
      case 'coordenador':
        return 'Coordenador';
      case 'administrador':
        return 'Administrador';
      case 'professor_conteudista':
        return 'Prof. Conteudista';
      default:
        return tipo;
    }
  };

  const formatarData = (dataString: string) => {
    if (!dataString) return 'Nunca';
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const carregarUsuarios = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fazer requisição autenticada para listar usuários
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/usuarios`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
          'X-User-ID': usuarioLogado?.id || '',
          'X-User-Type': usuarioLogado?.tipo || ''
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setUsuarios(data.usuarios || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      setError(error.message || 'Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const usuariosFiltrados = usuarios.filter(usuario => {
    const matchBusca = usuario.nome.toLowerCase().includes(busca.toLowerCase()) ||
                       usuario.email.toLowerCase().includes(busca.toLowerCase());
    
    const matchTipo = filtroTipo === 'todos' || usuario.tipo === filtroTipo;
    
    return matchBusca && matchTipo;
  });

  const estatisticas = {
    total: usuarios.length,
    ativos: usuarios.filter(u => u.ativo).length,
    inativos: usuarios.filter(u => !u.ativo).length,
    por_tipo: tiposUsuario.slice(1).map(tipo => ({
      tipo: tipo.value,
      label: tipo.label,
      count: usuarios.filter(u => u.tipo === tipo.value).length
    }))
  };

  // Iniciar edição de usuário
  const iniciarEdicao = (usuario: Usuario) => {
    console.log('[LISTAR_USUARIOS] Iniciando edição do usuário:', usuario);
    
    if (!usuario || !usuario.id) {
      toast.error('Erro: usuário inválido para edição');
      console.error('[LISTAR_USUARIOS] Usuário sem ID válido:', usuario);
      return;
    }

    setEditandoUsuario(usuario);
    setDadosEdicao({
      nome: usuario.nome || '',
      email: usuario.email || '',
      tipo: usuario.tipo || '',
      serie: usuario.serie || usuario.serie_escolar || '',
      disciplinas: usuario.disciplinas || [],
      series: usuario.series || [],
      senha: '',
      confirmarSenha: ''
    });
    setAlterarSenha(false);
    setMostrarSenha(false);
    setMostrarConfirmacao(false);
  };

  // Cancelar edição
  const cancelarEdicao = () => {
    setEditandoUsuario(null);
    setDadosEdicao({
      nome: '',
      email: '',
      tipo: '',
      serie: '',
      disciplinas: [],
      series: [],
      senha: '',
      confirmarSenha: ''
    });
    setAlterarSenha(false);
  };

  // Salvar edição
  const salvarEdicao = async () => {
    if (!editandoUsuario) return;

    setSalvandoEdicao(true);
    setOperacaoEmAndamento(`Salvando ${editandoUsuario.nome}`);
    
    const loadingToast = toast.loading('Salvando alterações do usuário...', {
      description: `Atualizando dados de ${editandoUsuario.nome}`
    });

    try {
      const dadosParaAtualizar = {
        id: editandoUsuario.id,
        nome: dadosEdicao.nome.trim(),
        email: dadosEdicao.email.trim(),
        tipo: dadosEdicao.tipo,
        ...(dadosEdicao.tipo === 'aluno' && { serie: dadosEdicao.serie }),
        ...(dadosEdicao.tipo === 'professor' && { 
          disciplinas: dadosEdicao.disciplinas,
          series: dadosEdicao.series 
        }),
        ...(dadosEdicao.tipo === 'professor_conteudista' && { 
          disciplinas: dadosEdicao.disciplinas 
        }),
        ...(alterarSenha && { novaSenha: dadosEdicao.senha })
      };

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${editandoUsuario.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosParaAtualizar)
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      toast.dismiss(loadingToast);
      toast.success('✅ Usuário atualizado com sucesso!', {
        description: `${editandoUsuario.nome} foi atualizado`,
        duration: 4000
      });
      
      cancelarEdicao();
      await carregarUsuarios();
      
    } catch (error) {
      console.error('[LISTAR_USUARIOS] Erro ao atualizar usuário:', error);
      
      toast.dismiss(loadingToast);
      
      if (error.message.includes('Failed to fetch')) {
        toast.error('🔌 Erro de conexão', {
          description: 'Não foi possível conectar ao servidor. Verifique sua internet.',
          duration: 6000
        });
      } else {
        toast.error('❌ Erro ao atualizar usuário', {
          description: error.message || 'Erro interno do servidor',
          duration: 6000
        });
      }
    } finally {
      setSalvandoEdicao(false);
      setOperacaoEmAndamento(null);
    }
  };

  // Deletar usuário
  const deletarUsuario = async () => {
    if (!usuarioParaDeletar || !usuarioParaDeletar.id) {
      toast.error('Erro: usuário inválido para deleção');
      return;
    }

    setDeletandoUsuario(true);
    setOperacaoEmAndamento(`Deletando ${usuarioParaDeletar.nome}`);
    
    const loadingToast = toast.loading('Removendo usuário do sistema...', {
      description: `Deletando ${usuarioParaDeletar.nome} permanentemente`
    });

    try {
      console.log('[LISTAR_USUARIOS] Deletando usuário:', {
        id: usuarioParaDeletar.id,
        nome: usuarioParaDeletar.nome,
        email: usuarioParaDeletar.email
      });

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${usuarioParaDeletar.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const nomeUsuario = usuarioParaDeletar.nome;
      
      toast.dismiss(loadingToast);
      toast.success('🗑️ Usuário deletado com sucesso!', {
        description: `${nomeUsuario} foi removido permanentemente do sistema`,
        duration: 4000
      });
      
      setUsuarioParaDeletar(null);
      await carregarUsuarios();
      
    } catch (error) {
      console.error('[LISTAR_USUARIOS] Erro ao deletar usuário:', error);
      
      toast.dismiss(loadingToast);
      
      if (error.message.includes('Failed to fetch')) {
        toast.error('🔌 Erro de conexão', {
          description: 'Não foi possível conectar ao servidor. Verifique sua internet.',
          duration: 6000
        });
      } else {
        toast.error('❌ Erro ao deletar usuário', {
          description: error.message || 'Erro interno do servidor',
          duration: 6000
        });
      }
    } finally {
      setDeletandoUsuario(false);
      setOperacaoEmAndamento(null);
    }
  };

  useEffect(() => {
    carregarUsuarios();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-gray-600">Carregando usuários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onVoltar}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Usuários Cadastrados</h1>
              <p className="text-sm text-gray-600">Gerenciar usuários do sistema</p>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            Total: {usuarios.length} usuários
          </div>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-600">
                <span className="font-medium">Erro:</span>
                <span>{error}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={carregarUsuarios}
                className="mt-2"
              >
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{estatisticas.total}</div>
              <div className="text-sm text-gray-600">Total de Usuários</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{estatisticas.ativos}</div>
              <div className="text-sm text-gray-600">Usuários Ativos</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{estatisticas.inativos}</div>
              <div className="text-sm text-gray-600">Usuários Inativos</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {estatisticas.por_tipo.find(t => t.tipo === 'aluno')?.count || 0}
              </div>
              <div className="text-sm text-gray-600">Alunos</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Buscar por nome ou email..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="md:w-64">
                <select
                  className="w-full p-2 border border-gray-300 rounded-md bg-white"
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                >
                  {tiposUsuario.map(tipo => (
                    <option key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Usuários */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Usuários ({usuariosFiltrados.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {usuariosFiltrados.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhum usuário encontrado</p>
                {busca || filtroTipo !== 'todos' ? (
                  <p className="text-sm mt-2">Tente ajustar os filtros de busca</p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-4">
                {usuariosFiltrados.map((usuario) => (
                  <div
                    key={usuario.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={usuario.avatar} alt={usuario.nome} />
                        <AvatarFallback>
                          {usuario.nome.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900">{usuario.nome}</h3>
                          <Badge className={getTipoColor(usuario.tipo)}>
                            {getTipoLabel(usuario.tipo)}
                          </Badge>
                          {!usuario.ativo && (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                              Inativo
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {usuario.email}
                          </div>
                          {usuario.serie_escolar && (
                            <div>
                              Série: {usuario.serie_escolar}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Cadastrado: {formatarData(usuario.created_at)}
                          </div>
                          {usuario.last_login && (
                            <div>
                              Último login: {formatarData(usuario.last_login)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => iniciarEdicao(usuario)}
                        className="flex items-center gap-1 hover:shadow-sm transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Edit className="w-3 h-3" />
                        Editar
                      </Button>
                      {usuario.id !== usuarioLogado?.id && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setUsuarioParaDeletar(usuario)}
                          className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-300 hover:shadow-sm transition-all duration-200"
                        >
                          <Trash2 className="w-3 h-3" />
                          Excluir
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumo por tipo */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {estatisticas.por_tipo.map((item) => (
            <Card key={item.tipo}>
              <CardContent className="p-4 text-center">
                <div className="text-lg font-semibold text-gray-900">{item.count}</div>
                <div className="text-sm text-gray-600">{item.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Modal de Edição */}
      <Dialog open={editandoUsuario !== null} onOpenChange={() => cancelarEdicao()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-600" />
              Editar Usuário
            </DialogTitle>
            <DialogDescription>
              Modifique os dados do usuário conforme necessário.
            </DialogDescription>
          </DialogHeader>

          {editandoUsuario && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editNome">Nome Completo *</Label>
                  <Input
                    id="editNome"
                    value={dadosEdicao.nome}
                    onChange={(e) => setDadosEdicao(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Digite o nome completo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editEmail">Email</Label>
                  <Input
                    id="editEmail"
                    type="email"
                    value={dadosEdicao.email}
                    onChange={(e) => setDadosEdicao(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Usuário *</Label>
                <Select 
                  value={dadosEdicao.tipo} 
                  onValueChange={(value) => setDadosEdicao(prev => ({ 
                    ...prev, 
                    tipo: value,
                    serie: value === 'aluno' ? prev.serie : '',
                    disciplinas: (value === 'professor' || value === 'professor_conteudista') ? prev.disciplinas : [],
                    series: value === 'professor' ? prev.series : []
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposUsuarioEdicao.map(tipo => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Campos específicos para aluno */}
              {dadosEdicao.tipo === 'aluno' && (
                <div className="space-y-2">
                  <Label>Série Escolar *</Label>
                  <Select 
                    value={dadosEdicao.serie} 
                    onValueChange={(value) => setDadosEdicao(prev => ({ ...prev, serie: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a série" />
                    </SelectTrigger>
                    <SelectContent>
                      {seriesDisponiveis.map(serie => (
                        <SelectItem key={serie} value={serie}>
                          {serie}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    id="alterarSenha"
                    checked={alterarSenha}
                    onChange={(e) => setAlterarSenha(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="alterarSenha" className="text-sm">Alterar senha do usuário</Label>
                </div>

                {alterarSenha && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editSenha">Nova Senha *</Label>
                      <Input
                        id="editSenha"
                        type={mostrarSenha ? "text" : "password"}
                        value={dadosEdicao.senha}
                        onChange={(e) => setDadosEdicao(prev => ({ ...prev, senha: e.target.value }))}
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="editConfirmarSenha">Confirmar Nova Senha *</Label>
                      <Input
                        id="editConfirmarSenha"
                        type={mostrarConfirmacao ? "text" : "password"}
                        value={dadosEdicao.confirmarSenha}
                        onChange={(e) => setDadosEdicao(prev => ({ ...prev, confirmarSenha: e.target.value }))}
                        placeholder="Digite a senha novamente"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={cancelarEdicao}
              disabled={salvandoEdicao}
            >
              Cancelar
            </Button>
            
            <Button 
              onClick={salvarEdicao}
              disabled={salvandoEdicao}
              className="min-w-36"
            >
              {salvandoEdicao ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Deleção */}
      <Dialog open={usuarioParaDeletar !== null} onOpenChange={() => setUsuarioParaDeletar(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              <div className="space-y-3">
                <p className="text-gray-700">
                  Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.
                </p>
                
                {usuarioParaDeletar && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Nome:</span>
                      <span className="font-medium">{usuarioParaDeletar.nome}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-500">Email:</span>
                      <span className="font-medium">{usuarioParaDeletar.email}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tipo:</span>
                      <span className="font-medium">{getTipoLabel(usuarioParaDeletar.tipo)}</span>
                    </div>
                  </div>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setUsuarioParaDeletar(null)}
              disabled={deletandoUsuario}
            >
              Cancelar
            </Button>
            
            <Button 
              variant="destructive"
              onClick={deletarUsuario}
              disabled={deletandoUsuario}
              className="min-w-36"
            >
              {deletandoUsuario ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Sim, Excluir
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}