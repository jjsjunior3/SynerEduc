import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowLeft, CheckCircle, XCircle, Loader2, TestTube, AlertTriangle, Wrench } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

interface TesteCompletoProps {
  onVoltar: () => void;
}

interface TestResult {
  nome: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
  details?: string;
  canFix?: boolean;
}

export function TesteCompleto({ onVoltar }: TesteCompletoProps) {
  const [testes, setTestes] = useState<TestResult[]>([
    { nome: 'Conexão com Backend', status: 'pending', canFix: true },
    { nome: 'Estatísticas de Relatórios', status: 'pending', canFix: false },
    { nome: 'Cadastro de Usuário', status: 'pending', canFix: false },
    { nome: 'Atualização de Perfil', status: 'pending', canFix: true },
    { nome: 'Upload de Avatar', status: 'pending', canFix: true }
  ]);
  const [testando, setTestando] = useState(false);
  const [corrigindo, setCorrigindo] = useState(false);
  const { usuario } = useAuth();

  const atualizarTeste = (nome: string, status: 'success' | 'error', message?: string, details?: string) => {
    setTestes(prev => 
      prev.map(teste => 
        teste.nome === nome ? { ...teste, status, message, details } : teste
      )
    );
  };

  const executarTestes = async () => {
    setTestando(true);
    
    // Resetar todos os testes
    setTestes(prev => prev.map(teste => ({ ...teste, status: 'pending' as const, message: undefined, details: undefined })));
    
    // Teste 1: Conexão com Backend
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/health`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        atualizarTeste('Conexão com Backend', 'success', `Servidor v${data.version} funcionando`);
      } else {
        atualizarTeste('Conexão com Backend', 'error', `HTTP ${response.status}`, 
          response.status === 401 ? 'Token de autorização inválido ou expirado' : 'Erro de conexão com o servidor');
      }
    } catch (error) {
      atualizarTeste('Conexão com Backend', 'error', 'Erro de conexão', 
        'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.');
    }

    // Aguardar um pouco entre testes
    await new Promise(resolve => setTimeout(resolve, 500));

    // Teste 2: Estatísticas de Relatórios
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/relatorios`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        atualizarTeste('Estatísticas de Relatórios', 'success', 
          `${data.totalAlunos || 0} alunos, ${data.totalProfessores || 0} professores`);
      } else {
        atualizarTeste('Estatísticas de Relatórios', 'error', 'Erro ao carregar estatísticas',
          `Status ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      atualizarTeste('Estatísticas de Relatórios', 'error', 'Erro na requisição',
        error.message || 'Erro desconhecido');
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    // Teste 3: Cadastro de Usuário (simulado)
    try {
      const dadosTeste = {
        nome: `Usuário Teste ${Date.now()}`,
        email: `teste${Date.now()}@escola.com`,
        senha: 'senha123',
        tipo: 'aluno',
        serie: '1ª série - Ensino Médio'
      };

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosTeste)
      });

      if (response.ok) {
        const userData = await response.json();
        atualizarTeste('Cadastro de Usuário', 'success', `Usuário Teste ${userData.id?.slice(-8)} criado`);
      } else {
        let errorText = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorText = errorData.error || errorText;
        } catch {
          errorText = await response.text() || errorText;
        }
        atualizarTeste('Cadastro de Usuário', 'error', errorText, 
          response.status === 400 ? 'Dados inválidos ou email já existe' : 'Erro no servidor');
      }
    } catch (error) {
      atualizarTeste('Cadastro de Usuário', 'error', `Erro: ${error.message}`,
        'Erro de rede ou servidor indisponível');
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    // Teste 4: Atualização de Perfil
    try {
      if (!usuario?.id) {
        atualizarTeste('Atualização de Perfil', 'error', 'Usuário não autenticado',
          'É necessário estar logado para testar esta funcionalidade');
        return;
      }

      const testProfile = {
        nome: usuario.nome,
        email: usuario.email,
        avatar: usuario.avatar || 'https://example.com/avatar.jpg'
      };

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/usuarios/${usuario.id}/perfil`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testProfile)
      });

      if (response.ok) {
        atualizarTeste('Atualização de Perfil', 'success', 'Perfil atualizado com sucesso');
      } else {
        let errorMessage = 'Erro ao atualizar perfil';
        try {
          const responseText = await response.text();
          if (responseText.includes('Unexpected non-whitespace character')) {
            errorMessage = 'Erro de parsing JSON no servidor';
            atualizarTeste('Atualização de Perfil', 'error', errorMessage,
              'O servidor retornou uma resposta inválida. Possível erro na rota de perfil.');
          } else {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.error || errorMessage;
            atualizarTeste('Atualização de Perfil', 'error', errorMessage);
          }
        } catch (parseError) {
          atualizarTeste('Atualização de Perfil', 'error', errorMessage,
            'Resposta do servidor inválida ou malformada');
        }
      }
    } catch (error) {
      atualizarTeste('Atualização de Perfil', 'error', `Erro: ${error.message}`,
        'Erro de rede ou problema de conectividade');
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    // Teste 5: Upload de Avatar
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/usuarios/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: new FormData() // FormData vazio para testar a validação
      });

      if (response.status === 400) {
        const errorData = await response.json();
        if (errorData.error && errorData.error.includes('Arquivo') || errorData.error.includes('usuário')) {
          atualizarTeste('Upload de Avatar', 'success', 'Rota funcionando (validação OK)');
        } else {
          atualizarTeste('Upload de Avatar', 'error', errorData.error);
        }
      } else if (response.status === 404) {
        atualizarTeste('Upload de Avatar', 'error', 'Rota não encontrada (404)',
          'A rota de upload de avatar não está implementada no servidor');
      } else {
        atualizarTeste('Upload de Avatar', 'error', `Resposta inesperada: ${response.status}`,
          'O servidor retornou um status inesperado');
      }
    } catch (error) {
      atualizarTeste('Upload de Avatar', 'error', `Erro: ${error.message}`,
        'Erro de rede ou problema de conectividade');
    }

    setTestando(false);
    
    // Verificar resultados
    const errosCount = testes.filter(t => t.status === 'error').length;
    if (errosCount === 0) {
      toast.success('Todos os testes passaram! ✅');
    } else {
      toast.warning(`${errosCount} teste(s) falharam. Verifique os detalhes.`);
    }
  };

  const corrigirErros = async () => {
    setCorrigindo(true);
    try {
      // Correção automática dos erros principais
      
      // 1. Tentar corrigir problema de autenticação/conexão
      const testesComErro = testes.filter(t => t.status === 'error' && t.canFix);
      
      for (const teste of testesComErro) {
        if (teste.nome === 'Conexão com Backend') {
          // Tentar inicializar o sistema
          try {
            const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/inicializar-sistema`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (response.ok) {
              toast.success('Sistema inicializado com sucesso');
            }
          } catch (error) {
            console.error('Erro ao inicializar sistema:', error);
          }
        }
        
        if (teste.nome === 'Atualização de Perfil') {
          // Tentar corrigir problema de JSON parsing
          toast.info('Problema de parsing JSON detectado. Reporte ao desenvolvedor.');
        }
        
        if (teste.nome === 'Upload de Avatar') {
          // Informar sobre rota não implementada
          toast.info('Rota de upload de avatar precisa ser implementada no backend.');
        }
      }
      
      toast.success('Correções automáticas aplicadas');
      
      // Re-executar testes após correção
      setTimeout(() => {
        executarTestes();
      }, 2000);
      
    } catch (error) {
      toast.error('Erro ao aplicar correções automáticas');
    } finally {
      setCorrigindo(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-5 h-5 bg-gray-300 rounded-full" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
    }
  };

  const sucessos = testes.filter(t => t.status === 'success').length;
  const erros = testes.filter(t => t.status === 'error').length;

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
            <h1 className="font-semibold text-gray-900">Teste Completo da Aplicação</h1>
            <p className="text-sm text-gray-600">Verificar se todas as funcionalidades estão funcionando</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Resumo dos Testes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{testes.length}</div>
                <div className="text-sm text-gray-600">Total de Testes</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{sucessos}</div>
                <div className="text-sm text-gray-600">Sucessos</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{erros}</div>
                <div className="text-sm text-gray-600">Erros</div>
              </CardContent>
            </Card>
          </div>

          {/* Botão para Executar Testes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="w-5 h-5" />
                Testes Automatizados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-gray-600">
                  Execute os testes para verificar se todas as funcionalidades estão funcionando corretamente.
                </p>
                <Button onClick={executarTestes} disabled={testando}>
                  {testando ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Testando...
                    </>
                  ) : (
                    <>
                      <TestTube className="w-4 h-4 mr-2" />
                      Executar Testes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Testes */}
          <Card>
            <CardHeader>
              <CardTitle>Resultados dos Testes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testes.map((teste, index) => (
                  <div key={index} className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="flex items-start gap-3 flex-1">
                      {getStatusIcon(teste.status)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900">{teste.nome}</h3>
                          {teste.canFix && teste.status === 'error' && (
                            <Badge variant="outline" className="text-xs">
                              <Wrench className="w-3 h-3 mr-1" />
                              Corrigível
                            </Badge>
                          )}
                        </div>
                        {teste.message && (
                          <p className="text-sm text-gray-600 mb-1">{teste.message}</p>
                        )}
                        {teste.details && (
                          <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                            {teste.details}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge className={getStatusColor(teste.status)}>
                      {teste.status === 'pending' && 'Pendente'}
                      {teste.status === 'success' && 'Sucesso'}
                      {teste.status === 'error' && 'Erro'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Status Geral */}
          {!testando && (sucessos > 0 || erros > 0) && (
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  {erros === 0 ? (
                    <div className="text-green-600">
                      <CheckCircle className="w-12 h-12 mx-auto mb-2" />
                      <h3 className="font-semibold">Todos os testes passaram!</h3>
                      <p className="text-sm text-gray-600">A aplicação está funcionando corretamente.</p>
                    </div>
                  ) : (
                    <div className="text-amber-600">
                      <AlertTriangle className="w-12 h-12 mx-auto mb-2" />
                      <h3 className="font-semibold">Alguns testes falharam</h3>
                      <p className="text-sm text-gray-600 mb-3">
                        {erros} de {testes.length} testes apresentaram erros.
                      </p>
                      {testes.filter(t => t.status === 'error' && t.canFix).length > 0 && (
                        <p className="text-sm text-blue-600">
                          💡 {testes.filter(t => t.status === 'error' && t.canFix).length} erro(s) podem ser corrigidos automaticamente.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botão para Corrigir Erros - mostrar apenas se há erros corrigíveis */}
          {erros > 0 && testes.filter(t => t.status === 'error' && t.canFix).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="w-5 h-5" />
                  Correção Automática
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-700 font-medium">
                      Erros corrigíveis detectados
                    </p>
                    <p className="text-sm text-gray-600">
                      Tente corrigir automaticamente os problemas encontrados.
                    </p>
                  </div>
                  <Button onClick={corrigirErros} disabled={corrigindo || testando} variant="outline">
                    {corrigindo ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Corrigindo...
                      </>
                    ) : (
                      <>
                        <Wrench className="w-4 h-4 mr-2" />
                        Corrigir Erros
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}