import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowLeft, ArrowRight, CheckCircle, User, BookOpen, GraduationCap, UserCheck, Sparkles, Users, School } from 'lucide-react';

interface ExemploNovoFluxoProps {
  onVoltar: () => void;
}

export function ExemploNovoFluxo({ onVoltar }: ExemploNovoFluxoProps) {
  const [etapaAtual, setEtapaAtual] = useState(1);

  const etapas = [
    {
      id: 1,
      titulo: 'Problema Anterior',
      tipo: 'problema',
      conteudo: (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-medium text-red-900 mb-3">❌ Problemas do Sistema Antigo</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-red-600 text-sm">1</span>
                </div>
                <div>
                  <strong className="text-red-800">Vinculação Confusa:</strong>
                  <p className="text-red-700 text-sm">Professor, série e disciplina selecionados separadamente</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-red-600 text-sm">2</span>
                </div>
                <div>
                  <strong className="text-red-800">Produto Cartesiano:</strong>
                  <p className="text-red-700 text-sm">Disciplinas apareciam em séries erradas (ex: Física no 5º ano)</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-red-600 text-sm">3</span>
                </div>
                <div>
                  <strong className="text-red-800">Manutenção Manual:</strong>
                  <p className="text-red-700 text-sm">Muito trabalho para corrigir vínculos incorretos</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-100 rounded-lg p-4">
            <h4 className="font-medium text-gray-800 mb-2">Exemplo do problema:</h4>
            <div className="text-sm text-gray-600 font-mono bg-white p-3 rounded border">
              Professor João → [Matemática, Física] → [5º ano, 1ª série]<br/>
              <span className="text-red-600">Resultado: Física aparecia no 5º ano! ❌</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 2,
      titulo: 'Nova Solução',
      tipo: 'solucao',
      conteudo: (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-medium text-green-900 mb-3">✅ Nova Arquitetura Centralizada</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-green-600 text-sm">1</span>
                </div>
                <div>
                  <strong className="text-green-800">Fluxo Centralizado:</strong>
                  <p className="text-green-700 text-sm">Tudo acontece no cadastro do professor</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-green-600 text-sm">2</span>
                </div>
                <div>
                  <strong className="text-green-800">Vinculação Precisa:</strong>
                  <p className="text-green-700 text-sm">Segmento → Disciplina → Séries específicas</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-green-600 text-sm">3</span>
                </div>
                <div>
                  <strong className="text-green-800">Zero Manutenção:</strong>
                  <p className="text-green-700 text-sm">Vínculos sempre corretos desde o início</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Novo Fluxo:</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-blue-600" />
                <span>1. Cadastrar Professor</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <ArrowRight className="w-4 h-4 text-gray-400" />
                <School className="w-4 h-4 text-blue-600" />
                <span>2. Escolher Segmento (Fundamental/Médio)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <ArrowRight className="w-4 h-4 text-gray-400" />
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>3. Selecionar Disciplina (filtrada por segmento)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <ArrowRight className="w-4 h-4 text-gray-400" />
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <span>4. Escolher Séries específicas</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <ArrowRight className="w-4 h-4 text-gray-400" />
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>5. Repetir para outras disciplinas</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 3,
      titulo: 'Exemplo Prático',
      tipo: 'exemplo',
      conteudo: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">📚 Exemplo: Cadastrando Professora Maria</h3>
            
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Professora Maria Silva</span>
                </div>
                
                <div className="space-y-3">
                  <div className="border-l-4 border-blue-500 pl-4">
                    <div className="font-medium text-sm mb-1">1ª Disciplina:</div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>📚 <strong>Segmento:</strong> Ensino Fundamental</div>
                      <div>📖 <strong>Disciplina:</strong> Matemática</div>
                      <div>🎓 <strong>Séries:</strong> 6º ano, 7º ano, 8º ano</div>
                    </div>
                  </div>
                  
                  <div className="border-l-4 border-green-500 pl-4">
                    <div className="font-medium text-sm mb-1">2ª Disciplina:</div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>📚 <strong>Segmento:</strong> Ensino Médio</div>
                      <div>📖 <strong>Disciplina:</strong> Física</div>
                      <div>🎓 <strong>Séries:</strong> 1ª série, 2ª série</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-green-100 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-800">Resultado Garantido:</span>
                </div>
                <div className="text-sm text-green-700 space-y-1">
                  <div>✅ Matemática aparece APENAS no 6º, 7º e 8º anos</div>
                  <div>✅ Física aparece APENAS na 1ª e 2ª séries do médio</div>
                  <div>✅ Não há vínculos incorretos</div>
                  <div>✅ Professora Maria vê apenas suas disciplinas/séries</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 4,
      titulo: 'Gestão Simplificada',
      tipo: 'gestao',
      conteudo: (
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-medium text-purple-900 mb-3">🎯 Gestão Escolar Simplificada</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                  <span className="font-medium">Disciplinas</span>
                </div>
                <div className="text-sm text-gray-600 space-y-2">
                  <div className="bg-gray-50 p-2 rounded">
                    <strong>Nome:</strong> Matemática<br/>
                    <strong>Segmento:</strong> Fundamental
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <strong>Nome:</strong> Física<br/>
                    <strong>Segmento:</strong> Médio
                  </div>
                  <div className="text-green-600 text-xs">✅ Só o essencial, sem complicação</div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <GraduationCap className="w-5 h-5 text-purple-600" />
                  <span className="font-medium">Séries</span>
                </div>
                <div className="text-sm text-gray-600 space-y-2">
                  <div className="bg-gray-50 p-2 rounded">
                    <strong>Nome:</strong> 6º ano - Ens. Fund.<br/>
                    <strong>Segmento:</strong> Fundamental
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <strong>Nome:</strong> 1ª série - Ens. Médio<br/>
                    <strong>Segmento:</strong> Médio
                  </div>
                  <div className="text-green-600 text-xs">✅ Cadastro rápido e objetivo</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">🔗 Visualização de Vínculos</h4>
            <p className="text-sm text-blue-700 mb-3">
              A aba "Vínculos Existentes" mostra todos os vínculos criados automaticamente:
            </p>
            <div className="bg-white rounded-lg p-3 border border-blue-100">
              <div className="text-sm space-y-1">
                <div><strong>6º ano - Ens. Fundamental</strong></div>
                <div className="ml-4 text-gray-600">📖 Matemática → Professora Maria</div>
                <div className="ml-4 text-gray-600">📖 Português → Professor João</div>
                <div className="text-green-600 text-xs mt-2">✅ Criado automaticamente no cadastro dos professores</div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 5,
      titulo: 'Benefícios',
      tipo: 'beneficios',
      conteudo: (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-semibold text-green-900">🎉 Benefícios da Nova Arquitetura</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-green-800 mb-3">Para Administradores:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Cadastro mais rápido e intuitivo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Zero erros de vinculação</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Sem necessidade de correções manuais</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Interface mais limpa e focada</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-blue-800 mb-3">Para Professores & Alunos:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <span>Veem apenas disciplinas corretas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <span>Séries organizadas adequadamente</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <span>Experiência mais consistente</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <span>Informações sempre precisas</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-purple-900">Resultado Final:</span>
              </div>
              <p className="text-sm text-gray-700">
                Um sistema robusto, preciso e fácil de usar que elimina completamente os problemas de 
                vinculação incorreta entre professores, disciplinas e séries. A manutenção é mínima 
                e a experiência do usuário é muito superior.
              </p>
            </div>
          </div>
        </div>
      )
    }
  ];

  const etapaAtualData = etapas.find(e => e.id === etapaAtual);

  const proximaEtapa = () => {
    if (etapaAtual < etapas.length) {
      setEtapaAtual(etapaAtual + 1);
    }
  };

  const etapaAnterior = () => {
    if (etapaAtual > 1) {
      setEtapaAtual(etapaAtual - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onVoltar}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">✨ Nova Arquitetura de Vinculação</h1>
            <p className="text-sm text-gray-600">Demonstração do novo fluxo Professor → Disciplinas → Séries</p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-5xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Passo {etapaAtual} de {etapas.length}</h2>
            <div className="text-sm text-gray-500">
              {Math.round((etapaAtual / etapas.length) * 100)}% concluído
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(etapaAtual / etapas.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Conteúdo da Etapa */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              {etapaAtualData?.tipo === 'problema' && <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">❌</div>}
              {etapaAtualData?.tipo === 'solucao' && <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">✅</div>}
              {etapaAtualData?.tipo === 'exemplo' && <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">📚</div>}
              {etapaAtualData?.tipo === 'gestao' && <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">🎯</div>}
              {etapaAtualData?.tipo === 'beneficios' && <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-blue-100 rounded-full flex items-center justify-center">🎉</div>}
              {etapaAtualData?.titulo}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {etapaAtualData?.conteudo}
          </CardContent>
        </Card>

        {/* Navegação */}
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={etapaAnterior}
            disabled={etapaAtual === 1}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Anterior
          </Button>

          <div className="flex items-center gap-2">
            {etapas.map(etapa => (
              <button
                key={etapa.id}
                onClick={() => setEtapaAtual(etapa.id)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  etapa.id === etapaAtual 
                    ? 'bg-blue-600' 
                    : etapa.id < etapaAtual 
                      ? 'bg-green-500' 
                      : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          {etapaAtual < etapas.length ? (
            <Button onClick={proximaEtapa}>
              Próximo
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={onVoltar} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              Concluído
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}