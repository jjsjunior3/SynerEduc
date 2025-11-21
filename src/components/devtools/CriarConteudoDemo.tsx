import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Book, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  ArrowLeft,
  Zap
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface CriarConteudoDemoProps {
  onVoltar?: () => void;
}

export function CriarConteudoDemo({ onVoltar }: CriarConteudoDemoProps) {
  const [criandoDemo, setCriandoDemo] = useState(false);
  const [resultado, setResultado] = useState<{ success: boolean; message: string; conteudosCriados?: number } | null>(null);

  const criarConteudoDemo = async () => {
    try {
      setCriandoDemo(true);
      setResultado(null);
      console.log('[ADMIN] Criando conteúdo de demonstração...');

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/criar-conteudo-demo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[ADMIN] Conteúdo de demonstração criado:', data);
        setResultado({
          success: true,
          message: `Sucesso! ${data.conteudosCriados} conteúdos de demonstração criados para todas as séries.`,
          conteudosCriados: data.conteudosCriados
        });
      } else {
        const errorText = await response.text();
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('[ADMIN] Erro ao criar conteúdo de demonstração:', error);
      setResultado({
        success: false,
        message: `Erro ao criar conteúdo de demonstração: ${error.message}`
      });
    } finally {
      setCriandoDemo(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            {onVoltar && (
              <Button variant="ghost" onClick={onVoltar}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Ferramentas de Administração</h1>
              <p className="text-gray-600">Criar conteúdo de demonstração para todas as séries</p>
            </div>
          </div>
        </div>

        {/* Card Principal */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Book className="w-5 h-5 text-blue-500" />
              Criar Conteúdo de Demonstração
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Informações */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900 mb-2">O que faz esta ferramenta?</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Cria material de estudo para TODAS as séries escolares</li>
                    <li>• Gera 2 bimestres de conteúdo para cada disciplina</li>
                    <li>• Resolve o problema "Nenhuma disciplina encontrada"</li>
                    <li>• Usa PDFs de exemplo para demonstração</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Séries que serão populadas */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Séries que receberão conteúdo:</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  '5º ano', '6º ano', '7º ano', '8º ano', 
                  '9º ano', '1ª série', '2ª série', '3ª série'
                ].map((serie) => (
                  <Badge key={serie} variant="secondary" className="justify-center">
                    {serie}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Botão de Ação */}
            <div className="flex justify-center">
              <Button
                onClick={criarConteudoDemo}
                disabled={criandoDemo}
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                size="lg"
              >
                {criandoDemo ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Criando Conteúdo...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    Criar Conteúdo de Demonstração
                  </>
                )}
              </Button>
            </div>

            {/* Resultado */}
            {resultado && (
              <div className={`border rounded-lg p-4 ${
                resultado.success 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-start gap-3">
                  {resultado.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  )}
                  <div>
                    <h3 className={`font-medium mb-1 ${
                      resultado.success ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {resultado.success ? 'Sucesso!' : 'Erro!'}
                    </h3>
                    <p className={`text-sm ${
                      resultado.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {resultado.message}
                    </p>
                    {resultado.success && resultado.conteudosCriados && (
                      <div className="mt-3 p-3 bg-green-100 rounded border border-green-300">
                        <div className="text-sm text-green-800">
                          <strong>Detalhes:</strong>
                          <ul className="mt-1">
                            <li>• {resultado.conteudosCriados} conteúdos criados</li>
                            <li>• 8 séries populadas</li>
                            <li>• 2 bimestres por disciplina</li>
                            <li>• Agora os alunos verão disciplinas com conteúdo!</li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instruções */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Como usar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-gray-700">
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">1</span>
                <p>Clique no botão "Criar Conteúdo de Demonstração" acima</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">2</span>
                <p>Aguarde o processo completar (pode levar alguns segundos)</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">3</span>
                <p>Faça login como aluno de qualquer série para ver as disciplinas</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">4</span>
                <p>O erro "Nenhuma disciplina encontrada" será resolvido!</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}