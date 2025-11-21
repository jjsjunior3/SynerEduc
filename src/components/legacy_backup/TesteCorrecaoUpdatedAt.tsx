import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  ArrowLeft, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  Save,
  TestTube,
  BookOpen,
  Users
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface TesteCorrecaoUpdatedAtProps {
  onVoltar: () => void;
}

interface ResultadoTeste {
  tipo: 'disciplina' | 'serie';
  operacao: 'criar' | 'atualizar';
  sucesso: boolean;
  erro?: string;
  dados?: any;
  tempoResposta?: number;
}

export function TesteCorrecaoUpdatedAt({ onVoltar }: TesteCorrecaoUpdatedAtProps) {
  const [testando, setTestando] = useState(false);
  const [resultados, setResultados] = useState<ResultadoTeste[]>([]);
  
  // Estados para teste manual
  const [novaEntidade, setNovaEntidade] = useState({
    tipo: 'disciplina' as 'disciplina' | 'serie',
    nome: '',
    segmento: 'fundamental' as 'fundamental' | 'medio',
    descricao: '',
    totalAlunos: 0
  });
  const [salvandoManual, setSalvandoManual] = useState(false);

  const executarTestesAutomaticos = async () => {
    setTestando(true);
    setResultados([]);
    
    try {
      const novosResultados: ResultadoTeste[] = [];

      // Teste 1: Criar disciplina
      console.log('[TESTE_UPDATED_AT] 1. Testando criação de disciplina...');
      await testarOperacao('disciplina', 'criar', {
        nome: 'Matemática Teste',
        segmento: 'fundamental',
        descricao: 'Disciplina para teste de correção updated_at',
        ativa: true
      }, novosResultados);

      // Teste 2: Criar série
      console.log('[TESTE_UPDATED_AT] 2. Testando criação de série...');
      await testarOperacao('serie', 'criar', {
        nome: '6º ano Teste',
        segmento: 'fundamental',
        totalAlunos: 30,
        ativa: true
      }, novosResultados);

      // Se as criações funcionaram, testar atualizações
      if (novosResultados.length >= 2 && novosResultados.every(r => r.sucesso)) {
        // Buscar IDs das entidades criadas para testar atualização
        const disciplinaId = novosResultados[0].dados?.id;
        const serieId = novosResultados[1].dados?.id;

        if (disciplinaId) {
          // Teste 3: Atualizar disciplina
          console.log('[TESTE_UPDATED_AT] 3. Testando atualização de disciplina...');
          await testarOperacao('disciplina', 'atualizar', {
            nome: 'Matemática Teste Atualizada',
            segmento: 'medio',
            descricao: 'Disciplina atualizada para teste',
            ativa: true
          }, novosResultados, disciplinaId);
        }

        if (serieId) {
          // Teste 4: Atualizar série
          console.log('[TESTE_UPDATED_AT] 4. Testando atualização de série...');
          await testarOperacao('serie', 'atualizar', {
            nome: '6º ano Teste Atualizado',
            segmento: 'fundamental',
            totalAlunos: 35,
            ativa: true
          }, novosResultados, serieId);
        }
      }

      setResultados(novosResultados);
      
      const sucessos = novosResultados.filter(r => r.sucesso).length;
      const total = novosResultados.length;
      
      if (sucessos === total) {
        toast.success(`✅ Todos os ${total} testes passaram! Problema do updated_at corrigido.`);
      } else {
        toast.error(`❌ ${total - sucessos} de ${total} testes falharam`);
      }

    } catch (error) {
      console.error('[TESTE_UPDATED_AT] Erro geral:', error);
      toast.error(`Erro durante os testes: ${error.message}`);
    } finally {
      setTestando(false);
    }
  };

  const testarOperacao = async (
    tipo: 'disciplina' | 'serie', 
    operacao: 'criar' | 'atualizar', 
    dados: any, 
    resultados: ResultadoTeste[],
    id?: string
  ) => {
    const inicioTempo = Date.now();
    
    try {
      const url = operacao === 'criar' 
        ? `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/${tipo}s`
        : `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/${tipo}s/${id}`;
      
      const method = operacao === 'criar' ? 'POST' : 'PUT';
      
      console.log(`[TESTE_UPDATED_AT] ${operacao} ${tipo} - URL:`, url);
      console.log(`[TESTE_UPDATED_AT] ${operacao} ${tipo} - Dados:`, dados);
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dados)
      });

      const tempoResposta = Date.now() - inicioTempo;
      
      if (response.ok) {
        const resultado = await response.json();
        console.log(`[TESTE_UPDATED_AT] ${operacao} ${tipo} - Sucesso:`, resultado);
        
        resultados.push({
          tipo,
          operacao,
          sucesso: true,
          dados: resultado,
          tempoResposta
        });
      } else {
        const erro = await response.text();
        console.error(`[TESTE_UPDATED_AT] ${operacao} ${tipo} - Erro:`, erro);
        
        resultados.push({
          tipo,
          operacao,
          sucesso: false,
          erro: `HTTP ${response.status}: ${erro}`,
          tempoResposta
        });
      }
    } catch (error) {
      console.error(`[TESTE_UPDATED_AT] ${operacao} ${tipo} - Exceção:`, error);
      
      resultados.push({
        tipo,
        operacao,
        sucesso: false,
        erro: error.message,
        tempoResposta: Date.now() - inicioTempo
      });
    }
  };

  const salvarEntidadeManual = async () => {
    if (!novaEntidade.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    setSalvandoManual(true);
    try {
      const dados = novaEntidade.tipo === 'disciplina' 
        ? {
            nome: novaEntidade.nome,
            segmento: novaEntidade.segmento,
            descricao: novaEntidade.descricao,
            ativa: true
          }
        : {
            nome: novaEntidade.nome,
            segmento: novaEntidade.segmento,
            totalAlunos: novaEntidade.totalAlunos,
            ativa: true
          };

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/${novaEntidade.tipo}s`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dados)
      });

      if (response.ok) {
        const resultado = await response.json();
        toast.success(`✅ ${novaEntidade.tipo} "${novaEntidade.nome}" criada com sucesso!`);
        
        // Limpar formulário
        setNovaEntidade({
          tipo: 'disciplina',
          nome: '',
          segmento: 'fundamental',
          descricao: '',
          totalAlunos: 0
        });
      } else {
        const erro = await response.text();
        toast.error(`❌ Erro ao criar ${novaEntidade.tipo}: ${erro}`);
      }
    } catch (error) {
      toast.error(`❌ Erro: ${error.message}`);
    } finally {
      setSalvandoManual(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={onVoltar}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🧪 Teste da Correção "updated_at"</h1>
            <p className="text-gray-600">Verificação da sanitização de campos problemáticos no KV Store</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Testes Automáticos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="w-5 h-5" />
                Testes Automáticos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Executa uma bateria de testes para verificar se o erro "updated_at" foi corrigido:
                </p>
                
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• ✅ Criar disciplina</li>
                  <li>• ✅ Criar série</li>
                  <li>• ✅ Atualizar disciplina</li>
                  <li>• ✅ Atualizar série</li>
                </ul>

                <Button 
                  onClick={executarTestesAutomaticos}
                  disabled={testando}
                  className="w-full"
                >
                  {testando ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      Executando Testes...
                    </>
                  ) : (
                    <>
                      <TestTube className="w-4 h-4 mr-2" />
                      Executar Testes
                    </>
                  )}
                </Button>

                {/* Resultados dos Testes */}
                {resultados.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="font-medium">Resultados:</h4>
                    {resultados.map((resultado, index) => (
                      <div key={index} className={`p-3 rounded-lg text-sm ${
                        resultado.sucesso ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {resultado.sucesso ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <AlertTriangle className="w-4 h-4" />
                            )}
                            <span>
                              {resultado.operacao === 'criar' ? 'Criar' : 'Atualizar'} {resultado.tipo}
                            </span>
                          </div>
                          <Badge variant={resultado.sucesso ? "default" : "destructive"}>
                            {resultado.tempoResposta}ms
                          </Badge>
                        </div>
                        {resultado.erro && (
                          <div className="mt-1 text-xs font-mono bg-red-100 p-2 rounded">
                            {resultado.erro}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Teste Manual */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Save className="w-5 h-5" />
                Teste Manual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo de Entidade</Label>
                  <Select 
                    value={novaEntidade.tipo} 
                    onValueChange={(value: 'disciplina' | 'serie') => 
                      setNovaEntidade(prev => ({ ...prev, tipo: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="disciplina">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4" />
                          Disciplina
                        </div>
                      </SelectItem>
                      <SelectItem value="serie">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Série
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input
                    value={novaEntidade.nome}
                    onChange={(e) => setNovaEntidade(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder={`Nome da ${novaEntidade.tipo}`}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Segmento</Label>
                  <Select 
                    value={novaEntidade.segmento} 
                    onValueChange={(value: 'fundamental' | 'medio') => 
                      setNovaEntidade(prev => ({ ...prev, segmento: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fundamental">Ensino Fundamental</SelectItem>
                      <SelectItem value="medio">Ensino Médio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {novaEntidade.tipo === 'disciplina' && (
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Input
                      value={novaEntidade.descricao}
                      onChange={(e) => setNovaEntidade(prev => ({ ...prev, descricao: e.target.value }))}
                      placeholder="Descrição da disciplina"
                    />
                  </div>
                )}

                {novaEntidade.tipo === 'serie' && (
                  <div className="space-y-2">
                    <Label>Total de Alunos</Label>
                    <Input
                      type="number"
                      value={novaEntidade.totalAlunos}
                      onChange={(e) => setNovaEntidade(prev => ({ ...prev, totalAlunos: parseInt(e.target.value) || 0 }))}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                )}

                <Button 
                  onClick={salvarEntidadeManual}
                  disabled={salvandoManual || !novaEntidade.nome.trim()}
                  className="w-full"
                >
                  {salvandoManual ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Criar {novaEntidade.tipo}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Informações sobre as correções */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>🔧 Correções Implementadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Problemas Corrigidos:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Campo "updated_at" causando erro no KV Store</li>
                  <li>• Campos de timestamp problemáticos</li>
                  <li>• Ausência de sanitização específica por tipo</li>
                  <li>• Estruturas de dados não padronizadas</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Soluções Aplicadas:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Função sanitizarParaKvStore() melhorada</li>
                  <li>• Campos permitidos específicos por tipo</li>
                  <li>• Sanitização em todas as operações CRUD</li>
                  <li>• Timestamps personalizados (dataInicio/dataFim)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}