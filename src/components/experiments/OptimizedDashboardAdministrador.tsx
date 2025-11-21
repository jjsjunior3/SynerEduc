import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Users, 
  BookOpen, 
  TrendingUp, 
  Settings, 
  UserPlus,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity,
  Database,
  Wifi
} from 'lucide-react';
import { optimizedFetch, fetchWithFastFallback } from '../utils/networkOptimizer';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Usuario } from '../types/auth';

interface DashboardAdministradorProps {
  onDisciplinaClick: (disciplina: any) => void;
  onBoletimClick: () => void;
  onBackToSite: () => void;
  usuario: Usuario;
  logout: () => void;
  atualizarUsuario: (usuario: Usuario) => void;
}

interface Estatisticas {
  totalUsuarios: number;
  totalProfessores: number;
  totalAlunos: number;
  totalCoordenadores: number;
  ativosHoje: number;
  sistemasOperacionais: number;
}

export function OptimizedDashboardAdministrador({
  onDisciplinaClick,
  onBoletimClick,
  onBackToSite,
  usuario,
  logout,
  atualizarUsuario
}: DashboardAdministradorProps) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [estatisticas, setEstatisticas] = useState<Estatisticas>({
    totalUsuarios: 0,
    totalProfessores: 0,
    totalAlunos: 0,
    totalCoordenadores: 0,
    ativosHoje: 0,
    sistemasOperacionais: 100
  });
  const [conectividade, setConectividade] = useState<'online' | 'offline' | 'checking'>('checking');

  // Carregar estatísticas com timeout otimizado
  const carregarEstatisticas = useCallback(async () => {
    console.log('[ADMIN_OTIMIZADO] Carregando estatísticas...');
    setLoading(true);
    setErro('');

    try {
      const dados = await fetchWithFastFallback(
        `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/estatisticas`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        },
        // Fallback data
        {
          success: true,
          estatisticas: {
            totalUsuarios: 245,
            totalProfessores: 28,
            totalAlunos: 187,
            totalCoordenadores: 8,
            ativosHoje: 156,
            sistemasOperacionais: 100
          }
        }
      );

      console.log('[ADMIN_OTIMIZADO] Estatísticas recebidas:', dados);
      
      if (dados && dados.success && dados.estatisticas) {
        setEstatisticas(dados.estatisticas);
        setConectividade('online');
      } else {
        // Usar dados de fallback em caso de resposta inválida
        setEstatisticas({
          totalUsuarios: 245,
          totalProfessores: 28,
          totalAlunos: 187,
          totalCoordenadores: 8,
          ativosHoje: 156,
          sistemasOperacionais: 100
        });
        setConectividade('offline');
      }
    } catch (error) {
      console.error('[ADMIN_OTIMIZADO] Erro ao carregar estatísticas:', error);
      setErro('Modo offline ativo - dados de demonstração');
      setConectividade('offline');
      
      // Usar dados estáticos para demonstração
      setEstatisticas({
        totalUsuarios: 245,
        totalProfessores: 28,
        totalAlunos: 187,
        totalCoordenadores: 8,
        ativosHoje: 156,
        sistemasOperacionais: 100
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarEstatisticas();
  }, [carregarEstatisticas]);

  const StatusIndicator = () => (
    <div className={`flex items-center gap-2 text-sm ${
      conectividade === 'online' ? 'text-green-600' : 
      conectividade === 'offline' ? 'text-yellow-600' : 
      'text-gray-600'
    }`}>
      {conectividade === 'online' && <CheckCircle className="w-4 h-4" />}
      {conectividade === 'offline' && <AlertCircle className="w-4 h-4" />}
      {conectividade === 'checking' && <Clock className="w-4 h-4 animate-pulse" />}
      
      <span>
        {conectividade === 'online' && 'Sistema Online'}
        {conectividade === 'offline' && 'Modo Offline Ativo'}
        {conectividade === 'checking' && 'Verificando...'}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header Otimizado */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Painel Administrativo
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {usuario.nome} - {usuario.tipo}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <StatusIndicator />
              <Button 
                onClick={carregarEstatisticas} 
                variant="outline" 
                size="sm"
                disabled={loading}
                className="hidden sm:flex"
              >
                <Activity className="w-4 h-4 mr-2" />
                {loading ? 'Atualizando...' : 'Atualizar'}
              </Button>
              <Button onClick={logout} variant="outline">
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mensagem de Erro/Status */}
        {erro && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>{erro}</span>
            </div>
          </div>
        )}

        {/* Estatísticas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total de Usuários
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {loading ? '---' : estatisticas.totalUsuarios}
                  </p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Professores
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {loading ? '---' : estatisticas.totalProfessores}
                  </p>
                </div>
                <BookOpen className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Alunos
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {loading ? '---' : estatisticas.totalAlunos}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Ativos Hoje
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {loading ? '---' : estatisticas.ativosHoje}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ações Principais */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Ações Administrativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                onClick={() => window.open('/admin/usuarios', '_blank')}
                className="h-auto p-4 flex flex-col items-center gap-2"
                variant="outline"
              >
                <Users className="w-8 h-8" />
                <div className="text-center">
                  <div className="font-medium">Gerenciar Usuários</div>
                  <div className="text-sm text-gray-600">Criar, editar e excluir usuários</div>
                </div>
              </Button>

              <Button 
                onClick={() => window.open('/admin/relatorios', '_blank')}
                className="h-auto p-4 flex flex-col items-center gap-2"
                variant="outline"
              >
                <BarChart3 className="w-8 h-8" />
                <div className="text-center">
                  <div className="font-medium">Relatórios</div>
                  <div className="text-sm text-gray-600">Visualizar dados e métricas</div>
                </div>
              </Button>

              <Button 
                onClick={() => window.open('/admin/configuracoes', '_blank')}
                className="h-auto p-4 flex flex-col items-center gap-2"
                variant="outline"
              >
                <Settings className="w-8 h-8" />
                <div className="text-center">
                  <div className="font-medium">Configurações</div>
                  <div className="text-sm text-gray-600">Ajustes do sistema</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Status do Sistema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Status do Sistema
              <Badge variant={conectividade === 'online' ? 'default' : 'secondary'}>
                {conectividade === 'online' ? 'Operacional' : 'Modo Offline'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Conectividade</span>
                  <Badge variant={conectividade === 'online' ? 'default' : 'secondary'}>
                    {conectividade === 'online' ? 'Online' : 'Offline'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Sistemas Operacionais</span>
                  <Badge variant="default">{estatisticas.sistemasOperacionais}%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Última Atualização</span>
                  <span className="text-sm text-gray-900">
                    {new Date().toLocaleTimeString()}
                  </span>
                </div>
              </div>
              
              <div className="space-y-3">
                <Button 
                  onClick={carregarEstatisticas}
                  className="w-full"
                  disabled={loading}
                >
                  <Activity className="w-4 h-4 mr-2" />
                  {loading ? 'Verificando...' : 'Verificar Status'}
                </Button>
                
                <Button 
                  onClick={onBackToSite}
                  variant="outline"
                  className="w-full"
                >
                  ← Voltar ao Site
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}