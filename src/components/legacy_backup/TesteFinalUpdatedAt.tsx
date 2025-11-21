import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface TesteFinalUpdatedAtProps {
  onVoltar: () => void;
}

export function TesteFinalUpdatedAt({ onVoltar }: TesteFinalUpdatedAtProps) {
  const [carregando, setCarregando] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [statusTeste, setStatusTeste] = useState<'pendente' | 'executando' | 'sucesso' | 'erro'>('pendente');

  const adicionarLog = (mensagem: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${mensagem}`]);
  };

  const testarCorrecaoUpdatedAt = async () => {
    setCarregando(true);
    setStatusTeste('executando');
    setLogs([]);
    
    try {
      adicionarLog('🚀 Iniciando teste de correção do erro updated_at...');

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

      adicionarLog(`✅ Erika encontrada: ${usuarioErika.nome} (ID: ${usuarioErika.id})`);

      // 2. Preparar dados de teste
      adicionarLog('2️⃣ Preparando dados de teste ultra-limpos...');
      const dadosTeste = {
        nome: usuarioErika.nome,
        tipo: 'professor',
        disciplinas: ['Português'],
        series: [
          '6º ano - Ensino Fundamental',
          '7º ano - Ensino Fundamental',
          '8º ano - Ensino Fundamental',
          '9º ano - Ensino Fundamental'
        ]
      };

      adicionarLog('📝 Dados preparados (apenas campos essenciais)');
      adicionarLog(`  • Nome: ${dadosTeste.nome}`);
      adicionarLog(`  • Tipo: ${dadosTeste.tipo}`);
      adicionarLog(`  • Disciplinas: ${dadosTeste.disciplinas.length} item(s)`);
      adicionarLog(`  • Séries: ${dadosTeste.series.length} item(s)`);

      // 3. Executar atualização
      adicionarLog('3️⃣ Executando atualização...');
      const putResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${usuarioErika.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosTeste)
      });

      adicionarLog(`📊 Status da resposta: ${putResponse.status}`);

      if (!putResponse.ok) {
        const errorText = await putResponse.text();
        adicionarLog(`❌ Erro na resposta: ${errorText}`);
        
        if (errorText.includes('updated_at') || errorText.includes('record "new" has no field')) {
          adicionarLog('🚨 CONFIRMADO: Erro de updated_at ainda presente!');
          adicionarLog('💡 O servidor ainda não foi corrigido completamente');
          setStatusTeste('erro');
          throw new Error('Erro de updated_at detectado');
        } else {
          throw new Error(`Erro HTTP ${putResponse.status}: ${errorText}`);
        }
      }

      const resultado = await putResponse.json();
      adicionarLog('✅ Atualização executada sem erros!');
      adicionarLog(`📋 Resposta: ${resultado.success ? 'Sucesso' : 'Falha'}`);

      // 4. Verificação
      adicionarLog('4️⃣ Verificando resultado...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      const verificacaoResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (verificacaoResponse.ok) {
        const dadosVerificacao = await verificacaoResponse.json();
        const usuarioVerificado = dadosVerificacao.usuarios?.find((u: any) => u.id === usuarioErika.id);
        
        if (usuarioVerificado) {
          const temPortugues = usuarioVerificado.disciplinas?.includes('Português');
          const quantidadeSeries = usuarioVerificado.series?.length || 0;
          
          adicionarLog('📋 Verificação concluída:');
          adicionarLog(`  • Português: ${temPortugues ? '✅ SIM' : '❌ NÃO'}`);
          adicionarLog(`  • Séries: ${quantidadeSeries}/4`);
          
          if (temPortugues && quantidadeSeries >= 4) {
            adicionarLog('🎉 TESTE PASSOU! Correção funcionou perfeitamente!');
            setStatusTeste('sucesso');
            toast.success('Correção do updated_at confirmada!');
          } else {
            adicionarLog('⚠️ Teste parcial - dados podem não ter sido salvos completamente');
            setStatusTeste('erro');
          }
        }
      }

    } catch (error) {
      console.error('[TESTE_UPDATED_AT] Erro:', error);
      adicionarLog(`❌ ERRO NO TESTE: ${error.message}`);
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
      default: return <AlertTriangle className="w-5 h-5 text-gray-600" />;
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
              <h1 className="text-xl font-bold text-purple-600">🧪 Teste Final - Correção Updated_At</h1>
              <p className="text-sm text-gray-600">Verificação definitiva da correção do erro de timestamp</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={statusTeste === 'sucesso' ? 'default' : statusTeste === 'erro' ? 'destructive' : 'secondary'}
              className="flex items-center gap-1"
            >
              {obterIconeStatus()}
              {statusTeste === 'sucesso' ? 'CORRIGIDO' : 
               statusTeste === 'erro' ? 'ERRO ATIVO' :
               statusTeste === 'executando' ? 'TESTANDO' : 'PENDENTE'}
            </Badge>
            <Button 
              onClick={testarCorrecaoUpdatedAt} 
              disabled={carregando}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {carregando ? '🧪 Testando...' : '🚀 Executar Teste'}
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status do Teste */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${obterCorStatus()}`}>
                {obterIconeStatus()}
                Status do Teste
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <label className="font-medium text-gray-700">Estado:</label>
                  <p className={`${obterCorStatus()} font-medium`}>
                    {statusTeste === 'pendente' && 'Aguardando execução'}
                    {statusTeste === 'executando' && 'Teste em andamento...'}
                    {statusTeste === 'sucesso' && 'Correção confirmada! ✅'}
                    {statusTeste === 'erro' && 'Erro ainda presente ❌'}
                  </p>
                </div>
                
                <div>
                  <label className="font-medium text-gray-700">Objetivo:</label>
                  <p className="text-gray-900 text-sm">
                    Verificar se a correção do servidor eliminou completamente o erro 
                    "record 'new' has no field 'updated_at'"
                  </p>
                </div>
                
                <div>
                  <label className="font-medium text-gray-700">Método:</label>
                  <ul className="text-gray-900 text-sm space-y-1">
                    <li>• Buscar usuário Erika</li>
                    <li>• Atualizar com dados limpos</li>
                    <li>• Verificar se erro updated_at ocorre</li>
                    <li>• Confirmar se dados foram salvos</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Log de Execução */}
          <Card>
            <CardHeader>
              <CardTitle>📋 Log de Execução</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 text-gray-100 p-3 rounded font-mono text-xs max-h-96 overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-gray-400">Aguardando execução do teste...</p>
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

          {/* Informações Técnicas */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>🔧 Informações Técnicas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-red-700 mb-2">❌ Problema Original</h4>
                  <div className="bg-red-50 p-3 rounded text-sm">
                    <p className="text-red-700 mb-2">
                      <strong>Erro:</strong> "record 'new' has no field 'updated_at'"
                    </p>
                    <p className="text-red-600 text-xs">
                      Ocorria quando o servidor tentava salvar dados com campos de timestamp 
                      no KV Store do Supabase, que não suporta esses campos.
                    </p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-green-700 mb-2">✅ Solução Implementada</h4>
                  <div className="bg-green-50 p-3 rounded text-sm">
                    <p className="text-green-700 mb-2">
                      <strong>Correção:</strong> Construção manual de objetos
                    </p>
                    <p className="text-green-600 text-xs">
                      Nova abordagem que constrói objetos campo por campo usando apenas 
                      dados essenciais, eliminando completamente qualquer campo de timestamp.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <h4 className="font-medium text-blue-800 mb-2">🎯 Este Teste Verifica:</h4>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• Se a nova implementação do servidor funciona sem erros</li>
                  <li>• Se os dados da professora Erika são atualizados corretamente</li>
                  <li>• Se o erro "updated_at" foi eliminado definitivamente</li>
                  <li>• Se a correção permitiu vincular Português às 4 séries</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}