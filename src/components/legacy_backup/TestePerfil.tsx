import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ArrowLeft, User, Save, TestTube } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

interface TestePerfilProps {
  onVoltar: () => void;
}

export function TestePerfil({ onVoltar }: TestePerfilProps) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  const [testando, setTestando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const { usuario } = useAuth();

  const executarTestePerfil = async () => {
    if (!usuario?.id) {
      toast.error('Usuário não autenticado');
      return;
    }

    setTestando(true);
    setResultado(null);

    try {
      const dadosTeste = {
        nome: nome || 'Teste Nome Atualizado',
        email: email || usuario.email,
        avatar: avatar || 'https://example.com/avatar.jpg'
      };

      console.log('Enviando dados do perfil:', dadosTeste);

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/usuarios/${usuario.id}/perfil`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosTeste)
      });

      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Response text:', responseText);

      if (response.ok) {
        const data = JSON.parse(responseText);
        setResultado(`✅ Sucesso: ${data.message}`);
        toast.success('Perfil atualizado com sucesso!');
      } else {
        try {
          const errorData = JSON.parse(responseText);
          setResultado(`❌ Erro: ${errorData.error}`);
          toast.error(`Erro: ${errorData.error}`);
        } catch {
          setResultado(`❌ Erro HTTP ${response.status}: ${responseText}`);
          toast.error(`Erro HTTP ${response.status}`);
        }
      }
    } catch (error) {
      console.error('Erro no teste:', error);
      setResultado(`❌ Erro de rede: ${error.message}`);
      toast.error('Erro de rede');
    } finally {
      setTestando(false);
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
            <h1 className="font-semibold text-gray-900">Teste de Atualização de Perfil</h1>
            <p className="text-sm text-gray-600">Testar a correção do erro de updated_at</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Informações do Usuário Atual */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Usuário Atual
              </CardTitle>
            </CardHeader>
            <CardContent>
              {usuario ? (
                <div className="space-y-2">
                  <p><strong>ID:</strong> {usuario.id}</p>
                  <p><strong>Nome:</strong> {usuario.nome}</p>
                  <p><strong>Email:</strong> {usuario.email}</p>
                  <p><strong>Tipo:</strong> {usuario.tipo}</p>
                </div>
              ) : (
                <p className="text-red-600">Usuário não autenticado</p>
              )}
            </CardContent>
          </Card>

          {/* Formulário de Teste */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="w-5 h-5" />
                Dados para Teste
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome (deixe vazio para usar padrão)</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Teste Nome Atualizado"
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email (deixe vazio para manter atual)</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={usuario?.email || 'email@exemplo.com'}
                />
              </div>
              
              <div>
                <Label htmlFor="avatar">Avatar URL (deixe vazio para usar padrão)</Label>
                <Input
                  id="avatar"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>

              <Button 
                onClick={executarTestePerfil} 
                disabled={testando || !usuario}
                className="w-full"
              >
                {testando ? (
                  <>
                    <TestTube className="w-4 h-4 mr-2 animate-spin" />
                    Testando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Executar Teste de Atualização
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Resultado */}
          {resultado && (
            <Card>
              <CardHeader>
                <CardTitle>Resultado do Teste</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <pre className="text-sm whitespace-pre-wrap">{resultado}</pre>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instruções */}
          <Card>
            <CardHeader>
              <CardTitle>Como Usar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600">
                <p>1. Faça login na aplicação primeiro</p>
                <p>2. Preencha os campos de teste (ou deixe vazios para usar valores padrão)</p>
                <p>3. Clique em "Executar Teste de Atualização"</p>
                <p>4. Verifique se o erro "updated_at" foi corrigido</p>
                <p>5. Se funcionou, você verá "✅ Sucesso" no resultado</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}