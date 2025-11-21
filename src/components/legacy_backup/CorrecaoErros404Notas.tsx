import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { 
  ArrowLeft, 
  AlertTriangle, 
  CheckCircle, 
  Settings,
  FileText,
  Loader2,
  RefreshCcw,
  Wrench,
  Database,
  BookOpen
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

interface CorrecaoErros404NotasProps {
  onVoltar: () => void;
}

export function CorrecaoErros404Notas({ onVoltar }: CorrecaoErros404NotasProps) {
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState<any[]>([]);
  const [fixing, setFixing] = useState(false);
  
  const { usuario } = useAuth();

  const adicionarResultado = (teste: string, status: 'sucesso' | 'erro', detalhes: any) => {
    setResultados(prev => [...prev, {
      teste,
      status,
      detalhes,
      timestamp: new Date().toISOString()
    }]);
  };

  const testarRotaNotas = async () => {
    if (!usuario?.id) {
      adicionarResultado('Teste Rota Notas', 'erro', 'Usuário não está logado');
      return false;
    }

    try {
      console.log('[CORRECAO_NOTAS] Testando rota de notas...');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/notas/${usuario.id}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        adicionarResultado('Teste Rota Notas', 'sucesso', {
          status: response.status,
          notas_count: data.notas?.length || 0,
          usuario_id: usuario.id,
          response_data: data
        });
        return true;
      } else {
        adicionarResultado('Teste Rota Notas', 'erro', {
          status: response.status,
          statusText: response.statusText,
          error: data.error || 'Erro desconhecido',
          usuario_id: usuario.id
        });
        return false;
      }
    } catch (error) {
      adicionarResultado('Teste Rota Notas', 'erro', {
        error: error.message,
        usuario_id: usuario.id
      });
      return false;
    }
  };

  const verificarUsuarioExiste = async () => {
    if (!usuario?.id) {
      adicionarResultado('Verificação Usuário', 'erro', 'Usuário não está logado');
      return false;
    }

    try {
      console.log('[CORRECAO_NOTAS] Verificando se usuário existe no servidor...');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const usuarioEncontrado = data.usuarios?.find((u: any) => u.id === usuario.id);
        
        if (usuarioEncontrado) {
          adicionarResultado('Verificação Usuário', 'sucesso', {
            usuario_encontrado: true,
            usuario_dados: usuarioEncontrado
          });
          return true;
        } else {
          adicionarResultado('Verificação Usuário', 'erro', {
            usuario_encontrado: false,
            total_usuarios: data.usuarios?.length || 0,
            usuario_procurado: usuario.id
          });
          return false;
        }
      } else {
        adicionarResultado('Verificação Usuário', 'erro', {
          status: response.status,
          error: 'Erro ao buscar usuários'
        });
        return false;
      }
    } catch (error) {
      adicionarResultado('Verificação Usuário', 'erro', error.message);
      return false;
    }
  };

  const verificarConectividadeServidor = async () => {
    try {
      console.log('[CORRECAO_NOTAS] Verificando conectividade com servidor...');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/health`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        adicionarResultado('Conectividade Servidor', 'sucesso', data);
        return true;
      } else {
        adicionarResultado('Conectividade Servidor', 'erro', {
          status: response.status,
          statusText: response.statusText
        });
        return false;
      }
    } catch (error) {
      adicionarResultado('Conectividade Servidor', 'erro', error.message);
      return false;
    }
  };

  const executarDiagnosticoCompleto = async () => {
    setLoading(true);
    setResultados([]);

    try {
      toast.info('🔍 Iniciando diagnóstico do erro 404 de notas...');
      
      // 1. Verificar conectividade
      await verificarConectividadeServidor();
      
      // 2. Verificar se usuário existe
      await verificarUsuarioExiste();
      
      // 3. Testar rota de notas
      await testarRotaNotas();
      
      toast.success('✅ Diagnóstico completo concluído!');
      
    } catch (error) {
      console.error('Erro no diagnóstico:', error);
      toast.error('❌ Erro durante o diagnóstico');
    } finally {
      setLoading(false);
    }
  };

  const corrigirProblema404 = async () => {
    setFixing(true);
    
    try {
      toast.info('🔧 Tentando corrigir problema 404...');
      
      // Como a rota já foi implementada no servidor, apenas testar novamente
      await new Promise(resolve => setTimeout(resolve, 2000)); // Aguardar deploy
      
      // Testar novamente a rota
      const funcionou = await testarRotaNotas();
      
      if (funcionou) {
        toast.success('✅ Problema 404 corrigido! Rota de notas funcionando.');
      } else {
        toast.warning('⚠️ Problema ainda persiste. Verifique os logs.');
      }
      
    } catch (error) {
      console.error('[CORRECAO_NOTAS] Erro:', error);
      toast.error('❌ Erro durante a correção');
    } finally {
      setFixing(false);
    }
  };

  const limparResultados = () => {
    setResultados([]);
  };

  return (
    <div className="min-h-screen bg-orange-50">
      {/* Header */}
      <div className="bg-orange-600 text-white px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onVoltar} className="text-white hover:bg-orange-700">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">🔧 CORREÇÃO - ERRO 404 NOTAS</h1>
            <p className="text-sm opacity-90">Solução para: "Erro ao carregar notas: Error: Erro 404"</p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto">
        {/* Card de controles */}
        <Card className="mb-6 border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <FileText className="w-5 h-5" />
              Diagnóstico do Erro 404 - Rota de Notas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button 
                onClick={executarDiagnosticoCompleto}
                disabled={loading || fixing}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Diagnosticando...
                  </>
                ) : (
                  <>
                    <Settings className="w-5 h-5 mr-2" />
                    Diagnosticar Erro 404
                  </>
                )}
              </Button>

              <Button 
                onClick={corrigirProblema404}
                disabled={loading || fixing}
                variant="outline"
                size="lg"
              >
                {fixing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Corrigindo...
                  </>
                ) : (
                  <>
                    <Wrench className="w-5 h-5 mr-2" />
                    Corrigir 404
                  </>
                )}
              </Button>

              <Button 
                onClick={limparResultados}
                disabled={loading || fixing}
                variant="outline"
                size="lg"
              >
                <RefreshCcw className="w-5 h-5 mr-2" />
                Limpar
              </Button>
            </div>

            <div className="bg-orange-100 border border-orange-300 rounded-lg p-4">
              <h4 className="font-semibold text-orange-800 mb-2">🎯 ERRO ESPECÍFICO:</h4>
              <p className="text-sm text-orange-700">
                "Erro ao carregar notas: Error: Erro 404" - Indica que a rota 
                <code className="bg-white px-1 rounded">/notas/:userId</code> não estava implementada no servidor.
              </p>
            </div>

            <div className="bg-green-100 border border-green-300 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-2">✅ CORREÇÃO APLICADA:</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Implementada rota <code>/make-server-c61d1ad0/notas/:userId</code></li>
                <li>• Sistema gera notas mock realistas baseadas na série do usuário</li>
                <li>• Validação de usuário existente antes de retornar notas</li>
                <li>• Logs detalhados para debug</li>
              </ul>
            </div>

            {usuario && (
              <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">👤 Usuário Atual:</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <div><strong>ID:</strong> {usuario.id}</div>
                  <div><strong>Nome:</strong> {usuario.nome}</div>
                  <div><strong>Série:</strong> {usuario.serie || 'Não definida'}</div>
                  <div><strong>Tipo:</strong> {usuario.tipo}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resultados */}
        {resultados.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Resultados do Diagnóstico ({resultados.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {resultados.map((resultado, index) => (
                  <div
                    key={index}
                    className={`p-4 border rounded-lg ${
                      resultado.status === 'sucesso'
                        ? 'border-green-200 bg-green-50'
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {resultado.status === 'sucesso' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      )}
                      <h3 className="font-medium">{resultado.teste}</h3>
                      <span className={`text-sm px-2 py-1 rounded ${
                        resultado.status === 'sucesso'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {resultado.status === 'sucesso' ? 'SUCESSO' : 'ERRO'}
                      </span>
                    </div>
                    
                    <div className="text-sm bg-white p-3 rounded border max-h-60 overflow-y-auto">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(resultado.detalhes, null, 2)}
                      </pre>
                    </div>
                    
                    <div className="text-xs text-gray-500 mt-2">
                      {new Date(resultado.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instruções */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>📋 Sobre Este Erro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <h4 className="font-semibold text-red-800 mb-1">❌ PROBLEMA ORIGINAL:</h4>
                <p className="text-red-700">
                  O componente Boletim estava tentando acessar a rota 
                  <code>/notas/:userId</code> que não existia no servidor, 
                  resultando em erro 404.
                </p>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <h4 className="font-semibold text-green-800 mb-1">✅ SOLUÇÃO IMPLEMENTADA:</h4>
                <p className="text-green-700">
                  Implementada a rota completa no servidor com geração de notas mock 
                  realistas baseadas na série escolar do usuário.
                </p>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <h4 className="font-semibold text-blue-800 mb-1">🔍 O QUE ESTE DIAGNÓSTICO FAZ:</h4>
                <ul className="text-blue-700 space-y-1">
                  <li>• Verifica conectividade com o servidor</li>
                  <li>• Confirma se o usuário existe no sistema</li>
                  <li>• Testa a nova rota de notas implementada</li>
                  <li>• Mostra dados detalhados das respostas</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}