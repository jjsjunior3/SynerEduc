import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface TesteRotasCorrigidasProps {
  onVoltar: () => void;
}

export function TesteRotasCorrigidas({ onVoltar }: TesteRotasCorrigidasProps) {
  const [testando, setTestando] = useState(false);
  const [resultados, setResultados] = useState<Record<string, any>>({});

  const testes = [
    {
      id: 'signup',
      nome: 'POST /auth/signup',
      metodo: 'POST',
      endpoint: '/auth/signup',
      dados: {
        nome: 'Teste Usuário',
        email: 'teste@temp.local',
        senha: 'teste123',
        tipo: 'aluno',
        serie: '1ª série - Ensino Médio'
      }
    },
    {
      id: 'conteudo-serie',
      nome: 'GET /conteudo-pdf/serie/:serie',
      metodo: 'GET',
      endpoint: '/conteudo-pdf/serie/1ª série - Ensino Médio',
      dados: null
    },
    {
      id: 'notas-usuario',
      nome: 'GET /notas/usuario/:userId',
      metodo: 'GET',
      endpoint: '/notas/usuario/teste123',
      dados: null
    },
    {
      id: 'comunicados',
      nome: 'GET /comunicados',
      metodo: 'GET',
      endpoint: '/comunicados',
      dados: null
    }
  ];

  const executarTeste = async (teste: any) => {
    console.log(`[TESTE_ROTAS] Testando ${teste.nome}...`);
    
    try {
      const opcoes: RequestInit = {
        method: teste.metodo,
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      };

      if (teste.dados && teste.metodo === 'POST') {
        opcoes.body = JSON.stringify(teste.dados);
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0${teste.endpoint}`, opcoes);
      
      const dados = await response.json();
      
      const resultado = {
        sucesso: response.ok,
        status: response.status,
        dados: dados,
        tempo: Date.now()
      };

      // Se foi um signup bem-sucedido, tentar limpar o usuário
      if (teste.id === 'signup' && dados.success && dados.usuario?.id) {
        try {
          await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${dados.usuario.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            }
          });
          resultado.dados.usuarioLimpeza = 'Usuário de teste removido com sucesso';
        } catch (error) {
          resultado.dados.usuarioLimpeza = 'Não foi possível remover usuário de teste';
        }
      }

      return resultado;
    } catch (error) {
      console.error(`[TESTE_ROTAS] Erro no teste ${teste.nome}:`, error);
      return {
        sucesso: false,
        status: 0,
        dados: { error: error.message },
        tempo: Date.now()
      };
    }
  };

  const executarTodosTestes = async () => {
    setTestando(true);
    setResultados({});

    console.log('[TESTE_ROTAS] Iniciando testes das rotas corrigidas...');

    for (const teste of testes) {
      try {
        const resultado = await executarTeste(teste);
        setResultados(prev => ({
          ...prev,
          [teste.id]: resultado
        }));
        
        // Aguardar um pouco entre testes
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`[TESTE_ROTAS] Erro no teste ${teste.id}:`, error);
        setResultados(prev => ({
          ...prev,
          [teste.id]: {
            sucesso: false,
            status: 0,
            dados: { error: error.message },
            tempo: Date.now()
          }
        }));
      }
    }

    setTestando(false);
    console.log('[TESTE_ROTAS] Todos os testes concluídos!');
  };

  const getStatusBadge = (resultado: any) => {
    if (!resultado) return <Badge variant="secondary">Aguardando</Badge>;
    
    if (resultado.sucesso) {
      return <Badge variant="default" className="bg-green-600">✅ Sucesso ({resultado.status})</Badge>;
    } else {
      return <Badge variant="destructive">❌ Falha ({resultado.status})</Badge>;
    }
  };

  const totalTestes = testes.length;
  const testesExecutados = Object.keys(resultados).length;
  const testesSucesso = Object.values(resultados).filter((r: any) => r?.sucesso).length;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button onClick={onVoltar} variant="outline" className="mb-4">
            ← Voltar
          </Button>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">🔧 Teste das Rotas Corrigidas</CardTitle>
              <CardDescription>
                Verificando se as rotas que estavam com erro 404 foram implementadas corretamente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-4 text-sm">
                  <span>📊 Total: {totalTestes}</span>
                  <span>⏳ Executados: {testesExecutados}</span>
                  <span>✅ Sucessos: {testesSucesso}</span>
                  <span>❌ Falhas: {testesExecutados - testesSucesso}</span>
                </div>
                
                <Button 
                  onClick={executarTodosTestes} 
                  disabled={testando}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {testando ? '🔄 Testando...' : '🚀 Executar Testes'}
                </Button>
              </div>

              {testesExecutados > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${(testesExecutados / totalTestes) * 100}%` }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {testes.map(teste => {
            const resultado = resultados[teste.id];
            
            return (
              <Card key={teste.id} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{teste.nome}</CardTitle>
                      <CardDescription className="text-sm">
                        {teste.metodo} {teste.endpoint}
                      </CardDescription>
                    </div>
                    {getStatusBadge(resultado)}
                  </div>
                </CardHeader>
                
                {resultado && (
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Status HTTP:</span> {resultado.status}
                        </div>
                        <div>
                          <span className="font-medium">Tempo:</span> {new Date(resultado.tempo).toLocaleTimeString()}
                        </div>
                      </div>

                      {resultado.sucesso && resultado.dados && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <h4 className="font-medium text-green-800 mb-2">✅ Resposta de Sucesso:</h4>
                          <div className="text-sm text-green-700">
                            {resultado.dados.success !== undefined && (
                              <div>• Success: {resultado.dados.success ? 'true' : 'false'}</div>
                            )}
                            {resultado.dados.message && (
                              <div>• Message: {resultado.dados.message}</div>
                            )}
                            {resultado.dados.total !== undefined && (
                              <div>• Total de itens: {resultado.dados.total}</div>
                            )}
                            {resultado.dados.usuario && (
                              <div>• Usuário criado: {resultado.dados.usuario.nome} (ID: {resultado.dados.usuario.id})</div>
                            )}
                            {resultado.dados.usuarioLimpeza && (
                              <div>• Limpeza: {resultado.dados.usuarioLimpeza}</div>
                            )}
                          </div>
                        </div>
                      )}

                      {!resultado.sucesso && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <h4 className="font-medium text-red-800 mb-2">❌ Erro:</h4>
                          <div className="text-sm text-red-700">
                            {resultado.dados?.error || resultado.dados?.message || 'Erro desconhecido'}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {testesExecutados === totalTestes && (
          <Card className="mt-6 border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-green-600 mb-2">
                  🎉 Testes Concluídos!
                </h3>
                <p className="text-gray-600 mb-4">
                  {testesSucesso === totalTestes 
                    ? '✅ Todas as rotas foram implementadas com sucesso!'
                    : `⚠️ ${testesSucesso}/${totalTestes} rotas funcionando. Algumas ainda precisam de ajustes.`
                  }
                </p>
                
                {testesSucesso === totalTestes && (
                  <div className="bg-green-100 border border-green-300 rounded-lg p-4 text-left">
                    <h4 className="font-semibold text-green-800 mb-2">🚀 CORREÇÃO APLICADA COM SUCESSO:</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• ✅ Rota POST /auth/signup implementada</li>
                      <li>• ✅ Rotas de conteúdo PDF implementadas</li>
                      <li>• ✅ Rotas de notas implementadas</li>
                      <li>• ✅ Rotas de comunicados implementadas</li>
                      <li>• ✅ Todas as rotas respondem adequadamente</li>
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}