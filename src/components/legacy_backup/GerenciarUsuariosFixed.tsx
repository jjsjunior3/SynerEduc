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
import { ArrowLeft, User, Mail, Calendar, Search, Loader2, Edit, Trash2, Shield, ShieldOff, Save, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

interface GerenciarUsuariosFixedProps {
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

export function GerenciarUsuariosFixed({ onVoltar }: GerenciarUsuariosFixedProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Usuario | null>(null);
  const [modalEdicao, setModalEdicao] = useState(false);
  const [modalExclusao, setModalExclusao] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
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
      case 'aluno': return 'bg-blue-100 text-blue-800';
      case 'professor': return 'bg-green-100 text-green-800';
      case 'coordenador': return 'bg-purple-100 text-purple-800';
      case 'administrador': return 'bg-red-100 text-red-800';
      case 'professor_conteudista': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'aluno': return 'Aluno';
      case 'professor': return 'Professor';
      case 'coordenador': return 'Coordenador';
      case 'administrador': return 'Administrador';
      case 'professor_conteudista': return 'Prof. Conteudista';
      default: return tipo;
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

  // Função auxiliar para fazer requests com debug completo
  const makeDebugRequest = async (url: string, options: RequestInit) => {
    const fullUrl = `https://${projectId}.supabase.co/functions/v1${url}`;
    
    console.log('[DEBUG_REQUEST] Iniciando requisição:', {
      url: fullUrl,
      method: options.method,
      headers: options.headers,
      body: options.body,
      timestamp: new Date().toISOString()
    });

    try {
      const response = await fetch(fullUrl, options);
      
      console.log('[DEBUG_REQUEST] Resposta recebida:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
        timestamp: new Date().toISOString()
      });

      const responseText = await response.text();
      console.log('[DEBUG_REQUEST] Response text:', responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('[DEBUG_REQUEST] JSON parse error:', jsonError);
        responseData = { rawResponse: responseText, parseError: jsonError.message };
      }

      console.log('[DEBUG_REQUEST] Response data:', responseData);

      return {
        response,
        data: responseData,
        rawText: responseText
      };
    } catch (fetchError) {
      console.error('[DEBUG_REQUEST] Fetch error:', fetchError);
      throw fetchError;
    }
  };

  const carregarUsuarios = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('[GERENCIAR_USUARIOS] Iniciando carregamento de usuários...');
      
      const result = await makeDebugRequest('/make-server-c61d1ad0/admin/usuarios', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!result.response.ok) {
        throw new Error(result.data.error || `HTTP ${result.response.status}: ${result.response.statusText}`);
      }

      const usuarios = result.data.usuarios || [];
      console.log('[GERENCIAR_USUARIOS] Usuários carregados:', usuarios.length);
      
      setUsuarios(usuarios);
      setDebugInfo({
        lastLoad: new Date().toISOString(),
        totalUsers: usuarios.length,
        userTypes: usuarios.reduce((acc, u) => {
          acc[u.tipo] = (acc[u.tipo] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      });
      
      toast.success(`${usuarios.length} usuários carregados com sucesso!`);
    } catch (error) {
      console.error('[GERENCIAR_USUARIOS] Erro ao carregar usuários:', error);
      
      let errorMessage = 'Erro ao carregar usuários';
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage = '🔌 Erro de conexão. Verifique sua internet e se o servidor está funcionando.';
      } else if (error.message.includes('404')) {
        errorMessage = '📋 API não encontrada. A rota /admin/usuarios pode não estar implementada.';
      } else if (error.message.includes('500')) {
        errorMessage = '⚠️ Erro interno do servidor. Verifique os logs do servidor.';
      } else {
        errorMessage = error.message || 'Erro desconhecido ao carregar usuários';
      }
      
      setError(errorMessage);
      toast.error('Erro ao carregar usuários', {
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const alterarStatusUsuario = async (usuario: Usuario, novoStatus: boolean) => {
    try {
      console.log('[GERENCIAR_USUARIOS] Alterando status:', { usuario: usuario.id, novoStatus });

      const result = await makeDebugRequest(`/make-server-c61d1ad0/admin/usuarios/${usuario.id}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ativo: novoStatus })
      });

      if (!result.response.ok) {
        throw new Error(result.data.error || `HTTP ${result.response.status}: ${result.response.statusText}`);
      }

      setUsuarios(prev => prev.map(u => 
        u.id === usuario.id ? { ...u, ativo: novoStatus } : u
      ));

      toast.success(`Usuário ${novoStatus ? 'ativado' : 'desativado'} com sucesso!`);
    } catch (error) {
      console.error('[GERENCIAR_USUARIOS] Erro ao alterar status:', error);
      
      if (error.message.includes('Failed to fetch')) {
        toast.error('Erro de conexão', {
          description: 'Não foi possível conectar ao servidor.'
        });
      } else if (error.message.includes('404')) {
        toast.error('Rota não encontrada', {
          description: 'A API de alteração de status não foi encontrada.'
        });
      } else {
        toast.error('Erro ao alterar status', {
          description: error.message
        });
      }
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

      console.log('[GERENCIAR_USUARIOS] Salvando edição:', { 
        usuario: usuarioSelecionado.id, 
        dados: dadosParaSalvar 
      });

      const result = await makeDebugRequest(`/make-server-c61d1ad0/admin/usuarios/${usuarioSelecionado.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosParaSalvar)
      });

      if (!result.response.ok) {
        throw new Error(result.data.error || `HTTP ${result.response.status}: ${result.response.statusText}`);
      }

      const usuarioAtualizado = result.data.usuario || result.data;
      
      setUsuarios(prev => prev.map(u => 
        u.id === usuarioSelecionado.id ? { ...u, ...usuarioAtualizado } : u
      ));

      toast.success('Usuário atualizado com sucesso!');
      setModalEdicao(false);
      setUsuarioSelecionado(null);
    } catch (error) {
      console.error('[GERENCIAR_USUARIOS] Erro ao salvar usuário:', error);
      
      if (error.message.includes('Failed to fetch')) {
        toast.error('Erro de conexão', {
          description: 'Não foi possível conectar ao servidor.'
        });
      } else if (error.message.includes('404')) {
        toast.error('Rota não encontrada', {
          description: 'A API de edição não foi encontrada.'
        });
      } else if (error.message.includes('Usuário não encontrado')) {
        toast.error('Usuário não encontrado', {
          description: 'O usuário pode ter sido excluído. Recarregando a lista...'
        });
        carregarUsuarios();
      } else {
        toast.error('Erro ao salvar usuário', {
          description: error.message
        });
      }
    } finally {
      setSalvando(false);
    }
  };

  const excluirUsuario = async () => {
    if (!usuarioSelecionado) return;

    setSalvando(true);
    try {
      console.log('[GERENCIAR_USUARIOS] Excluindo usuário:', usuarioSelecionado.id);

      const result = await makeDebugRequest(`/make-server-c61d1ad0/admin/usuarios/${usuarioSelecionado.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!result.response.ok) {
        throw new Error(result.data.error || `HTTP ${result.response.status}: ${result.response.statusText}`);
      }

      setUsuarios(prev => prev.filter(u => u.id !== usuarioSelecionado.id));
      
      toast.success('Usuário excluído com sucesso!');
      setModalExclusao(false);
      setUsuarioSelecionado(null);
    } catch (error) {
      console.error('[GERENCIAR_USUARIOS] Erro ao excluir usuário:', error);
      toast.error('Erro ao excluir usuário', {
        description: error.message
      });
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
              <h1 className="text-xl font-semibold text-gray-900">Gerenciar Usuários (Fixed)</h1>
              <p className="text-sm text-gray-600">Versão corrigida com debug completo</p>
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
        {/* Debug Info */}
        {debugInfo && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Debug Info</span>
              </div>
              <div className="text-sm space-y-1">
                <p><strong>Último carregamento:</strong> {debugInfo.lastLoad}</p>
                <p><strong>Total de usuários:</strong> {debugInfo.totalUsers}</p>
                <p><strong>Por tipo:</strong> {JSON.stringify(debugInfo.userTypes)}</p>
                <p><strong>Project ID:</strong> {projectId}</p>
                <p><strong>Public Key:</strong> {publicAnonKey?.substring(0, 20)}...</p>
              </div>
            </CardContent>
          </Card>
        )}

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
              <User className="w-5 h-5" />
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

      {/* Modal de Edição */}
      <Dialog open={modalEdicao} onOpenChange={setModalEdicao}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Altere as informações do usuário. Deixe a senha em branco para manter a atual.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label>Nova Senha (opcional)</Label>
                <Input
                  type="password"
                  value={dadosEdicao.novaSenha}
                  onChange={(e) => setDadosEdicao(prev => ({ ...prev, novaSenha: e.target.value }))}
                  placeholder="Deixe em branco para manter atual"
                />
              </div>
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
          </div>

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
              Esta ação não pode ser desfeita.
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