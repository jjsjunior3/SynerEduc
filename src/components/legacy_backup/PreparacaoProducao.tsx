import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Database, 
  Users, 
  FileText, 
  Settings,
  Trash2,
  Shield,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface PreparacaoProducaoProps {
  onVoltar: () => void;
}

interface StatusItem {
  id: string;
  nome: string;
  status: 'sucesso' | 'erro' | 'aviso' | 'pendente';
  detalhes: string;
  acao?: () => Promise<void>;
}

export function PreparacaoProducao({ onVoltar }: PreparacaoProducaoProps) {
  const [loading, setLoading] = useState(false);
  const [etapaAtual, setEtapaAtual] = useState<string>('');
  const [statusItens, setStatusItens] = useState<StatusItem[]>([]);
  const [limpezaConcluida, setLimpezaConcluida] = useState(false);

  useEffect(() => {
    iniciarAuditoria();
  }, []);

  const iniciarAuditoria = async () => {
    setLoading(true);
    setEtapaAtual('Iniciando auditoria do sistema...');

    try {
      const itens: StatusItem[] = [
        {
          id: 'dados-teste',
          nome: 'Dados de Teste no KV Store',
          status: 'pendente',
          detalhes: 'Verificando dados fictícios, usuários demo e placeholders',
          acao: limparDadosTeste
        },
        {
          id: 'usuarios-demo',
          nome: 'Usuários de Demonstração',
          status: 'pendente',
          detalhes: 'Removendo usuários criados para testes',
          acao: limparUsuariosDemo
        },
        {
          id: 'conteudo-demo',
          nome: 'Conteúdo de Demonstração',
          status: 'pendente',
          detalhes: 'Limpando PDFs e materiais de teste',
          acao: limparConteudoDemo
        },
        {
          id: 'configuracoes',
          nome: 'Configurações do Sistema',
          status: 'pendente',
          detalhes: 'Validando configurações para produção',
          acao: validarConfiguracoes
        },
        {
          id: 'estrutura-dados',
          nome: 'Estrutura de Dados',
          status: 'pendente',
          detalhes: 'Verificando integridade da estrutura para dados reais',
          acao: validarEstruturaDados
        }
      ];

      setStatusItens(itens);
      
      // Executar verificações
      for (const item of itens) {
        await executarVerificacao(item);
      }

    } catch (error) {
      console.error('Erro na auditoria:', error);
    } finally {
      setLoading(false);
      setEtapaAtual('');
    }
  };

  const executarVerificacao = async (item: StatusItem) => {
    setEtapaAtual(`Verificando: ${item.nome}`);
    
    try {
      if (item.acao) {
        await item.acao();
        atualizarStatus(item.id, 'sucesso', 'Verificação concluída com sucesso');
      }
    } catch (error) {
      console.error(`Erro em ${item.nome}:`, error);
      atualizarStatus(item.id, 'erro', `Erro: ${error.message}`);
    }
  };

  const atualizarStatus = (id: string, status: StatusItem['status'], detalhes: string) => {
    setStatusItens(prev => prev.map(item => 
      item.id === id ? { ...item, status, detalhes } : item
    ));
  };

  const limparDadosTeste = async () => {
    console.log('[PRODUCAO] Iniciando limpeza de dados de teste...');
    
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/limpeza-producao`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        operacao: 'limpar-dados-teste',
        confirmarLimpeza: true
      })
    });

    if (!response.ok) {
      throw new Error(`Erro ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[PRODUCAO] Dados de teste removidos:', data);
  };

  const limparUsuariosDemo = async () => {
    console.log('[PRODUCAO] Iniciando limpeza de usuários demo...');
    
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/limpeza-producao`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        operacao: 'limpar-usuarios-demo',
        confirmarLimpeza: true
      })
    });

    if (!response.ok) {
      throw new Error(`Erro ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[PRODUCAO] Usuários demo removidos:', data);
  };

  const limparConteudoDemo = async () => {
    console.log('[PRODUCAO] Iniciando limpeza de conteúdo demo...');
    
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/limpeza-producao`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        operacao: 'limpar-conteudo-demo',
        confirmarLimpeza: true
      })
    });

    if (!response.ok) {
      throw new Error(`Erro ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[PRODUCAO] Conteúdo demo removido:', data);
  };

  const validarConfiguracoes = async () => {
    console.log('[PRODUCAO] Validando configurações do sistema...');
    
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/validar-configuracoes`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Erro ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[PRODUCAO] Configurações validadas:', data);
  };

  const validarEstruturaDados = async () => {
    console.log('[PRODUCAO] Validando estrutura de dados...');
    
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/validar-estrutura`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Erro ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[PRODUCAO] Estrutura validada:', data);
  };

  const executarLimpezaCompleta = async () => {
    if (!confirm('⚠️ ATENÇÃO: Esta operação removerá TODOS os dados de teste e demonstração do sistema. Esta ação é IRREVERSÍVEL. Tem certeza que deseja continuar?')) {
      return;
    }

    if (!confirm('🔥 CONFIRMAÇÃO FINAL: Você confirma que deseja preparar o sistema para PRODUÇÃO, removendo todos os dados fictícios?')) {
      return;
    }

    setLoading(true);
    setEtapaAtual('Executando limpeza completa para produção...');

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/preparacao-producao`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          confirmarLimpezaCompleta: true,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[PRODUCAO] Limpeza completa executada:', data);
      
      setLimpezaConcluida(true);
      alert('✅ Sistema preparado para produção com sucesso! Todos os dados de teste foram removidos.');
      
    } catch (error) {
      console.error('[PRODUCAO] Erro na limpeza completa:', error);
      alert('❌ Erro na preparação para produção. Verifique o console para detalhes.');
    } finally {
      setLoading(false);
      setEtapaAtual('');
    }
  };

  const getStatusIcon = (status: StatusItem['status']) => {
    switch (status) {
      case 'sucesso':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'erro':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'aviso':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      default:
        return <RefreshCw className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: StatusItem['status']) => {
    switch (status) {
      case 'sucesso':
        return 'border-green-200 bg-green-50';
      case 'erro':
        return 'border-red-200 bg-red-50';
      case 'aviso':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const todosOsItensOk = statusItens.every(item => item.status === 'sucesso');

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
              <h1 className="text-2xl font-bold text-gray-900">Preparação para Produção</h1>
              <p className="text-gray-600">Remover dados de teste e preparar sistema para dados reais</p>
            </div>
          </div>

          {limpezaConcluida && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">
                ✅ Sistema preparado para produção com sucesso! Agora você pode cadastrar dados reais.
              </AlertDescription>
            </Alert>
          )}

          {etapaAtual && (
            <Alert className="mb-6">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <AlertDescription>
                {etapaAtual}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Status dos Itens */}
        <div className="grid gap-4 mb-6">
          {statusItens.map((item) => (
            <Card key={item.id} className={`${getStatusColor(item.status)} transition-all`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {getStatusIcon(item.status)}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{item.nome}</h3>
                    <p className="text-sm text-gray-600">{item.detalhes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Ações */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Ações de Preparação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={iniciarAuditoria}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                <Database className="w-4 h-4 mr-2" />
                {loading ? 'Auditando...' : 'Executar Nova Auditoria'}
              </Button>

              {todosOsItensOk && !limpezaConcluida && (
                <Button 
                  onClick={executarLimpezaCompleta}
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {loading ? 'Limpando...' : 'Executar Limpeza Completa'}
                </Button>
              )}

              {limpezaConcluida && (
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertCircle className="w-4 h-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <strong>Próximos passos:</strong>
                    <ul className="mt-2 space-y-1 list-disc list-inside">
                      <li>Cadastrar usuários reais (administradores, professores, alunos)</li>
                      <li>Configurar disciplinas e turmas</li>
                      <li>Fazer upload dos materiais didáticos</li>
                      <li>Realizar teste final com dados reais</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Instruções para Produção */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Guia para Dados Reais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">1. Cadastro de Usuários</h4>
                  <p className="text-gray-600 mb-2">Use o painel administrativo para cadastrar:</p>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                    <li>Administradores e coordenadores</li>
                    <li>Professores com suas respectivas disciplinas</li>
                    <li>Alunos organizados por série e turma</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">2. Gestão de Conteúdo</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                    <li>Faça upload dos materiais didáticos em PDF</li>
                    <li>Organize por disciplina, série e bimestre</li>
                    <li>Configure atividades e avaliações</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">3. Sistema de Notas</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                    <li>Professores podem lançar notas reais</li>
                    <li>Sistema de boletim automático</li>
                    <li>Acompanhamento de frequência</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">4. Comunicação</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                    <li>Envio de comunicados e avisos</li>
                    <li>Sistema de notificações em tempo real</li>
                    <li>Fórum de discussões por disciplina</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}