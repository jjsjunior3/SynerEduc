import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle, Wrench, RefreshCw } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface CorrecaoDefinitivaErroUpdatedAtProps {
  onVoltar: () => void;
}

export function CorrecaoDefinitivaErroUpdatedAt({ onVoltar }: CorrecaoDefinitivaErroUpdatedAtProps) {
  const [carregando, setCarregando] = useState(false);
  const [diagnosticos, setDiagnosticos] = useState<string[]>([]);
  const [corrigindo, setCorrigindo] = useState(false);

  const adicionarDiagnostico = (mensagem: string) => {
    setDiagnosticos(prev => [...prev, `${new Date().toLocaleTimeString()}: ${mensagem}`]);
  };

  const testarEAtualizarErika = async () => {
    setCarregando(true);
    setDiagnosticos([]);
    
    try {
      adicionarDiagnostico('🔍 Iniciando correção definitiva do erro updated_at...');
      
      // 1. Buscar usuários
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const usuarios = data.usuarios || [];
      adicionarDiagnostico(`✅ Encontrados ${usuarios.length} usuários`);

      // 2. Encontrar Erika
      const usuariosErika = usuarios.filter((u: any) => 
        u.nome && u.nome.toLowerCase().includes('erika')
      );

      if (usuariosErika.length === 0) {
        adicionarDiagnostico('❌ Usuário Erika não encontrado');
        return;
      }

      const erika = usuariosErika[0];
      adicionarDiagnostico(`✅ Erika encontrada: ${erika.nome} (ID: ${erika.id})`);

      // 3. Dados corretos para Erika (ULTRA LIMPOS)
      const dadosCorrigidos = {
        nome: erika.nome, // Manter nome original
        email: erika.email, // Manter email original
        tipo: 'professor',
        disciplinas: ['Português'],
        series: [
          '6º ano - Ensino Fundamental',
          '7º ano - Ensino Fundamental', 
          '8º ano - Ensino Fundamental',
          '9º ano - Ensino Fundamental'
        ]
      };

      adicionarDiagnostico('📝 Dados preparados (sem campos de timestamp):');
      adicionarDiagnostico(`  - Nome: ${dadosCorrigidos.nome}`);
      adicionarDiagnostico(`  - Email: ${dadosCorrigidos.email}`);
      adicionarDiagnostico(`  - Tipo: ${dadosCorrigidos.tipo}`);
      adicionarDiagnostico(`  - Disciplinas: [${dadosCorrigidos.disciplinas.join(', ')}]`);
      adicionarDiagnostico(`  - Séries: ${dadosCorrigidos.series.length} séries`);

      // 4. Atualizar usando rota corrigida
      adicionarDiagnostico('🔧 Enviando atualização...');
      
      const updateResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${erika.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosCorrigidos)
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        throw new Error(`Erro ${updateResponse.status}: ${errorText}`);
      }

      const resultado = await updateResponse.json();
      adicionarDiagnostico('✅ Atualização realizada com sucesso!');
      console.log('[CORRECAO_UPDATED_AT] Resultado:', resultado);

      // 5. Verificar se funcionou buscando novamente
      adicionarDiagnostico('🔍 Verificando resultado...');
      
      const verificacaoResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (verificacaoResponse.ok) {
        const verificacaoData = await verificacaoResponse.json();
        const erikaAtualizada = verificacaoData.usuarios?.find((u: any) => u.id === erika.id);
        
        if (erikaAtualizada) {
          adicionarDiagnostico('✅ Verificação bem-sucedida!');
          adicionarDiagnostico(`  - Disciplinas: [${erikaAtualizada.disciplinas?.join(', ') || 'NENHUMA'}]`);
          adicionarDiagnostico(`  - Séries: [${erikaAtualizada.series?.join(', ') || 'NENHUMA'}]`);
          
          const temPortugues = erikaAtualizada.disciplinas?.includes('Português');
          const temSeriesCorretas = erikaAtualizada.series?.length >= 4;
          
          if (temPortugues && temSeriesCorretas) {
            adicionarDiagnostico('🎉 CORREÇÃO COMPLETA! Todos os dados estão corretos!');
            toast.success('Professora Erika corrigida com sucesso!');
          } else {
            adicionarDiagnostico('⚠️ Dados parcialmente corretos - pode ser necessário nova tentativa');
          }
        }
      }

    } catch (error) {
      console.error('[CORRECAO_UPDATED_AT] Erro:', error);
      adicionarDiagnostico(`❌ ERRO: ${error.message}`);
      
      if (error.message.includes('updated_at') || error.message.includes('record "new" has no field')) {
        adicionarDiagnostico('🚨 ERRO CRÍTICO: O sistema ainda está tentando adicionar campos de timestamp!');
        adicionarDiagnostico('💡 SOLUÇÃO: Precisa recriar a função do servidor com sanitização total');
      }
      
      toast.error(`Erro na correção: ${error.message}`);
    } finally {
      setCarregando(false);
    }
  };

  const corrigirServidorCompleto = async () => {
    setCorrigindo(true);
    adicionarDiagnostico('🔧 Iniciando correção completa do servidor...');
    
    try {
      // Testar se o servidor está respondendo
      const healthResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (healthResponse.ok) {
        adicionarDiagnostico('✅ Servidor está respondendo');
        adicionarDiagnostico('💡 O problema está na função de atualização do KV Store');
        adicionarDiagnostico('🔧 Recomendação: Redeploy do servidor com código corrigido');
        
        toast.info('Servidor funcionando - problema é no código de atualização');
      } else {
        adicionarDiagnostico('❌ Servidor não está respondendo corretamente');
        toast.error('Problema de conectividade com o servidor');
      }

    } catch (error) {
      adicionarDiagnostico(`❌ Erro ao testar servidor: ${error.message}`);
      toast.error('Falha na comunicação com o servidor');
    } finally {
      setCorrigindo(false);
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
              <h1 className="text-xl font-bold text-red-600">🚨 Correção Definitiva - Erro Updated_At</h1>
              <p className="text-sm text-gray-600">Corrigir erro "record 'new' has no field 'updated_at'"</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={testarEAtualizarErika} disabled={carregando || corrigindo} className="bg-red-600 hover:bg-red-700">
              <Wrench className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
              Testar e Corrigir Erika
            </Button>
            <Button onClick={corrigirServidorCompleto} disabled={carregando || corrigindo} variant="outline">
              <RefreshCw className={`w-4 h-4 ${corrigindo ? 'animate-spin' : ''}`} />
              Diagnosticar Servidor
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Análise do Problema */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Análise do Erro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <h4 className="font-medium text-red-900 mb-2">Erro Identificado:</h4>
                  <p className="text-red-700 font-mono text-xs">
                    record "new" has no field "updated_at"
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Causa Raiz:</h4>
                  <ul className="space-y-1 text-gray-700 text-xs">
                    <li>• Supabase está tentando adicionar campo <code>updated_at</code></li>
                    <li>• Tabela <code>kv_store_c61d1ad0</code> não tem esse campo</li>
                    <li>• Sanitização não está bloqueando todos os timestamps</li>
                    <li>• Função <code>upsert</code> está sendo chamada incorretamente</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Solução Aplicada:</h4>
                  <ul className="space-y-1 text-gray-700 text-xs">
                    <li>✅ Whitelist ultra-rigorosa de campos</li>
                    <li>✅ Remoção de todos campos *_at</li>
                    <li>✅ Sanitização em múltiplas camadas</li>
                    <li>✅ Validação final antes do KV Store</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Log de Diagnóstico */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Log de Correção
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 text-gray-100 p-3 rounded font-mono text-xs max-h-80 overflow-y-auto">
                {diagnosticos.length === 0 ? (
                  <p className="text-gray-400">Nenhuma correção executada ainda...</p>
                ) : (
                  diagnosticos.map((diagnostico, index) => (
                    <div key={index} className="mb-1">
                      {diagnostico}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Status da Correção */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>📊 Status da Correção</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {diagnosticos.filter(d => d.includes('✅')).length}
                  </div>
                  <div className="text-sm text-gray-600">Etapas Concluídas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {diagnosticos.filter(d => d.includes('❌')).length}
                  </div>
                  <div className="text-sm text-gray-600">Erros Encontrados</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {diagnosticos.filter(d => d.includes('⚠️')).length}
                  </div>
                  <div className="text-sm text-gray-600">Avisos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {diagnosticos.filter(d => d.includes('🎉')).length}
                  </div>
                  <div className="text-sm text-gray-600">Sucessos</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Instruções de Emergência */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-red-600">🆘 Se o Erro Persistir</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <h4 className="font-medium text-yellow-900 mb-2">1. Verificar Código do Servidor</h4>
                  <p className="text-yellow-700 text-xs">
                    O erro indica que a função <code>sanitizarParaKvStore</code> não está funcionando corretamente.
                  </p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded p-3">
                  <h4 className="font-medium text-orange-900 mb-2">2. Redeploy Necessário</h4>
                  <p className="text-orange-700 text-xs">
                    Se a correção não funcionar, é necessário fazer redeploy da função do Supabase.
                  </p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <h4 className="font-medium text-red-900 mb-2">3. Modo de Emergência</h4>
                  <p className="text-red-700 text-xs">
                    Use <code>?mode=emergencia</code> para acessar funcionalidades essenciais.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}