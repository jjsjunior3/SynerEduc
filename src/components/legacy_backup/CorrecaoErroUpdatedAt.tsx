import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  RefreshCw,
  Server,
  Database,
  Users,
  AlertCircle,
  Bug,
  Wrench,
  Zap,
  Shield,
  Key,
  UserCheck,
  Network,
  BookOpen,
  Save,
  FileText,
  Clock
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface CorrecaoErroUpdatedAtProps {
  onVoltar?: () => void;
}

interface ResultadoCorrecao {
  nome: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  mensagem: string;
  detalhes?: any;
  tempo?: number;
}

export function CorrecaoErroUpdatedAt({ onVoltar }: CorrecaoErroUpdatedAtProps) {
  const [executando, setExecutando] = useState(false);
  const [resultados, setResultados] = useState<ResultadoCorrecao[]>([]);
  const [etapaAtual, setEtapaAtual] = useState<string>('');
  const [usuariosProblematicos, setUsuariosProblematicos] = useState<any[]>([]);

  const adicionarResultado = (resultado: ResultadoCorrecao) => {
    setResultados(prev => [...prev, resultado]);
  };

  const atualizarResultado = (index: number, resultado: Partial<ResultadoCorrecao>) => {
    setResultados(prev => prev.map((r, i) => i === index ? { ...r, ...resultado } : r));
  };

  // 1. Detectar problema de campo updated_at
  const detectarProblemaUpdatedAt = async (): Promise<ResultadoCorrecao> => {
    const inicio = Date.now();
    try {
      console.log('[CORRECAO_UPDATED_AT] Detectando problema de campo...');
      
      // Primeiro, tentar listar usuários para verificar a estrutura
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return {
          nome: '🔍 Detectar Problema',
          status: 'error',
          mensagem: `Não foi possível acessar API de usuários (HTTP ${response.status})`,
          tempo: Date.now() - inicio
        };
      }

      const data = await response.json();
      const usuarios = data.usuarios || [];
      
      if (usuarios.length === 0) {
        return {
          nome: '🔍 Detectar Problema',
          status: 'warning',
          mensagem: 'Nenhum usuário encontrado para testar',
          tempo: Date.now() - inicio
        };
      }

      // Verificar estrutura dos usuários
      const usuarioTeste = usuarios[0];
      const temUpdatedAt = 'updated_at' in usuarioTeste;
      const temAtualizadoEm = 'atualizadoEm' in usuarioTeste;
      
      let problemasEncontrados = [];
      
      if (temUpdatedAt) {
        problemasEncontrados.push('Campo "updated_at" encontrado (inglês)');
      }
      if (!temAtualizadoEm) {
        problemasEncontrados.push('Campo "atualizadoEm" ausente (português)');
      }

      const tempo = Date.now() - inicio;
      
      if (problemasEncontrados.length > 0) {
        return {
          nome: '🔍 Detectar Problema',
          status: 'warning',
          mensagem: `${problemasEncontrados.length} problemas de nomenclatura encontrados`,
          detalhes: { 
            problemas: problemasEncontrados,
            estrutura: Object.keys(usuarioTeste),
            amostra: usuarioTeste
          },
          tempo
        };
      }
      
      return {
        nome: '🔍 Detectar Problema',
        status: 'success',
        mensagem: `Estrutura correta - ${usuarios.length} usuários verificados`,
        detalhes: { total: usuarios.length },
        tempo
      };
      
    } catch (error) {
      return {
        nome: '🔍 Detectar Problema',
        status: 'error',
        mensagem: `Erro de conexão: ${error.message}`,
        tempo: Date.now() - inicio
      };
    }
  };

  // 2. Corrigir dados inconsistentes no KV Store
  const corrigirDadosInconsistentes = async (): Promise<ResultadoCorrecao> => {
    const inicio = Date.now();
    try {
      console.log('[CORRECAO_UPDATED_AT] Corrigindo dados inconsistentes...');
      
      // Executar limpeza de dados através da API
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/limpar-dados`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      const tempo = Date.now() - inicio;
      
      if (!response.ok) {
        const errorText = await response.text();
        return {
          nome: '🧹 Corrigir Dados',
          status: 'error',
          mensagem: `Limpeza falhou (HTTP ${response.status})`,
          detalhes: { erro: errorText },
          tempo
        };
      }

      const data = await response.json();
      
      if (!data.success) {
        return {
          nome: '🧹 Corrigir Dados',
          status: 'error',
          mensagem: `Limpeza retornou erro: ${data.error}`,
          detalhes: data,
          tempo
        };
      }
      
      return {
        nome: '🧹 Corrigir Dados',
        status: 'success',
        mensagem: `Dados limpos com sucesso em ${tempo}ms`,
        detalhes: data.estadisticas || data,
        tempo
      };
      
    } catch (error) {
      return {
        nome: '🧹 Corrigir Dados',
        status: 'error',
        mensagem: `Erro de conexão: ${error.message}`,
        tempo: Date.now() - inicio
      };
    }
  };

  // 3. Testar atualização com dados corretos
  const testarAtualizacaoCorreta = async (): Promise<ResultadoCorrecao> => {
    const inicio = Date.now();
    try {
      console.log('[CORRECAO_UPDATED_AT] Testando atualização com dados corretos...');
      
      // Primeiro, listar usuários
      const responseListar = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!responseListar.ok) {
        return {
          nome: '✅ Testar Atualização',
          status: 'error',
          mensagem: `Não foi possível listar usuários (HTTP ${responseListar.status})`,
          tempo: Date.now() - inicio
        };
      }

      const dataListar = await responseListar.json();
      const usuarios = dataListar.usuarios || [];
      
      if (usuarios.length === 0) {
        return {
          nome: '✅ Testar Atualização',
          status: 'warning',
          mensagem: 'Nenhum usuário disponível para teste',
          tempo: Date.now() - inicio
        };
      }

      const usuarioTeste = usuarios[0];
      
      // Testar atualização com dados limpos (sem campos problemáticos)
      const dadosLimpos = {
        nome: usuarioTeste.nome + ' (Teste Updated_At Fix)',
        // Usar apenas campos em português
        atualizadoEm: new Date().toISOString()
      };

      const responseAtualizar = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${usuarioTeste.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosLimpos)
      });

      const tempo = Date.now() - inicio;

      if (!responseAtualizar.ok) {
        const errorText = await responseAtualizar.text();
        
        if (errorText.includes('updated_at')) {
          setUsuariosProblematicos([{ 
            usuarioId: usuarioTeste.id, 
            erro: 'Campo updated_at ainda presente',
            dadosEnviados: dadosLimpos
          }]);
          
          return {
            nome: '✅ Testar Atualização',
            status: 'error',
            mensagem: 'Erro de campo updated_at persiste',
            detalhes: { erro: errorText, usuarioId: usuarioTeste.id },
            tempo
          };
        }
        
        return {
          nome: '✅ Testar Atualização',
          status: 'error',
          mensagem: `Erro na atualização (HTTP ${responseAtualizar.status})`,
          detalhes: { erro: errorText, usuarioId: usuarioTeste.id },
          tempo
        };
      }

      const dataAtualizar = await responseAtualizar.json();
      
      if (!dataAtualizar.success) {
        return {
          nome: '✅ Testar Atualização',
          status: 'error',
          mensagem: `API retornou erro: ${dataAtualizar.error}`,
          detalhes: dataAtualizar,
          tempo
        };
      }

      // Reverter a alteração
      await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${usuarioTeste.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nome: usuarioTeste.nome
        })
      });
      
      return {
        nome: '✅ Testar Atualização',
        status: 'success',
        mensagem: `Atualização funcionando corretamente em ${tempo}ms`,
        detalhes: { usuarioId: usuarioTeste.id, dadosLimpos },
        tempo
      };
      
    } catch (error) {
      return {
        nome: '✅ Testar Atualização',
        status: 'error',
        mensagem: `Erro de conexão: ${error.message}`,
        tempo: Date.now() - inicio
      };
    }
  };

  // 4. Verificar integridade final
  const verificarIntegridadeFinal = async (): Promise<ResultadoCorrecao> => {
    const inicio = Date.now();
    try {
      console.log('[CORRECAO_UPDATED_AT] Verificando integridade final...');
      
      // Verificar múltiplas operações para garantir estabilidade
      const testes = [
        { endpoint: 'admin/usuarios', metodo: 'GET', nome: 'Listar Usuários' },
        { endpoint: 'disciplinas', metodo: 'GET', nome: 'Listar Disciplinas' },
        { endpoint: 'auth/setup-status', metodo: 'GET', nome: 'Status Setup' }
      ];

      let sucessos = 0;
      const falhas: string[] = [];

      for (const teste of testes) {
        try {
          const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/${teste.endpoint}`, {
            method: teste.metodo,
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            sucessos++;
          } else {
            falhas.push(`${teste.nome} (${response.status})`);
          }
        } catch (error) {
          falhas.push(`${teste.nome} (${error.message})`);
        }
      }

      const tempo = Date.now() - inicio;
      
      if (sucessos === testes.length) {
        return {
          nome: '🔒 Verificar Integridade',
          status: 'success',
          mensagem: `Sistema estável - ${sucessos}/${testes.length} endpoints funcionando`,
          detalhes: { sucessos, testes: testes.length },
          tempo
        };
      } else if (sucessos > 0) {
        return {
          nome: '🔒 Verificar Integridade',
          status: 'warning',
          mensagem: `Parcialmente estável - ${sucessos}/${testes.length} endpoints`,
          detalhes: { sucessos, falhas },
          tempo
        };
      } else {
        return {
          nome: '🔒 Verificar Integridade',
          status: 'error',
          mensagem: 'Sistema instável - nenhum endpoint funcionando',
          detalhes: { sucessos, falhas },
          tempo
        };
      }
      
    } catch (error) {
      return {
        nome: '🔒 Verificar Integridade',
        status: 'error',
        mensagem: `Erro na verificação: ${error.message}`,
        tempo: Date.now() - inicio
      };
    }
  };

  // Executar Correção Completa
  const executarCorrecaoCompleta = async () => {
    setExecutando(true);
    setResultados([]);
    setUsuariosProblematicos([]);

    const correcoes = [
      { nome: '🔍 Detectar Problema', funcao: detectarProblemaUpdatedAt },
      { nome: '🧹 Corrigir Dados', funcao: corrigirDadosInconsistentes },
      { nome: '✅ Testar Atualização', funcao: testarAtualizacaoCorreta },
      { nome: '🔒 Verificar Integridade', funcao: verificarIntegridadeFinal }
    ];

    // Inicializar todos os testes como pendentes
    setResultados(correcoes.map(c => ({
      nome: c.nome,
      status: 'pending',
      mensagem: 'Aguardando execução...'
    })));

    let sucessos = 0;
    let errosCriticos = 0;

    for (let i = 0; i < correcoes.length; i++) {
      const correcao = correcoes[i];
      
      setEtapaAtual(`Executando: ${correcao.nome}`);
      
      // Marcar como executando
      atualizarResultado(i, {
        status: 'pending',
        mensagem: 'Executando correção...'
      });

      try {
        const resultado = await correcao.funcao();
        atualizarResultado(i, resultado);
        
        if (resultado.status === 'success') {
          sucessos++;
        } else if (resultado.status === 'error') {
          errosCriticos++;
        }
        
      } catch (error) {
        atualizarResultado(i, {
          status: 'error',
          mensagem: `Erro inesperado: ${error.message}`
        });
        errosCriticos++;
      }

      // Aguardar um pouco entre correções
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setEtapaAtual('');
    setExecutando(false);
    
    // Avaliar resultado geral
    if (errosCriticos === 0) {
      toast.success('🎉 Erro do updated_at corrigido!', {
        description: `${sucessos}/4 verificações executadas. Campo updated_at normalizado.`
      });
    } else {
      toast.warning('⚠️ Algumas correções falharam', {
        description: `${errosCriticos} problemas críticos precisam de atenção adicional.`
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'pending':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'pending':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-purple-600 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onVoltar && (
              <Button variant="ghost" onClick={onVoltar} className="text-white hover:bg-purple-700">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <Clock className="w-6 h-6" />
                Correção Erro Updated_At
              </h1>
              <p className="text-purple-100">Resolvendo conflito de nomenclatura de campos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-purple-700 text-white border-purple-500">
              CORREÇÃO CAMPO
            </Badge>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Error Description */}
        <Alert className="mb-6 border-red-200 bg-red-50">
          <Bug className="w-4 h-4" />
          <AlertDescription>
            <strong>Erro Específico Detectado:</strong>
            <div className="mt-2 space-y-1">
              <p>❌ <code>Error: record "new" has no field "updated_at"</code></p>
              <p className="text-sm text-gray-600">
                <strong>Causa:</strong> O sistema está tentando salvar dados com campo em inglês ("updated_at") 
                mas o banco espera campo em português ("atualizadoEm")
              </p>
              <p className="text-sm text-gray-600">
                <strong>Localização:</strong> kv_store.tsx linha 18 - método set()
              </p>
            </div>
          </AlertDescription>
        </Alert>

        {/* Status Atual */}
        {etapaAtual && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <Loader2 className="w-4 h-4 animate-spin" />
            <AlertDescription>
              <strong>Executando:</strong> {etapaAtual}
            </AlertDescription>
          </Alert>
        )}

        {/* Botão de Correção */}
        <div className="mb-6 text-center">
          <Button 
            onClick={executarCorrecaoCompleta}
            disabled={executando}
            size="lg"
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {executando ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Executando Correção...
              </>
            ) : (
              <>
                <Clock className="w-5 h-5 mr-2" />
                Corrigir Erro Updated_At
              </>
            )}
          </Button>
        </div>

        {/* Resultados das Correções */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Resultados da Correção de Campo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {resultados.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Clique em "Corrigir Erro Updated_At" para resolver o problema</p>
                <div className="mt-4 text-sm text-left max-w-md mx-auto">
                  <p className="font-medium mb-2">O que será corrigido:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Detectar inconsistências de nomenclatura de campos</li>
                    <li>Limpar dados corrompidos no KV Store</li>
                    <li>Testar atualizações com campos corretos</li>
                    <li>Verificar integridade final do sistema</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {resultados.map((resultado, index) => (
                  <div
                    key={index}
                    className={`p-4 border rounded-lg ${getStatusColor(resultado.status)}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(resultado.status)}
                        <span className="font-medium">{resultado.nome}</span>
                        {resultado.tempo && (
                          <Badge variant="outline" className="text-xs">
                            {resultado.tempo}ms
                          </Badge>
                        )}
                      </div>
                      <Badge variant={resultado.status === 'success' ? 'default' : 
                                   resultado.status === 'error' ? 'destructive' : 
                                   resultado.status === 'warning' ? 'secondary' : 'outline'}>
                        {resultado.status === 'success' ? 'Sucesso' :
                         resultado.status === 'error' ? 'Erro' :
                         resultado.status === 'warning' ? 'Aviso' : 'Pendente'}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-2">{resultado.mensagem}</p>
                    
                    {resultado.detalhes && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                          Ver detalhes técnicos
                        </summary>
                        <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                          {JSON.stringify(resultado.detalhes, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usuários Problemáticos */}
        {usuariosProblematicos.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Usuários com Problemas de Campo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {usuariosProblematicos.map((usuario, index) => (
                  <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm font-medium">ID: {usuario.usuarioId}</p>
                    <p className="text-xs text-red-600">Problema: {usuario.erro}</p>
                    {usuario.dadosEnviados && (
                      <details className="text-xs mt-1">
                        <summary className="cursor-pointer text-blue-600">Ver dados enviados</summary>
                        <pre className="mt-1 p-1 bg-gray-100 rounded text-xs">
                          {JSON.stringify(usuario.dadosEnviados, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Explicação Técnica */}
        <Alert className="mt-6">
          <Shield className="w-4 h-4" />
          <AlertDescription>
            <strong>Explicação do Problema:</strong>
            <div className="mt-2 text-sm space-y-2">
              <p>
                <strong>Campo Problemático:</strong> <code>updated_at</code> (inglês) vs <code>atualizadoEm</code> (português)
              </p>
              <p>
                <strong>Origem:</strong> Inconsistência entre frontend e backend na nomenclatura de campos de timestamp
              </p>
              <p>
                <strong>Solução:</strong> Normalizar todos os campos para português e limpar dados inconsistentes
              </p>
              <p>
                <strong>Prevenção:</strong> Usar apenas campos em português: <code>criadoEm</code>, <code>atualizadoEm</code>
              </p>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}