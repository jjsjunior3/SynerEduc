import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Loader2, CheckCircle, XCircle, AlertCircle, ArrowLeft, User, Users, Settings, Eye } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface TesteAdminUsuariosProps {
  onVoltar: () => void;
}

interface TesteResultado {
  nome: string;
  status: 'success' | 'error' | 'warning' | 'loading';
  mensagem: string;
  detalhes?: string;
}

export function TesteAdminUsuarios({ onVoltar }: TesteAdminUsuariosProps) {
  const [testando, setTestando] = useState(false);
  const [resultados, setResultados] = useState<TesteResultado[]>([]);

  const adicionarResultado = (resultado: TesteResultado) => {
    setResultados(prev => [...prev, resultado]);
  };

  const executarTestes = async () => {
    setTestando(true);
    setResultados([]);

    try {
      // Teste 1: Verificar se a rota de listagem funciona
      adicionarResultado({
        nome: 'Listar Usuários',
        status: 'loading',
        mensagem: 'Testando listagem de usuários...'
      });

      try {
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          adicionarResultado({
            nome: 'Listar Usuários',
            status: 'success',
            mensagem: `✅ ${data.usuarios?.length || 0} usuários encontrados`,
            detalhes: `API funcionando corretamente. Total de usuários: ${data.usuarios?.length || 0}`
          });
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
          adicionarResultado({
            nome: 'Listar Usuários',
            status: 'error',
            mensagem: `❌ Erro HTTP ${response.status}`,
            detalhes: errorData.error || response.statusText
          });
        }
      } catch (error) {
        adicionarResultado({
          nome: 'Listar Usuários',
          status: 'error',
          mensagem: '❌ Erro de conexão',
          detalhes: error.message
        });
      }

      // Teste 2: Verificar se as rotas de administração existem
      const rotasParaTestar = [
        { url: '/admin/relatorios', nome: 'Relatórios Administrativos' },
        { url: '/admin/usuarios', nome: 'API de Usuários' },
      ];

      for (const rota of rotasParaTestar) {
        adicionarResultado({
          nome: rota.nome,
          status: 'loading',
          mensagem: `Testando ${rota.nome.toLowerCase()}...`
        });

        try {
          const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0${rota.url}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            adicionarResultado({
              nome: rota.nome,
              status: 'success',
              mensagem: '✅ Rota funcionando',
              detalhes: `${rota.nome} está disponível e respondendo corretamente`
            });
          } else {
            adicionarResultado({
              nome: rota.nome,
              status: 'warning',
              mensagem: `⚠️ HTTP ${response.status}`,
              detalhes: `Rota existe mas retornou erro ${response.status}`
            });
          }
        } catch (error) {
          adicionarResultado({
            nome: rota.nome,
            status: 'error',
            mensagem: '❌ Rota indisponível',
            detalhes: error.message
          });
        }
      }

      // Teste 3: Verificar estrutura dos dados
      adicionarResultado({
        nome: 'Estrutura dos Dados',
        status: 'loading',
        mensagem: 'Verificando estrutura dos dados de usuários...'
      });

      try {
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          const usuarios = data.usuarios || [];
          
          if (usuarios.length > 0) {
            const primeiroUsuario = usuarios[0];
            const camposEsperados = ['id', 'nome', 'email', 'tipo', 'ativo', 'criadoEm'];
            const camposPresentes = camposEsperados.filter(campo => primeiroUsuario.hasOwnProperty(campo));
            
            if (camposPresentes.length === camposEsperados.length) {
              adicionarResultado({
                nome: 'Estrutura dos Dados',
                status: 'success',
                mensagem: '✅ Estrutura correta',
                detalhes: `Todos os campos esperados estão presentes: ${camposPresentes.join(', ')}`
              });
            } else {
              const camposFaltantes = camposEsperados.filter(campo => !primeiroUsuario.hasOwnProperty(campo));
              adicionarResultado({
                nome: 'Estrutura dos Dados',
                status: 'warning',
                mensagem: '⚠️ Campos faltantes',
                detalhes: `Campos ausentes: ${camposFaltantes.join(', ')}`
              });
            }
          } else {
            adicionarResultado({
              nome: 'Estrutura dos Dados',
              status: 'warning',
              mensagem: '⚠️ Nenhum usuário para verificar',
              detalhes: 'Não foi possível verificar a estrutura pois não há usuários cadastrados'
            });
          }
        }
      } catch (error) {
        adicionarResultado({
          nome: 'Estrutura dos Dados',
          status: 'error',
          mensagem: '❌ Erro ao verificar estrutura',
          detalhes: error.message
        });
      }

      // Resumo final
      const sucessos = resultados.filter(r => r.status === 'success').length;
      const erros = resultados.filter(r => r.status === 'error').length;
      const avisos = resultados.filter(r => r.status === 'warning').length;

      if (erros === 0) {
        toast.success('Todos os testes foram executados com sucesso!');
      } else if (sucessos > erros) {
        toast.warning(`Testes concluídos com ${erros} erro(s) e ${avisos} aviso(s)`);
      } else {
        toast.error(`Vários erros encontrados. Verifique a configuração do servidor.`);
      }

    } catch (error) {
      console.error('Erro durante os testes:', error);
      toast.error('Erro durante a execução dos testes');
    } finally {
      setTestando(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'loading':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'loading':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const totalTestes = resultados.length;
  const sucessos = resultados.filter(r => r.status === 'success').length;
  const erros = resultados.filter(r => r.status === 'error').length;
  const avisos = resultados.filter(r => r.status === 'warning').length;

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
              <h1 className="text-xl font-semibold text-gray-900">Teste de Administração de Usuários</h1>
              <p className="text-sm text-gray-600">Verificar funcionalidades de gerenciamento de usuários</p>
            </div>
          </div>
          <Button 
            onClick={executarTestes}
            disabled={testando}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {testando ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testando...
              </>
            ) : (
              <>
                <Settings className="w-4 h-4 mr-2" />
                Executar Testes
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="p-6">
        {/* Estatísticas dos Testes */}
        {resultados.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{totalTestes}</div>
                <div className="text-sm text-gray-600">Total de Testes</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{sucessos}</div>
                <div className="text-sm text-gray-600">Sucessos</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">{avisos}</div>
                <div className="text-sm text-gray-600">Avisos</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{erros}</div>
                <div className="text-sm text-gray-600">Erros</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Resultados dos Testes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Resultados dos Testes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {resultados.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Settings className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Clique em "Executar Testes" para verificar as funcionalidades</p>
                <p className="text-sm mt-2">Os testes irão verificar se todas as APIs estão funcionando corretamente</p>
              </div>
            ) : (
              <div className="space-y-4">
                {resultados.map((resultado, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${getStatusColor(resultado.status)}`}
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(resultado.status)}
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{resultado.nome}</h3>
                        <p className="text-sm text-gray-600">{resultado.mensagem}</p>
                        {resultado.detalhes && (
                          <p className="text-xs text-gray-500 mt-1">{resultado.detalhes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Funcionalidades Testadas */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Funcionalidades Verificadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">APIs de Administração</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Listagem de todos os usuários</li>
                  <li>• Dados reais dos usuários cadastrados</li>
                  <li>• Estrutura correta dos dados</li>
                  <li>• Relatórios administrativos</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Funcionalidades Implementadas</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Visualização de usuários com dados reais</li>
                  <li>• Edição de dados cadastrais</li>
                  <li>• Redefinição de senhas</li>
                  <li>• Ativação/desativação de usuários</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Próximos Passos */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Como Usar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Badge className="bg-blue-100 text-blue-800">1</Badge>
                <div>
                  <p className="text-sm font-medium">Acesse "Administração de Usuários"</p>
                  <p className="text-xs text-gray-600">No painel administrativo, clique no novo menu "Administração de Usuários"</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge className="bg-blue-100 text-blue-800">2</Badge>
                <div>
                  <p className="text-sm font-medium">Visualize todos os usuários</p>
                  <p className="text-xs text-gray-600">Veja a lista completa com dados reais, filtros e busca</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge className="bg-blue-100 text-blue-800">3</Badge>
                <div>
                  <p className="text-sm font-medium">Edite dados e redefina senhas</p>
                  <p className="text-xs text-gray-600">Use os botões de ação para editar, ativar/desativar ou redefinir senhas</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}