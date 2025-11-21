import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { CheckCircle, XCircle, User, Wrench } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export function CorrigirProfessorCiencias() {
  const [status, setStatus] = useState<string>('idle');
  const [resultado, setResultado] = useState<any>(null);

  const corrigirProfessor = async () => {
    setStatus('corrigindo');
    setResultado(null);

    try {
      console.log('[CORRIGIR_PROFESSOR] Iniciando correção do Professor Teste Ciências...');

      // 1. Buscar todos os usuários para encontrar o professor
      const usuariosResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/usuarios`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!usuariosResponse.ok) {
        throw new Error(`Erro ao buscar usuários: ${usuariosResponse.status}`);
      }

      const usuariosData = await usuariosResponse.json();
      console.log('[CORRIGIR_PROFESSOR] Usuários encontrados:', usuariosData.usuarios?.length || 0);

      // 2. Encontrar o Professor Teste Ciências
      const professores = usuariosData.usuarios?.filter(u => 
        u.tipo === 'professor' && 
        (u.nome?.toLowerCase().includes('ciências') || 
         u.nome?.toLowerCase().includes('teste') ||
         u.especialidade?.toLowerCase().includes('ciências'))
      ) || [];

      console.log('[CORRIGIR_PROFESSOR] Professores de Ciências encontrados:', professores);

      if (professores.length === 0) {
        // Criar o professor se não existir
        console.log('[CORRIGIR_PROFESSOR] Professor não encontrado, criando...');
        
        const novoProfessor = {
          nome: 'Professor Teste Ciências',
          nomeUsuario: 'prof_ciencias',
          email: 'prof.ciencias@conexaoead.com.br',
          senha: 'ciencias123',
          tipo: 'professor',
          disciplinas: ['Ciências'],
          series: ['5º ano', '6º ano', '7º ano', '8º ano', '9º ano'],
          especialidade: 'Ciências',
          ativo: true
        };

        const criarResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/register`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(novoProfessor)
          }
        );

        if (criarResponse.ok) {
          const novoUsuario = await criarResponse.json();
          setResultado({
            acao: 'criado',
            professor: novoUsuario.usuario,
            message: 'Professor Teste Ciências criado com sucesso!'
          });
          setStatus('sucesso');
          return;
        } else {
          throw new Error(`Erro ao criar professor: ${criarResponse.status}`);
        }
      }

      // 3. Corrigir o professor existente
      const professor = professores[0];
      console.log('[CORRIGIR_PROFESSOR] Corrigindo professor:', professor.id);

      const dadosCorrigidos = {
        nome: professor.nome || 'Professor Teste Ciências',
        tipo: 'professor',
        disciplinas: ['Ciências'],
        series: ['5º ano', '6º ano', '7º ano', '8º ano', '9º ano'],
        especialidade: 'Ciências',
        ativo: true
      };

      const corrigirResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${professor.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(dadosCorrigidos)
        }
      );

      if (corrigirResponse.ok) {
        const resultado = await corrigirResponse.json();
        setResultado({
          acao: 'corrigido',
          professor: resultado.usuario,
          message: 'Professor Teste Ciências corrigido com sucesso!'
        });
        setStatus('sucesso');
      } else {
        const erro = await corrigirResponse.text();
        throw new Error(`Erro ao corrigir professor: ${erro}`);
      }

    } catch (error) {
      console.error('[CORRIGIR_PROFESSOR] Erro:', error);
      setResultado({
        acao: 'erro',
        message: error.message
      });
      setStatus('erro');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-6 h-6" />
              Corrigir Professor Teste Ciências
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-600">
                Este componente irá encontrar e corrigir a configuração do Professor Teste Ciências,
                garantindo que ele tenha as disciplinas e séries corretas configuradas.
              </p>

              <Button 
                onClick={corrigirProfessor}
                disabled={status === 'corrigindo'}
                className="flex items-center gap-2 w-full"
              >
                <Wrench className={`w-4 h-4 ${status === 'corrigindo' ? 'animate-spin' : ''}`} />
                {status === 'corrigindo' ? 'Corrigindo...' : 'Corrigir Professor'}
              </Button>

              {resultado && (
                <Card className={`mt-4 ${
                  status === 'sucesso' ? 'border-green-200 bg-green-50' : 
                  status === 'erro' ? 'border-red-200 bg-red-50' : 'border-gray-200'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      {status === 'sucesso' ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <h3 className="font-semibold">Resultado</h3>
                      <Badge variant="outline">
                        {resultado.acao}
                      </Badge>
                    </div>
                    
                    <p className={`text-sm mb-3 ${
                      status === 'sucesso' ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {resultado.message}
                    </p>

                    {resultado.professor && (
                      <div className="bg-white/50 p-3 rounded-lg text-xs space-y-1">
                        <p><strong>ID:</strong> {resultado.professor.id}</p>
                        <p><strong>Nome:</strong> {resultado.professor.nome}</p>
                        <p><strong>Email:</strong> {resultado.professor.email}</p>
                        <p><strong>Tipo:</strong> {resultado.professor.tipo}</p>
                        <p><strong>Disciplinas:</strong> {JSON.stringify(resultado.professor.disciplinas)}</p>
                        <p><strong>Séries:</strong> {JSON.stringify(resultado.professor.series)}</p>
                        <p><strong>Especialidade:</strong> {resultado.professor.especialidade}</p>
                        <p><strong>Ativo:</strong> {resultado.professor.ativo ? 'Sim' : 'Não'}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {status === 'sucesso' && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">Próximos Passos:</h3>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Faça logout e login novamente com as credenciais do professor</li>
                    <li>• O dashboard do professor deve agora mostrar as turmas e disciplinas</li>
                    <li>• As disciplinas de Ciências estarão disponíveis para todas as séries</li>
                    <li>• O professor poderá acessar todas as funcionalidades</li>
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}