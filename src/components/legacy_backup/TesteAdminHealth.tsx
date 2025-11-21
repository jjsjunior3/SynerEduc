import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface TesteAdminHealthProps {
  onVoltar: () => void;
}

interface ResultadoTeste {
  status: 'sucesso' | 'erro' | 'testando';
  tempo?: number;
  dados?: any;
  erro?: string;
}

export function TesteAdminHealth({ onVoltar }: TesteAdminHealthProps) {
  const [resultados, setResultados] = useState<Record<string, ResultadoTeste>>({});
  const [testando, setTestando] = useState(false);

  const testarRota = async (nome: string, endpoint: string) => {
    setResultados(prev => ({ ...prev, [nome]: { status: 'testando' } }));
    
    const inicioTempo = Date.now();
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0${endpoint}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(10000) // 10 segundos timeout
        }
      );

      const tempo = Date.now() - inicioTempo;
      
      if (response.ok) {
        const dados = await response.json();
        setResultados(prev => ({
          ...prev,
          [nome]: {
            status: 'sucesso',
            tempo,
            dados
          }
        }));
      } else {
        const textoErro = await response.text();
        setResultados(prev => ({
          ...prev,
          [nome]: {
            status: 'erro',
            tempo,
            erro: `HTTP ${response.status}: ${textoErro}`
          }
        }));
      }
    } catch (error) {
      const tempo = Date.now() - inicioTempo;
      setResultados(prev => ({
        ...prev,
        [nome]: {
          status: 'erro',
          tempo,
          erro: error instanceof Error ? error.message : String(error)
        }
      }));
    }
  };

  const executarTestes = async () => {
    setTestando(true);
    setResultados({});

    const testes = [
      { nome: 'Health Geral', endpoint: '/health' },
      { nome: 'Admin Health', endpoint: '/admin/health' },
      { nome: 'Status Setup', endpoint: '/auth/setup-status' },
      { nome: 'Lista Usuários', endpoint: '/admin/usuarios' },
      { nome: 'Estatísticas Rápidas', endpoint: '/admin/estatisticas-rapidas' },
      { nome: 'Relatórios Admin', endpoint: '/admin/relatorios' }
    ];

    for (const teste of testes) {
      await testarRota(teste.nome, teste.endpoint);
      // Pequena pausa entre testes
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setTestando(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sucesso':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'erro':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'testando':
        return <Clock className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sucesso':
        return 'border-green-200 bg-green-50';
      case 'erro':
        return 'border-red-200 bg-red-50';
      case 'testando':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-orange-600" />
              Teste da Rota Admin Health
            </CardTitle>
            <CardDescription>
              Testando a nova rota /admin/health e outras rotas relacionadas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-4">
              <Button 
                onClick={executarTestes}
                disabled={testando}
                className="flex-1"
              >
                {testando ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Testando...
                  </>
                ) : (
                  'Executar Testes'
                )}
              </Button>
              <Button variant="outline" onClick={onVoltar}>
                Voltar
              </Button>
            </div>

            {Object.keys(resultados).length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Resultados dos Testes</h3>
                <div className="grid gap-4">
                  {Object.entries(resultados).map(([nome, resultado]) => (
                    <div
                      key={nome}
                      className={`p-4 rounded-lg border ${getStatusColor(resultado.status)}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(resultado.status)}
                          <span className="font-medium">{nome}</span>
                        </div>
                        {resultado.tempo && (
                          <span className="text-sm text-gray-600">
                            {resultado.tempo}ms
                          </span>
                        )}
                      </div>
                      
                      {resultado.status === 'sucesso' && resultado.dados && (
                        <div className="mt-2">
                          <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-32">
                            {JSON.stringify(resultado.dados, null, 2)}
                          </pre>
                        </div>
                      )}
                      
                      {resultado.status === 'erro' && resultado.erro && (
                        <div className="mt-2 text-sm text-red-700 bg-red-100 p-2 rounded">
                          {resultado.erro}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">📋 Sobre este teste:</h4>
              <ul className="space-y-1">
                <li>• Testa a nova rota <code>/admin/health</code> que foi adicionada</li>
                <li>• Verifica outras rotas administrativas importantes</li>
                <li>• Mostra tempo de resposta e dados retornados</li>
                <li>• Timeout configurado para 10 segundos por teste</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}