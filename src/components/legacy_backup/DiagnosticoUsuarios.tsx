import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { RefreshCw, UserCheck, UserX, Settings } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo: string;
  ativo: boolean;
  criadoEm?: string;
  atualizadoEm?: string;
  serie?: string;
}

export function DiagnosticoUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    ativos: 0,
    inativos: 0,
    administradores: 0
  });

  const buscarUsuarios = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Iniciando busca de usuários...');
      console.log('Project ID:', projectId);
      console.log('URL completa:', `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/usuarios`);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/usuarios`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na resposta:', errorText);
        throw new Error(`Erro ${response.status}: ${errorText || 'Erro na requisição'}`);
      }

      const data = await response.json();
      console.log('Dados recebidos:', data);
      
      if (data.success === false) {
        throw new Error(data.error || 'Erro retornado pelo servidor');
      }
      
      if (data.usuarios && Array.isArray(data.usuarios)) {
        setUsuarios(data.usuarios);
        
        // Calcular estatísticas
        const total = data.usuarios.length;
        const ativos = data.usuarios.filter((u: Usuario) => u.ativo).length;
        const inativos = total - ativos;
        const administradores = data.usuarios.filter((u: Usuario) => u.tipo === 'administrador').length;
        
        setStats({ total, ativos, inativos, administradores });
        console.log('Estatísticas calculadas:', { total, ativos, inativos, administradores });
      } else {
        console.warn('Nenhum usuário encontrado ou formato inválido');
        setUsuarios([]);
        setStats({ total: 0, ativos: 0, inativos: 0, administradores: 0 });
      }
    } catch (err) {
      console.error('Erro detalhado ao buscar usuários:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao verificar usuários';
      setError(errorMessage);
      setUsuarios([]);
      setStats({ total: 0, ativos: 0, inativos: 0, administradores: 0 });
    } finally {
      setLoading(false);
    }
  };

  const reativarUsuario = async (email: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/usuarios/reativar`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }

      console.log(`Usuário ${email} reativado com sucesso`);
      // Recarregar lista
      await buscarUsuarios();
    } catch (err) {
      console.error('Erro ao reativar usuário:', err);
      setError(`Erro ao reativar usuário: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    }
  };

  useEffect(() => {
    if (projectId) {
      buscarUsuarios();
    } else {
      setError('Configuração do projeto não encontrada. Verifique o arquivo de configuração.');
    }
  }, [projectId]);

  const getBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case 'administrador': return 'destructive';
      case 'coordenador': return 'default';
      case 'professor': return 'secondary';
      case 'professor_conteudista': return 'outline';
      default: return 'outline';
    }
  };

  const formatarData = (data: string | undefined) => {
    if (!data) return 'N/A';
    try {
      return new Date(data).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Data inválida';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Diagnóstico de Usuários</h1>
            <p className="text-gray-600 mt-1">
              Visualize todos os usuários cadastrados no sistema
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={buscarUsuarios} disabled={loading} className="flex items-center gap-2">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = window.location.pathname}
              className="flex items-center gap-2"
            >
              ← Voltar ao App
            </Button>
          </div>
        </div>

        {/* Informações do Sistema */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Informações de Conectividade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>Project ID:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{projectId || 'Não encontrado'}</code></p>
              <p><strong>Endpoint:</strong> <code className="bg-gray-100 px-2 py-1 rounded text-xs">https://{projectId}.supabase.co/functions/v1/make-server-c61d1ad0/usuarios</code></p>
              <p><strong>Status:</strong> {loading ? '🔄 Carregando...' : error ? '❌ Erro de conexão' : '✅ Conectado'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.ativos}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuários Inativos</CardTitle>
              <UserX className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.inativos}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Administradores</CardTitle>
              <Settings className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.administradores}</div>
            </CardContent>
          </Card>
        </div>

        {/* Alertas */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>Erro ao verificar usuários:</strong></p>
                <p>{error}</p>
                <div className="text-xs mt-2 p-2 bg-red-50 rounded border">
                  <p><strong>Informações de debug:</strong></p>
                  <p>Project ID: {projectId || 'Não encontrado'}</p>
                  <p>URL: https://{projectId}.supabase.co/functions/v1/make-server-c61d1ad0/usuarios</p>
                  <p>Tente verificar se o servidor está funcionando ou use ?corrigir-rotas para diagnosticar</p>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {stats.administradores === 0 && stats.total > 0 && (
          <Alert>
            <AlertDescription>
              ⚠️ Nenhum administrador ativo encontrado no sistema!
            </AlertDescription>
          </Alert>
        )}

        {/* Tabela de Usuários */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Usuários</CardTitle>
            <CardDescription>
              Todos os usuários cadastrados no sistema com seus respectivos status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span className="ml-2">Carregando usuários...</span>
              </div>
            ) : usuarios.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhum usuário encontrado
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Série</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead>Atualizado em</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usuarios.map((usuario) => (
                      <TableRow 
                        key={usuario.id}
                        className={usuario.email === 'jrsantosdev1@gmail.com' ? 'bg-blue-50' : ''}
                      >
                        <TableCell className="font-medium">
                          {usuario.nome}
                          {usuario.email === 'jrsantosdev1@gmail.com' && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              PRINCIPAL
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{usuario.email}</TableCell>
                        <TableCell>
                          <Badge variant={getBadgeVariant(usuario.tipo)}>
                            {usuario.tipo.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{usuario.serie || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={usuario.ativo ? 'default' : 'destructive'}>
                            {usuario.ativo ? 'ATIVO' : 'INATIVO'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatarData(usuario.criadoEm)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatarData(usuario.atualizadoEm)}
                        </TableCell>
                        <TableCell>
                          {!usuario.ativo && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => reativarUsuario(usuario.email)}
                              className="flex items-center gap-1"
                            >
                              <UserCheck className="h-3 w-3" />
                              Reativar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}