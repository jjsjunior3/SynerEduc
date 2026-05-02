import { useState, useRef, useEffect } from 'react';
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
  ArrowLeft, Save, Printer, Loader2,
  User, Users, GraduationCap, AlertCircle, CheckCircle,
  Link2,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Tipos ───────────────────────────────────────────────
interface FormularioMatriculaProps {
  onVoltar: () => void;
  /** Segmento fixo do gestor logado — pré-define e bloqueia o campo */
  segmentoInicial?: string;
  /** Contexto vindo de "Criar Ficha" em Gerenciar Alunos */
  alunoIdInicial?: string;
  nomeAlunoInicial?: string;
}

interface FormData {
  nome_aluno: string;
  data_nascimento: string;
  cpf_aluno: string;
  filiacao: string;          // sem acento — igual ao banco
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

// ─── Máscaras ────────────────────────────────────────────
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

// ─── Componente principal ─────────────────────────────────
export function FormularioMatricula({
  onVoltar,
  segmentoInicial,
  alunoIdInicial,
  nomeAlunoInicial,
}: FormularioMatriculaProps) {

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
    segmento:          segmentoInicial ?? 'ead',  // herdado do gestor logado
    ano_letivo:        '2026',
    status_matricula:  'ativa',
  };

  const [form, setForm]         = useState<FormData>(FORM_INICIAL);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo]       = useState(false);
  const [fichaId, setFichaId]   = useState<string | null>(null);
  const printRef                = useRef<HTMLDivElement>(null);

  // ── Se chegar com nome pré-preenchido via contexto, aplica ──
  useEffect(() => {
    if (nomeAlunoInicial) {
      setForm(prev => ({ ...prev, nome_aluno: nomeAlunoInicial }));
    }
  }, [nomeAlunoInicial]);

  // ── Atualizar campo ──────────────────────────────────
  const set = (campo: keyof FormData, valor: string) =>
    setForm(prev => ({ ...prev, [campo]: valor }));

  // ── Salvar no banco ──────────────────────────────────
  async function salvarMatricula() {
    if (!form.nome_aluno.trim())       { toast.error('Nome do aluno é obrigatório'); return; }
    if (!form.nome_responsavel.trim()) { toast.error('Nome do responsável é obrigatório'); return; }
    if (!form.serie)                   { toast.error('Selecione a série'); return; }
    if (!form.turno)                   { toast.error('Selecione o turno'); return; }

    setSalvando(true);
    try {
      const payload: Record<string, unknown> = {
        nome_aluno:        form.nome_aluno.trim(),
        data_nascimento:   form.data_nascimento || null,
        cpf_aluno:         form.cpf_aluno       || null,
        filiacao:          form.filiacao         || null,   // ← coluna correta (sem acento)
        nome_responsavel:  form.nome_responsavel.trim(),
        cpf_responsavel:   form.cpf_responsavel  || null,
        endereco:          form.endereco          || null,
        telefone:          form.telefone          || null,
        email_responsavel: form.email_responsavel || null,
        serie:             form.serie,
        turma:             form.turma             || null,
        turno:             form.turno,
        segmento:          form.segmento,
        ano_letivo:        parseInt(form.ano_letivo),
        status_matricula:  form.status_matricula,
        docs_pendentes:    true,
      };

      // Se veio de "Criar Ficha" em Gerenciar Alunos, vincula o aluno_id
      if (alunoIdInicial) {
        payload.aluno_id = alunoIdInicial;
      }

      const { data, error } = await supabase
        .from('fichas_matricula')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      setFichaId(data.id);
      setSalvo(true);
      toast.success(
        alunoIdInicial
          ? 'Ficha criada e vinculada ao aluno com sucesso!'
          : 'Matrícula salva com sucesso!'
      );
    } catch (e: any) {
      toast.error(`Erro ao salvar: ${e.message}`);
    } finally {
      setSalvando(false);
    }
  }

  // ── Impressão ────────────────────────────────────────
  function imprimirFicha() {
    const janela = window.open('', '_blank', 'width=800,height=900');
    if (!janela) { toast.error('Permita pop-ups para imprimir'); return; }

    janela.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Ficha de Matrícula — ${form.nome_aluno}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 12px; color: #111; background: #fff; }
          .pagina { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 20mm 18mm; position: relative; }

          .cabecalho { text-align: center; margin-bottom: 28px; }
          .cabecalho h1 { font-size: 16px; font-weight: bold; letter-spacing: 1px; }
          .cabecalho h2 { font-size: 13px; font-weight: bold; margin-top: 2px; }

          .linha-foto { display: flex; gap: 12px; align-items: flex-start; }
          .linha-foto .campos { flex: 1; }
          .foto-box {
            width: 100px; height: 120px; border: 1.5px solid #bbb;
            display: flex; align-items: center; justify-content: center;
            font-size: 10px; color: #aaa; flex-shrink: 0; margin-top: 18px;
          }

          .campo-label { font-weight: bold; font-size: 11px; margin-bottom: 3px; margin-top: 10px; }
          .campo-valor {
            border: 1.5px solid #ccc; border-radius: 4px;
            padding: 6px 10px; font-size: 12px; min-height: 30px;
            background: #fff;
          }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

          .separador {
            text-align: center; margin: 24px 0 18px;
            font-weight: bold; font-size: 12px;
            border-top: 1px solid #333; padding-top: 14px;
          }

          .rodape {
            position: absolute; bottom: 14mm; left: 18mm; right: 18mm;
            text-align: center; font-size: 9px; color: #555;
            border-top: 1px solid #ccc; padding-top: 8px;
          }

          .assinaturas { display: flex; justify-content: space-between; margin-top: 36px; }
          .assinatura { text-align: center; width: 40%; }
          .assinatura .linha { border-top: 1px solid #333; margin-bottom: 4px; }
          .assinatura p { font-size: 10px; }

          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .pagina { padding: 15mm 15mm; }
          }
        </style>
      </head>
      <body>
        <div class="pagina">
          <div class="cabecalho">
            <h1>FICHA DE MATRÍCULA</h1>
            <h2>ANO LETIVO ${form.ano_letivo}</h2>
          </div>

          <div class="linha-foto">
            <div class="campos">
              <div class="campo-label">NOME DO ALUNO:</div>
              <div class="campo-valor">${form.nome_aluno}</div>

              <div class="grid-2" style="margin-top:0">
                <div>
                  <div class="campo-label">SÉRIE:</div>
                  <div class="campo-valor">${form.serie}</div>
                </div>
                <div>
                  <div class="campo-label">DATA DE NASCIMENTO:</div>
                  <div class="campo-valor">${form.data_nascimento
                    ? new Date(form.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR')
                    : ''}</div>
                </div>
              </div>

              <div class="campo-label">FILIAÇÃO:</div>
              <div class="campo-valor">${form.filiacao}</div>
            </div>
            <div class="foto-box">Foto 3x4</div>
          </div>

          <div class="separador">IDENTIFICAÇÃO DAS PARTES CONTRATADAS</div>

          <div class="campo-label">RESPONSÁVEL FINANCEIRO:</div>
          <div class="campo-valor">${form.nome_responsavel}</div>

          <div class="campo-label">CPF</div>
          <div class="campo-valor" style="max-width:220px">${form.cpf_responsavel}</div>

          <div class="campo-label">ENDEREÇO:</div>
          <div class="campo-valor">${form.endereco}</div>

          <div class="grid-2">
            <div>
              <div class="campo-label">TELEFONE DE CONTATO:</div>
              <div class="campo-valor">${form.telefone}</div>
            </div>
            <div>
              <div class="campo-label">E-MAIL:</div>
              <div class="campo-valor">${form.email_responsavel}</div>
            </div>
          </div>

          <div class="assinaturas">
            <div class="assinatura">
              <div class="linha"></div>
              <p>Assinatura do Responsável</p>
            </div>
            <div class="assinatura">
              <div class="linha"></div>
              <p>Assinatura da Direção</p>
            </div>
          </div>

          <div class="rodape">
            COLÉGIO CONEXÃO MARANHENSE &nbsp;|&nbsp;
            CNPJ: 08.660.860/0001-63 &nbsp;|&nbsp;
            RECONHECIDO PELO CEE Nº 67/2019<br/>
            AVENIDA JOÃO PESSOA, 262 - OUTEIRO DA CRUZ &nbsp;|&nbsp;
            SÃO LUÍS – MARANHÃO
          </div>
        </div>
      </body>
      </html>
    `);

    janela.document.close();
    janela.focus();
    setTimeout(() => { janela.print(); }, 400);
  }

  // ─── Render ───────────────────────────────────────────
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
            <h2 className="text-2xl font-bold text-foreground">Nova Matrícula</h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              Preencha os dados para gerar a ficha de matrícula
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {salvo && (
            <Button variant="outline" onClick={imprimirFicha}
              className="border-border text-foreground hover:bg-muted">
              <Printer className="w-4 h-4 mr-2" /> Imprimir Ficha
            </Button>
          )}
          <Button onClick={salvarMatricula} disabled={salvando}
            className="bg-blue-600 hover:bg-blue-700 text-white">
            {salvando
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
              : <><Save    className="w-4 h-4 mr-2" />Salvar Matrícula</>}
          </Button>
        </div>
      </div>

      {/* Banner: contexto de aluno vinculado */}
      {alunoIdInicial && !salvo && (
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

      {/* Banner de sucesso */}
      {salvo && (
        <Card className="border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                {alunoIdInicial
                  ? 'Ficha criada e vinculada ao aluno com sucesso!'
                  : 'Matrícula salva com sucesso!'}
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                ID: {fichaId} · Documentos marcados como pendentes
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Seção 1: Dados do Aluno ── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base text-foreground flex items-center gap-2">
            <User className="w-4 h-4 text-blue-500" />
            Dados do Aluno
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">

          <div>
            <Label className="text-foreground text-xs font-semibold uppercase tracking-wide">
              Nome Completo do Aluno *
            </Label>
            <Input className="mt-1 bg-background border-border text-foreground"
              placeholder="Digite o nome completo"
              value={form.nome_aluno}
              onChange={e => set('nome_aluno', e.target.value)} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-foreground text-xs font-semibold uppercase tracking-wide">
                Data de Nascimento
              </Label>
              <Input type="date" className="mt-1 bg-background border-border text-foreground"
                value={form.data_nascimento}
                onChange={e => set('data_nascimento', e.target.value)} />
            </div>
            <div>
              <Label className="text-foreground text-xs font-semibold uppercase tracking-wide">
                CPF do Aluno
              </Label>
              <Input className="mt-1 bg-background border-border text-foreground"
                placeholder="000.000.000-00"
                value={form.cpf_aluno}
                onChange={e => set('cpf_aluno', mascaraCPF(e.target.value))} />
            </div>
          </div>

          <div>
            <Label className="text-foreground text-xs font-semibold uppercase tracking-wide">
              Filiação (Pai e Mãe)
            </Label>
            <Input className="mt-1 bg-background border-border text-foreground"
              placeholder="Nome do pai e nome da mãe"
              value={form.filiacao}
              onChange={e => set('filiacao', e.target.value)} />
          </div>

        </CardContent>
      </Card>

      {/* ── Seção 2: Identificação das Partes Contratadas ── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" />
            Identificação das Partes Contratadas
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">

          <div>
            <Label className="text-foreground text-xs font-semibold uppercase tracking-wide">
              Responsável Financeiro *
            </Label>
            <Input className="mt-1 bg-background border-border text-foreground"
              placeholder="Nome completo do responsável"
              value={form.nome_responsavel}
              onChange={e => set('nome_responsavel', e.target.value)} />
          </div>

          <div>
            <Label className="text-foreground text-xs font-semibold uppercase tracking-wide">
              CPF do Responsável
            </Label>
            <Input className="mt-1 bg-background border-border text-foreground max-w-xs"
              placeholder="000.000.000-00"
              value={form.cpf_responsavel}
              onChange={e => set('cpf_responsavel', mascaraCPF(e.target.value))} />
          </div>

          <div>
            <Label className="text-foreground text-xs font-semibold uppercase tracking-wide">
              Endereço Completo
            </Label>
            <Input className="mt-1 bg-background border-border text-foreground"
              placeholder="Rua, número, bairro, cidade - UF"
              value={form.endereco}
              onChange={e => set('endereco', e.target.value)} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-foreground text-xs font-semibold uppercase tracking-wide">
                Telefone de Contato
              </Label>
              <Input className="mt-1 bg-background border-border text-foreground"
                placeholder="(00) 00000-0000"
                value={form.telefone}
                onChange={e => set('telefone', mascaraTelefone(e.target.value))} />
            </div>
            <div>
              <Label className="text-foreground text-xs font-semibold uppercase tracking-wide">
                E-mail
              </Label>
              <Input type="email" className="mt-1 bg-background border-border text-foreground"
                placeholder="email@exemplo.com"
                value={form.email_responsavel}
                onChange={e => set('email_responsavel', e.target.value)} />
            </div>
          </div>

        </CardContent>
      </Card>

      {/* ── Seção 3: Dados da Matrícula ── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base text-foreground flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-blue-500" />
            Dados da Matrícula
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-foreground text-xs font-semibold uppercase tracking-wide">
                Série *
              </Label>
              <Select value={form.serie} onValueChange={v => set('serie', v)}>
                <SelectTrigger className="mt-1 bg-background border-border text-foreground">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    '5º ano - Ensino Fundamental',
                    '6º ano - Ensino Fundamental',
                    '7º ano - Ensino Fundamental',
                    '8º ano - Ensino Fundamental',
                    '9º ano - Ensino Fundamental',
                    '1ª série - Ensino Médio',
                    '2ª série - Ensino Médio',
                    '3ª série - Ensino Médio',
                  ].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-foreground text-xs font-semibold uppercase tracking-wide">
                Turma
              </Label>
              <Select value={form.turma} onValueChange={v => set('turma', v)}>
                <SelectTrigger className="mt-1 bg-background border-border text-foreground">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {['A', 'B', 'C', 'D'].map(t => (
                    <SelectItem key={t} value={t}>Turma {t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-foreground text-xs font-semibold uppercase tracking-wide">
                Turno *
              </Label>
              <Select value={form.turno} onValueChange={v => set('turno', v)}>
                <SelectTrigger className="mt-1 bg-background border-border text-foreground">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="matutino">Matutino</SelectItem>
                  <SelectItem value="vespertino">Vespertino</SelectItem>
                  <SelectItem value="noturno">Noturno</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-foreground text-xs font-semibold uppercase tracking-wide">
                Ano Letivo
              </Label>
              <Select value={form.ano_letivo} onValueChange={v => set('ano_letivo', v)}>
                <SelectTrigger className="mt-1 bg-background border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2027">2027</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-foreground text-xs font-semibold uppercase tracking-wide">
                Segmento
              </Label>
              <Select value={form.segmento} onValueChange={v => set('segmento', v)}>
                <SelectTrigger className="mt-1 bg-background border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="presencial">Presencial</SelectItem>
                  <SelectItem value="ead">EAD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-foreground text-xs font-semibold uppercase tracking-wide">
                Status da Matrícula
              </Label>
              <Select value={form.status_matricula} onValueChange={v => set('status_matricula', v)}>
                <SelectTrigger className="mt-1 bg-background border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                  <SelectItem value="transferida">Transferida</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Aviso documentos */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              Após salvar, os documentos serão marcados como <strong>pendentes</strong>.
              Acesse <strong>Documentos Recebidos</strong> para registrar o envio de cada documento.
            </p>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}