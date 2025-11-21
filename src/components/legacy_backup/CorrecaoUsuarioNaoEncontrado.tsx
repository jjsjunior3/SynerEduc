import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Search, 
  Database, 
  Users, 
  Zap,
  Eye,
  Edit,
  Save
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface CorrecaoUsuarioNaoEncontradoProps {
  onVoltar: () => void;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo: string;
  ativo: boolean;
  criadoEm?: string;
  atualizadoEm?: string;
}

interface TestResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export function CorrecaoUsuarioNaoEncontrado({ onVoltar }: CorrecaoUsuarioNaoEncontradoProps) {
  const [executando, setExecutando] = useState(false);
  const [resultados, setResultados] = useState<{ [key: string]: TestResult }>({});
  const [usuariosKV, setUsuariosKV] = useState<any[]>([]);
  const [usuariosAPI, setUsuariosAPI] = useState<Usuario[]>([]);
  const [problemaIdentificado, setProblemaIdentificado] = useState<string>('');
  const [usuarioTeste, setUsuarioTeste] = useState<Usuario | null>(null);
  const [testeEdicao, setTesteEdicao] = useState<TestResult | null>(null);

  const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0`;

  const fazerRequisicao = async (url: string, metodo: string = 'GET', dados?: any): Promise<TestResult> => {
    try {
      const opcoes: RequestInit = {
        method: metodo,
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      };

      if (dados && (metodo === 'POST' || metodo === 'PUT')) {
        opcoes.body = JSON.stringify(dados);
      }

      const response = await fetch(url, opcoes);
      
      let resultado;
      try {
        resultado = await response.json();
      } catch (e) {
        resultado = { message: await response.text() };
      }

      console.log(`[CORREÇÃO] ${metodo} ${url} - Status: ${response.status}`, resultado);

      return {
        success: response.ok,
        message: response.ok ? 'Sucesso' : `Erro ${response.status}`,
        data: resultado,
        error: !response.ok ? (resultado.error || resultado.message || 'Erro desconhecido') : undefined
      };

    } catch (error) {
      console.error(`[CORREÇÃO] Erro na requisição ${metodo} ${url}:`, error);
      return {
        success: false,
        message: 'Erro de rede',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  };

  const diagnosticarProblema = async () => {
    setExecutando(true);
    setResultados({});
    setProblemaIdentificado('');
    
    toast.info('🔍 Iniciando diagnóstico do erro "Usuário não encontrado"...');

    try {
      // 1. Testar conectividade com o servidor
      toast.info('1️⃣ Testando conectividade com servidor...');
      const healthResult = await fazerRequisicao(`${baseUrl}/health`);
      setResultados(prev => ({ ...prev, 'health': healthResult }));
      
      if (!healthResult.success) {
        setProblemaIdentificado('Servidor não está respondendo');
        return;
      }

      // 2. Testar rota de admin health
      toast.info('2️⃣ Testando rota administrativa...');
      const adminHealthResult = await fazerRequisicao(`${baseUrl}/admin/health`);
      setResultados(prev => ({ ...prev, 'adminHealth': adminHealthResult }));

      // 3. Listar usuários via KV Store direto (se possível)
      toast.info('3️⃣ Verificando usuários no sistema...');
      const usuariosResult = await fazerRequisicao(`${baseUrl}/admin/usuarios`);
      setResultados(prev => ({ ...prev, 'listarUsuarios': usuariosResult }));
      
      if (usuariosResult.success && usuariosResult.data?.usuarios) {
        setUsuariosAPI(usuariosResult.data.usuarios);
        
        if (usuariosResult.data.usuarios.length === 0) {
          setProblemaIdentificado('Nenhum usuário encontrado no sistema');
          return;
        }

        // 4. Testar edição com primeiro usuário
        const primeiroUsuario = usuariosResult.data.usuarios[0];
        setUsuarioTeste(primeiroUsuario);
        
        toast.info('4️⃣ Testando edição de usuário...');
        
        // Testar com rota padrão
        const testeEdicaoResult = await fazerRequisicao(
          `${baseUrl}/admin/usuarios/${primeiroUsuario.id}`,
          'PUT',
          { nome: primeiroUsuario.nome + ' (Teste)' }
        );
        setResultados(prev => ({ ...prev, 'testeEdicao': testeEdicaoResult }));
        
        if (!testeEdicaoResult.success) {
          // Testar com rota de compatibilidade
          toast.info('4️⃣.1 Testando rota de compatibilidade...');
          const testeCompatibilidadeResult = await fazerRequisicao(
            `${baseUrl}/admin/usuarios/user/${primeiroUsuario.id}`,
            'PUT',
            { nome: primeiroUsuario.nome }
          );
          setResultados(prev => ({ ...prev, 'testeCompatibilidade': testeCompatibilidadeResult }));
          setTesteEdicao(testeCompatibilidadeResult);
          
          if (!testeCompatibilidadeResult.success) {
            setProblemaIdentificado(`Erro ao editar usuário: ${testeCompatibilidadeResult.error}`);
          }
        } else {
          setTesteEdicao(testeEdicaoResult);
        }

        // 5. Diagnóstico detalhado via API
        toast.info('5️⃣ Executando diagnóstico detalhado...');
        const diagnosticoDetalhadoResult = await fazerRequisicao(`${baseUrl}/admin/diagnostico-usuarios`);
        setResultados(prev => ({ ...prev, 'diagnosticoDetalhado': diagnosticoDetalhadoResult }));

        // 5.1 Diagnóstico específico do usuário se houver
        if (primeiroUsuario) {
          const diagnosticoEspecificoResult = await fazerRequisicao(`${baseUrl}/admin/usuarios/${primeiroUsuario.id}/diagnostico`);
          setResultados(prev => ({ ...prev, 'diagnosticoEspecifico': diagnosticoEspecificoResult }));
        }

        // 5.2 Analisar estrutura de dados local
        await analisarEstruturaDados(usuariosResult.data.usuarios);

      } else {
        setProblemaIdentificado('Falha ao listar usuários do sistema');
      }

      // 6. Testar limpeza de dados se necessário
      toast.info('6️⃣ Verificando integridade dos dados...');
      const limpezaResult = await fazerRequisicao(`${baseUrl}/admin/limpar-dados`, 'POST');
      setResultados(prev => ({ ...prev, 'limpezaDados': limpezaResult }));

    } catch (error) {
      console.error('[CORREÇÃO] Erro no diagnóstico:', error);
      setProblemaIdentificado(`Erro no diagnóstico: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setExecutando(false);
      toast.success('🎉 Diagnóstico concluído!');
    }
  };

  const analisarEstruturaDados = async (usuarios: Usuario[]) => {
    const problemas = [];
    
    usuarios.forEach((usuario, index) => {
      if (!usuario.id) {
        problemas.push(`Usuário ${index + 1}: ID ausente`);
      }
      if (!usuario.nome) {
        problemas.push(`Usuário ${index + 1}: Nome ausente`);
      }
      if (!usuario.email) {
        problemas.push(`Usuário ${index + 1}: Email ausente`);
      }
      if (typeof usuario.ativo !== 'boolean') {
        problemas.push(`Usuário ${index + 1}: Campo 'ativo' inválido`);
      }
    });

    if (problemas.length > 0) {
      setProblemaIdentificado(`Problemas na estrutura: ${problemas.join(', ')}`);
    }
  };

  const corrigirAutomaticamente = async () => {
    setExecutando(true);
    toast.info('🔧 Iniciando correção automática...');

    try {
      // 1. Reinicializar sistema
      await fazerRequisicao(`${baseUrl}/auth/inicializar-sistema`, 'POST');
      
      // 2. Limpar dados inconsistentes
      await fazerRequisicao(`${baseUrl}/admin/limpar-dados`, 'POST');
      
      // 3. Aguardar um pouco
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 4. Executar diagnóstico novamente
      await diagnosticarProblema();
      
      toast.success('🎉 Correção automática concluída!');
      
    } catch (error) {
      toast.error('❌ Erro na correção automática');
      console.error('[CORREÇÃO] Erro na correção:', error);
    } finally {
      setExecutando(false);
    }
  };

  const criarUsuarioTeste = async () => {
    setExecutando(true);
    toast.info('👤 Criando usuário de teste...');

    try {
      const usuarioTeste = {
        nome: 'Usuário Teste',
        email: `teste_${Date.now()}@exemplo.com`,
        senha: 'teste123456',
        tipo: 'aluno'
      };

      const resultado = await fazerRequisicao(`${baseUrl}/admin/usuarios`, 'POST', usuarioTeste);
      setResultados(prev => ({ ...prev, 'criarUsuarioTeste': resultado }));
      
      if (resultado.success) {
        toast.success('✅ Usuário de teste criado com sucesso!');
        // Reexecutar diagnóstico
        await diagnosticarProblema();
      } else {
        toast.error('❌ Falha ao criar usuário de teste');
      }
      
    } catch (error) {
      toast.error('❌ Erro ao criar usuário de teste');
      console.error('[CORREÇÃO] Erro ao criar usuário teste:', error);
    } finally {
      setExecutando(false);
    }
  };

  const obterIconeStatus = (resultado?: TestResult) => {
    if (!resultado) return <RefreshCw className="w-4 h-4 text-gray-400" />;
    return resultado.success ? 
      <CheckCircle className="w-4 h-4 text-green-600" /> : 
      <XCircle className="w-4 h-4 text-red-600" />;
  };

  const obterBadgeStatus = (resultado?: TestResult) => {
    if (!resultado) return <Badge variant="secondary">Não testado</Badge>;
    return resultado.success ? 
      <Badge variant="default" className="bg-green-100 text-green-800">Sucesso</Badge> : 
      <Badge variant="destructive">Erro</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              Correção: Usuário Não Encontrado
            </h1>
            <p className="text-gray-600 mt-2">
              Diagnóstico e correção automática do erro "Usuário não encontrado"
            </p>
          </div>
          <Button onClick={onVoltar} variant="outline">
            Voltar
          </Button>
        </div>

        {/* Problema Identificado */}
        {problemaIdentificado && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-800">
              <strong>Problema Identificado:</strong> {problemaIdentificado}
            </AlertDescription>
          </Alert>
        )}

        {/* Ações de Correção */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-600" />
              Ações de Correção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                onClick={diagnosticarProblema}
                disabled={executando}
                className="flex items-center gap-2"
                variant="default"
              >
                {executando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Diagnosticar Problema
              </Button>
              
              <Button 
                onClick={corrigirAutomaticamente}
                disabled={executando}
                className="flex items-center gap-2"
                variant="secondary"
              >
                {executando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Correção Automática
              </Button>
              
              <Button 
                onClick={criarUsuarioTeste}
                disabled={executando}
                className="flex items-center gap-2"
                variant="outline"
              >
                {executando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                Criar Usuário Teste
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        <Tabs defaultValue="diagnostico" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="diagnostico">Diagnóstico</TabsTrigger>
            <TabsTrigger value="usuarios">Usuários</TabsTrigger>
            <TabsTrigger value="teste">Teste de Edição</TabsTrigger>
          </TabsList>

          {/* Tab: Diagnóstico */}
          <TabsContent value="diagnostico">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Resultados do Diagnóstico</h3>
              
              {Object.entries(resultados).map(([teste, resultado]) => (
                <Card key={teste}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {obterIconeStatus(resultado)}
                        <CardTitle className="text-lg capitalize">{teste.replace(/([A-Z])/g, ' $1')}</CardTitle>
                      </div>
                      {obterBadgeStatus(resultado)}
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Resultado</label>
                        <div className={`px-3 py-2 rounded text-sm ${
                          resultado.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {resultado.message}
                        </div>
                      </div>

                      {resultado.error && (
                        <div>
                          <label className="block text-xs font-medium text-red-500 mb-1">Erro</label>
                          <div className="px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            {resultado.error}
                          </div>
                        </div>
                      )}

                      {resultado.data && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Dados</label>
                          <div className="px-3 py-2 bg-gray-50 rounded text-xs font-mono max-h-32 overflow-y-auto">
                            <pre>{JSON.stringify(resultado.data, null, 2)}</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Tab: Usuários */}
          <TabsContent value="usuarios">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Usuários no Sistema</h3>
                <Badge variant="outline">{usuariosAPI.length} usuários</Badge>
              </div>
              
              {usuariosAPI.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {usuariosAPI.map((usuario, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{usuario.nome}</CardTitle>
                          <Badge variant={usuario.ativo ? "default" : "secondary"}>
                            {usuario.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div><strong>ID:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{usuario.id}</code></div>
                          <div><strong>Email:</strong> {usuario.email}</div>
                          <div><strong>Tipo:</strong> {usuario.tipo}</div>
                          {usuario.criadoEm && (
                            <div><strong>Criado em:</strong> {new Date(usuario.criadoEm).toLocaleString()}</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Nenhum usuário encontrado no sistema</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Tab: Teste de Edição */}
          <TabsContent value="teste">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Teste de Edição de Usuário</h3>
              
              {usuarioTeste ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Edit className="w-5 h-5" />
                      Usuário de Teste: {usuarioTeste.nome}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">ID</label>
                          <code className="block px-3 py-2 bg-gray-100 rounded text-sm">{usuarioTeste.id}</code>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                          <div className="px-3 py-2 bg-gray-100 rounded text-sm">{usuarioTeste.email}</div>
                        </div>
                      </div>
                      
                      {testeEdicao && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Resultado do Teste</label>
                          <div className={`px-3 py-2 rounded text-sm ${
                            testeEdicao.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {testeEdicao.success ? '✅ Edição funcionando corretamente' : `❌ ${testeEdicao.error}`}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Execute o diagnóstico para testar a edição de usuários</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Instruções de Correção */}
        <Card className="mt-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800">Soluções Recomendadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-blue-700">
              <p><strong>🔍 PROBLEMA COMUM:</strong> IDs de usuários desconectados entre frontend e backend</p>
              <p><strong>💡 SOLUÇÃO IMEDIATA:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Execute "Diagnosticar Problema" para identificar a causa exata</li>
                <li>Use "Correção Automática" para resolver automaticamente</li>
                <li>Se persistir, crie "Usuário de Teste" para validar o sistema</li>
                <li>Verifique se o ID do usuário na URL está correto</li>
              </ul>
              <p><strong>🛠️ CORREÇÃO AVANÇADA:</strong> O sistema vai detectar e corrigir automaticamente problemas de estrutura de dados</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}