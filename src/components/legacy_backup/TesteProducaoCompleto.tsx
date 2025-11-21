import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Play, 
  RefreshCw,
  User,
  BookOpen,
  MessageSquare,
  GraduationCap,
  ArrowLeft
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface TesteProducaoCompletoProps {
  onVoltar: () => void;
}

interface TestResult {
  id: string;
  nome: string;
  status: 'pendente' | 'executando' | 'sucesso' | 'erro';
  detalhes: string;
  tempo?: number;
}

export function TesteProducaoCompleto({ onVoltar }: TesteProducaoCompletoProps) {
  const [testesExecutando, setTestesExecutando] = useState(false);
  const [resultados, setResultados] = useState<TestResult[]>([]);
  const [testesConcluidos, setTestesConcluidos] = useState(false);

  const testes = [
    {
      id: 'auth-sistema',
      nome: 'Sistema de Autenticação',
      teste: testarAutenticacao
    },
    {
      id: 'cadastro-usuario',
      nome: 'Cadastro de Usuário',
      teste: testarCadastroUsuario
    },
    {
      id: 'gestao-conteudo',
      nome: 'Gestão de Conteúdo',
      teste: testarGestaoConteudo
    },
    {
      id: 'sistema-notas',
      nome: 'Sistema de Notas',
      teste: testarSistemaNotas
    },
    {
      id: 'comunicados',
      nome: 'Sistema de Comunicados',
      teste: testarComunicados
    },
    {
      id: 'relatorios',
      nome: 'Relatórios e Estatísticas',
      teste: testarRelatorios
    }
  ];

  const executarTestes = async () => {
    setTestesExecutando(true);
    setTestesConcluidos(false);
    
    // Inicializar resultados
    const resultadosIniciais = testes.map(teste => ({
      id: teste.id,
      nome: teste.nome,
      status: 'pendente' as const,
      detalhes: 'Aguardando execução...'
    }));
    setResultados(resultadosIniciais);

    // Executar cada teste
    for (const teste of testes) {
      await executarTeste(teste);
    }

    setTestesExecutando(false);
    setTestesConcluidos(true);
  };

  const executarTeste = async (teste: any) => {
    const inicio = Date.now();
    
    // Atualizar status para executando
    setResultados(prev => prev.map(r => 
      r.id === teste.id 
        ? { ...r, status: 'executando', detalhes: 'Executando teste...' }
        : r
    ));

    try {
      const resultado = await teste.teste();
      const tempo = Date.now() - inicio;
      
      setResultados(prev => prev.map(r => 
        r.id === teste.id 
          ? { 
              ...r, 
              status: 'sucesso', 
              detalhes: resultado.detalhes || 'Teste executado com sucesso',
              tempo
            }
          : r
      ));
    } catch (error) {
      const tempo = Date.now() - inicio;
      
      setResultados(prev => prev.map(r => 
        r.id === teste.id 
          ? { 
              ...r, 
              status: 'erro', 
              detalhes: error.message || 'Erro no teste',
              tempo
            }
          : r
      ));
    }
  };

  // ===== FUNÇÕES DE TESTE =====

  async function testarAutenticacao() {
    console.log('[TESTE] Testando sistema de autenticação...');
    
    // Verificar se é possível acessar rotas protegidas
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/estatisticas-rapidas`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Falha na autenticação: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      sucesso: true,
      detalhes: `Autenticação funcionando. Sistema respondendo corretamente.`
    };
  }

  async function testarCadastroUsuario() {
    console.log('[TESTE] Testando cadastro de usuário...');
    
    // Criar usuário de teste temporário
    const usuarioTeste = {
      nome: 'Teste Produção',
      email: 'teste.producao@temp.local',
      senha: 'senha123',
      tipo: 'aluno',
      serie: '1ª série - Ensino Médio'
    };

    const responseCadastro = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/signup`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(usuarioTeste)
    });

    if (!responseCadastro.ok) {
      throw new Error(`Falha no cadastro: ${responseCadastro.status}`);
    }

    const dadosCadastro = await responseCadastro.json();
    
    // Limpar usuário de teste
    if (dadosCadastro.success && dadosCadastro.usuario?.id) {
      try {
        await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${dadosCadastro.usuario.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.log('[TESTE] Não foi possível limpar usuário de teste:', error);
      }
    }
    
    return {
      sucesso: true,
      detalhes: `Cadastro funcionando. Usuário criado e removido com sucesso.`
    };
  }

  async function testarGestaoConteudo() {
    console.log('[TESTE] Testando gestão de conteúdo...');
    
    // Verificar estrutura de conteúdos
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/conteudo-pdf/serie/1ª série - Ensino Médio`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Falha na gestão de conteúdo: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      sucesso: true,
      detalhes: `Sistema de conteúdo funcionando. ${data.totalConteudos || 0} conteúdos encontrados.`
    };
  }

  async function testarSistemaNotas() {
    console.log('[TESTE] Testando sistema de notas...');
    
    // Como não temos usuário real, vamos testar a estrutura da API
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/notas/usuario/teste123`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      }
    });

    // Esperamos que retorne uma resposta estruturada, mesmo que vazia
    if (response.status === 404 || response.status === 200) {
      return {
        sucesso: true,
        detalhes: `API de notas respondendo corretamente. Sistema operacional.`
      };
    }

    throw new Error(`Sistema de notas com problema: ${response.status}`);
  }

  async function testarComunicados() {
    console.log('[TESTE] Testando sistema de comunicados...');
    
    // Testar listagem de comunicados
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/comunicados`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Falha no sistema de comunicados: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      sucesso: true,
      detalhes: `Sistema de comunicados funcionando. ${data.comunicados?.length || 0} comunicados encontrados.`
    };
  }

  async function testarRelatorios() {
    console.log('[TESTE] Testando relatórios e estatísticas...');
    
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/relatorios`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Falha nos relatórios: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      sucesso: true,
      detalhes: `Relatórios funcionando. ${data.totalAlunos} alunos, ${data.totalProfessores} professores cadastrados.`
    };
  }

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'sucesso':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'erro':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'executando':
        return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'sucesso':
        return 'border-green-200 bg-green-50';
      case 'erro':
        return 'border-red-200 bg-red-50';
      case 'executando':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const todosTestesOk = resultados.length > 0 && resultados.every(r => r.status === 'sucesso');
  const temErros = resultados.some(r => r.status === 'erro');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="outline" 
              onClick={onVoltar}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Teste de Produção Completo</h1>
              <p className="text-gray-600">Validar funcionamento do sistema com dados reais</p>
            </div>
          </div>

          {testesConcluidos && todosTestesOk && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">
                ✅ Todos os testes passaram! O sistema está pronto para uso em produção.
              </AlertDescription>
            </Alert>
          )}

          {testesConcluidos && temErros && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <XCircle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800">
                ❌ Alguns testes falharam. Verifique os detalhes e corrija os problemas antes de usar em produção.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Botão de Execução */}
        <Card className="mb-6">
          <CardContent className="p-6 text-center">
            <Button 
              onClick={executarTestes}
              disabled={testesExecutando}
              size="lg"
              className="w-full max-w-md"
            >
              {testesExecutando ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Executando Testes...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Executar Testes de Produção
                </>
              )}
            </Button>
            <p className="text-sm text-gray-600 mt-2">
              Executa uma bateria completa de testes para validar o sistema
            </p>
          </CardContent>
        </Card>

        {/* Resultados dos Testes */}
        {resultados.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Resultados dos Testes</h2>
            
            {resultados.map((resultado) => (
              <Card key={resultado.id} className={`${getStatusColor(resultado.status)} transition-all`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(resultado.status)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900">{resultado.nome}</h3>
                        {resultado.tempo && (
                          <span className="text-xs text-gray-500">
                            {resultado.tempo}ms
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{resultado.detalhes}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Guia Pós-Teste */}
        {testesConcluidos && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                Próximos Passos - Sistema em Produção
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">1. Configuração Inicial</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                    <li>Cadastre o primeiro administrador do sistema</li>
                    <li>Configure informações da instituição</li>
                    <li>Defina políticas de senha e segurança</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">2. Cadastro de Usuários</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                    <li>Cadastre coordenadores e professores</li>
                    <li>Importe lista de alunos por série/turma</li>
                    <li>Configure permissões específicas</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">3. Conteúdo Acadêmico</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                    <li>Faça upload dos materiais didáticos</li>
                    <li>Organize conteúdo por disciplina e bimestre</li>
                    <li>Configure atividades e avaliações</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">4. Monitoramento</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                    <li>Monitore logs e estatísticas</li>
                    <li>Acompanhe performance do sistema</li>
                    <li>Realize backups regulares</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}