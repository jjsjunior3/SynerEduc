// src/components/PerfilUsuario.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  User, Mail, BookOpen, Users, GraduationCap,
  Settings, LogOut, Edit, School, Save, X, Camera, Loader2,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { toast } from 'sonner';

interface PerfilUsuarioProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usuario?: any;
  logout?: () => void;
}

export function PerfilUsuario({ open, onOpenChange, usuario: usuarioProp, logout }: PerfilUsuarioProps) {
  const { usuario: usuarioContext, atualizarPerfil, logout: logoutContext } = useAuth();  const usuario = usuarioProp || usuarioContext;

  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [dadosEditados, setDadosEditados] = useState({ nome: '', email: '', avatar: '' });

  useEffect(() => {
    if (usuario) {
      setDadosEditados({ nome: usuario.nome || '', email: usuario.email || '', avatar: usuario.avatar || '' });
    }
  }, [usuario]);

  if (!usuario) return null;

  const logoutFn = logout ?? logoutContext;
  const handleLogout = () => {
    logoutFn();
    onOpenChange(false);
  };
  const handleEditarPerfil = () => {
    setDadosEditados({ nome: usuario?.nome || '', email: usuario?.email || '', avatar: usuario?.avatar || '' });
    setEditando(true);
  };

  const handleCancelarEdicao = () => {
    setEditando(false);
    setDadosEditados({ nome: usuario?.nome || '', email: usuario?.email || '', avatar: usuario?.avatar || '' });
  };

  const handleSalvarPerfil = async () => {
    if (!dadosEditados.nome.trim()) { toast.error('Nome é obrigatório'); return; }
    setSalvando(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ nome: dadosEditados.nome, email: dadosEditados.email, avatar: dadosEditados.avatar, updated_at: new Date().toISOString() })
        .eq('id', usuario.id).select().single();
      if (error) throw error;
      if (atualizarPerfil) atualizarPerfil(data);
      setEditando(false);
      toast.success('Perfil atualizado com sucesso!');
    } catch (error: any) {
      toast.error(`Erro ao atualizar perfil: ${error.message}`);
    } finally {
      setSalvando(false);
    }
  };

  const handleUploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Imagem muito grande. Máximo 2MB.'); return; }
    if (!file.type.startsWith('image/')) { toast.error('Apenas imagens são permitidas'); return; }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${usuario.id}/${usuario.id}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars').upload(filePath, file, { cacheControl: '3600', upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('users').update({ avatar: publicUrl, updated_at: new Date().toISOString() }).eq('id', usuario.id);
      if (updateError) throw updateError;

      setDadosEditados(prev => ({ ...prev, avatar: publicUrl }));
      if (atualizarPerfil) atualizarPerfil({ ...usuario, avatar: publicUrl });
      toast.success('Foto atualizada com sucesso!');
    } catch (error: any) {
      toast.error(`Erro ao fazer upload da foto: ${error.message}`);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const getTipoIcon = () => {
    switch (usuario?.tipo) {
      case 'aluno':         return <BookOpen className="w-4 h-4" />;
      case 'professor':     return <GraduationCap className="w-4 h-4" />;
      case 'coordenador':   return <Users className="w-4 h-4" />;
      case 'administrador': return <Settings className="w-4 h-4" />;
      default:              return <User className="w-4 h-4" />;
    }
  };

  // ← dark mode corrigido: variantes dark: em todas as cores
  const getTipoCor = () => {
    switch (usuario?.tipo) {
      case 'aluno':         return 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200';
      case 'professor':     return 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200';
      case 'coordenador':   return 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200';
      case 'administrador': return 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200';
      default:              return 'bg-muted text-muted-foreground';
    }
  };

  const getTipoNome = () => {
    switch (usuario?.tipo) {
      case 'aluno':         return 'Aluno';
      case 'professor':     return 'Professor';
      case 'coordenador':   return 'Coordenador';
      case 'administrador': return 'Administrador';
      default:              return 'Usuário';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <User className="w-5 h-5" />
            Perfil do Usuário
          </DialogTitle>
          <DialogDescription>
            Visualize e edite suas informações pessoais e configurações da conta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">

          {/* Header do perfil — dark mode corrigido */}
          <div className="flex items-start gap-4 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-border">
            <div className="relative">
              <Avatar className="w-20 h-20 border-4 border-background shadow-lg">
                <AvatarImage src={editando ? dadosEditados.avatar : usuario?.avatar} alt={usuario?.nome || 'Usuario'} />
                <AvatarFallback className="text-lg font-semibold bg-blue-600 text-white">
                  {(() => {
                    const nome = editando ? dadosEditados.nome : usuario?.nome;
                    if (!nome) return 'U';
                    return nome.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                  })()}
                </AvatarFallback>
              </Avatar>
              {editando && (
                <div className="absolute bottom-0 right-0">
                  <label htmlFor="avatar-upload" className="cursor-pointer">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors shadow-lg">
                      {uploadingAvatar
                        ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                        : <Camera className="w-4 h-4 text-white" />}
                    </div>
                  </label>
                  <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleUploadAvatar} disabled={uploadingAvatar} />
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between gap-4">
                {editando ? (
                  <div className="flex-1">
                    <Label htmlFor="nome" className="text-sm font-medium text-foreground">Nome Completo</Label>
                    <Input
                      id="nome" value={dadosEditados.nome}
                      onChange={(e) => setDadosEditados(prev => ({ ...prev, nome: e.target.value }))}
                      className="mt-1" placeholder="Digite seu nome completo"
                    />
                  </div>
                ) : (
                  <h2 className="text-2xl font-bold text-foreground">{usuario?.nome || 'Usuário'}</h2>
                )}

                {!editando ? (
                  <Button variant="outline" size="sm" onClick={handleEditarPerfil}>
                    <Edit className="w-4 h-4 mr-2" /> Editar
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCancelarEdicao} disabled={salvando}>
                      <X className="w-4 h-4 mr-2" /> Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSalvarPerfil} disabled={salvando}>
                      {salvando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Salvar
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* ← dark mode corrigido via getTipoCor() */}
                <Badge className={getTipoCor()}>
                  {getTipoIcon()}
                  <span className="ml-1">{getTipoNome()}</span>
                </Badge>
              </div>

              {editando ? (
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground">E-mail</Label>
                  <Input
                    id="email" type="email" value={dadosEditados.email}
                    onChange={(e) => setDadosEditados(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="seu.email@exemplo.com"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">{usuario?.email || 'Email não informado'}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Informações Acadêmicas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                <School className="w-5 h-5" />
                Informações Acadêmicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {usuario?.serie && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Série:</span>
                  <Badge variant="outline">{usuario.serie}</Badge>
                </div>
              )}
              {usuario?.turma && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Turma:</span>
                  <Badge variant="outline">{usuario.turma}</Badge>
                </div>
              )}
              {usuario?.tipo === 'professor' && usuario?.disciplinas && usuario.disciplinas.length > 0 && (
                <div className="flex justify-between items-start">
                  <span className="text-sm text-muted-foreground">Disciplinas:</span>
                  <div className="flex flex-wrap gap-1 justify-end max-w-xs">
                    {usuario.disciplinas.map((disc: string, idx: number) => (
                      <Badge key={idx} variant="secondary" className="text-xs">{disc}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {!usuario?.serie && !usuario?.turma && usuario?.tipo !== 'professor' && (
                <p className="text-sm text-muted-foreground text-center py-2">Nenhuma informação acadêmica disponível.</p>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Informações da Conta */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                <Settings className="w-5 h-5" />
                Informações da Conta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge variant={usuario?.status === 'ativo' ? 'default' : 'destructive'}>
                  {usuario?.status === 'ativo' ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
              {usuario?.criado_em && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Membro desde:</span>
                  <span className="text-sm text-foreground">
                    {new Date(usuario.criado_em).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Ações */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
            <Button variant="destructive" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" /> Sair
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}