import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  AlertCircle, 
  CheckCircle, 
  Copy,
  ExternalLink,
  Settings,
  Database,
  Globe,
  Key,
  Loader2,
  RefreshCw
} from 'lucide-react';

interface ConfigStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'checking' | 'success' | 'error';
  details?: string;
  action?: string;
}

export function ConfiguracaoNovoComputador() {
  const [etapas, setEtapas] = useState<ConfigStep[]>([
    {
      id: 'supabase-vars',
      title: 'Configurar Variáveis Supabase',
      description: 'Verificar se as variáveis SUPABASE_URL e SUPABASE_ANON_KEY estão configuradas',
      status: 'pending'
    },
    {
      id: 'connectivity',
      title: 'Testar Conectividade',
      description: 'Verificar se consegue acessar o servidor Supabase',
      status: 'pending'
    },
    {
      id: 'server-status',
      title: 'Status do Servidor',
      description: 'Verificar se o servidor Edge Function está respondendo',
      status: 'pending'
    },
    {
      id: 'database',
      title: 'Verificar Banco de Dados',
      description: 'Testar acesso ao KV Store e dados básicos',
      status: 'pending'
    }
  ]);

  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [verificando, setVerificando] = useState(false);

  // Verificar variáveis existentes
  useEffect(() => {
    try {
      // Tentar importar as configurações existentes
      import('../utils/supabase/info').then(({ projectId, publicAnonKey }) => {
        if (projectId && publicAnonKey) {
          setSupabaseUrl(`https://${projectId}.supabase.co`);
          setSupabaseKey(publicAnonKey);
          
          // Atualizar status da primeira etapa
          setEtapas(prev => prev.map(etapa => 
            etapa.id === 'supabase-vars' 
              ? { ...etapa, status: 'success', details: 'Variáveis encontradas!' }
              : etapa
          ));
        }
      }).catch(() => {
        setEtapas(prev => prev.map(etapa => 
          etapa.id === 'supabase-vars' 
            ? { ...etapa, status: 'error', details: 'Variáveis não configuradas' }
            : etapa
        ));
      });
    } catch (error) {
      console.log('Erro ao verificar configurações:', error);
    }
  }, []);

  const executarVerificacao = async () => {
    setVerificando(true);
    
    for (let i = 0; i < etapas.length; i++) {
      const etapa = etapas[i];
      
      // Atualizar status para "checking"
      setEtapas(prev => prev.map(e => 
        e.id === etapa.id ? { ...e, status: 'checking' } : e
      ));

      try {
        switch (etapa.id) {
          case 'supabase-vars':
            await verificarVariaveis(etapa);
            break;
          case 'connectivity':
            await verificarConectividade(etapa);
            break;
          case 'server-status':
            await verificarServidor(etapa);
            break;
          case 'database':
            await verificarBancoDados(etapa);
            break;
        }
      } catch (error) {
        setEtapas(prev => prev.map(e => 
          e.id === etapa.id 
            ? { ...e, status: 'error', details: error.message }
            : e
        ));
      }

      // Aguardar um pouco entre verificações
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setVerificando(false);
  };

  const verificarVariaveis = async (etapa: ConfigStep) => {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('URL e Chave do Supabase são obrigatórias');
    }

    // Extrair project ID da URL
    const projectId = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
    
    if (!projectId || projectId.length < 10) {
      throw new Error('URL do Supabase inválida');
    }

    setEtapas(prev => prev.map(e => 
      e.id === etapa.id 
        ? { ...e, status: 'success', details: `Project ID: ${projectId.substring(0, 8)}...` }
        : e
    ));
  };

  const verificarConectividade = async (etapa: ConfigStep) => {
    const projectId = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
    
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEtapas(prev => prev.map(e => 
          e.id === etapa.id 
            ? { ...e, status: 'success', details: `Servidor online: ${data.status}` }
            : e
        ));
      } else {
        throw new Error(`Servidor retornou: ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Falha na conectividade: ${error.message}`);
    }
  };

  const verificarServidor = async (etapa: ConfigStep) => {
    const projectId = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
    
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/setup-status`, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEtapas(prev => prev.map(e => 
          e.id === etapa.id 
            ? { 
                ...e, 
                status: 'success', 
                details: data.needsSetup ? 'Sistema precisa de setup' : 'Sistema configurado' 
              }
            : e
        ));
      } else {
        throw new Error(`Status do servidor: ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Erro no servidor: ${error.message}`);
    }
  };

  const verificarBancoDados = async (etapa: ConfigStep) => {
    const projectId = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
    
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/disciplinas`, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEtapas(prev => prev.map(e => 
          e.id === etapa.id 
            ? { ...e, status: 'success', details: `${data.length || 0} disciplinas encontradas` }
            : e
        ));
      } else {
        throw new Error(`Banco de dados: ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Erro no banco: ${error.message}`);
    }
  };

  const copiarConfiguracao = () => {
    const projectId = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
    const config = `// Adicione isso ao arquivo /utils/supabase/info.tsx
export const projectId = '${projectId}';
export const publicAnonKey = '${supabaseKey}';`;
    
    navigator.clipboard.writeText(config);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'checking':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">OK</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">ERRO</Badge>;
      case 'checking':
        return <Badge className="bg-blue-100 text-blue-800">VERIFICANDO</Badge>;
      default:
        return <Badge variant="outline">PENDENTE</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Configuração - Novo Computador</h1>
          </div>
          <p className="text-gray-600">
            Configure o AVA em um novo computador. Siga os passos abaixo para resolver os erros de conectividade.
          </p>
        </div>

        {/* Configuração do Supabase */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Configurações do Supabase
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="supabase-url">URL do Supabase</Label>
              <Input
                id="supabase-url"
                placeholder="https://seu-projeto.supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="supabase-key">Chave Pública (Anon Key)</Label>
              <Input
                id="supabase-key"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                type="password"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={copiarConfiguracao} variant="outline">
                <Copy className="w-4 h-4 mr-2" />
                Copiar Configuração
              </Button>
              <Button onClick={() => window.open('https://supabase.com/dashboard', '_blank')} variant="outline">
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir Supabase Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Verificações */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Verificações do Sistema
            </CardTitle>
            <Button 
              onClick={executarVerificacao} 
              disabled={verificando || !supabaseUrl || !supabaseKey}
            >
              {verificando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Verificando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Executar Verificações
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {etapas.map((etapa, index) => (
                <div key={etapa.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="flex-shrink-0">
                    {getStatusIcon(etapa.status)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold">{etapa.title}</h3>
                      {getStatusBadge(etapa.status)}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{etapa.description}</p>
                    
                    {etapa.details && (
                      <div className={`text-sm p-2 rounded ${
                        etapa.status === 'success' ? 'bg-green-50 text-green-800' :
                        etapa.status === 'error' ? 'bg-red-50 text-red-800' :
                        'bg-blue-50 text-blue-800'
                      }`}>
                        {etapa.details}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Instruções */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Instruções para Novo Computador
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">1. Obter Configurações do Supabase</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Acesse <a href="https://supabase.com/dashboard" target="_blank" className="underline">supabase.com/dashboard</a></li>
                  <li>• Selecione seu projeto</li>
                  <li>• Vá em Settings → API</li>
                  <li>• Copie a URL e a chave pública (anon key)</li>
                </ul>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-2">2. Configurar o Arquivo info.tsx</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Abra o arquivo <code>/utils/supabase/info.tsx</code></li>
                  <li>• Cole as configurações copiadas acima</li>
                  <li>• Salve o arquivo</li>
                </ul>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-semibold text-yellow-900 mb-2">3. Executar Verificações</h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Preencha os campos acima com suas configurações</li>
                  <li>• Clique em "Executar Verificações"</li>
                  <li>• Aguarde todos os testes passarem</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botões de Navegação */}
        <div className="mt-8 flex gap-4 justify-center">
          <Button onClick={() => window.location.href = '/'} variant="outline">
            Voltar ao Sistema
          </Button>
          <Button onClick={() => window.location.href = '/?diagnostico-completo'} variant="outline">
            Diagnóstico Completo
          </Button>
        </div>
      </div>
    </div>
  );
}