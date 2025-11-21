import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';

interface LimpezaSeguraDoSistemaProps {
  onFechar?: () => void;
}

interface ItemLimpeza {
  categoria: string;
  arquivos: string[];
  descricao: string;
  seguro: boolean;
  impacto: 'baixo' | 'medio' | 'alto';
}

export function LimpezaSeguraDoSistema({ onFechar }: LimpezaSeguraDoSistemaProps) {
  const [etapaAtual, setEtapaAtual] = useState<string>('');
  const [progresso, setProgresso] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [limpezaExecutada, setLimpezaExecutada] = useState(false);

  const itensLimpeza: ItemLimpeza[] = [
    {
      categoria: "Documentação de Histórico",
      arquivos: [
        "APP_OPTIMIZATION_SUMMARY.md",
        "CORRECAO_AUTHCONTEXT_FINAL.md",
        "CORRECAO_DISCIPLINAS_INVALIDAS.md",
        "CORRECAO_ERROS_LOGIN.md",
        "CORRECAO_UPLOAD_TIMEOUT_FINAL.md",
        "SOLUCAO_API_ADMIN.md",
        "TESTE_CORRECOES_LOGIN.md",
        // ... outros arquivos de documentação
      ],
      descricao: "Arquivos .md que documentam correções já aplicadas",
      seguro: true,
      impacto: 'baixo'
    },
    {
      categoria: "Componentes de Teste/Debug",
      arquivos: [
        "TesteLoginRapido.tsx",
        "DiagnosticoApp.tsx",
        "DebugLogin.tsx",
        "TesteCompleto.tsx",
        "SystemDiagnostic.tsx"
      ],
      descricao: "Componentes criados apenas para teste e debug",
      seguro: true,
      impacto: 'baixo'
    },
    {
      categoria: "Componentes de Correção Antiga",
      arquivos: [
        "CorrecaoAutomatica.tsx",
        "CorrecaoErroUpdatedAt.tsx",
        "FixAdminEmergencia.tsx",
        "CorrecaoLoginDefinitiva.tsx"
      ],
      descricao: "Componentes criados para corrigir problemas específicos já resolvidos",
      seguro: true,
      impacto: 'medio'
    },
    {
      categoria: "Contextos Auth Alternativos",
      arquivos: [
        "AuthContext.tsx",
        "AuthContextSimple.tsx",
        "AuthContextRobust.tsx",
        "AuthContextUltraSimple.tsx"
      ],
      descricao: "Versões antigas do contexto de autenticação (manter apenas AuthContextOptimizedFixed)",
      seguro: true,
      impacto: 'medio'
    },
    {
      categoria: "Hooks Não Utilizados",
      arquivos: [
        "useTimeoutProtection.ts",
        "useTimeoutProtectionFixed.ts",
        "useTimeoutProtectionSimple.ts"
      ],
      descricao: "Hooks personalizados que não são utilizados no código atual",
      seguro: true,
      impacto: 'baixo'
    },
    {
      categoria: "Backend Alternativo",
      arquivos: [
        "index-fixed-routes.tsx",
        "pdf-routes-addition.tsx",
        "backend-disciplinas.ts",
        "src/" // diretório completo
      ],
      descricao: "Versões alternativas do backend (manter apenas index.tsx principal)",
      seguro: false, // Precisa verificação
      impacto: 'alto'
    }
  ];

  const adicionarLog = (mensagem: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `${timestamp}: ${mensagem}`]);
  };

  const simularLimpeza = async () => {
    setEtapaAtual('Iniciando simulação de limpeza...');
    setProgresso(0);
    setLogs([]);
    
    adicionarLog('🧹 Iniciando simulação de limpeza do projeto');
    
    for (let i = 0; i < itensLimpeza.length; i++) {
      const item = itensLimpeza[i];
      setEtapaAtual(`Analisando: ${item.categoria}`);
      setProgresso(((i + 1) / itensLimpeza.length) * 100);
      
      adicionarLog(`📂 Categoria: ${item.categoria}`);
      adicionarLog(`📊 Impacto: ${item.impacto.toUpperCase()}`);
      adicionarLog(`🔒 Seguro: ${item.seguro ? 'SIM' : 'REQUER VERIFICAÇÃO'}`);
      adicionarLog(`📁 Arquivos: ${item.arquivos.length} itens`);
      
      if (item.seguro) {
        adicionarLog(`✅ ${item.categoria} - PRONTO PARA REMOÇÃO`);
      } else {
        adicionarLog(`⚠️ ${item.categoria} - REQUER ANÁLISE MANUAL`);
      }
      
      adicionarLog('---');
      
      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setEtapaAtual('Simulação concluída');
    adicionarLog('🎯 RESUMO DA SIMULAÇÃO:');
    adicionarLog(`📊 ${itensLimpeza.filter(i => i.seguro).length} categorias seguras para limpeza`);
    adicionarLog(`⚠️ ${itensLimpeza.filter(i => !i.seguro).length} categorias que precisam verificação`);
    adicionarLog('💡 Execute a limpeza real apenas após análise');
  };

  const getImpactoBadgeVariant = (impacto: string) => {
    switch (impacto) {
      case 'baixo': return 'default';
      case 'medio': return 'secondary';
      case 'alto': return 'destructive';
      default: return 'outline';
    }
  };

  const calcularEconomia = () => {
    const totalArquivos = itensLimpeza.reduce((acc, item) => acc + item.arquivos.length, 0);
    const arquivosAtuaisEstimados = 200;
    const percentualEconomia = Math.round((totalArquivos / arquivosAtuaisEstimados) * 100);
    return { totalArquivos, percentualEconomia };
  };

  const { totalArquivos, percentualEconomia } = calcularEconomia();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-green-900 mb-2">
            🧹 Limpeza Segura do Sistema
          </h1>
          <p className="text-green-700">
            Remoção inteligente de arquivos obsoletos e código morto
          </p>
          <div className="flex justify-center gap-4 mt-4">
            <Badge variant="outline">
              📁 ~{totalArquivos} arquivos para análise
            </Badge>
            <Badge variant="secondary">
              💾 ~{percentualEconomia}% de redução estimada
            </Badge>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Resumo Executivo */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              📋 Resumo Executivo
            </h2>
            
            <Alert className="mb-4">
              <AlertDescription>
                <strong>⚠️ IMPORTANTE:</strong> Esta é uma análise de limpeza. Nenhum arquivo será 
                removido automaticamente. Todas as remoções requerem confirmação manual.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {itensLimpeza.filter(i => i.seguro).length}
                </div>
                <div className="text-sm text-green-700">Categorias Seguras</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {itensLimpeza.filter(i => !i.seguro).length}
                </div>
                <div className="text-sm text-yellow-700">Precisam Verificação</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {totalArquivos}
                </div>
                <div className="text-sm text-blue-700">Total de Arquivos</div>
              </div>
            </div>
          </Card>

          {/* Lista de Categorias */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              📂 Categorias para Limpeza
            </h2>
            
            <div className="space-y-4">
              {itensLimpeza.map((item, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{item.categoria}</h3>
                    <div className="flex gap-2">
                      <Badge variant={getImpactoBadgeVariant(item.impacto)}>
                        Impacto: {item.impacto}
                      </Badge>
                      <Badge variant={item.seguro ? 'default' : 'destructive'}>
                        {item.seguro ? '✅ Seguro' : '⚠️ Verificar'}
                      </Badge>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-2">{item.descricao}</p>
                  
                  <div className="text-xs text-gray-500">
                    <strong>Arquivos ({item.arquivos.length}):</strong> 
                    {item.arquivos.slice(0, 3).join(', ')}
                    {item.arquivos.length > 3 && ` ... e mais ${item.arquivos.length - 3}`}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Painel de Controle */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              🎮 Controles de Limpeza
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="font-medium">Status:</span>
                <span className="text-blue-600">{etapaAtual || 'Aguardando'}</span>
              </div>
              
              {progresso > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progresso}%` }}
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={simularLimpeza}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  🔍 Simular Limpeza
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => window.open('/RELATORIO_AUDITORIA_LIMPEZA.md')}
                >
                  📊 Ver Relatório Completo
                </Button>
              </div>
            </div>
          </Card>

          {/* Log de Atividades */}
          {logs.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                📝 Log de Análise
              </h2>
              
              <div className="bg-gray-900 text-green-400 p-4 rounded max-h-64 overflow-auto font-mono text-sm">
                {logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="mt-6 flex gap-4 justify-center">
          <Button 
            onClick={() => window.location.reload()}
            variant="outline"
          >
            🔄 Recarregar
          </Button>
          
          {onFechar && (
            <Button onClick={onFechar} variant="outline">
              ← Voltar
            </Button>
          )}
          
          <Button 
            onClick={() => window.location.href = '/'}
            variant="outline"
          >
            🏠 Ir para Home
          </Button>
        </div>
      </div>
    </div>
  );
}