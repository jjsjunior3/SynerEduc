// src/components/EnviarComunicado.tsx
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Send, Clock, Loader2, AlertCircle, MessageSquare,
  CheckCircle, Image, X, Search, User, Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

interface EnviarComunicadoProps { onVoltar: () => void; }

interface ComunicadoForm {
  titulo: string;
  conteudo: string;
  destinatarios: string[];
  usuarioUnico: string | null; // id do usuário único selecionado
  usuarioUnicoNome: string;
  prioridade: 'baixa' | 'media' | 'alta';
  agendarEnvio: boolean;
  dataEnvio?: string;
  horaEnvio?: string;
  imagem: File | null;
}

interface GrupoDestino { id: string; label: string; tipo: string; }
interface UsuarioOpcao { id: string; nome: string; tipo: string; serie?: string; }

interface ComunicadoHistorico {
  id: string; titulo: string; conteudo: string;
  autorNome: string; publico_alvo: string;
  importante: boolean; criado_em: string; imagem_url?: string;
}

function getMesAtual() {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { inicio: fmt(inicio), fim: fmt(fim) };
}

export default function EnviarComunicado({ onVoltar }: EnviarComunicadoProps) {
  const { usuario } = useAuth();
  const mesAtual = getMesAtual();

  const [aba, setAba] = useState<'novo' | 'historico'>('novo');
  const [modoDestinatario, setModoDestinatario] = useState<'grupo' | 'individual'>('grupo');

  const [form, setForm] = useState<ComunicadoForm>({
    titulo: '', conteudo: '', destinatarios: [],
    usuarioUnico: null, usuarioUnicoNome: '',
    prioridade: 'media', agendarEnvio: false,
    imagem: null,
  });

  const [loadingEnvio, setLoadingEnvio] = useState(false);
  const [loadingHistorico, setLoadingHistorico] = useState(true);
  const [erroHistorico, setErroHistorico] = useState<string | null>(null);
  const [historico, setHistorico] = useState<ComunicadoHistorico[]>([]);
  const [grupos, setGrupos] = useState<GrupoDestino[]>([]);

  // Busca de usuário individual
  const [buscaUsuario, setBuscaUsuario] = useState('');
  const [resultadosBusca, setResultadosBusca] = useState<UsuarioOpcao[]>([]);
  const [buscando, setBuscando] = useState(false);
  const buscaRef = useRef<ReturnType<typeof setTimeout>>();

  // Filtros do histórico
  const [filtroHistoricoInicio, setFiltroHistoricoInicio] = useState(mesAtual.inicio);
  const [filtroHistoricoFim, setFiltroHistoricoFim] = useState(mesAtual.fim);

  // Preview da imagem
  const [imagemPreview, setImagemPreview] = useState<string | null>(null);
  const inputImagemRef = useRef<HTMLInputElement>(null);

  // ── Carregar grupos ──
  useEffect(() => {
    async function carregarGrupos() {
      try {
        const base: GrupoDestino[] = [
          { id: 'todos', label: 'Todos', tipo: 'todos' },
          { id: 'todos-alunos', label: 'Todos os Alunos', tipo: 'todos' },
          { id: 'todos-professores', label: 'Todos os Professores', tipo: 'todos' },
        ];
        const { data } = await supabase.from('users').select('serie').eq('tipo', 'aluno').not('serie', 'is', null);
        const series = Array.from(new Set((data || []).map((s: any) => s.serie))).sort() as string[];
        series.forEach(s => base.push({
          id: `serie-${s.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
          label: s, tipo: 'serie',
        }));
        setGrupos(base);
      } catch { /* silencioso */ }
    }
    carregarGrupos();
  }, []);

  // ── Busca de usuário individual com debounce ──
  useEffect(() => {
    if (modoDestinatario !== 'individual') return;
    if (buscaUsuario.length < 2) { setResultadosBusca([]); return; }

    clearTimeout(buscaRef.current);
    buscaRef.current = setTimeout(async () => {
      setBuscando(true);
      try {
        const { data } = await supabase
          .from('users').select('id, nome, tipo, serie')
          .ilike('nome', `%${buscaUsuario}%`)
          .in('tipo', ['aluno', 'professor'])
          .limit(10);
        setResultadosBusca(data || []);
      } catch { /* silencioso */ }
      finally { setBuscando(false); }
    }, 350);
  }, [buscaUsuario, modoDestinatario]);

  // ── Carregar histórico ──
  useEffect(() => {
    if (aba === 'historico') carregarHistorico();
  }, [aba, filtroHistoricoInicio, filtroHistoricoFim]);

  async function carregarHistorico() {
    setLoadingHistorico(true); setErroHistorico(null);
    try {
      const { data, error } = await supabase
        .from('comunicados')
        .select('*, autor:users!autor_id(nome)')
        .gte('criado_em', filtroHistoricoInicio)
        .lte('criado_em', filtroHistoricoFim + 'T23:59:59')
        .order('criado_em', { ascending: false });
      if (error) throw error;
      setHistorico((data || []).map((c: any) => ({
        id: c.id, titulo: c.titulo, conteudo: c.conteudo,
        autorNome: c.autor?.nome || 'Desconhecido',
        publico_alvo: c.publico_alvo, importante: c.importante,
        criado_em: c.criado_em, imagem_url: c.imagem_url,
      })));
    } catch (err: any) {
      setErroHistorico(err.message || 'Erro ao carregar histórico.');
    } finally { setLoadingHistorico(false); }
  }

  // ── Upload de imagem ──
  function handleImagemChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Imagem muito grande. Máximo 5MB.'); return; }
    if (!file.type.startsWith('image/')) { toast.error('Apenas imagens são permitidas.'); return; }
    setForm(p => ({ ...p, imagem: file }));
    setImagemPreview(URL.createObjectURL(file));
  }

  function removerImagem() {
    setForm(p => ({ ...p, imagem: null }));
    setImagemPreview(null);
    if (inputImagemRef.current) inputImagemRef.current.value = '';
  }

  async function uploadImagem(file: File): Promise<string | null> {
    const ext = file.name.split('.').pop();
    const path = `comunicados/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('comunicados').upload(path, file, { upsert: false });
    if (error) { toast.error('Erro ao fazer upload da imagem.'); return null; }
    const { data } = supabase.storage.from('comunicados').getPublicUrl(path);
    return data.publicUrl;
  }

  // ── Enviar comunicado ──
  async function handleEnviar() {
    if (!usuario?.id) { toast.error('Você precisa estar logado.'); return; }
    if (!form.titulo.trim() || !form.conteudo.trim()) {
      toast.error('Preencha o título e o conteúdo.');
      return;
    }

    const destinatarioFinal = modoDestinatario === 'individual'
      ? form.usuarioUnico ? `usuario-${form.usuarioUnico}` : ''
      : form.destinatarios.join(',');

    if (!destinatarioFinal) {
      toast.error(modoDestinatario === 'individual'
        ? 'Selecione um usuário.'
        : 'Selecione ao menos um destinatário.');
      return;
    }

    let dataEnvioFinal = new Date();
    if (form.agendarEnvio) {
      if (!form.dataEnvio || !form.horaEnvio) { toast.error('Informe data e hora do agendamento.'); return; }
      dataEnvioFinal = new Date(`${form.dataEnvio}T${form.horaEnvio}:00`);
      if (isNaN(dataEnvioFinal.getTime())) { toast.error('Data/hora inválida.'); return; }
      if (dataEnvioFinal < new Date()) { toast.error('Data/hora não pode ser no passado.'); return; }
    }

    setLoadingEnvio(true);
    try {
      let imagemUrl: string | null = null;
      if (form.imagem) imagemUrl = await uploadImagem(form.imagem);

      const { error } = await supabase.from('comunicados').insert({
        titulo: form.titulo.trim(),
        conteudo: form.conteudo.trim(),
        autor_id: usuario.id,
        publico_alvo: destinatarioFinal,
        importante: form.prioridade === 'alta',
        criado_em: dataEnvioFinal.toISOString(),
        imagem_url: imagemUrl,
      });

      if (error) throw error;

      toast.success(form.agendarEnvio
        ? `Comunicado agendado para ${dataEnvioFinal.toLocaleString('pt-BR')}`
        : 'Comunicado enviado com sucesso!');

      setForm({ titulo: '', conteudo: '', destinatarios: [], usuarioUnico: null, usuarioUnicoNome: '', prioridade: 'media', agendarEnvio: false, imagem: null });
      setImagemPreview(null);
      setBuscaUsuario('');
      setResultadosBusca([]);
      if (inputImagemRef.current) inputImagemRef.current.value = '';
    } catch (err: any) {
      toast.error('Erro ao enviar: ' + err.message);
    } finally { setLoadingEnvio(false); }
  }

  const formatarData = (d: string) => new Date(d).toLocaleString('pt-BR', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const getLabelDestino = (id: string) => {
    if (id.startsWith('usuario-')) return `Usuário específico`;
    return grupos.find(g => g.id === id)?.label || id;
  };

  return (
    <div className="space-y-6">

      {/* Abas */}
      <div className="flex gap-1 border-b border-border">
        {[
          { id: 'novo', icon: Send, label: 'Novo Comunicado' },
          { id: 'historico', icon: Clock, label: 'Histórico' },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setAba(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                aba === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── ABA NOVO ── */}
      {aba === 'novo' && (
        <Card>
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Send className="w-5 h-5 text-blue-600" /> Novo Comunicado
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">

            {/* Título + Prioridade */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-foreground font-medium">Título <span className="text-red-500">*</span></Label>
                <Input value={form.titulo}
                  onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
                  placeholder="Digite o título do comunicado"
                  disabled={loadingEnvio} />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground font-medium">Prioridade</Label>
                <Select value={form.prioridade}
                  onValueChange={v => setForm(p => ({ ...p, prioridade: v as any }))}
                  disabled={loadingEnvio}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta — Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="space-y-2">
              <Label className="text-foreground font-medium">Mensagem <span className="text-red-500">*</span></Label>
              <Textarea value={form.conteudo}
                onChange={e => setForm(p => ({ ...p, conteudo: e.target.value }))}
                placeholder="Digite o conteúdo do comunicado..."
                rows={6} disabled={loadingEnvio} />
            </div>

            {/* Imagem */}
            <div className="space-y-2">
              <Label className="text-foreground font-medium flex items-center gap-2">
                <Image className="w-4 h-4 text-blue-600" />
                Imagem <span className="text-muted-foreground text-xs font-normal">(opcional — máx. 5MB)</span>
              </Label>

              {imagemPreview ? (
                <div className="relative inline-block">
                  <img src={imagemPreview} alt="Preview" className="max-h-48 rounded-lg border border-border object-cover" />
                  <button
                    onClick={removerImagem}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => inputImagemRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <Image className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground">Clique para selecionar uma imagem</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP</p>
                </div>
              )}
              <input ref={inputImagemRef} type="file" accept="image/*" className="hidden" onChange={handleImagemChange} />
            </div>

            {/* Destinatários */}
            <div className="space-y-4 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <Label className="text-foreground font-medium">Destinatários <span className="text-red-500">*</span></Label>
                <div className="flex gap-1 p-0.5 bg-muted rounded-lg">
                  <button
                    onClick={() => setModoDestinatario('grupo')}
                    className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${modoDestinatario === 'grupo' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Grupos
                  </button>
                  <button
                    onClick={() => setModoDestinatario('individual')}
                    className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${modoDestinatario === 'individual' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Usuário Único
                  </button>
                </div>
              </div>

              {/* Modo grupo */}
              {modoDestinatario === 'grupo' && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {grupos.map(g => (
                    <div key={g.id} className="flex items-center gap-2">
                      <Checkbox
                        id={g.id}
                        checked={form.destinatarios.includes(g.id)}
                        onCheckedChange={c => setForm(p => ({
                          ...p,
                          destinatarios: c
                            ? [...p.destinatarios, g.id]
                            : p.destinatarios.filter(d => d !== g.id),
                        }))}
                        disabled={loadingEnvio}
                      />
                      <Label htmlFor={g.id} className="text-sm cursor-pointer text-foreground">{g.label}</Label>
                    </div>
                  ))}
                </div>
              )}

              {/* Modo individual */}
              {modoDestinatario === 'individual' && (
                <div className="space-y-3">
                  {form.usuarioUnico ? (
                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-foreground">{form.usuarioUnicoNome}</span>
                      </div>
                      <button
                        onClick={() => setForm(p => ({ ...p, usuarioUnico: null, usuarioUnicoNome: '' }))}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          className="pl-9"
                          placeholder="      Buscar aluno ou professor pelo nome..."
                          value={buscaUsuario}
                          onChange={e => setBuscaUsuario(e.target.value)}
                          disabled={loadingEnvio}
                        />
                        {buscando && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
                      </div>

                      {resultadosBusca.length > 0 && (
                        <div className="absolute z-10 top-full mt-1 w-full rounded-lg border border-border shadow-xl overflow-hidden"
                          style={{ backgroundColor: 'var(--card)' }}>
                          {resultadosBusca.map(u => (
                            <button
                              key={u.id}
                              onClick={() => {
                                setForm(p => ({ ...p, usuarioUnico: u.id, usuarioUnicoNome: u.nome }));
                                setBuscaUsuario('');
                                setResultadosBusca([]);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted text-left transition-colors"
                            >
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {u.nome.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">{u.nome}</p>
                                <p className="text-xs text-muted-foreground capitalize">
                                  {u.tipo}{u.serie ? ` • ${u.serie}` : ''}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {buscaUsuario.length >= 2 && !buscando && resultadosBusca.length === 0 && (
                        <p className="text-xs text-muted-foreground mt-2">Nenhum usuário encontrado.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Agendamento */}
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="agendarEnvio"
                  checked={form.agendarEnvio}
                  onCheckedChange={c => setForm(p => ({ ...p, agendarEnvio: c as boolean }))}
                  disabled={loadingEnvio}
                />
                <Label htmlFor="agendarEnvio" className="text-foreground cursor-pointer">Agendar envio</Label>
              </div>

              {form.agendarEnvio && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pl-6">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Data de Envio</Label>
                    <Input type="date" value={form.dataEnvio || ''}
                      onChange={e => setForm(p => ({ ...p, dataEnvio: e.target.value }))} disabled={loadingEnvio} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Hora de Envio</Label>
                    <Input type="time" value={form.horaEnvio || ''}
                      onChange={e => setForm(p => ({ ...p, horaEnvio: e.target.value }))} disabled={loadingEnvio} />
                  </div>
                </div>
              )}
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setForm({ titulo: '', conteudo: '', destinatarios: [], usuarioUnico: null, usuarioUnicoNome: '', prioridade: 'media', agendarEnvio: false, imagem: null })} disabled={loadingEnvio}>
                Limpar
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2" onClick={handleEnviar} disabled={loadingEnvio}>
                {loadingEnvio
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Enviando...</>
                  : <><Send className="w-4 h-4" />{form.agendarEnvio ? 'Agendar' : 'Enviar Agora'}</>
                }
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── ABA HISTÓRICO ── */}
      {aba === 'historico' && (
        <div className="space-y-5">

          {/* Filtro de data */}
          <Card>
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="flex items-center gap-2 text-foreground text-base">
                <Filter className="w-4 h-4 text-blue-600" /> Filtrar por Período
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">De</Label>
                  <Input type="date" value={filtroHistoricoInicio}
                    onChange={e => setFiltroHistoricoInicio(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Até</Label>
                  <Input type="date" value={filtroHistoricoFim}
                    onChange={e => setFiltroHistoricoFim(e.target.value)} />
                </div>
                <Button variant="outline" onClick={() => { setFiltroHistoricoInicio(mesAtual.inicio); setFiltroHistoricoFim(mesAtual.fim); }}>
                  Mês Atual
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lista do histórico */}
          <Card>
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="flex items-center gap-2 text-foreground text-base">
                <Clock className="w-4 h-4 text-blue-600" /> Comunicados Enviados
                <Badge variant="secondary" className="ml-1">{historico.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              {loadingHistorico ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-7 h-7 animate-spin text-blue-600 mr-2" />
                  <span className="text-muted-foreground">Carregando...</span>
                </div>
              ) : erroHistorico ? (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-red-700 dark:text-red-400 mb-2">{erroHistorico}</p>
                    <Button variant="outline" size="sm" onClick={carregarHistorico}>Tentar novamente</Button>
                  </div>
                </div>
              ) : historico.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="text-foreground font-medium text-sm mb-1">Nenhum comunicado no período</p>
                  <p className="text-muted-foreground text-xs">Ajuste as datas do filtro para ver outros períodos.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historico.map(item => (
                    <div key={item.id} className="rounded-lg border border-border bg-card p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground text-base mb-1">{item.titulo}</h3>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {item.publico_alvo.split(',').map((id, i) => (
                              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                {getLabelDestino(id.trim())}
                              </span>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Por {item.autorNome} • {formatarData(item.criado_em)}
                          </p>
                        </div>
                        <span
                          className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                          style={item.importante
                            ? { backgroundColor: '#fee2e2', color: '#7f1d1d' }
                            : { backgroundColor: '#dbeafe', color: '#1e3a8a' }
                          }
                        >
                          {item.importante ? 'Urgente' : 'Normal'}
                        </span>
                      </div>

                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-3">
                        {item.conteudo}
                      </p>

                      {item.imagem_url && (
                        <div className="mt-3">
                          <img src={item.imagem_url} alt="Imagem do comunicado"
                            className="max-h-40 rounded-lg border border-border object-cover" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}