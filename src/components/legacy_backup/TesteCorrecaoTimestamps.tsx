import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  ArrowLeft, 
  User, 
  CheckCircle,
  AlertTriangle,
  Loader2,
  Edit,
  TestTube
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface TesteCorrecaoTimestampsProps {
  onVoltar: () => void;
}

interface ResultadoTeste {
  sucesso: boolean;
  usuario?: any;
  erro?: string;
  detalhes?: any;
}

export function TesteCorrecaoTimestamps({ onVoltar }: TesteCorrecaoTimestampsProps) {
  const [testando, setTestando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoTeste | null>(null);
  const [usuarioTeste, setUsuarioTeste] = useState<any>(null);

  const buscarUsuarioParaTeste = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.usuarios && data.usuarios.length > 0) {
          // Pegar o primeiro usuário que não seja administrador
          const usuario = data.usuarios.find(u => u.tipo !== 'administrador') || data.usuarios[0];
          setUsuarioTeste(usuario);
          return usuario;
        }
      }
      
      throw new Error('Nenhum usuário encontrado para teste');
    } catch (error) {
      console.error('[TESTE_TIMESTAMPS] Erro ao buscar usuário:', error);
      throw error;
    }
  };

  const testarEdicaoUsuario = async () => {
    setTestando(true);
    setResultado(null);
    
    try {
      console.log('[TESTE_TIMESTAMPS] Iniciando teste de correção de timestamps...');
      
      // 1. Buscar usuário para teste
      toast.loading('Buscando usuário para teste...', { id: 'teste-timestamps' });
      const usuario = usuarioTeste || await buscarUsuarioParaTeste();
      
      if (!usuario) {
        throw new Error('Nenhum usuário disponível para teste');
      }
      
      console.log('[TESTE_TIMESTAMPS] Usuário selecionado para teste:', {
        id: usuario.id,
        nome: usuario.nome,
        tipo: usuario.tipo
      });
      
      toast.loading('Testando edição do usuário...', { id: 'teste-timestamps' });
      
      // 2. Tentar editar o usuário (operação que estava falhando)
      const dadosParaEdicao = {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        tipo: usuario.tipo,
        ativo: usuario.ativo,
        // Adicionar campos específicos baseados no tipo
        ...(usuario.tipo === 'aluno' && { serie: usuario.serie }),
        ...(usuario.tipo === 'professor' && { 
          disciplinas: usuario.disciplinas || [],
          series: usuario.series || []
        }),
        ...(usuario.tipo === 'professor_conteudista' && { 
          disciplinas: usuario.disciplinas || []
        })
      };
      
      console.log('[TESTE_TIMESTAMPS] Dados para edição:', dadosParaEdicao);
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${usuario.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosParaEdicao)
      });
      
      console.log('[TESTE_TIMESTAMPS] Status da resposta:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[TESTE_TIMESTAMPS] Erro da API:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const resultado = await response.json();
      console.log('[TESTE_TIMESTAMPS] Resultado da edição:', resultado);
      
      toast.dismiss('teste-timestamps');
      toast.success('✅ Teste concluído com sucesso!', {
        description: 'Erro de timestamps foi corrigido'
      });
      
      setResultado({
        sucesso: true,
        usuario: resultado.usuario,
        detalhes: resultado
      });
      
    } catch (error) {
      console.error('[TESTE_TIMESTAMPS] Erro no teste:', error);
      
      toast.dismiss('teste-timestamps');
      
      const isTimestampError = error.message.includes('updated_at') || 
                               error.message.includes('created_at') ||
                               error.message.includes('has no field');
      
      if (isTimestampError) {
        toast.error('❌ Erro de timestamp ainda presente!', {
          description: 'A correção precisa ser aplicada novamente'
        });
      } else {
        toast.error('⚠️ Erro diferente encontrado', {
          description: error.message
        });
      }
      
      setResultado({
        sucesso: false,
        erro: error.message,
        detalhes: { isTimestampError }
      });
    } finally {
      setTestando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onVoltar}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">🧪 Teste - Correção de Timestamps</h1>
            <p className="text-sm text-gray-600">Verificação da correção do erro "record has no field updated_at"</p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Informações do problema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="w-5 h-5 text-blue-600" />
              Problema Detectado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-red-800 mb-2">Erro Original:</h4>
              <code className="text-sm text-red-700 bg-red-100 p-2 rounded block">
                Error: record "new" has no field "updated_at"
              </code>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Correção Aplicada:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Removidos todos os campos de timestamp da função sanitizarParaKvStore</li>
                <li>• Eliminados campos: updated_at, created_at, dataInicio, dataFim, criadoEm, atualizadoEm</li>
                <li>• Aplicada whitelist rigorosa apenas com campos seguros</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Usuário de teste */}
        {usuarioTeste && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Usuário Selecionado para Teste
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium">{usuarioTeste.nome}</div>
                  <div className="flex items-center gap-2">
                    <Badge className="text-xs">
                      {usuarioTeste.tipo}
                    </Badge>
                    <span className="text-sm text-gray-500">ID: {usuarioTeste.id?.slice(0, 12)}...</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Botão de teste */}
        <Card>
          <CardContent className="p-6 text-center">
            <Button
              onClick={testarEdicaoUsuario}
              disabled={testando}
              size="lg"
              className="min-w-48"
            >
              {testando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Testando Correção...
                </>
              ) : (
                <>
                  <TestTube className="w-4 h-4 mr-2" />
                  Executar Teste
                </>
              )}
            </Button>
            <p className="text-sm text-gray-500 mt-2">
              Clique para testar se a edição de usuários funciona sem erro de timestamp
            </p>
          </CardContent>
        </Card>

        {/* Resultado do teste */}
        {resultado && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {resultado.sucesso ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                )}
                Resultado do Teste
              </CardTitle>
            </CardHeader>
            <CardContent>
              {resultado.sucesso ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-2">✅ Teste Bem-sucedido!</h4>
                  <p className="text-green-700 text-sm mb-3">
                    A edição do usuário funcionou perfeitamente. A correção de timestamps foi aplicada com sucesso.
                  </p>
                  {resultado.usuario && (
                    <div className="text-xs text-green-600 bg-green-100 p-2 rounded">
                      <strong>Usuário atualizado:</strong> {resultado.usuario.nome} ({resultado.usuario.tipo})
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 mb-2">❌ Teste Falhou</h4>
                  <p className="text-red-700 text-sm mb-3">
                    {resultado.detalhes?.isTimestampError 
                      ? 'O erro de timestamp ainda está presente. A correção precisa ser reaplicada.'
                      : 'Um erro diferente foi encontrado. Veja os detalhes abaixo.'
                    }
                  </p>
                  <div className="text-xs text-red-600 bg-red-100 p-2 rounded">
                    <strong>Erro:</strong> {resultado.erro}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}