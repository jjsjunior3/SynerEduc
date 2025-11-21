import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle, Microscope } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface TesteUltraDetalhadoUpdatedAtProps {
  onVoltar: () => void;
}

export function TesteUltraDetalhadoUpdatedAt({ onVoltar }: TesteUltraDetalhadoUpdatedAtProps) {
  const [carregando, setCarregando] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [statusTeste, setStatusTeste] = useState<'pendente' | 'executando' | 'sucesso' | 'erro'>('pendente');
  const [dadosEnviados, setDadosEnviados] = useState<any>(null);
  const [respostaServidor, setRespostaServidor] = useState<any>(null);

  const adicionarLog = (mensagem: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `${timestamp}: ${mensagem}`]);
    console.log(`[TESTE_ULTRA_DETALHADO] ${timestamp}: ${mensagem}`);
  };

  const testeUltraDetalhado = async () => {
    setCarregando(true);
    setStatusTeste('executando');
    setLogs([]);
    setDadosEnviados(null);
    setRespostaServidor(null);
    
    try {
      adicionarLog('🔬 INICIANDO TESTE ULTRA-DETALHADO DO ERRO UPDATED_AT');
      adicionarLog('🎯 Objetivo: Capturar exatamente onde e como o erro ocorre');

      // 1. Buscar usuário Erika
      adicionarLog('1️⃣ Buscando usuário Erika...');
      const getResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!getResponse.ok) {
        throw new Error(`Erro ao buscar usuários: ${getResponse.status}`);
      }

      const dadosUsuarios = await getResponse.json();
      const usuarioErika = dadosUsuarios.usuarios?.find((u: any) => 
        u.nome && u.nome.toLowerCase().includes('erika')
      );

      if (!usuarioErika) {
        throw new Error('Usuário Erika não encontrado');
      }

      adicionarLog(`✅ Erika encontrada: ${usuarioErika.nome}`);
      adicionarLog(`📋 Estado atual: ${JSON.stringify(usuarioErika, null, 2)}`);

      // 2. Preparar dados com máxima simplicidade
      adicionarLog('2️⃣ Preparando dados com máxima simplicidade...');
      
      // TESTE 1: Apenas nome
      const dadosMinimos = {
        nome: usuarioErika.nome
      };
      
      adicionarLog('📝 TESTE 1: Enviando apenas o nome');
      adicionarLog(`📤 Dados enviados: ${JSON.stringify(dadosMinimos, null, 2)}`);
      setDadosEnviados(dadosMinimos);

      const teste1Response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${usuarioErika.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosMinimos)
      });

      adicionarLog(`📊 Status TESTE 1: ${teste1Response.status}`);

      if (!teste1Response.ok) {
        const errorText = await teste1Response.text();
        adicionarLog(`❌ TESTE 1 FALHOU: ${errorText}`);
        
        if (errorText.includes('updated_at')) {
          adicionarLog('🚨 CONFIRMED: Erro updated_at ocorre mesmo com dados mínimos!');
          adicionarLog('💡 Isso indica problema no servidor, não nos dados enviados');
        }
        
        setRespostaServidor({ status: teste1Response.status, error: errorText });
      } else {
        const resultado1 = await teste1Response.json();
        adicionarLog('✅ TESTE 1 PASSOU! Apenas nome funcionou');
        adicionarLog(`📥 Resposta: ${JSON.stringify(resultado1, null, 2)}`);
        setRespostaServidor(resultado1);
        
        // TESTE 2: Nome + tipo
        adicionarLog('3️⃣ TESTE 2: Nome + tipo');
        const dadosBasicos = {
          nome: usuarioErika.nome,
          tipo: 'professor'
        };
        
        adicionarLog(`📤 TESTE 2 Dados: ${JSON.stringify(dadosBasicos, null, 2)}`);
        
        const teste2Response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${usuarioErika.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(dadosBasicos)
        });

        if (!teste2Response.ok) {
          const errorText2 = await teste2Response.text();
          adicionarLog(`❌ TESTE 2 FALHOU: ${errorText2}`);
        } else {
          adicionarLog('✅ TESTE 2 PASSOU! Nome + tipo funcionou');
          
          // TESTE 3: Adicionar disciplinas
          adicionarLog('4️⃣ TESTE 3: Nome + tipo + disciplinas');
          const dadosComDisciplinas = {
            nome: usuarioErika.nome,
            tipo: 'professor',
            disciplinas: ['Português']
          };
          
          adicionarLog(`📤 TESTE 3 Dados: ${JSON.stringify(dadosComDisciplinas, null, 2)}`);
          
          const teste3Response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${usuarioErika.id}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(dadosComDisciplinas)
          });

          if (!teste3Response.ok) {
            const errorText3 = await teste3Response.text();
            adicionarLog(`❌ TESTE 3 FALHOU: ${errorText3}`);
            
            if (errorText3.includes('updated_at')) {
              adicionarLog('🚨 Erro aparece quando adicionamos disciplinas!');
              adicionarLog('💡 O problema pode estar no processamento de arrays');
            }
          } else {
            adicionarLog('✅ TESTE 3 PASSOU! Disciplinas funcionaram');
            
            // TESTE 4: Adicionar séries
            adicionarLog('5️⃣ TESTE 4: Dados completos com séries');
            const dadosCompletos = {
              nome: usuarioErika.nome,
              tipo: 'professor',
              disciplinas: ['Português'],
              series: ['6º ano - Ensino Fundamental', '7º ano - Ensino Fundamental']
            };
            
            adicionarLog(`📤 TESTE 4 Dados: ${JSON.stringify(dadosCompletos, null, 2)}`);
            
            const teste4Response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${usuarioErika.id}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(dadosCompletos)
            });

            if (!teste4Response.ok) {
              const errorText4 = await teste4Response.text();
              adicionarLog(`❌ TESTE 4 FALHOU: ${errorText4}`);
              
              if (errorText4.includes('updated_at')) {
                adicionarLog('🚨 Erro aparece com dados completos!');
                adicionarLog('💡 O problema está no servidor ao processar múltiplos campos');
              }
            } else {
              adicionarLog('✅ TESTE 4 PASSOU! Todos os dados funcionaram!');
              adicionarLog('🎉 ERRO UPDATED_AT FOI RESOLVIDO!');
              setStatusTeste('sucesso');
              toast.success('Teste passou! Erro updated_at foi corrigido!');
              return;
            }
          }
        }
      }

      // Se chegou aqui, houve erro
      setStatusTeste('erro');
      adicionarLog('❌ TESTE CONCLUÍDO COM ERROS');
      adicionarLog('📋 RESUMO: O erro updated_at ainda está presente no servidor');
      
    } catch (error) {
      console.error('[TESTE_ULTRA_DETALHADO] Erro:', error);
      adicionarLog(`❌ ERRO CRÍTICO NO TESTE: ${error.message}`);
      setStatusTeste('erro');
      toast.error(`Teste falhou: ${error.message}`);
    } finally {
      setCarregando(false);
    }
  };

  const obterCorStatus = () => {
    switch (statusTeste) {
      case 'sucesso': return 'text-green-600';
      case 'erro': return 'text-red-600';
      case 'executando': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const obterIconeStatus = () => {
    switch (statusTeste) {
      case 'sucesso': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'erro': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'executando': return <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
      default: return <Microscope className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onVoltar}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-red-600">🔬 Teste Ultra-Detalhado - Erro Updated_At</h1>
              <p className="text-sm text-gray-600">Análise microscópica do problema para identificar a causa raiz</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={statusTeste === 'sucesso' ? 'default' : statusTeste === 'erro' ? 'destructive' : 'secondary'}
              className="flex items-center gap-1"
            >
              {obterIconeStatus()}
              {statusTeste === 'sucesso' ? 'RESOLVIDO' : 
               statusTeste === 'erro' ? 'ERRO ATIVO' :
               statusTeste === 'executando' ? 'ANALISANDO' : 'PENDENTE'}
            </Badge>
            <Button 
              onClick={testeUltraDetalhado} 
              disabled={carregando}
              className="bg-red-600 hover:bg-red-700"
            >
              {carregando ? '🔬 Analisando...' : '🚀 Executar Análise'}
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Log Detalhado */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Microscope className="w-5 h-5" />
                Log de Análise Microscópica
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 text-gray-100 p-3 rounded font-mono text-xs max-h-96 overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-gray-400">Aguardando execução da análise...</p>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Dados da Requisição */}
          <Card>
            <CardHeader>
              <CardTitle>📤 Dados Enviados</CardTitle>
            </CardHeader>
            <CardContent>
              {dadosEnviados ? (
                <div className="bg-blue-50 p-3 rounded">
                  <pre className="text-xs text-blue-800 overflow-x-auto">
                    {JSON.stringify(dadosEnviados, null, 2)}
                  </pre>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Nenhum dado enviado ainda</p>
              )}
            </CardContent>
          </Card>

          {/* Resposta do Servidor */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>📥 Resposta do Servidor</CardTitle>
            </CardHeader>
            <CardContent>
              {respostaServidor ? (
                <div className={`p-3 rounded ${respostaServidor.error ? 'bg-red-50' : 'bg-green-50'}`}>
                  <pre className={`text-xs overflow-x-auto ${respostaServidor.error ? 'text-red-800' : 'text-green-800'}`}>
                    {typeof respostaServidor === 'string' ? respostaServidor : JSON.stringify(respostaServidor, null, 2)}
                  </pre>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Nenhuma resposta recebida ainda</p>
              )}
            </CardContent>
          </Card>

          {/* Estratégia de Teste */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>🧪 Estratégia de Teste</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-3 rounded">
                  <h4 className="font-medium text-blue-800 mb-2">TESTE 1</h4>
                  <p className="text-blue-700 text-sm">Apenas campo 'nome'</p>
                  <p className="text-blue-600 text-xs mt-1">Dados mínimos possíveis</p>
                </div>
                
                <div className="bg-green-50 p-3 rounded">
                  <h4 className="font-medium text-green-800 mb-2">TESTE 2</h4>
                  <p className="text-green-700 text-sm">Nome + tipo</p>
                  <p className="text-green-600 text-xs mt-1">Campos básicos</p>
                </div>
                
                <div className="bg-yellow-50 p-3 rounded">
                  <h4 className="font-medium text-yellow-800 mb-2">TESTE 3</h4>
                  <p className="text-yellow-700 text-sm">+ disciplinas</p>
                  <p className="text-yellow-600 text-xs mt-1">Testar arrays simples</p>
                </div>
                
                <div className="bg-purple-50 p-3 rounded">
                  <h4 className="font-medium text-purple-800 mb-2">TESTE 4</h4>
                  <p className="text-purple-700 text-sm">+ séries</p>
                  <p className="text-purple-600 text-xs mt-1">Dados completos</p>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded">
                <h4 className="font-medium text-gray-800 mb-2">🎯 Objetivo da Análise</h4>
                <p className="text-gray-700 text-sm">
                  Identificar exatamente em qual ponto o erro "updated_at" ocorre, 
                  permitindo uma correção cirúrgica do problema.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}