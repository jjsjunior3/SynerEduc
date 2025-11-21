import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export function TesteLoginRapidoFixed() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123456');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const testLogin = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const loginData = {
        nomeUsuario: username,
        senha: password
      };

      console.log('🔐 Testando login...', { username, hasPassword: !!password });

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/login`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(loginData)
        }
      );

      const data = await response.json();

      setResult({
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        data: data,
        success: response.ok && data.success,
        timestamp: new Date().toLocaleString('pt-BR')
      });

      console.log('📋 Resultado do teste:', { response: response.status, data });

    } catch (error) {
      setResult({
        status: 'ERROR',
        error: error.message,
        success: false,
        timestamp: new Date().toLocaleString('pt-BR')
      });
      console.error('❌ Erro no teste de login:', error);
    }

    setIsLoading(false);
  };

  const getStatusBadge = () => {
    if (!result) return null;
    
    if (result.success) {
      return <Badge className="bg-green-100 text-green-800">✅ LOGIN OK</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">❌ LOGIN FALHOU</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            🧪 Teste de Login Corrigido
            {getStatusBadge()}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="username">Nome de Usuário</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
              />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="admin123456"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={testLogin}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? '⏳' : '🧪'} {isLoading ? 'Testando...' : 'Testar Login'}
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => window.location.href = window.location.pathname}
            >
              ← Voltar
            </Button>
          </div>

          {result && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">📊 Resultado do Teste:</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-gray-100 rounded">
                  <h4 className="font-medium">Status HTTP</h4>
                  <p className="text-lg">{result.status}</p>
                </div>
                
                <div className="p-3 bg-gray-100 rounded">
                  <h4 className="font-medium">Status Text</h4>
                  <p className="text-sm">{result.statusText || 'N/A'}</p>
                </div>
                
                <div className="p-3 bg-gray-100 rounded">
                  <h4 className="font-medium">Timestamp</h4>
                  <p className="text-xs">{result.timestamp}</p>
                </div>
              </div>

              {result.data && (
                <div className="space-y-2">
                  <h4 className="font-medium">📄 Dados de Resposta:</h4>
                  <pre className="p-3 bg-gray-100 rounded text-xs overflow-auto max-h-60">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              )}

              {result.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <h4 className="font-medium text-red-800">❌ Erro:</h4>
                  <p className="text-red-700">{result.error}</p>
                </div>
              )}

              {result.success && result.data?.usuario && (
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <h4 className="font-medium text-green-800">✅ Login Bem-sucedido!</h4>
                  <p className="text-green-700">
                    Usuário: <strong>{result.data.usuario.nome}</strong> 
                    ({result.data.usuario.tipo})
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">ℹ️ Informações do Teste:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• URL: <code>/auth/login</code> (rota corrigida)</li>
              <li>• Método: POST</li>
              <li>• Autorização: Bearer token</li>
              <li>• Credenciais: nome de usuário + senha</li>
              <li>• Configuração: {projectId ? '✅ OK' : '❌ Faltando'}</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}