import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowLeft, Users, CheckCircle, Loader2, Key } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface CriarUsuariosTesteProps {
  onVoltar: () => void;
}

export function CriarUsuariosTeste({ onVoltar }: CriarUsuariosTesteProps) {
  const [criando, setCriando] = useState(false);
  const [usuarios, setUsuarios] = useState([
    { email: 'aluno@escola.com', senha: '123456', tipo: 'aluno', nome: 'Maria Silva' },
    { email: 'professor@escola.com', senha: '123456', tipo: 'professor', nome: 'João Santos' },
    { email: 'coordenador@escola.com', senha: '123456', tipo: 'coordenador', nome: 'Ana Costa' },
    { email: 'admin@escola.com', senha: '123456', tipo: 'administrador', nome: 'Carlos Admin' },
    { email: 'conteudista@escola.com', senha: '123456', tipo: 'professor_conteudista', nome: 'Laura Conteudista' }
  ]);

  const criarUsuariosTeste = async () => {
    setCriando(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/auth/criar-usuarios-teste`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar usuários de teste');
      }

      const data = await response.json();
      
      if (data.success) {
        toast.success('Usuários de teste criados com sucesso!');
        toast.info('Agora você pode fazer login com qualquer um dos usuários listados.');
      } else {
        throw new Error('Erro desconhecido');
      }
    } catch (error) {
      console.error('Erro ao criar usuários de teste:', error);
      toast.error(`Erro ao criar usuários: ${error.message}`);
    } finally {
      setCriando(false);
    }
  };

  const getTipoCor = (tipo: string) => {
    switch (tipo) {
      case 'aluno':
        return 'bg-blue-100 text-blue-800';
      case 'professor':
        return 'bg-green-100 text-green-800';
      case 'coordenador':
        return 'bg-orange-100 text-orange-800';
      case 'administrador':
        return 'bg-red-100 text-red-800';
      case 'professor_conteudista':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onVoltar}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div>
            <h1 className="font-semibold text-gray-900">Criar Usuários de Teste</h1>
            <p className="text-sm text-gray-600">Criar usuários padrão para testar o sistema</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Informações */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Usuários de Teste Disponíveis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Clique no botão abaixo para criar automaticamente usuários de teste no sistema. 
                Estes usuários permitirão que você teste todas as funcionalidades da aplicação.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {usuarios.map((user, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900">{user.nome}</h3>
                      <Badge className={getTipoCor(user.tipo)}>
                        {user.tipo}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Email:</span>
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {user.email}
                        </code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Senha:</span>
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {user.senha}
                        </code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-center">
                <Button 
                  onClick={criarUsuariosTeste} 
                  disabled={criando}
                  size="lg"
                  className="px-8"
                >
                  {criando ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Criando usuários...
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4 mr-2" />
                      Criar Usuários de Teste
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Instruções */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Como Usar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Criar os usuários</h4>
                    <p className="text-sm text-gray-600">
                      Clique no botão "Criar Usuários de Teste" para adicionar os usuários ao sistema.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Voltar para o login</h4>
                    <p className="text-sm text-gray-600">
                      Após criar os usuários, volte para a tela de login usando o botão "Voltar".
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Fazer login</h4>
                    <p className="text-sm text-gray-600">
                      Use qualquer uma das combinações email/senha listadas acima para entrar no sistema.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Testar funcionalidades</h4>
                    <p className="text-sm text-gray-600">
                      Cada tipo de usuário tem acesso a diferentes funcionalidades. Teste todos para ver as diferenças!
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}