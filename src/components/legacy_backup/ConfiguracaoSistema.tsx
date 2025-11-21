import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { 
  Settings, 
  Database, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2,
  RefreshCw,
  Zap,
  Shield
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface ConfiguracaoSistemaProps {
  onSistemaConfigurado: () => void;
}

export function ConfiguracaoSistema({ onSistemaConfigurado }: ConfiguracaoSistemaProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'configurando' | 'sucesso' | 'erro'>('idle');
  const [mensagem, setMensagem] = useState<string>('');
  const [detalhes, setDetalhes] = useState<any>(null);

  const configurarSistema = async (criarTeste: boolean = false) => {
    setLoading(true);
    setStatus('configurando');
    setMensagem('Inicializando sistema...');
    setDetalhes(null);

    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/inicializar-sistema${criarTeste ? '?criar_teste=true' : ''}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        
        try {
          errorData = JSON.parse(errorText);
        } catch {
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        throw new Error(errorData.error || errorData.details || 'Erro desconhecido');
      }

      const data = await response.json();
      
      if (data.success) {
        setStatus('sucesso');
        setMensagem('Sistema configurado com sucesso!');
        setDetalhes(data);

        // Aguardar um momento e chamar callback
        setTimeout(() => {
          onSistemaConfigurado();
        }, 2000);
      } else {
        throw new Error(data.error || 'Falha na configuração');
      }

    } catch (error) {
      console.error('Erro ao configurar sistema:', error);
      setStatus('erro');
      setMensagem(`Erro na configuração: ${error instanceof Error ? error.message : error}`);
    } finally {
      setLoading(false);
    }
  };

  const reiniciar = () => {
    setStatus('idle');
    setMensagem('');
    setDetalhes(null);
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'configurando':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
      case 'sucesso':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'erro':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <Settings className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'configurando':
        return 'border-blue-200 bg-blue-50';
      case 'sucesso':
        return 'border-green-200 bg-green-50';
      case 'erro':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100">
              <Database className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <CardTitle>Configuração do Sistema</CardTitle>
              <CardDescription>
                Inicializar o ambiente virtual de aprendizagem
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Status Atual */}
          {status !== 'idle' && (
            <Card className={`border-2 ${getStatusColor()}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {getStatusIcon()}
                  <div className="flex-1">
                    <p className="font-medium">{mensagem}</p>
                    {detalhes && (
                      <div className="mt-2 space-y-1 text-sm text-gray-600">
                        <p>Admin: {detalhes.admin?.nome} ({detalhes.admin?.email})</p>
                        <p>Total de usuários: {detalhes.totalUsuarios}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Opções de Configuração */}
          {status === 'idle' && (
            <div className="space-y-4">
              <Alert>
                <Shield className="w-4 h-4" />
                <AlertDescription>
                  <strong>O que será configurado:</strong><br/>
                  • Verificação/criação de administrador do sistema<br/>
                  • Inicialização do banco de dados<br/>
                  • Configuração de rotas e endpoints<br/>
                  • Validação da conectividade
                </AlertDescription>
              </Alert>

              <div className="grid gap-3">
                <Button 
                  onClick={() => configurarSistema(false)}
                  disabled={loading}
                  className="flex items-center gap-2 h-12"
                >
                  <Settings className="w-4 h-4" />
                  Configuração Básica
                  <Badge variant="secondary" className="ml-auto">Recomendado</Badge>
                </Button>

                <Button 
                  onClick={() => configurarSistema(true)}
                  disabled={loading}
                  variant="outline"
                  className="flex items-center gap-2 h-12"
                >
                  <Users className="w-4 h-4" />
                  Configuração + Usuários de Teste
                  <Badge variant="outline" className="ml-auto">Desenvolvimento</Badge>
                </Button>
              </div>
            </div>
          )}

          {/* Ações de Controle */}
          {status !== 'idle' && (
            <div className="flex gap-2">
              {status === 'erro' && (
                <Button 
                  onClick={() => configurarSistema(false)}
                  disabled={loading}
                  variant="default"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Tentar Novamente
                </Button>
              )}
              
              {status !== 'configurando' && (
                <Button 
                  onClick={reiniciar}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Nova Configuração
                </Button>
              )}

              {status === 'sucesso' && (
                <Button 
                  onClick={onSistemaConfigurado}
                  className="flex items-center gap-2 ml-auto"
                >
                  <Zap className="w-4 h-4" />
                  Continuar para Login
                </Button>
              )}
            </div>
          )}

          {/* Informações Técnicas */}
          <Alert variant="default" className="text-xs">
            <Database className="w-3 h-3" />
            <AlertDescription>
              <strong>Servidor:</strong> https://{projectId}.supabase.co/functions/v1/make-server-c61d1ad0/<br/>
              <strong>Status:</strong> {status === 'configurando' ? 'Configurando...' : 
                                      status === 'sucesso' ? 'Configurado' : 
                                      status === 'erro' ? 'Erro' : 'Aguardando configuração'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}