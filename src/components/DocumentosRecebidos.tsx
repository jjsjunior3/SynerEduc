import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import {
  ArrowLeft, Search, Upload, Eye, Download,
  CheckCircle, AlertCircle, Clock, Loader2, X, FileText,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Tipos ───────────────────────────────────────────────
interface DocumentosRecebidosProps {
  onVoltar: () => void;
}

interface FichaResumo {
  id: string;
  nome_aluno: string;
  serie: string | null;
  turma: string | null;
  docs_pendentes: boolean;
  tem_acesso_portal: boolean;
}

interface Documento {
  id: string;
  ficha_id: string;
  tipo: TipoDoc;
  arquivo_url: string | null;
  arquivo_nome: string | null;
  status: 'pendente' | 'enviado' | 'aprovado' | 'rejeitado';
  enviado_em: string | null;
}

type TipoDoc =
  | 'rg_responsavel'
  | 'rg_aluno'
  | 'comprovante_residencia'
  | 'foto_3x4'
  | 'historico_anterior'
  | 'comprovante_renda';

const DOCS_CONFIG: Record<TipoDoc, { label: string; aceita: string }> = {
  rg_responsavel:        { label: 'RG do Responsável',         aceita: 'image/*,application/pdf' },
  rg_aluno:              { label: 'RG do Aluno',               aceita: 'image/*,application/pdf' },
  comprovante_residencia:{ label: 'Comprovante de Residência', aceita: 'image/*,application/pdf' },
  foto_3x4:              { label: 'Foto 3x4',                  aceita: 'image/*' },
  historico_anterior:    { label: 'Histórico Escolar Anterior',aceita: 'image/*,application/pdf' },
  comprovante_renda:     { label: 'Comprovante de Renda',      aceita: 'image/*,application/pdf' },
};

const TIPOS_DOC = Object.keys(DOCS_CONFIG) as TipoDoc[];

// ─── Componente principal ─────────────────────────────────
export function DocumentosRecebidos({ onVoltar }: DocumentosRecebidosProps) {
  const [fichas, setFichas]               = useState<FichaResumo[]>([]);
  const [busca, setBusca]                 = useState('');
  const [loading, setLoading]             = useState(true);
  const [fichaAberta, setFichaAberta]     = useState<FichaResumo | null>(null);
  const [documentos, setDocumentos]       = useState<Documento[]>([]);
  const [loadingDocs, setLoadingDocs]     = useState(false);
  const [uploadingTipo, setUploadingTipo] = useState<TipoDoc | null>(null);
  const inputRefs = useRef<Partial<Record<TipoDoc, HTMLInputElement | null>>>({});

  // ── Carregar fichas ──────────────────────────────────
  useEffect(() => {
    carregarFichas();
  }, []);

  async function carregarFichas() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fichas_matricula')
        .select('id, nome_aluno, serie, turma, docs_pendentes, tem_acesso_portal')
        .order('nome_aluno');
      if (error) throw error;
      setFichas(data ?? []);
    } catch (e: any) {
      toast.error('Erro ao carregar fichas: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Abrir documentos de uma ficha ────────────────────
  async function abrirFicha(ficha: FichaResumo) {
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

  // ── Upload de documento ──────────────────────────────
  async function handleUpload(tipo: TipoDoc, file: File) {
    if (!fichaAberta) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 5MB.');
      return;
    }

    setUploadingTipo(tipo);
    try {
      const ext      = file.name.split('.').pop();
      const caminho  = `${fichaAberta.id}/${tipo}.${ext}`;

      // Upload no storage
      const { error: upErr } = await supabase.storage
        .from('documentos-matricula')
        .upload(caminho, file, { upsert: true });
      if (upErr) throw upErr;

      // URL pública (bucket privado → signed URL)
      const { data: urlData } = await supabase.storage
        .from('documentos-matricula')
        .createSignedUrl(caminho, 60 * 60 * 24 * 7); // 7 dias

      const url = urlData?.signedUrl ?? null;

      // Upsert no banco
      const docExistente = documentos.find(d => d.tipo === tipo);
      if (docExistente) {
        const { error } = await supabase
          .from('documentos_matricula')
          .update({
            arquivo_url:  url,
            arquivo_nome: file.name,
            status:       'enviado',
            enviado_em:   new Date().toISOString(),
          })
          .eq('id', docExistente.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('documentos_matricula')
          .insert({
            ficha_id:     fichaAberta.id,
            tipo,
            arquivo_url:  url,
            arquivo_nome: file.name,
            status:       'enviado',
            enviado_em:   new Date().toISOString(),
          });
        if (error) throw error;
      }

      // Atualizar lista local
      await abrirFicha(fichaAberta);

      // Verificar se todos foram enviados → atualizar docs_pendentes
      const { data: docsAtuais } = await supabase
        .from('documentos_matricula')
        .select('tipo')
        .eq('ficha_id', fichaAberta.id)
        .in('status', ['enviado', 'aprovado']);

      const tiposEnviados = (docsAtuais ?? []).map((d: any) => d.tipo);
      const todosEnviados = TIPOS_DOC.every(t => tiposEnviados.includes(t));

      if (todosEnviados) {
        await supabase
          .from('fichas_matricula')
          .update({ docs_pendentes: false })
          .eq('id', fichaAberta.id);

        setFichaAberta(prev => prev ? { ...prev, docs_pendentes: false } : prev);
        setFichas(prev => prev.map(f =>
          f.id === fichaAberta.id ? { ...f, docs_pendentes: false } : f
        ));
      }

      toast.success(`${DOCS_CONFIG[tipo].label} enviado com sucesso!`);
    } catch (e: any) {
      toast.error('Erro no upload: ' + e.message);
    } finally {
      setUploadingTipo(null);
    }
  }

  // ── Filtro de busca ──────────────────────────────────
  const fichasFiltradas = fichas.filter(f =>
    !busca.trim() ||
    f.nome_aluno.toLowerCase().includes(busca.toLowerCase()) ||
    (f.serie ?? '').toLowerCase().includes(busca.toLowerCase())
  );

  const pendentes = fichas.filter(f => f.docs_pendentes);

  // ── Progresso por ficha ──────────────────────────────
  function progresso(fichaId: string) {
    if (fichaAberta?.id !== fichaId) return null;
    const enviados = TIPOS_DOC.filter(t =>
      documentos.some(d => d.tipo === t && ['enviado', 'aprovado'].includes(d.status))
    ).length;
    return { enviados, total: TIPOS_DOC.length, pct: Math.round((enviados / TIPOS_DOC.length) * 100) };
  }

  // ─── Render ───────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onVoltar}
          className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Documentos Recebidos</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Gerenciar documentação de matrículas
          </p>
        </div>
      </div>

      {/* Alerta de pendentes */}
      {pendentes.length > 0 && (
        <Card className="border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-orange-800 dark:text-orange-200">
                {pendentes.length} {pendentes.length === 1 ? 'aluno com' : 'alunos com'} documentação pendente
              </p>
              <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                Existem alunos aguardando envio de documentos para finalizar a matrícula.
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {pendentes.slice(0, 5).map(f => (
                  <button key={f.id}
                    onClick={() => abrirFicha(f)}
                    className="text-xs bg-orange-200 dark:bg-orange-800 text-orange-900 dark:text-orange-100 px-2 py-0.5 rounded-full hover:bg-orange-300 dark:hover:bg-orange-700 transition-colors">
                    {f.nome_aluno}
                  </button>
                ))}
                {pendentes.length > 5 && (
                  <span className="text-xs text-orange-600 dark:text-orange-400">
                    +{pendentes.length - 5} outros
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Busca */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar aluno por nome ou série..."
              className="pl-9 bg-background border-border text-foreground"
              value={busca}
              onChange={e => setBusca(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Lista de fichas */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base text-foreground">
            Lista de Alunos e Status de Documentação
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : fichasFiltradas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Nenhuma ficha de matrícula encontrada.
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-muted border-b border-border">
                <tr>
                  {['Nome', 'Série/Turma', 'Portal', 'Documentação', 'Ações'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {fichasFiltradas.map(f => (
                  <tr key={f.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-foreground">{f.nome_aluno}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">
                      {f.serie ?? '—'}{f.turma ? ` - Turma ${f.turma}` : ''}
                    </td>
                    <td className="px-5 py-3">
                      {f.tem_acesso_portal
                        ? <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/40 px-2 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3" /> Ativo
                          </span>
                        : <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" /> Sem acesso
                          </span>
                      }
                    </td>
                    <td className="px-5 py-3">
                      {f.docs_pendentes
                        ? <span className="inline-flex items-center gap-1 text-xs text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/40 px-2 py-0.5 rounded-full">
                            <AlertCircle className="w-3 h-3" /> Pendente
                          </span>
                        : <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/40 px-2 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3" /> Completo
                          </span>
                      }
                    </td>
                    <td className="px-5 py-3">
                      <Button size="sm"
                        onClick={() => fichaAberta?.id === f.id ? setFichaAberta(null) : abrirFicha(f)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                        <Upload className="w-3 h-3 mr-1" />
                        {fichaAberta?.id === f.id ? 'Fechar' : 'Gerenciar'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Painel de documentos */}
      {fichaAberta && (
        <Card className="bg-card border-blue-300 dark:border-blue-700 border-2">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-foreground">
                  Documentos de {fichaAberta.nome_aluno}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {fichaAberta.serie ?? '—'}{fichaAberta.turma ? ` - Turma ${fichaAberta.turma}` : ''}
                </p>
              </div>
              <Button variant="ghost" size="icon"
                onClick={() => setFichaAberta(null)}
                className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            {loadingDocs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {TIPOS_DOC.map(tipo => {
                    const config  = DOCS_CONFIG[tipo];
                    const doc     = documentos.find(d => d.tipo === tipo);
                    const enviado = doc && ['enviado', 'aprovado'].includes(doc.status);
                    const subindo = uploadingTipo === tipo;

                    return (
                      <div key={tipo}
                        className={`rounded-lg border-2 p-4 transition-colors ${
                          enviado
                            ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                            : 'border-border bg-muted/30'
                        }`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <FileText className={`w-4 h-4 ${enviado ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`} />
                            <span className="text-xs font-semibold text-foreground">{config.label}</span>
                          </div>
                          {enviado
                            ? <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                            : <AlertCircle className="w-4 h-4 text-orange-500 dark:text-orange-400 flex-shrink-0" />
                          }
                        </div>

                        {enviado && doc?.arquivo_nome && (
                          <p className="text-xs text-muted-foreground mb-3 truncate">
                            {doc.arquivo_nome}
                          </p>
                        )}

                        <div className="flex gap-2">
                          {enviado && doc?.arquivo_url && (
                            <>
                              <a href={doc.arquivo_url} target="_blank" rel="noreferrer">
                                <Button size="sm" variant="outline"
                                  className="text-xs border-border text-foreground hover:bg-muted h-7 px-2">
                                  <Eye className="w-3 h-3 mr-1" /> Ver
                                </Button>
                              </a>
                              <a href={doc.arquivo_url} download={doc.arquivo_nome ?? true}>
                                <Button size="sm" variant="outline"
                                  className="text-xs border-border text-foreground hover:bg-muted h-7 px-2">
                                  <Download className="w-3 h-3 mr-1" /> Baixar
                                </Button>
                              </a>
                            </>
                          )}

                          {/* Input de upload oculto */}
                          <input
                            type="file"
                            accept={config.aceita}
                            className="hidden"
                            ref={el => { inputRefs.current[tipo] = el; }}
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) handleUpload(tipo, file);
                              e.target.value = '';
                            }} />

                          <Button size="sm"
                            disabled={subindo}
                            onClick={() => inputRefs.current[tipo]?.click()}
                            className={`text-xs h-7 px-2 ${
                              enviado
                                ? 'bg-muted text-foreground hover:bg-muted/80 border border-border'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}>
                            {subindo
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <><Upload className="w-3 h-3 mr-1" />{enviado ? 'Substituir' : 'Anexar'}</>
                            }
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Barra de progresso */}
                {(() => {
                  const enviados = TIPOS_DOC.filter(t =>
                    documentos.some(d => d.tipo === t && ['enviado', 'aprovado'].includes(d.status))
                  ).length;
                  const pct = Math.round((enviados / TIPOS_DOC.length) * 100);
                  return (
                    <div className="mt-5 p-4 bg-muted/30 rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-foreground">
                          Progresso da Documentação
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {enviados} de {TIPOS_DOC.length} documentos
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            pct === 100 ? 'bg-green-500' :
                            pct >= 50   ? 'bg-yellow-500' : 'bg-orange-500'
                          }`}
                          style={{ width: `${pct}%` }} />
                      </div>
                      {pct === 100
                        ? <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Documentação completa!
                          </p>
                        : <p className="text-xs text-orange-600 dark:text-orange-400 mt-2 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Documentação incompleta
                          </p>
                      }
                    </div>
                  );
                })()}
              </>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  );
}