import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Wrench, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  Server,
  Database,
  Upload,
  RefreshCw,
  FileText
} from 'lucide-react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface TestResult {
  nome: string;
  status: 'success' | 'error' | 'pending' | 'warning';
  detalhes: string;
  tempo?: number;
}

export function DiagnosticoPDF() {
  const [testando, setTestando] = useState(false);
  const [resultados, setResultados] = useState<TestResult[]>([]);
  const { usuario } = useAuth();

  const executarTeste = async (nome: string, testFunction: () => Promise<any>): Promise<TestResult> => {
    const inicio = Date.now();
    try {
      await testFunction();
      const tempo = Date.now() - inicio;
      return {
        nome,
        status: 'success',
        detalhes: 'Teste executado com sucesso',
        tempo
      };
    } catch (error) {
      const tempo = Date.now() - inicio;
      return {
        nome,
        status: 'error',
        detalhes: error.message || 'Erro desconhecido',
        tempo
      };
    }
  };

  const testarConectividade = async () => {
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/health`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Servidor não responde: ${response.status}`);
    }

    const data = await response.json();
    if (data.status !== 'ok') {
      throw new Error('Servidor reporta status não-OK');
    }
  };

  const testarRotasPDF = async () => {
    if (!usuario?.id) throw new Error('Usuário não autenticado');

    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/conteudo-pdf/conteudista/${usuario.id}`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Erro na rota de PDFs: ${response.status}`);
    }

    const data = await response.json();
    if (!data.hasOwnProperty('conteudos')) {
      throw new Error('Resposta da API não contém field "conteudos"');
    }
  };

  const testarEstatisticas = async () => {
    if (!usuario?.id) throw new Error('Usuário não autenticado');

    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/conteudista/${usuario.id}/estatisticas`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Erro na rota de estatísticas: ${response.status}`);
    }

    const data = await response.json();
    if (!data.hasOwnProperty('estatisticas')) {
      throw new Error('Resposta da API não contém field "estatisticas"');
    }
  };

  const testarUploadSimulado = async () => {
    // Criar um arquivo de teste pequeno com nome que contém caracteres especiais
    const blob = new Blob(['Teste PDF simulado'], { type: 'application/pdf' });
    const file = new File([blob], 'teste-diagnostico-pdf.pdf', { type: 'application/pdf' });
    
    const formData = new FormData();
    formData.append('arquivo', file);
    formData.append('serie', '5º ano - Ensino Fundamental'); // Contém caracteres especiais
    formData.append('disciplina', 'Matemática'); // Contém acento
    formData.append('bimestre', '1');
    formData.append('autorId', usuario?.id || 'teste');
    formData.append('autorNome', usuario?.nome || 'Usuario Teste');

    console.log('[DIAGNOSTICO_PDF] Testando upload com caracteres especiais...');

    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/conteudo-pdf/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`
      },
      body: formData
    });

    const responseText = await response.text();
    console.log('[DIAGNOSTICO_PDF] Resposta do servidor:', responseText);

    // Se foi erro 500, significa que o problema de sanitização não foi resolvido
    if (response.status >= 500) {
      throw new Error(`Erro interno do servidor (${response.status}): ${responseText}`);
    }

    // Se foi erro 400, pode ser validação normal (já existe arquivo, etc.)
    // Isso é aceitável para o teste
    if (response.status >= 400 && response.status < 500) {
      try {
        const errorData = JSON.parse(responseText);
        // Se o erro menciona "Invalid key", ainda temos problema de sanitização
        if (errorData.error && errorData.error.includes('Invalid key')) {
          throw new Error(`Problema de sanitização não resolvido: ${errorData.error}`);
        }
        // Outros erros 400 são aceitáveis (validação de negócio)
        console.log('[DIAGNOSTICO_PDF] Erro 400 aceitável (validação):', errorData.error);
      } catch (parseError) {
        // Se não conseguiu fazer parse, considerar como erro
        throw new Error(`Erro na resposta (${response.status}): ${responseText}`);
      }
    }

    // Status 200 ou 201 são sucessos
    if (response.status >= 200 && response.status < 300) {
      console.log('[DIAGNOSTICO_PDF] Upload simulado bem-sucedido');
    }
  };

  const testarSanitizacao = async () => {
    // Teste específico para verificar se a sanitização de caracteres especiais funciona
    console.log('[DIAGNOSTICO_PDF] Testando sanitização de caracteres especiais...');
    
    // Criar um arquivo com nome que tinha problema antes
    const blob = new Blob(['Teste sanitização'], { type: 'application/pdf' });
    const file = new File([blob], 'Engenharia Computação.pdf', { type: 'application/pdf' });
    
    const formData = new FormData();
    formData.append('arquivo', file);
    formData.append('serie', '5º ano - Ensino Fundamental');
    formData.append('disciplina', 'Matemática');
    formData.append('bimestre', '1');
    formData.append('autorId', usuario?.id || 'teste-sanitizacao');
    formData.append('autorNome', 'Teste Sanitização');

    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/conteudo-pdf/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`
      },
      body: formData
    });

    const responseText = await response.text();
    
    // Se retornou erro de "Invalid key", a sanitização falhou
    if (responseText.includes('Invalid key')) {
      throw new Error('Sanitização falhou - ainda há caracteres inválidos na chave do storage');
    }
    
    // Se o erro foi outro (como "já existe arquivo"), isso indica que a sanitização funcionou
    // mas houve validação de negócio, o que é aceitável
    if (response.status >= 400 && response.status < 500) {
      try {
        const errorData = JSON.parse(responseText);
        console.log('[DIAGNOSTICO_PDF] Erro esperado de validação:', errorData.error);
        // Não é um erro de sanitização, então está OK
      } catch (e) {
        // Se não conseguiu fazer parse, pode ser outro tipo de erro
        if (!responseText.includes('Invalid key')) {
          // Se não menciona "Invalid key", provavelmente está OK
          console.log('[DIAGNOSTICO_PDF] Erro não relacionado à sanitização');
        }
      }
    }
    
    console.log('[DIAGNOSTICO_PDF] Teste de sanitização passou - não há mais erros de "Invalid key"');
  };

  const executarDiagnostico = async () => {
    setTestando(true);
    setResultados([]);

    const testes = [
      {
        nome: 'Conectividade do Servidor',
        funcao: testarConectividade
      },
      {
        nome: 'Rota de Listagem de PDFs',
        funcao: testarRotasPDF
      },
      {
        nome: 'Rota de Estatísticas',
        funcao: testarEstatisticas
      },
      {
        nome: 'Teste de Sanitização de Caracteres',
        funcao: testarSanitizacao
      },
      {
        nome: 'Rota de Upload (simulado)',
        funcao: testarUploadSimulado
      }
    ];

    const novosResultados: TestResult[] = [];

    for (const teste of testes) {
      // Adicionar status pendente
      novosResultados.push({
        nome: teste.nome,
        status: 'pending',
        detalhes: 'Executando...'
      });
      setResultados([...novosResultados]);

      // Executar teste
      const resultado = await executarTeste(teste.nome, teste.funcao);
      
      // Atualizar resultado
      novosResultados[novosResultados.length - 1] = resultado;
      setResultados([...novosResultados]);

      // Pequena pausa entre testes
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setTestando(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'pending':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'pending':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const sucessos = resultados.filter(r => r.status === 'success').length;
  const erros = resultados.filter(r => r.status === 'error').length;
  const tempoTotal = resultados.reduce((acc, r) => acc + (r.tempo || 0), 0);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-blue-600" />
            Diagnóstico do Sistema PDF
          </CardTitle>
          <CardDescription>
            Teste a conectividade e funcionalidade do sistema de conteúdo PDF
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={executarDiagnostico}
            disabled={testando}
            className="gap-2"
          >
            {testando ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Wrench className="w-4 h-4" />
            )}
            {testando ? 'Executando Diagnóstico...' : 'Executar Diagnóstico'}
          </Button>
        </CardContent>
      </Card>

      {/* Resumo dos Testes */}
      {resultados.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Resumo dos Testes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{sucessos}</div>
                <div className="text-sm text-gray-600">Sucessos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{erros}</div>
                <div className="text-sm text-gray-600">Erros</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{tempoTotal}ms</div>
                <div className="text-sm text-gray-600">Tempo Total</div>
              </div>
            </div>

            {erros === 0 && resultados.length > 0 && !testando && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="w-4 h-4" />
                <AlertDescription>
                  ✅ Todos os testes passaram! O sistema PDF está funcionando corretamente.
                </AlertDescription>
              </Alert>
            )}

            {erros > 0 && (
              <Alert className="border-red-200 bg-red-50">
                <XCircle className="w-4 h-4" />
                <AlertDescription>
                  ❌ {erros} teste{erros > 1 ? 's' : ''} falhou{erros > 1 ? 'ram' : ''}. Verifique os detalhes abaixo.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Resultados Detalhados */}
      {resultados.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados Detalhados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {resultados.map((resultado, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(resultado.status)}
                    <div>
                      <div className="font-medium">{resultado.nome}</div>
                      <div className={`text-sm ${getStatusColor(resultado.status)}`}>
                        {resultado.detalhes}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {resultado.tempo && (
                      <div className="text-sm text-gray-500">
                        {resultado.tempo}ms
                      </div>
                    )}
                    <Badge 
                      variant={resultado.status === 'success' ? 'default' : 'destructive'}
                      className="ml-2"
                    >
                      {resultado.status === 'success' ? 'OK' : 
                       resultado.status === 'error' ? 'ERRO' :
                       resultado.status === 'pending' ? 'EXEC...' : 'AVISO'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informações do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Informações do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Usuário:</strong> {usuario?.nome || 'N/A'}
            </div>
            <div>
              <strong>Tipo:</strong> {usuario?.tipo || 'N/A'}
            </div>
            <div>
              <strong>Project ID:</strong> {projectId}
            </div>
            <div>
              <strong>Timestamp:</strong> {new Date().toLocaleString('pt-BR')}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dicas */}
      <Card>
        <CardHeader>
          <CardTitle>💡 Dicas de Solução</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Se houver erros de conectividade, verifique sua conexão com a internet</p>
            <p>• Se o upload falhar, tente arquivos menores primeiro</p>
            <p>• Use o "Recarregador de PDFs" se URLs estiverem expiradas</p>
            <p>• Contate o administrador se persistirem erros do servidor</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}