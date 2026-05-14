import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import {
  ArrowLeft, Search, Upload, Eye, Download, CheckCircle,
  AlertCircle, Clock, Loader2, X, FileText, Trash2,
  RefreshCw, User, ChevronDown, ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Tipos ─────────────────────────────────────────────────
type TipoDoc =
  | 'foto_3x4'
  | 'rg_aluno'
  | 'rg_pai'
  | 'rg_mae'
  | 'cpf_aluno'
  | 'comprovante_residencia'
  | 'declaracao_transferencia'
  | 'boletim_escola_anterior'
  | 'outros_documentos';

type FiltroView = 'todos' | 'pendentes' | 'completos';

interface FichaResumo {
  id: string;
  aluno_id: string;
  nome_aluno: string;
  serie: string | null;
  turma: string | null;
  segmento: string;
  docs_pendentes: boolean;
  tem_acesso_portal: boolean;
  foto_3x4_url?: string | null;
}

interface Documento {
  id: string;
  ficha_id: string;
  tipo: string;
  arquivo_url: string | null;
  arquivo_nome: string | null;
  status: 'pendente' | 'recebido' | 'enviado' | 'aprovado' | 'rejeitado';
  enviado_em: string | null;
}

interface Props {
  onVoltar: () => void;
  fichaIdInicial?: string;
  nomeAlunoInicial?: string;
}

// ── Config dos slots ──────────────────────────────────────
const SLOTS: { tipo: TipoDoc; label: string; obrigatorio: boolean; aceita: string }[] = [
  { tipo: 'foto_3x4',                 label: 'Foto 3x4',                   obrigatorio: true,  aceita: 'image/*'            },
  { tipo: 'rg_aluno',                 label: 'RG do Aluno',                 obrigatorio: true,  aceita: 'image/*,application/pdf' },
  { tipo: 'rg_pai',                   label: 'RG do Pai',                   obrigatorio: false, aceita: 'image/*,application/pdf' },
  { tipo: 'rg_mae',                   label: 'RG da Mãe',                   obrigatorio: false, aceita: 'image/*,application/pdf' },
  { tipo: 'cpf_aluno',               label: 'CPF do Aluno',                obrigatorio: true,  aceita: 'image/*,application/pdf' },
  { tipo: 'comprovante_residencia',   label: 'Comprovante de Residência',   obrigatorio: true,  aceita: 'image/*,application/pdf' },
  { tipo: 'declaracao_transferencia', label: 'Declaração de Transferência', obrigatorio: false, aceita: 'image/*,application/pdf' },
  { tipo: 'boletim_escola_anterior',  label: 'Boletim Escola Anterior',     obrigatorio: false, aceita: 'image/*,application/pdf' },
  { tipo: 'outros_documentos',        label: 'Outros Documentos',           obrigatorio: false, aceita: 'image/*,application/pdf' },
];

const OBRIGATORIOS = SLOTS.filter(s => s.obrigatorio).map(s => s.tipo);

function isEnviado(d: Documento) {
  return ['recebido', 'enviado', 'aprovado'].includes(d.status);
}

// ── Componente ────────────────────────────────────────────
export function DocumentosRecebidos({ onVoltar, fichaIdInicial, nomeAlunoInicial }: Props) {
  const { usuario } = useAuth();

  const [fichas, setFichas]               = useState<FichaResumo[]>([]);
  const [loading, setLoading]             = useState(true);
  const [busca, setBusca]                 = useState('');
  const [filtro, setFiltro]               = useState<FiltroView>('todos');

  // Painel de documentos aberto (ficha selecionada)
  const [fichaAberta, setFichaAberta]     = useState<FichaResumo | null>(null);
  const [documentos, setDocumentos]       = useState<Documento[]>([]);
  const [loadingDocs, setLoadingDocs]     = useState(false);
  const [uploadingTipo, setUploadingTipo] = useState<TipoDoc | null>(null);
  const [confirmExcluir, setConfirmExcluir] = useState<Documento | null>(null);
  const [excluindo, setExcluindo]         = useState<string | null>(null);

  const inputRefs = useRef<Partial<Record<TipoDoc, HTMLInputElement | null>>>({});

  // ── Carregar fichas ───────────────────────────────────
  const carregarFichas = useCallback(async () => {
    setLoading(true);
    try {
      const seg = usuario?.segmento;
      let q = supabase
        .from('fichas_matricula')
        .select('id, aluno_id, nome_aluno, serie, turma, segmento, docs_pendentes, tem_acesso_portal, foto_3x4_url')
        .order('nome_aluno');
      if (seg && seg !== 'todos') q = q.ilike('segmento', seg);
      const { data, error } = await q;
      if (error) throw error;
      setFichas(data ?? []);

      // abrir ficha inicial se veio por contexto
      if (fichaIdInicial && data) {
        const found = data.find(f => f.id === fichaIdInicial);
        if (found) abrirFicha(found);
      }
    } catch (e: any) {
      toast.error('Erro ao carregar fichas: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [usuario?.segmento, fichaIdInicial]);

  useEffect(() => { carregarFichas(); }, [carregarFichas]);

  // ── Abrir documentos ──────────────────────────────────
  async function abrirFicha(ficha: FichaResumo) {
    if (fichaAberta?.id === ficha.id) { setFichaAberta(null); setDocumentos([]); return; }
    setFichaAberta(ficha);
    setLoadingDocs(true);
    try {
      const { data, error } = await supabase
        .from('documentos_matricula')
        .select('*')
        .eq('ficha_id', ficha.id);
      if (error) throw error;
      setDocumentos(data ?? []);
    } catch (e: any) {
      toast.error('Erro ao carregar documentos: ' + e.message);
    } finally {
      setLoadingDocs(false);
    }
  }

  // ── Upload ────────────────────────────────────────────
  async function handleUpload(tipo: TipoDoc, file: File) {
    if (!fichaAberta) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Arquivo muito grande. Máximo 10MB.'); return; }

    setUploadingTipo(tipo);
    try {
      const ext   = file.name.split('.').pop();
      const path  = `${fichaAberta.id}/${tipo}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('documentos-matricula')
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const { data: urlData } = await supabase.storage
        .from('documentos-matricula')
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      const url = urlData?.signedUrl ?? null;

      const docExistente = documentos.find(d => d.tipo === tipo);
      if (docExistente) {
        await supabase.from('documentos_matricula').update({
          arquivo_url: url, arquivo_nome: file.name,
          status: 'recebido', enviado_em: new Date().toISOString(),
        }).eq('id', docExistente.id);
      } else {
        await supabase.from('documentos_matricula').insert({
          ficha_id: fichaAberta.id, aluno_id: fichaAberta.aluno_id,
          tipo, arquivo_url: url, arquivo_nome: file.name,
          status: 'recebido', enviado_em: new Date().toISOString(),
        });
      }

      // Foto 3x4 → atualizar ficha também
      if (tipo === 'foto_3x4') {
        await supabase.from('fichas_matricula').update({ foto_3x4_url: url }).eq('id', fichaAberta.id);
        setFichaAberta(prev => prev ? { ...prev, foto_3x4_url: url } : prev);
        setFichas(prev => prev.map(f => f.id === fichaAberta.id ? { ...f, foto_3x4_url: url } : f));
      }

      // Recarregar docs e verificar pendência
      const { data: docsAtuais } = await supabase
        .from('documentos_matricula').select('tipo, status').eq('ficha_id', fichaAberta.id);
      setDocumentos(docsAtuais as Documento[] ?? []);

      const enviados = (docsAtuais ?? []).filter(d => isEnviado(d as Documento)).map(d => d.tipo);
      const todosObrig = OBRIGATORIOS.every(t => enviados.includes(t));
      if (todosObrig) {
        await supabase.from('fichas_matricula').update({ docs_pendentes: false }).eq('id', fichaAberta.id);
        setFichas(prev => prev.map(f => f.id === fichaAberta.id ? { ...f, docs_pendentes: false } : f));
        setFichaAberta(prev => prev ? { ...prev, docs_pendentes: false } : prev);
      }

      toast.success(`${SLOTS.find(s => s.tipo === tipo)?.label} enviado!`);
    } catch (e: any) {
      toast.error('Erro no upload: ' + e.message);
    } finally {
      setUploadingTipo(null);
    }
  }

  // ── Excluir ───────────────────────────────────────────
  async function confirmarExclusao() {
    if (!confirmExcluir || !fichaAberta) return;
    setExcluindo(confirmExcluir.id);
    try {
      // Remover do Storage
      const url  = confirmExcluir.arquivo_url ?? '';
      const path = url.includes('/object/sign/documentos-matricula/')
        ? decodeURIComponent(url.split('/object/sign/documentos-matricula/')[1]?.split('?')[0] ?? '')
        : url.split('/documentos-matricula/')[1]?.split('?')[0] ?? '';
      if (path) await supabase.storage.from('documentos-matricula').remove([path]);

      await supabase.from('documentos_matricula').delete().eq('id', confirmExcluir.id);

      if (confirmExcluir.tipo === 'foto_3x4') {
        await supabase.from('fichas_matricula').update({ foto_3x4_url: null }).eq('id', fichaAberta.id);
        setFichaAberta(prev => prev ? { ...prev, foto_3x4_url: null } : prev);
        setFichas(prev => prev.map(f => f.id === fichaAberta.id ? { ...f, foto_3x4_url: null } : f));
      }

      setDocumentos(prev => prev.filter(d => d.id !== confirmExcluir.id));

      // Verificar se ficou com pendência
      const restantes = documentos.filter(d => d.id !== confirmExcluir.id);
      const enviados  = restantes.filter(isEnviado).map(d => d.tipo);
      const temPend   = !OBRIGATORIOS.every(t => enviados.includes(t));
      if (temPend) {
        await supabase.from('fichas_matricula').update({ docs_pendentes: true }).eq('id', fichaAberta.id);
        setFichas(prev => prev.map(f => f.id === fichaAberta.id ? { ...f, docs_pendentes: true } : f));
      }

      toast.success('Documento excluído.');
    } catch (e: any) {
      toast.error('Erro ao excluir: ' + e.message);
    } finally {
      setExcluindo(null);
      setConfirmExcluir(null);
    }
  }

  // ── Contadores ────────────────────────────────────────
  const totalAlunos    = fichas.length;
  const totalCompletos = fichas.filter(f => !f.docs_pendentes).length;
  const totalPendentes = fichas.filter(f => f.docs_pendentes).length;

  // ── Lista filtrada ────────────────────────────────────
  const listaFiltrada = fichas.filter(f => {
    const matchBusca  = !busca.trim() || f.nome_aluno.toLowerCase().includes(busca.toLowerCase()) || (f.serie ?? '').toLowerCase().includes(busca.toLowerCase());
    const matchFiltro = filtro === 'todos' ? true : filtro === 'completos' ? !f.docs_pendentes : f.docs_pendentes;
    return matchBusca && matchFiltro;
  });

  // ── Progresso da ficha aberta ─────────────────────────
  const docsEnviados   = documentos.filter(isEnviado);
  const pctProgresso   = documentos.length > 0 ? Math.round((docsEnviados.length / SLOTS.length) * 100) : 0;

  // ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onVoltar}
            className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Documentos Recebidos</h2>
            <p className="text-sm text-muted-foreground">Gerenciar documentação de matrículas</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={carregarFichas} disabled={loading}
          className="border-border text-foreground hover:bg-muted">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
      </div>

      {/* Contadores — clicáveis como filtro */}
      <div className="grid grid-cols-3 gap-4">
        {([
          { id: 'todos'     as FiltroView, label: 'Total de Alunos',  valor: totalAlunos,    cor: 'border-blue-200 dark:border-blue-800',   numCor: 'text-blue-600 dark:text-blue-400',   bgIcon: 'bg-blue-100 dark:bg-blue-900/40',   icon: <User        className="w-5 h-5 text-blue-600 dark:text-blue-400" /> },
          { id: 'completos' as FiltroView, label: 'Docs Completos',   valor: totalCompletos, cor: 'border-green-200 dark:border-green-800', numCor: 'text-green-600 dark:text-green-400', bgIcon: 'bg-green-100 dark:bg-green-900/40', icon: <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" /> },
          { id: 'pendentes' as FiltroView, label: 'Com Pendências',   valor: totalPendentes, cor: 'border-orange-200 dark:border-orange-800', numCor: 'text-orange-600 dark:text-orange-400', bgIcon: 'bg-orange-100 dark:bg-orange-900/40', icon: <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" /> },
        ] as const).map(c => (
          <button key={c.id} onClick={() => setFiltro(filtro === c.id ? 'todos' : c.id)}
            className={`p-4 rounded-xl border-2 text-left bg-card transition-all hover:shadow-md ${
              filtro === c.id ? 'ring-2 ring-offset-1 ring-blue-500' : c.cor
            }`}>
            <div className="flex items-center justify-between mb-2">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.bgIcon}`}>{c.icon}</div>
              {filtro === c.id && <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Filtrando</span>}
            </div>
            <p className={`text-2xl font-bold ${c.numCor}`}>{loading ? '—' : c.valor}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{c.label}</p>
          </button>
        ))}
      </div>

      {/* Busca */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar aluno por nome ou série..."
              className="pl-9 bg-background border-border text-foreground"
              value={busca} onChange={e => setBusca(e.target.value)} />
            {busca && (
              <button onClick={() => setBusca('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {(busca || filtro !== 'todos') && !loading && (
            <p className="text-xs text-muted-foreground mt-2">{listaFiltrada.length} aluno(s) encontrado(s)</p>
          )}
        </CardContent>
      </Card>

      {/* Tabela de alunos */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base text-foreground">Lista de Alunos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : listaFiltrada.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Nenhuma ficha encontrada.</div>
          ) : (
            <div>
              {listaFiltrada.map(f => {
                const aberta = fichaAberta?.id === f.id;
                return (
                  <div key={f.id}>
                    {/* Linha da tabela */}
                    <div className={`flex items-center gap-4 px-5 py-3.5 border-b border-border hover:bg-muted/40 transition-colors ${aberta ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>

                      {/* Foto ou avatar */}
                      {f.foto_3x4_url ? (
                        <img src={f.foto_3x4_url} alt={f.nome_aluno}
                          className="w-9 h-11 rounded object-cover border border-border flex-shrink-0" />
                      ) : (
                        <div className="w-9 h-11 rounded bg-muted flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}

                      {/* Nome e série */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{f.nome_aluno}</p>
                        <p className="text-xs text-muted-foreground">
                          {f.serie ?? '—'}{f.turma ? ` · Turma ${f.turma}` : ''} · {f.segmento}
                        </p>
                      </div>

                      {/* Portal */}
                      <div className="hidden sm:block w-28">
                        {f.tem_acesso_portal
                          ? <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/40 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" /> Ativo</span>
                          : <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full"><Clock className="w-3 h-3" /> Sem acesso</span>
                        }
                      </div>

                      {/* Documentação */}
                      <div className="hidden sm:block w-32">
                        {f.docs_pendentes
                          ? <span className="inline-flex items-center gap-1 text-xs text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/40 px-2 py-0.5 rounded-full"><AlertCircle className="w-3 h-3" /> Pendente</span>
                          : <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/40 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" /> Completo</span>
                        }
                      </div>

                      {/* Botão gerenciar */}
                      <Button size="sm" onClick={() => abrirFicha(f)}
                        className={`text-xs min-w-[100px] ${aberta ? 'bg-muted text-foreground border border-border hover:bg-muted/80' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                        {aberta ? <><ChevronUp className="w-3 h-3 mr-1" /> Fechar</> : <><Upload className="w-3 h-3 mr-1" /> Gerenciar</>}
                      </Button>
                    </div>

                    {/* Painel de documentos — expande abaixo da linha */}
                    {aberta && (
                      <div className="border-b-2 border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10 px-5 py-5">

                        {loadingDocs ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          <>
                            {/* Foto 3x4 preview se existir */}
                            {f.foto_3x4_url && (
                              <div className="flex items-center gap-3 mb-4 p-3 bg-card border border-border rounded-lg w-fit">
                                <img src={f.foto_3x4_url} alt="Foto 3x4"
                                  className="w-14 h-18 object-cover rounded border border-border" style={{ height: '4.5rem' }} />
                                <div>
                                  <p className="text-xs font-medium text-foreground">Foto 3x4 recebida</p>
                                  <p className="text-xs text-muted-foreground">Usada na ficha de matrícula</p>
                                </div>
                              </div>
                            )}

                            {/* Grid de documentos */}
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {SLOTS.map(slot => {
                                const doc     = documentos.find(d => d.tipo === slot.tipo);
                                const enviado = doc ? isEnviado(doc) : false;
                                const subindo = uploadingTipo === slot.tipo;
                                const excl    = excluindo === doc?.id;

                                return (
                                  <div key={slot.tipo}
                                    className={`rounded-lg border-2 p-3.5 bg-card transition-colors ${
                                      enviado
                                        ? 'border-green-300 dark:border-green-700'
                                        : slot.obrigatorio
                                        ? 'border-orange-200 dark:border-orange-800'
                                        : 'border-border'
                                    }`}>
                                    <div className="flex items-start justify-between mb-2">
                                      <div>
                                        <p className="text-xs font-semibold text-foreground">{slot.label}</p>
                                        {slot.obrigatorio
                                          ? <span className="text-xs text-orange-600 dark:text-orange-400">Obrigatório</span>
                                          : <span className="text-xs text-muted-foreground">Opcional</span>
                                        }
                                      </div>
                                      {enviado
                                        ? <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                                        : <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                                      }
                                    </div>

                                    {enviado && doc?.arquivo_nome && (
                                      <p className="text-xs text-muted-foreground mb-2 truncate" title={doc.arquivo_nome}>
                                        {doc.arquivo_nome}
                                      </p>
                                    )}

                                    <div className="flex gap-1.5 flex-wrap">
                                      {/* Ver */}
                                      {enviado && doc?.arquivo_url && (
                                        <a href={doc.arquivo_url} target="_blank" rel="noreferrer">
                                          <Button size="sm" variant="outline"
                                            className="text-xs border-border text-foreground hover:bg-muted h-7 px-2">
                                            <Eye className="w-3 h-3 mr-1" /> Ver
                                          </Button>
                                        </a>
                                      )}
                                      {/* Baixar */}
                                      {enviado && doc?.arquivo_url && (
                                        <a href={doc.arquivo_url} download={doc.arquivo_nome ?? true}>
                                          <Button size="sm" variant="outline"
                                            className="text-xs border-border text-foreground hover:bg-muted h-7 px-2">
                                            <Download className="w-3 h-3 mr-1" /> Baixar
                                          </Button>
                                        </a>
                                      )}

                                      {/* Upload */}
                                      <input type="file" accept={slot.aceita} className="hidden"
                                        ref={el => { inputRefs.current[slot.tipo] = el; }}
                                        onChange={e => {
                                          const file = e.target.files?.[0];
                                          if (file) handleUpload(slot.tipo, file);
                                          e.target.value = '';
                                        }} />
                                      <Button size="sm" disabled={subindo}
                                        onClick={() => inputRefs.current[slot.tipo]?.click()}
                                        className={`text-xs h-7 px-2 ${enviado ? 'bg-muted text-foreground hover:bg-muted/80 border border-border' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                                        {subindo
                                          ? <Loader2 className="w-3 h-3 animate-spin" />
                                          : <><Upload className="w-3 h-3 mr-1" />{enviado ? 'Substituir' : 'Anexar'}</>
                                        }
                                      </Button>

                                      {/* Excluir */}
                                      {doc && (
                                        <Button size="sm" variant="outline" disabled={excl}
                                          onClick={() => setConfirmExcluir(doc)}
                                          className="text-xs h-7 px-2 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                                          {excl ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Barra de progresso */}
                            <div className="mt-4 p-3 bg-card border border-border rounded-lg">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-semibold text-foreground">Progresso</span>
                                <span className="text-xs text-muted-foreground">{docsEnviados.length}/{SLOTS.length} documentos</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-500 ${pctProgresso === 100 ? 'bg-green-500' : pctProgresso >= 50 ? 'bg-yellow-500' : 'bg-orange-500'}`}
                                  style={{ width: `${pctProgresso}%` }} />
                              </div>
                              <p className={`text-xs mt-1.5 flex items-center gap-1 ${pctProgresso === 100 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                {pctProgresso === 100
                                  ? <><CheckCircle className="w-3 h-3" /> Documentação completa!</>
                                  : <><AlertCircle className="w-3 h-3" /> Documentação incompleta</>
                                }
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal confirmação de exclusão */}
      {confirmExcluir && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="bg-card border-border w-full max-w-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Excluir documento</p>
                  <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita</p>
                </div>
              </div>
              <p className="text-sm text-foreground mb-6">
                Deseja excluir <span className="font-medium">{SLOTS.find(s => s.tipo === confirmExcluir.tipo)?.label ?? confirmExcluir.tipo}</span> de <span className="font-medium">{fichaAberta?.nome_aluno}</span>?
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 border-border" onClick={() => setConfirmExcluir(null)}>Cancelar</Button>
                <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={confirmarExclusao}>Excluir</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}