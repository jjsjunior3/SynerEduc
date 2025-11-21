import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, User, BookOpen, GraduationCap, Server } from 'lucide-react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface DiagnosticoStatus {
  sucesso: boolean;
  erro?: string;
  detalhes?: any;
  duracao?: number;
}

export function DiagnosticoProfessorCompleto() {
  const [diagnosticando, setDiagnosticando] = useState(false);
  const [healthCheck, setHealthCheck] = useState<DiagnosticoStatus | null>(null);
  const [dadosProfessor, setDadosProfessor] = useState<DiagnosticoStatus | null>(null);
  const [disciplinasProfessor, setDisciplinasProfessor] = useState<DiagnosticoStatus | null>(null);
  const [configuracaoUsuario, setConfiguracaoUsuario] = useState<DiagnosticoStatus | null>(null);
  const { usuario } = useAuth();

  const executarDiagnostico = async () => {
    setDiagnosticando(true);
    setHealthCheck(null);
    setDadosProfessor(null);
    setDisciplinasProfessor(null);
    setConfiguracaoUsuario(null);

    console.log('[DIAGNOSTICO_PROFESSOR] Iniciando diagnóstico completo...');
    console.log('[DIAGNOSTICO_PROFESSOR] Usuário atual:', usuario);

    // 1. Verificar configuração do usuário
    console.log('[DIAGNOSTICO_PROFESSOR] === 1. VERIFICANDO CONFIGURAÇÃO DO USUÁRIO ===');
    const inicioConfig = Date.now();
    try {
      const problemas = [];
      
      if (!usuario) {
        problemas.push('Usuário não está logado');
      } else {
        if (usuario.tipo !== 'professor') {
          problemas.push(`Tipo de usuário incorreto: ${usuario.tipo} (deveria ser 'professor')`);
        }
        
        if (!usuario.disciplinas || usuario.disciplinas.length === 0) {
          problemas.push('Professor não tem disciplinas configuradas');
        }
        
        if (!usuario.series || usuario.series.length === 0) {
          problemas.push('Professor não tem séries configuradas');
        }
        
        if (!usuario.especialidade) {
          problemas.push('Professor não tem especialidade configurada');
        }
      }

      setConfiguracaoUsuario({
        sucesso: problemas.length === 0,
        erro: problemas.length > 0 ? problemas.join('; ') : undefined,
        detalhes: {
          usuario: usuario ? {
            id: usuario.id,
            nome: usuario.nome,
            tipo: usuario.tipo,
            disciplinas: usuario.disciplinas,
            series: usuario.series,
            especialidade: usuario.especialidade
          } : null,
          problemas
        },
        duracao: Date.now() - inicioConfig
      });
    } catch (error) {
      setConfiguracaoUsuario({
        sucesso: false,
        erro: `Erro ao verificar configuração: ${error.message}`,
        duracao: Date.now() - inicioConfig
      });
    }

    // 2. Health Check do Servidor
    console.log('[DIAGNOSTICO_PROFESSOR] === 2. HEALTH CHECK DO SERVIDOR ===');
    const inicioHealth = Date.now();
    try {
      const healthUrl = `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/health`;
      console.log('[DIAGNOSTICO_PROFESSOR] Testando URL:', healthUrl);
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      setHealthCheck({
        sucesso: response.ok,
        erro: !response.ok ? `Status ${response.status}: ${response.statusText}` : undefined,
        detalhes: {
          status: response.status,
          url: healthUrl,
          response: data
        },
        duracao: Date.now() - inicioHealth
      });
    } catch (error) {
      setHealthCheck({
        sucesso: false,
        erro: `Erro de conexão: ${error.message}`,
        duracao: Date.now() - inicioHealth
      });
    }

    // 3. Buscar dados específicos do professor
    if (usuario?.id) {
      console.log('[DIAGNOSTICO_PROFESSOR] === 3. BUSCANDO DADOS DO PROFESSOR ===');
      const inicioProfessor = Date.now();
      try {
        const professorUrl = `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/usuarios/${usuario.id}`;
        console.log('[DIAGNOSTICO_PROFESSOR] Buscando dados em:', professorUrl);
        
        const response = await fetch(professorUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setDadosProfessor({
            sucesso: true,
            detalhes: {
              url: professorUrl,
              response: data
            },
            duracao: Date.now() - inicioProfessor
          });
        } else {
          const errorText = await response.text();
          setDadosProfessor({
            sucesso: false,
            erro: `Status ${response.status}: ${errorText}`,
            duracao: Date.now() - inicioProfessor
          });
        }
      } catch (error) {
        setDadosProfessor({
          sucesso: false,
          erro: `Erro ao buscar dados: ${error.message}`,
          duracao: Date.now() - inicioProfessor
        });
      }

      // 4. Testar API de disciplinas do professor
      console.log('[DIAGNOSTICO_PROFESSOR] === 4. TESTANDO API DE DISCIPLINAS ===');
      const inicioDisciplinas = Date.now();
      try {
        const disciplinasUrl = `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/professor/${usuario.id}/disciplinas`;
        console.log('[DIAGNOSTICO_PROFESSOR] Testando URL disciplinas:', disciplinasUrl);
        
        const response = await fetch(disciplinasUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setDisciplinasProfessor({
            sucesso: true,
            detalhes: {
              url: disciplinasUrl,
              response: data,
              seriesEncontradas: data.seriesComDisciplinas?.length || 0
            },
            duracao: Date.now() - inicioDisciplinas
          });
        } else {
          const errorText = await response.text();
          setDisciplinasProfessor({
            sucesso: false,
            erro: `Status ${response.status}: ${errorText}`,
            duracao: Date.now() - inicioDisciplinas
          });
        }
      } catch (error) {
        setDisciplinasProfessor({
          sucesso: false,
          erro: `Erro ao buscar disciplinas: ${error.message}`,
          duracao: Date.now() - inicioDisciplinas
        });
      }
    }

    setDiagnosticando(false);
  };

  const corrigirProfessor = async () => {
    if (!usuario?.id) return;

    console.log('[DIAGNOSTICO_PROFESSOR] Corrigindo configuração do professor...');
    
    try {
      const dadosCorrigidos = {
        nome: usuario.nome,
        tipo: 'professor',
        disciplinas: ['Ciências'],
        series: ['5º ano', '6º ano', '7º ano', '8º ano', '9º ano'],
        especialidade: 'Ciências',
        ativo: true
      };

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${usuario.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(dadosCorrigidos)
        }
      );

      if (response.ok) {
        alert('Professor corrigido com sucesso! Recarregue a página.');
      } else {
        const error = await response.text();
        alert(`Erro ao corrigir: ${error}`);
      }
    } catch (error) {
      alert(`Erro ao corrigir: ${error.message}`);
    }
  };

  const StatusIcon = ({ status }: { status: DiagnosticoStatus | null }) => {
    if (!status) return <AlertCircle className="w-5 h-5 text-gray-400" />;
    return status.sucesso ? 
      <CheckCircle className="w-5 h-5 text-green-500" /> : 
      <XCircle className="w-5 h-5 text-red-500" />;
  };

  const getStatusColor = (status: DiagnosticoStatus | null) => {
    if (!status) return 'border-gray-200';
    return status.sucesso ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-6 h-6" />
              Diagnóstico Completo - Dashboard Professor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <Button 
                onClick={executarDiagnostico}
                disabled={diagnosticando}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${diagnosticando ? 'animate-spin' : ''}`} />
                {diagnosticando ? 'Diagnosticando...' : 'Executar Diagnóstico'}
              </Button>
              
              {configuracaoUsuario && !configuracaoUsuario.sucesso && (
                <Button 
                  onClick={corrigirProfessor}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  Corrigir Professor
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Configuração do Usuário */}
              <Card className={getStatusColor(configuracaoUsuario)}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <StatusIcon status={configuracaoUsuario} />
                    <h3 className="font-semibold">1. Configuração do Usuário</h3>
                    {configuracaoUsuario && (
                      <Badge variant="outline" className="ml-auto">
                        {configuracaoUsuario.duracao}ms
                      </Badge>
                    )}
                  </div>
                  
                  {configuracaoUsuario && (
                    <div className="space-y-2 text-sm">
                      {configuracaoUsuario.sucesso ? (
                        <p className="text-green-700">✅ Usuário configurado corretamente</p>
                      ) : (
                        <p className="text-red-700">❌ {configuracaoUsuario.erro}</p>
                      )}
                      
                      {configuracaoUsuario.detalhes?.usuario && (
                        <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                          <p><strong>ID:</strong> {configuracaoUsuario.detalhes.usuario.id}</p>
                          <p><strong>Nome:</strong> {configuracaoUsuario.detalhes.usuario.nome}</p>
                          <p><strong>Tipo:</strong> {configuracaoUsuario.detalhes.usuario.tipo}</p>
                          <p><strong>Disciplinas:</strong> {JSON.stringify(configuracaoUsuario.detalhes.usuario.disciplinas)}</p>
                          <p><strong>Séries:</strong> {JSON.stringify(configuracaoUsuario.detalhes.usuario.series)}</p>
                          <p><strong>Especialidade:</strong> {configuracaoUsuario.detalhes.usuario.especialidade}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Health Check */}
              <Card className={getStatusColor(healthCheck)}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <StatusIcon status={healthCheck} />
                    <h3 className="font-semibold">2. Health Check</h3>
                    {healthCheck && (
                      <Badge variant="outline" className="ml-auto">
                        {healthCheck.duracao}ms
                      </Badge>
                    )}
                  </div>
                  
                  {healthCheck && (
                    <div className="space-y-2 text-sm">
                      {healthCheck.sucesso ? (
                        <p className="text-green-700">✅ Servidor respondendo</p>
                      ) : (
                        <p className="text-red-700">❌ {healthCheck.erro}</p>
                      )}
                      
                      <div className="text-xs text-gray-600">
                        Status: {healthCheck.detalhes?.status}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Dados do Professor */}
              <Card className={getStatusColor(dadosProfessor)}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <StatusIcon status={dadosProfessor} />
                    <h3 className="font-semibold">3. Dados do Professor</h3>
                    {dadosProfessor && (
                      <Badge variant="outline" className="ml-auto">
                        {dadosProfessor.duracao}ms
                      </Badge>
                    )}
                  </div>
                  
                  {dadosProfessor && (
                    <div className="space-y-2 text-sm">
                      {dadosProfessor.sucesso ? (
                        <div>
                          <p className="text-green-700">✅ Dados carregados</p>
                          {dadosProfessor.detalhes?.response && (
                            <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                              <pre>{JSON.stringify(dadosProfessor.detalhes.response, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-red-700">❌ {dadosProfessor.erro}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* API de Disciplinas */}
              <Card className={getStatusColor(disciplinasProfessor)}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <StatusIcon status={disciplinasProfessor} />
                    <h3 className="font-semibold">4. API de Disciplinas</h3>
                    {disciplinasProfessor && (
                      <Badge variant="outline" className="ml-auto">
                        {disciplinasProfessor.duracao}ms
                      </Badge>
                    )}
                  </div>
                  
                  {disciplinasProfessor && (
                    <div className="space-y-2 text-sm">
                      {disciplinasProfessor.sucesso ? (
                        <div>
                          <p className="text-green-700">✅ API funcionando</p>
                          <p className="text-gray-600">
                            Séries encontradas: {disciplinasProfessor.detalhes?.seriesEncontradas || 0}
                          </p>
                          {disciplinasProfessor.detalhes?.response && (
                            <div className="mt-2 p-2 bg-gray-100 rounded text-xs max-h-40 overflow-y-auto">
                              <pre>{JSON.stringify(disciplinasProfessor.detalhes.response, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-red-700">❌ {disciplinasProfessor.erro}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">Como usar este diagnóstico:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Execute o diagnóstico para verificar todos os componentes</li>
                <li>• Se a "Configuração do Usuário" falhar, clique em "Corrigir Professor"</li>
                <li>• Se o "Health Check" falhar, verifique a conexão com o servidor</li>
                <li>• Se "Dados do Professor" falhar, o usuário pode não existir no backend</li>
                <li>• Se "API de Disciplinas" falhar, há problema na rota específica</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}