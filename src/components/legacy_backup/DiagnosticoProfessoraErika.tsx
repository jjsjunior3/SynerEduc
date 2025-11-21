import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  ArrowLeft, 
  RefreshCw, 
  User, 
  AlertTriangle, 
  CheckCircle,
  Settings,
  BookOpen,
  Users
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface DiagnosticoProfessoraErikaProps {
  onVoltar: () => void;
}

interface ResultadoDiagnostico {
  professor?: any;
  disciplinasApi?: any;
  problemas: string[];
  sugestoes: string[];
  vinculacoesEspecificas?: any[];
}

export function DiagnosticoProfessoraErika({ onVoltar }: DiagnosticoProfessoraErikaProps) {
  const [diagnosticando, setDiagnosticando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoDiagnostico | null>(null);
  const [corrigindo, setCorrigindo] = useState(false);

  const executarDiagnostico = async () => {
    setDiagnosticando(true);
    setResultado(null);

    try {
      console.log('[DIAGNÓSTICO_ERIKA] Iniciando diagnóstico da professora Erika...');
      
      const problemas: string[] = [];
      const sugestoes: string[] = [];
      
      // 1. Buscar todos os usuários para encontrar Erika
      console.log('[DIAGNÓSTICO_ERIKA] 1. Buscando professora Erika...');
      const usuariosResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!usuariosResponse.ok) {
        throw new Error(`Erro ao buscar usuários: ${usuariosResponse.status}`);
      }

      const usuariosData = await usuariosResponse.json();
      console.log('[DIAGNÓSTICO_ERIKA] Resposta dos usuários:', usuariosData);

      let usuarios = [];
      if (usuariosData.success && Array.isArray(usuariosData.usuarios)) {
        usuarios = usuariosData.usuarios;
      } else if (Array.isArray(usuariosData)) {
        usuarios = usuariosData;
      }

      // Procurar por Erika
      const erika = usuarios.find(u => 
        u.nome && u.nome.toLowerCase().includes('erika') && 
        u.nome.toLowerCase().includes('sousa') &&
        u.tipo === 'professor'
      );

      if (!erika) {
        problemas.push('Professora Erika de Sousa Monteiro não encontrada');
        sugestoes.push('Verificar se o usuário foi criado corretamente');
        setResultado({ problemas, sugestoes });
        return;
      }

      console.log('[DIAGNÓSTICO_ERIKA] Professora Erika encontrada:', erika);

      // 2. Analisar dados do professor
      console.log('[DIAGNÓSTICO_ERIKA] 2. Analisando dados da professora...');
      
      if (!erika.disciplinas || erika.disciplinas.length === 0) {
        problemas.push('Professora não tem disciplinas definidas no campo "disciplinas"');
        sugestoes.push('Definir disciplinas: ["Português"]');
      }

      if (!erika.series || erika.series.length === 0) {
        problemas.push('Professora não tem séries definidas no campo "series"');
        sugestoes.push('Definir séries específicas do ensino fundamental');
      } else {
        // Verificar se há séries do médio indevidamente
        const seriesMedio = erika.series.filter(s => 
          s.includes('1ª série') || s.includes('2ª série') || s.includes('3ª série') ||
          s.includes('1º ano') || s.includes('2º ano') || s.includes('3º ano')
        );
        
        if (seriesMedio.length > 0) {
          problemas.push(`Professora tem séries do médio indevidamente: ${seriesMedio.join(', ')}`);
          sugestoes.push('Remover séries do ensino médio do campo "series"');
        }
      }

      if (!erika.vinculacoesProfessor || !Array.isArray(erika.vinculacoesProfessor)) {
        problemas.push('Professora não tem vinculações específicas definidas');
        sugestoes.push('Definir vinculacoesProfessor com estrutura correta');
      } else {
        console.log('[DIAGNÓSTICO_ERIKA] Vinculações encontradas:', erika.vinculacoesProfessor);
        
        // Verificar se as vinculações estão corretas
        erika.vinculacoesProfessor.forEach((vinc, index) => {
          if (!vinc.disciplinaNome || vinc.disciplinaNome !== 'Português') {
            problemas.push(`Vinculação ${index + 1}: disciplina incorreta (${vinc.disciplinaNome || 'indefinida'})`);
          }
          
          if (!vinc.segmento || vinc.segmento !== 'fundamental') {
            problemas.push(`Vinculação ${index + 1}: segmento incorreto (${vinc.segmento || 'indefinido'})`);
          }
          
          if (!vinc.seriesSelecionadas || !Array.isArray(vinc.seriesSelecionadas)) {
            problemas.push(`Vinculação ${index + 1}: séries não definidas`);
          } else {
            const seriesIncorretas = vinc.seriesSelecionadas.filter(s => 
              !s.includes('Fundamental')
            );
            if (seriesIncorretas.length > 0) {
              problemas.push(`Vinculação ${index + 1}: séries incorretas: ${seriesIncorretas.join(', ')}`);
            }
          }
        });
      }

      // 3. Testar API de disciplinas
      console.log('[DIAGNÓSTICO_ERIKA] 3. Testando API de disciplinas...');
      let disciplinasApi = null;
      
      try {
        const disciplinasResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/professor/${erika.id}/disciplinas`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (disciplinasResponse.ok) {
          disciplinasApi = await disciplinasResponse.json();
          console.log('[DIAGNÓSTICO_ERIKA] Resposta da API disciplinas:', disciplinasApi);
          
          if (disciplinasApi.success && disciplinasApi.seriesComDisciplinas) {
            const series = disciplinasApi.seriesComDisciplinas;
            const seriesMedio = series.filter(s => 
              s.nome.includes('1ª série') || s.nome.includes('2ª série') || s.nome.includes('3ª série') ||
              s.nome.includes('1º ano') || s.nome.includes('2º ano') || s.nome.includes('3º ano')
            );
            
            if (seriesMedio.length > 0) {
              problemas.push(`API retorna ${seriesMedio.length} séries do médio incorretamente`);
              sugestoes.push('A lógica do backend está aplicando fallback incorreto');
            }
          }
        } else {
          problemas.push(`Erro na API de disciplinas: ${disciplinasResponse.status}`);
        }
      } catch (error) {
        problemas.push(`Erro ao chamar API de disciplinas: ${error.message}`);
      }

      setResultado({
        professor: erika,
        disciplinasApi,
        problemas,
        sugestoes,
        vinculacoesEspecificas: erika.vinculacoesProfessor
      });

    } catch (error) {
      console.error('[DIAGNÓSTICO_ERIKA] Erro:', error);
      setResultado({
        problemas: [`Erro durante diagnóstico: ${error.message}`],
        sugestoes: ['Verificar conectividade e tentar novamente']
      });
    } finally {
      setDiagnosticando(false);
    }
  };

  const corrigirVinculacao = async () => {
    if (!resultado?.professor) return;

    setCorrigindo(true);
    try {
      console.log('[DIAGNÓSTICO_ERIKA] Corrigindo vinculação da professora Erika...');

      // Dados corretos para Erika - apenas português do fundamental
      const dadosCorrigidos = {
        ...resultado.professor,
        disciplinas: ['Português'],
        series: [
          '5º ano - Ensino Fundamental',
          '6º ano - Ensino Fundamental',
          '7º ano - Ensino Fundamental',
          '8º ano - Ensino Fundamental',
          '9º ano - Ensino Fundamental'
        ],
        vinculacoesProfessor: [
          {
            id: '1',
            segmento: 'fundamental',
            disciplinaId: 'portugues',
            disciplinaNome: 'Português',
            seriesSelecionadas: [
              '5º ano - Ensino Fundamental',
              '6º ano - Ensino Fundamental',
              '7º ano - Ensino Fundamental',
              '8º ano - Ensino Fundamental',
              '9º ano - Ensino Fundamental'
            ]
          }
        ]
      };

      console.log('[DIAGNÓSTICO_ERIKA] Enviando dados corrigidos:', dadosCorrigidos);

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${resultado.professor.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosCorrigidos)
      });

      if (!response.ok) {
        throw new Error(`Erro ao atualizar: ${response.status} - ${await response.text()}`);
      }

      const resultado_atualizacao = await response.json();
      console.log('[DIAGNÓSTICO_ERIKA] Resultado da correção:', resultado_atualizacao);

      alert('✅ Vinculação da professora Erika corrigida com sucesso!\n\nAgora ela aparecerá apenas nas séries do ensino fundamental para Português.');
      
      // Executar diagnóstico novamente para verificar
      await executarDiagnostico();

    } catch (error) {
      console.error('[DIAGNÓSTICO_ERIKA] Erro ao corrigir:', error);
      alert(`❌ Erro ao corrigir vinculação: ${error.message}`);
    } finally {
      setCorrigindo(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={onVoltar}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🔍 Diagnóstico: Professora Erika</h1>
            <p className="text-gray-600">Investigação do problema de turmas do médio aparecendo incorretamente</p>
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-4 mb-6">
          <Button 
            onClick={executarDiagnostico}
            disabled={diagnosticando}
            className="flex items-center gap-2"
          >
            {diagnosticando ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Diagnosticando...
              </>
            ) : (
              <>
                <Settings className="w-4 h-4" />
                Executar Diagnóstico
              </>
            )}
          </Button>

          {resultado && resultado.problemas.length > 0 && (
            <Button 
              onClick={corrigirVinculacao}
              disabled={corrigindo || !resultado.professor}
              variant="destructive"
              className="flex items-center gap-2"
            >
              {corrigindo ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Corrigindo...
                </>
              ) : (
                <>
                  <Settings className="w-4 h-4" />
                  Corrigir Vinculação
                </>
              )}
            </Button>
          )}
        </div>

        {/* Resultados */}
        {resultado && (
          <div className="space-y-6">
            {/* Dados do Professor */}
            {resultado.professor && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Dados da Professora Encontrada
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p><strong>Nome:</strong> {resultado.professor.nome}</p>
                      <p><strong>ID:</strong> {resultado.professor.id}</p>
                      <p><strong>Email:</strong> {resultado.professor.email}</p>
                      <p><strong>Tipo:</strong> {resultado.professor.tipo}</p>
                    </div>
                    <div>
                      <p><strong>Disciplinas (campo direto):</strong></p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {resultado.professor.disciplinas?.map((disc, idx) => (
                          <Badge key={idx} variant="secondary">{disc}</Badge>
                        )) || <span className="text-gray-500">Nenhuma</span>}
                      </div>
                      
                      <p className="mt-3"><strong>Séries (campo direto):</strong></p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {resultado.professor.series?.map((serie, idx) => (
                          <Badge 
                            key={idx} 
                            variant={serie.includes('Médio') || serie.includes('série') ? "destructive" : "secondary"}
                          >
                            {serie}
                          </Badge>
                        )) || <span className="text-gray-500">Nenhuma</span>}
                      </div>
                    </div>
                  </div>

                  {/* Vinculações Específicas */}
                  {resultado.vinculacoesEspecificas && resultado.vinculacoesEspecificas.length > 0 && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold mb-2">✨ Vinculações Específicas (Nova Arquitetura):</h4>
                      {resultado.vinculacoesEspecificas.map((vinc, idx) => (
                        <div key={idx} className="mb-3 p-3 bg-white rounded border">
                          <div className="flex items-center gap-2 mb-2">
                            <BookOpen className="w-4 h-4" />
                            <span className="font-medium">{vinc.disciplinaNome}</span>
                            <Badge variant="outline">{vinc.segmento}</Badge>
                          </div>
                          <div className="text-sm text-gray-600">
                            <strong>Séries:</strong> {(vinc.seriesSelecionadas || []).join(', ') || 'Nenhuma'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Resposta da API */}
            {resultado.disciplinasApi && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Resposta da API de Disciplinas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p><strong>Status:</strong> {resultado.disciplinasApi.success ? '✅ Sucesso' : '❌ Erro'}</p>
                    
                    {resultado.disciplinasApi.seriesComDisciplinas && (
                      <div>
                        <p><strong>Séries retornadas pela API:</strong></p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                          {resultado.disciplinasApi.seriesComDisciplinas.map((serie, idx) => (
                            <div key={idx} className="p-2 bg-gray-100 rounded text-sm">
                              <span className={`font-medium ${
                                serie.nome.includes('série') || serie.nome.includes('Médio') 
                                  ? 'text-red-600' 
                                  : 'text-green-600'
                              }`}>
                                {serie.nome}
                              </span>
                              {serie.disciplinas && (
                                <div className="text-xs text-gray-600 mt-1">
                                  Disciplinas: {serie.disciplinas.join(', ')}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Problemas Encontrados */}
            {resultado.problemas.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="w-5 h-5" />
                    Problemas Encontrados ({resultado.problemas.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {resultado.problemas.map((problema, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-red-700">
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        {problema}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Sugestões */}
            {resultado.sugestoes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-600">
                    <CheckCircle className="w-5 h-5" />
                    Sugestões de Correção ({resultado.sugestoes.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {resultado.sugestoes.map((sugestao, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-blue-700">
                        <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        {sugestao}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Status */}
            {resultado.problemas.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-green-600 mb-2">
                    ✅ Tudo Correto!
                  </h3>
                  <p className="text-gray-600">
                    A professora Erika está configurada corretamente.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Instruções */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>💡 Como Usar Este Diagnóstico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              <p>1. <strong>Executar Diagnóstico:</strong> Clique para analisar os dados da professora Erika</p>
              <p>2. <strong>Verificar Problemas:</strong> O sistema identifica configurações incorretas</p>
              <p>3. <strong>Corrigir Automaticamente:</strong> Use o botão de correção se problemas forem encontrados</p>
              <p>4. <strong>Validar:</strong> Execute o diagnóstico novamente para confirmar a correção</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}