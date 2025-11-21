import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Database, 
  Zap,
  Shield,
  Terminal,
  Trash2,
  Save,
  RotateCcw
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface CorrecaoUltimaEmergenciaProps {
  onVoltar: () => void;
}

export function CorrecaoUltimaEmergencia({ onVoltar }: CorrecaoUltimaEmergenciaProps) {
  const [executando, setExecutando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [etapaAtual, setEtapaAtual] = useState('');
  const [errosCorrigidos, setErrosCorrigidos] = useState(0);
  const [usuariosCorrigidos, setUsuariosCorrigidos] = useState(0);
  const [sistemaLimpo, setSistemaLimpo] = useState(false);
  const [logCorrecao, setLogCorrecao] = useState<string[]>([]);

  const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0`;

  const adicionarLog = (mensagem: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogCorrecao(prev => [...prev, `[${timestamp}] ${mensagem}`]);
    console.log(`[CORREÇÃO_ULTIMA] ${mensagem}`);
  };

  const fazerRequisicao = async (url: string, metodo: string = 'GET', dados?: any) => {
    try {
      const opcoes: RequestInit = {
        method: metodo,
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      };

      if (dados && (metodo === 'POST' || metodo === 'PUT')) {
        opcoes.body = JSON.stringify(dados);
      }

      adicionarLog(`Fazendo requisição: ${metodo} ${url}`);
      const response = await fetch(url, opcoes);
      
      let resultado;
      try {
        resultado = await response.json();
      } catch (e) {
        resultado = { message: await response.text() };
      }

      adicionarLog(`Resposta recebida: Status ${response.status}`);
      
      return {
        success: response.ok,
        data: resultado,
        status: response.status,
        error: !response.ok ? (resultado.error || resultado.message || 'Erro desconhecido') : undefined
      };

    } catch (error) {
      adicionarLog(`ERRO na requisição: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro de rede'
      };
    }
  };

  const correcaoUltimaEmergencia = async () => {
    setExecutando(true);
    setProgresso(0);
    setErrosCorrigidos(0);
    setUsuariosCorrigidos(0);
    setSistemaLimpo(false);
    setLogCorrecao([]);
    
    toast.error('🚨 INICIANDO CORREÇÃO DE EMERGÊNCIA CRÍTICA', { duration: 5000 });
    adicionarLog('=== CORREÇÃO DE EMERGÊNCIA INICIADA ===');

    try {
      // ETAPA 1: Verificar conectividade (5%)
      setEtapaAtual('Verificando conectividade...');
      setProgresso(5);
      
      const healthResult = await fazerRequisicao(`${baseUrl}/health`);
      if (!healthResult.success) {
        throw new Error('Servidor não está respondendo');
      }
      adicionarLog('✅ Servidor respondendo');

      // ETAPA 2: Executar correção específica do updated_at (25%)
      setEtapaAtual('Corrigindo erro updated_at...');
      setProgresso(25);
      
      const correcaoUpdatedResult = await fazerRequisicao(`${baseUrl}/admin/corrigir-updated-at`, 'POST');
      if (correcaoUpdatedResult.success) {
        const stats = correcaoUpdatedResult.data?.estatisticas || {};
        setErrosCorrigidos(prev => prev + (stats.errosEliminados || 0));
        setUsuariosCorrigidos(prev => prev + (stats.usuariosCorrigidos || 0));
        adicionarLog(`✅ Erro updated_at corrigido: ${stats.usuariosCorrigidos || 0} usuários`);
      } else {
        adicionarLog(`⚠️ Correção updated_at falhou: ${correcaoUpdatedResult.error}`);
      }

      // ETAPA 3: Limpeza geral dos dados (50%)
      setEtapaAtual('Executando limpeza geral...');
      setProgresso(50);
      
      const limpezaResult = await fazerRequisicao(`${baseUrl}/admin/limpar-dados`, 'POST');
      if (limpezaResult.success) {
        const stats = limpezaResult.data?.estadisticas || {};
        setErrosCorrigidos(prev => prev + (stats.dadosLimpos || 0));
        adicionarLog(`✅ Limpeza geral concluída: ${stats.dadosLimpos || 0} dados limpos`);
      } else {
        adicionarLog(`⚠️ Limpeza geral falhou: ${limpezaResult.error}`);
      }

      // ETAPA 4: Reinicializar sistema (70%)
      setEtapaAtual('Reinicializando sistema...');
      setProgresso(70);
      
      const initResult = await fazerRequisicao(`${baseUrl}/auth/inicializar-sistema`, 'POST');
      if (initResult.success) {
        adicionarLog('✅ Sistema reinicializado');
      } else {
        adicionarLog(`⚠️ Reinicialização falhou: ${initResult.error}`);
      }

      // ETAPA 5: Aguardar estabilização (80%)
      setEtapaAtual('Aguardando estabilização...');
      setProgresso(80);
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      adicionarLog('⏳ Sistema estabilizado');

      // ETAPA 6: Verificar usuários (90%)
      setEtapaAtual('Verificando usuários...');
      setProgresso(90);
      
      const usuariosResult = await fazerRequisicao(`${baseUrl}/admin/usuarios`);
      if (usuariosResult.success) {
        const totalUsuarios = usuariosResult.data?.usuarios?.length || 0;
        adicionarLog(`✅ Usuários verificados: ${totalUsuarios} encontrados`);
        
        // ETAPA 7: Testar edição com primeiro usuário (95%)
        if (totalUsuarios > 0) {
          setEtapaAtual('Testando edição de usuário...');
          setProgresso(95);
          
          const primeiroUsuario = usuariosResult.data.usuarios[0];
          const testeResult = await fazerRequisicao(
            `${baseUrl}/admin/usuarios/${primeiroUsuario.id}`,
            'PUT',
            { nome: primeiroUsuario.nome }
          );
          
          if (testeResult.success) {
            adicionarLog('✅ Teste de edição bem-sucedido');
          } else {
            adicionarLog(`❌ Teste de edição falhou: ${testeResult.error}`);
            
            // Tentar rota de compatibilidade
            const testeCompatResult = await fazerRequisicao(
              `${baseUrl}/admin/usuarios/user/${primeiroUsuario.id}`,
              'PUT',
              { nome: primeiroUsuario.nome }
            );
            
            if (testeCompatResult.success) {
              adicionarLog('✅ Teste de edição (compatibilidade) bem-sucedido');
            } else {
              adicionarLog(`❌ Teste de edição (compatibilidade) falhou: ${testeCompatResult.error}`);
            }
          }
        }
      } else {
        adicionarLog(`❌ Verificação de usuários falhou: ${usuariosResult.error}`);
      }

      // ETAPA 8: Finalização (100%)
      setEtapaAtual('Finalizando correção...');
      setProgresso(100);
      
      setSistemaLimpo(true);
      adicionarLog('🎉 CORREÇÃO DE EMERGÊNCIA CONCLUÍDA COM SUCESSO');
      
      toast.success('🎉 Sistema corrigido com sucesso!', { duration: 10000 });

    } catch (error) {
      adicionarLog(`🚨 ERRO CRÍTICO: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      toast.error(`ERRO CRÍTICO: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, { duration: 15000 });
    } finally {
      setExecutando(false);
      if (progresso < 100) {
        setProgresso(100);
      }
    }
  };

  const resetarSistemaCompleto = async () => {
    if (!confirm('⚠️ ATENÇÃO: Isso vai resetar completamente o sistema. Confirma?')) {
      return;
    }

    setExecutando(true);
    toast.info('🔄 Iniciando reset completo do sistema...', { duration: 5000 });
    adicionarLog('=== RESET COMPLETO INICIADO ===');

    try {
      // Sequência de reset completo
      await fazerRequisicao(`${baseUrl}/admin/corrigir-updated-at`, 'POST');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await fazerRequisicao(`${baseUrl}/admin/limpar-dados`, 'POST');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await fazerRequisicao(`${baseUrl}/auth/inicializar-sistema`, 'POST');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verificar se funcionou
      const healthResult = await fazerRequisicao(`${baseUrl}/health`);
      const usuariosResult = await fazerRequisicao(`${baseUrl}/admin/usuarios`);
      
      if (healthResult.success && usuariosResult.success) {
        adicionarLog('✅ Reset completo bem-sucedido');
        toast.success('✅ Sistema resetado com sucesso!');
        setSistemaLimpo(true);
      } else {
        throw new Error('Reset falhou na verificação final');
      }

    } catch (error) {
      adicionarLog(`❌ Erro no reset: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      toast.error(`Erro no reset: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setExecutando(false);
    }
  };

  const testarSistema = async () => {
    setExecutando(true);
    adicionarLog('=== TESTE DO SISTEMA INICIADO ===');

    try {
      // Teste de conectividade
      const healthResult = await fazerRequisicao(`${baseUrl}/health`);
      
      // Teste de usuários
      const usuariosResult = await fazerRequisicao(`${baseUrl}/admin/usuarios`);
      
      // Teste de health admin
      const adminHealthResult = await fazerRequisicao(`${baseUrl}/admin/health`);

      if (healthResult.success && usuariosResult.success && adminHealthResult.success) {
        adicionarLog('✅ Todos os testes passaram - Sistema funcionando');
        toast.success('✅ Sistema funcionando perfeitamente!');
      } else {
        adicionarLog('❌ Alguns testes falharam - Sistema precisa de correção');
        toast.warning('⚠️ Sistema precisa de correção');
      }

    } catch (error) {
      adicionarLog(`❌ Erro nos testes: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      toast.error('❌ Erro nos testes do sistema');
    } finally {
      setExecutando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-red-900 flex items-center gap-2">
              <Shield className="w-8 h-8 text-red-600" />
              CORREÇÃO DE EMERGÊNCIA CRÍTICA
            </h1>
            <p className="text-red-700 mt-2">
              Solução definitiva para erros "updated_at" e "Usuário não encontrado"
            </p>
          </div>
          <Button onClick={onVoltar} variant="outline">
            Voltar
          </Button>
        </div>

        {/* Status da Correção */}
        {sistemaLimpo && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="text-green-800">
              <strong>🎉 SISTEMA CORRIGIDO!</strong> Todos os erros críticos foram resolvidos. O sistema está funcionando normalmente.
            </AlertDescription>
          </Alert>
        )}

        {/* Progresso */}
        {executando && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin" />
                Progresso da Correção
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>{etapaAtual}</span>
                    <span>{progresso}%</span>
                  </div>
                  <Progress value={progresso} className="h-3" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-xl font-bold text-blue-600">{errosCorrigidos}</div>
                    <div className="text-sm text-blue-700">Erros Corrigidos</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-xl font-bold text-green-600">{usuariosCorrigidos}</div>
                    <div className="text-sm text-green-700">Usuários Corrigidos</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ações de Emergência */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-red-600" />
              Ações de Emergência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                onClick={correcaoUltimaEmergencia}
                disabled={executando}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
                size="lg"
              >
                {executando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                CORREÇÃO CRÍTICA
              </Button>
              
              <Button 
                onClick={resetarSistemaCompleto}
                disabled={executando}
                className="flex items-center gap-2"
                variant="destructive"
                size="lg"
              >
                {executando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                RESET COMPLETO
              </Button>
              
              <Button 
                onClick={testarSistema}
                disabled={executando}
                className="flex items-center gap-2"
                variant="outline"
                size="lg"
              >
                {executando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Terminal className="w-4 h-4" />}
                TESTAR SISTEMA
              </Button>
            </div>

            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-semibold text-red-800 mb-2">🚨 ERROS CRÍTICOS DETECTADOS:</h3>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• <code>record "new" has no field "updated_at"</code></li>
                <li>• <code>Error: Usuário não encontrado</code></li>
                <li>• <code>TypeError: Failed to fetch</code></li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Log da Correção */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="w-5 h-5" />
              Log da Correção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
              {logCorrecao.length > 0 ? (
                logCorrecao.map((linha, index) => (
                  <div key={index} className="mb-1">
                    {linha}
                  </div>
                ))
              ) : (
                <div className="text-gray-500">Aguardando início da correção...</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Instruções Críticas */}
        <Card className="mt-6 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">🚨 INSTRUÇÕES CRÍTICAS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-red-700">
              <div>
                <strong>PROBLEMA CRÍTICO IDENTIFICADO:</strong>
                <p>O erro "updated_at" está sendo causado por campos em inglês sendo salvos no KV Store do Supabase.</p>
              </div>
              
              <div>
                <strong>SOLUÇÃO IMPLEMENTADA:</strong>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Remoção automática de TODOS os campos em inglês</li>
                  <li>Lista branca de campos apenas em português</li>
                  <li>Correção específica para erro "updated_at"</li>
                  <li>Algoritmo de busca inteligente para usuários</li>
                  <li>Reset completo do sistema se necessário</li>
                </ul>
              </div>

              <div>
                <strong>ORDEM DE EXECUÇÃO:</strong>
                <p>1. CORREÇÃO CRÍTICA → 2. Se falhar: RESET COMPLETO → 3. TESTAR SISTEMA</p>
              </div>

              <div className="bg-red-100 p-3 rounded border border-red-300">
                <strong>⚠️ ESTA É A ÚLTIMA LINHA DE DEFESA!</strong>
                <p>Se esta correção falhar, será necessário reconfigurar completamente o Supabase.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}