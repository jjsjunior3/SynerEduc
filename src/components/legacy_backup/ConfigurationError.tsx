import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { 
  AlertTriangle, 
  RefreshCw, 
  Settings, 
  Wrench, 
  CheckCircle2, 
  Loader2,
  ExternalLink,
  Database
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface ConfigurationErrorProps {
  error: string;
  onRetry: () => void;
}

export function ConfigurationError({ error, onRetry }: ConfigurationErrorProps) {
  const [fixing, setFixing] = useState(false);
  const [fixResult, setFixResult] = useState<string | null>(null);

  const autoFix = async () => {
    setFixing(true);
    setFixResult(null);

    try {
      // Tentar inicializar o sistema automaticamente
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/inicializar-sistema?criar_teste=true`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFixResult('✅ Sistema corrigido automaticamente! Recarregando...');
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          setFixResult(`❌ Falha na correção: ${data.error}`);
        }
      } else {
        const errorText = await response.text();
        setFixResult(`❌ Erro HTTP ${response.status}: ${errorText}`);
      }
    } catch (err) {
      setFixResult(`❌ Erro de conexão: ${err instanceof Error ? err.message : err}`);
    } finally {
      setFixing(false);
    }
  };

  const reativarUsuarios = async () => {
    setFixing(true);
    setFixResult(null);

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/reativar-todos-usuarios`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFixResult(`✅ ${data.message} Recarregando...`);
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          setFixResult(`❌ Falha na reativação: ${data.error}`);
        }
      } else {
        const errorText = await response.text();
        setFixResult(`❌ Erro HTTP ${response.status}: ${errorText}`);
      }
    } catch (err) {
      setFixResult(`❌ Erro de conexão: ${err instanceof Error ? err.message : err}`);
    } finally {
      setFixing(false);
    }
  };

  const openSupabaseDashboard = () => {
    window.open(`https://supabase.com/dashboard/project/${projectId}`, '_blank');
  };

  // Verificar se o erro é sobre conta desativada
  const isContaDesativadaError = error.toLowerCase().includes('conta desativada');

  return (
    <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-red-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-red-100">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-red-800">Erro de Configuração</CardTitle>
              <CardDescription className="text-red-600">
                Falha na inicialização do sistema
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Erro Detalhado */}
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              <strong>Erro encontrado:</strong><br/>
              {error}
            </AlertDescription>
          </Alert>

          {/* Resultado da Correção Automática */}
          {fixResult && (
            <Alert className={fixResult.includes('✅') ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <div className="flex items-center gap-2">
                {fixResult.includes('✅') ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                )}
              </div>
              <AlertDescription className={fixResult.includes('✅') ? 'text-green-700' : 'text-red-700'}>
                {fixResult}
              </AlertDescription>
            </Alert>
          )}

          {/* Soluções Sugeridas */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800">Soluções Disponíveis:</h3>
            
            <div className="grid gap-3">
              {/* Correção Específica para Contas Desativadas */}
              {isContaDesativadaError && (
                <Button 
                  onClick={reativarUsuarios}
                  disabled={fixing}
                  className="flex items-center gap-2 h-12 bg-green-600 hover:bg-green-700"
                >
                  {fixing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {fixing ? 'Reativando Usuários...' : 'Reativar Todos os Usuários'}
                  <span className="ml-auto text-xs bg-green-500 px-2 py-1 rounded">Recomendado</span>
                </Button>
              )}

              {/* Correção Automática Geral */}
              <Button 
                onClick={autoFix}
                disabled={fixing}
                className="flex items-center gap-2 h-12 bg-blue-600 hover:bg-blue-700"
              >
                {fixing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wrench className="w-4 h-4" />
                )}
                {fixing ? 'Corrigindo Sistema...' : 'Correção Automática'}
                {!isContaDesativadaError && (
                  <span className="ml-auto text-xs bg-blue-500 px-2 py-1 rounded">Recomendado</span>
                )}
              </Button>

              {/* Retry Manual */}
              <Button 
                onClick={onRetry}
                variant="outline"
                className="flex items-center gap-2 h-12"
              >
                <RefreshCw className="w-4 h-4" />
                Tentar Reconectar
              </Button>
            </div>
          </div>

          {/* Informações Técnicas */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700">Informações Técnicas:</h4>
            
            <div className="bg-gray-50 p-3 rounded-lg text-sm font-mono">
              <p><strong>Project ID:</strong> {projectId}</p>
              <p><strong>Server URL:</strong> https://{projectId}.supabase.co/functions/v1/make-server-c61d1ad0/</p>
              <p><strong>Timestamp:</strong> {new Date().toISOString()}</p>
            </div>

            <Button 
              onClick={openSupabaseDashboard}
              variant="outline" 
              size="sm"
              className="flex items-center gap-2"
            >
              <Database className="w-4 h-4" />
              Abrir Dashboard Supabase
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>

          {/* Guia de Solução de Problemas */}
          <Alert>
            <Settings className="w-4 h-4" />
            <AlertDescription>
              <strong>Possíveis Causas:</strong><br/>
              • Edge Functions não deployadas ou inativas<br/>
              • Configuração de variáveis de ambiente incorreta<br/>
              • Problemas de conectividade com Supabase<br/>
              • Base de dados não inicializada<br/>
              • Usuários com status desativado<br/>
              <br/>
              <strong>A correção automática irá:</strong><br/>
              • Verificar conectividade com o servidor<br/>
              • Inicializar administrador padrão<br/>
              • Criar estrutura básica de dados<br/>
              • Configurar usuários de teste (opcional)<br/>
              • Reativar usuários desativados (se necessário)
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}