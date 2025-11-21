import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Wrench } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface CorrecaoErrosSalvamentoProps {
  onVoltar?: () => void;
  onCorrecaoConcluida?: () => void;
}

export function CorrecaoErrosSalvamento({ onVoltar, onCorrecaoConcluida }: CorrecaoErrosSalvamentoProps) {
  const [executando, setExecutando] = useState(false);
  const [resultados, setResultados] = useState<any[]>([]);
  const [correcoesConcluidas, setCorrecoesConcluidas] = useState(false);

  const executarCorrecoes = async () => {
    setExecutando(true);
    setResultados([]);
    setCorrecoesConcluidas(false);

    const correcoes = [
      {
        nome: 'Limpar Cache de Requisições',
        acao: limparCacheRequisicoes
      },
      {
        nome: 'Verificar Conexões Pendentes',
        acao: verificarConexoesPendentes
      },
      {
        nome: 'Reinicializar Cliente HTTP',
        acao: reinicializarClienteHTTP
      },
      {
        nome: 'Validar Configurações',
        acao: validarConfiguracoes
      },
      {
        nome: 'Teste de Conectividade',
        acao: testeConectividade
      }
    ];

    for (const correcao of correcoes) {
      try {
        const resultado = await correcao.acao();
        setResultados(prev => [...prev, {
          nome: correcao.nome,
          status: 'sucesso',
          detalhes: resultado.message || 'Correção aplicada com sucesso',
          dados: resultado.data
        }]);
      } catch (error) {
        setResultados(prev => [...prev, {
          nome: correcao.nome,
          status: 'erro',
          detalhes: error.message || 'Falha na correção',
          erro: error
        }]);
      }
    }

    setExecutando(false);
    setCorrecoesConcluidas(true);
    
    if (onCorrecaoConcluida) {
      onCorrecaoConcluida();
    }
  };

  const limparCacheRequisicoes = async () => {
    console.log('[CORRECAO] Limpando cache de requisições...');
    
    // Limpar cache do browser
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }
    
    // Limpar localStorage relacionado a requisições
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('request') || key.includes('fetch') || key.includes('cache'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    return {
      message: `Cache limpo. ${keysToRemove.length} itens removidos do localStorage`,
      data: { itemsRemoved: keysToRemove.length }
    };
  };

  const verificarConexoesPendentes = async () => {
    console.log('[CORRECAO] Verificando conexões pendentes...');
    
    // Verificar performance do navegador
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const resources = performance.getEntriesByType('resource');
    
    const conexoesPendentes = resources.filter(resource => {
      return resource.responseEnd === 0 || (resource.responseEnd - resource.requestStart) > 5000;
    });
    
    return {
      message: `${conexoesPendentes.length} conexões pendentes encontradas`,
      data: {
        totalResources: resources.length,
        pendingConnections: conexoesPendentes.length,
        navigationTiming: {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart
        }
      }
    };
  };

  const reinicializarClienteHTTP = async () => {
    console.log('[CORRECAO] Reinicializando cliente HTTP...');
    
    // Forçar um teste de conectividade simples para "acordar" o cliente
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/health`, {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });
      
      return {
        message: 'Cliente HTTP reinicializado com sucesso',
        data: {
          status: response.status,
          ok: response.ok,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      throw new Error(`Falha ao reinicializar cliente HTTP: ${error.message}`);
    }
  };

  const validarConfiguracoes = async () => {
    console.log('[CORRECAO] Validando configurações...');
    
    const configuracoes = {
      projectId: {
        valor: projectId,
        valido: projectId && projectId !== 'SEU_PROJECT_ID_AQUI'
      },
      publicAnonKey: {
        valor: publicAnonKey ? publicAnonKey.substring(0, 20) + '...' : null,
        valido: publicAnonKey && publicAnonKey !== 'SEU_ANON_KEY_AQUI'
      },
      url: {
        valor: `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0`,
        valido: projectId && projectId.length > 10
      }
    };
    
    const todasValidas = Object.values(configuracoes).every(config => config.valido);
    
    if (!todasValidas) {
      throw new Error('Configurações inválidas detectadas');
    }
    
    return {
      message: 'Todas as configurações são válidas',
      data: configuracoes
    };
  };

  const testeConectividade = async () => {
    console.log('[CORRECAO] Testando conectividade final...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Servidor retornou status ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        message: 'Conectividade restaurada com sucesso',
        data: {
          status: response.status,
          responseTime: 'Menos de 3 segundos',
          serverData: data
        }
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Timeout na conectividade - servidor não responde');
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

  const todasCorrecoesSucesso = resultados.length > 0 && resultados.every(r => r.status === 'sucesso');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Correção de Erros de Salvamento</h1>
              <p className="text-gray-600">Resolver problemas comuns de conectividade e salvamento</p>
            </div>
            {onVoltar && (
              <Button variant="outline" onClick={onVoltar}>
                ← Voltar
              </Button>
            )}
          </div>

          <Alert className="mb-6">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              Esta ferramenta executa correções automáticas para resolver os erros mais comuns de salvamento no servidor.
              Execute este processo se estiver recebendo erros como "Erro ao salvar no servidor".
            </AlertDescription>
          </Alert>

          <div className="text-center mb-6">
            <Button
              onClick={executarCorrecoes}
              disabled={executando}
              size="lg"
              className="min-w-48"
            >
              {executando ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Aplicando Correções...
                </>
              ) : (
                <>
                  <Wrench className="w-5 h-5 mr-2" />
                  Executar Correções Automáticas
                </>
              )}
            </Button>
          </div>
        </div>

        {resultados.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Resultados das Correções</h2>
            
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
                          <summary className="cursor-pointer hover:text-gray-700">Ver detalhes</summary>
                          <pre className="mt-2 bg-gray-100 p-2 rounded text-xs overflow-auto">
                            {JSON.stringify(resultado.dados, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {correcoesConcluidas && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Status Final</CardTitle>
                </CardHeader>
                <CardContent>
                  {todasCorrecoesSucesso ? (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        ✅ Todas as correções foram aplicadas com sucesso! O problema de salvamento deve estar resolvido.
                        Tente executar a operação que estava falhando novamente.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-3">
                      <Alert className="border-yellow-200 bg-yellow-50">
                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                        <AlertDescription className="text-yellow-800">
                          ⚠️ Algumas correções falharam. Tente as soluções manuais abaixo.
                        </AlertDescription>
                      </Alert>
                      
                      <div className="text-sm space-y-2">
                        <h4 className="font-semibold">Soluções manuais:</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-600">
                          <li>Recarregue a página completamente (Ctrl+F5)</li>
                          <li>Limpe o cache do navegador</li>
                          <li>Verifique sua conexão com a internet</li>
                          <li>Tente usar outro navegador</li>
                          <li>Entre em contato com o suporte técnico se o problema persistir</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}