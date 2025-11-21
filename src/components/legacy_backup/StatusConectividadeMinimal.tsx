import React, { useState, useEffect } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Wifi, WifiOff, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface StatusConectividadeMinimalProps {
  showDetails?: boolean;
  position?: 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left';
}

type StatusType = 'online' | 'offline' | 'warning' | 'checking';

export function StatusConectividadeMinimal({ 
  showDetails = false, 
  position = 'top-right' 
}: StatusConectividadeMinimalProps) {
  const [status, setStatus] = useState<StatusType>('checking');
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  const [timeoutCount, setTimeoutCount] = useState(0);

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-left': 'top-4 left-4'
  };

  useEffect(() => {
    verificarConectividade();
    
    // Verificar conectividade a cada 30 segundos
    const interval = setInterval(verificarConectividade, 30000);
    
    // Verificar timeouts
    const timeoutInterval = setInterval(verificarTimeouts, 10000);

    return () => {
      clearInterval(interval);
      clearInterval(timeoutInterval);
    };
  }, []);

  const verificarConectividade = async () => {
    try {
      setStatus('checking');
      
      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/health`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);
      
      if (response.ok) {
        setStatus('online');
        setTimeoutCount(0);
      } else {
        setStatus('warning');
      }
      
      setLastCheck(new Date());
      
    } catch (error) {
      console.warn('[STATUS] Erro na verificação de conectividade:', error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        setTimeoutCount(prev => prev + 1);
        setStatus('warning');
      } else {
        setStatus('offline');
      }
      
      setLastCheck(new Date());
    }
  };

  const verificarTimeouts = () => {
    // Verificar se há muitos timeouts recentes
    const recentTimeouts = parseInt(localStorage.getItem('recent_timeouts') || '0');
    
    if (recentTimeouts > 3) {
      setStatus('warning');
      setTimeoutCount(recentTimeouts);
    }
  };

  const handleResolverTimeouts = () => {
    toast.info('Iniciando resolução de timeouts...');
    window.location.href = window.location.pathname + '?mode=timeout-killer';
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'online':
        return {
          icon: <Wifi className="w-4 h-4" />,
          color: 'bg-green-500 hover:bg-green-600',
          text: 'Online',
          textColor: 'text-green-700'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-4 h-4" />,
          color: 'bg-yellow-500 hover:bg-yellow-600',
          text: timeoutCount > 0 ? `${timeoutCount} Timeouts` : 'Instável',
          textColor: 'text-yellow-700'
        };
      case 'offline':
        return {
          icon: <WifiOff className="w-4 h-4" />,
          color: 'bg-red-500 hover:bg-red-600',
          text: 'Offline',
          textColor: 'text-red-700'
        };
      case 'checking':
        return {
          icon: <RefreshCw className="w-4 h-4 animate-spin" />,
          color: 'bg-blue-500 hover:bg-blue-600',
          text: 'Verificando',
          textColor: 'text-blue-700'
        };
    }
  };

  const config = getStatusConfig();

  if (!showDetails && status === 'online') {
    return null; // Não mostrar quando está tudo ok e details está desabilitado
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50 flex items-center gap-2`}>
      {/* Indicador principal */}
      <Badge 
        className={`${config.color} text-white cursor-pointer transition-all duration-200 flex items-center gap-1.5 px-2 py-1`}
        onClick={verificarConectividade}
        title={`Última verificação: ${lastCheck.toLocaleTimeString()}`}
      >
        {config.icon}
        {showDetails && (
          <span className="text-xs font-medium">{config.text}</span>
        )}
      </Badge>

      {/* Botão de ação para warnings */}
      {status === 'warning' && timeoutCount > 0 && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleResolverTimeouts}
          className="text-xs px-2 py-1 h-auto"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Resolver
        </Button>
      )}

      {/* Detalhes expandidos */}
      {showDetails && status !== 'online' && (
        <div className="bg-white border rounded-lg p-2 shadow-lg text-xs max-w-48">
          <div className={`font-medium ${config.textColor} mb-1`}>
            Status: {config.text}
          </div>
          <div className="text-gray-600 text-xs">
            Última verificação: {lastCheck.toLocaleTimeString()}
          </div>
          {timeoutCount > 0 && (
            <div className="text-yellow-600 text-xs mt-1">
              {timeoutCount} timeout(s) detectados
            </div>
          )}
          <div className="mt-2 flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={verificarConectividade}
              className="text-xs px-2 py-1 h-auto flex-1"
            >
              Verificar
            </Button>
            {(status === 'warning' || status === 'offline') && (
              <Button
                size="sm"
                onClick={handleResolverTimeouts}
                className="text-xs px-2 py-1 h-auto flex-1"
              >
                Resolver
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}