import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  User, 
  Mail, 
  BookOpen, 
  Users, 
  GraduationCap, 
  Settings, 
  LogOut,
  Edit,
  School,
  Calendar,
  Save,
  X,
  Camera,
  Loader2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Usuario } from '../types/auth';

interface PerfilUsuarioProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usuario?: Usuario;
  logout?: () => void;
  atualizarUsuario?: (usuario: Usuario) => void;
}

export function PerfilUsuario({ open, onOpenChange, usuario, logout, atualizarUsuario }: PerfilUsuarioProps) {
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [dadosEditados, setDadosEditados] = useState({
    nome: '',
    email: '',
    avatar: ''
  });

  // Update state when usuario changes
  useEffect(() => {
    if (usuario) {
      setDadosEditados({
        nome: usuario.nome || '',
        email: usuario.email || '',
        avatar: usuario.avatar || ''
      });
    }
  }, [usuario]);

  if (!usuario) return null;

  const handleLogout = () => {
    logout();
    onOpenChange(false);
  };

  const handleEditarPerfil = () => {
    setDadosEditados({
      nome: usuario?.nome || '',
      email: usuario?.email || '',
      avatar: usuario?.avatar || ''
    });
    setEditando(true);
  };

  const handleCancelarEdicao = () => {
    setEditando(false);
    setDadosEditados({
      nome: usuario?.nome || '',
      email: usuario?.email || '',
      avatar: usuario?.avatar || ''
    });
  };

  const handleSalvarPerfil = async () => {
    if (!dadosEditados.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    setSalvando(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/usuarios/perfil`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          usuarioId: usuario?.id,
          nome: dadosEditados.nome,
          email: dadosEditados.email,
          avatar: dadosEditados.avatar
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const usuarioAtualizado = await response.json();
      atualizarUsuario(usuarioAtualizado);
      setEditando(false);
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      toast.error(`Erro ao atualizar perfil: ${error.message}`);
    } finally {
      setSalvando(false);
    }
  };

  const handleUploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tamanho (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 2MB.');
      return;
    }

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      toast.error('Apenas imagens são permitidas');
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      formData.append('usuarioId', usuario?.id || '');

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/usuarios/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao fazer upload da imagem');
      }

      const { avatarUrl } = await response.json();
      setDadosEditados(prev => ({ ...prev, avatar: avatarUrl }));
      
      // Atualizar imediatamente o avatar do usuário
      atualizarUsuario({
        ...usuario,
        avatar: avatarUrl
      });
      
      toast.success('Foto atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error(`Erro ao fazer upload da foto: ${error.message}`);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const getTipoIcon = () => {
    switch (usuario?.tipo) {
      case 'aluno':
        return <BookOpen className="w-4 h-4" />;
      case 'professor':
        return <GraduationCap className="w-4 h-4" />;
      case 'coordenador':
        return <Users className="w-4 h-4" />;
      case 'administrador':
        return <Settings className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getTipoCor = () => {
    switch (usuario?.tipo) {
      case 'aluno':
        return 'bg-blue-100 text-blue-800';
      case 'professor':
        return 'bg-green-100 text-green-800';
      case 'coordenador':
        return 'bg-orange-100 text-orange-800';
      case 'administrador':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTipoNome = () => {
    switch (usuario?.tipo) {
      case 'aluno':
        return 'Aluno';
      case 'professor':
        return 'Professor';
      case 'coordenador':
        return 'Coordenador';
      case 'administrador':
        return 'Administrador';
      default:
        return 'Usuário';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Perfil do Usuário
          </DialogTitle>
          <DialogDescription>
            Visualize e edite suas informações pessoais e configurações da conta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header do perfil */}
          <div className="flex items-start gap-4 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
            <div className="relative">
              <Avatar className="w-20 h-20">
                <AvatarImage src={editando ? dadosEditados.avatar : usuario?.avatar} alt={usuario?.nome || 'Usuario'} />
                <AvatarFallback className="text-lg font-semibold">
                  {(() => {
                    const nome = editando ? dadosEditados.nome : usuario?.nome;
                    if (!nome) return 'U';
                    return nome.split(' ').map(n => n[0]).join('').toUpperCase();
                  })()}
                </AvatarFallback>
              </Avatar>
              {editando && (
                <div className="absolute bottom-0 right-0">
                  <label htmlFor="avatar-upload" className="cursor-pointer">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors">
                      {uploadingAvatar ? (
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4 text-white" />
                      )}
                    </div>
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUploadAvatar}
                    disabled={uploadingAvatar}
                  />
                </div>
              )}
            </div>
            
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                {editando ? (
                  <div className="flex-1 mr-4">
                    <Label htmlFor="nome">Nome</Label>
                    <Input
                      id="nome"
                      value={dadosEditados.nome}
                      onChange={(e) => setDadosEditados(prev => ({ ...prev, nome: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                ) : (
                  <h2 className="text-2xl font-bold text-gray-900">{usuario?.nome || 'Usuário'}</h2>
                )}
                
                {!editando ? (
                  <Button variant="outline" size="sm" onClick={handleEditarPerfil}>
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCancelarEdicao} disabled={salvando}>
                      <X className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSalvarPerfil} disabled={salvando}>
                      {salvando ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Salvar
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Badge className={getTipoCor()}>
                  {getTipoIcon()}
                  <span className="ml-1">{getTipoNome()}</span>
                </Badge>
              </div>
              
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="w-4 h-4" />
                {editando ? (
                  <div className="flex-1">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={dadosEditados.email}
                      onChange={(e) => setDadosEditados(prev => ({ ...prev, email: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                ) : (
                  <span>{usuario?.email || 'Email não informado'}</span>
                )}
              </div>
            </div>
          </div>

          {/* Informações específicas por tipo de usuário */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <School className="w-4 h-4" />
                  Informações Acadêmicas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {usuario?.tipo === 'aluno' && (
                  <>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Série</p>
                      <p className="font-medium">{usuario?.serie || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Turma</p>
                      <p className="font-medium">{usuario?.turma || 'Não informado'}</p>
                    </div>
                  </>
                )}
                
                {(usuario?.tipo === 'professor' || usuario?.tipo === 'coordenador') && (
                  <>
                    {usuario?.disciplinas && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-2">Disciplinas</p>
                        <div className="flex flex-wrap gap-1">
                          {usuario?.disciplinas?.map((disciplina, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {disciplina}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {usuario?.turmas && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-2">Turmas</p>
                        <div className="flex flex-wrap gap-1">
                          {usuario?.turmas?.map((turma, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {turma}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
                
                {usuario?.tipo === 'administrador' && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Permissões</p>
                    <p className="font-medium">Acesso total ao sistema</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Informações da Conta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-500">ID do Usuário</p>
                  <p className="font-mono text-sm">{usuario?.id || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Último acesso</p>
                  <p>Hoje, {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <Badge className="bg-green-100 text-green-800">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    Online
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ações */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-500">
              Membro desde Janeiro 2024
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              <Button variant="destructive" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}