import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { BookOpen, Users, GraduationCap, ArrowRight, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';

interface ExemploVinculacaoCorrigidaProps {
  onVoltar: () => void;
}

export function ExemploVinculacaoCorrigida({ onVoltar }: ExemploVinculacaoCorrigidaProps) {
  // Exemplo da estrutura ANTERIOR (problemática)
  const estruturaAnterior = {
    professor: {
      nome: "Brenda Camilli",
      disciplinas: ["Produção de Texto", "Arte", "Gramática", "Redação"],
      series: ["5º ano - Fund.", "6º ano - Fund.", "1ª série - Médio", "2ª série - Médio"]
    },
    problemaGerado: {
      seriesFundamental: ["5º ano", "6º ano"],
      disciplinasQueApareciam: ["Produção de Texto", "Arte", "Gramática", "Redação"], // TODAS!
      seriesMedio: ["1ª série", "2ª série"],
      disciplinasQueApareciam2: ["Produção de Texto", "Arte", "Gramática", "Redação"] // TODAS!
    }
  };

  // Exemplo da estrutura NOVA (corrigida)
  const estruturaNova = {
    series: [
      {
        nome: "5º ano - Ensino Fundamental",
        segmento: "fundamental",
        disciplinas: [
          {
            nome: "Produção de Texto",
            professores: ["Brenda Camilli"]
          }
        ]
      },
      {
        nome: "6º ano - Ensino Fundamental", 
        segmento: "fundamental",
        disciplinas: [
          {
            nome: "Produção de Texto",
            professores: ["Brenda Camilli"]
          }
        ]
      },
      {
        nome: "1ª série - Ensino Médio",
        segmento: "medio",
        disciplinas: [
          {
            nome: "Arte",
            professores: ["Brenda Camilli"]
          },
          {
            nome: "Gramática", 
            professores: ["Brenda Camilli"]
          },
          {
            nome: "Redação",
            professores: ["Brenda Camilli"]
          }
        ]
      },
      {
        nome: "2ª série - Ensino Médio",
        segmento: "medio", 
        disciplinas: [
          {
            nome: "Arte",
            professores: ["Brenda Camilli"]
          },
          {
            nome: "Gramática",
            professores: ["Brenda Camilli"]
          },
          {
            nome: "Redação", 
            professores: ["Brenda Camilli"]
          }
        ]
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-blue-600" />
              Exemplo: Correção da Vinculação Professor/Disciplina/Série
            </h1>
            <p className="text-gray-600 mt-1">
              Demonstração da diferença entre a estrutura anterior e a nova estrutura corrigida
            </p>
          </div>
          <Button variant="outline" onClick={onVoltar}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>

        {/* Problema identificado */}
        <div className="mb-8">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <XCircle className="w-5 h-5" />
                Problema Identificado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-red-700">
                  <strong>Situação:</strong> Professora Brenda Camilli leciona diferentes disciplinas em segmentos distintos
                </p>
                
                <div className="bg-white rounded-lg p-4 border border-red-200">
                  <h4 className="font-semibold mb-3">Configuração Anterior (Problemática):</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium mb-2">Professora: {estruturaAnterior.professor.nome}</h5>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm text-gray-600">Disciplinas:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {estruturaAnterior.professor.disciplinas.map((disc, i) => (
                              <Badge key={i} variant="outline">{disc}</Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Séries:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {estruturaAnterior.professor.series.map((serie, i) => (
                              <Badge key={i} variant="outline">{serie}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="font-medium mb-2 text-red-600">Resultado Indesejado:</h5>
                      <div className="space-y-3">
                        <div className="bg-red-100 p-3 rounded">
                          <div className="font-medium text-sm">Ensino Fundamental (5º, 6º ano)</div>
                          <div className="text-xs text-red-600 mt-1">Apareciam TODAS as disciplinas:</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {estruturaAnterior.problemaGerado.disciplinasQueApareciam.map((disc, i) => (
                              <Badge key={i} variant="destructive" className="text-xs">{disc}</Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div className="bg-red-100 p-3 rounded">
                          <div className="font-medium text-sm">Ensino Médio (1ª, 2ª série)</div>
                          <div className="text-xs text-red-600 mt-1">Apareciam TODAS as disciplinas:</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {estruturaAnterior.problemaGerado.disciplinasQueApareciam2.map((disc, i) => (
                              <Badge key={i} variant="destructive" className="text-xs">{disc}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Solução implementada */}
        <div className="mb-8">
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                Solução Implementada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-green-700">
                  <strong>Nova Estrutura:</strong> Vinculação específica por série - cada série define suas disciplinas e professores
                </p>
                
                <div className="grid gap-4">
                  {estruturaNova.series.map((serie, index) => (
                    <div key={index} className="bg-white rounded-lg p-4 border border-green-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-green-600" />
                          <h4 className="font-semibold">{serie.nome}</h4>
                          <Badge variant="outline" className="bg-green-100 text-green-700">
                            {serie.segmento === 'fundamental' ? 'Ensino Fundamental' : 'Ensino Médio'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-gray-700">Disciplinas específicas desta série:</h5>
                        <div className="grid gap-2">
                          {serie.disciplinas.map((disciplina, discIndex) => (
                            <div key={discIndex} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                              <div className="flex items-center gap-2">
                                <BookOpen className="w-3 h-3 text-blue-500" />
                                <span className="text-sm font-medium">{disciplina.nome}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3 text-gray-500" />
                                <span className="text-xs text-gray-600">
                                  {disciplina.professores.join(', ')}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Benefícios */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-blue-600" />
                Benefícios da Nova Estrutura
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-green-700">✅ Para Professores</h4>
                  <ul className="space-y-2 text-sm">
                    <li>• Só veem disciplinas realmente atribuídas à série específica</li>
                    <li>• Dashboard organizado por série/disciplina correta</li>
                    <li>• Acesso apenas ao conteúdo relevante</li>
                    <li>• Sem confusão entre segmentos</li>
                  </ul>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold text-green-700">✅ Para Alunos</h4>
                  <ul className="space-y-2 text-sm">
                    <li>• Veem apenas disciplinas da sua série</li>
                    <li>• Professores corretos para cada matéria</li>
                    <li>• Material de estudo específico do segmento</li>
                    <li>• Interface limpa e organizada</li>
                  </ul>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold text-green-700">✅ Para Coordenadores</h4>
                  <ul className="space-y-2 text-sm">
                    <li>• Gestão precisa de alocação de professores</li>
                    <li>• Relatórios por série/segmento corretos</li>
                    <li>• Planejamento pedagógico organizado</li>
                    <li>• Controle de carga horária por disciplina</li>
                  </ul>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold text-green-700">✅ Para Administradores</h4>
                  <ul className="space-y-2 text-sm">
                    <li>• Configuração centralizada e clara</li>
                    <li>• Evita erros de vinculação</li>
                    <li>• Facilita auditoria do sistema</li>
                    <li>• Dados consistentes em toda plataforma</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fluxo de configuração */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-purple-600" />
                Novo Fluxo de Configuração
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Passo a passo na Gestão Escolar:</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                      <span className="text-sm">Ir para aba "Séries & Vínculos"</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                      <span className="text-sm">Criar/editar série (ex: "1ª série - Ensino Médio")</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                      <span className="text-sm">Escolher segmento (Fundamental ou Médio)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</div>
                      <span className="text-sm">Selecionar disciplinas específicas desta série</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">5</div>
                      <span className="text-sm">Para cada disciplina, escolher professor(es) responsável(is)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">6</div>
                      <span className="text-sm">Salvar configuração</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Resultado:</h4>
                  <p className="text-sm text-blue-700">
                    Cada série terá apenas as disciplinas e professores corretos, eliminando 
                    confusões e organizando melhor o sistema educacional.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Call to action */}
        <div className="text-center">
          <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-2">Pronto para implementar?</h3>
              <p className="text-gray-600 mb-4">
                A nova Gestão Escolar Avançada está disponível para configurar as vinculações corretas
              </p>
              <Button className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700">
                <GraduationCap className="w-4 h-4 mr-2" />
                Acessar Gestão Escolar Avançada
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}