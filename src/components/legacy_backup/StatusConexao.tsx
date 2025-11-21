import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { CheckCircle, XCircle, Loader2, RefreshCw, Users } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface StatusConexaoProps {
  onClose: () => void;
}

export function StatusConexao({ onClose }: StatusConexaoProps) {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [setupStatus, setSetupStatus] = useState<'checking' | 'needed' | 'complete'>('checking');
  const [usuariosCount, setUsuariosCount] = useState<number>(0);
  const [testando, setTestando] = useState(false);

  const verificarStatus = async () => {
    setStatus('checking');
    setSetupStatus('checking');
    
    try {
      // Testar conexão básica
      const healthResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/health`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (healthResponse.ok) {
        setStatus('online');
        
        // Verificar status do setup
        const setupResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/setup-status`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (setupResponse.ok) {
          const setupData = await setupResponse.json();
          setSetupStatus(setupData.needsSetup ? 'needed' : 'complete');
        }
        
        // Verificar usuários existentes
        const debugResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/debug/usuarios`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (debugResponse.ok) {
          const debugData = await debugResponse.json();
          setUsuariosCount(debugData.total || 0);
        }
      } else {
        setStatus('offline');
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      setStatus('offline');
    }
  };

  const criarUsuarios = async () => {
    setTestando(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/criar-usuarios-teste`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await verificarStatus(); // Atualizar status após criar usuários
      }
    } catch (error) {
      console.error('Erro ao criar usuários:', error);
    } finally {
      setTestando(false);
    }
  };

  useEffect(() => {
    verificarStatus();
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Status da Conexão
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status do Servidor */}
          <div className="flex items-center justify-between">
            <span className="text-sm">Servidor:</span>
            <div className="flex items-center gap-2">
              {status === 'checking' && <Loader2 className="w-4 h-4 animate-spin" />}
              {status === 'online' && (
                <>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <Badge variant="secondary" className="bg-green-100 text-green-800">Online</Badge>
                </>
              )}
              {status === 'offline' && (
                <>
                  <XCircle className="w-4 h-4 text-red-600" />
                  <Badge variant="secondary" className="bg-red-100 text-red-800">Offline</Badge>
                </>
              )}
            </div>
          </div>

          {/* Status do Setup */}
          <div className="flex items-center justify-between">
            <span className="text-sm">Setup:</span>
            <div className="flex items-center gap-2">
              {setupStatus === 'checking' && <Loader2 className="w-4 h-4 animate-spin" />}
              {setupStatus === 'complete' && (
                <>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <Badge variant="secondary" className="bg-green-100 text-green-800">Completo</Badge>
                </>
              )}
              {setupStatus === 'needed' && (
                <>
                  <XCircle className="w-4 h-4 text-orange-600" />
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800">Necessário</Badge>
                </>
              )}
            </div>
          </div>

          {/* Contagem de Usuários */}
          <div className="flex items-center justify-between">
            <span className="text-sm">Usuários:</span>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">{usuariosCount}</Badge>
            </div>
          </div>

          {/* Configurações */}
          <div className="text-xs text-gray-600 space-y-1">
            <div>Project ID: {projectId.substring(0, 8)}...</div>
            <div>Anon Key: {publicAnonKey.substring(0, 20)}...</div>
          </div>

          {/* Ações */}
          <div className="space-y-2">
            <Button 
              onClick={verificarStatus} 
              variant="outline" 
              size="sm" 
              className="w-full"
              disabled={status === 'checking'}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar Status
            </Button>

            {usuariosCount === 0 && status === 'online' && (
              <Button 
                onClick={criarUsuarios} 
                size="sm" 
                className="w-full"
                disabled={testando}
              >
                {testando ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Users className="w-4 h-4 mr-2" />
                )}
                Criar Usuários de Teste
              </Button>
            )}
          </div>

          {status === 'offline' && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-sm text-red-800">
                Não foi possível conectar ao servidor. Verifique:
              </p>
              <ul className="text-xs text-red-700 mt-1 ml-4 list-disc">
                <li>Se as Edge Functions foram deployadas</li>
                <li>Se o Project ID e keys estão corretos</li>
                <li>Sua conexão com a internet</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}