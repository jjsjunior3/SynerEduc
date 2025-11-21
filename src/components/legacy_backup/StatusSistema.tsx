import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { CheckCircle, XCircle, Clock, Wifi } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export function StatusSistema() {
  const [status, setStatus] = useState<{
    servidor: 'ok' | 'error' | 'loading';
    admin: 'ok' | 'error' | 'loading';
    usuarios: 'ok' | 'error' | 'loading';
    relatorios: 'ok' | 'error' | 'loading';
  }>({
    servidor: 'loading',
    admin: 'loading',
    usuarios: 'loading',
    relatorios: 'loading'
  });

  useEffect(() => {
    verificarStatus();
  }, []);

  const verificarStatus = async () => {
    // Servidor geral
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/health`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      setStatus(prev => ({ ...prev, servidor: response.ok ? 'ok' : 'error' }));
    } catch {
      setStatus(prev => ({ ...prev, servidor: 'error' }));
    }

    // Admin health
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/health`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      setStatus(prev => ({ ...prev, admin: response.ok ? 'ok' : 'error' }));
    } catch {
      setStatus(prev => ({ ...prev, admin: 'error' }));
    }

    // API Usuários
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      setStatus(prev => ({ ...prev, usuarios: response.ok ? 'ok' : 'error' }));
    } catch {
      setStatus(prev => ({ ...prev, usuarios: 'error' }));
    }

    // API Relatórios
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/relatorios`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      setStatus(prev => ({ ...prev, relatorios: response.ok ? 'ok' : 'error' }));
    } catch {
      setStatus(prev => ({ ...prev, relatorios: 'error' }));
    }
  };

  const getStatusIcon = (estado: string) => {
    switch (estado) {
      case 'ok':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'loading':
        return <Clock className="w-4 h-4 text-yellow-600 animate-pulse" />;
      default:
        return <Wifi className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'ok':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'loading':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-sm">Status do Sistema</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Servidor Principal</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(status.servidor)}
              <Badge className={getStatusColor(status.servidor)}>
                {status.servidor.toUpperCase()}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">API Admin</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(status.admin)}
              <Badge className={getStatusColor(status.admin)}>
                {status.admin.toUpperCase()}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">API Usuários</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(status.usuarios)}
              <Badge className={getStatusColor(status.usuarios)}>
                {status.usuarios.toUpperCase()}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">API Relatórios</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(status.relatorios)}
              <Badge className={getStatusColor(status.relatorios)}>
                {status.relatorios.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}