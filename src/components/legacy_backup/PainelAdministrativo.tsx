import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Alert, AlertDescription } from "./ui/alert";
import { 
  Settings, 
  Users, 
  Activity, 
  Database, 
  Wifi, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Bug,
  Shield,
  BookOpen
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface PainelAdministrativoProps {
  onVoltar: () => void;
}

export function PainelAdministrativo({ onVoltar }: PainelAdministrativoProps) {
  const [conectividade, setConectividade] = useState<'testando' | 'ok' | 'erro'>('testando');
  const [statusServidor, setStatusServidor] = useState<'testando' | 'ok' | 'erro'>('testando');
  const [totalUsuarios, setTotalUsuarios] = useState<number>(0);
  const [totalDisciplinas, setTotalDisciplinas] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);

  const adicionarLog = (mensagem: string) => {
    setLogs(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${mensagem}`]);
  };

  const testarConectividade = async () => {
    setConectividade('testando');
    adicionarLog('Testando conectividade...');
    
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/health`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });
      
      if (response.ok) {
        setConectividade('ok');
        adicionarLog('✅ Conectividade OK');
      } else {
        setConectividade('erro');
        adicionarLog(`❌ Erro de conectividade: ${response.status}`);
      }
    } catch (error) {
      setConectividade('erro');
      adicionarLog(`❌ Erro de rede: ${error instanceof Error ? error.message : 'Desconhecido'}`);
    }
  };

  const testarServidor = async () => {
    setStatusServidor('testando');
    adicionarLog('Testando servidor...');
    
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/usuarios`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStatusServidor('ok');
        setTotalUsuarios(data.length || 0);
        adicionarLog(`✅ Servidor OK - ${data.length || 0} usuários encontrados`);
      } else {
        setStatusServidor('erro');
        adicionarLog(`❌ Erro no servidor: ${response.status}`);
      }
    } catch (error) {
      setStatusServidor('erro');
      adicionarLog(`❌ Erro no servidor: ${error instanceof Error ? error.message : 'Desconhecido'}`);
    }
  };

  const testarDisciplinas = async () => {
    adicionarLog('Testando disciplinas...');
    
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/disciplinas`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTotalDisciplinas(data.length || 0);
        adicionarLog(`✅ Disciplinas OK - ${data.length || 0} disciplinas encontradas`);
      } else {
        adicionarLog(`❌ Erro nas disciplinas: ${response.status}`);
      }
    } catch (error) {
      adicionarLog(`❌ Erro ao carregar disciplinas: ${error instanceof Error ? error.message : 'Desconhecido'}`);
    }
  };

  const executarDiagnosticoCompleto = async () => {
    adicionarLog('🔍 Iniciando diagnóstico completo...');
    await testarConectividade();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await testarServidor();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await testarDisciplinas();
    adicionarLog('🔍 Diagnóstico completo finalizado');
  };

  const limparLogs = () => {
    setLogs([]);
    adicionarLog('Logs limpos');
  };

  const corrigirProblemasComuns = async () => {
    adicionarLog('🔧 Iniciando correção de problemas comuns...');
    
    // Limpar localStorage
    localStorage.removeItem('auth_loop_detected');
    localStorage.removeItem('auth_loop_count');
    adicionarLog('✅ Cache local limpo');
    
    // Testar novamente
    await executarDiagnosticoCompleto();
    
    adicionarLog('🔧 Correção finalizada');
  };

  useEffect(() => {
    executarDiagnosticoCompleto();
  }, []);

  const StatusIcon = ({ status }: { status: 'testando' | 'ok' | 'erro' }) => {
    switch (status) {
      case 'testando':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      case 'ok':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'erro':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl">Painel Administrativo</h1>
            <p className="text-muted-foreground">Diagnóstico e gerenciamento do sistema</p>
          </div>
          <Button onClick={onVoltar} variant="outline">
            Voltar ao Dashboard
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conectividade</CardTitle>
              <StatusIcon status={conectividade} />
            </CardHeader>
            <CardContent>
              <Badge variant={conectividade === 'ok' ? 'default' : conectividade === 'erro' ? 'destructive' : 'secondary'}>
                {conectividade === 'ok' ? 'Online' : conectividade === 'erro' ? 'Offline' : 'Testando...'}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Servidor</CardTitle>
              <StatusIcon status={statusServidor} />
            </CardHeader>
            <CardContent>
              <Badge variant={statusServidor === 'ok' ? 'default' : statusServidor === 'erro' ? 'destructive' : 'secondary'}>
                {statusServidor === 'ok' ? 'Funcionando' : statusServidor === 'erro' ? 'Com problemas' : 'Verificando...'}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dados</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsuarios}</div>
              <p className="text-xs text-muted-foreground">usuários</p>
              <div className="text-sm text-muted-foreground">{totalDisciplinas} disciplinas</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="diagnostico" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="diagnostico">Diagnóstico</TabsTrigger>
            <TabsTrigger value="usuarios">Usuários</TabsTrigger>
            <TabsTrigger value="sistema">Sistema</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="diagnostico" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bug className="h-5 w-5" />
                  Ferramentas de Diagnóstico
                </CardTitle>
                <CardDescription>
                  Execute testes para identificar e corrigir problemas no sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button onClick={executarDiagnosticoCompleto} className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Diagnóstico Completo
                  </Button>
                  
                  <Button onClick={testarConectividade} variant="outline" className="flex items-center gap-2">
                    <Wifi className="h-4 w-4" />
                    Testar Conectividade
                  </Button>
                  
                  <Button onClick={testarServidor} variant="outline" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Testar Servidor
                  </Button>
                  
                  <Button onClick={corrigirProblemasComuns} variant="secondary" className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Correção Automática
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usuarios" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Gerenciamento de Usuários
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Total de usuários cadastrados: <strong>{totalUsuarios}</strong>
                </p>
                <div className="space-y-2">
                  <Button 
                    onClick={() => window.location.href = window.location.pathname + '?admin-usuarios'} 
                    className="w-full justify-start"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Visualizar Todos os Usuários
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sistema" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configurações do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Project ID:</strong>
                    <br />
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">{projectId}</code>
                  </div>
                  <div>
                    <strong>Status:</strong>
                    <br />
                    <Badge variant={conectividade === 'ok' ? 'default' : 'destructive'}>
                      {conectividade === 'ok' ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                  <div>
                    <strong>Disciplinas:</strong>
                    <br />
                    <span>{totalDisciplinas} disciplinas ativas</span>
                  </div>
                  <div>
                    <strong>Usuários:</strong>
                    <br />
                    <span>{totalUsuarios} usuários cadastrados</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 justify-between">
                  <span className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Logs do Sistema
                  </span>
                  <Button onClick={limparLogs} variant="outline" size="sm">
                    Limpar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-64 overflow-y-auto">
                  {logs.length === 0 ? (
                    <div className="text-gray-500">Nenhum log disponível</div>
                  ) : (
                    logs.map((log, index) => (
                      <div key={index} className="mb-1">
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {(conectividade === 'erro' || statusServidor === 'erro') && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Foram detectados problemas no sistema. Execute o diagnóstico completo para identificar e corrigir os problemas.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}