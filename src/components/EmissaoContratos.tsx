import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from './ui/select';
import {
  ArrowLeft, FileText, Printer, Save, Loader2, Search,
  CheckCircle, AlertCircle, X, User, RefreshCw,
  CreditCard, Calendar, ChevronRight, ClipboardList,
  Trash2, Edit2,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Tipos ─────────────────────────────────────────────────
interface Props {
  onVoltar: () => void;
  fichaIdInicial?: string;
  nomeAlunoInicial?: string;
}

interface FichaOpcao {
  id: string;
  aluno_id: string | null;
  nome_aluno: string;
  nome_responsavel: string | null;
  cpf_responsavel: string | null;
  endereco: string | null;
  serie: string | null;
  segmento: string | null;
  email_responsavel: string | null;
  telefone: string | null;
}

interface ContratoExistente {
  id: string;
  ficha_id: string;
  tipo_contrato: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  data_assinatura: string | null;
  dia_vencimento: number | null;
  mensalidade_valor: number | null;
  matricula_habilitada: boolean;
  matricula_valor: number | null;
  matricula_vencimento: string | null;
  plataforma_habilitada: boolean;
  plataforma_valor: number | null;
  plataforma_vencimento: string | null;
  desconto_indicacao: number | null;
  desconto_antecipacao: number | null;
  rg_responsavel: string | null;
  status: string | null;
  segmento: string | null;
  criado_em: string;
  fichas_matricula?: {
    nome_aluno: string;
    nome_responsavel: string | null;
    cpf_responsavel: string | null;
    endereco: string | null;
    serie: string | null;
  } | null;
}

interface ParcelaPreview {
  tipo: 'matricula' | 'mensalidade' | 'plataforma';
  vencimento: Date;
  valor: number;
  descricao: string;
}

type Aba = 'novo' | 'emitidos';

// ── Helpers ───────────────────────────────────────────────
function parseBRL(str: string): number {
  return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
}

function formatBRL(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dataComDia(ano: number, mes: number, dia: number): Date {
  return new Date(ano, mes, dia, 12, 0, 0);
}

function toISOLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function parseLocalDate(str: string): Date | null {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function fmtDataBR(str: string): string {
  const d = parseLocalDate(str);
  return d ? d.toLocaleDateString('pt-BR') : '';
}

function fmtDataExtenso(str: string): string {
  const d = parseLocalDate(str);
  return d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
}

function gerarParcelas(
  inicio: string, fim: string, diaVenc: number, valor: number,
  _alunoId: string, _fichaId: string, _segmento: string, _contratoId: string,
): ParcelaPreview[] {
  const di = parseLocalDate(inicio);
  const df = parseLocalDate(fim);
  if (!di || !df || valor <= 0) return [];
  const parcelas: ParcelaPreview[] = [];
  let ano = di.getFullYear();
  let mes = di.getMonth();
  while (true) {
    const venc = dataComDia(ano, mes, diaVenc);
    if (venc > df) break;
    parcelas.push({
      tipo: 'mensalidade',
      vencimento: venc,
      valor,
      descricao: `Mensalidade ${String(mes + 1).padStart(2, '0')}/${ano}`,
    });
    mes++;
    if (mes > 11) { mes = 0; ano++; }
    if (parcelas.length > 24) break;
  }
  return parcelas;
}

// ── Componente ────────────────────────────────────────────
export function EmissaoContratos({ onVoltar, fichaIdInicial }: Props) {
  const { usuario } = useAuth();

  // ── Abas ──────────────────────────────────────────────
  const [aba, setAba] = useState<Aba>('novo');

  // ── Contratos emitidos ────────────────────────────────
  const [contratos, setContratos]               = useState<ContratoExistente[]>([]);
  const [loadingContratos, setLoadingContratos] = useState(false);
  const [buscaContratos, setBuscaContratos]     = useState('');
  const [confirmExcluir, setConfirmExcluir]     = useState<ContratoExistente | null>(null);
  const [excluindo, setExcluindo]               = useState(false);

  // ── Seleção de aluno ──────────────────────────────────
  const [fichas, setFichas]             = useState<FichaOpcao[]>([]);
  const [loadingFichas, setLoadingFichas] = useState(false);
  const [busca, setBusca]               = useState('');
  const [filtroSerie, setFiltroSerie]   = useState('');
  const [fichaSel, setFichaSel]         = useState<FichaOpcao | null>(null);

  // ── Formulário ────────────────────────────────────────
  const [nomeResponsavel, setNomeResponsavel] = useState('');
  const [cpfResponsavel, setCpfResponsavel]   = useState('');
  const [rgResponsavel, setRgResponsavel]     = useState('');
  const [endereco, setEndereco]               = useState('');
  const [nomeAluno, setNomeAluno]             = useState('');
  const [serie, setSerie]                     = useState('');
  const [tipoContrato, setTipoContrato]       = useState('anual');
  const [dataInicio, setDataInicio]           = useState('');
  const [dataFim, setDataFim]                 = useState('');
  const [dataAssinatura, setDataAssinatura]   = useState(toISOLocal(new Date()));
  const [diaVencimento, setDiaVencimento]     = useState('5');
  const [matriculaHab, setMatriculaHab]       = useState(false);
  const [matriculaValor, setMatriculaValor]   = useState('');
  const [matriculaVenc, setMatriculaVenc]     = useState('');
  const [plataformaHab, setPlataformaHab]     = useState(false);
  const [plataformaValor, setPlataformaValor] = useState('');
  const [plataformaVenc, setPlataformaVenc]   = useState('');
  const [mensalidadeValor, setMensalidadeValor] = useState('');
  const [descIndicacao, setDescIndicacao]     = useState('0,00');
  const [descAntecipacao, setDescAntecipacao] = useState('');
  const [salvando, setSalvando]               = useState(false);
  const [salvo, setSalvo]                     = useState(false);
  const [contratoId, setContratoId]           = useState<string | null>(null);

  // ── Busca com debounce ────────────────────────────────
  const buscarFichas = useCallback(async (termo: string, ser: string) => {
    setLoadingFichas(true);
    try {
      const seg = usuario?.segmento;
      let q = supabase
        .from('fichas_matricula')
        .select('id, aluno_id, nome_aluno, nome_responsavel, cpf_responsavel, endereco, serie, segmento, email_responsavel, telefone')
        .order('nome_aluno').limit(20);
      if (seg && seg !== 'todos') q = q.ilike('segmento', seg);
      if (termo.trim()) q = q.ilike('nome_aluno', `%${termo.trim()}%`);
      if (ser.trim())   q = q.ilike('serie', `%${ser.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      setFichas(data ?? []);
    } catch (e: any) {
      toast.error('Erro ao buscar fichas: ' + e.message);
    } finally {
      setLoadingFichas(false);
    }
  }, [usuario?.segmento]);

  useEffect(() => {
    const t = setTimeout(() => buscarFichas(busca, filtroSerie), 400);
    return () => clearTimeout(t);
  }, [busca, filtroSerie, buscarFichas]);

  useEffect(() => {
    if (fichaIdInicial) {
      supabase.from('fichas_matricula')
        .select('id, aluno_id, nome_aluno, nome_responsavel, cpf_responsavel, endereco, serie, segmento, email_responsavel, telefone')
        .eq('id', fichaIdInicial).single()
        .then(({ data }) => { if (data) selecionarFicha(data as FichaOpcao); });
    }
  }, [fichaIdInicial]);

  // ── Carregar contratos emitidos ───────────────────────
  const carregarContratos = useCallback(async () => {
    setLoadingContratos(true);
    try {
      const seg = usuario?.segmento;
      let q = supabase
        .from('contratos')
        .select(`id, ficha_id, tipo_contrato, data_inicio, data_fim, data_assinatura,
          dia_vencimento, mensalidade_valor, matricula_habilitada, matricula_valor,
          matricula_vencimento, plataforma_habilitada, plataforma_valor, plataforma_vencimento,
          desconto_indicacao, desconto_antecipacao, rg_responsavel, status, segmento, criado_em,
          fichas_matricula(nome_aluno, nome_responsavel, cpf_responsavel, endereco, serie)`)
        .order('criado_em', { ascending: false });
      if (seg && seg !== 'todos') q = q.ilike('segmento', seg);
      const { data, error } = await q;
      if (error) throw error;
      setContratos((data ?? []) as ContratoExistente[]);
    } catch (e: any) {
      toast.error('Erro ao carregar contratos: ' + e.message);
    } finally {
      setLoadingContratos(false);
    }
  }, [usuario?.segmento]);

  useEffect(() => {
    if (aba === 'emitidos') carregarContratos();
  }, [aba, carregarContratos]);

  // ── Selecionar ficha ──────────────────────────────────
  function selecionarFicha(f: FichaOpcao) {
    setFichaSel(f);
    setNomeResponsavel(f.nome_responsavel ?? '');
    setCpfResponsavel(f.cpf_responsavel ?? '');
    setEndereco(f.endereco ?? '');
    setNomeAluno(f.nome_aluno);
    setSerie(f.serie ?? '');
    const isMedio = (f.serie ?? '').toLowerCase().includes('médio');
    setMensalidadeValor(isMedio ? '1.255,00' : '1.190,00');
    setDescAntecipacao(isMedio ? '200,00' : '175,00');
    setSalvo(false);
    setContratoId(null);
  }

  function resetarFormulario() {
    setFichaSel(null); setBusca(''); setFiltroSerie(''); setFichas([]);
    setNomeResponsavel(''); setCpfResponsavel(''); setRgResponsavel('');
    setEndereco(''); setNomeAluno(''); setSerie('');
    setTipoContrato('anual'); setDataInicio(''); setDataFim('');
    setDataAssinatura(toISOLocal(new Date())); setDiaVencimento('5');
    setMatriculaHab(false); setMatriculaValor(''); setMatriculaVenc('');
    setPlataformaHab(false); setPlataformaValor(''); setPlataformaVenc('');
    setMensalidadeValor(''); setDescIndicacao('0,00'); setDescAntecipacao('');
    setSalvo(false); setContratoId(null);
  }

  // ── Excluir contrato ──────────────────────────────────
  async function confirmarExclusao() {
    if (!confirmExcluir) return;
    setExcluindo(true);
    try {
      await supabase.from('financeiro_mensalidades').delete().eq('contrato_id', confirmExcluir.id);
      const { error, count } = await supabase.from('contratos').delete({ count: 'exact' }).eq('id', confirmExcluir.id);
      if (error) throw error;
      if (count === 0) throw new Error('Sem permissão para excluir. Verifique as políticas de acesso.');
      setContratos(prev => prev.filter(c => c.id !== confirmExcluir.id));
      toast.success('Contrato e parcelas excluídos.');
    } catch (e: any) {
      toast.error('Erro ao excluir: ' + e.message);
    } finally {
      setExcluindo(false);
      setConfirmExcluir(null);
    }
  }

  // ── Editar contrato ───────────────────────────────────
  async function editarContrato(c: ContratoExistente) {
    const { data: fichaCompleta } = await supabase
      .from('fichas_matricula')
      .select('id, aluno_id, nome_aluno, nome_responsavel, cpf_responsavel, endereco, serie, segmento, email_responsavel, telefone')
      .eq('id', c.ficha_id).single();
    if (fichaCompleta) selecionarFicha(fichaCompleta as FichaOpcao);
    setTipoContrato(c.tipo_contrato ?? 'anual');
    setDataInicio(c.data_inicio ?? '');
    setDataFim(c.data_fim ?? '');
    setDataAssinatura(c.data_assinatura ?? toISOLocal(new Date()));
    setDiaVencimento(String(c.dia_vencimento ?? 5));
    setRgResponsavel(c.rg_responsavel ?? '');
    setMatriculaHab(c.matricula_habilitada ?? false);
    setMatriculaValor(c.matricula_valor ? formatBRL(c.matricula_valor) : '');
    setMatriculaVenc(c.matricula_vencimento ?? '');
    setPlataformaHab(c.plataforma_habilitada ?? false);
    setPlataformaValor(c.plataforma_valor ? formatBRL(c.plataforma_valor) : '');
    setPlataformaVenc(c.plataforma_vencimento ?? '');
    setMensalidadeValor(c.mensalidade_valor ? formatBRL(c.mensalidade_valor) : '');
    setDescIndicacao(c.desconto_indicacao ? formatBRL(c.desconto_indicacao) : '0,00');
    setDescAntecipacao(c.desconto_antecipacao ? formatBRL(c.desconto_antecipacao) : '');
    setSalvo(false);
    setContratoId(c.id);
    setAba('novo');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.success('Contrato carregado para edição.');
  }

  // ── Preview de parcelas ───────────────────────────────
  const parcelasPreview: ParcelaPreview[] = (() => {
    if (!fichaSel) return [];
    const lista: ParcelaPreview[] = [];
    if (matriculaHab && matriculaValor && matriculaVenc)
      lista.push({ tipo: 'matricula', vencimento: parseLocalDate(matriculaVenc)!, valor: parseBRL(matriculaValor), descricao: 'Matrícula' });
    if (plataformaHab && plataformaValor && plataformaVenc)
      lista.push({ tipo: 'plataforma', vencimento: parseLocalDate(plataformaVenc)!, valor: parseBRL(plataformaValor), descricao: 'Taxa de Plataforma' });
    if (dataInicio && dataFim && mensalidadeValor)
      lista.push(...gerarParcelas(dataInicio, dataFim, parseInt(diaVencimento), parseBRL(mensalidadeValor), fichaSel.aluno_id ?? '', fichaSel.id, usuario?.segmento ?? 'ead', contratoId ?? ''));
    return lista.sort((a, b) => a.vencimento.getTime() - b.vencimento.getTime());
  })();

  const totalGeral      = parcelasPreview.reduce((s, p) => s + p.valor, 0);
  const totalContratos  = contratos.length;
  const contratosAtivos = contratos.filter(c => c.status === 'ativo').length;
  const contratosFiltrados = contratos.filter(c => {
    if (!buscaContratos.trim()) return true;
    return (c.fichas_matricula?.nome_aluno ?? '').toLowerCase().includes(buscaContratos.toLowerCase());
  });
  const fichasFiltradas = fichas;

  // ── Salvar ────────────────────────────────────────────
  async function salvarContrato() {
    if (!fichaSel)         { toast.error('Selecione um aluno'); return; }
    if (!dataAssinatura)   { toast.error('Informe a data de assinatura'); return; }
    if (!mensalidadeValor) { toast.error('Informe o valor das mensalidades'); return; }
    if (!dataInicio || !dataFim) { toast.error('Informe as datas de início e fim das mensalidades'); return; }
    const anoInicio = parseLocalDate(dataInicio)?.getFullYear() ?? 0;
    const anoFim    = parseLocalDate(dataFim)?.getFullYear() ?? 0;
    if (anoInicio < 2020 || anoInicio > 2050) { toast.error('Data de início inválida. Verifique o ano.'); return; }
    if (anoFim    < 2020 || anoFim    > 2050) { toast.error('Data de fim inválida. Verifique o ano.'); return; }
    if (parseLocalDate(dataFim)! <= parseLocalDate(dataInicio)!) { toast.error('A data de fim deve ser posterior ao início.'); return; }

    setSalvando(true);
    try {
      const payload = {
        ficha_id: fichaSel.id, aluno_id: fichaSel.aluno_id,
        segmento: usuario?.segmento ?? 'ead', tipo_contrato: tipoContrato,
        data_inicio: dataInicio, data_fim: dataFim,
        dia_vencimento: parseInt(diaVencimento),
        ano_letivo: parseLocalDate(dataInicio)?.getFullYear() ?? 2026,
        valor_base: parseBRL(mensalidadeValor),
        desconto_indicacao: parseBRL(descIndicacao),
        desconto_antecipacao: parseBRL(descAntecipacao),
        mensalidade_valor: parseBRL(mensalidadeValor),
        matricula_habilitada: matriculaHab,
        matricula_valor: matriculaHab ? parseBRL(matriculaValor) : null,
        matricula_vencimento: matriculaHab ? matriculaVenc : null,
        plataforma_habilitada: plataformaHab,
        plataforma_valor: plataformaHab ? parseBRL(plataformaValor) : null,
        plataforma_vencimento: plataformaHab ? plataformaVenc : null,
        data_assinatura: dataAssinatura, rg_responsavel: rgResponsavel || null,
        status: 'ativo', criado_por: usuario?.id,
      };

      let idFinal = contratoId;

      if (contratoId) {
        const { error } = await supabase.from('contratos').update(payload).eq('id', contratoId);
        if (error) throw error;
        await supabase.from('financeiro_mensalidades').delete().eq('contrato_id', contratoId);
      } else {
        const { data: c, error } = await supabase.from('contratos').insert(payload).select().single();
        if (error) throw error;
        idFinal = c.id;
        setContratoId(idFinal);
      }

      const linhas: Record<string, unknown>[] = [];
      if (matriculaHab && matriculaValor && matriculaVenc)
        linhas.push({ contrato_id: idFinal, aluno_id: fichaSel.aluno_id, segmento: usuario?.segmento ?? 'ead', tipo: 'matricula', vencimento: matriculaVenc, valor: parseBRL(matriculaValor), status: 'pendente', descricao: 'Matrícula' });
      if (plataformaHab && plataformaValor && plataformaVenc)
        linhas.push({ contrato_id: idFinal, aluno_id: fichaSel.aluno_id, segmento: usuario?.segmento ?? 'ead', tipo: 'plataforma', vencimento: plataformaVenc, valor: parseBRL(plataformaValor), status: 'pendente', descricao: 'Taxa de Plataforma' });
      gerarParcelas(dataInicio, dataFim, parseInt(diaVencimento), parseBRL(mensalidadeValor), fichaSel.aluno_id ?? '', fichaSel.id, usuario?.segmento ?? 'ead', idFinal ?? '')
        .forEach(p => linhas.push({ contrato_id: idFinal, aluno_id: fichaSel.aluno_id, segmento: usuario?.segmento ?? 'ead', tipo: 'mensalidade', vencimento: toISOLocal(p.vencimento), valor: p.valor, status: 'pendente', descricao: p.descricao }));

      if (linhas.length > 0) {
        const { error } = await supabase.from('financeiro_mensalidades').insert(linhas);
        if (error) throw error;
      }

      setSalvo(true);
      toast.success(contratoId ? `Contrato atualizado! ${linhas.length} parcela(s) recriadas.` : `Contrato salvo! ${linhas.length} parcela(s) geradas no caixa.`);
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + e.message);
    } finally {
      setSalvando(false);
    }
  }

  // ── Impressão ─────────────────────────────────────────
  async function imprimirContrato() {
    if (!fichaSel) { toast.error('Selecione um aluno primeiro'); return; }

    let logoBase64 = '';
    try {
      const resp = await fetch('/logo-colegio-conexao.png');
      const blob = await resp.blob();
      logoBase64 = await new Promise<string>(res => {
        const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(blob);
      });
    } catch (_) {}

    const periodoLabel = dataInicio && dataFim ? `${fmtDataBR(dataInicio)} a ${fmtDataBR(dataFim)}` : '—';
    const valorSemAnt  = parseBRL(mensalidadeValor) - parseBRL(descIndicacao);
    const valorComAnt  = valorSemAnt - parseBRL(descAntecipacao);
    const temDescInd   = parseBRL(descIndicacao) > 0;
    const temDescAnt   = parseBRL(descAntecipacao) > 0;
    const colSpanExtra = 2 + (temDescInd ? 1 : 0) + (temDescAnt ? 1 : 0);

    const linhasMens = parcelasPreview.filter(p => p.tipo === 'mensalidade').map(p => `
      <tr>
        <td>${p.descricao}</td>
        <td style="text-align:center">${p.vencimento.toLocaleDateString('pt-BR')}</td>
        ${temDescInd ? `<td style="text-align:center">–R$ ${formatBRL(parseBRL(descIndicacao))}</td>` : ''}
        ${temDescAnt ? `<td style="text-align:center">–R$ ${formatBRL(parseBRL(descAntecipacao))}</td>` : ''}
        <td style="text-align:right"><strong>R$ ${formatBRL(temDescAnt ? valorComAnt : valorSemAnt)}</strong></td>
      </tr>`).join('');

    const blocoMatricula = matriculaHab
      ? `<tr><td>Matrícula</td><td style="text-align:center">${fmtDataBR(matriculaVenc)}</td>${temDescInd ? '<td>—</td>' : ''}${temDescAnt ? '<td>—</td>' : ''}<td style="text-align:right"><strong>R$ ${formatBRL(parseBRL(matriculaValor))}</strong></td></tr>`
      : `<tr><td>Matrícula</td><td colspan="${colSpanExtra}" style="color:#888;text-align:center">Concedida</td></tr>`;

    const blocoPlataforma = plataformaHab
      ? `<tr><td>Taxa de Plataforma / Material</td><td style="text-align:center">${fmtDataBR(plataformaVenc)}</td>${temDescInd ? '<td>—</td>' : ''}${temDescAnt ? '<td>—</td>' : ''}<td style="text-align:right"><strong>R$ ${formatBRL(parseBRL(plataformaValor))}</strong></td></tr>`
      : `<tr><td>Taxa de Plataforma / Material</td><td colspan="${colSpanExtra}" style="color:#888;text-align:center">Concedida</td></tr>`;

    const thDescInd = temDescInd ? '<th style="text-align:center">Desc. Indicação</th>' : '';
    const thDescAnt = temDescAnt ? `<th style="text-align:center">Desc. Antecipação (até dia ${diaVencimento})</th>` : '';

    const logoHtml = logoBase64
      ? `<img src="${logoBase64}" style="width:62px;height:62px;object-fit:contain;background:#fff;border-radius:50%;padding:4px;box-shadow:0 2px 8px rgba(0,0,0,.25);flex-shrink:0" alt=""/>`
      : `<div style="width:62px;height:62px;border-radius:50%;background:#fff;flex-shrink:0"></div>`;
    const marcaDagua = logoBase64
      ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-45%);opacity:.07;pointer-events:none;z-index:0"><img src="${logoBase64}" style="width:340px;height:340px;object-fit:contain" alt=""/></div>` : '';

    const janela = window.open('', '_blank', 'width=900,height=1100');
    if (!janela) { toast.error('Permita pop-ups para imprimir'); return; }

    janela.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Contrato — ${nomeAluno}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;font-size:11.5px;color:#1a1a1a;background:#fff}
  .pagina{width:210mm;min-height:297mm;margin:0 auto;padding:0;position:relative;overflow:hidden}
  .topo{background:linear-gradient(135deg,#1a4fa0 0%,#2563b0 65%,#f59e0b 100%);height:30mm;display:flex;align-items:center;padding:0 16mm;gap:16px;position:relative}
  .topo::after{content:'';position:absolute;bottom:0;left:0;right:0;height:5px;background:#f59e0b}
  .topo-texto{color:#fff}
  .topo-texto h1{font-size:15px;font-weight:bold;letter-spacing:.8px;text-transform:uppercase}
  .topo-texto h2{font-size:11px;margin-top:3px;opacity:.9;font-weight:normal}
  .corpo{padding:9mm 16mm 28mm;position:relative;z-index:1}
  .label{font-weight:bold;font-size:10px;margin-top:7px;margin-bottom:2px;text-transform:uppercase;letter-spacing:.5px;color:#1a4fa0}
  .valor{border:1.5px solid #b8cef0;border-radius:8px;padding:5px 9px;font-size:11.5px;min-height:26px;background:#f5f8ff;color:#1a1a1a;line-height:1.4}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
  .secao{margin:6mm 0 3mm;display:flex;align-items:center;gap:8px}
  .secao-linha{flex:1;height:1.5px;background:linear-gradient(90deg,#2563b0,#b8cef0)}
  .secao-titulo{font-weight:bold;font-size:10.5px;text-transform:uppercase;letter-spacing:.6px;color:#1a4fa0;white-space:nowrap;padding:0 5px}
  .clausula{margin-bottom:5px;text-align:justify;line-height:1.55;font-size:11px}
  .num{font-weight:bold;color:#1a4fa0}
  table{width:100%;border-collapse:collapse;margin:4px 0;font-size:10.5px}
  thead tr{background:#1a4fa0;color:#fff}
  thead th{padding:5px 8px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.3px}
  tbody tr:nth-child(even){background:#f0f5ff}
  tbody tr:nth-child(odd){background:#fff}
  tbody td{padding:4px 8px;border-bottom:1px solid #d0dff5}
  tfoot tr{background:#e8f0ff;font-weight:bold}
  tfoot td{padding:5px 8px}
  .assinaturas{display:flex;justify-content:space-between;margin-top:10mm}
  .assinatura{text-align:center;width:42%}
  .assinatura .linha{border-top:2px solid #1a4fa0;margin-bottom:5px}
  .assinatura p{font-size:10px;color:#444}
  .rodape{position:absolute;bottom:0;left:0;right:0;background:#1a4fa0;color:#fff;text-align:center;font-size:9px;padding:6px 16mm;line-height:1.7}
  @page{size:A4;margin:0}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style>
</head><body><div class="pagina">
  <div class="topo">${logoHtml}<div class="topo-texto"><h1>Contrato de Prestação de Serviços Educacionais</h1><h2>${periodoLabel} &nbsp;·&nbsp; ${(usuario?.segmento ?? 'ead').toUpperCase()}</h2></div></div>
  ${marcaDagua}
  <div class="corpo">
    <div class="secao"><div class="secao-linha"></div><div class="secao-titulo">Contratada</div><div class="secao-linha"></div></div>
    <div class="grid2">
      <div><div class="label">Razão Social</div><div class="valor">Instituto SynerTech LTDA (Colégio Conexão Maranhense)</div></div>
      <div><div class="label">CNPJ</div><div class="valor">08.660.860/0001-63</div></div>
    </div>
    <div class="label">Endereço</div><div class="valor">Av. João Pessoa, 262 - Outeiro da Cruz – São Luís/MA</div>

    <div class="secao"><div class="secao-linha"></div><div class="secao-titulo">Contratante</div><div class="secao-linha"></div></div>
    <div class="grid3">
      <div><div class="label">Nome do Responsável</div><div class="valor">${nomeResponsavel}</div></div>
      <div><div class="label">RG</div><div class="valor">${rgResponsavel || '—'}</div></div>
      <div><div class="label">CPF</div><div class="valor">${cpfResponsavel}</div></div>
    </div>
    <div class="label">Endereço</div><div class="valor">${endereco || '—'}</div>
    <div class="grid2">
      <div><div class="label">Aluno(a)</div><div class="valor">${nomeAluno}</div></div>
      <div><div class="label">Série</div><div class="valor">${serie}</div></div>
    </div>

    <div class="clausula" style="margin-top:5mm">As partes acima qualificadas, doravante denominadas ESCOLA e CONTRATANTE, ajustam entre si o presente Contrato de Prestação de Serviços Educacionais, com vigência de <strong>${fmtDataExtenso(dataInicio)}</strong> a <strong>${fmtDataExtenso(dataFim)}</strong>, conforme cláusulas e condições adiante dispostas.</div>

    <div class="secao"><div class="secao-linha"></div><div class="secao-titulo">I – Do Objeto</div><div class="secao-linha"></div></div>
    <div class="clausula"><span class="num">Cláusula 1ª.</span> O presente contrato tem por objeto a prestação de serviços educacionais regulares ao(à) aluno(a) acima identificado(a), compreendendo o período letivo de <strong>${fmtDataExtenso(dataInicio)}</strong> a <strong>${fmtDataExtenso(dataFim)}</strong>, conforme calendário escolar e regimento interno da ESCOLA.</div>
    <div class="clausula"><span class="num">Cláusula 2ª.</span> A ESCOLA compromete-se a ministrar aulas e desenvolver as atividades pedagógicas pertinentes, presenciais e/ou virtuais, observando os princípios educacionais vigentes e o planejamento escolar.</div>

    <div class="secao"><div class="secao-linha"></div><div class="secao-titulo">II – Do Local e do Material</div><div class="secao-linha"></div></div>
    <div class="clausula"><span class="num">Cláusula 3ª.</span> As aulas e demais atividades educacionais serão realizadas nas dependências da ESCOLA, ou em plataforma digital oficial quando necessário. A execução dos serviços tem início em <strong>${fmtDataExtenso(dataInicio)}</strong> e término em <strong>${fmtDataExtenso(dataFim)}</strong>, encerrando-se automaticamente nesta data.</div>

    <div class="secao"><div class="secao-linha"></div><div class="secao-titulo">III – Da Matrícula e Condições de Validade</div><div class="secao-linha"></div></div>
    <div class="clausula"><span class="num">Cláusula 4ª.</span> A matrícula será considerada efetivada após: (i) assinatura deste contrato; (ii) pagamento da primeira mensalidade; (iii) inexistência de débitos anteriores; (iv) aprovação da Direção da ESCOLA.</div>

    <div class="secao"><div class="secao-linha"></div><div class="secao-titulo">IV – Da Contraprestação e Formas de Pagamento</div><div class="secao-linha"></div></div>
    <div class="clausula"><span class="num">Cláusula 5ª.</span> Pela prestação dos serviços educacionais durante o período contratado, o CONTRATANTE pagará à ESCOLA os valores especificados abaixo:</div>
    <table>
      <thead><tr><th>Descrição</th><th style="text-align:center">Vencimento</th>${thDescInd}${thDescAnt}<th style="text-align:right">Valor (R$)</th></tr></thead>
      <tbody>${blocoMatricula}${blocoPlataforma}${linhasMens}</tbody>
      <tfoot><tr><td colspan="${colSpanExtra}">Total do Contrato</td><td style="text-align:right">R$ ${formatBRL(totalGeral)}</td></tr></tfoot>
    </table>
    <div class="clausula">§ 1º. ${temDescAnt ? `O desconto de antecipação de R$ ${formatBRL(parseBRL(descAntecipacao))} será concedido apenas se o pagamento ocorrer até o dia ${diaVencimento} de cada mês. Após o vencimento, o valor sem desconto será devido: <strong>R$ ${formatBRL(valorSemAnt)}/mês</strong>.` : `O valor da mensalidade é de <strong>R$ ${formatBRL(valorSemAnt)}/mês</strong>, com vencimento todo dia ${diaVencimento}.`}<br/>§ 2º. A ausência às aulas não exime o CONTRATANTE do pagamento integral, uma vez que o serviço permanece à disposição.</div>

    <div class="secao"><div class="secao-linha"></div><div class="secao-titulo">V – Da Inadimplência</div><div class="secao-linha"></div></div>
    <div class="clausula"><span class="num">Cláusula 6ª.</span> O não pagamento das mensalidades nas datas de vencimento sujeitará o CONTRATANTE às penalidades seguintes: (i) multa de 5% sobre o valor em atraso; (ii) juros de mora de 2% ao mês; (iii) atualização monetária pelo IGPM/FGV; (iv) protesto do título após 30 dias e comunicação aos órgãos de proteção ao crédito.</div>

    <div class="secao"><div class="secao-linha"></div><div class="secao-titulo">VI – Da Rescisão</div><div class="secao-linha"></div></div>
    <div class="clausula"><span class="num">Cláusula 7ª.</span> O presente contrato poderá ser rescindido: (i) pelo CONTRATANTE, mediante aviso prévio de 30 dias; (ii) pela ESCOLA, em caso de inadimplência ou descumprimento de cláusulas contratuais.<br/><strong>Parágrafo Único.</strong> Em caso de rescisão antecipada por iniciativa do CONTRATANTE, será devida multa compensatória de 10% sobre as parcelas vincendas, além do pagamento proporcional ao período cursado.</div>

    <div class="secao"><div class="secao-linha"></div><div class="secao-titulo">VII – Do Uso de Imagem e Voz</div><div class="secao-linha"></div></div>
    <div class="clausula"><span class="num">Cláusula 8ª.</span> O CONTRATANTE autoriza o uso da imagem e voz do(a) aluno(a) em registros e divulgações institucionais da ESCOLA, podendo revogar tal autorização mediante solicitação escrita.</div>

    <div class="secao"><div class="secao-linha"></div><div class="secao-titulo">VIII – Das Disposições Finais</div><div class="secao-linha"></div></div>
    <div class="clausula"><span class="num">Cláusula 9ª.</span> Fica eleito o Foro da Comarca de São Luís/MA para dirimir quaisquer dúvidas oriundas deste instrumento, com renúncia expressa a qualquer outro foro.</div>

    <div class="clausula" style="text-align:center;margin-top:7mm">São Luís/MA, ${fmtDataExtenso(dataAssinatura)}.</div>
    <div class="assinaturas">
      <div class="assinatura"><div class="linha"></div><p><strong>${nomeResponsavel}</strong></p><p>CONTRATANTE — CPF: ${cpfResponsavel}</p></div>
      <div class="assinatura"><div class="linha"></div><p><strong>Instituto SynerTech LTDA</strong></p><p>Colégio Conexão Maranhense — CNPJ: 08.660.860/0001-63</p></div>
    </div>
  </div>
  <div class="rodape">COLÉGIO CONEXÃO MARANHENSE &nbsp;|&nbsp; CNPJ: 08.660.860/0001-63 &nbsp;|&nbsp; RECONHECIDO PELO CEE Nº 67/2019<br/>AVENIDA JOÃO PESSOA, 262 - OUTEIRO DA CRUZ &nbsp;|&nbsp; SÃO LUÍS – MARANHÃO</div>
</div></body></html>`);
    janela.document.close();
    janela.focus();
    setTimeout(() => janela.print(), 400);
  }

  // ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onVoltar} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Emissão de Contratos</h2>
            <p className="text-muted-foreground text-sm mt-0.5">Gere e imprima contratos de prestação de serviços educacionais</p>
          </div>
        </div>
        {fichaSel && aba === 'novo' && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetarFormulario} className="border-border text-foreground hover:bg-muted">
              <RefreshCw className="w-4 h-4 mr-2" /> Novo Contrato
            </Button>
            <Button variant="outline" onClick={imprimirContrato} className="border-border text-foreground hover:bg-muted">
              <Printer className="w-4 h-4 mr-2" /> Imprimir
            </Button>
            <Button onClick={salvarContrato} disabled={salvando || salvo} className="bg-blue-600 hover:bg-blue-700 text-white">
              {salvando ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
               : salvo  ? <><CheckCircle className="w-4 h-4 mr-2" />{contratoId ? 'Atualizado' : 'Salvo'}</>
               :           <><Save className="w-4 h-4 mr-2" />{contratoId ? 'Atualizar Contrato' : 'Salvar Contrato'}</>}
            </Button>
          </div>
        )}
      </div>

      {salvo && (
        <Card className="border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <p className="text-sm font-semibold text-green-800 dark:text-green-200">
              {contratoId ? 'Contrato atualizado' : 'Contrato salvo'}! {parcelasPreview.length} parcela(s) no caixa. Clique em Imprimir para gerar o PDF.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Abas */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        {([
          { id: 'novo',     label: 'Novo Contrato',      icon: <FileText      className="w-4 h-4" /> },
          { id: 'emitidos', label: 'Contratos Emitidos', icon: <ClipboardList className="w-4 h-4" /> },
        ] as const).map(a => (
          <button key={a.id} onClick={() => { if (a.id === 'novo' && aba === 'emitidos') resetarFormulario(); setAba(a.id); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${aba === a.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {a.icon}{a.label}
          </button>
        ))}
      </div>

      {/* ════ ABA CONTRATOS EMITIDOS ════ */}
      {aba === 'emitidos' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Total de Contratos', valor: totalContratos,  icon: <ClipboardList className="w-5 h-5 text-blue-600 dark:text-blue-400" />,  bg: 'bg-blue-100 dark:bg-blue-900/40',   num: 'text-blue-600 dark:text-blue-400',   borda: 'border-blue-200 dark:border-blue-800' },
              { label: 'Contratos Ativos',   valor: contratosAtivos, icon: <CheckCircle   className="w-5 h-5 text-green-600 dark:text-green-400" />, bg: 'bg-green-100 dark:bg-green-900/40', num: 'text-green-600 dark:text-green-400', borda: 'border-green-200 dark:border-green-800' },
            ].map(c => (
              <Card key={c.label} className={`bg-card border-2 ${c.borda}`}>
                <CardContent className="p-4">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${c.bg}`}>{c.icon}</div>
                  <p className={`text-2xl font-bold ${c.num}`}>{loadingContratos ? '—' : c.valor}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Buscar pelo nome do aluno..." className="pl-9 bg-background border-border text-foreground"
                    value={buscaContratos} onChange={e => setBuscaContratos(e.target.value)} />
                  {buscaContratos && (
                    <button onClick={() => setBuscaContratos('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={carregarContratos} disabled={loadingContratos} className="border-border text-foreground hover:bg-muted">
                  <RefreshCw className={`w-4 h-4 mr-1 ${loadingContratos ? 'animate-spin' : ''}`} /> Atualizar
                </Button>
              </div>
              {buscaContratos && <p className="text-xs text-muted-foreground mt-2">{contratosFiltrados.length} contrato(s) encontrado(s)</p>}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-0">
              {loadingContratos ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : contratosFiltrados.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <ClipboardList className="w-10 h-10 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum contrato encontrado.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {contratosFiltrados.map(c => (
                    <div key={c.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{c.fichas_matricula?.nome_aluno ?? '—'}</p>
                        <p className="text-xs text-muted-foreground">{c.fichas_matricula?.serie ?? '—'} · {c.data_inicio && c.data_fim ? `${fmtDataBR(c.data_inicio)} → ${fmtDataBR(c.data_fim)}` : '—'}</p>
                        <p className="text-xs text-muted-foreground">Mensalidade: R$ {formatBRL(c.mensalidade_valor ?? 0)} · Dia {c.dia_vencimento ?? 5}</p>
                      </div>
                      <div className="hidden sm:flex flex-col items-end gap-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${c.status === 'ativo' ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700' : 'bg-muted text-muted-foreground border-border'}`}>
                          {c.status ?? 'ativo'}
                        </span>
                        <span className="text-xs text-muted-foreground">{new Date(c.criado_em).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button size="sm" variant="outline" onClick={() => editarContrato(c)}
                          className="border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-xs px-2.5">
                          <Edit2 className="w-3.5 h-3.5 mr-1" /> Editar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setConfirmExcluir(c)}
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

      {/* Modal exclusão */}
      {confirmExcluir && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="bg-card border-border w-full max-w-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Excluir contrato</p>
                  <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita</p>
                </div>
              </div>
              <p className="text-sm text-foreground mb-2">Deseja excluir o contrato de <span className="font-medium">{confirmExcluir.fichas_matricula?.nome_aluno}</span>?</p>
              <p className="text-xs text-red-600 dark:text-red-400 mb-6">Todas as parcelas vinculadas também serão excluídas do caixa.</p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 border-border" onClick={() => setConfirmExcluir(null)}>Cancelar</Button>
                <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={confirmarExclusao} disabled={excluindo}>
                  {excluindo ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Excluir'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ════ ABA NOVO CONTRATO ════ */}
      {aba === 'novo' && (
        <>
          {/* Selecionar Aluno */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm text-foreground flex items-center gap-2">
                <User className="w-4 h-4 text-blue-500" /> Selecionar Aluno
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {!fichaSel ? (
                <>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Buscar pelo nome do aluno..." className="pl-9 bg-background border-border text-foreground"
                        value={busca} onChange={e => setBusca(e.target.value)} />
                      {busca && <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>}
                    </div>
                    <Input placeholder="Filtrar por série..." className="bg-background border-border text-foreground"
                      value={filtroSerie} onChange={e => setFiltroSerie(e.target.value)} />
                  </div>
                  {loadingFichas ? (
                    <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                  ) : !busca.trim() && !filtroSerie.trim() ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      <Search className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                      Digite o nome do aluno para buscar.<br/>
                      <span className="text-xs">A busca filtra diretamente no banco — sem limite de alunos.</span>
                    </div>
                  ) : fichasFiltradas.length === 0 ? (
                    <div className="text-center py-6 text-sm text-muted-foreground">Nenhuma ficha encontrada. <span className="text-blue-500">Crie uma matrícula primeiro.</span></div>
                  ) : (
                    <div className="border border-border rounded-lg overflow-hidden max-h-56 overflow-y-auto">
                      <div className="px-3 py-1.5 bg-muted/40 border-b border-border">
                        <p className="text-xs text-muted-foreground">{fichasFiltradas.length} resultado(s) — mostrando até 20</p>
                      </div>
                      {fichasFiltradas.map(f => (
                        <button key={f.id} onClick={() => selecionarFicha(f)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors border-b border-border last:border-0 text-left">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{f.nome_aluno}</p>
                            <p className="text-xs text-muted-foreground">{f.serie ?? '—'} · {f.segmento}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{fichaSel.nome_aluno}</p>
                    <p className="text-xs text-muted-foreground">{fichaSel.serie ?? '—'} · {fichaSel.segmento} · Resp: {fichaSel.nome_responsavel ?? '—'}</p>
                  </div>
                  <button onClick={resetarFormulario} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Formulário */}
          {fichaSel && (
            <div className="space-y-5">

              {/* Dados do Contratante */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-3 border-b border-border">
                  <CardTitle className="text-sm text-foreground">Dados do Contratante</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div>
                    <Label className="text-xs font-semibold text-foreground uppercase">Responsável Financeiro</Label>
                    <Input className="mt-1 bg-background border-border text-foreground" value={nomeResponsavel} onChange={e => setNomeResponsavel(e.target.value)} />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-foreground uppercase">RG</Label>
                      <Input className="mt-1 bg-background border-border text-foreground" placeholder="Número do RG" value={rgResponsavel} onChange={e => setRgResponsavel(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-foreground uppercase">CPF</Label>
                      <Input className="mt-1 bg-background border-border text-foreground" value={cpfResponsavel} onChange={e => setCpfResponsavel(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-foreground uppercase">Endereço</Label>
                    <Input className="mt-1 bg-background border-border text-foreground" value={endereco} onChange={e => setEndereco(e.target.value)} />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-foreground uppercase">Aluno(a)</Label>
                      <Input className="mt-1 bg-background border-border text-foreground" value={nomeAluno} onChange={e => setNomeAluno(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-foreground uppercase">Série</Label>
                      <Input className="mt-1 bg-background border-border text-foreground" value={serie} onChange={e => setSerie(e.target.value)} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dados do Contrato */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-3 border-b border-border">
                  <CardTitle className="text-sm text-foreground">Dados do Contrato</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-foreground uppercase">Tipo de Contrato</Label>
                      <Select value={tipoContrato} onValueChange={setTipoContrato}>
                        <SelectTrigger className="mt-1 bg-background border-border text-foreground"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="anual">Anual</SelectItem>
                          <SelectItem value="curta_duracao">Curta Duração</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-foreground uppercase">Data de Assinatura</Label>
                      <Input type="date" className="mt-1 bg-background border-border text-foreground" value={dataAssinatura} onChange={e => setDataAssinatura(e.target.value)} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Valores */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-3 border-b border-border">
                  <CardTitle className="text-sm text-foreground flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-500" /> Valores
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-5">

                  {/* Matrícula */}
                  <div className={`rounded-xl border-2 p-4 transition-all ${matriculaHab ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10' : 'border-border'}`}>
                    <label className="flex items-center gap-3 cursor-pointer mb-3">
                      <div className="relative">
                        <input type="checkbox" className="sr-only peer" checked={matriculaHab} onChange={e => setMatriculaHab(e.target.checked)} />
                        <div className="w-10 h-6 bg-muted rounded-full peer-checked:bg-blue-600 transition-colors" />
                        <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                      </div>
                      <span className="text-sm font-semibold text-foreground">Matrícula</span>
                      {!matriculaHab && <span className="text-xs text-muted-foreground ml-1">(desativado = concedida)</span>}
                    </label>
                    {matriculaHab && (
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-semibold text-foreground uppercase">Valor (R$)</Label>
                          <Input className="mt-1 bg-background border-border text-foreground" placeholder="0,00" value={matriculaValor} onChange={e => setMatriculaValor(e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-foreground uppercase">Data de Pagamento</Label>
                          <Input type="date" className="mt-1 bg-background border-border text-foreground" value={matriculaVenc} onChange={e => setMatriculaVenc(e.target.value)} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Taxa de Plataforma */}
                  <div className={`rounded-xl border-2 p-4 transition-all ${plataformaHab ? 'border-violet-300 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-900/10' : 'border-border'}`}>
                    <label className="flex items-center gap-3 cursor-pointer mb-3">
                      <div className="relative">
                        <input type="checkbox" className="sr-only peer" checked={plataformaHab} onChange={e => setPlataformaHab(e.target.checked)} />
                        <div className="w-10 h-6 bg-muted rounded-full peer-checked:bg-violet-600 transition-colors" />
                        <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                      </div>
                      <span className="text-sm font-semibold text-foreground">Taxa de Plataforma / Material</span>
                      {!plataformaHab && <span className="text-xs text-muted-foreground ml-1">(desativado = concedida)</span>}
                    </label>
                    {plataformaHab && (
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-semibold text-foreground uppercase">Valor (R$)</Label>
                          <Input className="mt-1 bg-background border-border text-foreground" placeholder="0,00" value={plataformaValor} onChange={e => setPlataformaValor(e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-foreground uppercase">Data de Pagamento</Label>
                          <Input type="date" className="mt-1 bg-background border-border text-foreground" value={plataformaVenc} onChange={e => setPlataformaVenc(e.target.value)} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mensalidades */}
                  <div className="rounded-xl border-2 border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10 p-4">
                    <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" /> Mensalidades
                    </p>
                    <div className="grid sm:grid-cols-2 gap-3 mb-3">
                      <div>
                        <Label className="text-xs font-semibold text-foreground uppercase">Data Início</Label>
                        <Input type="date" className="mt-1 bg-background border-border text-foreground" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-foreground uppercase">Data Fim</Label>
                        <Input type="date" className="mt-1 bg-background border-border text-foreground" value={dataFim} onChange={e => setDataFim(e.target.value)} />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3 mb-3">
                      <div>
                        <Label className="text-xs font-semibold text-foreground uppercase">Valor da Mensalidade (R$)</Label>
                        <Input className="mt-1 bg-background border-border text-foreground" placeholder="0,00" value={mensalidadeValor} onChange={e => setMensalidadeValor(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-foreground uppercase">Dia de Vencimento</Label>
                        <Select value={diaVencimento} onValueChange={setDiaVencimento}>
                          <SelectTrigger className="mt-1 bg-background border-border text-foreground"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[1,5,10,15,20,25,30].map(d => <SelectItem key={d} value={String(d)}>Dia {d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-semibold text-foreground uppercase">Desc. Indicação (R$)</Label>
                        <Input className="mt-1 bg-background border-border text-foreground" placeholder="0,00" value={descIndicacao} onChange={e => setDescIndicacao(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-foreground uppercase">Desc. Antecipação — até dia {diaVencimento} (R$)</Label>
                        <Input className="mt-1 bg-background border-border text-foreground" placeholder="0,00" value={descAntecipacao} onChange={e => setDescAntecipacao(e.target.value)} />
                      </div>
                    </div>
                    {mensalidadeValor && (
                      <div className="mt-3 grid grid-cols-2 gap-3 p-3 bg-card border border-border rounded-lg">
                        <div>
                          <p className="text-xs text-muted-foreground">Sem antecipação</p>
                          <p className="text-base font-bold text-foreground">R$ {formatBRL(parseBRL(mensalidadeValor) - parseBRL(descIndicacao))}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Com antecipação</p>
                          <p className="text-base font-bold text-green-600 dark:text-green-400">R$ {formatBRL(parseBRL(mensalidadeValor) - parseBRL(descIndicacao) - parseBRL(descAntecipacao))}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Preview parcelas */}
                  {parcelasPreview.length > 0 && (
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                      <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/40">
                        <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Preview — {parcelasPreview.length} parcela(s) a gerar no caixa</p>
                        <p className="text-xs font-bold text-foreground">Total: R$ {formatBRL(totalGeral)}</p>
                      </div>
                      <div className="divide-y divide-border max-h-64 overflow-y-auto">
                        {parcelasPreview.map((p, i) => (
                          <div key={i} className="flex items-center justify-between px-4 py-2.5">
                            <div>
                              <p className="text-xs font-medium text-foreground">{p.descricao}</p>
                              <p className="text-xs text-muted-foreground">Vencimento: {p.vencimento.toLocaleDateString('pt-BR')}</p>
                            </div>
                            <span className={`text-xs font-bold ${p.tipo === 'matricula' ? 'text-blue-600 dark:text-blue-400' : p.tipo === 'plataforma' ? 'text-violet-600 dark:text-violet-400' : 'text-green-600 dark:text-green-400'}`}>
                              R$ {formatBRL(p.valor)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Estado vazio */}
          {!fichaSel && (
            <Card className="bg-card border-border border-dashed">
              <CardContent className="p-16 text-center">
                <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Busque e selecione um aluno acima para configurar o contrato</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}