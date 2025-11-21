import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Shield, AlertTriangle, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

export function AcessoRapidoCorrecao() {
  const abrirCorrecaoTipo = () => {
    window.location.href = '?mode=correcao-tipo';
  };

  const abrirDiagnosticoAdmin = () => {
    window.location.href = '?mode=diagnostico-admin';
  };

  const abrirAdminUsuarios = () => {
    window.location.href = '?mode=admin';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-red-600" />
            <div>
              <CardTitle className="text-2xl">Ferramentas de Correção</CardTitle>
              <CardDescription>
                Acesso rápido a ferramentas administrativas para correção de problemas
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Problema identificado:</strong> Seu login está cadastrado como "aluno" ao invés de "administrador".
              Use as ferramentas abaixo para corrigir isso.
            </AlertDescription>
          </Alert>

          {/* Correção de Tipo de Usuário */}
          <div className="space-y-4">
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h3 className="font-medium text-red-900 mb-2 flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Correção de Tipo de Usuário
              </h3>
              <p className="text-red-800 text-sm mb-3">
                Ferramenta principal para alterar o tipo de usuário de "aluno" para "administrador".
                Esta é a solução recomendada para o seu problema.
              </p>
              <Button 
                onClick={abrirCorrecaoTipo}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                <Shield className="h-4 w-4 mr-2" />
                Acessar Correção de Tipo
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </div>

            {/* Ferramentas auxiliares */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Diagnóstico Admin</h4>
                <p className="text-blue-800 text-sm mb-3">
                  Verificar status administrativo e problemas relacionados.
                </p>
                <Button 
                  onClick={abrirDiagnosticoAdmin}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Diagnóstico
                </Button>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-900 mb-2">Admin Usuários</h4>
                <p className="text-green-800 text-sm mb-3">
                  Gerenciar usuários do sistema (se tiver permissão).
                </p>
                <Button 
                  onClick={abrirAdminUsuarios}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Gerenciar
                </Button>
              </div>
            </div>
          </div>

          {/* Instruções */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Instruções:</h4>
            <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
              <li>Clique em "Acessar Correção de Tipo" acima</li>
              <li>Digite seu email (jrsantosdev1@gmail.com)</li>
              <li>Confirme a alteração de "aluno" para "administrador"</li>
              <li>Faça logout e login novamente para aplicar as mudanças</li>
            </ol>
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