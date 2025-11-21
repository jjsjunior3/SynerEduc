import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  User, 
  Mail,
  Lock,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  UserPlus,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface CadastrarUsuarioProps {
  onVoltar: () => void;
  onUsuarioCriado?: () => void;
}

interface NovoUsuario {
  nome: string;
  nomeUsuario: string;
  email: string;
  senha: string;
  confirmarSenha: string;
  tipo: string;
  serie?: string;
  disciplinas: string[];
  series: string[];
}

// Lista de disciplinas padrão como fallback
const disciplinasPadrao = [
  'Matemática', 'Português', 'História', 'Geografia', 'Ciências',
  'Biologia', 'Física', 'Química', 'Filosofia', 'Sociologia',
  'Inglês', 'Educação Física', 'Arte'
];

const seriesDisponiveis = [
  '5º ano - Ensino Fundamental',
  '6º ano - Ensino Fundamental', 
  '7º ano - Ensino Fundamental',
  '8º ano - Ensino Fundamental',
  '9º ano - Ensino Fundamental',
  '1ª série - Ensino Médio',
  '2ª série - Ensino Médio',
  '3ª série - Ensino Médio'
];

export function CadastrarUsuario({ onVoltar, onUsuarioCriado }: CadastrarUsuarioProps) {
  const [dados, setDados] = useState<NovoUsuario>({
    nome: '',
    nomeUsuario: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    tipo: '',
    serie: '',
    disciplinas: [],
    series: []
  });

  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [modalConfirmacao, setModalConfirmacao] = useState(false);
  const [usuarioCriado, setUsuarioCriado] = useState<any>(null);
  const [disciplinasDisponiveis, setDisciplinasDisponiveis] = useState<string[]>(disciplinasPadrao);
  const [carregandoDisciplinas, setCarregandoDisciplinas] = useState(true);

  const tiposUsuario = [
    { value: 'aluno', label: 'Aluno' },
    { value: 'professor', label: 'Professor' },
    { value: 'coordenador', label: 'Coordenador' },
    { value: 'administrador', label: 'Administrador' },
    { value: 'professor_conteudista', label: 'Professor Conteudista' }
  ];

  // Carregar disciplinas do sistema
  const carregarDisciplinas = async () => {
    try {
      console.log('[CADASTRAR_USUARIO] Carregando disciplinas do sistema...');
      setCarregandoDisciplinas(true);
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/disciplinas`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[CADASTRAR_USUARIO] Disciplinas recebidas:', data);
        
        let disciplinasArray = [];
        if (data.success && Array.isArray(data.disciplinas)) {
          disciplinasArray = data.disciplinas;
        } else if (Array.isArray(data)) {
          disciplinasArray = data;
        }

        // Extrair apenas os nomes das disciplinas ativas
        const nomesDisciplinas = disciplinasArray
          .filter(d => d.ativa !== false) // Incluir disciplinas ativas
          .map(d => d.nome)
          .filter(nome => nome && nome.trim()) // Filtrar nomes válidos
          .sort(); // Ordenar alfabeticamente

        if (nomesDisciplinas.length > 0) {
          console.log('[CADASTRAR_USUARIO] Disciplinas encontradas:', nomesDisciplinas);
          setDisciplinasDisponiveis(nomesDisciplinas);
        } else {
          console.warn('[CADASTRAR_USUARIO] Nenhuma disciplina encontrada, usando lista padrão');
          setDisciplinasDisponiveis(disciplinasPadrao);
        }
      } else {
        console.warn('[CADASTRAR_USUARIO] Erro ao carregar disciplinas:', response.status);
        setDisciplinasDisponiveis(disciplinasPadrao);
      }
    } catch (error) {
      console.error('[CADASTRAR_USUARIO] Erro ao carregar disciplinas:', error);
      setDisciplinasDisponiveis(disciplinasPadrao);
    } finally {
      setCarregandoDisciplinas(false);
    }
  };

  // Carregar disciplinas ao montar o componente
  useEffect(() => {
    carregarDisciplinas();
  }, []);

  // Validação em tempo real
  const validarFormulario = () => {
    const erros: string[] = [];

    if (!dados.nome.trim()) {
      erros.push('Nome completo é obrigatório');
    }

    if (!dados.nomeUsuario.trim()) {
      erros.push('Nome de usuário é obrigatório');
    } else {
      // Validar formato do nome de usuário
      const nomeUsuarioRegex = /^[a-zA-Z0-9.]+$/;
      if (!nomeUsuarioRegex.test(dados.nomeUsuario)) {
        erros.push('Nome de usuário pode conter apenas letras, números e pontos');
      }
      
      if (dados.nomeUsuario.length < 3) {
        erros.push('Nome de usuário deve ter pelo menos 3 caracteres');
      }
    }

    if (!dados.senha) {
      erros.push('Senha é obrigatória');
    } else if (dados.senha.length < 6) {
      erros.push('Senha deve ter pelo menos 6 caracteres');
    }

    if (!dados.confirmarSenha) {
      erros.push('Confirmação de senha é obrigatória');
    } else if (dados.senha !== dados.confirmarSenha) {
      erros.push('Senhas não coincidem');
    }

    if (!dados.tipo) {
      erros.push('Tipo de usuário é obrigatório');
    }

    // Validações específicas por tipo
    if (dados.tipo === 'aluno' && !dados.serie) {
      erros.push('Série é obrigatória para alunos');
    }

    if ((dados.tipo === 'professor' || dados.tipo === 'professor_conteudista') && dados.disciplinas.length === 0) {
      erros.push('Pelo menos uma disciplina deve ser selecionada');
    }

    if (dados.tipo === 'professor' && dados.series.length === 0) {
      erros.push('Pelo menos uma série deve ser selecionada para professores');
    }

    return erros;
  };

  const errosValidacao = validarFormulario();
  const formularioValido = errosValidacao.length === 0;

  const criarUsuario = async () => {
    if (!formularioValido) {
      toast.error('Por favor, corrija os erros no formulário');
      return;
    }

    setSalvando(true);
    try {
      const dadosParaCriar = {
        nome: dados.nome.trim(),
        nomeUsuario: dados.nomeUsuario.trim().toLowerCase(),
        email: dados.email.trim() || `${dados.nomeUsuario.trim().toLowerCase()}@escola.local`,
        senha: dados.senha,
        tipo: dados.tipo,
        ...(dados.tipo === 'aluno' && { serie: dados.serie }),
        ...(dados.tipo === 'professor' && { 
          disciplinas: dados.disciplinas,
          series: dados.series 
        }),
        ...(dados.tipo === 'professor_conteudista' && { 
          disciplinas: dados.disciplinas 
        })
      };

      console.log('[CADASTRAR_USUARIO] Criando usuário:', dadosParaCriar);

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosParaCriar)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[CADASTRAR_USUARIO] Erro da API:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const resultado = await response.json();
      console.log('[CADASTRAR_USUARIO] Usuário criado:', resultado);
      
      setUsuarioCriado({
        ...resultado.usuario,
        nomeUsuario: dadosParaCriar.nomeUsuario,
        senhaTemporaria: dados.senha
      });
      
      setModalConfirmacao(true);
      
      toast.success('Usuário criado com sucesso!');
    } catch (error) {
      console.error('[CADASTRAR_USUARIO] Erro ao criar usuário:', error);
      
      if (error.message.includes('Nome de usuário já cadastrado')) {
        toast.error('Nome de usuário já existe', {
          description: 'Escolha um nome de usuário diferente'
        });
      } else if (error.message.includes('Email já cadastrado')) {
        toast.error('Email já cadastrado', {
          description: 'Este email já está sendo usado por outro usuário'
        });
      } else if (error.message.includes('Failed to fetch')) {
        toast.error('Erro de conexão', {
          description: 'Não foi possível conectar ao servidor. Verifique sua internet.'
        });
      } else {
        toast.error(error.message || 'Erro ao criar usuário');
      }
    } finally {
      setSalvando(false);
    }
  };

  const finalizarCadastro = () => {
    setModalConfirmacao(false);
    onUsuarioCriado?.();
    onVoltar();
  };

  const gerarNomeUsuario = () => {
    if (dados.nome.trim()) {
      // Gerar nome de usuário baseado no nome
      const nomeUsuarioSugerido = dados.nome
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
        .split(' ')
        .filter(part => part.length > 0)
        .slice(0, 2) // Pegar apenas os 2 primeiros nomes
        .join('.');
      
      setDados(prev => ({ ...prev, nomeUsuario: nomeUsuarioSugerido }));
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
            <h1 className="text-xl font-semibold text-gray-900">Cadastrar Novo Usuário</h1>
            <p className="text-sm text-gray-600">Crie um novo usuário com nome de usuário e senha personalizados</p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Dados do Novo Usuário
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Informações pessoais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  value={dados.nome}
                  onChange={(e) => setDados(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Digite o nome completo"
                  onBlur={gerarNomeUsuario}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="nomeUsuario">Nome de Usuário *</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={gerarNomeUsuario}
                    className="text-xs"
                  >
                    Gerar automaticamente
                  </Button>
                </div>
                <Input
                  id="nomeUsuario"
                  value={dados.nomeUsuario}
                  onChange={(e) => setDados(prev => ({ ...prev, nomeUsuario: e.target.value.toLowerCase() }))}
                  placeholder="usuario.login"
                />
                <p className="text-xs text-gray-500">
                  Usado para login. Apenas letras, números e pontos.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email (opcional)</Label>
              <Input
                id="email"
                type="email"
                value={dados.email}
                onChange={(e) => setDados(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com (deixe vazio para gerar automaticamente)"
              />
              <p className="text-xs text-gray-500">
                Se não informado, será gerado automaticamente como: {dados.nomeUsuario}@escola.local
              </p>
            </div>

            {/* Credenciais */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium mb-4">Credenciais de Acesso</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="senha">Senha *</Label>
                  <div className="relative">
                    <Input
                      id="senha"
                      type={mostrarSenha ? "text" : "password"}
                      value={dados.senha}
                      onChange={(e) => setDados(prev => ({ ...prev, senha: e.target.value }))}
                      placeholder="Mínimo 6 caracteres"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setMostrarSenha(!mostrarSenha)}
                    >
                      {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmarSenha">Confirmar Senha *</Label>
                  <div className="relative">
                    <Input
                      id="confirmarSenha"
                      type={mostrarConfirmacao ? "text" : "password"}
                      value={dados.confirmarSenha}
                      onChange={(e) => setDados(prev => ({ ...prev, confirmarSenha: e.target.value }))}
                      placeholder="Digite a senha novamente"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setMostrarConfirmacao(!mostrarConfirmacao)}
                    >
                      {mostrarConfirmacao ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {dados.confirmarSenha && dados.senha !== dados.confirmarSenha && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      As senhas não coincidem
                    </p>
                  )}
                  {dados.confirmarSenha && dados.senha === dados.confirmarSenha && dados.senha.length >= 6 && (
                    <p className="text-xs text-green-500 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Senhas coincidem
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Tipo de usuário */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium mb-4">Perfil do Usuário</h3>
              
              <div className="space-y-2 mb-4">
                <Label>Tipo de Usuário *</Label>
                <Select value={dados.tipo} onValueChange={(value) => setDados(prev => ({ ...prev, tipo: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de usuário" />
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

              {/* Campos específicos por tipo */}
              {dados.tipo === 'aluno' && (
                <div className="space-y-2">
                  <Label>Série *</Label>
                  <Select value={dados.serie} onValueChange={(value) => setDados(prev => ({ ...prev, serie: value }))}>
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
              )}

              {(dados.tipo === 'professor' || dados.tipo === 'professor_conteudista') && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Disciplinas *</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={carregarDisciplinas}
                        disabled={carregandoDisciplinas}
                        className="text-xs"
                      >
                        {carregandoDisciplinas ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            Carregando...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Atualizar
                          </>
                        )}
                      </Button>
                    </div>
                    
                    <div className="max-h-40 overflow-y-auto border rounded-lg p-3">
                      {carregandoDisciplinas ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          <span className="text-sm text-gray-500">Carregando disciplinas...</span>
                        </div>
                      ) : (
                        <>
                          {disciplinasDisponiveis.map((disciplina) => (
                            <div key={disciplina} className="flex items-center gap-2 mb-2">
                              <input
                                type="checkbox"
                                checked={dados.disciplinas.includes(disciplina)}
                                onChange={(e) => setDados(prev => ({
                                  ...prev,
                                  disciplinas: e.target.checked 
                                    ? [...prev.disciplinas, disciplina]
                                    : prev.disciplinas.filter(d => d !== disciplina)
                                }))}
                                className="rounded"
                              />
                              <Label className="text-sm">{disciplina}</Label>
                            </div>
                          ))}
                          
                          {disciplinasDisponiveis.length === 0 && (
                            <div className="text-center py-4">
                              <p className="text-sm text-gray-500">Nenhuma disciplina cadastrada</p>
                              <p className="text-xs text-gray-400 mt-1">
                                Use a Gestão Escolar para cadastrar disciplinas
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    
                    {!carregandoDisciplinas && disciplinasDisponiveis.length > 0 && (
                      <p className="text-xs text-gray-500">
                        {disciplinasDisponiveis.length} disciplina(s) disponível(is) no sistema
                      </p>
                    )}
                  </div>

                  {dados.tipo === 'professor' && (
                    <div className="space-y-2">
                      <Label>Séries *</Label>
                      <div className="max-h-40 overflow-y-auto border rounded-lg p-3">
                        {seriesDisponiveis.map((serie) => (
                          <div key={serie} className="flex items-center gap-2 mb-2">
                            <input
                              type="checkbox"
                              checked={dados.series.includes(serie)}
                              onChange={(e) => setDados(prev => ({
                                ...prev,
                                series: e.target.checked 
                                  ? [...prev.series, serie]
                                  : prev.series.filter(s => s !== serie)
                              }))}
                              className="rounded"
                            />
                            <Label className="text-sm">{serie}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Erros de validação */}
            {errosValidacao.length > 0 && (
              <div className="border-t pt-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-red-800 mb-2">Corrija os seguintes erros:</h4>
                  <ul className="text-sm text-red-600 space-y-1">
                    {errosValidacao.map((erro, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <AlertCircle className="w-3 h-3" />
                        {erro}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Botões */}
            <div className="border-t pt-6 flex justify-between">
              <Button variant="outline" onClick={onVoltar}>
                Cancelar
              </Button>
              
              <Button 
                onClick={criarUsuario}
                disabled={!formularioValido || salvando}
                className="min-w-32"
              >
                {salvando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Criar Usuário
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de confirmação */}
      <Dialog open={modalConfirmacao} onOpenChange={setModalConfirmacao}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              Usuário Criado com Sucesso!
            </DialogTitle>
            <DialogDescription>
              O usuário foi cadastrado e já pode fazer login no sistema
            </DialogDescription>
          </DialogHeader>

          {usuarioCriado && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Nome:</span>
                  <span>{usuarioCriado.nome}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Login:</span>
                  <span className="font-mono bg-white px-2 py-1 rounded border">
                    {usuarioCriado.nomeUsuario}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Senha:</span>
                  <span className="font-mono bg-white px-2 py-1 rounded border">
                    {usuarioCriado.senhaTemporaria}
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-600">
                <strong>Importante:</strong> Anote essas credenciais e repasse ao usuário. 
                Ele poderá alterar a senha após o primeiro login.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button onClick={finalizarCadastro} className="w-full">
              Entendi, fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}