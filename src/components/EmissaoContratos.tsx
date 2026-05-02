import { useState, useEffect } from 'react';
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
  ArrowLeft, FileText, Printer, Save,
  Loader2, Search, CheckCircle, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Tipos ───────────────────────────────────────────────
interface EmissaoContratosProps {
  onVoltar: () => void;
}

interface FichaOpcao {
  id: string;
  nome_aluno: string;
  nome_responsavel: string;
  cpf_responsavel: string;
  endereco: string;
  serie: string | null;
  segmento: string | null;
  email_responsavel: string | null;
  telefone: string | null;
}

interface FormContrato {
  ficha_id: string;
  // Dados preenchidos da ficha
  nome_aluno: string;
  serie: string;
  nome_responsavel: string;
  cpf_responsavel: string;
  rg_responsavel: string;
  endereco: string;
  // Dados financeiros
  tipo_contrato: string;       // 'anual' | 'curta_duracao'
  mes_inicio: string;
  mes_fim: string;
  ano_letivo: string;
  valor_base: string;
  desconto_indicacao: string;
  desconto_antecipacao: string;
  qtd_parcelas: string;
  data_assinatura: string;
}

const FORM_INICIAL: FormContrato = {
  ficha_id: '',
  nome_aluno: '',
  serie: '',
  nome_responsavel: '',
  cpf_responsavel: '',
  rg_responsavel: '',
  endereco: '',
  tipo_contrato: 'anual',
  mes_inicio: 'Janeiro',
  mes_fim: 'Dezembro',
  ano_letivo: '2026',
  valor_base: '1.190,00',
  desconto_indicacao: '0,00',
  desconto_antecipacao: '175,00',
  qtd_parcelas: '12',
  data_assinatura: new Date().toISOString().split('T')[0],
};

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

function formatBRL(str: string): string {
  const num = parseFloat(str.replace(',', '.')) || 0;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function valorFinal(base: string, descInd: string, descAntec: string): string {
  const b = parseFloat(base.replace(',', '.')) || 0;
  const i = parseFloat(descInd.replace(',', '.')) || 0;
  const a = parseFloat(descAntec.replace(',', '.')) || 0;
  return formatBRL(String(b - i - a));
}

function valorSemAntecip(base: string, descInd: string): string {
  const b = parseFloat(base.replace(',', '.')) || 0;
  const i = parseFloat(descInd.replace(',', '.')) || 0;
  return formatBRL(String(b - i));
}

// ─── Componente principal ─────────────────────────────────
export function EmissaoContratos({ onVoltar }: EmissaoContratosProps) {
  const [fichas, setFichas]         = useState<FichaOpcao[]>([]);
  const [busca, setBusca]           = useState('');
  const [loading, setLoading]       = useState(true);
  const [salvando, setSalvando]     = useState(false);
  const [salvo, setSalvo]           = useState(false);
  const [form, setForm]             = useState<FormContrato>(FORM_INICIAL);

  // ── Carregar fichas ──────────────────────────────────
  useEffect(() => {
    async function carregar() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('fichas_matricula')
          .select('id, nome_aluno, nome_responsavel, cpf_responsavel, endereco, serie, segmento, email_responsavel, telefone')
          .order('nome_aluno');
        if (error) throw error;
        setFichas(data ?? []);
      } catch (e: any) {
        toast.error('Erro ao carregar fichas: ' + e.message);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, []);

  const fichasFiltradas = fichas.filter(f =>
    !busca.trim() ||
    f.nome_aluno.toLowerCase().includes(busca.toLowerCase())
  );

  // ── Selecionar ficha → preencher campos ──────────────
  function selecionarFicha(ficha: FichaOpcao) {
    // Valor base conforme nível
    const isMedio = (ficha.serie ?? '').toLowerCase().includes('médio');
    const base    = isMedio ? '1.255,00' : '1.190,00';
    const descAnt = isMedio ? '200,00'   : '175,00';

    setForm(prev => ({
      ...prev,
      ficha_id:          ficha.id,
      nome_aluno:        ficha.nome_aluno,
      serie:             ficha.serie ?? '',
      nome_responsavel:  ficha.nome_responsavel,
      cpf_responsavel:   ficha.cpf_responsavel ?? '',
      endereco:          ficha.endereco ?? '',
      valor_base:        base,
      desconto_antecipacao: descAnt,
    }));
    setSalvo(false);
  }

  const set = (campo: keyof FormContrato, valor: string) =>
    setForm(prev => ({ ...prev, [campo]: valor }));

  // ── Salvar registro no banco ─────────────────────────
  async function salvarContrato() {
    if (!form.ficha_id) { toast.error('Selecione um aluno'); return; }
    setSalvando(true);
    try {
      // Salva na tabela contratos (criamos abaixo)
      const { error } = await supabase.from('contratos').insert({
        ficha_id:             form.ficha_id,
        tipo_contrato:        form.tipo_contrato,
        mes_inicio:           form.mes_inicio,
        mes_fim:              form.mes_fim,
        ano_letivo:           parseInt(form.ano_letivo),
        valor_base:           parseFloat(form.valor_base.replace(',', '.')),
        desconto_indicacao:   parseFloat(form.desconto_indicacao.replace(',', '.')),
        desconto_antecipacao: parseFloat(form.desconto_antecipacao.replace(',', '.')),
        qtd_parcelas:         parseInt(form.qtd_parcelas),
        data_assinatura:      form.data_assinatura,
        rg_responsavel:       form.rg_responsavel || null,
      });
      if (error) throw error;
      setSalvo(true);
      toast.success('Contrato salvo com sucesso!');
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + e.message);
    } finally {
      setSalvando(false);
    }
  }

  // ── Impressão ────────────────────────────────────────
  function imprimirContrato() {
    if (!form.ficha_id) { toast.error('Selecione um aluno primeiro'); return; }

    const dataAssinatura = form.data_assinatura
      ? new Date(form.data_assinatura + 'T12:00:00').toLocaleDateString('pt-BR', {
          day: '2-digit', month: 'long', year: 'numeric',
        })
      : '';

    const periodoContrato = form.tipo_contrato === 'anual'
      ? `${form.mes_inicio} a ${form.mes_fim} de ${form.ano_letivo}`
      : `${form.mes_inicio} e ${form.mes_fim} de ${form.ano_letivo}`;

    const vigenciaInicio = `1º de ${form.mes_inicio} de ${form.ano_letivo}`;
    const vigenciaFim    = `31 de ${form.mes_fim} de ${form.ano_letivo}`;

    const vFinal    = valorFinal(form.valor_base, form.desconto_indicacao, form.desconto_antecipacao);
    const vSemAnt   = valorSemAntecip(form.valor_base, form.desconto_indicacao);
    const vBase     = formatBRL(form.valor_base);
    const vDescInd  = form.desconto_indicacao !== '0,00' ? `–${formatBRL(form.desconto_indicacao)}` : '–';
    const vDescAnt  = `–${formatBRL(form.desconto_antecipacao)}`;

    // Gerar linhas da tabela de parcelas
    const mesesContrato: string[] = [];
    const idxInicio = MESES.indexOf(form.mes_inicio);
    const idxFim    = MESES.indexOf(form.mes_fim);
    for (let i = idxInicio; i <= idxFim; i++) mesesContrato.push(MESES[i]);

    const linhasParcelas = mesesContrato.map(mes => `
      <tr>
        <td>${mes}/${form.ano_letivo}</td>
        <td>R$ ${vBase}</td>
        <td>${form.desconto_indicacao !== '0,00' ? `R$ ${formatBRL(form.desconto_indicacao)}` : '–'}</td>
        <td>R$ ${formatBRL(form.desconto_antecipacao)}</td>
        <td><strong>R$ ${vFinal}</strong></td>
      </tr>
    `).join('');

    const janela = window.open('', '_blank', 'width=900,height=1100');
    if (!janela) { toast.error('Permita pop-ups para imprimir'); return; }

    janela.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Contrato — ${form.nome_aluno}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 11px; color: #111; background: #fff; }
          .pagina { width: 210mm; margin: 0 auto; padding: 18mm 20mm; }

          h1 { text-align: center; font-size: 13px; font-weight: bold;
               letter-spacing: 1px; margin-bottom: 4px; }
          .subtitulo { text-align: center; font-size: 11px; margin-bottom: 20px; color: #444; }

          .bloco { margin-bottom: 14px; }
          .bloco-titulo { font-weight: bold; font-size: 11px;
                          border-bottom: 1px solid #333; padding-bottom: 3px;
                          margin-bottom: 8px; text-transform: uppercase; }
          .linha { margin-bottom: 4px; }
          .label { font-weight: bold; }

          .clausula { margin-bottom: 10px; text-align: justify; line-height: 1.55; }
          .clausula .num { font-weight: bold; }

          table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 10.5px; }
          th { background: #f0f0f0; border: 1px solid #ccc; padding: 5px 8px;
               text-align: center; font-weight: bold; }
          td { border: 1px solid #ccc; padding: 5px 8px; text-align: center; }

          .assinaturas { display: flex; justify-content: space-between; margin-top: 40px; }
          .assinatura { text-align: center; width: 44%; }
          .assinatura .linha-ass { border-top: 1px solid #333; margin-bottom: 4px; }
          .assinatura p { font-size: 10px; }

          .rodape { margin-top: 24px; text-align: center; font-size: 9px;
                    color: #666; border-top: 1px solid #ccc; padding-top: 8px; }

          @page { size: A4; margin: 0; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="pagina">

          <h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS</h1>
          <div class="subtitulo">${periodoContrato.toUpperCase()}</div>

          <!-- CONTRATADA -->
          <div class="bloco">
            <div class="bloco-titulo">CONTRATADA</div>
            <div class="linha">
              <span class="label">Razão Social:</span>
              INSTITUTO SYNERTECH LTDA (COLÉGIO CONEXÃO MARANHENSE)
            </div>
            <div class="linha">
              <span class="label">CNPJ:</span> 58.909.103/0001-59 &nbsp;&nbsp;
              <span class="label">Endereço:</span> Av. João Pessoa, 262 - Outeiro da Cruz – São Luís/MA
            </div>
          </div>

          <!-- CONTRATANTE -->
          <div class="bloco">
            <div class="bloco-titulo">CONTRATANTE</div>
            <div class="linha">
              <span class="label">Nome:</span> ${form.nome_responsavel} &nbsp;&nbsp;
              <span class="label">RG:</span> ${form.rg_responsavel || '___________'} &nbsp;&nbsp;
              <span class="label">CPF:</span> ${form.cpf_responsavel}
            </div>
            <div class="linha">
              <span class="label">Endereço:</span> ${form.endereco || '...'}
            </div>
            <div class="linha">
              <span class="label">Aluno(a):</span> ${form.nome_aluno} &nbsp;&nbsp;
              <span class="label">Ano/Série:</span> ${form.serie}
            </div>
          </div>

          <div class="clausula">
            As partes acima qualificadas, doravante denominadas ESCOLA e CONTRATANTE, ajustam entre si
            o presente Contrato de Prestação de Serviços Educacionais, com vigência referente ao período
            letivo de ${periodoContrato}, conforme cláusulas e condições adiante dispostas.
          </div>

          <!-- CLÁUSULAS -->
          <div class="bloco">
            <div class="bloco-titulo">I – Do Objeto</div>
            <div class="clausula">
              <span class="num">Cláusula 1ª.</span> O presente contrato tem por objeto a prestação de serviços
              educacionais regulares ao(à) aluno(a) acima identificado(a), compreendendo o período letivo
              de ${vigenciaInicio} a ${vigenciaFim}, conforme calendário escolar e regimento interno da ESCOLA.
            </div>
            <div class="clausula">
              <span class="num">Cláusula 2ª.</span> A ESCOLA compromete-se a ministrar aulas e desenvolver as
              atividades pedagógicas pertinentes, presenciais e/ou virtuais, observando os princípios
              educacionais vigentes e o planejamento escolar.
            </div>
          </div>

          <div class="bloco">
            <div class="bloco-titulo">II – Do Local e do Material</div>
            <div class="clausula">
              <span class="num">Cláusula 3ª.</span> As aulas e demais atividades educacionais serão realizadas
              nas dependências da ESCOLA, ou em plataforma digital oficial quando necessário.
              A execução dos serviços tem início em ${vigenciaInicio} e término em ${vigenciaFim},
              encerrando-se automaticamente nesta data.
            </div>
          </div>

          <div class="bloco">
            <div class="bloco-titulo">III – Da Matrícula e Condições de Validade</div>
            <div class="clausula">
              <span class="num">Cláusula 4ª.</span> A matrícula será considerada efetivada após:
              (i) assinatura deste contrato; (ii) pagamento da primeira mensalidade;
              (iii) inexistência de débitos anteriores; (iv) aprovação da Direção da ESCOLA.
            </div>
          </div>

          <div class="bloco">
            <div class="bloco-titulo">IV – Da Contraprestação e Formas de Pagamento</div>
            <div class="clausula">
              <span class="num">Cláusula 5ª.</span> Pela prestação dos serviços educacionais durante
              o período contratado, o CONTRATANTE pagará à ESCOLA os valores especificados abaixo:
            </div>
            <table>
              <thead>
                <tr>
                  <th>Mês</th>
                  <th>Parcela Base (R$)</th>
                  <th>Desc. Indicação</th>
                  <th>Desc. Antecipação (até dia 05)</th>
                  <th>Valor Final (R$)</th>
                </tr>
              </thead>
              <tbody>${linhasParcelas}</tbody>
            </table>
            <div class="clausula" style="margin-top:6px">
              § 1º. O desconto de antecipação será concedido apenas se o pagamento ocorrer até o dia 05 de cada mês.
              Após o vencimento, o valor sem desconto de antecipação será devido: <strong>R$ ${vSemAnt}</strong>/mês.<br/>
              § 2º. A ausência às aulas não exime o CONTRATANTE do pagamento integral.
            </div>
          </div>

          <div class="bloco">
            <div class="bloco-titulo">V – Da Inadimplência</div>
            <div class="clausula">
              <span class="num">Cláusula 6ª.</span> O não pagamento nas datas de vencimento sujeitará
              o CONTRATANTE às seguintes penalidades: (i) multa de 5% sobre o valor em atraso;
              (ii) juros de mora de 2% ao mês; (iii) atualização monetária pelo IGPM/FGV;
              (iv) protesto do título após 30 dias e comunicação aos órgãos de proteção ao crédito.
            </div>
          </div>

          <div class="bloco">
            <div class="bloco-titulo">VI – Da Rescisão</div>
            <div class="clausula">
              <span class="num">Cláusula 7ª.</span> O presente contrato poderá ser rescindido:
              (i) pelo CONTRATANTE, mediante aviso prévio de 30 dias;
              (ii) pela ESCOLA, em caso de inadimplência ou descumprimento de cláusulas contratuais.<br/>
              Parágrafo Único. Em caso de rescisão antecipada por iniciativa do CONTRATANTE, será devida
              multa compensatória de 10% sobre as parcelas vincendas, além do pagamento proporcional
              ao período cursado.
            </div>
          </div>

          <div class="bloco">
            <div class="bloco-titulo">VII – Do Uso de Imagem e Voz</div>
            <div class="clausula">
              <span class="num">Cláusula 8ª.</span> O CONTRATANTE autoriza o uso da imagem e voz
              do(a) aluno(a) em registros e divulgações institucionais da ESCOLA, podendo revogar
              tal autorização mediante solicitação escrita.
            </div>
          </div>

          <div class="bloco">
            <div class="bloco-titulo">VIII – Das Disposições Finais</div>
            <div class="clausula">
              <span class="num">Cláusula 9ª.</span> Fica eleito o Foro da Comarca de São Luís/MA
              para dirimir quaisquer dúvidas oriundas deste instrumento, com renúncia expressa
              a qualquer outro foro.
            </div>
          </div>

          <div class="clausula" style="text-align:center; margin-top:16px">
            São Luís/MA, ${dataAssinatura}.
          </div>

          <!-- Assinaturas -->
          <div class="assinaturas">
            <div class="assinatura">
              <div class="linha-ass"></div>
              <p><strong>${form.nome_responsavel}</strong></p>
              <p>CONTRATANTE — CPF: ${form.cpf_responsavel}</p>
            </div>
            <div class="assinatura">
              <div class="linha-ass"></div>
              <p><strong>INSTITUTO SYNERTECH LTDA</strong></p>
              <p>COLÉGIO CONEXÃO MARANHENSE — CNPJ: 58.909.103/0001-59</p>
            </div>
          </div>

          <div class="rodape">
            COLÉGIO CONEXÃO MARANHENSE &nbsp;|&nbsp; CNPJ: 58.909.103/0001-59 &nbsp;|&nbsp;
            RECONHECIDO PELO CEE Nº 67/2019<br/>
            AVENIDA JOÃO PESSOA, 262 - OUTEIRO DA CRUZ &nbsp;|&nbsp; SÃO LUÍS – MARANHÃO
          </div>

        </div>
      </body>
      </html>
    `);

    janela.document.close();
    janela.focus();
    setTimeout(() => janela.print(), 400);
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
            <h2 className="text-2xl font-bold text-foreground">Emissão de Contratos</h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              Gere e imprima contratos de prestação de serviços educacionais
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {form.ficha_id && (
            <>
              <Button variant="outline" onClick={imprimirContrato}
                className="border-border text-foreground hover:bg-muted">
                <Printer className="w-4 h-4 mr-2" /> Imprimir
              </Button>
              <Button onClick={salvarContrato} disabled={salvando}
                className="bg-blue-600 hover:bg-blue-700 text-white">
                {salvando
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
                  : <><Save className="w-4 h-4 mr-2" />Salvar Contrato</>}
              </Button>
            </>
          )}
        </div>
      </div>

      {salvo && (
        <Card className="border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-sm font-semibold text-green-800 dark:text-green-200">
              Contrato salvo! Clique em Imprimir para gerar o PDF.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-5 gap-6">

        {/* ── Lista de fichas ── */}
        <Card className="lg:col-span-2 bg-card border-border">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm text-foreground">Selecionar Aluno</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar aluno..."
                className="pl-9 bg-background border-border text-foreground text-sm"
                value={busca} onChange={e => setBusca(e.target.value)} />
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-1 max-h-[420px] overflow-y-auto">
                {fichasFiltradas.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    Nenhuma ficha encontrada.<br/>
                    <span className="text-blue-500">Crie uma matrícula primeiro.</span>
                  </p>
                ) : fichasFiltradas.map(f => (
                  <button key={f.id}
                    onClick={() => selecionarFicha(f)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors text-sm ${
                      form.ficha_id === f.id
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-muted text-foreground'
                    }`}>
                    <p className="font-medium truncate">{f.nome_aluno}</p>
                    <p className={`text-xs mt-0.5 ${form.ficha_id === f.id ? 'text-blue-100' : 'text-muted-foreground'}`}>
                      {f.serie ?? '—'}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Formulário ── */}
        <div className="lg:col-span-3 space-y-4">

          {!form.ficha_id ? (
            <Card className="bg-card border-border border-dashed">
              <CardContent className="p-12 text-center">
                <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  Selecione um aluno para configurar o contrato
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Dados do Contratante */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-3 border-b border-border">
                  <CardTitle className="text-sm text-foreground">Dados do Contratante</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div>
                    <Label className="text-xs font-semibold text-foreground uppercase">Responsável</Label>
                    <Input className="mt-1 bg-background border-border text-foreground"
                      value={form.nome_responsavel}
                      onChange={e => set('nome_responsavel', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-foreground uppercase">RG</Label>
                      <Input className="mt-1 bg-background border-border text-foreground"
                        placeholder="Número do RG"
                        value={form.rg_responsavel}
                        onChange={e => set('rg_responsavel', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-foreground uppercase">CPF</Label>
                      <Input className="mt-1 bg-background border-border text-foreground"
                        value={form.cpf_responsavel}
                        onChange={e => set('cpf_responsavel', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-foreground uppercase">Endereço</Label>
                    <Input className="mt-1 bg-background border-border text-foreground"
                      value={form.endereco}
                      onChange={e => set('endereco', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-foreground uppercase">Aluno(a)</Label>
                      <Input className="mt-1 bg-background border-border text-foreground"
                        value={form.nome_aluno}
                        onChange={e => set('nome_aluno', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-foreground uppercase">Série</Label>
                      <Input className="mt-1 bg-background border-border text-foreground"
                        value={form.serie}
                        onChange={e => set('serie', e.target.value)} />
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
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-foreground uppercase">Tipo</Label>
                      <Select value={form.tipo_contrato} onValueChange={v => set('tipo_contrato', v)}>
                        <SelectTrigger className="mt-1 bg-background border-border text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="anual">Anual</SelectItem>
                          <SelectItem value="curta_duracao">Curta Duração</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-foreground uppercase">Mês Início</Label>
                      <Select value={form.mes_inicio} onValueChange={v => set('mes_inicio', v)}>
                        <SelectTrigger className="mt-1 bg-background border-border text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MESES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-foreground uppercase">Mês Fim</Label>
                      <Select value={form.mes_fim} onValueChange={v => set('mes_fim', v)}>
                        <SelectTrigger className="mt-1 bg-background border-border text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MESES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-foreground uppercase">Ano Letivo</Label>
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
                    <div>
                      <Label className="text-xs font-semibold text-foreground uppercase">Data de Assinatura</Label>
                      <Input type="date" className="mt-1 bg-background border-border text-foreground"
                        value={form.data_assinatura}
                        onChange={e => set('data_assinatura', e.target.value)} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Valores */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-3 border-b border-border">
                  <CardTitle className="text-sm text-foreground">Valores</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-foreground uppercase">Valor Base (R$)</Label>
                      <Input className="mt-1 bg-background border-border text-foreground"
                        value={form.valor_base}
                        onChange={e => set('valor_base', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-foreground uppercase">Desc. Indicação</Label>
                      <Input className="mt-1 bg-background border-border text-foreground"
                        value={form.desconto_indicacao}
                        onChange={e => set('desconto_indicacao', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-foreground uppercase">Desc. Antecipação</Label>
                      <Input className="mt-1 bg-background border-border text-foreground"
                        value={form.desconto_antecipacao}
                        onChange={e => set('desconto_antecipacao', e.target.value)} />
                    </div>
                  </div>

                  {/* Preview do valor final */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg border border-border">
                    <div>
                      <p className="text-xs text-muted-foreground">Valor sem antecipação</p>
                      <p className="text-base font-bold text-foreground mt-0.5">
                        R$ {valorSemAntecip(form.valor_base, form.desconto_indicacao)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Valor com antecipação</p>
                      <p className="text-base font-bold text-green-600 dark:text-green-400 mt-0.5">
                        R$ {valorFinal(form.valor_base, form.desconto_indicacao, form.desconto_antecipacao)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      Ensino Fundamental: base R$1.190,00 · antecipação R$175,00<br/>
                      Ensino Médio: base R$1.255,00 · antecipação R$200,00
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}