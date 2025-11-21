import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Database, Server } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface DiagnosticoSalvamentoProps {
  onVoltar?: () => void;
}

export function DiagnosticoSalvamento({ onVoltar }: DiagnosticoSalvamentoProps) {
  const [testando, setTestando] = useState(false);
  const [resultados, setResultados] = useState<any[]>([]);

  const executarDiagnostico = async () => {
    setTestando(true);
    setResultados([]);

    const testes = [
      {
        nome: 'Conectividade com Servidor',
        teste: testarConectividade
      },
      {
        nome: 'Teste de Escrita KV Store',
        teste: testarEscritaKV
      },
      {
        nome: 'Teste de Salvamento de Usuário',
        teste: testarSalvamentoUsuario
      },
      {
        nome: 'Validação de Headers',
        teste: testarHeaders
      },
      {
        nome: 'Teste de Timeout',
        teste: testarTimeout
      }
    ];

    for (const teste of testes) {
      try {
        const resultado = await teste.teste();
        setResultados(prev => [...prev, {
          nome: teste.nome,
          status: 'sucesso',
          detalhes: resultado.message || 'Teste passou',
          dados: resultado.data
        }]);
      } catch (error) {
        setResultados(prev => [...prev, {
          nome: teste.nome,
          status: 'erro',
          detalhes: error.message || 'Teste falhou',
          erro: error
        }]);
      }
    }

    setTestando(false);
  };

  const testarConectividade = async () => {
    console.log('[DIAGNOSTICO] Testando conectividade básica...');
    
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Servidor retornou status ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      message: 'Conectividade OK',
      data: data
    };
  };

  const testarEscritaKV = async () => {
    console.log('[DIAGNOSTICO] Testando escrita no KV Store...');
    
    const testeData = {
      chave: `teste_diagnostico_${Date.now()}`,
      valor: {
        teste: true,
        timestamp: new Date().toISOString(),
        dados: 'Teste de salvamento'
      }
    };

    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/teste-kv`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testeData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao salvar no KV: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      message: 'Escrita no KV Store funcionando',
      data: data
    };
  };

  const testarSalvamentoUsuario = async () => {
    console.log('[DIAGNOSTICO] Testando salvamento de usuário...');
    
    const usuarioTeste = {
      nome: 'Usuário Teste Diagnóstico',
      nomeUsuario: `teste_${Date.now()}`,
      email: `teste_${Date.now()}@diagnostico.local`,
      senha: 'senha123',
      tipo: 'aluno',
      serie: '1ª série - Ensino Médio'
    };

    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/signup`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(usuarioTeste)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao salvar usuário: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Tentar remover o usuário de teste
    if (data.success && data.usuario?.id) {
      try {
        await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${data.usuario.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.warn('Não foi possível limpar usuário de teste:', error);
      }
    }

    return {
      message: 'Salvamento de usuário funcionando',
      data: data
    };
  };

  const testarHeaders = async () => {
    console.log('[DIAGNOSTICO] Validando headers de requisição...');
    
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/debug-headers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
        'X-Test-Header': 'teste-diagnostico'
      },
      body: JSON.stringify({ teste: 'headers' })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro de headers: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      message: 'Headers válidos',
      data: data
    };
  };

  const testarTimeout = async () => {
    console.log('[DIAGNOSTICO] Testando timeout de requisições...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/teste-timeout`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Erro de timeout: ${response.status}`);
      }

      const data = await response.json();
      return {
        message: 'Timeout funcionando corretamente',
        data: data
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request foi cancelada por timeout');
      }
      throw error;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sucesso':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'erro':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sucesso':
        return 'border-green-200 bg-green-50';
      case 'erro':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Diagnóstico de Salvamento</h1>
              <p className="text-gray-600">Identificar problemas de conectividade e salvamento no servidor</p>
            </div>
            {onVoltar && (
              <Button variant="outline" onClick={onVoltar}>
                ← Voltar
              </Button>
            )}
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Configurações Atuais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Project ID:</strong> {projectId || 'Não configurado'}
                </div>
                <div>
                  <strong>Anon Key:</strong> {publicAnonKey ? 'Configurado' : 'Não configurado'}
                </div>
                <div>
                  <strong>Servidor URL:</strong> {`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0`}
                </div>
                <div>
                  <strong>Status:</strong> {projectId && publicAnonKey ? '✅ Configurado' : '❌ Incompleto'}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center mb-6">
            <Button
              onClick={executarDiagnostico}
              disabled={testando}
              size="lg"
              className="min-w-48"
            >
              {testando ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Executando Diagnóstico...
                </>
              ) : (
                <>
                  <Server className="w-5 h-5 mr-2" />
                  Executar Diagnóstico Completo
                </>
              )}
            </Button>
          </div>
        </div>

        {resultados.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Resultados do Diagnóstico</h2>
            
            {resultados.map((resultado, index) => (
              <Card key={index} className={`${getStatusColor(resultado.status)} transition-all`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(resultado.status)}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{resultado.nome}</h3>
                      <p className="text-sm text-gray-600 mb-2">{resultado.detalhes}</p>
                      
                      {resultado.dados && (
                        <details className="text-xs text-gray-500">
                          <summary className="cursor-pointer hover:text-gray-700">Ver dados</summary>
                          <pre className="mt-2 bg-gray-100 p-2 rounded text-xs overflow-auto">
                            {JSON.stringify(resultado.dados, null, 2)}
                          </pre>
                        </details>
                      )}
                      
                      {resultado.erro && (
                        <details className="text-xs text-red-500">
                          <summary className="cursor-pointer hover:text-red-700">Ver erro completo</summary>
                          <pre className="mt-2 bg-red-50 p-2 rounded text-xs overflow-auto">
                            {JSON.stringify(resultado.erro, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Resumo e Recomendações */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Resumo e Recomendações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  {resultados.filter(r => r.status === 'erro').length === 0 ? (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        ✅ Todos os testes passaram! O sistema de salvamento está funcionando normalmente.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="border-red-200 bg-red-50">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        ❌ Foram encontrados problemas no sistema de salvamento. Verifique os detalhes acima.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div>
                    <h4 className="font-semibold mb-2">Próximos passos:</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      <li>Se há erros de conectividade: Verificar configurações do Supabase</li>
                      <li>Se há erros de KV Store: Verificar permissões do banco</li>
                      <li>Se há erros de timeout: Verificar conexão de internet</li>
                      <li>Se há erros de headers: Verificar configuração do CORS</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}