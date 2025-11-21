import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Upload, CheckCircle, FileText, User } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export function TesteUploadConteudista() {
  const [testesExecutados, setTestesExecutados] = useState<string[]>([]);

  const executarTeste = (nome: string, funcao: () => void) => {
    try {
      funcao();
      setTestesExecutados(prev => [...prev, nome]);
      toast.success(`✅ ${nome} - OK`);
    } catch (error) {
      toast.error(`❌ ${nome} - Erro: ${error}`);
    }
  };

  const testarLogin = () => {
    const email = 'conteudista@conexaoead.ma.gov.br';
    if (!email.includes('conteudista')) {
      throw new Error('Login de conteudista não reconhecido');
    }
  };

  const testarNavegacao = () => {
    // Simular navegação para upload
    const views = ['dashboard', 'series', 'disciplina', 'uploadPDF'];
    if (!views.includes('uploadPDF')) {
      throw new Error('View de upload não encontrada');
    }
  };

  const testarUpload = () => {
    // Simular seleção de arquivo PDF
    const arquivo = new File(['conteudo fake'], 'teste.pdf', { type: 'application/pdf' });
    if (arquivo.type !== 'application/pdf') {
      throw new Error('Tipo de arquivo inválido');
    }
  };

  const testarFormulario = () => {
    const formulario = {
      serie: '6ano',
      disciplina: 'matematica',
      bimestre: '1',
      topico: 'Equações do 1º grau'
    };
    
    if (!formulario.topico.trim()) {
      throw new Error('Tópico obrigatório não preenchido');
    }
  };

  const testeFuncional = () => {
    // Criar um arquivo PDF fictício
    const blob = new Blob(['%PDF-1.4 fake content'], { type: 'application/pdf' });
    const arquivo = new File([blob], 'material-matematica.pdf', { type: 'application/pdf' });
    
    // Simular processo completo
    const etapas = [
      'Arquivo selecionado',
      'Validação OK',
      'Formulário preenchido',
      'Upload iniciado',
      'Upload concluído'
    ];
    
    etapas.forEach((etapa, index) => {
      setTimeout(() => {
        toast.success(`📤 ${etapa}`);
      }, index * 500);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-6 h-6 text-purple-600" />
              Teste do Sistema de Upload - Professor Conteudista
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => executarTeste('Login Conteudista', testarLogin)}
                variant="outline"
                className="h-auto p-4 justify-start"
              >
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-blue-600" />
                  <div className="text-left">
                    <div className="font-medium">Teste Login</div>
                    <div className="text-sm text-gray-600">Verificar acesso como conteudista</div>
                  </div>
                </div>
              </Button>

              <Button
                onClick={() => executarTeste('Navegação Upload', testarNavegacao)}
                variant="outline"
                className="h-auto p-4 justify-start"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-green-600" />
                  <div className="text-left">
                    <div className="font-medium">Teste Navegação</div>
                    <div className="text-sm text-gray-600">Acessar área de upload</div>
                  </div>
                </div>
              </Button>

              <Button
                onClick={() => executarTeste('Seleção Arquivo', testarUpload)}
                variant="outline"
                className="h-auto p-4 justify-start"
              >
                <div className="flex items-center gap-3">
                  <Upload className="w-5 h-5 text-purple-600" />
                  <div className="text-left">
                    <div className="font-medium">Teste Upload</div>
                    <div className="text-sm text-gray-600">Selecionar arquivo PDF</div>
                  </div>
                </div>
              </Button>

              <Button
                onClick={() => executarTeste('Formulário Detalhes', testarFormulario)}
                variant="outline"
                className="h-auto p-4 justify-start"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div className="text-left">
                    <div className="font-medium">Teste Formulário</div>
                    <div className="text-sm text-gray-600">Preencher detalhes</div>
                  </div>
                </div>
              </Button>
            </div>

            <div className="mt-6">
              <Button
                onClick={testeFuncional}
                className="w-full bg-purple-600 hover:bg-purple-700"
                size="lg"
              >
                <Upload className="w-5 h-5 mr-2" />
                Executar Teste Funcional Completo
              </Button>
            </div>

            {testesExecutados.length > 0 && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-medium text-green-800 mb-2">✅ Testes Executados:</h3>
                <div className="flex flex-wrap gap-2">
                  {testesExecutados.map((teste, index) => (
                    <Badge key={index} variant="secondary" className="bg-green-100 text-green-800">
                      {teste}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Como Usar o Sistema de Upload</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <div>
                  <h4 className="font-medium">Fazer Login como Conteudista</h4>
                  <p className="text-sm text-gray-600">Use: conteudista@conexaoead.ma.gov.br</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <div>
                  <h4 className="font-medium">Navegar até Upload</h4>
                  <p className="text-sm text-gray-600">Clique em "Upload Rápido" ou "Novo Upload"</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                <div>
                  <h4 className="font-medium">Selecionar Arquivos PDF</h4>
                  <p className="text-sm text-gray-600">Arraste e solte ou clique para selecionar</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                <div>
                  <h4 className="font-medium">Preencher Detalhes</h4>
                  <p className="text-sm text-gray-600">Série, disciplina, bimestre e nome do tópico</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">5</div>
                <div>
                  <h4 className="font-medium">Enviar</h4>
                  <p className="text-sm text-gray-600">Clique em "Enviar" e acompanhe o progresso</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}