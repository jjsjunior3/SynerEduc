import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ArrowLeft, Search, AlertCircle, CheckCircle, Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface DiagnosticoApi404Props {
  onVoltar: () => void;
}

export function DiagnosticoApi404({ onVoltar }: DiagnosticoApi404Props) {
  const [resultados, setResultados] = useState<any[]>([]);
  const [testando, setTestando] = useState(false);
  const [endpointCustom, setEndpointCustom] = useState('');

  const endpoints = [
    // Rotas básicas
    { nome: 'Health Check', url: '/health', metodo: 'GET' },
    { nome: 'Root', url: '/', metodo: 'GET' },
    
    // Rotas de autenticação
    { nome: 'Setup Status', url: '/auth/setup-status', metodo: 'GET' },
    { nome: 'Login', url: '/auth/login', metodo: 'POST' },
    { nome: 'Login Simples', url: '/login', metodo: 'POST' },
    
    // Rotas de usuários
    { nome: 'Listar Usuários', url: '/usuarios', metodo: 'GET' },
    { nome: 'Admin - Listar Usuários', url: '/admin/usuarios', metodo: 'GET' },
    { nome: 'Admin - Listar Professores', url: '/admin/usuarios?tipo=professor', metodo: 'GET' },
    
    // Rotas de disciplinas
    { nome: 'Admin - Disciplinas', url: '/admin/disciplinas', metodo: 'GET' },
    { nome: 'Admin - Séries', url: '/admin/series', metodo: 'GET' },
  ];

  const testarEndpoint = async (endpoint: any) => {
    const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0`;
    const url = `${baseUrl}${endpoint.url}`;
    
    console.log(`[DIAGNÓSTICO] Testando: ${endpoint.metodo} ${url}`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const options: RequestInit = {
        method: endpoint.metodo,
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      };
      
      // Se for POST, adicionar body básico de teste
      if (endpoint.metodo === 'POST') {
        if (endpoint.url.includes('login')) {
          options.body = JSON.stringify({
            nomeUsuario: 'admin',
            senha: 'admin123456'
          });
        }
      }
      
      const start = Date.now();
      const response = await fetch(url, options);
      const tempo = Date.now() - start;
      
      clearTimeout(timeoutId);
      
      let responseData = null;
      let responseText = '';
      
      try {
        responseText = await response.text();
        if (responseText) {
          responseData = JSON.parse(responseText);
        }
      } catch {
        responseData = { raw: responseText };
      }
      
      return {
        ...endpoint,
        url: url,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        tempo: tempo,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData,
        error: null
      };
      
    } catch (error: any) {
      console.error(`[DIAGNÓSTICO] Erro em ${endpoint.nome}:`, error);
      
      return {
        ...endpoint,
        url: url,
        status: 0,
        statusText: 'ERRO',
        ok: false,
        tempo: 0,
        headers: {},
        data: null,
        error: error.message || 'Erro desconhecido'
      };
    }
  };

  const testarTodosEndpoints = async () => {
    setTestando(true);
    setResultados([]);
    
    console.log('[DIAGNÓSTICO] Iniciando teste de todos os endpoints...');
    
    const resultadosTemp = [];
    
    for (const endpoint of endpoints) {
      const resultado = await testarEndpoint(endpoint);
      resultadosTemp.push(resultado);
      setResultados([...resultadosTemp]);
      
      // Pequena pausa entre requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    setTestando(false);
    console.log('[DIAGNÓSTICO] Teste completo finalizado');
  };

  const testarEndpointCustom = async () => {
    if (!endpointCustom.trim()) {
      toast.error('Digite um endpoint para testar');
      return;
    }
    
    const endpoint = {
      nome: 'Endpoint Customizado',
      url: endpointCustom.startsWith('/') ? endpointCustom : `/${endpointCustom}`,
      metodo: 'GET'
    };
    
    setTestando(true);
    const resultado = await testarEndpoint(endpoint);
    setResultados(prev => [resultado, ...prev]);
    setTestando(false);
  };

  const copiarComandoCurl = (resultado: any) => {
    const curl = `curl -X ${resultado.metodo} "${resultado.url}" \\
  -H "Authorization: Bearer ${publicAnonKey}" \\
  -H "Content-Type: application/json"`;
    
    navigator.clipboard.writeText(curl);
    toast.success('Comando curl copiado!');
  };

  const getStatusColor = (status: number) => {
    if (status === 0) return 'text-gray-500';
    if (status >= 200 && status < 300) return 'text-green-600';
    if (status >= 400 && status < 500) return 'text-red-600';
    if (status >= 500) return 'text-purple-600';
    return 'text-yellow-600';
  };

  const getStatusIcon = (resultado: any) => {
    if (resultado.error) return <AlertCircle className="w-4 h-4 text-red-500" />;
    if (resultado.ok) return <CheckCircle className="w-4 h-4 text-green-500" />;
    return <AlertCircle className="w-4 h-4 text-red-500" />;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onVoltar}>
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div>
            <h1 className="font-semibold text-gray-900">🔍 Diagnóstico API 404</h1>
            <p className="text-sm text-gray-600">Identificar problemas nas rotas do servidor</p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto">
        {/* Configuração */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Configuração do Servidor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="font-medium">Project ID:</Label>
                <div className="bg-gray-100 p-2 rounded font-mono">{projectId}</div>
              </div>
              <div>
                <Label className="font-medium">Base URL:</Label>
                <div className="bg-gray-100 p-2 rounded font-mono text-xs">
                  https://{projectId}.supabase.co/functions/v1/make-server-c61d1ad0
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Controles */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Testes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <Button 
                  onClick={testarTodosEndpoints} 
                  disabled={testando}
                  className="flex items-center gap-2"
                >
                  {testando ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Testar Todos os Endpoints
                </Button>
                
                <Button 
                  onClick={() => setResultados([])} 
                  variant="outline"
                  disabled={testando}
                >
                  Limpar Resultados
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Input
                  placeholder="/admin/usuarios"
                  value={endpointCustom}
                  onChange={(e) => setEndpointCustom(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={testarEndpointCustom}
                  disabled={testando}
                  variant="outline"
                >
                  Testar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        {resultados.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Resultados ({resultados.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {resultados.map((resultado, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(resultado)}
                        <div>
                          <div className="font-medium">{resultado.nome}</div>
                          <div className="text-sm text-gray-600">
                            {resultado.metodo} {resultado.url}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {resultado.tempo > 0 && (
                          <div className="text-sm text-gray-500">
                            {resultado.tempo}ms
                          </div>
                        )}
                        <div className={`font-mono text-sm ${getStatusColor(resultado.status)}`}>
                          {resultado.status} {resultado.statusText}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copiarComandoCurl(resultado)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    
                    {resultado.error && (
                      <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
                        <div className="text-red-800 font-medium mb-1">Erro:</div>
                        <div className="text-red-700 text-sm">{resultado.error}</div>
                      </div>
                    )}
                    
                    {resultado.data && (
                      <div className="bg-gray-50 rounded p-3">
                        <div className="text-gray-700 font-medium mb-2">Resposta:</div>
                        <pre className="text-xs text-gray-600 overflow-auto max-h-40">
                          {JSON.stringify(resultado.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {testando && (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
            <p className="text-gray-600">Testando endpoints...</p>
          </div>
        )}
      </div>
    </div>
  );
}