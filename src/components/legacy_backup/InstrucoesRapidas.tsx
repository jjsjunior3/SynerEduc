import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

export function InstrucoesRapidas() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🚨 Sistema AVA - Problemas de Login Resolvidos
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              ✅ Correção Aplicada com Sucesso!
            </h3>
            <p className="text-green-700 mb-3">
              O problema das rotas de autenticação foi identificado e corrigido. 
              As URLs de login estavam com caminhos incorretos causando erros 404.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-red-100 text-red-800">❌ Antes</Badge>
                <code className="text-sm bg-white px-2 py-1 rounded">/login</code>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-100 text-green-800">✅ Agora</Badge>
                <code className="text-sm bg-white px-2 py-1 rounded">/auth/login</code>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🔐 Credenciais de Teste</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <strong>Administrador:</strong>
                    <div className="bg-gray-100 p-2 rounded mt-1">
                      <div>Usuário: <code>admin</code></div>
                      <div>Senha: <code>admin123456</code></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🛠️ Ferramentas de Diagnóstico</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  onClick={() => window.location.href = '?mode=teste-login'}
                  className="w-full"
                  size="sm"
                >
                  🧪 Teste de Login
                </Button>
                <Button 
                  onClick={() => window.location.href = '?mode=diagnostico-login'}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  🔍 Diagnóstico Completo
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">
              🔧 O que foi corrigido:
            </h3>
            <ul className="text-blue-700 space-y-1">
              <li>• ✅ Rota de login principal corrigida para <code>/auth/login</code></li>
              <li>• ✅ Rota de compatibilidade adicionada em <code>/login</code></li>
              <li>• ✅ AuthContext atualizado com URLs corretas</li>
              <li>• ✅ Timeouts otimizados para 8 segundos</li>
              <li>• ✅ Logs detalhados para debugging</li>
              <li>• ✅ Tratamento de erros melhorado</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={() => window.location.href = window.location.pathname}
              className="flex-1"
            >
              🏠 Voltar ao Sistema
            </Button>
            
            <Button 
              onClick={() => window.location.href = '?mode=diagnostico-login'}
              variant="outline"
              className="flex-1"
            >
              🔍 Testar Login
            </Button>
          </div>

          <div className="text-sm text-gray-600 text-center mt-6">
            <p>Sistema AVA - Colégio Conexão EAD Maranhense</p>
            <p>Problema identificado e corrigido em: {new Date().toLocaleString('pt-BR')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}