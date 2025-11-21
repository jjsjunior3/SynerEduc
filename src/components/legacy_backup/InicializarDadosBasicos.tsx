import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { CheckCircle, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface InicializarDadosBasicosProps {
  onVoltar: () => void;
}

export function InicializarDadosBasicos({ onVoltar }: InicializarDadosBasicosProps) {
  const [inicializando, setInicializando] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [etapas, setEtapas] = useState({
    disciplinas: false,
    series: false
  });

  const disciplinasBasicas = [
    { nome: 'Matemática', descricao: 'Álgebra, Geometria e Cálculo', cargaHoraria: 5 },
    { nome: 'Português', descricao: 'Gramática, Literatura e Redação', cargaHoraria: 4 },
    { nome: 'História', descricao: 'História do Brasil e Geral', cargaHoraria: 3 },
    { nome: 'Geografia', descricao: 'Geografia Física e Humana', cargaHoraria: 3 },
    { nome: 'Ciências', descricao: 'Ciências Naturais e Biológicas', cargaHoraria: 3 },
    { nome: 'Biologia', descricao: 'Biologia Geral e Molecular', cargaHoraria: 3 },
    { nome: 'Física', descricao: 'Mecânica, Termodinâmica e Eletromagnetismo', cargaHoraria: 3 },
    { nome: 'Química', descricao: 'Química Geral, Orgânica e Inorgânica', cargaHoraria: 3 },
    { nome: 'Inglês', descricao: 'Língua Inglesa - Conversação e Gramática', cargaHoraria: 2 },
    { nome: 'Educação Física', descricao: 'Atividades Físicas e Esporteiras', cargaHoraria: 2 },
    { nome: 'Arte', descricao: 'Artes Visuais, Música e Teatro', cargaHoraria: 2 },
    { nome: 'Filosofia', descricao: 'Filosofia Geral e Ética', cargaHoraria: 2 },
    { nome: 'Sociologia', descricao: 'Sociologia Geral e Contemporânea', cargaHoraria: 2 }
  ];

  const seriesBasicas = [
    {
      nome: '5º ano - Ensino Fundamental',
      turmas: ['A', 'B'],
      disciplinas: ['Matemática', 'Português', 'História', 'Geografia', 'Ciências', 'Inglês', 'Educação Física', 'Arte']
    },
    {
      nome: '6º ano - Ensino Fundamental',
      turmas: ['A', 'B'],
      disciplinas: ['Matemática', 'Português', 'História', 'Geografia', 'Ciências', 'Inglês', 'Educação Física', 'Arte']
    },
    {
      nome: '7º ano - Ensino Fundamental',
      turmas: ['A', 'B'],
      disciplinas: ['Matemática', 'Português', 'História', 'Geografia', 'Ciências', 'Inglês', 'Educação Física', 'Arte']
    },
    {
      nome: '8º ano - Ensino Fundamental',
      turmas: ['A', 'B'],
      disciplinas: ['Matemática', 'Português', 'História', 'Geografia', 'Ciências', 'Inglês', 'Educação Física', 'Arte']
    },
    {
      nome: '9º ano - Ensino Fundamental',
      turmas: ['A', 'B'],
      disciplinas: ['Matemática', 'Português', 'História', 'Geografia', 'Ciências', 'Inglês', 'Educação Física', 'Arte']
    },
    {
      nome: '1ª série - Ensino Médio',
      turmas: ['A', 'B'],
      disciplinas: ['Matemática', 'Português', 'História', 'Geografia', 'Biologia', 'Física', 'Química', 'Inglês', 'Educação Física', 'Arte', 'Filosofia', 'Sociologia']
    },
    {
      nome: '2ª série - Ensino Médio',
      turmas: ['A', 'B'],
      disciplinas: ['Matemática', 'Português', 'História', 'Geografia', 'Biologia', 'Física', 'Química', 'Inglês', 'Educação Física', 'Arte', 'Filosofia', 'Sociologia']
    },
    {
      nome: '3ª série - Ensino Médio',
      turmas: ['A', 'B'],
      disciplinas: ['Matemática', 'Português', 'História', 'Geografia', 'Biologia', 'Física', 'Química', 'Inglês', 'Educação Física', 'Arte', 'Filosofia', 'Sociologia']
    }
  ];

  const criarDisciplinas = async () => {
    try {
      console.log('[INICIALIZAR] Criando disciplinas básicas...');
      
      for (const disciplina of disciplinasBasicas) {
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/disciplinas`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...disciplina,
            series: [], // Será preenchido depois
            ativa: true
          })
        });
        
        if (!response.ok) {
          console.warn('[INICIALIZAR] Disciplina pode já existir:', disciplina.nome);
        } else {
          console.log('[INICIALIZAR] Disciplina criada:', disciplina.nome);
        }
      }
      
      setEtapas(prev => ({ ...prev, disciplinas: true }));
      
    } catch (error) {
      console.error('[INICIALIZAR] Erro ao criar disciplinas:', error);
      throw error;
    }
  };

  const criarSeries = async () => {
    try {
      console.log('[INICIALIZAR] Criando séries básicas...');
      
      for (const serie of seriesBasicas) {
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/series`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...serie,
            totalAlunos: 0,
            ativa: true
          })
        });
        
        if (!response.ok) {
          console.warn('[INICIALIZAR] Série pode já existir:', serie.nome);
        } else {
          console.log('[INICIALIZAR] Série criada:', serie.nome);
        }
      }
      
      setEtapas(prev => ({ ...prev, series: true }));
      
    } catch (error) {
      console.error('[INICIALIZAR] Erro ao criar séries:', error);
      throw error;
    }
  };

  const inicializar = async () => {
    setInicializando(true);
    
    try {
      await criarDisciplinas();
      await criarSeries();
      
      setConcluido(true);
      toast.success('Dados básicos inicializados com sucesso!');
      
    } catch (error) {
      console.error('[INICIALIZAR] Erro na inicialização:', error);
      toast.error(`Erro na inicialização: ${error.message}`);
    } finally {
      setInicializando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Inicializar Dados Básicos do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-gray-700">
              <p className="mb-4">
                Esta ferramenta criará os dados básicos necessários para o funcionamento completo do sistema:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-6">
                <li><strong>Disciplinas:</strong> {disciplinasBasicas.length} disciplinas padrão (Matemática, Português, etc.)</li>
                <li><strong>Séries:</strong> {seriesBasicas.length} séries escolares (5º ano até 3ª série do Ensino Médio)</li>
              </ul>
            </div>

            {concluido ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Inicialização concluída com sucesso!</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Disciplinas criadas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Séries criadas</span>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600">
                  Agora você pode acessar a "Gestão Escolar" para gerenciar disciplinas, professores e séries.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {inicializando && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {etapas.disciplinas ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                      )}
                      <span className="text-sm">Criando disciplinas...</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {etapas.series ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : etapas.disciplinas ? (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-gray-300" />
                      )}
                      <span className="text-sm">Criando séries...</span>
                    </div>
                  </div>
                )}
                
                <Button 
                  onClick={inicializar} 
                  disabled={inicializando}
                  className="w-full"
                >
                  {inicializando ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Inicializando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Inicializar Dados Básicos
                    </>
                  )}
                </Button>
              </div>
            )}

            <div className="pt-4 border-t">
              <Button variant="outline" onClick={onVoltar} className="w-full">
                Voltar ao Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}