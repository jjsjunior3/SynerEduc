import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Calendar, 
  Search, 
  Loader2, 
  Edit, 
  Trash2, 
  Shield, 
  ShieldOff, 
  Key, 
  Save, 
  X, 
  Users,
  UserPlus,
  Eye,
  EyeOff,
  Filter,
  MoreHorizontal
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { useAuth } from '../contexts/AuthContext';

interface AdminUsuariosProps {
  onVoltar: () => void;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo: 'aluno' | 'professor' | 'coordenador' | 'administrador' | 'professor_conteudista';
  ativo: boolean;
  avatar?: string;
  serie?: string;
  disciplinas?: string[];
  series?: string[];
  criadoEm: string;
  atualizadoEm?: string;
}

interface UsuarioEdicao {
  nome: string;
  email: string;
  tipo: string;
  serie?: string;
  disciplinas: string[];
  series: string[];
  novaSenha?: string;
}

const disciplinasDisponiveis = [
  'Matemática', 'Português', 'História', 'Geografia', 'Ciências',
  'Biologia', 'Física', 'Química', 'Filosofia', 'Sociologia',
  'Inglês', 'Educação Física', 'Arte'
];

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

export function AdminUsuarios({ onVoltar }: AdminUsuariosProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Usuario | null>(null);
  const [modalEdicao, setModalEdicao] = useState(false);
  const [modalExclusao, setModalExclusao] = useState(false);
  const [modalDetalhes, setModalDetalhes] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [dadosEdicao, setDadosEdicao] = useState<UsuarioEdicao>({
    nome: '',
    email: '',
    tipo: '',
    serie: '',
    disciplinas: [],
    series: [],
    novaSenha: ''
  });

  const { usuario: usuarioLogado } = useAuth();

  const tiposUsuario = [
    { value: 'todos', label: 'Todos os tipos' },
    { value: 'aluno', label: 'Alunos' },
    { value: 'professor', label: 'Professores' },
    { value: 'coordenador', label: 'Coordenadores' },
    { value: 'administrador', label: 'Administradores' },
    { value: 'professor_conteudista', label: 'Professores Conteudistas' }
  ];

  const statusOptions = [
    { value: 'todos', label: 'Todos os status' },
    { value: 'ativo', label: 'Apenas ativos' },
    { value: 'inativo', label: 'Apenas inativos' }
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
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[ADMIN_USUARIOS] Dados recebidos:', data);
      setUsuarios(data.usuarios || []);
      
      toast.success('Usuários carregados com sucesso!');
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      
      let errorMessage = 'Erro ao carregar usuários';
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage = '🔌 Erro de conexão com o servidor. Verifique sua conexão com a internet.';
        toast.error('Erro de conexão', {
          description: 'Não foi possível conectar ao servidor. Verifique sua internet.'
        });
      } else if (error.message.includes('404')) {
        errorMessage = '📋 API de usuários não encontrada. Verifique se o servidor está funcionando.';
        toast.warning('Servidor indisponível', {
          description: 'A API de usuários não está disponível no momento.'
        });
      } else if (error.message.includes('500')) {
        errorMessage = '⚠️ Erro interno do servidor. Tente novamente em alguns minutos.';
        toast.error('Erro do servidor', {
          description: 'Erro interno do servidor. Tente novamente.'
        });
      } else {
        errorMessage = error.message || 'Erro ao carregar usuários';
        toast.error('Erro ao carregar usuários');
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const iniciarEdicao = (usuario: Usuario) => {
    setUsuarioSelecionado(usuario);
    setDadosEdicao({
      nome: usuario.nome,
      email: usuario.email,
      tipo: usuario.tipo,
      serie: usuario.serie || '',
      disciplinas: usuario.disciplinas || [],
      series: usuario.series || [],
      novaSenha: ''
    });
    setModalEdicao(true);
  };

  const salvarEdicao = async () => {
    if (!usuarioSelecionado) return;

    setSalvando(true);
    try {
      const dadosParaSalvar = {
        nome: dadosEdicao.nome,
        email: dadosEdicao.email,
        tipo: dadosEdicao.tipo,
        ...(dadosEdicao.tipo === 'aluno' && { serie: dadosEdicao.serie }),
        ...(dadosEdicao.tipo === 'professor' && { 
          disciplinas: dadosEdicao.disciplinas,
          series: dadosEdicao.series 
        }),
        ...(dadosEdicao.tipo === 'professor_conteudista' && { 
          disciplinas: dadosEdicao.disciplinas 
        }),
        ...(dadosEdicao.novaSenha && { novaSenha: dadosEdicao.novaSenha })
      };

      console.log('[ADMIN_USUARIOS] Salvando edição do usuário:', {
        id: usuarioSelecionado.id,
        dados: dadosParaSalvar
      });

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${usuarioSelecionado.id}`;
      console.log('[ADMIN_USUARIOS] URL da requisição:', url);

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosParaSalvar)
      });

      console.log('[ADMIN_USUARIOS] Resposta da API:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ADMIN_USUARIOS] Erro da API:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const resultado = await response.json();
      console.log('[ADMIN_USUARIOS] Resultado da edição:', resultado);
      
      setUsuarios(prev => prev.map(u => 
        u.id === usuarioSelecionado.id ? { ...u, ...resultado.usuario } : u
      ));

      toast.success('Usuário atualizado com sucesso!');
      setModalEdicao(false);
      setUsuarioSelecionado(null);
    } catch (error) {
      console.error('[ADMIN_USUARIOS] Erro ao salvar usuário:', error);
      
      if (error.message.includes('Failed to fetch')) {
        toast.error('Erro de conexão', {
          description: 'Não foi possível conectar ao servidor. Verifique sua internet.'
        });
      } else if (error.message.includes('404')) {
        toast.error('Rota não encontrada', {
          description: 'A API de edição de usuários não foi encontrada no servidor.'
        });
      } else if (error.message.includes('Usuário não encontrado')) {
        toast.error('Usuário não encontrado', {
          description: 'O usuário pode ter sido excluído por outro administrador.'
        });
        // Recarregar a lista de usuários
        carregarUsuarios();
      } else {
        toast.error(error.message || 'Erro ao salvar usuário');
      }
    } finally {
      setSalvando(false);
    }
  };

  const alterarStatusUsuario = async (usuario: Usuario, novoStatus: boolean) => {
    try {
      console.log('[ADMIN_USUARIOS] Alterando status do usuário:', {
        id: usuario.id,
        nome: usuario.nome,
        novoStatus
      });

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${usuario.id}/status`;
      console.log('[ADMIN_USUARIOS] URL da requisição:', url);

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ativo: novoStatus })
      });

      console.log('[ADMIN_USUARIOS] Resposta da API:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ADMIN_USUARIOS] Erro da API:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const resultado = await response.json();
      console.log('[ADMIN_USUARIOS] Resultado da alteração:', resultado);

      setUsuarios(prev => prev.map(u => 
        u.id === usuario.id ? { ...u, ativo: novoStatus } : u
      ));

      toast.success(`Usuário ${novoStatus ? 'ativado' : 'desativado'} com sucesso!`);
    } catch (error) {
      console.error('[ADMIN_USUARIOS] Erro ao alterar status:', error);
      
      if (error.message.includes('Failed to fetch')) {
        toast.error('Erro de conexão', {
          description: 'Não foi possível conectar ao servidor. Verifique sua internet.'
        });
      } else if (error.message.includes('404')) {
        toast.error('Rota não encontrada', {
          description: 'A API de alteração de status não foi encontrada no servidor.'
        });
      } else {
        toast.error(error.message || 'Erro ao alterar status do usuário');
      }
    }
  };

  const excluirUsuario = async () => {
    if (!usuarioSelecionado) return;

    setSalvando(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${usuarioSelecionado.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao excluir usuário');
      }

      setUsuarios(prev => prev.filter(u => u.id !== usuarioSelecionado.id));
      
      toast.success('Usuário excluído com sucesso!');
      setModalExclusao(false);
      setUsuarioSelecionado(null);
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      toast.error(error.message || 'Erro ao excluir usuário');
    } finally {
      setSalvando(false);
    }
  };

  const usuariosFiltrados = usuarios.filter(usuario => {
    const matchBusca = usuario.nome.toLowerCase().includes(busca.toLowerCase()) ||
                       usuario.email.toLowerCase().includes(busca.toLowerCase());
    
    const matchTipo = filtroTipo === 'todos' || usuario.tipo === filtroTipo;
    const matchStatus = filtroStatus === 'todos' || 
                       (filtroStatus === 'ativo' && usuario.ativo) ||
                       (filtroStatus === 'inativo' && !usuario.ativo);
    
    return matchBusca && matchTipo && matchStatus;
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
              <h1 className="text-xl font-semibold text-gray-900">Administração de Usuários</h1>
              <p className="text-sm text-gray-600">Visualizar, editar e gerenciar todos os usuários do sistema</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              Total: {usuarios.length} usuários
            </div>
            <Button 
              onClick={carregarUsuarios}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Atualizar'
              )}
            </Button>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tiposUsuario.map(tipo => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Usuários */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Usuários ({usuariosFiltrados.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {usuariosFiltrados.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhum usuário encontrado</p>
                {busca || filtroTipo !== 'todos' || filtroStatus !== 'todos' ? (
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
                          {usuario.serie && (
                            <div>
                              Série: {usuario.serie}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Cadastrado: {formatarData(usuario.criadoEm)}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setUsuarioSelecionado(usuario);
                          setModalDetalhes(true);
                        }}
                        title="Ver detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => iniciarEdicao(usuario)}
                        title="Editar usuário"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => alterarStatusUsuario(usuario, !usuario.ativo)}
                        title={usuario.ativo ? 'Desativar usuário' : 'Ativar usuário'}
                        className={usuario.ativo ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'}
                      >
                        {usuario.ativo ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                      </Button>
                      {usuario.id !== usuarioLogado?.id && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700"
                          onClick={() => {
                            setUsuarioSelecionado(usuario);
                            setModalExclusao(true);
                          }}
                          title="Excluir usuário"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Modal de Detalhes */}
      <Dialog open={modalDetalhes} onOpenChange={setModalDetalhes}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Usuário</DialogTitle>
            <DialogDescription>
              Informações completas do usuário selecionado
            </DialogDescription>
          </DialogHeader>
          
          {usuarioSelecionado && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={usuarioSelecionado.avatar} alt={usuarioSelecionado.nome} />
                  <AvatarFallback>
                    {usuarioSelecionado.nome.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{usuarioSelecionado.nome}</h3>
                  <div className="flex items-center gap-2">
                    <Badge className={getTipoColor(usuarioSelecionado.tipo)}>
                      {getTipoLabel(usuarioSelecionado.tipo)}
                    </Badge>
                    <Badge variant={usuarioSelecionado.ativo ? 'default' : 'secondary'}>
                      {usuarioSelecionado.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Email</Label>
                  <p className="text-sm">{usuarioSelecionado.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Tipo</Label>
                  <p className="text-sm">{getTipoLabel(usuarioSelecionado.tipo)}</p>
                </div>
                {usuarioSelecionado.serie && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Série</Label>
                    <p className="text-sm">{usuarioSelecionado.serie}</p>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium text-gray-600">Cadastrado em</Label>
                  <p className="text-sm">{formatarData(usuarioSelecionado.criadoEm)}</p>
                </div>
                {usuarioSelecionado.atualizadoEm && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Última atualização</Label>
                    <p className="text-sm">{formatarData(usuarioSelecionado.atualizadoEm)}</p>
                  </div>
                )}
              </div>
              
              {usuarioSelecionado.disciplinas && usuarioSelecionado.disciplinas.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Disciplinas</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {usuarioSelecionado.disciplinas.map((disciplina, index) => (
                      <Badge key={index} variant="outline">{disciplina}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {usuarioSelecionado.series && usuarioSelecionado.series.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Séries</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {usuarioSelecionado.series.map((serie, index) => (
                      <Badge key={index} variant="outline">{serie}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Edição */}
      <Dialog open={modalEdicao} onOpenChange={setModalEdicao}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Altere as informações do usuário. Deixe a senha em branco para manter a atual.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="geral" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="geral">Dados Gerais</TabsTrigger>
              <TabsTrigger value="tipo">Tipo & Permissões</TabsTrigger>
              <TabsTrigger value="senha">Senha</TabsTrigger>
            </TabsList>
            
            <TabsContent value="geral" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input
                    value={dadosEdicao.nome}
                    onChange={(e) => setDadosEdicao(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={dadosEdicao.email}
                    onChange={(e) => setDadosEdicao(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Email"
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="tipo" className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Usuário</Label>
                <Select 
                  value={dadosEdicao.tipo} 
                  onValueChange={(value) => setDadosEdicao(prev => ({ ...prev, tipo: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aluno">Aluno</SelectItem>
                    <SelectItem value="professor">Professor</SelectItem>
                    <SelectItem value="coordenador">Coordenador</SelectItem>
                    <SelectItem value="administrador">Administrador</SelectItem>
                    <SelectItem value="professor_conteudista">Professor Conteudista</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {dadosEdicao.tipo === 'aluno' && (
                <div className="space-y-2">
                  <Label>Série</Label>
                  <Select 
                    value={dadosEdicao.serie} 
                    onValueChange={(value) => setDadosEdicao(prev => ({ ...prev, serie: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a série" />
                    </SelectTrigger>
                    <SelectContent>
                      {seriesDisponiveis.map((serie) => (
                        <SelectItem key={serie} value={serie}>{serie}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(dadosEdicao.tipo === 'professor' || dadosEdicao.tipo === 'professor_conteudista') && (
                <div className="space-y-2">
                  <Label>Disciplinas</Label>
                  <div className="max-h-40 overflow-y-auto border rounded-lg p-3">
                    {disciplinasDisponiveis.map((disciplina) => (
                      <div key={disciplina} className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          checked={dadosEdicao.disciplinas.includes(disciplina)}
                          onChange={(e) => setDadosEdicao(prev => ({
                            ...prev,
                            disciplinas: e.target.checked 
                              ? [...prev.disciplinas, disciplina]
                              : prev.disciplinas.filter(d => d !== disciplina)
                          }))}
                          className="rounded"
                        />
                        <Label className="text-sm">{disciplina}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {dadosEdicao.tipo === 'professor' && (
                <div className="space-y-2">
                  <Label>Séries</Label>
                  <div className="max-h-40 overflow-y-auto border rounded-lg p-3">
                    {seriesDisponiveis.map((serie) => (
                      <div key={serie} className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          checked={dadosEdicao.series.includes(serie)}
                          onChange={(e) => setDadosEdicao(prev => ({
                            ...prev,
                            series: e.target.checked 
                              ? [...prev.series, serie]
                              : prev.series.filter(s => s !== serie)
                          }))}
                          className="rounded"
                        />
                        <Label className="text-sm">{serie}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="senha" className="space-y-4">
              <div className="space-y-2">
                <Label>Nova Senha (opcional)</Label>
                <div className="relative">
                  <Input
                    type={mostrarSenha ? "text" : "password"}
                    value={dadosEdicao.novaSenha}
                    onChange={(e) => setDadosEdicao(prev => ({ ...prev, novaSenha: e.target.value }))}
                    placeholder="Deixe em branco para manter a senha atual"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                  >
                    {mostrarSenha ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Mínimo de 6 caracteres. Deixe em branco para não alterar a senha atual.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setModalEdicao(false)} disabled={salvando}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={salvarEdicao} disabled={salvando}>
              {salvando ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {salvando ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Exclusão */}
      <AlertDialog open={modalExclusao} onOpenChange={setModalExclusao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{usuarioSelecionado?.nome}</strong>?
              Esta ação não pode ser desfeita e todos os dados do usuário serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={salvando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={excluirUsuario}
              disabled={salvando}
              className="bg-red-600 hover:bg-red-700"
            >
              {salvando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}