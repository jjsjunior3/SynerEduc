import { useState, useCallback } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from './ui/select';
import {
  ArrowLeft, TrendingUp, TrendingDown,
  DollarSign, Loader2, Printer, RefreshCw,
  BarChart3, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Tipos ───────────────────────────────────────────────
interface RelatorioFinanceiroProps {
  onVoltar: () => void;
}

interface DadosRelatorio {
  receitaTotal: number;
  despesaTotal: number;
  saldo: number;
  receitasPorCategoria: { label: string; valor: number; pct: number }[];
  despesasPorCategoria: { label: string; valor: number; pct: number }[];
  mensalidadesPorStatus: { pago: number; pendente: number; atrasado: number };
}

const MESES = [
  { valor: '01', label: 'Janeiro'   },
  { valor: '02', label: 'Fevereiro' },
  { valor: '03', label: 'Março'     },
  { valor: '04', label: 'Abril'     },
  { valor: '05', label: 'Maio'      },
  { valor: '06', label: 'Junho'     },
  { valor: '07', label: 'Julho'     },
  { valor: '08', label: 'Agosto'    },
  { valor: '09', label: 'Setembro'  },
  { valor: '10', label: 'Outubro'   },
  { valor: '11', label: 'Novembro'  },
  { valor: '12', label: 'Dezembro'  },
];

const ANOS = ['2024', '2025', '2026', '2027'];

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ── Barra de progresso simples ───────────────────────────
function BarraProgresso({
  valor, max, cor,
}: { valor: number; max: number; cor: string }) {
  const pct = max > 0 ? Math.round((valor / max) * 100) : 0;
  return (
    <div className="h-2 bg-muted rounded-full overflow-hidden mt-1.5">
      <div
        className={`h-full rounded-full transition-all duration-500 ${cor}`}
        style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────
export function RelatorioFinanceiro({ onVoltar }: RelatorioFinanceiroProps) {
  const hoje = new Date();
  const [mes,  setMes]  = useState(String(hoje.getMonth() + 1).padStart(2, '0'));
  const [ano,  setAno]  = useState(String(hoje.getFullYear()));
  const [dados, setDados]   = useState<DadosRelatorio | null>(null);
  const [loading, setLoading] = useState(false);

  // ── Carregar relatório ───────────────────────────────
  const carregar = useCallback(async () => {
    setLoading(true);
    setDados(null);
    try {
      const inicioMes = `${ano}-${mes}-01`;
      const fimMes    = new Date(parseInt(ano), parseInt(mes), 0)
        .toISOString().split('T')[0];

      // Mensalidades pagas no mês
      const [
        { data: pagas   },
        { data: pend    },
        { data: atras   },
        { data: despesas },
      ] = await Promise.all([
        supabase.from('financeiro_mensalidades').select('valor')
          .eq('status', 'pago')
          .gte('pago_em', `${inicioMes}T00:00:00`)
          .lte('pago_em', `${fimMes}T23:59:59`),
        supabase.from('financeiro_mensalidades').select('valor')
          .eq('status', 'pendente')
          .gte('vencimento', inicioMes)
          .lte('vencimento', fimMes),
        supabase.from('financeiro_mensalidades').select('valor')
          .eq('status', 'atrasado')
          .gte('vencimento', inicioMes)
          .lte('vencimento', fimMes),
        supabase.from('financeiro_despesas').select('categoria, valor_total, parcelas')
          .not('status', 'eq', 'pendente'),
      ]);

      const soma = (arr: any[] | null) =>
        (arr ?? []).reduce((s, r) => s + Number(r.valor), 0);

      const receitaMensalidades = soma(pagas);
      const receitaTotal        = receitaMensalidades;

      // Despesas: valor da parcela do mês
      const despesasPorCat: Record<string, number> = {};
      const LABEL_CAT: Record<string, string> = {
        funcionarios: 'Funcionários',
        agua:         'Água',
        luz:          'Luz',
        impostos:     'Impostos',
        emprestimos:  'Empréstimos',
        aluguel:      'Aluguel',
        outros:       'Outros',
      };

      let despesaTotal = 0;
      for (const d of despesas ?? []) {
        const valorParcela = Number(d.valor_total) / (d.parcelas || 1);
        const cat = d.categoria ?? 'outros';
        despesasPorCat[cat] = (despesasPorCat[cat] ?? 0) + valorParcela;
        despesaTotal += valorParcela;
      }

      const despesasPorCategoria = Object.entries(despesasPorCat)
        .map(([cat, valor]) => ({
          label: LABEL_CAT[cat] ?? cat,
          valor,
          pct: despesaTotal > 0 ? Math.round((valor / despesaTotal) * 100) : 0,
        }))
        .sort((a, b) => b.valor - a.valor);

      const receitasPorCategoria = [
        {
          label: 'Mensalidades',
          valor: receitaMensalidades,
          pct:   receitaTotal > 0 ? 100 : 0,
        },
      ];

      setDados({
        receitaTotal,
        despesaTotal,
        saldo: receitaTotal - despesaTotal,
        receitasPorCategoria,
        despesasPorCategoria,
        mensalidadesPorStatus: {
          pago:      soma(pagas),
          pendente:  soma(pend),
          atrasado:  soma(atras),
        },
      });
    } catch (e: any) {
      toast.error('Erro ao gerar relatório: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [mes, ano]);

  // ── Impressão ────────────────────────────────────────
  function imprimir() {
    if (!dados) { toast.error('Gere o relatório primeiro'); return; }
    const mesLabel = MESES.find(m => m.valor === mes)?.label ?? mes;

    const janela = window.open('', '_blank', 'width=800,height=900');
    if (!janela) { toast.error('Permita pop-ups para imprimir'); return; }

    janela.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Relatório Financeiro — ${mesLabel}/${ano}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 12px; color: #111; }
          .pagina { width: 210mm; margin: 0 auto; padding: 16mm 18mm; }
          h1 { font-size: 15px; font-weight: bold; text-align: center; }
          h2 { font-size: 12px; color: #555; text-align: center; margin-bottom: 20px; }
          .secao { margin-bottom: 18px; }
          .secao-titulo { font-weight: bold; font-size: 11px; text-transform: uppercase;
                          border-bottom: 1px solid #ccc; padding-bottom: 3px; margin-bottom: 8px; }
          .cards { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 16px; }
          .card { border: 1px solid #ddd; border-radius: 6px; padding: 10px 12px; }
          .card p { font-size: 10px; color: #666; }
          .card h3 { font-size: 16px; font-weight: bold; margin-top: 2px; }
          .card.verde h3 { color: #16a34a; }
          .card.vermelho h3 { color: #dc2626; }
          .card.azul h3 { color: #2563eb; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #f5f5f5; border: 1px solid #ddd; padding: 5px 8px; text-align: left; }
          td { border: 1px solid #ddd; padding: 5px 8px; }
          .barra-bg { background: #e5e7eb; height: 6px; border-radius: 3px; margin-top: 4px; }
          .barra-fill { height: 6px; border-radius: 3px; }
          .rodape { margin-top: 24px; text-align: center; font-size: 9px; color: #777;
                    border-top: 1px solid #ccc; padding-top: 8px; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="pagina">
          <h1>RELATÓRIO FINANCEIRO</h1>
          <h2>${mesLabel.toUpperCase()} / ${ano}</h2>

          <div class="cards">
            <div class="card verde">
              <p>Receita Total</p>
              <h3>${formatBRL(dados.receitaTotal)}</h3>
            </div>
            <div class="card vermelho">
              <p>Despesas Total</p>
              <h3>${formatBRL(dados.despesaTotal)}</h3>
            </div>
            <div class="card azul">
              <p>Saldo</p>
              <h3>${formatBRL(dados.saldo)}</h3>
            </div>
          </div>

          <div class="secao">
            <div class="secao-titulo">Receitas por Categoria</div>
            <table>
              <thead><tr><th>Categoria</th><th>Valor</th><th>%</th></tr></thead>
              <tbody>
                ${dados.receitasPorCategoria.map(r => `
                  <tr>
                    <td>${r.label}</td>
                    <td>${formatBRL(r.valor)}</td>
                    <td>${r.pct}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="secao">
            <div class="secao-titulo">Despesas por Categoria</div>
            <table>
              <thead><tr><th>Categoria</th><th>Valor</th><th>%</th></tr></thead>
              <tbody>
                ${dados.despesasPorCategoria.map(d => `
                  <tr>
                    <td>${d.label}</td>
                    <td>${formatBRL(d.valor)}</td>
                    <td>${d.pct}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="secao">
            <div class="secao-titulo">Status das Mensalidades</div>
            <table>
              <thead><tr><th>Status</th><th>Valor</th></tr></thead>
              <tbody>
                <tr><td>Pago</td><td>${formatBRL(dados.mensalidadesPorStatus.pago)}</td></tr>
                <tr><td>Pendente</td><td>${formatBRL(dados.mensalidadesPorStatus.pendente)}</td></tr>
                <tr><td>Atrasado</td><td>${formatBRL(dados.mensalidadesPorStatus.atrasado)}</td></tr>
              </tbody>
            </table>
          </div>

          <div class="rodape">
            COLÉGIO CONEXÃO MARANHENSE · Relatório gerado em
            ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
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
            <h2 className="text-2xl font-bold text-foreground">Relatório Financeiro</h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              Análise financeira detalhada por período
            </p>
          </div>
        </div>
        {dados && (
          <Button variant="outline" onClick={imprimir}
            className="border-border text-foreground hover:bg-muted">
            <Printer className="w-4 h-4 mr-2" /> Imprimir
          </Button>
        )}
      </div>

      {/* Filtro de período */}
      <Card className="bg-card border-border">
        <CardContent className="p-5">
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <Label className="text-foreground text-xs font-semibold uppercase">Mês</Label>
              <Select value={mes} onValueChange={setMes}>
                <SelectTrigger className="mt-1 w-40 bg-background border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map(m => (
                    <SelectItem key={m.valor} value={m.valor}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-foreground text-xs font-semibold uppercase">Ano</Label>
              <Select value={ano} onValueChange={setAno}>
                <SelectTrigger className="mt-1 w-28 bg-background border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANOS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={carregar} disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white">
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Gerando...</>
                : <><BarChart3 className="w-4 h-4 mr-2" />Visualizar</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultado */}
      {!dados && !loading && (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="p-12 text-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              Selecione o período e clique em Visualizar
            </p>
          </CardContent>
        </Card>
      )}

      {dados && (
        <>
          {/* Cards principais */}
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                label: 'Receita Total',
                valor: formatBRL(dados.receitaTotal),
                icon:  <TrendingUp   className="w-6 h-6 text-white" />,
                cor:   'from-green-500 to-green-600',
                borda: 'border-green-200 dark:border-green-800',
              },
              {
                label: 'Despesas Total',
                valor: formatBRL(dados.despesaTotal),
                icon:  <TrendingDown className="w-6 h-6 text-white" />,
                cor:   'from-red-500 to-red-600',
                borda: 'border-red-200 dark:border-red-800',
              },
              {
                label: 'Saldo',
                valor: formatBRL(dados.saldo),
                icon:  <DollarSign   className="w-6 h-6 text-white" />,
                cor:   dados.saldo >= 0 ? 'from-blue-500 to-blue-600' : 'from-red-500 to-red-600',
                borda: dados.saldo >= 0 ? 'border-blue-200 dark:border-blue-800' : 'border-red-200 dark:border-red-800',
              },
            ].map(c => (
              <Card key={c.label} className={`bg-card border-2 ${c.borda}`}>
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                    <p className={`text-xl font-bold mt-1 ${
                      c.label === 'Saldo' && dados.saldo < 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-foreground'
                    }`}>{c.valor}</p>
                  </div>
                  <div className={`w-12 h-12 bg-gradient-to-br ${c.cor} rounded-xl flex items-center justify-center`}>
                    {c.icon}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Alerta saldo negativo */}
          {dados.saldo < 0 && (
            <Card className="border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-800 dark:text-red-200">
                  <strong>Atenção:</strong> As despesas superam as receitas neste período.
                  Saldo negativo de <strong>{formatBRL(Math.abs(dados.saldo))}</strong>.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Receitas + Despesas lado a lado */}
          <div className="grid lg:grid-cols-2 gap-4">

            {/* Receitas por categoria */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-sm text-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  Receitas por Categoria
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {dados.receitasPorCategoria.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma receita no período.
                  </p>
                ) : dados.receitasPorCategoria.map(r => (
                  <div key={r.label}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">{r.label}</span>
                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                        {formatBRL(r.valor)}
                      </span>
                    </div>
                    <BarraProgresso valor={r.valor} max={dados.receitaTotal} cor="bg-green-500" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Despesas por categoria */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-sm text-foreground flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  Despesas por Categoria
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {dados.despesasPorCategoria.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma despesa no período.
                  </p>
                ) : dados.despesasPorCategoria.map(d => (
                  <div key={d.label}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">{d.label}</span>
                      <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                        {formatBRL(d.valor)}
                      </span>
                    </div>
                    <BarraProgresso valor={d.valor} max={dados.despesaTotal} cor="bg-red-500" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Status das mensalidades */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm text-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-500" />
                Status das Mensalidades no Período
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { label: 'Pago',     valor: dados.mensalidadesPorStatus.pago,     cor: 'text-green-600 dark:text-green-400',  bg: 'bg-green-100 dark:bg-green-900/40' },
                  { label: 'Pendente', valor: dados.mensalidadesPorStatus.pendente,  cor: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/40' },
                  { label: 'Atrasado', valor: dados.mensalidadesPorStatus.atrasado,  cor: 'text-red-600 dark:text-red-400',      bg: 'bg-red-100 dark:bg-red-900/40' },
                ].map(s => (
                  <div key={s.label} className={`${s.bg} rounded-lg p-4`}>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className={`text-lg font-bold mt-1 ${s.cor}`}>{formatBRL(s.valor)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}