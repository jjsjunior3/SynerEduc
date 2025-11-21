import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { AlertTriangle, CheckCircle, Loader2, RefreshCw, Trash2, UserPlus, Shield } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface SolucaoEmergenciaProps {
  onClose?: () => void;
}

export function SolucaoEmergencia({ onClose }: SolucaoEmergenciaProps) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const addResult = (message: string) => {
    setResults(prev => [...prev, message]);
  };

  const executeCompleteReset = async () => {
    setLoading(true);
    setResults([]);
    setError('');
    setSuccess(false);

    try {
      addResult('🚨 Iniciando RESET COMPLETO do sistema de usuários...');
      addResult('⚠️  ATENÇÃO: Esta operação irá deletar TODOS os usuários!');
      addResult('🔄 Enviando comando de reset para o servidor...');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/reset-admin-completo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro de conexão' }));
        throw new Error(`Servidor retornou erro ${response.status}: ${errorData.error}`);
      }

      const data = await response.json();
      
      if (data.success) {
        addResult('✅ Reset completo executado com SUCESSO!');
        addResult('');
        addResult('📊 ESTATÍSTICAS DA OPERAÇÃO:');
        addResult(`🗑️  Usuários deletados: ${data.stats?.usuariosDeletados || 'N/A'}`);
        addResult(`🆔 Novo ID do admin: ${data.stats?.novoId || 'N/A'}`);
        addResult(`🧪 Teste de login: ${data.stats?.testeLogin || 'N/A'}`);
        addResult('');
        addResult('👤 NOVO ADMINISTRADOR CRIADO:');
        addResult(`📧 Email: ${data.usuario?.email || 'jrsantosdev1@gmail.com'}`);
        addResult(`👨‍💼 Nome: ${data.usuario?.nome || 'Administrador Principal'}`);
        addResult(`🔐 Senha: Jvni0R@87`);
        addResult(`✅ Status: ${data.usuario?.ativo ? 'ATIVO' : 'INATIVO'}`);
        addResult(`🎯 Tipo: ${data.usuario?.tipo || 'administrador'}`);
        addResult('');
        addResult('🎉 PROBLEMA RESOLVIDO DEFINITIVAMENTE!');
        addResult('');
        addResult('✅ Agora você pode fazer login normalmente!');
        
        setSuccess(true);
      } else {
        throw new Error(data.error || 'Falha no reset completo');
      }

    } catch (error) {
      console.error('Erro no reset completo:', error);
      const errorMessage = error.message || 'Erro desconhecido';
      setError(`❌ Erro: ${errorMessage}`);
      addResult(`❌ ERRO: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const reloadPage = () => {
    window.location.reload();
  };

  const goToLogin = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-orange-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader className="text-center space-y-2">
          <div className="w-20 h-20 mx-auto bg-red-500/30 rounded-full flex items-center justify-center">
            <Shield className="w-10 h-10 text-yellow-300" />
          </div>
          <CardTitle className="text-3xl font-bold text-white">
            🚨 SOLUÇÃO DE EMERGÊNCIA
          </CardTitle>
          <CardDescription className="text-red-100">
            Reset Completo do Sistema de Usuários - Use apenas em casos extremos
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
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
                ✅ Reset completo executado com sucesso! O sistema foi completamente limpo e o administrador principal foi recriado.
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-white/5 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
              <AlertTriangle className="w-6 h-6 mr-2 text-yellow-400" />
              ⚠️ ATENÇÃO - Operação Destrutiva
            </h3>
            
            <div className="space-y-4 text-sm text-gray-200">
              <p className="font-semibold text-yellow-200">
                Esta é uma operação EXTREMA que deve ser usada apenas quando todas as outras soluções falharam.
              </p>
              
              <div className="bg-red-500/20 p-4 rounded-lg border border-red-500/30">
                <h4 className="font-semibold text-red-200 mb-2">🔥 O que esta operação faz:</h4>
                <ul className="space-y-1 text-red-100">
                  <li>• 🗑️ <strong>DELETA TODOS OS USUÁRIOS</strong> do sistema</li>
                  <li>• 🧹 Limpa completamente o banco de dados de usuários</li>
                  <li>• 👤 Recria o administrador principal do zero</li>
                  <li>• 🧪 Testa automaticamente o novo login</li>
                  <li>• ✅ Garante que o sistema funcione perfeitamente</li>
                </ul>
              </div>
              
              <div className="bg-green-500/20 p-4 rounded-lg border border-green-500/30">
                <h4 className="font-semibold text-green-200 mb-2">✅ Resultado esperado:</h4>
                <ul className="space-y-1 text-green-100">
                  <li>• 📧 Admin com email: <code className="bg-black/20 px-1 rounded">jrsantosdev1@gmail.com</code></li>
                  <li>• 🔐 Senha: <code className="bg-black/20 px-1 rounded">Jvni0R@87</code></li>
                  <li>• ✅ Status: ATIVO e funcionando</li>
                  <li>• 🎯 Login funcionando 100%</li>
                </ul>
              </div>
            </div>
          </div>

          {!success ? (
            <Button
              onClick={executeCompleteReset}
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-4"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                  Executando Reset Completo...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-6 w-6" />
                  🚨 EXECUTAR RESET COMPLETO (EMERGÊNCIA)
                </>
              )}
            </Button>
          ) : (
            <div className="flex gap-4">
              <Button
                onClick={reloadPage}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-4"
                size="lg"
              >
                <RefreshCw className="mr-2 h-5 w-5" />
                Recarregar Página
              </Button>
              
              <Button
                onClick={goToLogin}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-4"
                size="lg"
              >
                <UserPlus className="mr-2 h-5 w-5" />
                Ir para Login
              </Button>
            </div>
          )}

          {results.length > 0 && (
            <div className="bg-black/40 rounded-lg p-6 max-h-96 overflow-y-auto">
              <h4 className="text-white font-semibold mb-4 flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                📋 Log da Operação de Reset:
              </h4>
              <div className="space-y-2">
                {results.map((result, index) => (
                  <div key={index} className="text-sm font-mono">
                    {result.includes('✅') ? (
                      <span className="text-green-300">{result}</span>
                    ) : result.includes('❌') ? (
                      <span className="text-red-300">{result}</span>
                    ) : result.includes('⚠️') || result.includes('🚨') ? (
                      <span className="text-yellow-300">{result}</span>
                    ) : result.includes('📊') || result.includes('👤') ? (
                      <span className="text-blue-300">{result}</span>
                    ) : (
                      <span className="text-gray-300">{result}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-center border-t border-white/20 pt-4">
            <p className="text-xs text-gray-400">
              ⚡ Solução de Emergência - Sistema AVA v2.1.0<br />
              Use esta ferramenta apenas quando outras soluções falharem
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}