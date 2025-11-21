import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  RefreshCw,
  Server,
  Database,
  Users,
  AlertCircle,
  Bug,
  Wrench,
  Zap,
  Shield,
  Key,
  UserCheck,
  Network
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface CorrecaoErrosEmergenciaProps {
  onVoltar?: () => void;
}

interface ResultadoTeste {
  nome: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  mensagem: string;
  detalhes?: any;
  tempo?: number;
}

export function CorrecaoErrosEmergencia({ onVoltar }: CorrecaoErrosEmergenciaProps) {
  const [executando, setExecutando] = useState(false);
  const [resultados, setResultados] = useState<ResultadoTeste[]>([]);
  const [etapaAtual, setEtapaAtual] = useState<string>('');
  const [credenciaisAdmin, setCredenciaisAdmin] = useState({
    email: 'jrsantosdev1@gmail.com',
    senha: 'admin123456'
  });
  const [configuracaoCompleta, setConfiguracaoCompleta] = useState(false);

  const adicionarResultado = (resultado: ResultadoTeste) => {
    setResultados(prev => [...prev, resultado]);
  };

  const atualizarResultado = (index: number, resultado: Partial<ResultadoTeste>) => {
    setResultados(prev => prev.map((r, i) => i === index ? { ...r, ...resultado } : r));
  };

  // 1. Teste de Conectividade Básica
  const testarConectividade = async (): Promise<ResultadoTeste> => {
    const inicio = Date.now();
    try {
      console.log('[EMERGENCIA] Testando conectividade básica...');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      const tempo = Date.now() - inicio;
      
      if (!response.ok) {
        // Se health falhou, tentar sem prefixo
        const responseSimples = await fetch(`https://${projectId}.supabase.co/functions/v1/health`, {
          method: 'GET'
        });
        
        if (responseSimples.ok) {
          return {
            nome: '🔌 Conectividade Servidor',
            status: 'warning',
            mensagem: `Servidor respondeu sem prefixo em ${tempo}ms - Precisa correção de rotas`,
            tempo
          };
        }
        
        return {
          nome: '🔌 Conectividade Servidor',
          status: 'error',
          mensagem: `Servidor não responde (HTTP ${response.status})`,
          tempo
        };
      }

      const data = await response.json();
      
      return {
        nome: '🔌 Conectividade Servidor',
        status: 'success',
        mensagem: `Servidor online - ${tempo}ms`,
        detalhes: data,
        tempo
      };
      
    } catch (error) {
      return {
        nome: '🔌 Conectividade Servidor',
        status: 'error',
        mensagem: `Erro de conexão: ${error.message}`,
        tempo: Date.now() - inicio
      };
    }
  };

  // 2. Verificar e Criar Admin Principal
  const criarAdminEmergencia = async (): Promise<ResultadoTeste> => {
    const inicio = Date.now();
    try {
      console.log('[EMERGENCIA] Criando/Verificando administrador principal...');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/initial-setup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: credenciaisAdmin.email,
          senha: credenciaisAdmin.senha,
          nome: 'Administrador Principal',
          tipo: 'administrador'
        })
      });

      const tempo = Date.now() - inicio;
      
      if (!response.ok) {
        const errorText = await response.text();
        return {
          nome: '👤 Admin Principal',
          status: 'error',
          mensagem: `Erro ao criar admin (HTTP ${response.status})`,
          detalhes: { erro: errorText },
          tempo
        };
      }

      const data = await response.json();
      
      return {
        nome: '👤 Admin Principal',
        status: 'success',
        mensagem: `Admin configurado em ${tempo}ms`,
        detalhes: data,
        tempo
      };
      
    } catch (error) {
      return {
        nome: '👤 Admin Principal',
        status: 'error',
        mensagem: `Erro de conexão: ${error.message}`,
        tempo: Date.now() - inicio
      };
    }
  };

  // 3. Testar Login do Admin
  const testarLoginAdmin = async (): Promise<ResultadoTeste> => {
    const inicio = Date.now();
    try {
      console.log('[EMERGENCIA] Testando login do administrador...');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/login`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: credenciaisAdmin.email,
          senha: credenciaisAdmin.senha
        })
      });

      const tempo = Date.now() - inicio;
      
      if (!response.ok) {
        const errorText = await response.text();
        return {
          nome: '🔐 Login Admin',
          status: 'error',
          mensagem: `Login falhou (HTTP ${response.status})`,
          detalhes: { erro: errorText, credenciais: credenciaisAdmin },
          tempo
        };
      }

      const data = await response.json();
      
      if (!data.success) {
        return {
          nome: '🔐 Login Admin',
          status: 'error',
          mensagem: `Credenciais inválidas: ${data.error}`,
          detalhes: { resposta: data, credenciais: credenciaisAdmin },
          tempo
        };
      }
      
      return {
        nome: '🔐 Login Admin',
        status: 'success',
        mensagem: `Login bem-sucedido em ${tempo}ms`,
        detalhes: { usuario: data.usuario?.nome, tipo: data.usuario?.tipo },
        tempo
      };
      
    } catch (error) {
      return {
        nome: '🔐 Login Admin',
        status: 'error',
        mensagem: `Erro de conexão: ${error.message}`,
        tempo: Date.now() - inicio
      };
    }
  };

  // 4. Testar API de Usuários
  const testarAPIUsuarios = async (): Promise<ResultadoTeste> => {
    const inicio = Date.now();
    try {
      console.log('[EMERGENCIA] Testando API de usuários...');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      const tempo = Date.now() - inicio;
      
      if (!response.ok) {
        const errorText = await response.text();
        return {
          nome: '📊 API Usuários',
          status: 'error',
          mensagem: `API não responde (HTTP ${response.status})`,
          detalhes: { erro: errorText },
          tempo
        };
      }

      const data = await response.json();
      
      if (!data.success) {
        return {
          nome: '📊 API Usuários',
          status: 'error',
          mensagem: `API retornou erro: ${data.error}`,
          detalhes: data,
          tempo
        };
      }
      
      const usuarios = data.usuarios || [];
      
      return {
        nome: '📊 API Usuários',
        status: 'success',
        mensagem: `${usuarios.length} usuários encontrados em ${tempo}ms`,
        detalhes: { total: usuarios.length },
        tempo
      };
      
    } catch (error) {
      return {
        nome: '📊 API Usuários',
        status: 'error',
        mensagem: `Erro de conexão: ${error.message}`,
        tempo: Date.now() - inicio
      };
    }
  };

  // 5. Limpeza de Dados Corrompidos
  const limparDadosCorrempidos = async (): Promise<ResultadoTeste> => {
    const inicio = Date.now();
    try {
      console.log('[EMERGENCIA] Limpando dados corrompidos...');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/limpar-dados`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      const tempo = Date.now() - inicio;
      
      if (!response.ok) {
        const errorText = await response.text();
        return {
          nome: '🧹 Limpeza Dados',
          status: 'warning',
          mensagem: `Limpeza não disponível (HTTP ${response.status}) - Sistema pode funcionar mesmo assim`,
          detalhes: { erro: errorText },
          tempo
        };
      }

      const data = await response.json();
      
      return {
        nome: '🧹 Limpeza Dados',
        status: 'success',
        mensagem: `Limpeza concluída em ${tempo}ms`,
        detalhes: data.estadisticas || data,
        tempo
      };
      
    } catch (error) {
      return {
        nome: '🧹 Limpeza Dados',
        status: 'warning',
        mensagem: `Limpeza não executada: ${error.message} - Sistema pode funcionar mesmo assim`,
        tempo: Date.now() - inicio
      };
    }
  };

  // Executar Correção Completa
  const executarCorrecaoCompleta = async () => {
    setExecutando(true);
    setResultados([]);
    setConfiguracaoCompleta(false);

    const testes = [
      { nome: '🔌 Conectividade Servidor', funcao: testarConectividade },
      { nome: '👤 Admin Principal', funcao: criarAdminEmergencia },
      { nome: '🔐 Login Admin', funcao: testarLoginAdmin },
      { nome: '📊 API Usuários', funcao: testarAPIUsuarios },
      { nome: '🧹 Limpeza Dados', funcao: limparDadosCorrempidos }
    ];

    // Inicializar todos os testes como pendentes
    setResultados(testes.map(t => ({
      nome: t.nome,
      status: 'pending',
      mensagem: 'Aguardando execução...'
    })));

    let sucessos = 0;
    let críticos = 0;

    for (let i = 0; i < testes.length; i++) {
      const teste = testes[i];
      
      setEtapaAtual(`Executando: ${teste.nome}`);
      
      // Marcar como executando
      atualizarResultado(i, {
        status: 'pending',
        mensagem: 'Executando teste...'
      });

      try {
        const resultado = await teste.funcao();
        atualizarResultado(i, resultado);
        
        if (resultado.status === 'success') {
          sucessos++;
        }
        
        // Verificar se é um teste crítico que falhou
        if (i < 3 && resultado.status === 'error') { // Conectividade, Admin, Login são críticos
          críticos++;
        }
        
      } catch (error) {
        atualizarResultado(i, {
          status: 'error',
          mensagem: `Erro inesperado: ${error.message}`
        });
        if (i < 3) críticos++;
      }

      // Aguardar um pouco entre testes
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setEtapaAtual('');
    setExecutando(false);
    
    // Avaliar resultado geral
    if (críticos === 0 && sucessos >= 3) {
      setConfiguracaoCompleta(true);
      toast.success('🎉 Sistema corrigido e funcional!', {
        description: `${sucessos}/5 verificações passaram. Sistema pronto para uso.`
      });
    } else if (críticos === 0) {
      toast.warning('⚠️ Sistema parcialmente funcional', {
        description: `${sucessos}/5 verificações passaram. Algumas funcionalidades podem ter limitações.`
      });
    } else {
      toast.error('❌ Correção incompleta', {
        description: `${críticos} problemas críticos encontrados. Sistema pode não funcionar corretamente.`
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'pending':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'pending':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const acessarSistema = () => {
    // Limpar query params e recarregar
    window.location.href = window.location.pathname;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-red-600 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onVoltar && (
              <Button variant="ghost" onClick={onVoltar} className="text-white hover:bg-red-700">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <AlertCircle className="w-6 h-6" />
                Correção de Emergência
              </h1>
              <p className="text-red-100">Resolvendo erros críticos do sistema AVA</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-red-700 text-white border-red-500">
              MODO EMERGÊNCIA
            </Badge>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Errors Detected */}
        <Alert className="mb-6 border-red-200 bg-red-50">
          <Bug className="w-4 h-4" />
          <AlertDescription>
            <strong>Erros Detectados:</strong>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li>❌ <code>TypeError: Failed to fetch</code> - Problema de conectividade com API</li>
              <li>❌ <code>Email ou senha inválidos</code> - Falha no sistema de autenticação</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Credenciais do Admin */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Credenciais do Administrador
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email do Admin</Label>
                <Input
                  id="email"
                  type="email"
                  value={credenciaisAdmin.email}
                  onChange={(e) => setCredenciaisAdmin(prev => ({ ...prev, email: e.target.value }))}
                  disabled={executando}
                />
              </div>
              <div>
                <Label htmlFor="senha">Senha do Admin</Label>
                <Input
                  id="senha"
                  type="password"
                  value={credenciaisAdmin.senha}
                  onChange={(e) => setCredenciaisAdmin(prev => ({ ...prev, senha: e.target.value }))}
                  disabled={executando}
                />
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              ℹ️ Estas credenciais serão usadas para criar/verificar o administrador principal do sistema
            </p>
          </CardContent>
        </Card>

        {/* Status Atual */}
        {etapaAtual && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <Loader2 className="w-4 h-4 animate-spin" />
            <AlertDescription>
              <strong>Executando:</strong> {etapaAtual}
            </AlertDescription>
          </Alert>
        )}

        {/* Botão de Correção */}
        <div className="mb-6 text-center">
          <Button 
            onClick={executarCorrecaoCompleta}
            disabled={executando}
            size="lg"
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {executando ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Executando Correção...
              </>
            ) : (
              <>
                <Wrench className="w-5 h-5 mr-2" />
                Executar Correção Completa
              </>
            )}
          </Button>
        </div>

        {/* Resultados dos Testes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Resultados da Correção
            </CardTitle>
          </CardHeader>
          <CardContent>
            {resultados.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Clique em "Executar Correção Completa" para resolver os erros</p>
              </div>
            ) : (
              <div className="space-y-4">
                {resultados.map((resultado, index) => (
                  <div
                    key={index}
                    className={`p-4 border rounded-lg ${getStatusColor(resultado.status)}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(resultado.status)}
                        <span className="font-medium">{resultado.nome}</span>
                        {resultado.tempo && (
                          <Badge variant="outline" className="text-xs">
                            {resultado.tempo}ms
                          </Badge>
                        )}
                      </div>
                      <Badge variant={resultado.status === 'success' ? 'default' : 
                                   resultado.status === 'error' ? 'destructive' : 
                                   resultado.status === 'warning' ? 'secondary' : 'outline'}>
                        {resultado.status === 'success' ? 'Sucesso' :
                         resultado.status === 'error' ? 'Erro' :
                         resultado.status === 'warning' ? 'Aviso' : 'Pendente'}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-2">{resultado.mensagem}</p>
                    
                    {resultado.detalhes && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                          Ver detalhes técnicos
                        </summary>
                        <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                          {JSON.stringify(resultado.detalhes, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sistema Corrigido */}
        {configuracaoCompleta && (
          <Alert className="mt-6 border-green-200 bg-green-50">
            <CheckCircle className="w-4 h-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <div>
                  <strong>✅ Sistema Corrigido com Sucesso!</strong>
                  <p className="mt-1">Todos os erros críticos foram resolvidos. O sistema está pronto para uso.</p>
                </div>
                <Button onClick={acessarSistema} className="bg-green-600 hover:bg-green-700">
                  <UserCheck className="w-4 h-4 mr-2" />
                  Acessar Sistema
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Instruções */}
        <Alert className="mt-6">
          <Shield className="w-4 h-4" />
          <AlertDescription>
            <strong>Como funciona a correção:</strong>
            <ol className="mt-2 list-decimal list-inside space-y-1 text-sm">
              <li>🔌 <strong>Conectividade:</strong> Verifica se o servidor está online e respondendo</li>
              <li>👤 <strong>Admin Principal:</strong> Cria/verifica o usuário administrador do sistema</li>
              <li>🔐 <strong>Login Admin:</strong> Testa se as credenciais de administrador funcionam</li>
              <li>📊 <strong>API Usuários:</strong> Verifica se a API de gerenciamento está funcionando</li>
              <li>🧹 <strong>Limpeza:</strong> Remove dados corrompidos que podem causar erros</li>
            </ol>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}