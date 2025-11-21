import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Users, 
  BookOpen, 
  FileText, 
  Settings,
  BarChart3,
  UserPlus,
  Upload,
  Download,
  Eye,
  Edit,
  Trash2,
  Shield,
  School,
  GraduationCap,
  Calendar,
  Activity,
  TrendingUp,
  Database,
  Wifi,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  MoreHorizontal
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo: 'aluno' | 'professor' | 'coordenador' | 'administrador' | 'professor_conteudista';
  ativo: boolean;
  serie?: string;
  disciplinas?: string[];
  series?: string[];
  criadoEm: string;
}

interface Disciplina {
  id: string;
  nome: string;
  serie: string;
  professor?: string;
  alunos: number;
  ativo: boolean;
}

interface Estatisticas {
  totalUsuarios: number;
  usuariosAtivos: number;
  totalAlunos: number;
  totalProfessores: number;
  totalDisciplinas: number;
  disciplinasAtivas: number;
  loginsMes: number;
  crescimentoMensal: number;
}

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [estatisticas, setEstatisticas] = useState<Estatisticas>({
    totalUsuarios: 0,
    usuariosAtivos: 0,
    totalAlunos: 0,
    totalProfessores: 0,
    totalDisciplinas: 0,
    disciplinasAtivas: 0,
    loginsMes: 0,
    crescimentoMensal: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para formulários
  const [modalNovoUsuario, setModalNovoUsuario] = useState(false);
  const [modalNovaDisciplina, setModalNovaDisciplina] = useState(false);
  const [novoUsuario, setNovoUsuario] = useState({
    nome: '',
    email: '',
    tipo: 'aluno' as const,
    serie: '',
    disciplinas: [] as string[],
    series: [] as string[]
  });

  const disciplinasDisponiveis = [
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

  const carregarDados = async () => {
    setLoading(true);
    setError(null);

    try {
      // Carregar usuários
      const responseUsuarios = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (responseUsuarios.ok) {
        const dataUsuarios = await responseUsuarios.json();
        setUsuarios(dataUsuarios.usuarios || []);
        
        // Calcular estatísticas
        const totalUsuarios = dataUsuarios.usuarios?.length || 0;
        const usuariosAtivos = dataUsuarios.usuarios?.filter((u: Usuario) => u.ativo).length || 0;
        const totalAlunos = dataUsuarios.usuarios?.filter((u: Usuario) => u.tipo === 'aluno').length || 0;
        const totalProfessores = dataUsuarios.usuarios?.filter((u: Usuario) => u.tipo === 'professor').length || 0;
        
        setEstatisticas(prev => ({
          ...prev,
          totalUsuarios,
          usuariosAtivos,
          totalAlunos,
          totalProfessores,
          crescimentoMensal: Math.floor(Math.random() * 20) + 5 // Simulado
        }));
      }

      // Carregar disciplinas
      const responseDisciplinas = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/disciplinas`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (responseDisciplinas.ok) {
        const dataDisciplinas = await responseDisciplinas.json();
        setDisciplinas(dataDisciplinas || []);
        setEstatisticas(prev => ({
          ...prev,
          totalDisciplinas: dataDisciplinas?.length || 0,
          disciplinasAtivas: dataDisciplinas?.filter((d: Disciplina) => d.ativo).length || 0
        }));
      }

    } catch (error) {
      console.error('Erro ao carregar dados administrativos:', error);
      setError('Erro ao carregar dados. Algumas funcionalidades podem estar limitadas.');
    } finally {
      setLoading(false);
    }
  };

  const criarUsuario = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/admin/usuarios`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...novoUsuario,
          senha: '123456' // Senha padrão
        })
      });

      if (response.ok) {
        toast.success('Usuário criado com sucesso!');
        setModalNovoUsuario(false);
        setNovoUsuario({
          nome: '',
          email: '',
          tipo: 'aluno',
          serie: '',
          disciplinas: [],
          series: []
        });
        carregarDados();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Erro ao criar usuário');
      }
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      toast.error('Erro ao criar usuário');
    }
  };

  const exportarDados = () => {
    const dadosExportacao = {
      usuarios: usuarios.map(u => ({
        nome: u.nome,
        email: u.email,
        tipo: u.tipo,
        ativo: u.ativo,
        serie: u.serie,
        disciplinas: u.disciplinas
      })),
      disciplinas,
      estatisticas,
      dataExportacao: new Date().toISOString()
    };

    const dataStr = JSON.stringify(dadosExportacao, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `dados_ava_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast.success('Dados exportados com sucesso!');
  };

  useEffect(() => {
    carregarDados();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-2" />
        <span>Carregando painel administrativo...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Painel Administrativo</h2>
          <p className="text-gray-600">Gerencie usuários, disciplinas, conteúdo e acompanhe relatórios</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={carregarDados} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={exportarDados} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="disciplinas">Disciplinas</TabsTrigger>
          <TabsTrigger value="conteudo">Conteúdo</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
          <TabsTrigger value="sistema">Sistema</TabsTrigger>
        </TabsList>

        {/* Dashboard */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Estatísticas Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total de Usuários</p>
                    <p className="text-2xl font-bold text-blue-600">{estatisticas.totalUsuarios}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
                <div className="mt-2 text-xs text-green-600">
                  +{estatisticas.crescimentoMensal}% este mês
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Alunos</p>
                    <p className="text-2xl font-bold text-green-600">{estatisticas.totalAlunos}</p>
                  </div>
                  <GraduationCap className="w-8 h-8 text-green-600" />
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {estatisticas.usuariosAtivos} ativos
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Professores</p>
                    <p className="text-2xl font-bold text-purple-600">{estatisticas.totalProfessores}</p>
                  </div>
                  <School className="w-8 h-8 text-purple-600" />
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Corpo docente
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Disciplinas</p>
                    <p className="text-2xl font-bold text-orange-600">{estatisticas.totalDisciplinas}</p>
                  </div>
                  <BookOpen className="w-8 h-8 text-orange-600" />
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {estatisticas.disciplinasAtivas} ativas
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ações Rápidas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Ações Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Button 
                  onClick={() => setModalNovoUsuario(true)}
                  className="h-auto p-4 justify-start flex-col items-start"
                  variant="outline"
                >
                  <UserPlus className="w-6 h-6 mb-2" />
                  <div className="text-left">
                    <div className="font-medium">Criar Usuário</div>
                    <div className="text-sm text-gray-600">Adicionar novo aluno, professor ou administrador</div>
                  </div>
                </Button>

                <Button 
                  onClick={() => setActiveTab('disciplinas')}
                  className="h-auto p-4 justify-start flex-col items-start"
                  variant="outline"
                >
                  <BookOpen className="w-6 h-6 mb-2" />
                  <div className="text-left">
                    <div className="font-medium">Gerenciar Disciplinas</div>
                    <div className="text-sm text-gray-600">Configurar disciplinas e séries</div>
                  </div>
                </Button>

                <Button 
                  onClick={() => setActiveTab('conteudo')}
                  className="h-auto p-4 justify-start flex-col items-start"
                  variant="outline"
                >
                  <FileText className="w-6 h-6 mb-2" />
                  <div className="text-left">
                    <div className="font-medium">Upload de Conteúdo</div>
                    <div className="text-sm text-gray-600">Fazer upload de PDFs e materiais</div>
                  </div>
                </Button>

                <Button 
                  onClick={() => setActiveTab('relatorios')}
                  className="h-auto p-4 justify-start flex-col items-start"
                  variant="outline"
                >
                  <BarChart3 className="w-6 h-6 mb-2" />
                  <div className="text-left">
                    <div className="font-medium">Relatórios</div>
                    <div className="text-sm text-gray-600">Visualizar estatísticas e relatórios</div>
                  </div>
                </Button>

                <Button 
                  onClick={() => setActiveTab('sistema')}
                  className="h-auto p-4 justify-start flex-col items-start"
                  variant="outline"
                >
                  <Settings className="w-6 h-6 mb-2" />
                  <div className="text-left">
                    <div className="font-medium">Configurações</div>
                    <div className="text-sm text-gray-600">Configurar sistema e realizar diagnósticos</div>
                  </div>
                </Button>

                <Button 
                  onClick={exportarDados}
                  className="h-auto p-4 justify-start flex-col items-start"
                  variant="outline"
                >
                  <Database className="w-6 h-6 mb-2" />
                  <div className="text-left">
                    <div className="font-medium">Backup de Dados</div>
                    <div className="text-sm text-gray-600">Exportar dados do sistema</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Status do Sistema */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="w-5 h-5" />
                Status do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="font-medium text-green-900">Sistema Online</div>
                    <div className="text-sm text-green-700">Todos os serviços funcionando</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <Database className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="font-medium text-blue-900">Banco de Dados</div>
                    <div className="text-sm text-blue-700">Conectado e sincronizado</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                  <Shield className="w-5 h-5 text-purple-600" />
                  <div>
                    <div className="font-medium text-purple-900">Segurança</div>
                    <div className="text-sm text-purple-700">Sistema protegido</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usuários */}
        <TabsContent value="usuarios" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Gerenciamento de Usuários</h3>
            <Button onClick={() => setModalNovoUsuario(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Novo Usuário
            </Button>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input placeholder="Buscar usuários..." className="pl-10" />
                  </div>
                  <Select>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filtrar por tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="aluno">Alunos</SelectItem>
                      <SelectItem value="professor">Professores</SelectItem>
                      <SelectItem value="administrador">Administradores</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-lg border">
                  <div className="p-4 border-b bg-gray-50">
                    <div className="grid grid-cols-4 gap-4 text-sm font-medium text-gray-600">
                      <div>Usuário</div>
                      <div>Tipo</div>
                      <div>Status</div>
                      <div>Ações</div>
                    </div>
                  </div>
                  <div className="divide-y">
                    {usuarios.slice(0, 5).map((usuario) => (
                      <div key={usuario.id} className="p-4">
                        <div className="grid grid-cols-4 gap-4 items-center">
                          <div>
                            <div className="font-medium text-gray-900">{usuario.nome}</div>
                            <div className="text-sm text-gray-600">{usuario.email}</div>
                          </div>
                          <div>
                            <Badge variant="outline">{usuario.tipo}</Badge>
                          </div>
                          <div>
                            <Badge variant={usuario.ativo ? "default" : "secondary"}>
                              {usuario.ativo ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Button 
                  onClick={() => setActiveTab('usuarios')} 
                  variant="outline" 
                  className="w-full"
                >
                  Ver Todos os Usuários ({usuarios.length})
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Disciplinas */}
        <TabsContent value="disciplinas" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Gerenciamento de Disciplinas</h3>
            <Button onClick={() => setModalNovaDisciplina(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Disciplina
            </Button>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Funcionalidade em desenvolvimento
                </h3>
                <p className="text-gray-600 mb-4">
                  O gerenciamento completo de disciplinas estará disponível em breve.
                </p>
                <Button variant="outline">
                  Saiba mais
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conteúdo */}
        <TabsContent value="conteudo" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Gerenciamento de Conteúdo</h3>
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              Upload de Arquivo
            </Button>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Sistema de Upload
                </h3>
                <p className="text-gray-600 mb-4">
                  Faça upload de PDFs, imagens e outros materiais didáticos.
                </p>
                <Button>
                  <Upload className="w-4 h-4 mr-2" />
                  Fazer Upload
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Relatórios */}
        <TabsContent value="relatorios" className="space-y-4">
          <h3 className="text-lg font-semibold">Relatórios e Estatísticas</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Crescimento de Usuários
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    +{estatisticas.crescimentoMensal}%
                  </div>
                  <p className="text-gray-600">Crescimento este mês</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Atividade Recente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">3 novos usuários hoje</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">12 logins nas últimas 24h</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-sm">2 disciplinas atualizadas</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Sistema */}
        <TabsContent value="sistema" className="space-y-4">
          <h3 className="text-lg font-semibold">Configurações do Sistema</h3>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Informações do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Project ID</Label>
                  <Input value={projectId} readOnly className="mt-1" />
                </div>
                <div>
                  <Label>Versão</Label>
                  <Input value="2.1.0" readOnly className="mt-1" />
                </div>
                <div>
                  <Label>Ambiente</Label>
                  <Input value="Produção" readOnly className="mt-1" />
                </div>
                <div>
                  <Label>Última Atualização</Label>
                  <Input value={new Date().toLocaleDateString('pt-BR')} readOnly className="mt-1" />
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <Button onClick={carregarDados} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Atualizar Dados
                </Button>
                <Button onClick={exportarDados} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Backup Completo
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Novo Usuário */}
      <Dialog open={modalNovoUsuario} onOpenChange={setModalNovoUsuario}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Novo Usuário</DialogTitle>
            <DialogDescription>
              Preencha os dados do novo usuário do sistema
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome Completo</Label>
              <Input 
                id="nome"
                value={novoUsuario.nome}
                onChange={(e) => setNovoUsuario({...novoUsuario, nome: e.target.value})}
                placeholder="Nome do usuário"
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email"
                type="email"
                value={novoUsuario.email}
                onChange={(e) => setNovoUsuario({...novoUsuario, email: e.target.value})}
                placeholder="email@exemplo.com"
              />
            </div>
            
            <div>
              <Label htmlFor="tipo">Tipo de Usuário</Label>
              <Select 
                value={novoUsuario.tipo} 
                onValueChange={(value: any) => setNovoUsuario({...novoUsuario, tipo: value})}
              >
                <SelectTrigger>
                  <SelectValue />
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

            {novoUsuario.tipo === 'aluno' && (
              <div>
                <Label htmlFor="serie">Série</Label>
                <Select 
                  value={novoUsuario.serie} 
                  onValueChange={(value) => setNovoUsuario({...novoUsuario, serie: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a série" />
                  </SelectTrigger>
                  <SelectContent>
                    {seriesDisponiveis.map(serie => (
                      <SelectItem key={serie} value={serie}>{serie}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button onClick={criarUsuario} className="flex-1">
                Criar Usuário
              </Button>
              <Button variant="outline" onClick={() => setModalNovoUsuario(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}