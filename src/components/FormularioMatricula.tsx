import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from './ui/select';
import {
  ArrowLeft, Save, Printer, Loader2, User, Users,
  GraduationCap, AlertCircle, CheckCircle, Link2, Lock,
  FileText, Search, Trash2, Edit2, RefreshCw, X,
  ClipboardList, Camera, Upload,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Tipos ─────────────────────────────────────────────────
interface Props {
  onVoltar: () => void;
  segmentoInicial?: string;
  alunoIdInicial?: string;
  nomeAlunoInicial?: string;
}

interface FormData {
  nome_aluno: string;
  data_nascimento: string;
  cpf_aluno: string;
  filiacao: string;
  nome_responsavel: string;
  cpf_responsavel: string;
  endereco: string;
  telefone: string;
  email_responsavel: string;
  serie: string;
  turma: string;
  turno: string;
  segmento: string;
  ano_letivo: string;
  status_matricula: string;
}

interface FichaExistente {
  id: string;
  nome_aluno: string;
  serie: string | null;
  turma: string | null;
  turno: string | null;
  segmento: string;
  ano_letivo: number | null;
  status_matricula: string | null;
  data_nascimento: string | null;
  cpf_aluno: string | null;
  filiacao: string | null;
  nome_responsavel: string | null;
  cpf_responsavel: string | null;
  endereco: string | null;
  telefone: string | null;
  email_responsavel: string | null;
  foto_3x4_url: string | null;
  docs_pendentes: boolean;
  criado_em: string;
}

type Aba = 'nova' | 'segunda-via';

// ── Máscaras ──────────────────────────────────────────────
function mascaraCPF(v: string) {
  return v.replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .slice(0, 14);
}

function mascaraTelefone(v: string) {
  return v.replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 15);
}

function formatarData(iso: string | null) {
  if (!iso) return '';
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR');
}

// ── Componente ────────────────────────────────────────────
export function FormularioMatricula({
  onVoltar, segmentoInicial, alunoIdInicial, nomeAlunoInicial,
}: Props) {

  const segmentoFixo = segmentoInicial?.toLowerCase() ?? 'ead';

  // ── Aba ativa — se vier com contexto de aluno, abre direto na nova ficha
  const [aba, setAba] = useState<Aba>(alunoIdInicial ? 'nova' : 'nova');

  // ── Estado do formulário (aba Nova Ficha) ─────────────
  const FORM_INICIAL: FormData = {
    nome_aluno:        nomeAlunoInicial ?? '',
    data_nascimento:   '',
    cpf_aluno:         '',
    filiacao:          '',
    nome_responsavel:  '',
    cpf_responsavel:   '',
    endereco:          '',
    telefone:          '',
    email_responsavel: '',
    serie:             '',
    turma:             '',
    turno:             '',
    segmento:          segmentoFixo,
    ano_letivo:        '2026',
    status_matricula:  'ativa',
  };

  const [form, setForm]             = useState<FormData>(FORM_INICIAL);
  const [salvando, setSalvando]     = useState(false);
  const [salvo, setSalvo]           = useState(false);
  const [consentimentoLGPD, setConsentimentoLGPD] = useState(false);
  const [fichaId, setFichaId]       = useState<string | null>(null);
  const [modoEdicao, setModoEdicao] = useState<string | null>(null);

  // Foto 3x4
  const [foto3x4Preview, setFoto3x4Preview] = useState<string | null>(null);
  const [foto3x4File, setFoto3x4File]       = useState<File | null>(null);
  const [uploadandoFoto, setUploadandoFoto] = useState(false);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  // ── Estado aba 2ª Via ──────────────────────────────────
  const [fichas, setFichas]             = useState<FichaExistente[]>([]);
  const [loadingFichas, setLoadingFichas] = useState(false);
  const [busca, setBusca]               = useState('');
  const [filtroSerie, setFiltroSerie]   = useState('');
  const [filtroSeg, setFiltroSeg]       = useState('todos');
  const [confirmExcluir, setConfirmExcluir] = useState<FichaExistente | null>(null);
  const [excluindo, setExcluindo]       = useState(false);

  const set = (campo: keyof FormData, valor: string) =>
    setForm(prev => ({ ...prev, [campo]: valor }));

  useEffect(() => {
    if (nomeAlunoInicial) setForm(prev => ({ ...prev, nome_aluno: nomeAlunoInicial }));
  }, [nomeAlunoInicial]);

  useEffect(() => {
    setForm(prev => ({ ...prev, segmento: segmentoFixo }));
  }, [segmentoFixo]);

  // Ao entrar em modo edição, carregar foto existente no preview
  function carregarFotoPreview(url: string | null) {
    setFoto3x4Preview(url);
    setFoto3x4File(null);
  }

  // Selecionar foto — gera preview local imediato
  function handleSelecionarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Foto muito grande. Máximo 5MB.'); return; }
    setFoto3x4File(file);
    const reader = new FileReader();
    reader.onload = ev => setFoto3x4Preview(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  // Upload da foto após salvar a ficha — retorna URL signed
  async function uploadFoto3x4(fichaIdDestino: string): Promise<string | null> {
    if (!foto3x4File) return null;
    setUploadandoFoto(true);
    try {
      const ext  = foto3x4File.name.split('.').pop();
      const path = `${fichaIdDestino}/foto_3x4.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('documentos-matricula')
        .upload(path, foto3x4File, { upsert: true });
      if (upErr) throw upErr;

      const { data: urlData } = await supabase.storage
        .from('documentos-matricula')
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = urlData?.signedUrl ?? null;

      // Gravar URL na ficha e em documentos_matricula
      await supabase.from('fichas_matricula')
        .update({ foto_3x4_url: url }).eq('id', fichaIdDestino);

      // Upsert em documentos_matricula
      const { data: docEx } = await supabase.from('documentos_matricula')
        .select('id').eq('ficha_id', fichaIdDestino).eq('tipo', 'foto_3x4').maybeSingle();
      if (docEx) {
        await supabase.from('documentos_matricula').update({
          arquivo_url: url, arquivo_nome: foto3x4File.name,
          status: 'recebido', enviado_em: new Date().toISOString(),
        }).eq('id', docEx.id);
      } else {
        await supabase.from('documentos_matricula').insert({
          ficha_id: fichaIdDestino, tipo: 'foto_3x4',
          arquivo_url: url, arquivo_nome: foto3x4File.name,
          status: 'recebido', enviado_em: new Date().toISOString(),
        });
      }
      return url;
    } catch (e: any) {
      toast.error('Erro ao enviar foto: ' + e.message);
      return null;
    } finally {
      setUploadandoFoto(false);
    }
  }

  // ── Carregar fichas existentes ─────────────────────────
  const carregarFichas = useCallback(async () => {
    setLoadingFichas(true);
    try {
      let q = supabase
        .from('fichas_matricula')
        .select('id, nome_aluno, serie, turma, turno, segmento, ano_letivo, status_matricula, data_nascimento, cpf_aluno, filiacao, nome_responsavel, cpf_responsavel, endereco, telefone, email_responsavel, foto_3x4_url, docs_pendentes, criado_em')
        .order('nome_aluno');
      if (segmentoFixo !== 'todos') q = q.ilike('segmento', segmentoFixo);
      const { data, error } = await q;
      if (error) throw error;
      setFichas(data ?? []);
    } catch (e: any) {
      toast.error('Erro ao carregar fichas: ' + e.message);
    } finally {
      setLoadingFichas(false);
    }
  }, [segmentoFixo]);

  useEffect(() => {
    if (aba === 'segunda-via') carregarFichas();
  }, [aba, carregarFichas]);

  // ── Salvar / Atualizar ficha ───────────────────────────
  async function salvarMatricula() {
    if (!form.nome_aluno.trim())       { toast.error('Nome do aluno é obrigatório'); return; }
    if (!form.nome_responsavel.trim()) { toast.error('Nome do responsável é obrigatório'); return; }
    if (!form.serie)                   { toast.error('Selecione a série'); return; }
    if (!form.turno)                   { toast.error('Selecione o turno'); return; }
    if (!consentimentoLGPD)            { toast.error('Confirme que o responsável foi informado sobre o uso dos dados (LGPD)'); return; }

    setSalvando(true);
    try {
      const payload: Record<string, unknown> = {
        nome_aluno:        form.nome_aluno.trim(),
        data_nascimento:   form.data_nascimento || null,
        cpf_aluno:         form.cpf_aluno       || null,
        filiacao:          form.filiacao         || null,
        nome_responsavel:  form.nome_responsavel.trim(),
        cpf_responsavel:   form.cpf_responsavel  || null,
        endereco:          form.endereco          || null,
        telefone:          form.telefone          || null,
        email_responsavel: form.email_responsavel || null,
        serie:             form.serie,
        turma:             form.turma             || null,
        turno:             form.turno,
        segmento:           segmentoFixo,
        ano_letivo:         parseInt(form.ano_letivo),
        status_matricula:   form.status_matricula,
        consentimento_lgpd: true,
        consentimento_em:   new Date().toISOString(),
      };

      if (modoEdicao) {
        const { error } = await supabase
          .from('fichas_matricula').update(payload).eq('id', modoEdicao);
        if (error) throw error;
        if (foto3x4File) await uploadFoto3x4(modoEdicao);
        toast.success('Ficha atualizada com sucesso!');
        setModoEdicao(null);
        setForm(FORM_INICIAL);
        setFoto3x4Preview(null);
        setFoto3x4File(null);
        setSalvo(false);
        setAba('segunda-via');
        carregarFichas();
      } else {
        if (alunoIdInicial) payload.aluno_id = alunoIdInicial;
        payload.docs_pendentes = true;

        const { data, error } = await supabase
          .from('fichas_matricula').insert(payload).select().single();
        if (error) throw error;

        setFichaId(data.id);

        // Upload da foto se selecionada
        if (foto3x4File) await uploadFoto3x4(data.id);

        setSalvo(true);
        toast.success(alunoIdInicial
          ? 'Ficha criada e vinculada ao aluno!'
          : 'Matrícula salva com sucesso!');
      }
    } catch (e: any) {
      toast.error(`Erro ao salvar: ${e.message}`);
    } finally {
      setSalvando(false);
    }
  }

  // ── Editar ficha ──────────────────────────────────────
  function editarFicha(f: FichaExistente) {
    setModoEdicao(f.id);
    setForm({
      nome_aluno:        f.nome_aluno,
      data_nascimento:   f.data_nascimento ?? '',
      cpf_aluno:         f.cpf_aluno ?? '',
      filiacao:          f.filiacao ?? '',
      nome_responsavel:  f.nome_responsavel ?? '',
      cpf_responsavel:   f.cpf_responsavel ?? '',
      endereco:          f.endereco ?? '',
      telefone:          f.telefone ?? '',
      email_responsavel: f.email_responsavel ?? '',
      serie:             f.serie ?? '',
      turma:             f.turma ?? '',
      turno:             f.turno ?? '',
      segmento:          segmentoFixo,
      ano_letivo:        String(f.ano_letivo ?? '2026'),
      status_matricula:  f.status_matricula ?? 'ativa',
    });
    carregarFotoPreview(f.foto_3x4_url ?? null);
    setSalvo(false);
    setFichaId(f.id);
    setAba('nova');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Excluir ficha ─────────────────────────────────────
  async function confirmarExclusao() {
    if (!confirmExcluir) return;
    setExcluindo(true);
    try {
      const { error, count } = await supabase
        .from('fichas_matricula')
        .delete({ count: 'exact' })
        .eq('id', confirmExcluir.id);

      if (error) throw error;

      // count === 0 significa RLS bloqueou silenciosamente
      if (count === 0) {
        throw new Error('Sem permissão para excluir esta ficha. Verifique as políticas de acesso.');
      }

      setFichas(prev => prev.filter(f => f.id !== confirmExcluir.id));
      toast.success('Ficha excluída.');
    } catch (e: any) {
      toast.error('Erro ao excluir: ' + e.message);
    } finally {
      setExcluindo(false);
      setConfirmExcluir(null);
    }
  }

  // ── Imprimir ficha ────────────────────────────────────
  async function imprimirFicha(f?: FichaExistente) {
    const dados = f ?? {
      nome_aluno:        form.nome_aluno,
      data_nascimento:   form.data_nascimento,
      cpf_aluno:         form.cpf_aluno,
      filiacao:          form.filiacao,
      nome_responsavel:  form.nome_responsavel,
      cpf_responsavel:   form.cpf_responsavel,
      endereco:          form.endereco,
      telefone:          form.telefone,
      email_responsavel: form.email_responsavel,
      serie:             form.serie,
      turma:             form.turma,
      turno:             form.turno,
      ano_letivo:        parseInt(form.ano_letivo),
      status_matricula:  form.status_matricula,
      foto_3x4_url:      null,
    } as FichaExistente;

    const janela = window.open('', '_blank', 'width=820,height=950');
    if (!janela) { toast.error('Permita pop-ups para imprimir'); return; }

    const fotoHtml = dados.foto_3x4_url
      ? `<img src="${dados.foto_3x4_url}" style="width:100%;height:100%;object-fit:cover;border-radius:2px" />`
      : '<span style="font-size:10px;color:#aaa;text-align:center">Foto<br/>3x4</span>';

    // Converter logo para base64 para embutir no PDF
    let logoBase64 = '';
    try {
      const resp = await fetch('/logo-colegio-conexao.png');
      const blob = await resp.blob();
      logoBase64 = await new Promise<string>(res => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.readAsDataURL(blob);
      });
    } catch (_) { /* sem logo se falhar */ }

    janela.document.write(`<!DOCTYPE html>
<html><head>
  <meta charset="utf-8"/>
  <title>Ficha de Matrícula — ${dados.nome_aluno}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:13px;color:#1a1a1a;background:#fff}
    .pagina{width:210mm;min-height:297mm;margin:0 auto;padding:0;position:relative;overflow:hidden}

    /* Topo */
    .topo{background:linear-gradient(135deg,#1a4fa0 0%,#2563b0 65%,#f59e0b 100%);height:32mm;display:flex;align-items:center;padding:0 16mm;gap:16px;position:relative}
    .topo::after{content:'';position:absolute;bottom:0;left:0;right:0;height:5px;background:#f59e0b}
    .topo-logo{width:62px;height:62px;object-fit:contain;background:#fff;border-radius:50%;padding:4px;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,.25)}
    .topo-texto{color:#fff}
    .topo-texto h1{font-size:18px;font-weight:bold;letter-spacing:.8px;text-transform:uppercase}
    .topo-texto h2{font-size:12.5px;margin-top:3px;opacity:.9;font-weight:normal}

    /* Marca d'água — grande e centralizada */
    .marca-dagua{position:absolute;top:50%;left:50%;transform:translate(-50%,-45%);opacity:.07;pointer-events:none;z-index:0}
    .marca-dagua img{width:340px;height:340px;object-fit:contain}

    /* Corpo */
    .corpo{padding:12mm 16mm 32mm;position:relative;z-index:1}

    /* Linha aluno + foto */
    .linha-foto{display:flex;gap:20px;align-items:flex-start;margin-bottom:4mm}
    .foto-box{width:105px;height:130px;border:2px solid #2563b0;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;background:#f0f5ff}
    .campos-aluno{flex:1}

    /* Labels */
    .label{font-weight:bold;font-size:11px;margin-top:10px;margin-bottom:3px;text-transform:uppercase;letter-spacing:.5px;color:#1a4fa0}

    /* Campos */
    .valor{border:1.5px solid #b8cef0;border-radius:8px;padding:8px 12px;font-size:13px;min-height:32px;background:#f5f8ff;color:#1a1a1a;line-height:1.4}

    /* Grids */
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}

    /* Separador de seção */
    .secao{margin:10mm 0 5mm;display:flex;align-items:center;gap:10px}
    .secao-linha{flex:1;height:1.5px;background:linear-gradient(90deg,#2563b0,#b8cef0)}
    .secao-titulo{font-weight:bold;font-size:12px;text-transform:uppercase;letter-spacing:.6px;color:#1a4fa0;white-space:nowrap;padding:0 6px}


    /* Rodapé */
    .rodape{position:absolute;bottom:0;left:0;right:0;background:#1a4fa0;color:#fff;text-align:center;font-size:10px;padding:7px 16mm;line-height:1.7}

    @page{size:A4;margin:0}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style>
</head>
<body><div class="pagina">

  <div class="topo">
    ${logoBase64 ? `<img class="topo-logo" src="${logoBase64}" alt="Logo"/>` : `<div style="width:62px;height:62px;border-radius:50%;background:#fff;flex-shrink:0"></div>`}
    <div class="topo-texto">
      <h1>Colégio Conexão Maranhense</h1>
      <h2>Ficha de Matrícula &nbsp;·&nbsp; Ano Letivo ${dados.ano_letivo} &nbsp;·&nbsp; ${(dados.segmento ?? 'EAD').toUpperCase()}</h2>
    </div>
  </div>

  ${logoBase64 ? `<div class="marca-dagua"><img src="${logoBase64}" alt=""/></div>` : ''}

  <div class="corpo">

    <!-- Aluno + foto -->
    <div class="linha-foto">
      <div class="campos-aluno">
        <div class="label">Nome completo do aluno</div>
        <div class="valor">${dados.nome_aluno}</div>
        <div class="grid2" style="margin-top:0">
          <div>
            <div class="label">Série</div>
            <div class="valor">${dados.serie ?? ''}</div>
          </div>
          <div>
            <div class="label">Data de nascimento</div>
            <div class="valor">${formatarData(dados.data_nascimento)}</div>
          </div>
        </div>
        <div class="label">Filiação (pai e mãe)</div>
        <div class="valor">${dados.filiacao ?? ''}</div>
      </div>
      <div style="padding-top:20px;flex-shrink:0">
        <div class="foto-box">${fotoHtml}</div>
      </div>
    </div>

    <!-- Seção responsável -->
    <div class="secao">
      <div class="secao-linha"></div>
      <div class="secao-titulo">Identificação das Partes Contratadas</div>
      <div class="secao-linha"></div>
    </div>

    <div class="label">Responsável financeiro</div>
    <div class="valor">${dados.nome_responsavel ?? ''}</div>

    <div class="grid2">
      <div>
        <div class="label">CPF do responsável</div>
        <div class="valor">${dados.cpf_responsavel ?? ''}</div>
      </div>
      <div>
        <div class="label">CPF do aluno</div>
        <div class="valor">${dados.cpf_aluno ?? ''}</div>
      </div>
    </div>

    <div class="label">Endereço completo</div>
    <div class="valor">${dados.endereco ?? ''}</div>

    <div class="grid2">
      <div>
        <div class="label">Telefone de contato</div>
        <div class="valor">${dados.telefone ?? ''}</div>
      </div>
      <div>
        <div class="label">E-mail</div>
        <div class="valor">${dados.email_responsavel ?? ''}</div>
      </div>
    </div>

    <!-- Seção matrícula -->
    <div class="secao">
      <div class="secao-linha"></div>
      <div class="secao-titulo">Dados da Matrícula</div>
      <div class="secao-linha"></div>
    </div>

    <div class="grid3">
      <div>
        <div class="label">Turma</div>
        <div class="valor">${dados.turma ?? ''}</div>
      </div>
      <div>
        <div class="label">Turno</div>
        <div class="valor">${dados.turno ?? ''}</div>
      </div>
      <div>
        <div class="label">Status</div>
        <div class="valor">${dados.status_matricula ?? ''}</div>
      </div>
    </div>


  </div>

  <div class="rodape">
    COLÉGIO CONEXÃO MARANHENSE &nbsp;|&nbsp; CNPJ: 08.660.860/0001-63 &nbsp;|&nbsp; RECONHECIDO PELO CEE Nº 67/2019<br/>
    AVENIDA JOÃO PESSOA, 262 - OUTEIRO DA CRUZ &nbsp;|&nbsp; SÃO LUÍS – MARANHÃO
  </div>

</div></body></html>`);
    janela.document.close();
    janela.focus();
    setTimeout(() => janela.print(), 400);
  }

  // ── Fichas filtradas (aba 2ª via) ─────────────────────
  const fichasFiltradas = fichas.filter(f => {
    const matchNome = !busca || f.nome_aluno.toLowerCase().includes(busca.toLowerCase());
    const matchSerie = !filtroSerie || (f.serie ?? '').toLowerCase().includes(filtroSerie.toLowerCase());
    const matchSeg  = filtroSeg === 'todos' || (f.segmento ?? '').toLowerCase() === filtroSeg;
    return matchNome && matchSerie && matchSeg;
  });

  // Contadores
  const totalFichas    = fichas.length;
  const fichasAtivas   = fichas.filter(f => f.status_matricula === 'ativa').length;
  const fichasPendentes = fichas.filter(f => f.docs_pendentes).length;

  // ════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════
  return (
    <div className="space-y-6">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => {
            if (modoEdicao) { setModoEdicao(null); setForm(FORM_INICIAL); setSalvo(false); setAba('segunda-via'); }
            else onVoltar();
          }} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-1" />
            {modoEdicao ? 'Cancelar edição' : 'Voltar'}
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              Fichas de Matrícula
              <span className={`text-sm font-semibold px-2.5 py-0.5 rounded-full ${
                segmentoFixo === 'presencial'
                  ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-200'
                  : 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200'
              }`}>
                {segmentoFixo === 'presencial' ? 'Presencial' : 'EAD'}
              </span>
            </h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              {modoEdicao ? 'Editando ficha existente' : 'Gerencie as fichas de matrícula'}
            </p>
          </div>
        </div>
        {/* Botões contextuais */}
        {aba === 'nova' && (
          <div className="flex gap-2">
            {(salvo || modoEdicao) && (
              <Button variant="outline" onClick={() => imprimirFicha()}
                className="border-border text-foreground hover:bg-muted">
                <Printer className="w-4 h-4 mr-2" /> Imprimir
              </Button>
            )}
            <Button onClick={salvarMatricula} disabled={salvando}
              className="bg-blue-600 hover:bg-blue-700 text-white">
              {salvando
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
                : <><Save    className="w-4 h-4 mr-2" />{modoEdicao ? 'Atualizar Ficha' : 'Salvar Ficha'}</>}
            </Button>
          </div>
        )}
      </div>

      {/* ── Abas ── */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        {([
          { id: 'nova',        label: 'Nova Ficha',  icon: <FileText     className="w-4 h-4" /> },
          { id: 'segunda-via', label: '2ª Via / Fichas', icon: <ClipboardList className="w-4 h-4" /> },
        ] as const).map(a => (
          <button key={a.id} onClick={() => {
            if (modoEdicao && a.id !== 'nova') { setModoEdicao(null); setForm(FORM_INICIAL); setSalvo(false); }
            setAba(a.id);
          }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              aba === a.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}>
            {a.icon}{a.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════
          ABA — NOVA FICHA
      ════════════════════════════════════════════════ */}
      {aba === 'nova' && (
        <div className="space-y-6">

          {/* Banners de contexto */}
          {alunoIdInicial && !salvo && !modoEdicao && (
            <Card className="border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20">
              <CardContent className="p-4 flex items-center gap-3">
                <Link2 className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                    Criando ficha vinculada ao aluno: <span className="font-bold">{nomeAlunoInicial}</span>
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                    Ao salvar, a ficha será automaticamente vinculada ao cadastro do aluno no portal.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {modoEdicao && (
            <Card className="border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20">
              <CardContent className="p-4 flex items-center gap-3">
                <Edit2 className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                    Editando ficha de <span className="font-bold">{form.nome_aluno}</span>
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                    As alterações substituirão os dados atuais da ficha.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {salvo && !modoEdicao && (
            <Card className="border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20">
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                    Matrícula salva com sucesso!
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                    ID: {fichaId} · Segmento: {segmentoFixo}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Seção 1 — Dados do Aluno */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base text-foreground flex items-center gap-2">
                <User className="w-4 h-4 text-blue-500" /> Dados do Aluno
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">

              {/* Layout com foto à direita */}
              <div className="flex gap-5 items-start">

                {/* Campos à esquerda */}
                <div className="flex-1 space-y-4">
                  <div>
                    <Label className="text-foreground text-xs font-semibold uppercase tracking-wide">Nome Completo *</Label>
                    <Input className="mt-1 bg-background border-border text-foreground"
                      placeholder="Digite o nome completo"
                      value={form.nome_aluno} onChange={e => set('nome_aluno', e.target.value)} />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-foreground text-xs font-semibold uppercase tracking-wide">Data de Nascimento</Label>
                      <Input type="date" className="mt-1 bg-background border-border text-foreground"
                        value={form.data_nascimento} onChange={e => set('data_nascimento', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-foreground text-xs font-semibold uppercase tracking-wide">CPF do Aluno</Label>
                      <Input className="mt-1 bg-background border-border text-foreground" placeholder="000.000.000-00"
                        value={form.cpf_aluno} onChange={e => set('cpf_aluno', mascaraCPF(e.target.value))} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-foreground text-xs font-semibold uppercase tracking-wide">Filiação (Pai e Mãe)</Label>
                    <Input className="mt-1 bg-background border-border text-foreground" placeholder="Nome do pai e nome da mãe"
                      value={form.filiacao} onChange={e => set('filiacao', e.target.value)} />
                  </div>
                </div>

                {/* Foto 3x4 à direita */}
                <div className="flex-shrink-0">
                  <Label className="text-foreground text-xs font-semibold uppercase tracking-wide block mb-2">
                    Foto 3x4
                  </Label>
                  <input
                    ref={fotoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleSelecionarFoto}
                  />
                  <button
                    type="button"
                    onClick={() => fotoInputRef.current?.click()}
                    className="relative group w-28 h-36 rounded-lg border-2 border-dashed border-border hover:border-blue-400 dark:hover:border-blue-500 bg-muted/30 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all overflow-hidden flex flex-col items-center justify-center"
                  >
                    {foto3x4Preview ? (
                      <>
                        <img
                          src={foto3x4Preview}
                          alt="Foto 3x4"
                          className="w-full h-full object-cover"
                        />
                        {/* Overlay ao hover */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                          <Camera className="w-5 h-5 text-white" />
                          <span className="text-xs text-white font-medium">Alterar</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 p-2 text-center">
                        {uploadandoFoto
                          ? <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                          : <Camera className="w-6 h-6 text-muted-foreground" />
                        }
                        <span className="text-xs text-muted-foreground leading-tight">
                          {uploadandoFoto ? 'Enviando...' : 'Clique para\nadicionar foto'}
                        </span>
                      </div>
                    )}
                  </button>

                  {/* Indicador de arquivo selecionado ainda não salvo */}
                  {foto3x4File && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        Será enviada ao salvar
                      </span>
                    </div>
                  )}
                  {foto3x4Preview && !foto3x4File && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                      <span className="text-xs text-green-600 dark:text-green-400">
                        Foto recebida
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Seção 2 — Responsável */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" /> Identificação das Partes Contratadas
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div>
                <Label className="text-foreground text-xs font-semibold uppercase tracking-wide">Responsável Financeiro *</Label>
                <Input className="mt-1 bg-background border-border text-foreground" placeholder="Nome completo do responsável"
                  value={form.nome_responsavel} onChange={e => set('nome_responsavel', e.target.value)} />
              </div>
              <div>
                <Label className="text-foreground text-xs font-semibold uppercase tracking-wide">CPF do Responsável</Label>
                <Input className="mt-1 bg-background border-border text-foreground max-w-xs" placeholder="000.000.000-00"
                  value={form.cpf_responsavel} onChange={e => set('cpf_responsavel', mascaraCPF(e.target.value))} />
              </div>
              <div>
                <Label className="text-foreground text-xs font-semibold uppercase tracking-wide">Endereço Completo</Label>
                <Input className="mt-1 bg-background border-border text-foreground" placeholder="Rua, número, bairro, cidade - UF"
                  value={form.endereco} onChange={e => set('endereco', e.target.value)} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-foreground text-xs font-semibold uppercase tracking-wide">Telefone</Label>
                  <Input className="mt-1 bg-background border-border text-foreground" placeholder="(00) 00000-0000"
                    value={form.telefone} onChange={e => set('telefone', mascaraTelefone(e.target.value))} />
                </div>
                <div>
                  <Label className="text-foreground text-xs font-semibold uppercase tracking-wide">E-mail</Label>
                  <Input type="email" className="mt-1 bg-background border-border text-foreground" placeholder="email@exemplo.com"
                    value={form.email_responsavel} onChange={e => set('email_responsavel', e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Seção 3 — Matrícula */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base text-foreground flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-500" /> Dados da Matrícula
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label className="text-foreground text-xs font-semibold uppercase tracking-wide">Série *</Label>
                  <Select value={form.serie} onValueChange={v => set('serie', v)}>
                    <SelectTrigger className="mt-1 bg-background border-border text-foreground"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {['5º ano - Ensino Fundamental','6º ano - Ensino Fundamental','7º ano - Ensino Fundamental',
                        '8º ano - Ensino Fundamental','9º ano - Ensino Fundamental','1ª série - Ensino Médio',
                        '2ª série - Ensino Médio','3ª série - Ensino Médio',
                      ].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-foreground text-xs font-semibold uppercase tracking-wide">Turma</Label>
                  <Select value={form.turma} onValueChange={v => set('turma', v)}>
                    <SelectTrigger className="mt-1 bg-background border-border text-foreground"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {['A','B','C','D'].map(t => <SelectItem key={t} value={t}>Turma {t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-foreground text-xs font-semibold uppercase tracking-wide">Turno *</Label>
                  <Select value={form.turno} onValueChange={v => set('turno', v)}>
                    <SelectTrigger className="mt-1 bg-background border-border text-foreground"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="matutino">Matutino</SelectItem>
                      <SelectItem value="vespertino">Vespertino</SelectItem>
                      <SelectItem value="noturno">Noturno</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-foreground text-xs font-semibold uppercase tracking-wide">Ano Letivo</Label>
                  <Select value={form.ano_letivo} onValueChange={v => set('ano_letivo', v)}>
                    <SelectTrigger className="mt-1 bg-background border-border text-foreground"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2026">2026</SelectItem>
                      <SelectItem value="2027">2027</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {/* Segmento bloqueado */}
                <div>
                  <Label className="text-foreground text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5">
                    <Lock className="w-3 h-3" /> Segmento
                  </Label>
                  <div className={`mt-1 flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 cursor-not-allowed ${
                    segmentoFixo === 'presencial'
                      ? 'border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/20'
                      : 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                  }`}>
                    <span className={`text-sm font-bold ${segmentoFixo === 'presencial' ? 'text-violet-800 dark:text-violet-200' : 'text-blue-800 dark:text-blue-200'}`}>
                      {segmentoFixo === 'presencial' ? '🏫 Presencial' : '💻 EAD'}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">Definido pelo perfil</span>
                  </div>
                </div>
                <div>
                  <Label className="text-foreground text-xs font-semibold uppercase tracking-wide">Status da Matrícula</Label>
                  <Select value={form.status_matricula} onValueChange={v => set('status_matricula', v)}>
                    <SelectTrigger className="mt-1 bg-background border-border text-foreground"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativa">Ativa</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                      <SelectItem value="transferida">Transferida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* ── Consentimento LGPD ── */}
              {!modoEdicao && (
                <div className={`rounded-lg border-2 p-4 transition-colors ${
                  consentimentoLGPD
                    ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20'
                    : 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20'
                }`}>
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={consentimentoLGPD}
                      onChange={e => setConsentimentoLGPD(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-green-600 flex-shrink-0"
                    />
                    <div>
                      <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        Consentimento LGPD — obrigatório
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        Confirmo que o responsável foi <strong>informado verbalmente ou por escrito</strong> que os dados
                        pessoais do aluno e do responsável serão armazenados no sistema do{' '}
                        <strong>Colégio Conexão Maranhense</strong>, utilizados exclusivamente para fins escolares
                        (matrículas, emissão de documentos, histórico escolar e comunicação com a família),
                        e que o acesso é restrito à secretaria e gestão da escola, conforme a{' '}
                        <strong>Lei 13.709/2018 (LGPD)</strong>.
                      </p>
                      {consentimentoLGPD && (
                        <p className="text-xs text-green-700 dark:text-green-400 mt-1.5 font-medium">
                          ✓ Registrado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  </label>
                </div>
              )}

              <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  Após salvar, acesse <strong>Documentos Recebidos</strong> para registrar o envio de cada documento.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          ABA — 2ª VIA / FICHAS EXISTENTES
      ════════════════════════════════════════════════ */}
      {aba === 'segunda-via' && (
        <div className="space-y-6">

          {/* Contadores */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total de Fichas',   valor: totalFichas,    icon: <ClipboardList className="w-5 h-5 text-blue-600 dark:text-blue-400" />,   bg: 'bg-blue-100 dark:bg-blue-900/40',   num: 'text-blue-600 dark:text-blue-400',   borda: 'border-blue-200 dark:border-blue-800' },
              { label: 'Matrículas Ativas', valor: fichasAtivas,   icon: <CheckCircle   className="w-5 h-5 text-green-600 dark:text-green-400" />,  bg: 'bg-green-100 dark:bg-green-900/40', num: 'text-green-600 dark:text-green-400', borda: 'border-green-200 dark:border-green-800' },
              { label: 'Docs Pendentes',    valor: fichasPendentes, icon: <AlertCircle   className="w-5 h-5 text-orange-600 dark:text-orange-400" />, bg: 'bg-orange-100 dark:bg-orange-900/40',num: 'text-orange-600 dark:text-orange-400',borda: 'border-orange-200 dark:border-orange-800' },
            ].map(c => (
              <Card key={c.label} className={`bg-card border-2 ${c.borda}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.bg}`}>{c.icon}</div>
                  </div>
                  <p className={`text-2xl font-bold ${c.num}`}>{loadingFichas ? '—' : c.valor}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filtros */}
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Buscar pelo nome..." className="pl-9 bg-background border-border text-foreground"
                    value={busca} onChange={e => setBusca(e.target.value)} />
                  {busca && (
                    <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <Input placeholder="Filtrar por série..." className="bg-background border-border text-foreground"
                  value={filtroSerie} onChange={e => setFiltroSerie(e.target.value)} />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={carregarFichas} disabled={loadingFichas}
                    className="border-border text-foreground hover:bg-muted ml-auto">
                    <RefreshCw className={`w-4 h-4 mr-1 ${loadingFichas ? 'animate-spin' : ''}`} /> Atualizar
                  </Button>
                </div>
              </div>
              {(busca || filtroSerie) && (
                <p className="text-xs text-muted-foreground mt-2">{fichasFiltradas.length} ficha(s) encontrada(s)</p>
              )}
            </CardContent>
          </Card>

          {/* Lista de fichas */}
          <Card className="bg-card border-border">
            <CardContent className="p-0">
              {loadingFichas ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : fichasFiltradas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <ClipboardList className="w-10 h-10 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma ficha encontrada.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {fichasFiltradas.map(f => (
                    <div key={f.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors">

                      {/* Foto ou avatar */}
                      {f.foto_3x4_url ? (
                        <img src={f.foto_3x4_url} alt={f.nome_aluno}
                          className="w-10 h-12 rounded object-cover border border-border flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}

                      {/* Dados */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{f.nome_aluno}</p>
                        <p className="text-xs text-muted-foreground">
                          {f.serie ?? '—'} {f.turma ? `· Turma ${f.turma}` : ''} · {f.turno ?? '—'} · {f.ano_letivo}
                        </p>
                      </div>

                      {/* Status matrícula */}
                      <div className="hidden sm:block">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                          f.status_matricula === 'ativa'
                            ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}>
                          {f.status_matricula ?? 'pendente'}
                        </span>
                      </div>

                      {/* Docs */}
                      <div className="hidden sm:block">
                        {f.docs_pendentes
                          ? <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">Docs pendentes</span>
                          : <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">Docs OK</span>
                        }
                      </div>

                      {/* Ações */}
                      <div className="flex gap-2 flex-shrink-0">
                        <Button size="sm" variant="outline"
                          onClick={() => imprimirFicha(f)}
                          className="border-border text-foreground hover:bg-muted text-xs px-2.5">
                          <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir
                        </Button>
                        <Button size="sm" variant="outline"
                          onClick={() => editarFicha(f)}
                          className="border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-xs px-2.5">
                          <Edit2 className="w-3.5 h-3.5 mr-1" /> Editar
                        </Button>
                        <Button size="sm" variant="outline"
                          onClick={() => setConfirmExcluir(f)}
                          className="border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs px-2">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal confirmar exclusão */}
      {confirmExcluir && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="bg-card border-border w-full max-w-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Excluir ficha de matrícula</p>
                  <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita</p>
                </div>
              </div>
              <p className="text-sm text-foreground mb-2">
                Deseja excluir a ficha de <span className="font-medium">{confirmExcluir.nome_aluno}</span>?
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mb-6">
                Os documentos vinculados não serão excluídos automaticamente.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 border-border" onClick={() => setConfirmExcluir(null)}>
                  Cancelar
                </Button>
                <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={confirmarExclusao} disabled={excluindo}>
                  {excluindo ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Excluir'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}