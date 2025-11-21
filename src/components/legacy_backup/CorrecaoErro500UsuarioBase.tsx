import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { CheckCircle, XCircle, Loader2, AlertTriangle, User, Settings } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface CorrecaoErro500Props {
  onVoltar: () => void;
}

export function CorrecaoErro500UsuarioBase({ onVoltar }: CorrecaoErro500Props) {
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState<any[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const testarCorrecaoErro500 = async () => {
    setLoading(true);
    setErro(null);
    setResultados([]);

    try {
      console.log('🔧 TESTANDO CORREÇÃO DO ERRO 500 - usuarioBase undefined');

      // 1. Primeiro, listar usuários existentes
      const responseListar = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!responseListar.ok) {
        throw new Error(`Erro ao listar usuários: ${responseListar.status}`);
      }

      const usuariosData = await responseListar.json();
      const usuarios = usuariosData.usuarios || [];

      if (usuarios.length === 0) {
        setResultados([{
          teste: 'Usuários Disponíveis',
          status: 'erro',
          detalhes: 'Nenhum usuário encontrado para teste'
        }]);
        return;
      }

      // 2. Selecionar um usuário para teste (preferencialmente não admin)
      const usuarioTeste = usuarios.find(u => u.tipo !== 'administrador') || usuarios[0];

      setResultados(prev => [...prev, {
        teste: 'Usuário de Teste Selecionado',
        status: 'sucesso',
        detalhes: `ID: ${usuarioTeste.id}, Nome: ${usuarioTeste.nome}, Tipo: ${usuarioTeste.tipo}`
      }]);

      // 3. Tentar atualizar o usuário (operação que estava falhando)
      console.log(`🔧 Testando atualização do usuário: ${usuarioTeste.id}`);

      const dadosAtualizacao = {
        nome: usuarioTeste.nome + ' (Teste)',
        email: usuarioTeste.email,
        tipo: usuarioTeste.tipo,
        ativo: true
      };

      const responseAtualizar = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${usuarioTeste.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosAtualizacao)
      });

      if (responseAtualizar.ok) {
        const resultado = await responseAtualizar.json();
        setResultados(prev => [...prev, {
          teste: 'Atualização de Usuário',
          status: 'sucesso',
          detalhes: `✅ Usuário atualizado sem erro 500! Nome: ${resultado.usuario?.nome}`
        }]);

        // 4. Reverter a alteração de teste
        setTimeout(async () => {
          try {
            await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${usuarioTeste.id}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                ...dadosAtualizacao,
                nome: usuarioTeste.nome // Nome original
              })
            });

            setResultados(prev => [...prev, {
              teste: 'Reversão do Teste',
              status: 'sucesso',
              detalhes: '✅ Nome original restaurado'
            }]);
          } catch (error) {
            console.error('Erro ao reverter teste:', error);
          }
        }, 2000);

      } else {
        const errorData = await responseAtualizar.json();
        setResultados(prev => [...prev, {
          teste: 'Atualização de Usuário',
          status: 'erro',
          detalhes: `❌ Ainda com erro: ${responseAtualizar.status} - ${errorData.error || 'Erro desconhecido'}`
        }]);
      }

      // 5. Teste adicional: verificar estrutura do backend
      console.log('🔧 Testando health check do backend...');
      
      const responseHealth = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      if (responseHealth.ok) {
        const healthData = await responseHealth.json();
        setResultados(prev => [...prev, {
          teste: 'Backend Health Check',
          status: 'sucesso',
          detalhes: `✅ Backend funcionando: ${healthData.message || 'OK'}`
        }]);
      } else {
        setResultados(prev => [...prev, {
          teste: 'Backend Health Check',
          status: 'aviso',
          detalhes: `⚠️ Health check retornou ${responseHealth.status}`
        }]);
      }

    } catch (error) {
      console.error('Erro no teste de correção:', error);
      setErro(error.message);
      setResultados(prev => [...prev, {
        teste: 'ERRO GERAL',
        status: 'erro',
        detalhes: `❌ ${error.message}`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sucesso':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'erro':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'aviso':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default:
        return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sucesso':
        return 'bg-green-50 border-green-200';
      case 'erro':
        return 'bg-red-50 border-red-200';
      case 'aviso':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Settings className="w-8 h-8 text-blue-600" />
                <div>
                  <CardTitle className="text-xl">Correção: Erro 500 - usuarioBase undefined</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Teste da correção do erro crítico no backend onde variável usuarioBase estava indefinida
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={onVoltar}>
                Voltar
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Detalhes da Correção Aplicada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">🔧 Problema Identificado:</h4>
              <p className="text-blue-800 text-sm mb-3">
                Na linha 849 do backend (/supabase/functions/server/index.tsx), havia uma referência à variável <code>usuarioBase</code> 
                que não estava definida no escopo da TENTATIVA 3 de salvamento.
              </p>
              
              <h4 className="font-medium text-blue-900 mb-2">✅ Correção Aplicada:</h4>
              <p className="text-blue-800 text-sm mb-3">
                Substituído <code>usuarioBase</code> por <code>usuarioEncontrado.value</code> que é a variável 
                correta disponível no contexto.
              </p>
              
              <div className="bg-white rounded border p-3">
                <p className="text-xs text-gray-500 mb-1">Antes (ERRO):</p>
                <code className="text-red-600 text-xs block mb-2">
                  id: usuarioBase.id,<br/>
                  nome: dadosLimpos.nome || usuarioBase.nome,<br/>
                  tipo: dadosLimpos.tipo || usuarioBase.tipo || 'aluno'
                </code>
                
                <p className="text-xs text-gray-500 mb-1">Depois (CORRIGIDO):</p>
                <code className="text-green-600 text-xs block">
                  id: usuarioEncontrado.value.id,<br/>
                  nome: dadosLimpos.nome || usuarioEncontrado.value.nome,<br/>
                  tipo: dadosLimpos.tipo || usuarioEncontrado.value.tipo || 'aluno'
                </code>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Teste de Verificação</CardTitle>
              <Button 
                onClick={testarCorrecaoErro500}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Testando...
                  </>
                ) : (
                  'Testar Correção'
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {erro && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 font-medium">Erro no teste:</p>
                <p className="text-red-700 text-sm mt-1">{erro}</p>
              </div>
            )}

            {resultados.length > 0 && (
              <div className="space-y-3">
                {resultados.map((resultado, index) => (
                  <div 
                    key={index}
                    className={`p-4 rounded-lg border ${getStatusColor(resultado.status)}`}
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(resultado.status)}
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{resultado.teste}</h4>
                        <p className="text-sm text-gray-600 mt-1">{resultado.detalhes}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && resultados.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Clique em "Testar Correção" para verificar se o erro 500 foi resolvido</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}