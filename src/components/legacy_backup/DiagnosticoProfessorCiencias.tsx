import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle, XCircle, AlertTriangle, User, BookOpen, GraduationCap } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface DiagnosticoProfessorCienciasProps {
  onVoltar: () => void;
}

export function DiagnosticoProfessorCiencias({ onVoltar }: DiagnosticoProfessorCienciasProps) {
  const [diagnostico, setDiagnostico] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const buscarUsuarioProfessorCiencias = async () => {
    try {
      setCarregando(true);
      console.log('[DIAGNÓSTICO] Buscando usuário professor.ciencias...');

      // Primeiro, listar todos os usuários para encontrar o professor.ciencias
      const responseUsuarios = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/usuarios`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!responseUsuarios.ok) {
        throw new Error(`Erro ao listar usuários: ${responseUsuarios.status}`);
      }

      const dataUsuarios = await responseUsuarios.json();
      console.log('[DIAGNÓSTICO] Todos os usuários:', dataUsuarios);

      // Procurar pelo professor.ciencias
      const professorCiencias = dataUsuarios.usuarios?.find((u: any) => 
        u.nomeUsuario === 'professor.ciencias' || 
        u.email?.includes('professor.ciencias') ||
        (u.tipo === 'professor' && u.especialidade === 'Ciências')
      );

      console.log('[DIAGNÓSTICO] Professor Ciências encontrado:', professorCiencias);

      if (!professorCiencias) {
        setDiagnostico({
          encontrado: false,
          error: 'Usuário professor.ciencias não encontrado no sistema',
          sugestoes: [
            'Verificar se o usuário foi criado corretamente',
            'Verificar se o nome de usuário está correto',
            'Tentar criar um novo usuário professor de ciências'
          ]
        });
        setCarregando(false);
        return;
      }

      // Se encontrou, buscar suas disciplinas específicas
      try {
        const responseDisciplinas = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/professor/${professorCiencias.id}/disciplinas`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        });

        let disciplinasData = null;
        if (responseDisciplinas.ok) {
          disciplinasData = await responseDisciplinas.json();
          console.log('[DIAGNÓSTICO] Disciplinas do professor:', disciplinasData);
        }

        setDiagnostico({
          encontrado: true,
          professor: professorCiencias,
          disciplinas: disciplinasData,
          problemas: [],
          sugestoes: []
        });

        // Verificar problemas nos dados
        const problemas = [];
        const sugestoes = [];

        if (!professorCiencias.disciplinas || professorCiencias.disciplinas.length === 0) {
          problemas.push('Professor não tem disciplinas definidas');
          sugestoes.push('Definir disciplinas no campo "disciplinas" do usuário');
        }

        if (!professorCiencias.series || professorCiencias.series.length === 0) {
          problemas.push('Professor não tem séries definidas');
          sugestoes.push('Definir séries no campo "series" do usuário');
        }

        if (!professorCiencias.especialidade) {
          problemas.push('Professor não tem especialidade definida');
          sugestoes.push('Definir especialidade como "Ciências"');
        }

        if (professorCiencias.especialidade !== 'Ciências') {
          problemas.push(`Especialidade incorreta: ${professorCiencias.especialidade} (deveria ser "Ciências")`);
          sugestoes.push('Corrigir especialidade para "Ciências"');
        }

        // Verificar séries esperadas (5º ao 9º ano)
        const seriesEsperadas = ['5º ano', '6º ano', '7º ano', '8º ano', '9º ano'];
        const seriesAtribuidas = professorCiencias.series || [];
        const seriesFaltando = seriesEsperadas.filter(s => !seriesAtribuidas.includes(s));
        
        if (seriesFaltando.length > 0) {
          problemas.push(`Séries faltando: ${seriesFaltando.join(', ')}`);
          sugestoes.push(`Adicionar séries faltantes: ${seriesFaltando.join(', ')}`);
        }

        setDiagnostico(prev => ({
          ...prev,
          problemas,
          sugestoes
        }));

      } catch (errorDisciplinas) {
        console.error('[DIAGNÓSTICO] Erro ao buscar disciplinas:', errorDisciplinas);
        setDiagnostico(prev => ({
          ...prev,
          problemas: [...(prev?.problemas || []), 'Erro ao carregar disciplinas do professor'],
          disciplinasError: errorDisciplinas.message
        }));
      }

      setCarregando(false);

    } catch (error) {
      console.error('[DIAGNÓSTICO] Erro no diagnóstico:', error);
      setErro(error.message);
      setCarregando(false);
    }
  };

  const corrigirDadosProfessor = async () => {
    if (!diagnostico?.professor) return;

    try {
      setCarregando(true);
      console.log('[DIAGNÓSTICO] Corrigindo dados do professor...');

      const dadosCorrigidos = {
        disciplinas: ['Ciências'],
        series: ['5º ano', '6º ano', '7º ano', '8º ano', '9º ano'],
        especialidade: 'Ciências'
      };

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/usuarios/${diagnostico.professor.id}/perfil`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosCorrigidos)
      });

      if (!response.ok) {
        throw new Error(`Erro ao atualizar: ${response.status}`);
      }

      const result = await response.json();
      console.log('[DIAGNÓSTICO] Professor atualizado:', result);

      // Refazer o diagnóstico
      await buscarUsuarioProfessorCiencias();

    } catch (error) {
      console.error('[DIAGNÓSTICO] Erro ao corrigir dados:', error);
      setErro(`Erro ao corrigir dados: ${error.message}`);
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarUsuarioProfessorCiencias();
  }, []);

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Diagnosticando professor.ciencias...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Diagnóstico: Professor Ciências</h1>
            <p className="text-gray-600">Verificação dos dados do usuário professor.ciencias</p>
          </div>
          <Button onClick={onVoltar} variant="outline">
            Voltar
          </Button>
        </div>

        {/* Erro geral */}
        {erro && (
          <Alert className="border-red-200 bg-red-50">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              {erro}
            </AlertDescription>
          </Alert>
        )}

        {/* Resultado do diagnóstico */}
        {diagnostico && (
          <div className="space-y-6">
            {/* Status geral */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {diagnostico.encontrado ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  Status do Professor
                </CardTitle>
              </CardHeader>
              <CardContent>
                {diagnostico.encontrado ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Nome:</p>
                        <p className="font-medium">{diagnostico.professor.nome}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Nome de usuário:</p>
                        <p className="font-medium">{diagnostico.professor.nomeUsuario}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Tipo:</p>
                        <Badge variant="secondary">{diagnostico.professor.tipo}</Badge>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Status:</p>
                        <Badge variant={diagnostico.professor.ativo ? "default" : "destructive"}>
                          {diagnostico.professor.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-red-600">{diagnostico.error}</p>
                )}
              </CardContent>
            </Card>

            {/* Disciplinas e Séries */}
            {diagnostico.encontrado && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Disciplinas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">Especialidade:</p>
                      <Badge variant="outline">{diagnostico.professor.especialidade || 'Não definida'}</Badge>
                      
                      <p className="text-sm text-gray-600 mt-4">Disciplinas atribuídas:</p>
                      {diagnostico.professor.disciplinas && diagnostico.professor.disciplinas.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {diagnostico.professor.disciplinas.map((disc: string, idx: number) => (
                            <Badge key={idx} variant="secondary">{disc}</Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 italic">Nenhuma disciplina definida</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" />
                      Séries
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">Séries atribuídas:</p>
                      {diagnostico.professor.series && diagnostico.professor.series.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {diagnostico.professor.series.map((serie: string, idx: number) => (
                            <Badge key={idx} variant="secondary">{serie}</Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 italic">Nenhuma série definida</p>
                      )}
                      
                      <p className="text-sm text-gray-600 mt-4">Séries esperadas para Ciências:</p>
                      <div className="flex flex-wrap gap-2">
                        {['5º ano', '6º ano', '7º ano', '8º ano', '9º ano'].map((serie, idx) => (
                          <Badge key={idx} variant="outline">{serie}</Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Problemas encontrados */}
            {diagnostico.problemas && diagnostico.problemas.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-600">
                    <AlertTriangle className="h-5 w-5" />
                    Problemas Encontrados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {diagnostico.problemas.map((problema: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-orange-700">
                        <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        {problema}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Sugestões de correção */}
            {diagnostico.sugestoes && diagnostico.sugestoes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-600">
                    <CheckCircle className="h-5 w-5" />
                    Sugestões de Correção
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-4">
                    {diagnostico.sugestoes.map((sugestao: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-blue-700">
                        <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        {sugestao}
                      </li>
                    ))}
                  </ul>
                  
                  {diagnostico.encontrado && diagnostico.problemas.length > 0 && (
                    <Button onClick={corrigirDadosProfessor} className="w-full">
                      Corrigir Dados Automaticamente
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Dados das disciplinas (se disponível) */}
            {diagnostico.disciplinas && (
              <Card>
                <CardHeader>
                  <CardTitle>Dados das Disciplinas (API)</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                    {JSON.stringify(diagnostico.disciplinas, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-4">
          <Button onClick={buscarUsuarioProfessorCiencias} variant="outline">
            Refazer Diagnóstico
          </Button>
          <Button onClick={onVoltar}>
            Concluir
          </Button>
        </div>
      </div>
    </div>
  );
}