import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Alert, AlertDescription } from './ui/alert';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface TesteAuthContextLogProps {
  onFechar?: () => void;
}

export function TesteAuthContextLog({ onFechar }: TesteAuthContextLogProps) {
  const [email, setEmail] = useState('jrsantosdev1@gmail.com');
  const [senha, setSenha] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [resultado, setResultado] = useState<any>(null);

  const adicionarLog = (log: string) => {
    const logComTime = `${new Date().toLocaleTimeString()}: ${log}`;
    console.log(`[TESTE_AUTH] ${log}`);
    setLogs(prev => [...prev, logComTime]);
  };

  const simularFluxoLogin = async () => {
    setLoading(true);
    setLogs([]);
    setResultado(null);
    
    try {
      adicionarLog('🚀 Iniciando simulação do fluxo de login do AuthContext');
      
      const loginData = {
        email: email,
        senha: senha
      };

      adicionarLog(`📤 Enviando dados: email=${email}, senha=***`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/login`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(loginData),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);
      adicionarLog(`📡 Response status: ${response.status}`);

      if (response.ok) {
        const responseData = await response.json();
        adicionarLog('📊 Resposta completa do servidor:');
        adicionarLog(JSON.stringify(responseData, null, 2));
        
        // Simulando a lógica do AuthContext
        const userData = responseData.usuario || responseData;
        adicionarLog('👤 Dados do usuário extraídos:');
        adicionarLog(JSON.stringify(userData, null, 2));
        
        if (!userData) {
          adicionarLog('❌ ERRO: Nenhum dado de usuário encontrado na resposta');
          setResultado({ erro: 'Dados de usuário não encontrados' });
          return;
        }
        
        const usuario = {
          id: userData.id,
          nomeUsuario: userData.nomeUsuario || userData.nome_usuario,
          nome: userData.nome,
          email: userData.email,
          tipo: userData.tipo,
          serie: userData.serie || null,
          turma: userData.turma || null,
          telefone: userData.telefone || null,
          endereco: userData.endereco || null,
          dataNascimento: userData.dataNascimento || userData.data_nascimento || null,
          nomeResponsavel: userData.nomeResponsavel || userData.nome_responsavel || null,
          ativo: userData.ativo !== false
        };
        
        adicionarLog('✅ Objeto usuário criado:');
        adicionarLog(JSON.stringify(usuario, null, 2));
        
        // Validar campos críticos
        if (!usuario.tipo) {
          adicionarLog('⚠️ PROBLEMA: Campo "tipo" está vazio ou undefined');
        } else {
          adicionarLog(`✅ Tipo de usuário identificado: ${usuario.tipo}`);
        }
        
        if (!usuario.email) {
          adicionarLog('⚠️ PROBLEMA: Campo "email" está vazio ou undefined');
        }
        
        if (!usuario.id) {
          adicionarLog('⚠️ PROBLEMA: Campo "id" está vazio ou undefined');
        }
        
        // Simular como seria armazenado no localStorage
        const dadosParaLocalStorage = JSON.stringify(usuario);
        adicionarLog('💾 Dados que seriam salvos no localStorage:');
        adicionarLog(dadosParaLocalStorage);
        
        setResultado({
          sucesso: true,
          usuario: usuario,
          responseCompleta: responseData
        });
        
        adicionarLog('✅ Simulação concluída com sucesso');
        
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        adicionarLog(`❌ Erro HTTP ${response.status}:`);
        adicionarLog(JSON.stringify(errorData, null, 2));
        setResultado({ erro: errorData.error || 'Falha no login' });
      }
      
    } catch (error) {
      console.error('❌ Erro na simulação:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        adicionarLog('❌ Timeout na requisição de login');
        setResultado({ erro: 'Timeout na requisição' });
      } else {
        adicionarLog(`❌ Erro de conexão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        setResultado({ erro: 'Erro de conexão' });
      }
    } finally {
      setLoading(false);
    }
  };

  const determinarTipoDashboard = () => {
    if (!resultado?.usuario?.tipo) {
      return { dashboard: 'Dashboard (aluno) - PADRÃO por tipo undefined', cor: 'text-red-600' };
    }
    
    switch (resultado.usuario.tipo) {
      case 'professor':
        return { dashboard: 'DashboardProfessor', cor: 'text-blue-600' };
      case 'coordenador':
        return { dashboard: 'DashboardCoordenador', cor: 'text-green-600' };
      case 'administrador':
        return { dashboard: 'DashboardAdministrador', cor: 'text-purple-600' };
      case 'professor_conteudista':
        return { dashboard: 'DashboardConteudista', cor: 'text-orange-600' };
      default:
        return { dashboard: 'Dashboard (aluno) - PADRÃO', cor: 'text-gray-600' };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-purple-900 mb-2">
            🧪 Teste AuthContext com Logs
          </h1>
          <p className="text-purple-700">
            Simulação completa do fluxo de login do AuthContext para identificar problemas
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Painel de Controle */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              🎮 Controles
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block font-medium text-gray-700 mb-1">Email:</label>
                <Input 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email do usuário"
                />
              </div>
              
              <div>
                <label className="block font-medium text-gray-700 mb-1">Senha:</label>
                <Input 
                  type="password"
                  value={senha} 
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Senha"
                />
              </div>

              <Button 
                onClick={simularFluxoLogin}
                disabled={loading || !email || !senha}
                className="w-full"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Simulando...
                  </>
                ) : (
                  '🧪 Simular Fluxo do AuthContext'
                )}
              </Button>
            </div>
          </Card>

          {/* Resultado da Análise */}
          {resultado && (
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                📋 Resultado da Análise
              </h2>
              
              {resultado.sucesso ? (
                <div className="space-y-3">
                  <Alert className="border-green-200 bg-green-50">
                    <AlertDescription className="text-green-800">
                      ✅ Login simulado com sucesso!
                    </AlertDescription>
                  </Alert>
                  
                  <div>
                    <span className="font-medium">Dashboard que seria exibido:</span>
                    <p className={`text-lg font-bold ${determinarTipoDashboard().cor}`}>
                      {determinarTipoDashboard().dashboard}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">ID:</span>
                      <p className="text-gray-600">{resultado.usuario.id || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="font-medium">Email:</span>
                      <p className="text-gray-600">{resultado.usuario.email || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="font-medium">Nome:</span>
                      <p className="text-gray-600">{resultado.usuario.nome || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="font-medium">Tipo:</span>
                      <p className={`font-bold ${resultado.usuario.tipo ? 'text-green-600' : 'text-red-600'}`}>
                        {resultado.usuario.tipo || 'UNDEFINED'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">
                    ❌ Erro: {resultado.erro}
                  </AlertDescription>
                </Alert>
              )}
            </Card>
          )}

          {/* Log Console */}
          <Card className="p-6 lg:col-span-2">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              📜 Log de Execução
            </h2>
            
            <div className="bg-gray-900 text-green-400 p-4 rounded max-h-96 overflow-auto font-mono text-sm">
              {logs.length === 0 ? (
                <p>Nenhum log ainda... Execute a simulação para ver os detalhes.</p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1 whitespace-pre-wrap">
                    {log}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="mt-6 flex gap-4 justify-center">
          <Button 
            onClick={() => {
              setLogs([]);
              setResultado(null);
            }}
            variant="outline"
          >
            🗑️ Limpar Logs
          </Button>
          
          {onFechar && (
            <Button onClick={onFechar} variant="outline">
              ← Voltar
            </Button>
          )}
          
          <Button 
            onClick={() => window.location.href = '/'}
            variant="outline"
          >
            🏠 Ir para Home
          </Button>
        </div>
      </div>
    </div>
  );
}