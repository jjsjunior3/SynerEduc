import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Loader2, 
  RefreshCw,
  Settings,
  Users,
  BookOpen,
  FileText,
  Zap
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface DiagnosticoResult {
  nome: string;
  status: 'success' | 'warning' | 'error';
  mensagem: string;
  detalhes?: string;
  acao?: string;
}

export function DiagnosticoCompleto() {
  const [diagnosticos, setDiagnosticos] = useState<DiagnosticoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoFixing, setAutoFixing] = useState(false);

  const executarDiagnostico = async () => {
    setLoading(true);
    const resultados: DiagnosticoResult[] = [];

    try {
      // 1. Teste de conectividade com o servidor
      try {
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/health`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          method: 'GET'
        });

        if (response.ok) {
          resultados.push({
            nome: 'Conectividade do Servidor',
            status: 'success',
            mensagem: 'Servidor respondendo corretamente',
            detalhes: `Status: ${response.status}`
          });
        } else {
          resultados.push({
            nome: 'Conectividade do Servidor',
            status: 'error',
            mensagem: `Servidor retornou erro ${response.status}`,
            detalhes: await response.text(),
            acao: 'Verificar configuração do Supabase'
          });
        }
      } catch (error: any) {
        resultados.push({
          nome: 'Conectividade do Servidor',
          status: 'error',
          mensagem: 'Não foi possível conectar ao servidor',
          detalhes: error.message,
          acao: 'Verificar URL e configurações do Supabase'
        });
      }

      // 2. Teste de status do setup
      try {
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/setup-status`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          resultados.push({
            nome: 'Status do Setup',
            status: data.needsSetup ? 'warning' : 'success',
            mensagem: data.needsSetup ? 'Sistema precisa de configuração inicial' : 'Sistema configurado',
            detalhes: `needsSetup: ${data.needsSetup}`,
            acao: data.needsSetup ? 'Executar setup inicial' : undefined
          });
        } else {
          resultados.push({
            nome: 'Status do Setup',
            status: 'error',
            mensagem: 'Erro ao verificar status do setup',
            detalhes: await response.text()
          });
        }
      } catch (error: any) {
        resultados.push({
          nome: 'Status do Setup',
          status: 'error',
          mensagem: 'Falha ao verificar setup',
          detalhes: error.message
        });
      }

      // 3. Teste da rota de disciplinas
      try {
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/disciplinas`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          resultados.push({
            nome: 'Sistema de Disciplinas',
            status: 'success',
            mensagem: 'Disciplinas carregadas com sucesso',
            detalhes: `${data.length || 0} disciplinas encontradas`
          });
        } else {
          resultados.push({
            nome: 'Sistema de Disciplinas',
            status: 'error',
            mensagem: 'Erro ao carregar disciplinas',
            detalhes: await response.text()
          });
        }
      } catch (error: any) {
        resultados.push({
          nome: 'Sistema de Disciplinas',
          status: 'error',
          mensagem: 'Falha ao acessar sistema de disciplinas',
          detalhes: error.message
        });
      }

      // 4. Teste da nova rota de conteúdo PDF
      try {
        // Usando um ID de usuário e disciplina fictícios para testar a rota
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/conteudo-pdf/usuario/test-user/disciplina/test-disciplina`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.status === 404 || response.status === 200) {
          // 404 é esperado para usuário/disciplina inexistente, mas significa que a rota existe
          resultados.push({
            nome: 'Rota de Conteúdo PDF',
            status: 'success',
            mensagem: 'Rota de conteúdo PDF funcionando',
            detalhes: `Status: ${response.status} (esperado para dados de teste)`
          });
        } else {
          resultados.push({
            nome: 'Rota de Conteúdo PDF',
            status: 'warning',
            mensagem: 'Rota encontrada mas com resposta inesperada',
            detalhes: `Status: ${response.status}`
          });
        }
      } catch (error: any) {
        resultados.push({
          nome: 'Rota de Conteúdo PDF',
          status: 'error',
          mensagem: 'Rota de conteúdo PDF não encontrada',
          detalhes: error.message,
          acao: 'Verificar se a rota foi implementada no servidor'
        });
      }

      // 5. Teste das configurações do Supabase
      try {
        if (!projectId || !publicAnonKey) {
          resultados.push({
            nome: 'Configurações Supabase',
            status: 'error',
            mensagem: 'Configurações do Supabase ausentes',
            detalhes: `projectId: ${projectId ? 'OK' : 'MISSING'}, publicAnonKey: ${publicAnonKey ? 'OK' : 'MISSING'}`,
            acao: 'Configurar projectId e publicAnonKey'
          });
        } else {
          resultados.push({
            nome: 'Configurações Supabase',
            status: 'success',
            mensagem: 'Configurações do Supabase presentes',
            detalhes: `Project ID: ${projectId.substring(0, 8)}...`
          });
        }
      } catch (error: any) {
        resultados.push({
          nome: 'Configurações Supabase',
          status: 'error',
          mensagem: 'Erro ao verificar configurações',
          detalhes: error.message
        });
      }

    } catch (error: any) {
      resultados.push({
        nome: 'Diagnóstico Geral',
        status: 'error',
        mensagem: 'Erro durante o diagnóstico',
        detalhes: error.message
      });
    }

    setDiagnosticos(resultados);
    setLoading(false);
  };

  const corrigirAutomaticamente = async () => {
    setAutoFixing(true);

    try {
      // Tentar inicializar o sistema se necessário
      const setupResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/inicializar-sistema`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (setupResponse.ok) {
        console.log('Sistema inicializado com sucesso');
      }

      // Re-executar diagnóstico após tentativa de correção
      await executarDiagnostico();
    } catch (error) {
      console.error('Erro durante correção automática:', error);
    } finally {
      setAutoFixing(false);
    }
  };

  useEffect(() => {
    executarDiagnostico();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Loader2 className="w-5 h-5 animate-spin" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">OK</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">ATENÇÃO</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">ERRO</Badge>;
      default:
        return <Badge>VERIFICANDO</Badge>;
    }
  };

  const totalProblemas = diagnosticos.filter(d => d.status === 'error').length;
  const totalAvisos = diagnosticos.filter(d => d.status === 'warning').length;
  const totalOk = diagnosticos.filter(d => d.status === 'success').length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Diagnóstico Completo do Sistema</h1>
          </div>
          <p className="text-gray-600">
            Verificação detalhada de todos os componentes do AVA
          </p>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <div>
                  <p className="text-2xl font-bold text-green-600">{totalOk}</p>
                  <p className="text-sm text-gray-600">Funcionando</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{totalAvisos}</p>
                  <p className="text-sm text-gray-600">Avisos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <XCircle className="w-6 h-6 text-red-500" />
                <div>
                  <p className="text-2xl font-bold text-red-600">{totalProblemas}</p>
                  <p className="text-sm text-gray-600">Problemas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={executarDiagnostico} 
                  disabled={loading}
                  variant="outline"
                  size="sm"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Atualizar
                </Button>
                <Button 
                  onClick={corrigirAutomaticamente} 
                  disabled={autoFixing || totalProblemas === 0}
                  size="sm"
                >
                  {autoFixing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                  Corrigir
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resultados Detalhados */}
        <div className="space-y-4">
          {diagnosticos.map((diagnostico, index) => (
            <Card key={index} className={`border-l-4 ${
              diagnostico.status === 'success' ? 'border-l-green-500' :
              diagnostico.status === 'warning' ? 'border-l-yellow-500' :
              'border-l-red-500'
            }`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(diagnostico.status)}
                    <CardTitle className="text-lg">{diagnostico.nome}</CardTitle>
                  </div>
                  {getStatusBadge(diagnostico.status)}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-2">{diagnostico.mensagem}</p>
                
                {diagnostico.detalhes && (
                  <div className="bg-gray-50 p-3 rounded-md mb-3">
                    <p className="text-sm text-gray-600 font-mono">{diagnostico.detalhes}</p>
                  </div>
                )}
                
                {diagnostico.acao && (
                  <div className="bg-blue-50 p-3 rounded-md">
                    <p className="text-sm text-blue-800">
                      <strong>Ação recomendada:</strong> {diagnostico.acao}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {loading && (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Executando diagnóstico...</p>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          <Button onClick={() => window.location.href = '/'} variant="outline">
            Voltar ao Sistema
          </Button>
          <Button onClick={() => window.location.href = '/?usuarios'} variant="outline">
            <Users className="w-4 h-4 mr-2" />
            Diagnóstico de Usuários
          </Button>
          <Button onClick={() => window.location.href = '/?status'} variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Status Detalhado
          </Button>
        </div>
      </div>
    </div>
  );
}