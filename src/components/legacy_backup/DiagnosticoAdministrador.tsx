import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Loader2, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

interface DiagnosticoProps {
  onFechar: () => void;
}

interface TesteResultado {
  nome: string;
  status: 'sucesso' | 'erro' | 'aviso' | 'testando';
  detalhes: string;
  dados?: any;
}

export function DiagnosticoAdministrador({ onFechar }: DiagnosticoProps) {
  const [testes, setTestes] = useState<TesteResultado[]>([]);
  const [testando, setTestando] = useState(false);
  const { usuario } = useAuth();

  const adicionarTeste = (teste: TesteResultado) => {
    setTestes(prev => {
      const existente = prev.findIndex(t => t.nome === teste.nome);
      if (existente >= 0) {
        const novos = [...prev];
        novos[existente] = teste;
        return novos;
      }
      return [...prev, teste];
    });
  };

  const executarDiagnostico = async () => {
    setTestando(true);
    setTestes([]);

    // Teste 1: Verificar contexto de autenticação
    try {
      adicionarTeste({
        nome: 'Contexto de Autenticação',
        status: 'testando',
        detalhes: 'Verificando dados do usuário...'
      });

      if (!usuario) {
        adicionarTeste({
          nome: 'Contexto de Autenticação',
          status: 'erro',
          detalhes: 'Usuário não encontrado no contexto'
        });
      } else if (usuario.tipo !== 'administrador') {
        adicionarTeste({
          nome: 'Contexto de Autenticação',
          status: 'erro',
          detalhes: `Usuário não é administrador. Tipo atual: ${usuario.tipo}`
        });
      } else {
        adicionarTeste({
          nome: 'Contexto de Autenticação',
          status: 'sucesso',
          detalhes: `Usuário administrador logado: ${usuario.nome}`,
          dados: { nome: usuario.nome, email: usuario.email, tipo: usuario.tipo }
        });
      }
    } catch (error) {
      adicionarTeste({
        nome: 'Contexto de Autenticação',
        status: 'erro',
        detalhes: `Erro no contexto: ${error.message}`
      });
    }

    // Teste 2: Verificar configuração do Supabase
    try {
      adicionarTeste({
        nome: 'Configuração Supabase',
        status: 'testando',
        detalhes: 'Verificando variáveis de ambiente...'
      });

      if (!projectId || projectId === 'SEU_PROJECT_ID_AQUI') {
        adicionarTeste({
          nome: 'Configuração Supabase',
          status: 'erro',
          detalhes: 'Project ID não configurado'
        });
      } else if (!publicAnonKey || publicAnonKey === 'SEU_ANON_KEY_AQUI') {
        adicionarTeste({
          nome: 'Configuração Supabase',
          status: 'erro',
          detalhes: 'Anon Key não configurada'
        });
      } else {
        adicionarTeste({
          nome: 'Configuração Supabase',
          status: 'sucesso',
          detalhes: 'Configurações do Supabase OK',
          dados: { projectId: projectId.substring(0, 8) + '...', hasAnonKey: true }
        });
      }
    } catch (error) {
      adicionarTeste({
        nome: 'Configuração Supabase',
        status: 'erro',
        detalhes: `Erro na configuração: ${error.message}`
      });
    }

    // Teste 3: Testar conectividade do servidor
    try {
      adicionarTeste({
        nome: 'Conectividade do Servidor',
        status: 'testando',
        detalhes: 'Testando conexão com servidor...'
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        adicionarTeste({
          nome: 'Conectividade do Servidor',
          status: 'sucesso',
          detalhes: `Servidor respondeu: ${data.message || 'OK'}`,
          dados: data
        });
      } else {
        adicionarTeste({
          nome: 'Conectividade do Servidor',
          status: 'erro',
          detalhes: `Servidor retornou erro ${response.status}: ${response.statusText}`
        });
      }
    } catch (error) {
      let detalhes = 'Erro desconhecido';
      if (error.name === 'AbortError') {
        detalhes = 'Timeout - servidor não respondeu em 10 segundos';
      } else if (error.message?.includes('Failed to fetch')) {
        detalhes = 'Erro de rede - não foi possível conectar ao servidor';
      } else {
        detalhes = error.message;
      }

      adicionarTeste({
        nome: 'Conectividade do Servidor',
        status: 'erro',
        detalhes
      });
    }

    // Teste 4: Testar rota /admin/usuarios
    try {
      adicionarTeste({
        nome: 'Rota Admin/Usuários',
        status: 'testando',
        detalhes: 'Testando acesso à rota de usuários...'
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        adicionarTeste({
          nome: 'Rota Admin/Usuários',
          status: 'sucesso',
          detalhes: `${data.usuarios?.length || 0} usuários encontrados`,
          dados: { totalUsuarios: data.usuarios?.length || 0 }
        });
      } else {
        const errorText = await response.text();
        adicionarTeste({
          nome: 'Rota Admin/Usuários',
          status: 'erro',
          detalhes: `HTTP ${response.status}: ${response.statusText} - ${errorText}`
        });
      }
    } catch (error) {
      let detalhes = 'Erro desconhecido';
      if (error.name === 'AbortError') {
        detalhes = 'Timeout - rota não respondeu em 15 segundos';
      } else if (error.message?.includes('Failed to fetch')) {
        detalhes = 'Erro de rede - não foi possível acessar a rota';
      } else {
        detalhes = error.message;
      }

      adicionarTeste({
        nome: 'Rota Admin/Usuários',
        status: 'erro',
        detalhes
      });
    }

    // Teste 5: Testar rota de relatórios
    try {
      adicionarTeste({
        nome: 'Rota Admin/Relatórios',
        status: 'testando',
        detalhes: 'Testando acesso a relatórios...'
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/relatorios`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        adicionarTeste({
          nome: 'Rota Admin/Relatórios',
          status: 'sucesso',
          detalhes: 'Relatórios acessíveis',
          dados: data.relatorios
        });
      } else {
        adicionarTeste({
          nome: 'Rota Admin/Relatórios',
          status: 'erro',
          detalhes: `HTTP ${response.status}: ${response.statusText}`
        });
      }
    } catch (error) {
      adicionarTeste({
        nome: 'Rota Admin/Relatórios',
        status: 'erro',
        detalhes: error.message
      });
    }

    setTestando(false);
    toast.success('Diagnóstico completo!');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sucesso':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'erro':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'aviso':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'testando':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sucesso':
        return 'bg-green-50 border-green-200';
      case 'erro':
        return 'bg-red-50 border-red-200';
      case 'aviso':
        return 'bg-yellow-50 border-yellow-200';
      case 'testando':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  useEffect(() => {
    executarDiagnostico();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🔍 Diagnóstico do Administrador</h1>
            <p className="text-gray-600">Verificando problemas com o usuário administrador</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={executarDiagnostico}
              disabled={testando}
              variant="outline"
            >
              {testando ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Refazer Testes
            </Button>
            <Button onClick={onFechar}>
              Fechar
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {testes.map((teste, index) => (
            <Card key={index} className={getStatusColor(teste.status)}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3">
                  {getStatusIcon(teste.status)}
                  <span className="text-lg">{teste.nome}</span>
                  <Badge variant={teste.status === 'sucesso' ? 'default' : 'destructive'}>
                    {teste.status.toUpperCase()}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-3">{teste.detalhes}</p>
                {teste.dados && (
                  <div className="bg-white rounded p-3 border">
                    <h4 className="font-medium mb-2">Dados Adicionais:</h4>
                    <pre className="text-sm text-gray-600 overflow-auto">
                      {JSON.stringify(teste.dados, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {testes.length === 0 && !testando && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">Clique em "Refazer Testes" para iniciar o diagnóstico</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Resumo dos resultados */}
        {testes.length > 0 && !testando && (
          <Card className="mt-6 bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">📊 Resumo dos Testes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {testes.filter(t => t.status === 'sucesso').length}
                  </div>
                  <div className="text-sm text-gray-600">Sucessos</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {testes.filter(t => t.status === 'erro').length}
                  </div>
                  <div className="text-sm text-gray-600">Erros</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {testes.filter(t => t.status === 'aviso').length}
                  </div>
                  <div className="text-sm text-gray-600">Avisos</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}