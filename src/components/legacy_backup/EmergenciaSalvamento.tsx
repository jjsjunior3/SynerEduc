import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Zap, Home } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export function EmergenciaSalvamento() {
  const [executando, setExecutando] = useState(false);
  const [statusSistema, setStatusSistema] = useState<any>(null);
  const [correcaoAplicada, setCorrecaoAplicada] = useState(false);

  useEffect(() => {
    verificarStatusSistema();
  }, []);

  const verificarStatusSistema = async () => {
    try {
      console.log('[EMERGENCIA] Verificando status do sistema...');
      
      // Teste básico de conectividade
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

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
        setStatusSistema({
          conectividade: 'ok',
          servidor: 'online',
          detalhes: data
        });
      } else {
        throw new Error(`Servidor retornou status ${response.status}`);
      }

    } catch (error) {
      console.error('[EMERGENCIA] Erro ao verificar sistema:', error);
      setStatusSistema({
        conectividade: 'erro',
        servidor: 'offline',
        erro: error.message
      });
    }
  };

  const executarCorrecaoEmergencia = async () => {
    setExecutando(true);
    
    try {
      console.log('[EMERGENCIA] Iniciando correção de emergência...');
      
      // 1. Limpar todos os dados de cache
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
      }
      
      // 2. Limpar localStorage problemático
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('auth') || key.includes('user') || key.includes('session'))) {
          // Pular chaves essenciais do sistema
          if (!key.includes('supabase_url') && !key.includes('supabase_key')) {
            keysToRemove.push(key);
          }
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // 3. Forçar reconexão com servidor
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Falha na reconexão: ${response.status}`);
      }
      
      // 4. Verificar novamente o status
      await verificarStatusSistema();
      
      setCorrecaoAplicada(true);
      console.log('[EMERGENCIA] Correção de emergência concluída');
      
    } catch (error) {
      console.error('[EMERGENCIA] Erro na correção:', error);
      alert(`Erro na correção de emergência: ${error.message}`);
    } finally {
      setExecutando(false);
    }
  };

  const reiniciarSistema = () => {
    // Limpar completamente e reiniciar
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = window.location.origin;
  };

  const voltarAoSistema = () => {
    window.location.href = window.location.origin;
  };

  return (
    <div className="min-h-screen bg-red-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-red-900 mb-2">🚨 Modo de Emergência</h1>
          <p className="text-red-700">Sistema de correção para erros críticos de salvamento</p>
        </div>

        {/* Status do Sistema */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Status do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusSistema ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Conectividade:</span>
                  <div className="flex items-center gap-2">
                    {statusSistema.conectividade === 'ok' ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-green-600">Online</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span className="text-red-600">Offline</span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Servidor:</span>
                  <div className="flex items-center gap-2">
                    {statusSistema.servidor === 'online' ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-green-600">Respondendo</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span className="text-red-600">Não responde</span>
                      </>
                    )}
                  </div>
                </div>

                {statusSistema.erro && (
                  <Alert className="border-red-200 bg-red-50">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      <strong>Erro detectado:</strong> {statusSistema.erro}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-600">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Verificando sistema...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ações de Emergência */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Correções de Emergência</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={executarCorrecaoEmergencia}
              disabled={executando}
              className="w-full bg-orange-600 hover:bg-orange-700"
              size="lg"
            >
              {executando ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Aplicando Correções...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 mr-2" />
                  Executar Correção Automática
                </>
              )}
            </Button>

            <Button
              onClick={reiniciarSistema}
              variant="destructive"
              className="w-full"
              size="lg"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Reiniciar Sistema Completamente
            </Button>

            {correcaoAplicada && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  ✅ Correção aplicada com sucesso! Tente acessar o sistema novamente.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Instruções */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>O que este modo faz:</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
              <li>Limpa cache do navegador que pode estar corrompido</li>
              <li>Remove dados de sessão problemáticos</li>
              <li>Force uma reconexão com o servidor</li>
              <li>Verifica a saúde do sistema</li>
              <li>Restaura configurações padrão</li>
            </ul>
          </CardContent>
        </Card>

        {/* Configurações Atuais */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Configurações do Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <strong>Project ID:</strong> {projectId || 'Não configurado'}
              </div>
              <div>
                <strong>URL do Servidor:</strong> {`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0`}
              </div>
              <div>
                <strong>Chave Anônima:</strong> {publicAnonKey ? 'Configurada' : 'Não configurada'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botão Voltar */}
        <div className="text-center">
          <Button
            onClick={voltarAoSistema}
            variant="outline"
            size="lg"
          >
            <Home className="w-5 h-5 mr-2" />
            Voltar ao Sistema
          </Button>
        </div>
      </div>
    </div>
  );
}