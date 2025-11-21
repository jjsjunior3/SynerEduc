import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle, AlertTriangle, Loader2, RefreshCw, UserCheck, Zap, Settings, Bug, AlertCircle } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface SolucaoLoginProps {
  onClose?: () => void;
}

export function SolucaoLogin({ onClose }: SolucaoLoginProps) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const addResult = (message: string) => {
    setResults(prev => [...prev, message]);
  };

  const solveLoginProblem = async () => {
    setLoading(true);
    setResults([]);
    setError('');
    setSuccess(false);

    try {
      addResult('🚀 Iniciando solução automática do problema de login...');
      
      // Passo 1: Verificar o servidor
      addResult('1️⃣ Verificando servidor...');
      
      const healthResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/health`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      if (!healthResponse.ok) {
        throw new Error('Servidor não está respondendo');
      }

      const healthData = await healthResponse.json();
      addResult(`✅ Servidor funcionando - v${healthData.version}`);

      // Passo 2: Forçar correção do administrador principal
      addResult('2️⃣ Corrigindo administrador principal...');
      
      const fixResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/forcar-reativacao-admin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!fixResponse.ok) {
        const errorData = await fixResponse.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(`Falha na correção: ${errorData.error}`);
      }

      const fixData = await fixResponse.json();
      
      if (fixData.success) {
        addResult(`✅ Admin principal ${fixData.action === 'created' ? 'criado' : fixData.action === 'guaranteed_active' ? 'garantido como ativo' : 'corrigido'}`);
        addResult(`📧 Email: jrsantosdev1@gmail.com`);
        addResult(`🔐 Senha: Jvni0R@87`);
      } else {
        throw new Error(fixData.error || 'Falha na correção do admin');
      }

      // Passo 3: Testar login
      addResult('3️⃣ Testando login do administrador...');
      
      const loginResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/login`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'jrsantosdev1@gmail.com',
          senha: 'Jvni0R@87'
        })
      });

      if (!loginResponse.ok) {
        const errorData = await loginResponse.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(`Falha no teste de login: ${errorData.error}`);
      }

      const loginData = await loginResponse.json();
      
      if (loginData.success) {
        addResult(`✅ Login do admin funcionando!`);
        addResult(`👤 Nome: ${loginData.usuario?.nome}`);
        addResult(`🎯 Tipo: ${loginData.usuario?.tipo}`);
        addResult(`✅ Status: ${loginData.usuario?.ativo ? 'ATIVO' : 'INATIVO'}`);
      } else {
        throw new Error(loginData.error || 'Falha no teste de login');
      }

      // Passo 4: Verificar estado geral do sistema
      addResult('4️⃣ Verificando estado geral do sistema...');
      
      const debugResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/debug-usuarios`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      if (debugResponse.ok) {
        const debugData = await debugResponse.json();
        addResult(`📊 Total de usuários: ${debugData.totalUsuarios}`);
        addResult(`👨‍💼 Admins ativos: ${debugData.adminsAtivos}`);
        addResult(`🔧 Sistema precisa setup: ${debugData.needsSetup ? 'SIM' : 'NÃO'}`);
      }

      addResult('');
      addResult('🎉 PROBLEMA RESOLVIDO COM SUCESSO!');
      addResult('');
      addResult('✅ Agora você pode fazer login normalmente com:');
      addResult('📧 Email: jrsantosdev1@gmail.com');
      addResult('🔐 Senha: Jvni0R@87');
      
      setSuccess(true);

    } catch (error) {
      console.error('Erro na solução:', error);
      setError(`❌ Erro: ${error.message}`);
      addResult(`❌ ERRO: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const reloadPage = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-orange-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto bg-red-500/30 rounded-full flex items-center justify-center">
            <Zap className="w-8 h-8 text-yellow-300" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            🚨 Solução Automática de Login
          </CardTitle>
          <CardDescription className="text-red-100">
            Ferramenta de emergência para resolver problemas de autenticação
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive" className="bg-red-500/20 border-red-500/30">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-white">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-500/20 border-green-500/30">
              <CheckCircle className="h-4 w-4 text-green-300" />
              <AlertDescription className="text-green-100">
                ✅ Problema resolvido! O sistema de login foi corrigido com sucesso.
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-white/5 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">
              📋 Problema Detectado
            </h3>
            <p className="text-sm text-gray-200 mb-4">
              O sistema detectou que há problemas com a autenticação do administrador principal. 
              Esta ferramenta irá automaticamente:
            </p>
            <ul className="text-sm text-gray-200 space-y-1 ml-4">
              <li>• Verificar se o servidor está funcionando</li>
              <li>• Reativar/corrigir a conta do administrador principal</li>
              <li>• Testar o login para garantir que funciona</li>
              <li>• Verificar o estado geral do sistema</li>
            </ul>
          </div>

          <Button
            onClick={solveLoginProblem}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Executando Solução...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-5 w-5" />
                🚨 EXECUTAR SOLUÇÃO AUTOMÁTICA
              </>
            )}
          </Button>

          {results.length > 0 && (
            <div className="bg-black/20 rounded-lg p-4 max-h-80 overflow-y-auto">
              <h4 className="text-white font-semibold mb-2">📋 Log da Execução:</h4>
              <div className="space-y-1">
                {results.map((result, index) => (
                  <div key={index} className="text-sm text-gray-200 font-mono">
                    {result}
                  </div>
                ))}
              </div>
            </div>
          )}

          {success && (
            <div className="flex gap-2">
              <Button
                onClick={reloadPage}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Recarregar Página
              </Button>
              
              {onClose && (
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Continuar
                </Button>
              )}
            </div>
          )}

          <div className="text-center">
            <p className="text-xs text-gray-300">
              Esta ferramenta corrige automaticamente problemas de autenticação<br />
              Credenciais do Admin: jrsantosdev1@gmail.com / Jvni0R@87
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}