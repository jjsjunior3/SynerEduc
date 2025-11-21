import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  ArrowLeft, 
  User, 
  UserPlus, 
  School, 
  BookOpen, 
  GraduationCap, 
  UserCheck, 
  Settings, 
  CheckCircle, 
  XCircle,
  ArrowRight,
  Sparkles,
  Target,
  Zap,
  Shield
} from 'lucide-react';

interface DocumentacaoNovoFluxoProps {
  onVoltar: () => void;
}

export function DocumentacaoNovoFluxo({ onVoltar }: DocumentacaoNovoFluxoProps) {
  const [tabSelecionada, setTabSelecionada] = useState('visao-geral');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onVoltar}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">📚 Documentação - Nova Arquitetura</h1>
            <p className="text-sm text-gray-600">Guia completo do novo fluxo de vinculação Professor → Disciplinas → Séries</p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto">
        <Tabs value={tabSelecionada} onValueChange={setTabSelecionada}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
            <TabsTrigger value="fluxo">Novo Fluxo</TabsTrigger>
            <TabsTrigger value="componentes">Componentes</TabsTrigger>
            <TabsTrigger value="comparacao">Comparação</TabsTrigger>
            <TabsTrigger value="implementacao">Implementação</TabsTrigger>
          </TabsList>

          {/* Visão Geral */}
          <TabsContent value="visao-geral">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    Nova Arquitetura de Vinculação
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">🎯 Objetivo Principal</h3>
                    <p className="text-blue-800">
                      Implementar um sistema centralizado de vinculação que elimina completamente os erros 
                      do "produto cartesiano" anterior, onde disciplinas apareciam em séries incorretas.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-green-900">Precisão</span>
                      </div>
                      <p className="text-sm text-green-700">
                        Vínculos exatos entre professor, disciplina e séries específicas
                      </p>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-5 h-5 text-yellow-600" />
                        <span className="font-medium text-yellow-900">Eficiência</span>
                      </div>
                      <p className="text-sm text-yellow-700">
                        Cadastro mais rápido e intuitivo para administradores
                      </p>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-5 h-5 text-purple-600" />
                        <span className="font-medium text-purple-900">Confiabilidade</span>
                      </div>
                      <p className="text-sm text-purple-700">
                        Zero erros de vinculação e manutenção mínima
                      </p>
                    </div>
                  </div>

                  <div className="border-l-4 border-red-500 pl-4 bg-red-50 p-4 rounded">
                    <h4 className="font-medium text-red-900 mb-2">❌ Problema Resolvido</h4>
                    <p className="text-red-800 text-sm mb-2">
                      <strong>Antes:</strong> Professor João lecionava Matemática e Física para 5º ano e 1ª série.
                    </p>
                    <p className="text-red-600 text-sm">
                      <strong>Resultado incorreto:</strong> Física aparecia no 5º ano (impossível!)
                    </p>
                  </div>

                  <div className="border-l-4 border-green-500 pl-4 bg-green-50 p-4 rounded">
                    <h4 className="font-medium text-green-900 mb-2">✅ Solução Implementada</h4>
                    <p className="text-green-800 text-sm mb-2">
                      <strong>Agora:</strong> Vinculação disciplina por disciplina, série por série.
                    </p>
                    <p className="text-green-600 text-sm">
                      <strong>Resultado garantido:</strong> Cada disciplina apenas nas séries corretas
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Novo Fluxo */}
          <TabsContent value="fluxo">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-blue-600" />
                    Fluxo de Cadastro Centralizado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Passo 1 */}
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 font-medium">1</span>
                      </div>
                      <div className="flex-1">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h3 className="font-medium text-blue-900 mb-2">Cadastro Básico do Professor</h3>
                          <p className="text-blue-700 text-sm mb-3">
                            Nome, usuário, senha e tipo "Professor" - informações essenciais primeiro
                          </p>
                          <div className="flex items-center gap-2 text-sm text-blue-600">
                            <User className="w-4 h-4" />
                            <span>Dados pessoais e credenciais</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <ArrowRight className="w-6 h-6 text-gray-400" />
                    </div>

                    {/* Passo 2 */}
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-green-600 font-medium">2</span>
                      </div>
                      <div className="flex-1">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h3 className="font-medium text-green-900 mb-2">Adicionar Disciplina</h3>
                          <p className="text-green-700 text-sm mb-3">
                            Para cada disciplina que o professor leciona, seguir o sub-fluxo:
                          </p>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-green-600">
                              <School className="w-4 h-4" />
                              <span>2.1 Escolher Segmento (Fundamental/Médio)</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-green-600">
                              <BookOpen className="w-4 h-4" />
                              <span>2.2 Selecionar Disciplina (filtrada por segmento)</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-green-600">
                              <GraduationCap className="w-4 h-4" />
                              <span>2.3 Escolher Séries específicas para esta disciplina</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <ArrowRight className="w-6 h-6 text-gray-400" />
                    </div>

                    {/* Passo 3 */}
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-purple-600 font-medium">3</span>
                      </div>
                      <div className="flex-1">
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                          <h3 className="font-medium text-purple-900 mb-2">Repetir para Outras Disciplinas</h3>
                          <p className="text-purple-700 text-sm mb-3">
                            Se o professor leciona múltiplas disciplinas, repetir o passo 2 para cada uma
                          </p>
                          <div className="bg-white rounded p-3 border border-purple-100">
                            <div className="text-xs text-purple-600 space-y-1">
                              <div>📚 Matemática → Fundamental → 6º, 7º, 8º anos</div>
                              <div>📚 Física → Médio → 1ª, 2ª séries</div>
                              <div>📚 Química → Médio → 2ª, 3ª séries</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <ArrowRight className="w-6 h-6 text-gray-400" />
                    </div>

                    {/* Resultado */}
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
                          <h3 className="font-medium text-green-900 mb-2">✅ Resultado Garantido</h3>
                          <p className="text-green-700 text-sm mb-3">
                            Vínculos precisos criados automaticamente no sistema
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div className="bg-white rounded p-2 border border-green-100">
                              <strong>Para o Professor:</strong><br/>
                              Vê apenas suas disciplinas/séries
                            </div>
                            <div className="bg-white rounded p-2 border border-blue-100">
                              <strong>Para os Alunos:</strong><br/>
                              Veem apenas disciplinas da sua série
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Componentes */}
          <TabsContent value="componentes">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-purple-600" />
                    Componentes da Nova Arquitetura
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Cadastro Novo */}
                    <div className="border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <UserPlus className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-blue-900">CadastrarUsuarioNovo</h3>
                          <p className="text-xs text-blue-600">Fluxo centralizado</p>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle className="w-3 h-3" />
                          <span>Modal de disciplinas intuitivo</span>
                        </div>
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle className="w-3 h-3" />
                          <span>Segmentação automática</span>
                        </div>
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle className="w-3 h-3" />
                          <span>Validação em tempo real</span>
                        </div>
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle className="w-3 h-3" />
                          <span>Interface responsiva</span>
                        </div>
                      </div>
                    </div>

                    {/* Gestão Simplificada */}
                    <div className="border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <School className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-green-900">GestaoEscolaSimplificada</h3>
                          <p className="text-xs text-green-600">Cadastros básicos</p>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle className="w-3 h-3" />
                          <span>Disciplinas: nome + segmento</span>
                        </div>
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle className="w-3 h-3" />
                          <span>Séries: nome + segmento</span>
                        </div>
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle className="w-3 h-3" />
                          <span>Visualização de vínculos</span>
                        </div>
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle className="w-3 h-3" />
                          <span>Interface limpa</span>
                        </div>
                      </div>
                    </div>

                    {/* Dashboard Novo */}
                    <div className="border border-purple-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Settings className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-purple-900">DashboardAdministradorNovo</h3>
                          <p className="text-xs text-purple-600">Painel aprimorado</p>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle className="w-3 h-3" />
                          <span>Integração dos novos componentes</span>
                        </div>
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle className="w-3 h-3" />
                          <span>Banner explicativo</span>
                        </div>
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle className="w-3 h-3" />
                          <span>Remoção de redundâncias</span>
                        </div>
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle className="w-3 h-3" />
                          <span>Estatísticas atualizadas</span>
                        </div>
                      </div>
                    </div>

                    {/* Exemplo e Documentação */}
                    <div className="border border-orange-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-orange-900">Documentação</h3>
                          <p className="text-xs text-orange-600">Exemplos e guias</p>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle className="w-3 h-3" />
                          <span>ExemploNovoFluxo: Demonstração</span>
                        </div>
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle className="w-3 h-3" />
                          <span>DocumentacaoNovoFluxo: Guia</span>
                        </div>
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle className="w-3 h-3" />
                          <span>Acesso via URL modes</span>
                        </div>
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle className="w-3 h-3" />
                          <span>Comparações visuais</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Comparação */}
          <TabsContent value="comparacao">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>🔄 Antes vs Depois</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Antes */}
                    <div className="space-y-4">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h3 className="font-medium text-red-900 mb-3 flex items-center gap-2">
                          <XCircle className="w-4 h-4" />
                          Sistema Anterior
                        </h3>
                        
                        <div className="space-y-3 text-sm">
                          <div className="bg-white rounded p-3 border border-red-100">
                            <strong className="text-red-800">Cadastro de Professor:</strong>
                            <div className="text-red-700 mt-1 space-y-1">
                              <div>1. Dados básicos</div>
                              <div>2. Selecionar disciplinas (todas)</div>
                              <div>3. Selecionar séries (todas)</div>
                            </div>
                          </div>
                          
                          <div className="bg-white rounded p-3 border border-red-100">
                            <strong className="text-red-800">Gestão Escolar:</strong>
                            <div className="text-red-700 mt-1 space-y-1">
                              <div>• Disciplinas com professor + séries</div>
                              <div>• Séries com disciplinas + professores</div>
                              <div>• Campos redundantes</div>
                              <div>• Vinculação confusa</div>
                            </div>
                          </div>
                          
                          <div className="bg-red-100 rounded p-3 border border-red-200">
                            <strong className="text-red-900">Problemas:</strong>
                            <div className="text-red-800 mt-1 space-y-1 text-xs">
                              <div>❌ Produto cartesiano incorreto</div>
                              <div>❌ Física no 5º ano</div>
                              <div>❌ Muita manutenção manual</div>
                              <div>❌ Interface confusa</div>
                              <div>❌ Dados inconsistentes</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Depois */}
                    <div className="space-y-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h3 className="font-medium text-green-900 mb-3 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Sistema Novo
                        </h3>
                        
                        <div className="space-y-3 text-sm">
                          <div className="bg-white rounded p-3 border border-green-100">
                            <strong className="text-green-800">Cadastro Centralizado:</strong>
                            <div className="text-green-700 mt-1 space-y-1">
                              <div>1. Dados básicos</div>
                              <div>2. Para cada disciplina:</div>
                              <div className="ml-4">→ Segmento</div>
                              <div className="ml-4">→ Disciplina</div>
                              <div className="ml-4">→ Séries específicas</div>
                            </div>
                          </div>
                          
                          <div className="bg-white rounded p-3 border border-green-100">
                            <strong className="text-green-800">Gestão Simplificada:</strong>
                            <div className="text-green-700 mt-1 space-y-1">
                              <div>• Disciplinas: nome + segmento</div>
                              <div>• Séries: nome + segmento</div>
                              <div>• Vínculos: visualização only</div>
                              <div>• Interface limpa</div>
                            </div>
                          </div>
                          
                          <div className="bg-green-100 rounded p-3 border border-green-200">
                            <strong className="text-green-900">Benefícios:</strong>
                            <div className="text-green-800 mt-1 space-y-1 text-xs">
                              <div>✅ Vínculos sempre corretos</div>
                              <div>✅ Zero manutenção</div>
                              <div>✅ Interface intuitiva</div>
                              <div>✅ Dados consistentes</div>
                              <div>✅ Experiência superior</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Implementação */}
          <TabsContent value="implementacao">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-600" />
                    Como Usar a Nova Arquitetura
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* URLs de Acesso */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-medium text-blue-900 mb-3">🔗 URLs de Acesso Rápido</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="bg-white rounded p-3 border border-blue-100">
                          <strong>Demonstração:</strong>
                          <div className="font-mono text-blue-600 text-xs mt-1">
                            <div>?mode=novo-fluxo</div>
                            <div>?mode=exemplo-vinculacao</div>
                          </div>
                        </div>
                        <div className="bg-white rounded p-3 border border-blue-100">
                          <strong>Componentes:</strong>
                          <div className="font-mono text-blue-600 text-xs mt-1">
                            <div>?mode=cadastro-novo</div>
                            <div>?mode=gestao-simplificada</div>
                            <div>?mode=admin-novo</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Passos de Uso */}
                    <div className="space-y-4">
                      <h3 className="font-medium text-gray-900">📋 Passos para Implementação</h3>
                      
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <Badge variant="outline" className="mt-1">1</Badge>
                          <div>
                            <strong>Testar os Componentes:</strong>
                            <p className="text-sm text-gray-600 mt-1">
                              Use as URLs acima para testar cada componente individualmente e entender o novo fluxo.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Badge variant="outline" className="mt-1">2</Badge>
                          <div>
                            <strong>Migrar Dashboard Admin:</strong>
                            <p className="text-sm text-gray-600 mt-1">
                              Substituir DashboardAdministrador por DashboardAdministradorNovo no sistema principal.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Badge variant="outline" className="mt-1">3</Badge>
                          <div>
                            <strong>Treinar Usuários:</strong>
                            <p className="text-sm text-gray-600 mt-1">
                              Mostrar o novo fluxo de cadastro centralizado para administradores e coordenadores.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Badge variant="outline" className="mt-1">4</Badge>
                          <div>
                            <strong>Ativar em Produção:</strong>
                            <p className="text-sm text-gray-600 mt-1">
                              Após testes, fazer a substituição definitiva dos componentes antigos pelos novos.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Considerações */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h3 className="font-medium text-yellow-900 mb-3">⚠️ Considerações Importantes</h3>
                      <div className="space-y-2 text-sm text-yellow-800">
                        <div>• Os componentes antigos permanecerão disponíveis durante a transição</div>
                        <div>• Dados existentes são compatíveis com a nova arquitetura</div>
                        <div>• Recomenda-se testar em ambiente de staging primeiro</div>
                        <div>• Treinamento da equipe é essencial para aproveitamento máximo</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}