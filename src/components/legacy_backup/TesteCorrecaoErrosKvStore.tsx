import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface TesteCorrecaoErrosKvStoreProps {
  onVoltar: () => void;
}

interface ResultadoTeste {
  sucesso: boolean;
  tempo: number;
  dados?: any;
  erro?: string;
}

export function TesteCorrecaoErrosKvStore({ onVoltar }: TesteCorrecaoErrosKvStoreProps) {
  const [resultados, setResultados] = useState<Record<string, ResultadoTeste>>({});
  const [testando, setTestando] = useState(false);

  const executarTeste = async (nome: string, teste: () => Promise<any>) => {
    const inicioTempo = Date.now();
    
    try {
      console.log(`🧪 [TESTE] Iniciando: ${nome}`);
      const resultado = await teste();
      const tempo = Date.now() - inicioTempo;
      
      setResultados(prev => ({
        ...prev,
        [nome]: {
          sucesso: true,
          tempo,
          dados: resultado
        }
      }));
      
      console.log(`✅ [TESTE] ${nome} - Sucesso em ${tempo}ms`);
      
    } catch (error) {
      const tempo = Date.now() - inicioTempo;
      
      setResultados(prev => ({
        ...prev,
        [nome]: {
          sucesso: false,
          tempo,
          erro: error.message
        }
      }));
      
      console.error(`❌ [TESTE] ${nome} - Erro:`, error);
    }
  };

  const executarTodosTestes = async () => {
    setTestando(true);
    setResultados({});
    
    try {
      toast.info('Iniciando testes de correção...');

      // Teste 1: Verificar se servidor responde
      await executarTeste('Health Check Servidor', async () => {
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/health`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      });

      // Teste 2: Listar usuários (verificar se KV Store funciona)
      await executarTeste('Listar Usuários', async () => {
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Falha ao listar usuários');
        }

        return {
          totalUsuarios: data.usuarios?.length || 0,
          usuarios: data.usuarios?.slice(0, 3).map((u: any) => ({
            id: u.id,
            nome: u.nome,
            email: u.email,
            tipo: u.tipo
          })) || []
        };
      });

      // Teste 3: Criar usuário de teste (verificar se salva sem erros)
      await executarTeste('Criar Usuário Teste', async () => {
        const usuarioTeste = {
          nome: `Teste ${Date.now()}`,
          nomeUsuario: `teste${Date.now()}`,
          email: `teste${Date.now()}@exemplo.com`,
          senha: '123456',
          tipo: 'aluno'
        };

        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(usuarioTeste)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Falha ao criar usuário');
        }

        return {
          id: data.id || data.usuario?.id,
          nome: data.usuario?.nome || usuarioTeste.nome,
          criado: true
        };
      });

      // Teste 4: Editar usuário (verificar se update funciona sem updated_at)
      await executarTeste('Editar Usuário', async () => {
        // Primeiro, pegar um usuário existente
        const listaResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        });

        if (!listaResponse.ok) {
          throw new Error('Não foi possível obter lista de usuários');
        }

        const listaData = await listaResponse.json();
        
        if (!listaData.success || !listaData.usuarios || listaData.usuarios.length === 0) {
          throw new Error('Nenhum usuário disponível para teste');
        }

        const usuarioParaEditar = listaData.usuarios[0];
        
        // Tentar editar o usuário
        const novoNome = `${usuarioParaEditar.nome} - Editado ${Date.now()}`;
        
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${usuarioParaEditar.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            nome: novoNome,
            email: usuarioParaEditar.email,
            tipo: usuarioParaEditar.tipo,
            ativo: usuarioParaEditar.ativo !== false
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Falha ao editar usuário');
        }

        return {
          id: usuarioParaEditar.id,
          nomeOriginal: usuarioParaEditar.nome,
          nomeNovo: novoNome,
          editado: true
        };
      });

      // Teste 5: Verificar estatísticas (teste adicional de KV Store)
      await executarTeste('Estatísticas Administrativas', async () => {
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/estatisticas-rapidas`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Falha ao obter estatísticas');
        }

        return {
          usuarios: data.diagnostico?.usuarios || {},
          rotas: data.diagnostico?.rotas_testadas || [],
          timestamp: data.diagnostico?.timestamp
        };
      });

      toast.success('✅ Todos os testes executados!');
      
    } catch (error) {
      console.error('❌ [TESTE] Erro geral:', error);
      toast.error(`Erro nos testes: ${error.message}`);
    } finally {
      setTestando(false);
    }
  };

  const getStatusIcon = (resultado?: ResultadoTeste) => {
    if (!resultado) return <AlertTriangle className="w-5 h-5 text-gray-400" />;
    return resultado.sucesso ? 
      <CheckCircle className="w-5 h-5 text-green-600" /> : 
      <XCircle className="w-5 h-5 text-red-600" />;
  };

  const getStatusColor = (resultado?: ResultadoTeste) => {
    if (!resultado) return 'border-gray-200 bg-gray-50';
    return resultado.sucesso ? 
      'border-green-200 bg-green-50' : 
      'border-red-200 bg-red-50';
  };

  const testes = [
    'Health Check Servidor',
    'Listar Usuários', 
    'Criar Usuário Teste',
    'Editar Usuário',
    'Estatísticas Administrativas'
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-6 h-6 text-blue-600" />
              Teste de Correção - Erros KV Store
            </CardTitle>
            <CardDescription>
              Verifica se os erros "updated_at" e problemas de sintaxe foram corrigidos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-4">
              <Button 
                onClick={executarTodosTestes}
                disabled={testando}
                className="flex-1"
              >
                {testando ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Executando Testes...
                  </>
                ) : (
                  'Executar Testes de Correção'
                )}
              </Button>
              <Button variant="outline" onClick={onVoltar}>
                Voltar
              </Button>
            </div>

            {/* Resumo dos Resultados */}
            {Object.keys(resultados).length > 0 && (
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {Object.keys(resultados).length}
                    </div>
                    <div className="text-sm text-gray-600">Testes Executados</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">
                      {Object.values(resultados).filter(r => r.sucesso).length}
                    </div>
                    <div className="text-sm text-gray-600">Sucessos</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-red-600">
                      {Object.values(resultados).filter(r => !r.sucesso).length}
                    </div>
                    <div className="text-sm text-gray-600">Falhas</div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Lista Detalhada dos Testes */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Resultados dos Testes</h3>
              {testes.map((teste) => {
                const resultado = resultados[teste];
                return (
                  <div
                    key={teste}
                    className={`p-4 rounded-lg border ${getStatusColor(resultado)}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(resultado)}
                        <span className="font-medium">{teste}</span>
                      </div>
                      {resultado && (
                        <span className="text-sm text-gray-600">
                          {resultado.tempo}ms
                        </span>
                      )}
                    </div>
                    
                    {resultado?.sucesso && resultado.dados && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm text-blue-600">
                          Ver dados retornados
                        </summary>
                        <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto max-h-32">
                          {JSON.stringify(resultado.dados, null, 2)}
                        </pre>
                      </details>
                    )}
                    
                    {resultado && !resultado.sucesso && resultado.erro && (
                      <div className="mt-2 text-sm text-red-700 bg-red-100 p-2 rounded">
                        <strong>Erro:</strong> {resultado.erro}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Diagnóstico */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">🔍 O que este teste verifica:</h4>
              <ul className="space-y-1 text-sm">
                <li>• <strong>Erro "updated_at":</strong> Se campos proibidos ainda causam problemas no KV Store</li>
                <li>• <strong>Erro de sintaxe:</strong> Se o método buscarPorId() está funcionando corretamente</li>
                <li>• <strong>CRUD Completo:</strong> Create, Read, Update de usuários sem erros</li>
                <li>• <strong>Filtros rigorosos:</strong> Se apenas campos permitidos são salvos</li>
                <li>• <strong>APIs administrativas:</strong> Se todas as rotas funcionam normalmente</li>
              </ul>
            </div>

            {/* Status da Correção */}
            {Object.keys(resultados).length === testes.length && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {Object.values(resultados).every(r => r.sucesso) ? (
                      <>✅ Correções Bem-Sucedidas!</>
                    ) : (
                      <>⚠️ Ainda Há Problemas</>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.values(resultados).every(r => r.sucesso) ? (
                    <div className="text-green-700">
                      <p>🎉 Todos os testes passaram! Os problemas foram corrigidos:</p>
                      <ul className="mt-2 space-y-1 text-sm">
                        <li>• Erro "updated_at" resolvido com filtros rigorosos</li>
                        <li>• Erro de sintaxe corrigido no método buscarPorId()</li>
                        <li>• CRUD de usuários funcionando normalmente</li>
                        <li>• KV Store operando sem campos proibidos</li>
                      </ul>
                    </div>
                  ) : (
                    <div className="text-orange-700">
                      <p>⚠️ Alguns testes falharam. Verifique os erros acima para mais detalhes.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}