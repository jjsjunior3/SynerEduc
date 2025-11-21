import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { ArrowLeft, User, TestTube, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface TesteAtualizacaoUsuariosProps {
  onVoltar: () => void;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo: string;
  ativo: boolean;
}

export function TesteAtualizacaoUsuarios({ onVoltar }: TesteAtualizacaoUsuariosProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuarioTeste, setUsuarioTeste] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [testando, setTestando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [novoNome, setNovoNome] = useState('');

  const carregarUsuarios = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setUsuarios(data.usuarios || []);
      
      // Selecionar primeiro usuário para teste
      if (data.usuarios && data.usuarios.length > 0) {
        setUsuarioTeste(data.usuarios[0]);
        setNovoNome(data.usuarios[0].nome + ' (Teste)');
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setCarregando(false);
    }
  };

  const testarAtualizacao = async () => {
    if (!usuarioTeste || !novoNome.trim()) return;

    setTestando(true);
    setResultado(null);

    try {
      console.log('🧪 Iniciando teste de atualização...');
      console.log('Usuario ID:', usuarioTeste.id);
      console.log('Novo nome:', novoNome);

      const dadosAtualizacao = {
        nome: novoNome,
        email: usuarioTeste.email,
        tipo: usuarioTeste.tipo,
        ativo: usuarioTeste.ativo
      };

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${usuarioTeste.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosAtualizacao)
      });

      const data = await response.json();
      
      console.log('📡 Resposta do servidor:', data);
      console.log('📡 Status:', response.status);

      setResultado({
        sucesso: response.ok,
        status: response.status,
        dados: data,
        timestamp: new Date().toISOString()
      });

      if (response.ok) {
        toast.success('✅ Teste de atualização passou!');
        await carregarUsuarios(); // Recarregar lista
      } else {
        toast.error('❌ Teste de atualização falhou');
      }

    } catch (error) {
      console.error('🚨 Erro no teste:', error);
      setResultado({
        sucesso: false,
        erro: error.message,
        timestamp: new Date().toISOString()
      });
      toast.error('Erro no teste de atualização');
    } finally {
      setTestando(false);
    }
  };

  useEffect(() => {
    carregarUsuarios();
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
              <h1 className="text-xl font-bold text-gray-900">🧪 Teste de Atualização de Usuários</h1>
              <p className="text-sm text-gray-600">Diagnóstico do erro "Erro na atualização do usuário"</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="w-5 h-5 text-blue-600" />
              Status do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${carregando ? 'text-gray-400' : usuarios.length > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {carregando ? '...' : usuarios.length}
                </div>
                <div className="text-sm text-gray-600">Usuários Carregados</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${usuarioTeste ? 'text-green-600' : 'text-gray-400'}`}>
                  {usuarioTeste ? '✓' : '✗'}
                </div>
                <div className="text-sm text-gray-600">Usuário de Teste</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${resultado ? (resultado.sucesso ? 'text-green-600' : 'text-red-600') : 'text-gray-400'}`}>
                  {resultado ? (resultado.sucesso ? '✓' : '✗') : '?'}
                </div>
                <div className="text-sm text-gray-600">Teste Atualização</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usuário de Teste */}
        {usuarioTeste && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-purple-600" />
                Usuário de Teste Selecionado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label className="font-medium">ID</Label>
                  <div className="font-mono text-sm bg-gray-100 p-2 rounded">{usuarioTeste.id}</div>
                </div>
                <div>
                  <Label className="font-medium">Nome Atual</Label>
                  <div className="text-sm bg-gray-100 p-2 rounded">{usuarioTeste.nome}</div>
                </div>
                <div>
                  <Label className="font-medium">Email</Label>
                  <div className="text-sm bg-gray-100 p-2 rounded">{usuarioTeste.email}</div>
                </div>
                <div>
                  <Label className="font-medium">Tipo</Label>
                  <Badge variant="outline">{usuarioTeste.tipo}</Badge>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="novoNome">Novo Nome (para teste)</Label>
                  <Input
                    id="novoNome"
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    placeholder="Digite um novo nome para testar"
                  />
                </div>
                
                <Button 
                  onClick={testarAtualizacao}
                  disabled={testando || !novoNome.trim()}
                  className="w-full"
                >
                  {testando ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Testando Atualização...
                    </>
                  ) : (
                    <>
                      <TestTube className="w-4 h-4 mr-2" />
                      Testar Atualização
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resultado do Teste */}
        {resultado && (
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${resultado.sucesso ? 'text-green-600' : 'text-red-600'}`}>
                {resultado.sucesso ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                Resultado do Teste
              </CardTitle>
            </CardHeader>
            <CardContent>
              {resultado.sucesso ? (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="w-4 h-4" />
                  <AlertDescription>
                    <strong>✅ Teste Passou!</strong> A atualização foi realizada com sucesso.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    <strong>❌ Teste Falhou!</strong> 
                    {resultado.dados?.error && (
                      <div className="mt-2">
                        <strong>Erro:</strong> {resultado.dados.error}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="mt-4 space-y-3">
                <div>
                  <Label className="font-medium">Status HTTP</Label>
                  <div className={`font-mono text-sm p-2 rounded ${resultado.sucesso ? 'bg-green-100' : 'bg-red-100'}`}>
                    {resultado.status}
                  </div>
                </div>
                
                <div>
                  <Label className="font-medium">Resposta Completa</Label>
                  <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-64">
                    {JSON.stringify(resultado.dados, null, 2)}
                  </pre>
                </div>
                
                <div>
                  <Label className="font-medium">Timestamp</Label>
                  <div className="text-sm text-gray-600">{resultado.timestamp}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de Usuários */}
        <Card>
          <CardHeader>
            <CardTitle>Usuários Disponíveis ({usuarios.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {usuarios.map((usuario) => (
                <div 
                  key={usuario.id} 
                  className={`flex items-center justify-between p-3 border rounded cursor-pointer hover:bg-gray-50 ${usuarioTeste?.id === usuario.id ? 'border-blue-500 bg-blue-50' : ''}`}
                  onClick={() => {
                    setUsuarioTeste(usuario);
                    setNovoNome(usuario.nome + ' (Teste)');
                    setResultado(null);
                  }}
                >
                  <div>
                    <div className="font-medium">{usuario.nome}</div>
                    <div className="text-sm text-gray-600">{usuario.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{usuario.tipo}</Badge>
                    {usuarioTeste?.id === usuario.id && (
                      <Badge className="bg-blue-600">Selecionado</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}