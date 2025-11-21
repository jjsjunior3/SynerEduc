import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  ArrowLeft, 
  User, 
  RefreshCw, 
  Loader2, 
  CheckCircle,
  AlertTriangle,
  Search
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface DiagnosticoUsuariosIdsProps {
  onVoltar: () => void;
}

interface UsuarioDiagnostico {
  key: string;
  id: string;
  nome: string;
  email: string;
  tipo: string;
  nomeUsuario?: string;
  idValido: boolean;
  chaveCorreta: boolean;
}

export function DiagnosticoUsuariosIds({ onVoltar }: DiagnosticoUsuariosIdsProps) {
  const [usuarios, setUsuarios] = useState<UsuarioDiagnostico[]>([]);
  const [loading, setLoading] = useState(true);
  const [testando, setTestando] = useState<string | null>(null);

  const carregarUsuarios = async () => {
    setLoading(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[DIAGNOSTICO] Dados brutos dos usuários:', data);
        
        if (data.success && data.usuarios) {
          const usuariosDiagnostico = data.usuarios.map(usuario => {
            const idValido = !!(usuario.id && typeof usuario.id === 'string' && usuario.id.trim().length > 0);
            const chaveEsperada = `usuario:${usuario.id}`;
            
            return {
              key: chaveEsperada,
              id: usuario.id || 'SEM_ID',
              nome: usuario.nome || 'Sem nome',
              email: usuario.email || 'Sem email',
              tipo: usuario.tipo || 'Sem tipo',
              nomeUsuario: usuario.nomeUsuario,
              idValido,
              chaveCorreta: idValido
            };
          });
          
          setUsuarios(usuariosDiagnostico);
          
          const totalUsuarios = usuariosDiagnostico.length;
          const usuariosValidos = usuariosDiagnostico.filter(u => u.idValido).length;
          const usuariosInvalidos = totalUsuarios - usuariosValidos;
          
          toast.success(`📊 Diagnóstico concluído!`, {
            description: `${totalUsuarios} usuários encontrados | ${usuariosValidos} válidos | ${usuariosInvalidos} com problemas`
          });
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('[DIAGNOSTICO] Erro ao carregar usuários:', error);
      toast.error('Erro ao carregar usuários para diagnóstico');
    } finally {
      setLoading(false);
    }
  };

  const testarEdicaoUsuario = async (usuario: UsuarioDiagnostico) => {
    setTestando(usuario.id);
    
    try {
      console.log(`[DIAGNOSTICO] Testando edição do usuário:`, {
        id: usuario.id,
        chave: usuario.key,
        nome: usuario.nome
      });

      // Fazer uma requisição de teste para editar o usuário
      const dadosTestе = {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        tipo: usuario.tipo
      };

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${usuario.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosTestе)
      });

      console.log(`[DIAGNOSTICO] Response status:`, response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log(`[DIAGNOSTICO] Sucesso na edição:`, result);
        toast.success(`✅ Usuário ${usuario.nome} pode ser editado!`);
      } else {
        const errorText = await response.text();
        console.error(`[DIAGNOSTICO] Erro na edição:`, {
          status: response.status,
          error: errorText
        });
        toast.error(`❌ Erro ao testar edição: ${response.status}`, {
          description: errorText
        });
      }
    } catch (error) {
      console.error(`[DIAGNOSTICO] Erro na requisição:`, error);
      toast.error(`🔌 Erro de conexão no teste de edição`);
    } finally {
      setTestando(null);
    }
  };

  const buscarPorId = async (usuario: UsuarioDiagnostico) => {
    setTestando(`busca_${usuario.id}`);
    
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${usuario.id}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`[DIAGNOSTICO] Usuário encontrado:`, result);
        toast.success(`🔍 Usuário encontrado!`, {
          description: `${result.usuario?.nome || 'Nome não definido'}`
        });
      } else {
        const errorText = await response.text();
        console.error(`[DIAGNOSTICO] Usuário não encontrado:`, errorText);
        toast.error(`❌ Usuário não encontrado`, {
          description: `Status: ${response.status}`
        });
      }
    } catch (error) {
      console.error(`[DIAGNOSTICO] Erro na busca:`, error);
      toast.error(`🔌 Erro de conexão na busca`);
    } finally {
      setTestando(null);
    }
  };

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const usuariosValidos = usuarios.filter(u => u.idValido);
  const usuariosInvalidos = usuarios.filter(u => !u.idValido);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onVoltar}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">🔍 Diagnóstico - IDs de Usuários</h1>
            <p className="text-sm text-gray-600">Verificação de integridade dos IDs para resolver erro 404</p>
          </div>
          <Button onClick={carregarUsuarios} disabled={loading} variant="outline">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{usuarios.length}</div>
              <div className="text-sm text-gray-600">Total de Usuários</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{usuariosValidos.length}</div>
              <div className="text-sm text-gray-600">IDs Válidos</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{usuariosInvalidos.length}</div>
              <div className="text-sm text-gray-600">IDs Inválidos</div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p>Carregando usuários para diagnóstico...</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Usuários e seus IDs ({usuarios.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {usuarios.map((usuario) => (
                  <div
                    key={usuario.key}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          {usuario.idValido ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                          )}
                          <span className="font-medium">{usuario.nome}</span>
                        </div>
                        <Badge className={usuario.idValido ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {usuario.tipo}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">ID:</span> 
                          <code className="ml-1 px-1 bg-gray-100 rounded">{usuario.id}</code>
                        </div>
                        <div>
                          <span className="font-medium">Email:</span> {usuario.email}
                        </div>
                        <div>
                          <span className="font-medium">Login:</span> {usuario.nomeUsuario || 'Não definido'}
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500 mt-1">
                        <span className="font-medium">Chave esperada:</span> 
                        <code className="ml-1 px-1 bg-gray-100 rounded">{usuario.key}</code>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => buscarPorId(usuario)}
                        disabled={!!testando}
                        className="flex items-center gap-1"
                      >
                        {testando === `busca_${usuario.id}` ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Search className="w-3 h-3" />
                        )}
                        Buscar
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testarEdicaoUsuario(usuario)}
                        disabled={!!testando}
                        className="flex items-center gap-1"
                      >
                        {testando === usuario.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <User className="w-3 h-3" />
                        )}
                        Testar Edição
                      </Button>
                    </div>
                  </div>
                ))}
                
                {usuarios.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Nenhum usuário encontrado</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}