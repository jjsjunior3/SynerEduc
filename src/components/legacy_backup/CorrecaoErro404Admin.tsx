import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Input } from './ui/input';
import { ArrowLeft, Users, Loader2, Search, User, RefreshCw, AlertCircle, CheckCircle, Wrench } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface CorrecaoErro404AdminProps {
  onVoltar: () => void;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo: 'aluno' | 'professor' | 'coordenador' | 'administrador' | 'professor_conteudista';
  ativo: boolean;
  avatar?: string;
  serie?: string;
  disciplinas?: string[];
  series?: string[];
  criadoEm: string;
}

interface DiagnosticoRota {
  nome: string;
  url: string;
  status: 'pendente' | 'sucesso' | 'erro';
  resposta?: any;
  erro?: string;
}

export function CorrecaoErro404Admin({ onVoltar }: CorrecaoErro404AdminProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [diagnosticando, setDiagnosticando] = useState(false);
  const [diagnostico, setDiagnostico] = useState<DiagnosticoRota[]>([]);
  const [modoFixo, setModoFixo] = useState(false);

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'aluno': return 'bg-blue-100 text-blue-800';
      case 'professor': return 'bg-green-100 text-green-800';
      case 'coordenador': return 'bg-purple-100 text-purple-800';
      case 'administrador': return 'bg-red-100 text-red-800';
      case 'professor_conteudista': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'aluno': return 'Aluno';
      case 'professor': return 'Professor';
      case 'coordenador': return 'Coordenador';
      case 'administrador': return 'Administrador';
      case 'professor_conteudista': return 'Prof. Conteudista';
      default: return tipo;
    }
  };

  const formatarData = (dataString: string) => {
    if (!dataString) return 'Nunca';
    try {
      const data = new Date(dataString);
      return data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Data inválida';
    }
  };

  const diagnosticarRotas = async () => {
    setDiagnosticando(true);
    setDiagnostico([]);
    
    const rotas = [
      { nome: 'Health Check', url: '/health' },
      { nome: 'Root', url: '/' },
      { nome: 'Setup Status', url: '/auth/setup-status' },
      { nome: 'Admin - Usuários', url: '/admin/usuarios' },
      { nome: 'Usuários Simples', url: '/usuarios' },
    ];

    const resultados: DiagnosticoRota[] = rotas.map(rota => ({
      ...rota,
      status: 'pendente'
    }));
    
    setDiagnostico(resultados);

    for (let i = 0; i < rotas.length; i++) {
      const rota = rotas[i];
      try {
        console.log(`[DIAGNÓSTICO] Testando: ${rota.url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0${rota.url}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        let resposta = null;
        try {
          const texto = await response.text();
          resposta = texto ? JSON.parse(texto) : null;
        } catch {
          resposta = { status: 'Resposta não é JSON válido' };
        }

        resultados[i] = {
          ...rota,
          status: response.ok ? 'sucesso' : 'erro',
          resposta: resposta,
          erro: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
        };
        
      } catch (error: any) {
        console.error(`[DIAGNÓSTICO] Erro em ${rota.url}:`, error);
        resultados[i] = {
          ...rota,
          status: 'erro',
          erro: error.message || 'Erro desconhecido'
        };
      }
      
      setDiagnostico([...resultados]);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    setDiagnosticando(false);
    
    // Verificar se alguma rota funcionou
    const algumaSucesso = resultados.some(r => r.status === 'sucesso');
    
    if (algumaSucesso) {
      toast.success('Algumas rotas estão funcionando!');
    } else {
      toast.error('Nenhuma rota está respondendo corretamente');
      setModoFixo(true);
    }
  };

  const tentativaCarregarUsuarios = async (rotaAlternativa: string = '/admin/usuarios') => {
    if (!projectId || !publicAnonKey) {
      setError('Configuração do Supabase inválida');
      return;
    }

    setLoading(true);
    setError(null);

    const tentativas = [
      `/admin/usuarios`,
      `/usuarios`,
      `/auth/setup-status` // Para verificar se o servidor está rodando
    ];

    for (const rota of tentativas) {
      try {
        console.log(`[CORREÇÃO] Tentando rota: ${rota}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0${rota}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          console.log(`[CORREÇÃO] Sucesso na rota ${rota}:`, data);

          if (rota === '/auth/setup-status') {
            toast.success('Servidor está rodando, mas rota de usuários com problema');
            setError('Servidor conectado, mas rota /admin/usuarios retorna 404');
            break;
          } else if (data.usuarios || data.success) {
            const usuariosData = data.usuarios || [];
            setUsuarios(usuariosData);
            toast.success(`${usuariosData.length} usuários carregados via ${rota}!`);
            setLoading(false);
            return;
          }
        } else {
          console.warn(`[CORREÇÃO] Rota ${rota} retornou ${response.status}`);
        }
      } catch (error: any) {
        console.error(`[CORREÇÃO] Erro na rota ${rota}:`, error);
        
        if (error.name === 'AbortError') {
          setError(`Timeout na rota ${rota}`);
        } else if (error.message.includes('Failed to fetch')) {
          setError('Erro de conexão - Servidor pode estar offline');
        }
      }
    }

    setError('Nenhuma rota de usuários está funcionando - Erro 404');
    setLoading(false);
  };

  const criarUsuarioAdmin = async () => {
    try {
      setLoading(true);
      console.log('[CORREÇÃO] Tentando criar usuário administrador...');

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/setup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('[CORREÇÃO] Resposta do setup:', data);

      if (response.ok || data.success || data.message?.includes('já foi configurado')) {
        toast.success('Sistema configurado! Tentando carregar usuários...');
        await tentativaCarregarUsuarios();
      } else {
        throw new Error(data.error || 'Erro no setup');
      }
    } catch (error: any) {
      console.error('[CORREÇÃO] Erro no setup:', error);
      toast.error(`Erro no setup: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const usuariosFiltrados = usuarios.filter(usuario => {
    if (!busca) return true;
    const buscaLower = busca.toLowerCase();
    return usuario.nome.toLowerCase().includes(buscaLower) ||
           usuario.email.toLowerCase().includes(buscaLower) ||
           usuario.tipo.toLowerCase().includes(buscaLower);
  });

  const estatisticas = {
    total: usuarios.length,
    ativos: usuarios.filter(u => u.ativo).length,
    inativos: usuarios.filter(u => !u.ativo).length,
    alunos: usuarios.filter(u => u.tipo === 'aluno').length,
    professores: usuarios.filter(u => u.tipo === 'professor').length,
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      tentativaCarregarUsuarios();
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onVoltar}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">🔧 Correção Erro 404 - Admin</h1>
              <p className="text-sm text-gray-600">Diagnosticar e corrigir problemas na API administrativa</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={diagnosticarRotas}
              variant="outline"
              size="sm"
              disabled={diagnosticando}
            >
              {diagnosticando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wrench className="w-4 h-4" />
              )}
              Diagnosticar
            </Button>
            <div className="text-sm text-gray-600">
              Usuários: {usuarios.length}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Diagnóstico */}
        {diagnostico.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                Diagnóstico das Rotas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {diagnostico.map((rota, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      {rota.status === 'pendente' && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                      {rota.status === 'sucesso' && <CheckCircle className="w-4 h-4 text-green-500" />}
                      {rota.status === 'erro' && <AlertCircle className="w-4 h-4 text-red-500" />}
                      <div>
                        <div className="font-medium">{rota.nome}</div>
                        <div className="text-sm text-gray-600">{rota.url}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      {rota.status === 'sucesso' && (
                        <Badge className="bg-green-100 text-green-800">OK</Badge>
                      )}
                      {rota.status === 'erro' && (
                        <Badge className="bg-red-100 text-red-800">404</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ações de Correção */}
        {(error || modoFixo) && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-orange-800">🚨 Problema Detectado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {error && (
                  <div className="text-orange-700">
                    <strong>Erro:</strong> {error}
                  </div>
                )}
                
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={() => tentativaCarregarUsuarios()} disabled={loading}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Tentar Novamente
                  </Button>
                  
                  <Button onClick={criarUsuarioAdmin} disabled={loading} variant="outline">
                    <Users className="w-4 h-4 mr-2" />
                    Executar Setup
                  </Button>
                  
                  <Button onClick={diagnosticarRotas} disabled={diagnosticando} variant="outline">
                    <Wrench className="w-4 h-4 mr-2" />
                    Diagnosticar Rotas
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {loading && (
          <Card className="mb-6">
            <CardContent className="p-6 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
              <p className="text-gray-600">Carregando usuários...</p>
            </CardContent>
          </Card>
        )}

        {/* Dados dos usuários */}
        {usuarios.length > 0 && (
          <>
            {/* Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{estatisticas.total}</div>
                  <div className="text-sm text-gray-600">Total</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{estatisticas.ativos}</div>
                  <div className="text-sm text-gray-600">Ativos</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{estatisticas.inativos}</div>
                  <div className="text-sm text-gray-600">Inativos</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{estatisticas.alunos}</div>
                  <div className="text-sm text-gray-600">Alunos</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{estatisticas.professores}</div>
                  <div className="text-sm text-gray-600">Professores</div>
                </CardContent>
              </Card>
            </div>

            {/* Busca */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Buscar por nome, email ou tipo..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Lista de Usuários */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Usuários ({usuariosFiltrados.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {usuariosFiltrados.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Nenhum usuário encontrado</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {usuariosFiltrados.map((usuario) => (
                      <div
                        key={usuario.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={usuario.avatar} alt={usuario.nome} />
                            <AvatarFallback>
                              {usuario.nome.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-gray-900">{usuario.nome}</h3>
                              <Badge className={getTipoColor(usuario.tipo)}>
                                {getTipoLabel(usuario.tipo)}
                              </Badge>
                              {!usuario.ativo && (
                                <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                                  Inativo
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-600">{usuario.email}</div>
                            {usuario.serie && (
                              <div className="text-xs text-gray-500">Série: {usuario.serie}</div>
                            )}
                            <div className="text-xs text-gray-500">
                              Cadastrado: {formatarData(usuario.criadoEm)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}