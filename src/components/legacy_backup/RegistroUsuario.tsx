import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { ArrowLeft, User, Save, X, Loader2, Eye, EyeOff } from 'lucide-react';
import { SerieEscolar, TipoUsuario } from '../types/auth';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface RegistroUsuarioProps {
  onVoltar: () => void;
}

interface NovoUsuario {
  nomeCompleto: string;
  dataNascimento: string;
  cpf: string;
  nomeUsuario: string;
  senha: string;
  confirmarSenha: string;
  tipo: TipoUsuario | '';
  serie?: SerieEscolar;
  anoLetivo?: string;
  disciplinas?: string[];
  series?: SerieEscolar[];
}

const disciplinasDisponiveis = [
  'Matemática', 'Português', 'História', 'Geografia', 'Ciências',
  'Biologia', 'Física', 'Química', 'Filosofia', 'Sociologia',
  'Inglês', 'Educação Física', 'Arte'
];

const seriesDisponiveis: SerieEscolar[] = [
  '5º ano - Ensino Fundamental',
  '6º ano - Ensino Fundamental',
  '7º ano - Ensino Fundamental',
  '8º ano - Ensino Fundamental',
  '9º ano - Ensino Fundamental',
  '1ª série - Ensino Médio',
  '2ª série - Ensino Médio',
  '3ª série - Ensino Médio'
];

export function RegistroUsuario({ onVoltar }: RegistroUsuarioProps) {
  const [usuario, setUsuario] = useState<NovoUsuario>({
    nomeCompleto: '',
    dataNascimento: '',
    cpf: '',
    nomeUsuario: '',
    senha: '',
    confirmarSenha: '',
    tipo: '',
    disciplinas: [],
    series: []
  });
  const [salvando, setSalvando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);

  const handleInputChange = (field: keyof NovoUsuario, value: string) => {
    setUsuario(prev => ({ ...prev, [field]: value }));
  };

  const handleDisciplinaChange = (disciplina: string, checked: boolean) => {
    setUsuario(prev => ({
      ...prev,
      disciplinas: checked 
        ? [...(prev.disciplinas || []), disciplina]
        : (prev.disciplinas || []).filter(d => d !== disciplina)
    }));
  };

  const handleSerieChange = (serie: SerieEscolar, checked: boolean) => {
    setUsuario(prev => ({
      ...prev,
      series: checked 
        ? [...(prev.series || []), serie]
        : (prev.series || []).filter(s => s !== serie)
    }));
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const handleCPFChange = (value: string) => {
    const formatted = formatCPF(value);
    if (formatted.length <= 14) {
      setUsuario(prev => ({ ...prev, cpf: formatted }));
    }
  };

  const handleNomeChange = (nome: string) => {
    setUsuario(prev => ({
      ...prev,
      nomeCompleto: nome
    }));
  };

  const handleTipoChange = (tipo: TipoUsuario) => {
    setUsuario(prev => ({
      ...prev,
      tipo,
      // Limpar campos específicos quando mudar o tipo
      serie: undefined,
      anoLetivo: undefined,
      disciplinas: [],
      series: []
    }));
  };

  const handleSalvar = async () => {
    // Validações básicas
    if (!usuario.nomeCompleto || !usuario.dataNascimento || !usuario.cpf || !usuario.tipo || !usuario.nomeUsuario || !usuario.senha) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Validar nome de usuário
    if (usuario.nomeUsuario.length < 3) {
      toast.error('Nome de usuário deve ter pelo menos 3 caracteres');
      return;
    }

    // Validar se o nome de usuário contém apenas letras, números e pontos
    const nomeUsuarioRegex = /^[a-zA-Z0-9.]+$/;
    if (!nomeUsuarioRegex.test(usuario.nomeUsuario)) {
      toast.error('Nome de usuário pode conter apenas letras, números e pontos');
      return;
    }

    // Validar senha
    if (usuario.senha.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    // Validar confirmação de senha
    if (usuario.senha !== usuario.confirmarSenha) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (usuario.tipo === 'aluno' && (!usuario.serie || !usuario.anoLetivo)) {
      toast.error('Para alunos, é necessário informar a série e ano letivo');
      return;
    }

    if (usuario.tipo === 'professor' && (!usuario.disciplinas?.length || !usuario.series?.length)) {
      toast.error('Para professores, é necessário associar disciplinas e séries');
      return;
    }

    if (usuario.tipo === 'professor_conteudista' && !usuario.disciplinas?.length) {
      toast.error('Para professores conteudistas, é necessário associar pelo menos uma disciplina');
      return;
    }

    // Validar formato do CPF
    const cpfNumbers = usuario.cpf.replace(/\D/g, '');
    if (cpfNumbers.length !== 11) {
      toast.error('CPF deve ter 11 dígitos');
      return;
    }

    setSalvando(true);
    try {
      const dadosUsuario = {
        nome: usuario.nomeCompleto,
        dataNascimento: usuario.dataNascimento,
        cpf: cpfNumbers,
        nomeUsuario: usuario.nomeUsuario,
        senha: usuario.senha,
        tipo: usuario.tipo,
        ...(usuario.tipo === 'aluno' && {
          serie: usuario.serie,
          anoLetivo: usuario.anoLetivo
        }),
        ...(usuario.tipo === 'professor' && {
          disciplinas: usuario.disciplinas,
          series: usuario.series
        }),
        ...(usuario.tipo === 'professor_conteudista' && {
          disciplinas: usuario.disciplinas,
          especialidade: 'Criação de conteúdo educacional'
        })
      };

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosUsuario)
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const usuarioCriado = await response.json();

      // Mensagens de sucesso mais detalhadas
      toast.success(`✅ Usuário cadastrado com sucesso!`, {
        description: `${usuario.nomeCompleto} foi adicionado como ${
          usuario.tipo === 'professor_conteudista' ? 'Professor Conteudista' : 
          usuario.tipo === 'administrador' ? 'Administrador' :
          usuario.tipo === 'coordenador' ? 'Coordenador' :
          usuario.tipo === 'professor' ? 'Professor' :
          'Aluno'
        }`,
        duration: 5000
      });
      
      toast.info(`🔑 Credenciais de acesso:`, {
        description: `Usuário: ${usuario.nomeUsuario} | Senha: ${usuario.senha}`,
        action: {
          label: "Copiar",
          onClick: () => {
            navigator.clipboard.writeText(`Usuário: ${usuario.nomeUsuario}\nSenha: ${usuario.senha}`);
            toast.success('Credenciais copiadas!');
          }
        }
      });
      
      // Resetar formulário
      setUsuario({
        nomeCompleto: '',
        dataNascimento: '',
        cpf: '',
        nomeUsuario: '',
        senha: '',
        confirmarSenha: '',
        tipo: '',
        disciplinas: [],
        series: []
      });

    } catch (error) {
      console.error('Erro ao cadastrar usuário:', error);
      
      // Mensagens de erro mais específicas
      let errorMessage = 'Erro desconhecido ao cadastrar usuário';
      
      if (error instanceof Error) {
        if (error.message.includes('Nome de usuário já cadastrado') || error.message.includes('Username already exists')) {
          errorMessage = '❌ Este nome de usuário já está em uso. Escolha outro nome de usuário.';
        } else if (error.message.includes('HTTP 400')) {
          errorMessage = '❌ Dados inválidos. Verifique se todos os campos estão preenchidos corretamente.';
        } else if (error.message.includes('HTTP 500')) {
          errorMessage = '❌ Erro interno do servidor. Tente novamente em alguns instantes.';
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = '❌ Erro de conexão. Verifique sua internet e tente novamente.';
        } else {
          errorMessage = `❌ ${error.message}`;
        }
      }
      
      toast.error('Falha no cadastro', {
        description: errorMessage
      });
    } finally {
      setSalvando(false);
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
            <h1 className="font-semibold text-gray-900">Registro de Usuários</h1>
            <p className="text-sm text-gray-600">Cadastrar novos usuários no sistema</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Dados do Usuário
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {salvando && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">Processando cadastro...</p>
                      <p className="text-sm text-blue-700">Aguarde enquanto criamos o usuário no sistema.</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Dados Básicos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo *</Label>
                  <Input
                    id="nome"
                    value={usuario.nomeCompleto}
                    onChange={(e) => handleNomeChange(e.target.value)}
                    placeholder="Digite o nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nascimento">Data de Nascimento *</Label>
                  <Input
                    id="nascimento"
                    type="date"
                    value={usuario.dataNascimento}
                    onChange={(e) => handleInputChange('dataNascimento', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input
                    id="cpf"
                    value={usuario.cpf}
                    onChange={(e) => handleCPFChange(e.target.value)}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo de Usuário *</Label>
                  <Select value={usuario.tipo} onValueChange={handleTipoChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aluno">Aluno</SelectItem>
                      <SelectItem value="professor">Professor</SelectItem>
                      <SelectItem value="coordenador">Coordenador</SelectItem>
                      <SelectItem value="administrador">Administrador</SelectItem>
                      <SelectItem value="professor_conteudista">Professor Conteudista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Dados de Acesso */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nomeUsuario">Nome de Usuário *</Label>
                  <Input
                    id="nomeUsuario"
                    value={usuario.nomeUsuario}
                    onChange={(e) => handleInputChange('nomeUsuario', e.target.value.toLowerCase())}
                    placeholder="usuario.login"
                  />
                  <p className="text-xs text-gray-500">
                    Apenas letras, números e pontos. Mínimo 3 caracteres.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senha">Senha *</Label>
                  <div className="relative">
                    <Input
                      id="senha"
                      type={mostrarSenha ? "text" : "password"}
                      value={usuario.senha}
                      onChange={(e) => handleInputChange('senha', e.target.value)}
                      placeholder="Digite a senha"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setMostrarSenha(!mostrarSenha)}
                    >
                      {mostrarSenha ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Mínimo de 6 caracteres.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmarSenha">Confirmar Senha *</Label>
                  <div className="relative">
                    <Input
                      id="confirmarSenha"
                      type={mostrarConfirmarSenha ? "text" : "password"}
                      value={usuario.confirmarSenha}
                      onChange={(e) => handleInputChange('confirmarSenha', e.target.value)}
                      placeholder="Digite a senha novamente"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
                    >
                      {mostrarConfirmarSenha ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {usuario.senha && usuario.confirmarSenha && usuario.senha !== usuario.confirmarSenha && (
                    <p className="text-xs text-red-500">
                      As senhas não coincidem.
                    </p>
                  )}
                  {usuario.senha && usuario.confirmarSenha && usuario.senha === usuario.confirmarSenha && (
                    <p className="text-xs text-green-500">
                      ✓ Senhas coincidem.
                    </p>
                  )}
                </div>
              </div>

              {/* Campos específicos para Aluno */}
              {usuario.tipo === 'aluno' && (
                <div className="border-t pt-6">
                  <h3 className="font-medium text-gray-900 mb-4">Dados do Aluno</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="serie">Série *</Label>
                      <Select value={usuario.serie} onValueChange={(value) => handleInputChange('serie', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a série" />
                        </SelectTrigger>
                        <SelectContent>
                          {seriesDisponiveis.map((serie) => (
                            <SelectItem key={serie} value={serie}>{serie}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="anoLetivo">Ano Letivo *</Label>
                      <Select value={usuario.anoLetivo} onValueChange={(value) => handleInputChange('anoLetivo', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o ano" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2024">2024</SelectItem>
                          <SelectItem value="2025">2025</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Campos específicos para Professor */}
              {usuario.tipo === 'professor' && (
                <div className="border-t pt-6">
                  <h3 className="font-medium text-gray-900 mb-4">Dados do Professor</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <Label>Disciplinas *</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                        {disciplinasDisponiveis.map((disciplina) => (
                          <div key={disciplina} className="flex items-center space-x-2">
                            <Checkbox
                              id={`disc-${disciplina}`}
                              checked={usuario.disciplinas?.includes(disciplina) || false}
                              onCheckedChange={(checked) => handleDisciplinaChange(disciplina, checked as boolean)}
                            />
                            <Label htmlFor={`disc-${disciplina}`} className="text-sm">
                              {disciplina}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label>Séries *</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                        {seriesDisponiveis.map((serie) => (
                          <div key={serie} className="flex items-center space-x-2">
                            <Checkbox
                              id={`serie-${serie}`}
                              checked={usuario.series?.includes(serie) || false}
                              onCheckedChange={(checked) => handleSerieChange(serie, checked as boolean)}
                            />
                            <Label htmlFor={`serie-${serie}`} className="text-sm">
                              {serie}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Campos específicos para Professor Conteudista */}
              {usuario.tipo === 'professor_conteudista' && (
                <div className="border-t pt-6">
                  <h3 className="font-medium text-gray-900 mb-4">Dados do Professor Conteudista</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <Label>Disciplinas *</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                        {disciplinasDisponiveis.map((disciplina) => (
                          <div key={disciplina} className="flex items-center space-x-2">
                            <Checkbox
                              id={`disc-conteudista-${disciplina}`}
                              checked={usuario.disciplinas?.includes(disciplina) || false}
                              onCheckedChange={(checked) => handleDisciplinaChange(disciplina, checked as boolean)}
                            />
                            <Label htmlFor={`disc-conteudista-${disciplina}`} className="text-sm">
                              {disciplina}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Botões */}
              <div className="flex justify-end gap-4 pt-6 border-t">
                <Button variant="outline" onClick={onVoltar} disabled={salvando}>
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
                <Button onClick={handleSalvar} disabled={salvando}>
                  {salvando ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {salvando ? 'Salvando...' : 'Salvar Usuário'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}