import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { AlertCircle, CheckCircle, XCircle, Search, User } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface DiagnosticoUsuarioNaoEncontradoProps {
  onVoltar: () => void;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo: string;
  ativo: boolean;
  [key: string]: any;
}

export function DiagnosticoUsuarioNaoEncontrado({ onVoltar }: DiagnosticoUsuarioNaoEncontradoProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuarioTeste, setUsuarioTeste] = useState<Usuario | null>(null);
  const [diagnostico, setDiagnostico] = useState<any>(null);
  const [testando, setTestando] = useState(false);

  const executarDiagnostico = async () => {
    setTestando(true);
    setDiagnostico(null);
    
    try {
      console.log('🔍 [DIAGNOSTICO] Iniciando diagnóstico de usuários...');
      
      const resultado: any = {
        timestamp: new Date().toISOString(),
        etapas: {}
      };

      // Etapa 1: Listar usuários da API
      console.log('📋 [DIAGNOSTICO] Etapa 1: Listando usuários...');
      try {
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('📋 [DIAGNOSTICO] Dados brutos da API:', data);
          
          let usuariosArray = [];
          if (data.success && data.usuarios && Array.isArray(data.usuarios)) {
            usuariosArray = data.usuarios;
          } else if (Array.isArray(data)) {
            usuariosArray = data;
          } else {
            console.warn('📋 [DIAGNOSTICO] Formato inesperado:', data);
          }

          console.log('📋 [DIAGNOSTICO] Usuários encontrados:', usuariosArray.length);
          
          // Analisar estrutura dos usuários
          const analiseUsuarios = usuariosArray.map((u: any) => ({
            dadosOriginais: u,
            temId: !!u.id,
            temUserId: !!u.user_id,
            idValue: u.id,
            userIdValue: u.user_id,
            tipoId: typeof u.id,
            tipoUserId: typeof u.user_id,
            chaves: Object.keys(u)
          }));

          resultado.etapas.listarUsuarios = {
            sucesso: true,
            totalUsuarios: usuariosArray.length,
            analiseUsuarios,
            dadosCompletos: data
          };

          setUsuarios(usuariosArray);
          
          // Selecionar primeiro usuário para teste
          if (usuariosArray.length > 0) {
            setUsuarioTeste(usuariosArray[0]);
          }
          
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        console.error('📋 [DIAGNOSTICO] Erro ao listar usuários:', error);
        resultado.etapas.listarUsuarios = {
          sucesso: false,
          erro: error.message
        };
      }

      // Etapa 2: Testar edição com primeiro usuário (se disponível)
      if (usuarios.length > 0) {
        const usuarioParaTeste = usuarios[0];
        console.log('✏️ [DIAGNOSTICO] Etapa 2: Testando edição do usuário:', usuarioParaTeste);
        
        try {
          const dadosEdicao = {
            nome: usuarioParaTeste.nome,
            email: usuarioParaTeste.email,
            tipo: usuarioParaTeste.tipo,
            ativo: usuarioParaTeste.ativo !== false
          };

          console.log('✏️ [DIAGNOSTICO] ID usado para edição:', usuarioParaTeste.id);
          console.log('✏️ [DIAGNOSTICO] URL da requisição:', `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${usuarioParaTeste.id}`);
          console.log('✏️ [DIAGNOSTICO] Dados enviados:', dadosEdicao);

          const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${usuarioParaTeste.id}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(dadosEdicao)
          });

          const responseText = await response.text();
          console.log('✏️ [DIAGNOSTICO] Resposta da edição:', {
            status: response.status,
            ok: response.ok,
            body: responseText
          });

          if (response.ok) {
            const responseData = JSON.parse(responseText);
            resultado.etapas.testarEdicao = {
              sucesso: true,
              status: response.status,
              resposta: responseData
            };
          } else {
            resultado.etapas.testarEdicao = {
              sucesso: false,
              status: response.status,
              erro: responseText,
              idUsado: usuarioParaTeste.id,
              tipoId: typeof usuarioParaTeste.id
            };
          }
        } catch (error) {
          console.error('✏️ [DIAGNOSTICO] Erro ao testar edição:', error);
          resultado.etapas.testarEdicao = {
            sucesso: false,
            erro: error.message
          };
        }
      }

      // Etapa 3: Verificar consistência de IDs
      console.log('🔗 [DIAGNOSTICO] Etapa 3: Verificando consistência de IDs...');
      const problemasIds = usuarios.filter(u => {
        return !u.id || typeof u.id !== 'string' || u.id.includes('Math.random') || u.id.length < 10;
      });

      resultado.etapas.verificarIds = {
        totalUsuarios: usuarios.length,
        usuariosComProblemas: problemasIds.length,
        problemasEncontrados: problemasIds.map(u => ({
          nome: u.nome,
          email: u.email,
          id: u.id,
          tipoId: typeof u.id,
          problemas: [
            !u.id && 'ID ausente',
            typeof u.id !== 'string' && 'ID não é string',
            u.id && u.id.includes && u.id.includes('Math.random') && 'ID gerado aleatoriamente',
            u.id && u.id.length < 10 && 'ID muito curto'
          ].filter(Boolean)
        }))
      };

      setDiagnostico(resultado);
      console.log('🎯 [DIAGNOSTICO] Diagnóstico completo:', resultado);

    } catch (error) {
      console.error('❌ [DIAGNOSTICO] Erro geral:', error);
      toast.error(`Erro no diagnóstico: ${error.message}`);
    } finally {
      setTestando(false);
    }
  };

  const corrigirProblemas = async () => {
    if (!diagnostico?.etapas?.verificarIds?.usuariosComProblemas) {
      toast.error('Nenhum problema detectado para corrigir');
      return;
    }

    toast.info('Esta funcionalidade detecta os problemas. A correção deve ser feita no código.');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-6 h-6 text-blue-600" />
              Diagnóstico: Usuário Não Encontrado
            </CardTitle>
            <CardDescription>
              Investigando o erro "Usuário não encontrado" no gerenciador de usuários
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-4">
              <Button 
                onClick={executarDiagnostico}
                disabled={testando}
                className="flex-1"
              >
                {testando ? 'Executando Diagnóstico...' : 'Executar Diagnóstico'}
              </Button>
              <Button variant="outline" onClick={onVoltar}>
                Voltar
              </Button>
            </div>

            {usuarios.length > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">👥 Usuários Encontrados: {usuarios.length}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                  {usuarios.slice(0, 6).map((usuario, index) => (
                    <div key={index} className="bg-white p-2 rounded border">
                      <div className="font-medium">{usuario.nome}</div>
                      <div className="text-gray-600 text-xs">ID: {usuario.id || 'AUSENTE'}</div>
                      <div className="text-gray-600 text-xs">{usuario.email}</div>
                    </div>
                  ))}
                  {usuarios.length > 6 && (
                    <div className="bg-gray-200 p-2 rounded border text-center text-gray-600">
                      +{usuarios.length - 6} mais...
                    </div>
                  )}
                </div>
              </div>
            )}

            {diagnostico && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">📊 Resultado do Diagnóstico</h3>
                
                {/* Etapa 1: Listar Usuários */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      {diagnostico.etapas.listarUsuarios?.sucesso ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      Etapa 1: Listar Usuários
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {diagnostico.etapas.listarUsuarios?.sucesso ? (
                      <div className="space-y-2">
                        <div>✅ Total de usuários: {diagnostico.etapas.listarUsuarios.totalUsuarios}</div>
                        <details className="text-sm">
                          <summary className="cursor-pointer text-blue-600">Ver análise detalhada</summary>
                          <pre className="mt-2 bg-gray-100 p-2 rounded text-xs overflow-auto max-h-32">
                            {JSON.stringify(diagnostico.etapas.listarUsuarios.analiseUsuarios.slice(0, 3), null, 2)}
                          </pre>
                        </details>
                      </div>
                    ) : (
                      <div className="text-red-600">
                        ❌ Erro: {diagnostico.etapas.listarUsuarios?.erro}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Etapa 2: Testar Edição */}
                {diagnostico.etapas.testarEdicao && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        {diagnostico.etapas.testarEdicao?.sucesso ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        Etapa 2: Testar Edição
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {diagnostico.etapas.testarEdicao?.sucesso ? (
                        <div>✅ Edição funcionou corretamente</div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-red-600">
                            ❌ Status: {diagnostico.etapas.testarEdicao.status}
                          </div>
                          <div className="text-sm">
                            <strong>ID usado:</strong> {diagnostico.etapas.testarEdicao.idUsado} 
                            ({diagnostico.etapas.testarEdicao.tipoId})
                          </div>
                          <div className="text-sm bg-red-50 p-2 rounded">
                            <strong>Erro:</strong> {diagnostico.etapas.testarEdicao.erro}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Etapa 3: Verificar IDs */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      {diagnostico.etapas.verificarIds?.usuariosComProblemas === 0 ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-orange-600" />
                      )}
                      Etapa 3: Verificar Consistência de IDs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        📊 Usuários com problemas: {diagnostico.etapas.verificarIds?.usuariosComProblemas || 0} 
                        / {diagnostico.etapas.verificarIds?.totalUsuarios || 0}
                      </div>
                      
                      {diagnostico.etapas.verificarIds?.problemasEncontrados?.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-semibold text-orange-700">⚠️ Problemas encontrados:</h4>
                          {diagnostico.etapas.verificarIds.problemasEncontrados.map((problema: any, index: number) => (
                            <div key={index} className="bg-orange-50 p-2 rounded text-sm">
                              <div><strong>{problema.nome}</strong> ({problema.email})</div>
                              <div>ID: {problema.id} ({problema.tipoId})</div>
                              <div className="text-orange-700">
                                Problemas: {problema.problemas.join(', ')}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Recomendações */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">💡 Recomendações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {diagnostico.etapas.verificarIds?.usuariosComProblemas > 0 ? (
                        <>
                          <div className="text-orange-700">
                            ⚠️ <strong>Problema identificado:</strong> Usuários com IDs inválidos ou gerados aleatoriamente
                          </div>
                          <div>
                            🔧 <strong>Solução:</strong> Remover a linha que gera IDs aleatórios no GerenciadorUsuarios.tsx:
                          </div>
                          <code className="block bg-gray-100 p-2 rounded">
                            id: u.id || u.user_id || Math.random().toString() // ← REMOVER Math.random()
                          </code>
                          <div>
                            ✅ <strong>Alterar para:</strong>
                          </div>
                          <code className="block bg-green-100 p-2 rounded">
                            id: u.id || u.user_id // Se não tiver ID, não incluir o usuário
                          </code>
                        </>
                      ) : (
                        <div className="text-green-700">
                          ✅ Nenhum problema de ID detectado. O problema pode estar em outro lugar.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}