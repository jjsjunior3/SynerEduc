import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  Play, 
  Pause, 
  Volume2, 
  Maximize, 
  CheckCircle, 
  Clock,
  ChevronLeft,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useState } from 'react';

interface Topico {
  id: string;
  titulo: string;
  concluido: boolean;
  conteudo: string;
  conteudoCompleto?: string;
  tipo: 'video' | 'texto' | 'exercicio';
  duracao?: string;
  videoUrl?: string;
  videoThumbnail?: string;
}

interface ConteudoViewerProps {
  topico: Topico | null;
  onClose: () => void;
  onProximo: () => void;
  onAnterior: () => void;
  hasProximo: boolean;
  hasAnterior: boolean;
  onMarcarConcluido: (topicoId: string) => void;
}

export function ConteudoViewer({ 
  topico, 
  onClose, 
  onProximo, 
  onAnterior, 
  hasProximo, 
  hasAnterior,
  onMarcarConcluido 
}: ConteudoViewerProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  if (!topico) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg mb-2">Selecione um tópico para estudar</p>
          <p className="text-sm">Escolha um tópico da lista ao lado para visualizar o conteúdo</p>
        </div>
      </div>
    );
  }

  const conteudoDetalhado = {
    'top1': {
      titulo: 'Introdução aos Conceitos Fundamentais',
      conteudo: `
        <h2>Conceitos Fundamentais da Disciplina</h2>
        
        <p>Neste primeiro módulo, vamos explorar os fundamentos essenciais que servirão como base para todo o nosso aprendizado ao longo do curso. É importante compreender estes conceitos básicos antes de avançarmos para tópicos mais complexos.</p>

        <h3>Objetivos de Aprendizagem</h3>
        <ul>
          <li>Compreender os princípios básicos da disciplina</li>
          <li>Identificar os principais elementos conceituais</li>
          <li>Aplicar os conhecimentos em situações práticas</li>
          <li>Desenvolver o pensamento crítico sobre o tema</li>
        </ul>

        <h3>Definições Importantes</h3>
        <p><strong>Conceito Fundamental 1:</strong> Refere-se aos elementos básicos que compõem a estrutura teórica da disciplina. Estes conceitos são universalmente aceitos e formam a base para desenvolvimentos mais avançados.</p>

        <p><strong>Conceito Fundamental 2:</strong> Relaciona-se com a aplicação prática dos princípios teóricos em situações do mundo real. É através desta aplicação que conseguimos validar e compreender melhor os conceitos abstratos.</p>

        <h3>Exemplos Práticos</h3>
        <p>Para ilustrar estes conceitos, vamos analisar alguns exemplos do cotidiano:</p>
        <ol>
          <li>Exemplo 1: Como os conceitos se manifestam em situações corriqueiras</li>
          <li>Exemplo 2: Aplicação profissional dos princípios estudados</li>
          <li>Exemplo 3: Impacto dos conceitos na sociedade moderna</li>
        </ol>

        <h3>Atividade de Reflexão</h3>
        <p>Antes de prosseguir para o próximo tópico, reflita sobre as seguintes questões:</p>
        <ul>
          <li>Como estes conceitos se relacionam com seus conhecimentos prévios?</li>
          <li>Onde você pode observar estes princípios em sua vida diária?</li>
          <li>Quais são as principais dificuldades em compreender estes conceitos?</li>
        </ul>
      `,
      videoThumbnail: "https://images.unsplash.com/photo-1691331694417-4164eb5b7f75?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlZHVjYXRpb24lMjB2aWRlbyUyMGxlc3NvbnxlbnwxfHx8fDE3NTY1NjAwNjJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
    },
    'top2': {
      titulo: 'Primeira Aplicação Prática',
      conteudo: `
        <h2>Aplicando os Conceitos na Prática</h2>
        
        <p>Agora que compreendemos os fundamentos teóricos, é hora de colocar esse conhecimento em prática. Este módulo foi desenvolvido para ajudá-lo a fazer a ponte entre teoria e aplicação real.</p>

        <h3>Metodologia de Aplicação</h3>
        <p>Para aplicar efetivamente os conceitos aprendidos, seguiremos uma metodologia estruturada:</p>
        
        <ol>
          <li><strong>Identificação do Problema:</strong> Como reconhecer situações onde os conceitos podem ser aplicados</li>
          <li><strong>Análise Inicial:</strong> Avaliação dos elementos envolvidos na situação</li>
          <li><strong>Seleção de Estratégias:</strong> Escolha das melhores abordagens baseadas nos conceitos estudados</li>
          <li><strong>Implementação:</strong> Aplicação prática das estratégias selecionadas</li>
          <li><strong>Avaliação de Resultados:</strong> Análise crítica dos resultados obtidos</li>
        </ol>

        <h3>Estudo de Caso</h3>
        <p>Vamos analisar um caso real onde os conceitos fundamentais foram aplicados com sucesso:</p>
        
        <div class="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500 my-4">
          <h4>Caso: Implementação em Ambiente Corporativo</h4>
          <p>Uma empresa do setor tecnológico precisava resolver um problema complexo relacionado aos conceitos que estamos estudando. A equipe responsável utilizou os princípios fundamentais para desenvolver uma solução inovadora.</p>
          
          <p><strong>Desafio:</strong> O principal desafio era adaptar os conceitos teóricos para uma situação prática específica, considerando as limitações e recursos disponíveis.</p>
          
          <p><strong>Solução:</strong> Através da aplicação sistemática dos fundamentos, foi possível criar uma abordagem personalizada que atendeu às necessidades específicas do contexto.</p>
          
          <p><strong>Resultados:</strong> A implementação resultou em melhorias significativas, demonstrando a eficácia da aplicação correta dos conceitos fundamentais.</p>
        </div>

        <h3>Exercício Prático</h3>
        <p>Agora é sua vez! Complete o exercício a seguir para praticar a aplicação dos conceitos:</p>
        
        <div class="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500 my-4">
          <h4>Atividade: Análise de Cenário</h4>
          <p>Imagine que você está enfrentando uma situação similar ao caso estudado. Como você aplicaria os conceitos fundamentais para resolver o problema?</p>
          
          <p>Considere:</p>
          <ul>
            <li>Quais conceitos são mais relevantes para esta situação?</li>
            <li>Como você organizaria sua abordagem?</li>
            <li>Quais resultados você esperaria obter?</li>
          </ul>
        </div>
      `,
      videoThumbnail: "https://images.unsplash.com/photo-1613151096599-b234757eb4d2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvbmxpbmUlMjBsZWFybmluZyUyMHN0dWRlbnR8ZW58MXx8fHwxNzU2NTYwMDYyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
    }
  };

  const conteudoAtual = conteudoDetalhado[topico.id as keyof typeof conteudoDetalhado] || {
    titulo: topico.titulo,
    conteudo: `<p>${topico.conteudo}</p>`,
    videoThumbnail: "https://images.unsplash.com/photo-1691331694417-4164eb5b7f75?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlZHVjYXRpb24lMjB2aWRlbyUyMGxlc3NvbnxlbnwxfHx8fDE3NTY1NjAwNjJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header do Conteúdo */}
      <div className="border-b border-gray-200 p-6 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {topico.tipo === 'video' && <Play className="w-5 h-5 text-blue-500" />}
              {topico.tipo === 'texto' && <BookOpen className="w-5 h-5 text-green-500" />}
              {topico.tipo === 'exercicio' && <CheckCircle className="w-5 h-5 text-orange-500" />}
              <Badge variant="secondary">{topico.tipo}</Badge>
            </div>
            {topico.duracao && (
              <Badge variant="outline" className="gap-1">
                <Clock className="w-3 h-3" />
                {topico.duracao}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!topico.concluido && (
              <Button 
                onClick={() => onMarcarConcluido(topico.id)}
                size="sm"
                variant="outline"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Marcar como Concluído
              </Button>
            )}
            {topico.concluido && (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="w-3 h-3" />
                Concluído
              </Badge>
            )}
          </div>
        </div>
        <h1 className="mt-3 text-xl font-semibold text-gray-900">{conteudoAtual.titulo}</h1>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Vídeo */}
          {topico.tipo === 'video' && (
            <Card>
              <CardContent className="p-0">
                <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                  <ImageWithFallback
                    src={conteudoAtual.videoThumbnail}
                    alt="Thumbnail do vídeo"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                    <Button
                      size="lg"
                      variant="secondary"
                      className="gap-2"
                      onClick={() => setIsPlaying(!isPlaying)}
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-6 h-6" />
                          Pausar
                        </>
                      ) : (
                        <>
                          <Play className="w-6 h-6" />
                          Reproduzir
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center gap-4 text-white">
                      <Progress value={30} className="flex-1 bg-white/20" />
                      <span className="text-sm">5:30 / 15:00</span>
                      <Button size="sm" variant="ghost" className="text-white hover:bg-white/20">
                        <Volume2 className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-white hover:bg-white/20">
                        <Maximize className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Texto do Conteúdo */}
          <Card>
            <CardContent className="p-8">
              <div 
                className="prose prose-gray max-w-none"
                dangerouslySetInnerHTML={{ __html: conteudoAtual.conteudo }}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer com Navegação */}
      <div className="border-t border-gray-200 p-6 bg-white">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={onAnterior}
            disabled={!hasAnterior}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </Button>
          
          <div className="text-sm text-gray-600">
            Tópico: {topico.titulo}
          </div>
          
          <Button
            onClick={onProximo}
            disabled={!hasProximo}
            className="gap-2"
          >
            Próximo
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}