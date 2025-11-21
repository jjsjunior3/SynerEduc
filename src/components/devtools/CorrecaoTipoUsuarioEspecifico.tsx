import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Usuario {
  id: string;
  email: string;
  nome?: string;
  tipo: string;
  serie?: string;
  escola?: string;
  created_at?: string;
  updated_at?: string;
}

interface CorrecaoTipoUsuarioEspecificoProps {
  onFechar?: () => void;
  emailAlvo?: string;
}

export function CorrecaoTipoUsuarioEspecifico({ 
  onFechar, 
  emailAlvo = "jrsantosdev1@gmail.com" 
}: CorrecaoTipoUsuarioEspecificoProps) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [novoTipo, setNovoTipo] = useState('administrador');
  const [novaSerie, setNovaSerie] = useState('');
  const [corrigindo, setCorrigindo] = useState(false);

  const tiposUsuario = [
    { value: 'aluno', label: 'Aluno' },
    { value: 'professor', label: 'Professor' },
    { value: 'coordenador', label: 'Coordenador' },
    { value: 'administrador', label: 'Administrador' },
    { value: 'professor_conteudista', label: 'Professor Conteudista' }
  ];

  const series = [
    '5_ano', '6_ano', '7_ano', '8_ano', '9_ano',
    '1_serie', '2_serie', '3_serie'
  ];

  useEffect(() => {
    buscarUsuario();
  }, []);

  const buscarUsuario = async () => {
    setLoading(true);
    setErro(null);
    
    try {
      console.log('🔍 Buscando usuário:', emailAlvo);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/usuarios/email/${encodeURIComponent(emailAlvo)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro na busca:', errorText);
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('📊 Dados do usuário encontrado:', data);
      
      setUsuario(data);
      setNovoTipo(data.tipo || 'administrador');
      setNovaSerie(data.serie || '');
      
    } catch (error) {
      console.error('❌ Erro ao buscar usuário:', error);
      setErro(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const corrigirTipoUsuario = async () => {
    if (!usuario) return;
    
    setCorrigindo(true);
    setErro(null);
    
    try {
      console.log('🔧 Corrigindo tipo de usuário:', {
        email: usuario.email,
        tipoAtual: usuario.tipo,
        novoTipo,
        novaSerie
      });

      const dadosAtualizacao = {
        tipo: novoTipo,
        ...(novoTipo === 'aluno' && novaSerie ? { serie: novaSerie } : {})
      };

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/usuarios/${usuario.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(dadosAtualizacao)
        }
      );

      console.log('📡 Response status (update):', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro na atualização:', errorText);
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }

      const usuarioAtualizado = await response.json();
      console.log('✅ Usuário atualizado:', usuarioAtualizado);
      
      setUsuario(usuarioAtualizado);
      
      toast.success('✅ Tipo de usuário corrigido com sucesso!', {
        description: `${usuario.email} agora é ${novoTipo}`
      });

      // Aguardar um pouco e recarregar a página para aplicar as mudanças
      setTimeout(() => {
        console.log('🔄 Recarregando página para aplicar mudanças...');
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('❌ Erro ao corrigir tipo de usuário:', error);
      setErro(error instanceof Error ? error.message : 'Erro desconhecido');
      toast.error('❌ Erro ao corrigir tipo de usuário');
    } finally {
      setCorrigindo(false);
    }
  };

  const getTipoLabel = (tipo: string) => {
    const found = tiposUsuario.find(t => t.value === tipo);
    return found ? found.label : tipo;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-orange-900 mb-2">
            🔧 Correção de Tipo de Usuário
          </h1>
          <p className="text-orange-700">
            Diagnóstico e correção específica para: <strong>{emailAlvo}</strong>
          </p>
        </div>

        <div className="grid gap-6">
          {/* Card de Status */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              📊 Status Atual
            </h2>
            
            {loading && (
              <div className="flex items-center gap-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                Carregando dados do usuário...
              </div>
            )}

            {erro && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">
                  <strong>Erro:</strong> {erro}
                </AlertDescription>
              </Alert>
            )}

            {usuario && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">Email:</label>
                    <p className="text-gray-900 bg-gray-100 p-2 rounded">{usuario.email}</p>
                  </div>
                  
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">Nome:</label>
                    <p className="text-gray-900 bg-gray-100 p-2 rounded">{usuario.nome || 'Não informado'}</p>
                  </div>
                  
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">Tipo Atual:</label>
                    <Badge 
                      variant={usuario.tipo === 'administrador' ? 'default' : 'destructive'}
                      className="text-sm"
                    >
                      {getTipoLabel(usuario.tipo)}
                    </Badge>
                  </div>
                  
                  {usuario.serie && (
                    <div>
                      <label className="block font-medium text-gray-700 mb-1">Série:</label>
                      <p className="text-gray-900 bg-gray-100 p-2 rounded">{usuario.serie}</p>
                    </div>
                  )}
                </div>

                {usuario.tipo !== 'administrador' && (
                  <Alert className="border-yellow-200 bg-yellow-50">
                    <AlertDescription className="text-yellow-800">
                      ⚠️ <strong>Problema Identificado:</strong> Este usuário deveria ser administrador, 
                      mas está registrado como "{getTipoLabel(usuario.tipo)}". Isso explica por que 
                      está vendo o painel de aluno.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </Card>

          {/* Card de Correção */}
          {usuario && usuario.tipo !== 'administrador' && (
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                🔧 Correção
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">
                    Novo Tipo de Usuário:
                  </label>
                  <Select value={novoTipo} onValueChange={setNovoTipo}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposUsuario.map(tipo => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {novoTipo === 'aluno' && (
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">
                      Série (para alunos):
                    </label>
                    <Select value={novaSerie} onValueChange={setNovaSerie}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma série" />
                      </SelectTrigger>
                      <SelectContent>
                        {series.map(serie => (
                          <SelectItem key={serie} value={serie}>
                            {serie.replace('_', ' ').toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button 
                  onClick={corrigirTipoUsuario}
                  disabled={corrigindo}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {corrigindo ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Corrigindo...
                    </>
                  ) : (
                    '✅ Corrigir Tipo de Usuário'
                  )}
                </Button>
              </div>
            </Card>
          )}

          {usuario && usuario.tipo === 'administrador' && (
            <Card className="p-6">
              <div className="text-center">
                <div className="text-6xl mb-4">✅</div>
                <h2 className="text-xl font-bold text-green-600 mb-2">
                  Usuário Configurado Corretamente!
                </h2>
                <p className="text-gray-600 mb-4">
                  O usuário {usuario.email} já está configurado como administrador.
                  Se ainda está vendo o painel de aluno, tente fazer logout e login novamente.
                </p>
                <Button 
                  onClick={() => window.location.reload()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  🔄 Recarregar Aplicação
                </Button>
              </div>
            </Card>
          )}
        </div>

        <div className="mt-6 flex gap-4 justify-center">
          <Button 
            onClick={buscarUsuario}
            variant="outline"
            disabled={loading}
          >
            🔄 Atualizar
          </Button>
          
          {onFechar && (
            <Button onClick={onFechar} variant="outline">
              ← Voltar
            </Button>
          )}
          
          <Button 
            onClick={() => window.location.href = '/'}
            variant="outline"
          >
            🏠 Ir para Home
          </Button>
        </div>
      </div>
    </div>
  );
}