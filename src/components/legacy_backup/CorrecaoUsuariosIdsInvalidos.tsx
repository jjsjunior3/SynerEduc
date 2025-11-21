import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { AlertTriangle, CheckCircle, XCircle, Trash2, RefreshCw } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface CorrecaoUsuariosIdsInvalidosProps {
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

export function CorrecaoUsuariosIdsInvalidos({ onVoltar }: CorrecaoUsuariosIdsInvalidosProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuariosProblematicos, setUsuariosProblematicos] = useState<any[]>([]);
  const [corrigindo, setCorrigindo] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  const analisarUsuarios = async () => {
    try {
      toast.info('Analisando usuários...');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📊 [ANALISE] Dados recebidos:', data);
      
      let usuariosArray = [];
      if (data.success && data.usuarios && Array.isArray(data.usuarios)) {
        usuariosArray = data.usuarios;
      } else if (Array.isArray(data)) {
        usuariosArray = data;
      }

      console.log('📊 [ANALISE] Total de usuários:', usuariosArray.length);

      // Identificar usuários problemáticos
      const problematicos = usuariosArray.filter((u: any) => {
        const temProblema = !u.id || 
                          typeof u.id !== 'string' || 
                          u.id.length < 10 ||
                          u.id.includes('0.') || // IDs do Math.random
                          u.id.startsWith('0.') ||
                          isNaN(parseFloat(u.id)); // Se é um número (do Math.random)

        if (temProblema) {
          console.warn('⚠️ [ANALISE] Usuário problemático:', {
            nome: u.nome,
            email: u.email,
            id: u.id,
            tipoId: typeof u.id,
            comprimento: u.id?.length
          });
        }

        return temProblema;
      });

      // Usuários válidos
      const validos = usuariosArray.filter((u: any) => {
        return u.id && 
               typeof u.id === 'string' && 
               u.id.length >= 10 &&
               !u.id.includes('0.') &&
               !u.id.startsWith('0.') &&
               isNaN(parseFloat(u.id));
      });

      console.log('📊 [ANALISE] Usuários válidos:', validos.length);
      console.log('📊 [ANALISE] Usuários problemáticos:', problematicos.length);

      setUsuarios(validos);
      setUsuariosProblematicos(problematicos);

      if (problematicos.length === 0) {
        toast.success('✅ Nenhum usuário com ID inválido encontrado!');
      } else {
        toast.warning(`⚠️ Encontrados ${problematicos.length} usuários com IDs inválidos`);
      }

    } catch (error) {
      console.error('❌ [ANALISE] Erro:', error);
      toast.error(`Erro na análise: ${error.message}`);
    }
  };

  const corrigirProblemas = async () => {
    if (usuariosProblematicos.length === 0) {
      toast.info('Nenhum problema para corrigir');
      return;
    }

    setCorrigindo(true);
    const resultadoCorrecao: any = {
      inicio: new Date().toISOString(),
      usuariosAnalisados: usuariosProblematicos.length,
      acoes: [],
      erros: []
    };

    try {
      toast.info(`Iniciando correção de ${usuariosProblematicos.length} usuários...`);

      for (const usuario of usuariosProblematicos) {
        try {
          console.log(`🔧 [CORRECAO] Processando usuário: ${usuario.nome} (${usuario.email})`);
          
          // Estratégia: Tentar recriar o usuário com um novo ID válido
          if (usuario.nome && usuario.email) {
            
            // Primeiro, tentar criar o usuário novamente com dados limpos
            const dadosLimpos = {
              nome: usuario.nome,
              nomeUsuario: usuario.nomeUsuario || usuario.email.split('@')[0],
              email: usuario.email,
              senha: '123456', // Senha padrão
              tipo: usuario.tipo || 'aluno',
              serie: usuario.serie || '',
              disciplinas: usuario.disciplinas || [],
              series: usuario.series || []
            };

            console.log(`🔧 [CORRECAO] Criando usuário com dados limpos:`, dadosLimpos);

            const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(dadosLimpos)
            });

            if (response.ok) {
              const resultado = await response.json();
              console.log(`✅ [CORRECAO] Usuário recriado:`, resultado);
              
              resultadoCorrecao.acoes.push({
                usuario: usuario.nome,
                email: usuario.email,
                idAntigo: usuario.id,
                idNovo: resultado.id || resultado.usuario?.id,
                acao: 'recriado',
                sucesso: true
              });

              toast.success(`✅ ${usuario.nome} corrigido`);
            } else {
              const erro = await response.text();
              console.error(`❌ [CORRECAO] Erro ao recriar usuário:`, erro);
              
              resultadoCorrecao.erros.push({
                usuario: usuario.nome,
                email: usuario.email,
                erro: `HTTP ${response.status}: ${erro}`
              });
            }
          } else {
            // Usuário sem dados suficientes - apenas documentar
            resultadoCorrecao.acoes.push({
              usuario: usuario.nome || 'Nome não informado',
              email: usuario.email || 'Email não informado',
              idAntigo: usuario.id,
              acao: 'ignorado_dados_insuficientes',
              sucesso: false
            });
          }

          // Pequena pausa entre operações
          await new Promise(resolve => setTimeout(resolve, 300));

        } catch (error) {
          console.error(`❌ [CORRECAO] Erro ao processar usuário ${usuario.nome}:`, error);
          resultadoCorrecao.erros.push({
            usuario: usuario.nome,
            email: usuario.email,
            erro: error.message
          });
        }
      }

      resultadoCorrecao.fim = new Date().toISOString();
      resultadoCorrecao.sucessos = resultadoCorrecao.acoes.filter((a: any) => a.sucesso).length;
      resultadoCorrecao.falhas = resultadoCorrecao.erros.length;

      setResultado(resultadoCorrecao);
      
      toast.success(`✅ Correção concluída: ${resultadoCorrecao.sucessos} sucessos, ${resultadoCorrecao.falhas} falhas`);

      // Reanalizar após correção
      await analisarUsuarios();

    } catch (error) {
      console.error('❌ [CORRECAO] Erro geral:', error);
      toast.error(`Erro na correção: ${error.message}`);
    } finally {
      setCorrigindo(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
              Correção: Usuários com IDs Inválidos
            </CardTitle>
            <CardDescription>
              Detecta e corrige usuários com IDs gerados aleatoriamente ou inválidos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-4">
              <Button 
                onClick={analisarUsuarios}
                className="flex-1"
                variant="outline"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Analisar Usuários
              </Button>
              
              {usuariosProblematicos.length > 0 && (
                <Button 
                  onClick={corrigirProblemas}
                  disabled={corrigindo}
                  className="flex-1"
                  variant="destructive"
                >
                  {corrigindo ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Corrigindo...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Corrigir {usuariosProblematicos.length} Problemas
                    </>
                  )}
                </Button>
              )}
              
              <Button variant="outline" onClick={onVoltar}>
                Voltar
              </Button>
            </div>

            {/* Resumo da Análise */}
            {(usuarios.length > 0 || usuariosProblematicos.length > 0) && (
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Usuários Válidos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600 mb-2">
                      {usuarios.length}
                    </div>
                    <div className="text-sm text-gray-600">
                      Usuários com IDs válidos e funcionais
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-600" />
                      Usuários Problemáticos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600 mb-2">
                      {usuariosProblematicos.length}
                    </div>
                    <div className="text-sm text-gray-600">
                      Usuários com IDs inválidos ou gerados aleatoriamente
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Lista de Usuários Problemáticos */}
            {usuariosProblematicos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">⚠️ Usuários Problemáticos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {usuariosProblematicos.map((usuario, index) => (
                      <div key={index} className="bg-red-50 p-3 rounded border border-red-200">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{usuario.nome || 'Nome não informado'}</div>
                            <div className="text-sm text-gray-600">{usuario.email || 'Email não informado'}</div>
                            <div className="text-xs text-red-600">
                              ID: <code>{usuario.id}</code> (tipo: {typeof usuario.id})
                            </div>
                          </div>
                          <div className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                            ID inválido
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Resultado da Correção */}
            {resultado && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">📊 Resultado da Correção</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 p-3 rounded">
                        <div className="text-lg font-bold text-blue-600">{resultado.usuariosAnalisados}</div>
                        <div className="text-sm text-blue-700">Analisados</div>
                      </div>
                      <div className="bg-green-50 p-3 rounded">
                        <div className="text-lg font-bold text-green-600">{resultado.sucessos}</div>
                        <div className="text-sm text-green-700">Sucessos</div>
                      </div>
                      <div className="bg-red-50 p-3 rounded">
                        <div className="text-lg font-bold text-red-600">{resultado.falhas}</div>
                        <div className="text-sm text-red-700">Falhas</div>
                      </div>
                    </div>

                    {resultado.acoes.length > 0 && (
                      <details className="bg-gray-50 p-4 rounded">
                        <summary className="cursor-pointer font-medium">Ver detalhes das ações</summary>
                        <div className="mt-2 space-y-2 text-sm">
                          {resultado.acoes.map((acao: any, index: number) => (
                            <div key={index} className={`p-2 rounded ${acao.sucesso ? 'bg-green-100' : 'bg-yellow-100'}`}>
                              <div>
                                <strong>{acao.usuario}</strong> ({acao.email})
                              </div>
                              <div className="text-xs">
                                Ação: {acao.acao} | 
                                ID antigo: {acao.idAntigo} | 
                                {acao.idNovo && `ID novo: ${acao.idNovo}`}
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}

                    {resultado.erros.length > 0 && (
                      <details className="bg-red-50 p-4 rounded">
                        <summary className="cursor-pointer font-medium text-red-700">Ver erros ({resultado.erros.length})</summary>
                        <div className="mt-2 space-y-2 text-sm">
                          {resultado.erros.map((erro: any, index: number) => (
                            <div key={index} className="bg-red-100 p-2 rounded">
                              <div>
                                <strong>{erro.usuario}</strong> ({erro.email})
                              </div>
                              <div className="text-red-700 text-xs">{erro.erro}</div>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">ℹ️ Como funciona esta correção:</h4>
              <ul className="space-y-1 text-sm">
                <li>• <strong>Análise:</strong> Identifica usuários com IDs inválidos (números aleatórios, muito curtos, etc.)</li>
                <li>• <strong>Correção:</strong> Recria os usuários problemáticos com novos IDs válidos</li>
                <li>• <strong>Preservação:</strong> Mantém nome, email, tipo e outras informações importantes</li>
                <li>• <strong>Senha:</strong> Define senha padrão "123456" para usuários recriados</li>
                <li>• <strong>Segurança:</strong> Usuários sem dados suficientes são apenas documentados</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}