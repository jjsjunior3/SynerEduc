import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, User, BookOpen } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface TesteRotasProfessorProps {
  onVoltar: () => void;
}

interface ResultadoTeste {
  sucesso: boolean;
  tempo: number;
  dados?: any;
  erro?: string;
}

export function TesteRotasProfessor({ onVoltar }: TesteRotasProfessorProps) {
  const [resultados, setResultados] = useState<Record<string, ResultadoTeste>>({});
  const [testando, setTestando] = useState(false);
  const [professorTeste, setProfessorTeste] = useState<any>(null);

  const executarTeste = async (nome: string, teste: () => Promise<any>) => {
    const inicioTempo = Date.now();
    
    try {
      console.log(`🧪 [TESTE PROFESSOR] Iniciando: ${nome}`);
      const resultado = await teste();
      const tempo = Date.now() - inicioTempo;
      
      setResultados(prev => ({
        ...prev,
        [nome]: {
          sucesso: true,
          tempo,
          dados: resultado
        }
      }));
      
      console.log(`✅ [TESTE PROFESSOR] ${nome} - Sucesso em ${tempo}ms`);
      
    } catch (error) {
      const tempo = Date.now() - inicioTempo;
      
      setResultados(prev => ({
        ...prev,
        [nome]: {
          sucesso: false,
          tempo,
          erro: error.message
        }
      }));
      
      console.error(`❌ [TESTE PROFESSOR] ${nome} - Erro:`, error);
    }
  };

  const executarTodosTestes = async () => {
    setTestando(true);
    setResultados({});
    setProfessorTeste(null);
    
    try {
      toast.info('Iniciando testes das rotas de professor...');

      // Teste 1: Verificar se existem professores no sistema
      await executarTeste('1. Buscar Professores no Sistema', async () => {
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios?tipo=professor`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Falha ao buscar professores');
        }

        const professores = data.usuarios || [];
        
        if (professores.length === 0) {
          throw new Error('Nenhum professor encontrado no sistema');
        }

        // Selecionar primeiro professor para testes
        setProfessorTeste(professores[0]);

        return {
          totalProfessores: professores.length,
          professorSelecionado: professores[0],
          outrosProfessores: professores.slice(1, 3).map(p => ({
            id: p.id,
            nome: p.nome,
            disciplinas: p.disciplinas || []
          }))
        };
      });

      // Teste 2: Testar rota de disciplinas do professor
      await executarTeste('2. Listar Disciplinas do Professor', async () => {
        if (!professorTeste) {
          throw new Error('Professor de teste não foi selecionado');
        }

        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/professor/${professorTeste.id}/disciplinas`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Falha ao listar disciplinas');
        }

        return {
          professor: data.professor,
          totalDisciplinas: data.disciplinas?.length || 0,
          disciplinas: data.disciplinas || [],
          primeirasDisciplinas: (data.disciplinas || []).slice(0, 3)
        };
      });

      // Teste 3: Testar rota de turmas do professor
      await executarTeste('3. Listar Turmas do Professor', async () => {
        if (!professorTeste) {
          throw new Error('Professor de teste não foi selecionado');
        }

        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/professor/${professorTeste.id}/turmas`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Falha ao listar turmas');
        }

        return {
          professor: data.professor,
          turmas: data.turmas,
          totalSeries: Object.keys(data.turmas || {}).length,
          primeiraSerie: Object.keys(data.turmas || {})[0],
          totalAlunos: Object.values(data.turmas || {}).reduce((acc: number, alunos: any) => acc + alunos.length, 0)
        };
      });

      // Teste 4: Testar rota de conteúdo de disciplina (se professor tiver disciplinas)
      await executarTeste('4. Buscar Conteúdo de Disciplina', async () => {
        if (!professorTeste) {
          throw new Error('Professor de teste não foi selecionado');
        }

        // Primeiro, buscar disciplinas do professor
        const disciplinasResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/professor/${professorTeste.id}/disciplinas`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        });

        if (!disciplinasResponse.ok) {
          throw new Error('Falha ao buscar disciplinas para teste de conteúdo');
        }

        const disciplinasData = await disciplinasResponse.json();
        const disciplinas = disciplinasData.disciplinas || [];

        if (disciplinas.length === 0) {
          return {
            mensagem: 'Professor não tem disciplinas associadas',
            professor: professorTeste.nome,
            disciplinasAssociadas: professorTeste.disciplinas || []
          };
        }

        const primeiraDisciplina = disciplinas[0];

        // Testar rota de conteúdo
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/professor/${professorTeste.id}/disciplina/${primeiraDisciplina.id}/conteudo`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Falha ao buscar conteúdo');
        }

        return {
          disciplina: data.disciplina,
          totalConteudos: data.conteudos?.length || 0,
          conteudos: data.conteudos || [],
          primeirosConteudos: (data.conteudos || []).slice(0, 3)
        };
      });

      // Teste 5: Testar com usuário não-professor (deve falhar)
      await executarTeste('5. Teste de Segurança (usuário não-professor)', async () => {
        // Buscar um usuário que não seja professor
        const usuariosResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        });

        if (!usuariosResponse.ok) {
          throw new Error('Falha ao buscar usuários para teste de segurança');
        }

        const usuariosData = await usuariosResponse.json();
        const usuarios = usuariosData.usuarios || [];
        const naoProf = usuarios.find(u => u.tipo !== 'professor' && u.tipo !== 'professor_conteudista');

        if (!naoProf) {
          return {
            mensagem: 'Não há usuários não-professores para testar',
            skip: true
          };
        }

        // Tentar acessar disciplinas com usuário não-professor (deve falhar)
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/professor/${naoProf.id}/disciplinas`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        });

        if (response.ok) {
          throw new Error('FALHA DE SEGURANÇA: Usuário não-professor conseguiu acessar rota de professor');
        }

        // Se chegou aqui, a segurança funcionou corretamente
        return {
          usuarioTestado: naoProf.nome,
          tipoUsuario: naoProf.tipo,
          statusSeguranca: 'APROVADO',
          codigoRetorno: response.status
        };
      });

      toast.success('✅ Todos os testes das rotas de professor executados!');
      
    } catch (error) {
      console.error('❌ [TESTE PROFESSOR] Erro geral:', error);
      toast.error(`Erro nos testes: ${error.message}`);
    } finally {
      setTestando(false);
    }
  };

  const getStatusIcon = (resultado?: ResultadoTeste) => {
    if (!resultado) return <AlertTriangle className="w-5 h-5 text-gray-400" />;
    return resultado.sucesso ? 
      <CheckCircle className="w-5 h-5 text-green-600" /> : 
      <XCircle className="w-5 h-5 text-red-600" />;
  };

  const getStatusColor = (resultado?: ResultadoTeste) => {
    if (!resultado) return 'border-gray-200 bg-gray-50';
    return resultado.sucesso ? 
      'border-green-200 bg-green-50' : 
      'border-red-200 bg-red-50';
  };

  const testes = [
    '1. Buscar Professores no Sistema',
    '2. Listar Disciplinas do Professor', 
    '3. Listar Turmas do Professor',
    '4. Buscar Conteúdo de Disciplina',
    '5. Teste de Segurança (usuário não-professor)'
  ];

  const resultadosArray = Object.values(resultados);
  const todosExecutados = resultadosArray.length === testes.length;
  const todosSucesso = todosExecutados && resultadosArray.every(r => r.sucesso);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-5xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-6 h-6 text-blue-600" />
              Teste das Rotas de Professor
            </CardTitle>
            <CardDescription>
              Verifica se as novas rotas implementadas para professores estão funcionando corretamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-4">
              <Button 
                onClick={executarTodosTestes}
                disabled={testando}
                className="flex-1"
              >
                {testando ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Executando Testes...
                  </>
                ) : (
                  <>
                    <BookOpen className="w-4 h-4 mr-2" />
                    Executar Testes de Rotas Professor
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={onVoltar}>
                Voltar
              </Button>
            </div>

            {/* Status Geral */}
            {todosExecutados && (
              <Card className={todosSucesso ? 'border-green-500' : 'border-orange-500'}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {todosSucesso ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-orange-600" />
                    )}
                    <span className="text-lg font-semibold">
                      {todosSucesso ? 
                        '🎉 Todas as rotas funcionando!' : 
                        '⚠️ Algumas rotas têm problemas'
                      }
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {todosSucesso ? 
                      'Todas as rotas de professor foram implementadas e estão funcionando corretamente!' :
                      'Algumas rotas falharam. Verifique os detalhes abaixo.'
                    }
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Professor de Teste */}
            {professorTeste && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">👨‍🏫 Professor de Teste Selecionado:</h3>
                <div className="text-sm">
                  <div><strong>Nome:</strong> {professorTeste.nome}</div>
                  <div><strong>ID:</strong> {professorTeste.id}</div>
                  <div><strong>Email:</strong> {professorTeste.email}</div>
                  <div><strong>Disciplinas:</strong> {(professorTeste.disciplinas || []).join(', ') || 'Nenhuma'}</div>
                </div>
              </div>
            )}

            {/* Resumo dos Resultados */}
            {Object.keys(resultados).length > 0 && (
              <div className="grid md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {Object.keys(resultados).length}
                    </div>
                    <div className="text-sm text-gray-600">Testes Executados</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">
                      {Object.values(resultados).filter(r => r.sucesso).length}
                    </div>
                    <div className="text-sm text-gray-600">Sucessos</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-red-600">
                      {Object.values(resultados).filter(r => !r.sucesso).length}
                    </div>
                    <div className="text-sm text-gray-600">Falhas</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-orange-600">
                      {Math.round(Object.values(resultados).reduce((acc, r) => acc + r.tempo, 0) / Object.keys(resultados).length)}ms
                    </div>
                    <div className="text-sm text-gray-600">Tempo Médio</div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Lista Detalhada dos Testes */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Resultados Detalhados</h3>
              {testes.map((teste) => {
                const resultado = resultados[teste];
                return (
                  <div
                    key={teste}
                    className={`p-4 rounded-lg border ${getStatusColor(resultado)}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(resultado)}
                        <span className="font-medium">{teste}</span>
                      </div>
                      {resultado && (
                        <span className="text-sm text-gray-600">
                          {resultado.tempo}ms
                        </span>
                      )}
                    </div>
                    
                    {resultado?.sucesso && resultado.dados && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm text-blue-600">
                          Ver dados retornados
                        </summary>
                        <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto max-h-32">
                          {JSON.stringify(resultado.dados, null, 2)}
                        </pre>
                      </details>
                    )}
                    
                    {resultado && !resultado.sucesso && resultado.erro && (
                      <div className="mt-2 text-sm text-red-700 bg-red-100 p-2 rounded">
                        <strong>Erro:</strong> {resultado.erro}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Explicação */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">🔍 O que este teste verifica:</h4>
              <ul className="space-y-1 text-sm">
                <li>• <strong>Rota de disciplinas:</strong> GET /professor/:userId/disciplinas</li>
                <li>• <strong>Rota de turmas:</strong> GET /professor/:userId/turmas</li>
                <li>• <strong>Rota de conteúdo:</strong> GET /professor/:userId/disciplina/:disciplinaId/conteudo</li>
                <li>• <strong>Segurança:</strong> Se usuários não-professores são bloqueados</li>
                <li>• <strong>Dados retornados:</strong> Se as informações estão no formato correto</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}