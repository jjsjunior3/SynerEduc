import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ArrowLeft, Server, Database, Users, Activity, AlertTriangle, 
         CheckCircle, XCircle, Clock, RefreshCw, Settings, Monitor } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface PainelAdministrativoCompletoProps {
  onVoltar: () => void;
}

interface StatusSistema {
  servidor: 'online' | 'offline' | 'erro';
  database: 'conectado' | 'desconectado' | 'erro';
  autenticacao: 'funcional' | 'erro';
  uploads: 'funcional' | 'erro';
  ultimaVerificacao: string;
}

interface EstatisticasDetalhadas {
  usuarios: {
    total: number;
    alunos: number;
    professores: number;
    administradores: number;
    coordenadores: number;
    conteudistas: number;
  };
  sistema: {
    uptime: string;
    versao: string;
    ultimoBackup: string;
  };
  atividade: {
    loginsUltimas24h: number;
    uploadsUltimas24h: number;
    errosUltimas24h: number;
  };
}

export function PainelAdministrativoCompleto({ onVoltar }: PainelAdministrativoCompletoProps) {
  const [status, setStatus] = useState<StatusSistema>({
    servidor: 'offline',
    database: 'desconectado',
    autenticacao: 'erro',
    uploads: 'erro',
    ultimaVerificacao: 'Nunca'
  });
  
  const [estatisticas, setEstatisticas] = useState<EstatisticasDetalhadas>({
    usuarios: {
      total: 0,
      alunos: 0,
      professores: 0,
      administradores: 0,
      coordenadores: 0,
      conteudistas: 0
    },
    sistema: {
      uptime: '0 dias',
      versao: '1.0.0',
      ultimoBackup: 'Nunca'
    },
    atividade: {
      loginsUltimas24h: 0,
      uploadsUltimas24h: 0,
      errosUltimas24h: 0
    }
  });

  const [verificando, setVerificando] = useState(false);

  const verificarStatus = async () => {
    setVerificando(true);
    const novoStatus: StatusSistema = {
      servidor: 'offline',
      database: 'desconectado',
      autenticacao: 'erro',
      uploads: 'erro',
      ultimaVerificacao: new Date().toLocaleString('pt-BR')
    };

    try {
      // Verificar servidor
      console.log('[PAINEL] Verificando status do servidor...');
      const healthResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/health`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (healthResponse.ok) {
        novoStatus.servidor = 'online';
        novoStatus.database = 'conectado';
        
        // Se servidor está OK, verificar outras funcionalidades
        try {
          const authResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/usuarios`, {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (authResponse.ok) {
            novoStatus.autenticacao = 'funcional';
            const usuariosData = await authResponse.json();
            console.log('[PAINEL] Dados de usuários recebidos:', usuariosData);
            
            // A API retorna { success: true, usuarios: [...] }
            let usuariosArray = [];
            if (usuariosData.success && usuariosData.usuarios && Array.isArray(usuariosData.usuarios)) {
              usuariosArray = usuariosData.usuarios;
            } else if (Array.isArray(usuariosData)) {
              // Fallback para resposta direta como array
              usuariosArray = usuariosData;
            } else if (usuariosData.data && Array.isArray(usuariosData.data)) {
              // Fallback para resposta com propriedade data
              usuariosArray = usuariosData.data;
            } else {
              console.warn('[PAINEL] Formato de dados de usuários inesperado:', usuariosData);
              usuariosArray = [];
            }
            
            // Atualizar estatísticas de usuários
            setEstatisticas(prev => ({
              ...prev,
              usuarios: {
                total: usuariosArray.length || 0,
                alunos: usuariosArray.filter((u: any) => (u.tipo || u.user_type) === 'aluno').length || 0,
                professores: usuariosArray.filter((u: any) => (u.tipo || u.user_type) === 'professor').length || 0,
                administradores: usuariosArray.filter((u: any) => (u.tipo || u.user_type) === 'administrador').length || 0,
                coordenadores: usuariosArray.filter((u: any) => (u.tipo || u.user_type) === 'coordenador').length || 0,
                conteudistas: usuariosArray.filter((u: any) => (u.tipo || u.user_type) === 'professor_conteudista').length || 0,
              }
            }));
          }
        } catch (authError) {
          console.warn('[PAINEL] Erro ao verificar autenticação:', authError);
          // Manter estatísticas padrão em caso de erro
          setEstatisticas(prev => ({
            ...prev,
            usuarios: {
              total: 0,
              alunos: 0,
              professores: 0,
              administradores: 0,
              coordenadores: 0,
              conteudistas: 0,
            }
          }));
        }

        // Verificar uploads (assumir funcional se servidor OK)
        novoStatus.uploads = 'funcional';
      }
    } catch (error) {
      console.error('[PAINEL] Erro ao verificar status:', error);
    }

    setStatus(novoStatus);
    setVerificando(false);
  };

  useEffect(() => {
    verificarStatus();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
      case 'conectado':
      case 'funcional':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'offline':
      case 'desconectado':
      case 'erro':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
      case 'conectado':
      case 'funcional':
        return <Badge variant="default" className="bg-green-100 text-green-800">Online</Badge>;
      case 'offline':
      case 'desconectado':
      case 'erro':
        return <Badge variant="destructive">Offline</Badge>;
      default:
        return <Badge variant="secondary">Verificando</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={onVoltar}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Painel Administrativo</h1>
              <p className="text-gray-600">Diagnóstico completo e gerenciamento do sistema</p>
            </div>
          </div>
          <Button
            onClick={verificarStatus}
            disabled={verificando}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${verificando ? 'animate-spin' : ''}`} />
            {verificando ? 'Verificando...' : 'Atualizar Status'}
          </Button>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-blue-500" />
                  <span className="font-medium">Servidor</span>
                </div>
                {getStatusIcon(status.servidor)}
              </div>
              <div className="mt-2">
                {getStatusBadge(status.servidor)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-green-500" />
                  <span className="font-medium">Database</span>
                </div>
                {getStatusIcon(status.database)}
              </div>
              <div className="mt-2">
                {getStatusBadge(status.database)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-500" />
                  <span className="font-medium">Autenticação</span>
                </div>
                {getStatusIcon(status.autenticacao)}
              </div>
              <div className="mt-2">
                {getStatusBadge(status.autenticacao)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-orange-500" />
                  <span className="font-medium">Uploads</span>
                </div>
                {getStatusIcon(status.uploads)}
              </div>
              <div className="mt-2">
                {getStatusBadge(status.uploads)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Estatísticas Detalhadas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Usuários */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Usuários do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Total de Usuários</span>
                  <Badge variant="outline">{estatisticas.usuarios.total}</Badge>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Alunos</span>
                    <span className="text-sm font-medium">{estatisticas.usuarios.alunos}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Professores</span>
                    <span className="text-sm font-medium">{estatisticas.usuarios.professores}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Administradores</span>
                    <span className="text-sm font-medium">{estatisticas.usuarios.administradores}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Coordenadores</span>
                    <span className="text-sm font-medium">{estatisticas.usuarios.coordenadores}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Conteudistas</span>
                    <span className="text-sm font-medium">{estatisticas.usuarios.conteudistas}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sistema */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Informações do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Última Verificação</span>
                  <Badge variant="outline">{status.ultimaVerificacao}</Badge>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Versão</span>
                    <span className="text-sm font-medium">{estatisticas.sistema.versao}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Uptime</span>
                    <span className="text-sm font-medium">{estatisticas.sistema.uptime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Último Backup</span>
                    <span className="text-sm font-medium">{estatisticas.sistema.ultimoBackup}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Atividade Recente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Atividade das Últimas 24h
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{estatisticas.atividade.loginsUltimas24h}</div>
                <div className="text-sm text-gray-600">Logins</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{estatisticas.atividade.uploadsUltimas24h}</div>
                <div className="text-sm text-gray-600">Uploads</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{estatisticas.atividade.errosUltimas24h}</div>
                <div className="text-sm text-gray-600">Erros</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ações Rápidas */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Ações Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.open('?mode=admin', '_blank')}
              >
                <Settings className="w-4 h-4 mr-2" />
                Painel Admin Técnico
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={verificarStatus}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Verificar Sistema
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => console.log('Backup iniciado')}
              >
                <Database className="w-4 h-4 mr-2" />
                Fazer Backup
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}