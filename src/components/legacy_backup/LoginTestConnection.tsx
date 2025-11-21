import { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { CheckCircle, XCircle, Loader2, Wifi } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export function LoginTestConnection() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const testConnection = async () => {
    setTesting(true);
    setResult('idle');
    
    try {
      console.log('🧪 Testando conexão com servidor...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/health`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
          signal: AbortSignal.timeout(8000)
        }
      );

      if (response.ok) {
        setResult('success');
        setMessage(`✅ Servidor online! Status: ${response.status}`);
        console.log('✅ Servidor respondeu corretamente');
      } else {
        setResult('error');
        setMessage(`❌ Servidor respondeu com erro: ${response.status} ${response.statusText}`);
        console.error('❌ Erro do servidor:', response.status);
      }
    } catch (error: any) {
      setResult('error');
      if (error.name === 'AbortError') {
        setMessage(`⏰ Timeout: Servidor não respondeu em 8 segundos`);
      } else if (error.message.includes('Failed to fetch')) {
        setMessage(`🌐 Erro de rede: Sem conectividade`);
      } else {
        setMessage(`❌ Erro: ${error.message}`);
      }
      console.error('❌ Erro no teste:', error);
    } finally {
      setTesting(false);
    }
  };

  const getStatusColor = () => {
    switch (result) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = () => {
    if (testing) return <Loader2 className="w-4 h-4 animate-spin" />;
    if (result === 'success') return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (result === 'error') return <XCircle className="w-4 h-4 text-red-600" />;
    return <Wifi className="w-4 h-4" />;
  };

  return (
    <Card className="mt-4 bg-white/5 border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <Wifi className="w-4 h-4" />
          Teste de Conexão
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between mb-3">
          <Button
            onClick={testConnection}
            disabled={testing}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {testing ? (
              <>
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                Testando...
              </>
            ) : (
              <>
                <Wifi className="w-3 h-3 mr-2" />
                Testar Servidor
              </>
            )}
          </Button>
          
          {result !== 'idle' && (
            <Badge className={getStatusColor()}>
              <span className="flex items-center gap-1">
                {getStatusIcon()}
                {result === 'success' ? 'Online' : 'Offline'}
              </span>
            </Badge>
          )}
        </div>
        
        {message && (
          <div className="text-xs text-white/70 bg-black/20 p-2 rounded">
            {message}
          </div>
        )}
        
        <div className="text-xs text-white/50 mt-2">
          Endpoint: /functions/v1/make-server-c61d1ad0/health
        </div>
      </CardContent>
    </Card>
  );
}