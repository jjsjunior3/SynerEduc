import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Shield, AlertTriangle, ExternalLink, Copy, CheckCircle } from 'lucide-react';

export function InstrucoesSolucaoTipoUsuario() {
  const [copied, setCopied] = React.useState(false);

  const linkCorrecao = `${window.location.origin}?mode=correcao-tipo`;
  const linkAcessoRapido = `${window.location.origin}?mode=correcao-acesso`;

  const copiarLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const acessarCorrecao = () => {
    window.location.href = '?mode=correcao-tipo';
  };

  const acessarMenu = () => {
    window.location.href = '?mode=correcao-acesso';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-red-600" />
            <div>
              <CardTitle className="text-2xl">Solução: Correção de Tipo de Usuário</CardTitle>
              <CardDescription>
                Como resolver o problema do seu login estar cadastrado como "aluno" ao invés de "administrador"
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Problema identificado */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Problema identificado:</strong> Seu email "jrsantosdev1@gmail.com" está cadastrado como 
              <Badge className="mx-1 bg-green-100 text-green-800">aluno da 3ª série EM</Badge>
              ao invés de 
              <Badge className="mx-1 bg-red-100 text-red-800">administrador</Badge>
            </AlertDescription>
          </Alert>

          {/* Solução rápida */}
          <div className="bg-green-50 p-6 rounded-lg border border-green-200">
            <h3 className="font-medium text-green-900 mb-4 text-xl flex items-center gap-2">
              <CheckCircle className="h-6 w-6" />
              Solução Implementada
            </h3>
            
            <p className="text-green-800 mb-4">
              Criamos uma ferramenta específica para corrigir o tipo de usuário. Você pode acessá-la de duas formas:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Opção 1: Acesso direto */}
              <div className="bg-white p-4 rounded-lg border border-green-300">
                <h4 className="font-medium text-green-900 mb-2">Opção 1: Acesso Direto</h4>
                <p className="text-green-700 text-sm mb-3">
                  Acessar diretamente a ferramenta de correção
                </p>
                <Button 
                  onClick={acessarCorrecao}
                  className="w-full mb-2 bg-green-600 hover:bg-green-700"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Acessar Correção
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={linkCorrecao}
                    readOnly
                    className="text-xs bg-gray-100 p-1 rounded flex-1"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copiarLink(linkCorrecao)}
                  >
                    {copied ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>

              {/* Opção 2: Menu de ferramentas */}
              <div className="bg-white p-4 rounded-lg border border-green-300">
                <h4 className="font-medium text-green-900 mb-2">Opção 2: Menu de Ferramentas</h4>
                <p className="text-green-700 text-sm mb-3">
                  Menu com várias ferramentas administrativas
                </p>
                <Button 
                  onClick={acessarMenu}
                  className="w-full mb-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Menu de Correções
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={linkAcessoRapido}
                    readOnly
                    className="text-xs bg-gray-100 p-1 rounded flex-1"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copiarLink(linkAcessoRapido)}
                  >
                    {copied ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Passo a passo */}
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-900 mb-4 text-lg">Passo a Passo da Correção:</h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="bg-blue-600 text-white text-sm font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">1</div>
                <div>
                  <p className="font-medium text-blue-900">Acessar a ferramenta</p>
                  <p className="text-blue-700 text-sm">Clique em um dos botões acima ou use os links fornecidos</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="bg-blue-600 text-white text-sm font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
                <div>
                  <p className="font-medium text-blue-900">Buscar seu usuário</p>
                  <p className="text-blue-700 text-sm">O campo já vem preenchido com "jrsantosdev1@gmail.com", clique em "Buscar Usuário"</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="bg-blue-600 text-white text-sm font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">3</div>
                <div>
                  <p className="font-medium text-blue-900">Confirmar a correção</p>
                  <p className="text-blue-700 text-sm">Verifique os dados e clique em "Confirmar Correção" para alterar de "aluno" para "administrador"</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="bg-blue-600 text-white text-sm font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">4</div>
                <div>
                  <p className="font-medium text-blue-900">Fazer logout e login</p>
                  <p className="text-blue-700 text-sm">Importante: Após a correção, faça logout e login novamente para aplicar as mudanças</p>
                </div>
              </div>
            </div>
          </div>

          {/* O que será alterado */}
          <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
            <h3 className="font-medium text-yellow-900 mb-3 text-lg">O que será alterado:</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-yellow-700 font-medium">Tipo de usuário:</span>
                <div className="mt-1">
                  <Badge className="bg-green-100 text-green-800 line-through">aluno</Badge>
                  <span className="mx-2">→</span>
                  <Badge className="bg-red-100 text-red-800">administrador</Badge>
                </div>
              </div>
              <div>
                <span className="text-yellow-700 font-medium">Série:</span>
                <div className="mt-1">
                  <Badge className="bg-gray-100 text-gray-800 line-through">3ª série EM</Badge>
                  <span className="mx-2">→</span>
                  <Badge className="bg-gray-200 text-gray-600">(removida)</Badge>
                </div>
              </div>
              <div>
                <span className="text-yellow-700 font-medium">Turma:</span>
                <div className="mt-1">
                  <Badge className="bg-gray-100 text-gray-800 line-through">(se houver)</Badge>
                  <span className="mx-2">→</span>
                  <Badge className="bg-gray-200 text-gray-600">(removida)</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Acesso alternativo */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Acesso alternativo via URL:</h4>
            <p className="text-gray-600 text-sm mb-2">
              Você também pode acessar digitando diretamente na barra de endereços:
            </p>
            <code className="bg-gray-200 px-2 py-1 rounded text-sm">
              ?mode=correcao-tipo
            </code>
            <span className="text-gray-500 text-sm ml-2">ou</span>
            <code className="bg-gray-200 px-2 py-1 rounded text-sm ml-2">
              ?mode=correcao-acesso
            </code>
          </div>

          {/* Voltar */}
          <div className="flex justify-center pt-4 border-t">
            <Button 
              onClick={() => window.location.href = '/'}
              variant="ghost"
              size="sm"
            >
              ← Voltar ao Sistema Principal
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}