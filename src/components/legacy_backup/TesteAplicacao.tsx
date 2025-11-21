import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  TestTube,
  Server,
  Database,
  Users,
  BookOpen,
  MessageSquare,
  Calendar
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface TesteResult {
  nome: string;
  status: 'sucesso' | 'erro' | 'aviso' | 'testando';
  detalhes: string;
  tempo?: number;
}

interface TesteAplicacaoProps {
  onClose: () => void;
}

export function TesteAplicacao({ onClose }: TesteAplicacaoProps) {
  const [testes, setTestes] = useState<TesteResult[]>([]);
  const [testando, setTestando] = useState(false);
  const [progresso, setProgresso] = useState(0);

  const listaTestesa = [
    { id: 'servidor', nome: 'Conexão com Servidor', endpoint: '/health' },
    { id: 'setup', nome: 'Status do Setup', endpoint: '/auth/setup-status' },
    { id: 'usuarios', nome: 'API de Usuários', endpoint: '/usuarios' },
    { id: 'disciplinas', nome: 'API de Disciplinas', endpoint: '/disciplinas' },
    { id: 'comunicados', nome: 'API de Comunicados', endpoint: '/comunicados' },
    { id: 'notas', nome: 'API de Notas', endpoint: '/notas/aluno/test-user' },
    { id: 'horario', nome: 'API de Horário', endpoint: '/horario/3ª série - Ensino Médio/A' }
  ];

  useEffect(() => {
    if (testando) {
      executarTestes();
    }
  }, [testando]);

  const executarTestes = async () => {
    setTestes([]);
    setProgresso(0);

    for (let i = 0; i < listaTestesa.length; i++) {
      const teste = listaTestesa[i];
      
      // Atualizar status para "testando"
      setTestes(prev => [
        ...prev,
        { nome: teste.nome, status: 'testando', detalhes: 'Executando teste...' }
      ]);

      const resultado = await executarTeste(teste);
      
      // Atualizar resultado do teste
      setTestes(prev => {
        const novosTestes = [...prev];
        novosTestes[i] = resultado;
        return novosTestes;
      });

      setProgresso(((i + 1) / listaTestesa.length) * 100);
      
      // Pequena pausa entre testes
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setTestando(false);
  };

  const executarTeste = async (teste: any): Promise<TesteResult> => {
    const startTime = Date.now();
    
    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0${teste.endpoint}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      const tempo = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        return {
          nome: teste.nome,
          status: 'sucesso',
          detalhes: `Resposta OK em ${tempo}ms`,
          tempo
        };
      } else {
        const errorText = await response.text();
        return {
          nome: teste.nome,
          status: response.status === 401 || response.status === 403 ? 'aviso' : 'erro',
          detalhes: `HTTP ${response.status}: ${response.statusText}`,
          tempo
        };
      }
    } catch (error) {
      const tempo = Date.now() - startTime;
      return {
        nome: teste.nome,
        status: 'erro',
        detalhes: `Erro de conexão: ${error.message || error}`,
        tempo
      };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sucesso':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'erro':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'aviso':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'testando':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sucesso':
        return 'border-green-200 bg-green-50';
      case 'erro':
        return 'border-red-200 bg-red-50';
      case 'aviso':
        return 'border-yellow-200 bg-yellow-50';
      case 'testando':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const contarResultados = () => {
    const sucessos = testes.filter(t => t.status === 'sucesso').length;
    const erros = testes.filter(t => t.status === 'erro').length;
    const avisos = testes.filter(t => t.status === 'aviso').length;
    
    return { sucessos, erros, avisos };
  };

  const { sucessos, erros, avisos } = contarResultados();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TestTube className="w-5 h-5" />
              Teste Geral da Aplicação
            </CardTitle>
            <Button variant="outline" size="sm" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Controles */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button 
                onClick={() => setTestando(true)} 
                disabled={testando}
                className="flex items-center gap-2"
              >
                {testando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Testando...
                  </>
                ) : (
                  <>
                    <TestTube className="w-4 h-4" />
                    Iniciar Testes
                  </>
                )}
              </Button>
              
              {testes.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setTestes([]);
                    setProgresso(0);
                  }}
                  disabled={testando}
                >
                  Limpar
                </Button>
              )}
            </div>

            {/* Resumo */}
            {testes.length > 0 && (
              <div className="flex gap-2 text-sm">
                <Badge variant="default" className="bg-green-500">
                  ✓ {sucessos} Sucessos
                </Badge>
                {avisos > 0 && (
                  <Badge variant="secondary" className="bg-yellow-500">
                    ⚠ {avisos} Avisos
                  </Badge>
                )}
                {erros > 0 && (
                  <Badge variant="destructive">
                    ✗ {erros} Erros
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Barra de Progresso */}
          {testando && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progresso}%` }}
              />
            </div>
          )}

          {/* Informações de Configuração */}
          <Alert>
            <Server className="w-4 h-4" />
            <AlertDescription>
              <strong>Configuração Atual:</strong><br/>
              Project ID: {projectId}<br/>
              Servidor: https://{projectId}.supabase.co/functions/v1/make-server-c61d1ad0/
            </AlertDescription>
          </Alert>

          {/* Resultados dos Testes */}
          {testes.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Resultados dos Testes:</h3>
              
              {testes.map((teste, index) => (
                <Card key={index} className={`border-2 ${getStatusColor(teste.status)}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(teste.status)}
                        <div>
                          <h4 className="font-medium">{teste.nome}</h4>
                          <p className="text-sm text-gray-600">{teste.detalhes}</p>
                        </div>
                      </div>
                      
                      {teste.tempo && (
                        <Badge variant="outline" className="text-xs">
                          {teste.tempo}ms
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Guia de Resolução */}
          {erros > 0 && !testando && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-700">
                <strong>Problemas Detectados:</strong><br/>
                • Verifique se as Edge Functions foram deployadas corretamente<br/>
                • Confirme se as variáveis de ambiente estão configuradas<br/>
                • Teste a conectividade com o Supabase<br/>
                • Consulte os logs do servidor para mais detalhes
              </AlertDescription>
            </Alert>
          )}

          {sucessos === listaTestesa.length && !testando && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-700">
                <strong>Todos os testes passaram!</strong><br/>
                A aplicação está funcionando corretamente e pronta para uso.
              </AlertDescription>
            </Alert>
          )}

          {/* Lista de Funcionalidades para Teste Manual */}
          <div className="mt-8">
            <h3 className="font-semibold text-lg mb-4">Checklist de Teste Manual:</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Autenticação
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p>□ Login funciona</p>
                  <p>□ Logout funciona</p>
                  <p>□ Setup inicial funciona</p>
                  <p>□ Diferentes tipos de usuário</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Disciplinas
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p>□ Dashboard carrega disciplinas</p>
                  <p>□ Clique em disciplina funciona</p>
                  <p>□ Progresso é exibido</p>
                  <p>□ Professores são mostrados</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Comunicação
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p>□ Notificações funcionam</p>
                  <p>□ Comunicados carregam</p>
                  <p>□ Fórum funciona</p>
                  <p>□ Mensagens são exibidas</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Funcionalidades
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p>□ Boletim carrega</p>
                  <p>□ Horário escolar abre</p>
                  <p>□ Perfil de usuário funciona</p>
                  <p>□ Navegação responsiva</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}