import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  ArrowLeft, 
  AlertTriangle, 
  CheckCircle, 
  Settings,
  User,
  Loader2,
  RefreshCcw,
  Wrench,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface CorrecaoLoginDefinitivaProps {
  onVoltar: () => void;
}

export function CorrecaoLoginDefinitiva({ onVoltar }: CorrecaoLoginDefinitivaProps) {
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('jrsantosdev1@gmail.com');
  const [testPassword, setTestPassword] = useState('Jvni0R@87');
  const [testUsername, setTestUsername] = useState('admin.principal');
  const [showPassword, setShowPassword] = useState(false);
  const [resultados, setResultados] = useState<any[]>([]);
  const [fixing, setFixing] = useState(false);

  const adicionarResultado = (teste: string, status: 'sucesso' | 'erro', detalhes: any) => {
    setResultados(prev => [...prev, {
      teste,
      status,
      detalhes,
      timestamp: new Date().toISOString()
    }]);
  };

  const testarLoginDireto = async (payload: any, tipo: string) => {
    try {
      console.log(`[LOGIN_TEST] Testando ${tipo} com payload:`, payload);
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/login`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      console.log(`[LOGIN_TEST] Resposta ${tipo}:`, {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      const data = await response.json();
      console.log(`[LOGIN_TEST] Dados ${tipo}:`, data);
      
      if (response.ok && data.success) {
        adicionarResultado(`Login ${tipo}`, 'sucesso', data);
        return { success: true, data };
      } else {
        adicionarResultado(`Login ${tipo}`, 'erro', data);
        return { success: false, data };
      }
    } catch (error) {
      console.error(`[LOGIN_TEST] Erro ${tipo}:`, error);
      adicionarResultado(`Login ${tipo}`, 'erro', error.message);
      return { success: false, error: error.message };
    }
  };

  const criarAdminEmergencia = async () => {
    try {
      console.log('[ADMIN_EMERGENCIA] Criando admin de emergência...');
      
      const payload = {
        nome: 'Administrador Principal',
        nomeUsuario: 'admin.principal',
        email: 'jrsantosdev1@gmail.com',
        senha: 'Jvni0R@87',
        tipo: 'administrador'
      };

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        adicionarResultado('Criação Admin Emergência', 'sucesso', data);
        return true;
      } else {
        const errorData = await response.json();
        adicionarResultado('Criação Admin Emergência', 'erro', errorData);
        return false;
      }
    } catch (error) {
      adicionarResultado('Criação Admin Emergência', 'erro', error.message);
      return false;
    }
  };

  const executarCorrecaoCompleta = async () => {
    setLoading(true);
    setResultados([]);

    try {
      toast.info('🚨 Iniciando correção definitiva do login...');
      
      // 1. Testar conectividade básica
      try {
        const healthResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/health`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (healthResponse.ok) {
          adicionarResultado('Conectividade', 'sucesso', 'Servidor online');
        } else {
          adicionarResultado('Conectividade', 'erro', `HTTP ${healthResponse.status}`);
        }
      } catch (error) {
        adicionarResultado('Conectividade', 'erro', error.message);
      }

      // 2. Testar todas as variações de payload de login
      const payloads = [
        // Teste 1: Email tradicional
        { email: testEmail, senha: testPassword },
        
        // Teste 2: Nome de usuário
        { nomeUsuario: testUsername, senha: testPassword },
        
        // Teste 3: Email com nomeUsuario null
        { email: testEmail, nomeUsuario: null, senha: testPassword },
        
        // Teste 4: NomeUsuario com email null
        { nomeUsuario: testUsername, email: null, senha: testPassword },
        
        // Teste 5: Ambos presentes (priorizar email)
        { email: testEmail, nomeUsuario: testUsername, senha: testPassword },
        
        // Teste 6: Email vazio, nomeUsuario presente
        { email: '', nomeUsuario: testUsername, senha: testPassword },
        
        // Teste 7: Email null, nomeUsuario presente  
        { email: null, nomeUsuario: testUsername, senha: testPassword }
      ];

      for (let i = 0; i < payloads.length; i++) {
        const payload = payloads[i];
        const tipo = `Variação ${i + 1}`;
        
        console.log(`[LOGIN_TEST] Testando ${tipo}:`, payload);
        await testarLoginDireto(payload, tipo);
        
        // Pequeno delay entre testes
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // 3. Se todos falharam, tentar criar admin
      const sucessos = resultados.filter(r => r.status === 'sucesso' && r.teste.includes('Login')).length;
      
      if (sucessos === 0) {
        console.log('[LOGIN_TEST] Nenhum login funcionou, tentando criar admin...');
        await criarAdminEmergencia();
        
        // Testar novamente após criar
        await testarLoginDireto({ email: testEmail, senha: testPassword }, 'Pós-Criação Email');
        await testarLoginDireto({ nomeUsuario: testUsername, senha: testPassword }, 'Pós-Criação Username');
      }

      toast.success('✅ Correção definitiva concluída!');
      
    } catch (error) {
      console.error('Erro na correção:', error);
      toast.error('❌ Erro durante a correção');
    } finally {
      setLoading(false);
    }
  };

  const corrigirUsuarioEspecifico = async () => {
    setFixing(true);
    
    try {
      // Buscar todos os usuários
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const usuarios = data.usuarios || [];
        
        // Encontrar admin principal
        const adminPrincipal = usuarios.find((u: any) => 
          u.email === 'jrsantosdev1@gmail.com' || u.nomeUsuario === 'admin.principal'
        );

        if (adminPrincipal) {
          // Atualizar para garantir que tem nomeUsuario
          const updatePayload = {
            nomeUsuario: 'admin.principal',
            ativo: true
          };

          const updateResponse = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${adminPrincipal.id}`,
            {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(updatePayload)
            }
          );

          if (updateResponse.ok) {
            adicionarResultado('Correção Admin Principal', 'sucesso', 'Usuário corrigido');
            toast.success('✅ Admin principal corrigido!');
          } else {
            const errorData = await updateResponse.json();
            adicionarResultado('Correção Admin Principal', 'erro', errorData);
          }
        } else {
          // Criar se não existir
          await criarAdminEmergencia();
        }
      }
    } catch (error) {
      adicionarResultado('Correção Admin Principal', 'erro', error.message);
    } finally {
      setFixing(false);
    }
  };

  const limparResultados = () => {
    setResultados([]);
  };

  return (
    <div className="min-h-screen bg-red-50">
      {/* Header */}
      <div className="bg-red-600 text-white px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onVoltar} className="text-white hover:bg-red-700">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">🚨 CORREÇÃO DEFINITIVA - ERROS DE LOGIN</h1>
            <p className="text-sm opacity-90">Solução para: "Email/nome de usuário e senha são obrigatórios" e "inválidos"</p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto">
        {/* Card de controles */}
        <Card className="mb-6 border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Diagnóstico e Correção dos Erros de Login
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Email de Teste</Label>
                <Input
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Email para teste"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Nome de Usuário de Teste</Label>
                <Input
                  value={testUsername}
                  onChange={(e) => setTestUsername(e.target.value)}
                  placeholder="Nome de usuário para teste"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Senha de Teste</Label>
                <div className="relative">
                  <Input
                    value={testPassword}
                    onChange={(e) => setTestPassword(e.target.value)}
                    placeholder="Senha para teste"
                    type={showPassword ? "text" : "password"}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button 
                onClick={executarCorrecaoCompleta}
                disabled={loading || fixing}
                className="flex-1 bg-red-600 hover:bg-red-700"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Executando Correção...
                  </>
                ) : (
                  <>
                    <Wrench className="w-5 h-5 mr-2" />
                    Executar Correção Definitiva
                  </>
                )}
              </Button>

              <Button 
                onClick={corrigirUsuarioEspecifico}
                disabled={loading || fixing}
                variant="outline"
                size="lg"
              >
                {fixing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Corrigindo...
                  </>
                ) : (
                  <>
                    <User className="w-5 h-5 mr-2" />
                    Corrigir Admin
                  </>
                )}
              </Button>

              <Button 
                onClick={limparResultados}
                disabled={loading || fixing}
                variant="outline"
                size="lg"
              >
                <RefreshCcw className="w-5 h-5 mr-2" />
                Limpar
              </Button>
            </div>

            <div className="bg-red-100 border border-red-300 rounded-lg p-4">
              <h4 className="font-semibold text-red-800 mb-2">🎯 Objetivo:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• Identificar qual formato de login funciona</li>
                <li>• Testar todas as variações de payload</li>
                <li>• Corrigir admin principal se necessário</li>
                <li>• Garantir que pelo menos um método de login funcione</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        {resultados.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Resultados dos Testes ({resultados.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {resultados.map((resultado, index) => (
                  <div
                    key={index}
                    className={`p-4 border rounded-lg ${
                      resultado.status === 'sucesso'
                        ? 'border-green-200 bg-green-50'
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {resultado.status === 'sucesso' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      )}
                      <h3 className="font-medium">{resultado.teste}</h3>
                      <span className={`text-sm px-2 py-1 rounded ${
                        resultado.status === 'sucesso'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {resultado.status === 'sucesso' ? 'SUCESSO' : 'ERRO'}
                      </span>
                    </div>
                    
                    <div className="text-sm bg-white p-3 rounded border max-h-40 overflow-y-auto">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(resultado.detalhes, null, 2)}
                      </pre>
                    </div>
                    
                    <div className="text-xs text-gray-500 mt-2">
                      {new Date(resultado.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instruções */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>📋 Instruções de Uso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <h4 className="font-semibold text-yellow-800 mb-1">🔥 ERROS QUE ESTE COMPONENTE RESOLVE:</h4>
                <ul className="text-yellow-700 space-y-1">
                  <li>• "Email/nome de usuário e senha são obrigatórios"</li>
                  <li>• "Nome de usuário/email ou senha inválidos"</li>
                  <li>• Problemas de validação no servidor</li>
                  <li>• Admin principal com dados inconsistentes</li>
                </ul>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <h4 className="font-semibold text-blue-800 mb-1">⚡ COMO USAR:</h4>
                <ol className="text-blue-700 space-y-1">
                  <li>1. <strong>Configure as credenciais</strong> de teste (já preenchidas)</li>
                  <li>2. <strong>Execute "Correção Definitiva"</strong> para testar todos os cenários</li>
                  <li>3. <strong>Analise os resultados</strong> para ver qual formato funciona</li>
                  <li>4. <strong>Use "Corrigir Admin"</strong> se necessário</li>
                  <li>5. <strong>Teste o login</strong> na tela principal</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}