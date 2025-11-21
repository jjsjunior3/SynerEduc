import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { 
  ArrowLeft, 
  User, 
  RefreshCcw,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface MigracaoNomeUsuarioProps {
  onVoltar: () => void;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
  nomeUsuario?: string;
  tipo: string;
}

export function MigracaoNomeUsuario({ onVoltar }: MigracaoNomeUsuarioProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [resultados, setResultados] = useState<any[]>([]);

  const carregarUsuarios = async () => {
    setLoading(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setUsuarios(data.usuarios || []);
      
      const semNomeUsuario = data.usuarios.filter((u: Usuario) => !u.nomeUsuario).length;
      toast.success(`${data.usuarios.length} usuários carregados. ${semNomeUsuario} precisam de nome de usuário.`);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const gerarNomeUsuario = (nome: string, email: string, existentes: string[]): string => {
    // Primeiro, tentar baseado no nome
    let nomeUsuario = nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
      .split(' ')
      .filter(part => part.length > 0)
      .slice(0, 2) // Pegar apenas os 2 primeiros nomes
      .join('.');

    // Se já existe, tentar variações
    if (existentes.includes(nomeUsuario)) {
      for (let i = 1; i <= 99; i++) {
        const variacao = `${nomeUsuario}${i}`;
        if (!existentes.includes(variacao)) {
          return variacao;
        }
      }
    }

    // Se ainda não conseguiu, usar parte do email
    if (existentes.includes(nomeUsuario)) {
      const parteEmail = email.split('@')[0];
      nomeUsuario = parteEmail.replace(/[^a-z0-9.]/g, '');
      
      if (existentes.includes(nomeUsuario)) {
        for (let i = 1; i <= 99; i++) {
          const variacao = `${nomeUsuario}${i}`;
          if (!existentes.includes(variacao)) {
            return variacao;
          }
        }
      }
    }

    return nomeUsuario;
  };

  const executarMigracao = async () => {
    setMigrating(true);
    setResultados([]);
    
    try {
      const usuariosSemNome = usuarios.filter(u => !u.nomeUsuario);
      const nomesExistentes = usuarios
        .filter(u => u.nomeUsuario)
        .map(u => u.nomeUsuario!);

      console.log(`Migrando ${usuariosSemNome.length} usuários...`);
      
      const resultadosMigracao = [];

      for (const usuario of usuariosSemNome) {
        try {
          const nomeUsuarioGerado = gerarNomeUsuario(
            usuario.nome, 
            usuario.email, 
            nomesExistentes
          );

          // Adicionar à lista para evitar duplicatas
          nomesExistentes.push(nomeUsuarioGerado);

          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios/${usuario.id}`, 
            {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                nomeUsuario: nomeUsuarioGerado
              })
            }
          );

          if (response.ok) {
            resultadosMigracao.push({
              id: usuario.id,
              nome: usuario.nome,
              email: usuario.email,
              nomeUsuario: nomeUsuarioGerado,
              status: 'sucesso'
            });
          } else {
            const error = await response.text();
            resultadosMigracao.push({
              id: usuario.id,
              nome: usuario.nome,
              email: usuario.email,
              status: 'erro',
              erro: error
            });
          }
        } catch (error) {
          resultadosMigracao.push({
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            status: 'erro',
            erro: error.message
          });
        }
      }

      setResultados(resultadosMigracao);
      
      const sucessos = resultadosMigracao.filter(r => r.status === 'sucesso').length;
      const erros = resultadosMigracao.filter(r => r.status === 'erro').length;
      
      toast.success(`Migração concluída: ${sucessos} sucessos, ${erros} erros`);
      
      // Recarregar usuários
      await carregarUsuarios();
      
    } catch (error) {
      console.error('Erro na migração:', error);
      toast.error('Erro durante a migração');
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onVoltar}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Migração - Nomes de Usuário</h1>
            <p className="text-sm text-gray-600">Adicionar nomes de usuário aos usuários existentes</p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto">
        {/* Card de controles */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Migração de Nomes de Usuário
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button 
                onClick={carregarUsuarios}
                disabled={loading || migrating}
                variant="outline"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <RefreshCcw className="w-4 h-4 mr-2" />
                )}
                Carregar Usuários
              </Button>

              <Button 
                onClick={executarMigracao}
                disabled={migrating || usuarios.length === 0}
              >
                {migrating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Executar Migração
              </Button>
            </div>

            {usuarios.length > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm">
                  <strong>Total de usuários:</strong> {usuarios.length}<br />
                  <strong>Com nome de usuário:</strong> {usuarios.filter(u => u.nomeUsuario).length}<br />
                  <strong>Precisam migração:</strong> {usuarios.filter(u => !u.nomeUsuario).length}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lista de usuários sem nome de usuário */}
        {usuarios.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Usuários que Precisam de Nome de Usuário</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {usuarios.filter(u => !u.nomeUsuario).map((usuario) => (
                  <div key={usuario.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{usuario.nome}</div>
                      <div className="text-sm text-gray-600">{usuario.email}</div>
                      <div className="text-xs text-gray-500">Tipo: {usuario.tipo}</div>
                    </div>
                    <div className="text-sm text-orange-600">
                      Sem nome de usuário
                    </div>
                  </div>
                ))}

                {usuarios.filter(u => !u.nomeUsuario).length === 0 && (
                  <div className="text-center py-8 text-green-600">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4" />
                    <p>Todos os usuários já possuem nome de usuário!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resultados da migração */}
        {resultados.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Resultados da Migração</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {resultados.map((resultado, index) => (
                  <div key={index} className={`flex items-center justify-between p-3 border rounded-lg ${
                    resultado.status === 'sucesso' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}>
                    <div>
                      <div className="font-medium">{resultado.nome}</div>
                      <div className="text-sm text-gray-600">{resultado.email}</div>
                      {resultado.nomeUsuario && (
                        <div className="text-sm font-mono bg-white px-2 py-1 rounded border">
                          Login: {resultado.nomeUsuario}
                        </div>
                      )}
                      {resultado.erro && (
                        <div className="text-sm text-red-600">{resultado.erro}</div>
                      )}
                    </div>
                    <div className={`flex items-center gap-2 ${
                      resultado.status === 'sucesso' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {resultado.status === 'sucesso' ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <AlertCircle className="w-5 h-5" />
                      )}
                      {resultado.status === 'sucesso' ? 'Sucesso' : 'Erro'}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}