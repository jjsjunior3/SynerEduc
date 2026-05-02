// src/components/ComunicadosPage.tsx
/**
 * ComunicadosPage - Para Alunos e Professores
 * Exibe comunicados gerais da escola, filtrados por destinatário e segmento.
 * Suporta visualização de imagens/arquivos anexados (imagem_url).
 */

import { useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useSegmento } from '../hooks/useSegmento';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import {
  MessageSquare, Calendar, User, Loader2, Eye,
  AlertCircle, Info, Search, FileText, Download, Image as ImageIcon,
  Megaphone, ChevronRight, Paperclip, ExternalLink, X,
} from 'lucide-react';
import { toast } from 'sonner';

interface Comunicado {
  id: string;
  titulo: string;
  conteudo: string;
  autorNome: string;
  dataPublicacao: string;
  importante: boolean;
  destinatariosDisplay: string[];
  publico_alvo_raw: string;
  imagem_url: string | null;
}

interface ComunicadosPageProps {
  onVoltar: () => void;
}

function isImageUrl(url: string): boolean {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase() || '';
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
}

function getFileName(url: string): string {
  try {
    const path = new URL(url).pathname;
    return decodeURIComponent(path.split('/').pop() || 'arquivo');
  } catch {
    return url.split('/').pop() || 'arquivo';
  }
}

function getFileInfo(url: string): { label: string; isPdf: boolean; isImage: boolean } {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext))
    return { label: 'Imagem', isPdf: false, isImage: true };
  if (ext === 'pdf')
    return { label: 'PDF', isPdf: true, isImage: false };
  return { label: 'Arquivo', isPdf: false, isImage: false };
}

export default function ComunicadosPage({ onVoltar }: ComunicadosPageProps) {
  const { usuario } = useAuth();
  const { segmento } = useSegmento();

  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [gruposDestinoMap, setGruposDestinoMap] = useState<Map<string, string>>(new Map());
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'importante' | 'geral'>('todos');
  const [comunicadoAberto, setComunicadoAberto] = useState<Comunicado | null>(null);
  const [imagemExpandida, setImagemExpandida] = useState<string | null>(null);

  useEffect(() => {
    const carregarGruposDestino = async () => {
      const map = new Map<string, string>();
      map.set('todos-alunos', 'Todos os Alunos');
      map.set('todos-professores', 'Todos os Professores');
      map.set('todos-responsaveis', 'Todos os Responsáveis');

      const { data: seriesData } = await supabase
        .from('users')
        .select('serie')
        .eq('tipo', 'aluno')
        .not('serie', 'is', null)
        .order('serie', { ascending: true });

      if (seriesData) {
        const seriesUnicas = Array.from(new Set(seriesData.map((s: any) => s.serie)));
        seriesUnicas.forEach(serie => {
          if (serie) map.set(`serie-${(serie as string).toLowerCase().replace(/\s/g, '')}`, serie as string);
        });
      }
      setGruposDestinoMap(map);
    };
    carregarGruposDestino();
  }, []);

  useEffect(() => {
    if (gruposDestinoMap.size > 0) carregarComunicados();
  }, [usuario?.id, gruposDestinoMap, segmento]);

  const carregarComunicados = async () => {
    if (!usuario?.id || gruposDestinoMap.size === 0) return;
    try {
      setLoading(true);
      setErro(null);

      const { data, error } = await supabase
        .from('comunicados')
        .select(`
          id, titulo, conteudo, autor_id, publico_alvo,
          importante, criado_em, imagem_url,
          autor:users!comunicados_autor_id_fkey(nome)
        `)
        .in('segmento', [segmento, 'todos'])   // ← filtro por segmento
        .order('criado_em', { ascending: false });

      if (error) throw new Error(error.message);

      const comunicadosFiltrados: Comunicado[] = [];

      (data || []).forEach((c: any) => {
        const publicoAlvoArray = (c.publico_alvo || '')
          .split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
        let isDestinatario = false;

        if (publicoAlvoArray.length === 0) {
          isDestinatario = true;
        } else if (usuario.tipo === 'administrador' || usuario.tipo === 'coordenador') {
          isDestinatario = true;
        } else if (usuario.tipo === 'aluno') {
          const serieAluno = (usuario.serie || '').toLowerCase().replace(/\s/g, '');
          isDestinatario = publicoAlvoArray.some((alvo: string) =>
            alvo === 'todos' || alvo === 'todos-alunos' || alvo === 'alunos' ||
            alvo === `serie-${serieAluno}` || alvo === serieAluno
          );
        } else if (usuario.tipo === 'professor') {
          isDestinatario = publicoAlvoArray.some((alvo: string) =>
            alvo === 'todos' || alvo === 'todos-professores' || alvo === 'professores'
          );
        } else if (usuario.tipo === 'responsavel') {
          isDestinatario = publicoAlvoArray.some((alvo: string) =>
            alvo === 'todos' || alvo === 'todos-responsaveis' || alvo === 'responsaveis'
          );
        }

        if (isDestinatario) {
          const publicoOriginal = (c.publico_alvo || '')
            .split(',').map((s: string) => s.trim()).filter(Boolean);
          const destinatariosDisplay = publicoOriginal
            .map((alvo: string) => gruposDestinoMap.get(alvo) || gruposDestinoMap.get(alvo.toLowerCase()))
            .filter(Boolean) as string[];

          comunicadosFiltrados.push({
            id: c.id, titulo: c.titulo, conteudo: c.conteudo,
            autorNome: c.autor?.nome || 'Coordenação',
            dataPublicacao: c.criado_em,
            importante: c.importante || false,
            destinatariosDisplay,
            publico_alvo_raw: c.publico_alvo,
            imagem_url: c.imagem_url || null,
          });
        }
      });

      setComunicados(comunicadosFiltrados);
    } catch (error: any) {
      setErro(error.message || 'Erro ao carregar comunicados.');
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (data: string) =>
    new Date(data).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

  const formatarDataHora = (data: string) =>
    new Date(data).toLocaleString('pt-BR', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

  const tempoRelativo = (data: string) => {
    const diff = new Date().getTime() - new Date(data).getTime();
    const horas = Math.floor(diff / (1000 * 60 * 60));
    if (horas < 1) return 'Agora mesmo';
    if (horas < 24) return `${horas}h atrás`;
    const dias = Math.floor(horas / 24);
    if (dias === 1) return 'Ontem';
    if (dias < 7) return `${dias} dias atrás`;
    return formatarData(data);
  };

  const comunicadosFiltrados = comunicados.filter(c => {
    if (filtroTipo === 'importante' && !c.importante) return false;
    if (filtroTipo === 'geral' && c.importante) return false;
    if (busca.trim()) {
      const termo = busca.toLowerCase();
      return c.titulo.toLowerCase().includes(termo) ||
             c.conteudo.toLowerCase().includes(termo) ||
             c.autorNome.toLowerCase().includes(termo);
    }
    return true;
  });

  const totalImportantes = comunicados.filter(c => c.importante).length;

  return (
    <div className="space-y-6">

      {/* Header com contadores */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-blue-600" />
            Comunicados da Escola
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Avisos e informações importantes da coordenação
          </p>
        </div>
        {!loading && (
          <div className="flex items-center gap-3">
            {/* ← dark mode corrigido: classes Tailwind no lugar de style inline */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40">
              <MessageSquare className="w-4 h-4 text-blue-800 dark:text-blue-200" />
              <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                {comunicados.length} comunicado{comunicados.length !== 1 ? 's' : ''}
              </span>
            </div>
            {totalImportantes > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/40">
                <AlertCircle className="w-4 h-4 text-red-700 dark:text-red-300" />
                <span className="text-sm font-semibold text-red-700 dark:text-red-300">
                  {totalImportantes} importante{totalImportantes !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Pesquisar comunicados..."
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <Select value={filtroTipo} onValueChange={v => setFiltroTipo(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="importante">Importantes</SelectItem>
                  <SelectItem value="geral">Gerais</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conteúdo */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mr-3" />
          <span className="text-muted-foreground">Carregando comunicados...</span>
        </div>
      ) : erro ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground mb-1">Erro ao carregar comunicados</p>
                <p className="text-sm text-muted-foreground mb-3">{erro}</p>
                <Button variant="outline" size="sm" onClick={carregarComunicados}>Tentar novamente</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : comunicadosFiltrados.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-20" />
            <p className="text-foreground font-medium mb-1">
              {busca.trim() ? 'Nenhum comunicado encontrado' : 'Nenhum comunicado disponível'}
            </p>
            <p className="text-sm text-muted-foreground">
              {busca.trim()
                ? 'Tente ajustar a busca ou limpar os filtros.'
                : 'Quando houver novos comunicados, eles aparecerão aqui.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {comunicadosFiltrados.map(comunicado => {
            const fileInfo = comunicado.imagem_url ? getFileInfo(comunicado.imagem_url) : null;
            return (
              <Card
                key={comunicado.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setComunicadoAberto(comunicado)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">

                    {/* Ícone lateral */}
                    <div className="flex-shrink-0 mt-0.5">
                      {comunicado.importante ? (
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-100 dark:bg-red-900/30">
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-100 dark:bg-blue-900/30">
                          <Info className="w-5 h-5 text-blue-500" />
                        </div>
                      )}
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      {comunicado.importante && (
                        <div className="mb-1.5">
                          {/* ← dark mode corrigido */}
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                            Importante
                          </span>
                        </div>
                      )}

                      <h3 className="font-semibold pb-3 text-foreground text-base leading-snug mb-1.5">
                        {comunicado.titulo}
                      </h3>

                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-3">
                        {comunicado.conteudo}
                      </p>

                      {/* Arquivo anexo */}
                      {comunicado.imagem_url && fileInfo && (
                        <div
                          className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg border border-border bg-muted/30 w-fit"
                          onClick={e => e.stopPropagation()}
                        >
                          {fileInfo.isImage
                            ? <ImageIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            : <Paperclip className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {getFileName(comunicado.imagem_url)}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
                            {fileInfo.label}
                          </span>
                        </div>
                      )}

                      {/* Rodapé */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span className="truncate max-w-[150px]">{comunicado.autorNome}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{tempoRelativo(comunicado.dataPublicacao)}</span>
                        </div>
                        {comunicado.destinatariosDisplay.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            <span>{comunicado.destinatariosDisplay.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-2" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Modal de detalhes ── */}
      <Dialog open={!!comunicadoAberto} onOpenChange={open => { if (!open) setComunicadoAberto(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {comunicadoAberto && (() => {
            const fileInfo = comunicadoAberto.imagem_url ? getFileInfo(comunicadoAberto.imagem_url) : null;
            return (
              <>
                <DialogHeader className="pb-4 border-b border-border">
                  <div className="space-y-3">
                    {comunicadoAberto.importante && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full w-fit bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Importante
                      </span>
                    )}
                    <DialogTitle className="text-foreground text-lg leading-tight">
                      {comunicadoAberto.titulo}
                    </DialogTitle>
                    <div className="flex flex-wrap p-2 items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center pb-2 gap-1.5">
                        <User className="w-4 h-4" />
                        <span>{comunicadoAberto.autorNome}</span>
                      </div>
                      <div className="flex py-2 items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        <span>{formatarDataHora(comunicadoAberto.dataPublicacao)}</span>
                      </div>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-5 py-5">
                  <div className="text-sm p-2 text-foreground leading-relaxed whitespace-pre-wrap">
                    {comunicadoAberto.conteudo}
                  </div>

                  {/* Arquivo/Imagem anexado */}
                  {comunicadoAberto.imagem_url && fileInfo && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        <Paperclip className="w-3.5 h-3.5" />
                        Anexo
                      </div>

                      {fileInfo.isImage && (
                        <div
                          className="relative rounded-xl overflow-hidden border border-border cursor-pointer group"
                          onClick={() => {
                            const url = comunicadoAberto.imagem_url;
                            setComunicadoAberto(null);
                            setTimeout(() => setImagemExpandida(url), 150);
                          }}
                        >
                          <img
                            src={comunicadoAberto.imagem_url}
                            alt="Anexo do comunicado"
                            className="w-full max-h-[400px] object-contain bg-muted/30"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white text-xs font-medium px-3 py-1.5 rounded-full">
                              Clique para ampliar
                            </span>
                          </div>
                        </div>
                      )}

                      {!fileInfo.isImage && (
                        <div className="rounded-xl border border-border p-4 bg-muted/20">
                          <div className="flex items-center gap-3">
                            {/* ← dark mode corrigido */}
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              fileInfo.isPdf
                                ? 'bg-red-100 dark:bg-red-900/30'
                                : 'bg-blue-100 dark:bg-blue-900/30'
                            }`}>
                              <FileText className={`w-6 h-6 ${
                                fileInfo.isPdf
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-blue-600 dark:text-blue-400'
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {getFileName(comunicadoAberto.imagem_url)}
                              </p>
                              <p className="text-xs text-muted-foreground">{fileInfo.label}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline" size="sm" className="gap-1.5"
                                onClick={() => window.open(comunicadoAberto.imagem_url!, '_blank')}
                              >
                                <ExternalLink className="w-4 h-4" /> Abrir
                              </Button>
                              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                                <a href={comunicadoAberto.imagem_url!} download target="_blank" rel="noopener noreferrer">
                                  <Download className="w-4 h-4" /> Baixar
                                </a>
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Destinatários */}
                  {comunicadoAberto.destinatariosDisplay.length > 0 && (
                    <div className="rounded-lg p-4 border border-border bg-muted/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">Destinatários</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {comunicadoAberto.destinatariosDisplay.map((dest, i) => (
                          <span key={i} className="text-xs px-2.5 py-1 rounded-full border border-border bg-background text-foreground font-medium">
                            {dest}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Overlay imagem expandida ── */}
      {imagemExpandida && (
        <div
          className="fixed inset-0 z-[99999] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setImagemExpandida(null)}
        >
          <Button
            variant="ghost" size="icon"
            className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full"
            onClick={e => { e.stopPropagation(); setImagemExpandida(null); }}
          >
            <X className="w-5 h-5" />
          </Button>
          <img
            src={imagemExpandida}
            alt="Imagem ampliada"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            <Button
              variant="outline" size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 gap-1.5"
              onClick={e => { e.stopPropagation(); window.open(imagemExpandida!, '_blank'); }}
            >
              <ExternalLink className="w-4 h-4" /> Abrir original
            </Button>
            <Button
              variant="outline" size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 gap-1.5"
              onClick={e => e.stopPropagation()}
              asChild
            >
              <a href={imagemExpandida!} download target="_blank" rel="noopener noreferrer">
                <Download className="w-4 h-4" /> Baixar
              </a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}