import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface TestResult {
  test: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
}

export function DiagnosticoLoginRapido() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const updateResult = (test: string, status: TestResult['status'], message: string, details?: any) => {
    setResults(prev => {
      const existing = prev.find(r => r.test === test);
      if (existing) {
        existing.status = status;
        existing.message = message;
        existing.details = details;
        return [...prev];
      } else {
        return [...prev, { test, status, message, details }];
      }
    });
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);

    // Test 1: Configuração do Supabase
    updateResult('config', 'pending', 'Verificando configuração...');
    
    const isConfigured = projectId !== 'SEU_PROJECT_ID_AQUI' && 
                        publicAnonKey !== 'SEU_ANON_KEY_AQUI' && 
                        projectId && publicAnonKey;
    
    if (isConfigured) {
      updateResult('config', 'success', 'Configuração OK', { projectId, hasKey: !!publicAnonKey });
    } else {
      updateResult('config', 'error', 'Configuração inválida');
      setIsRunning(false);
      return;
    }

    // Test 2: Conectividade do servidor
    updateResult('connectivity', 'pending', 'Testando conectividade...');
    
    try {
      const healthResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/health`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );
      
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        updateResult('connectivity', 'success', 'Servidor respondendo', healthData);
      } else {
        updateResult('connectivity', 'error', `HTTP ${healthResponse.status}: ${healthResponse.statusText}`);
      }
    } catch (error) {
      updateResult('connectivity', 'error', `Erro de conexão: ${error.message}`);
    }

    // Test 3: Rota de login principal (/auth/login)
    updateResult('login-auth', 'pending', 'Testando rota /auth/login...');
    
    try {
      const loginResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/login`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            nomeUsuario: 'admin',
            senha: 'admin123456'
          })
        }
      );
      
      const loginData = await loginResponse.json();
      
      if (loginResponse.ok && loginData.success) {
        updateResult('login-auth', 'success', 'Login principal funcionando', loginData);
      } else {
        updateResult('login-auth', loginResponse.status === 401 ? 'success' : 'error', 
          `Status ${loginResponse.status}: ${loginData.error || 'Erro desconhecido'}`, loginData);
      }
    } catch (error) {
      updateResult('login-auth', 'error', `Erro na rota /auth/login: ${error.message}`);
    }

    // Test 4: Rota de login alternativa (/login)
    updateResult('login-compat', 'pending', 'Testando rota de compatibilidade /login...');
    
    try {
      const compatResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/login`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            nomeUsuario: 'admin',
            senha: 'admin123456'
          })
        }
      );
      
      const compatData = await compatResponse.json();
      
      if (compatResponse.ok && compatData.success) {
        updateResult('login-compat', 'success', 'Login compatível funcionando', compatData);
      } else {
        updateResult('login-compat', compatResponse.status === 401 ? 'success' : 'error', 
          `Status ${compatResponse.status}: ${compatData.error || 'Erro desconhecido'}`, compatData);
      }
    } catch (error) {
      updateResult('login-compat', 'error', `Erro na rota /login: ${error.message}`);
    }

    // Test 5: Setup status
    updateResult('setup', 'pending', 'Verificando status do sistema...');
    
    try {
      const setupResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/setup-status`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );
      
      const setupData = await setupResponse.json();
      updateResult('setup', 'success', `Setup necessário: ${setupData.needsSetup ? 'Sim' : 'Não'}`, setupData);
    } catch (error) {
      updateResult('setup', 'error', `Erro no setup: ${error.message}`);
    }

    setIsRunning(false);
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">✅ OK</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">❌ Erro</Badge>;
      case 'pending':
        return <Badge className="bg-blue-100 text-blue-800">⏳ Testando</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔍 Diagnóstico Rápido de Login
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={runDiagnostics}
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? '⏳' : '🚀'} {isRunning ? 'Executando...' : 'Executar Diagnóstico'}
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => window.location.href = window.location.pathname}
            >
              ← Voltar
            </Button>
          </div>

          {results.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Resultados:</h3>
              
              {results.map((result, index) => (
                <div key={index} className="border rounded-lg p-3 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{result.test}</h4>
                    {getStatusBadge(result.status)}
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">{result.message}</p>
                  
                  {result.details && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                        Detalhes técnicos
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">💡 Sobre este diagnóstico:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Verifica se o Supabase está configurado corretamente</li>
              <li>• Testa a conectividade com o servidor backend</li>
              <li>• Valida as rotas de login (/auth/login e /login)</li>
              <li>• Verifica o status do sistema</li>
              <li>• Usa credenciais de teste (admin / admin123456)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}