// src/components/MonitoramentoIA.tsx
// Painel de monitoramento dos agentes de IA — exclusivo do Administrador

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Brain, Zap, Clock, AlertTriangle, TrendingUp, RefreshCw,
  ChevronLeft, CheckCircle2, XCircle, MessageSquare,
  DollarSign, BarChart3, Activity,
} from "lucide-react";
import { supabase } from "../supabase/supabaseClient";

interface MonitoramentoIAProps {
  onVoltar: () => void;
}

type Periodo = "24h" | "7d" | "30d";

interface LogEntry {
  id: string;
  criado_em: string;
  agente: string;
  contexto: string | null;
  pergunta: string | null;
  turns: number;
  input_tokens: number;
  output_tokens: number;
  latencia_ms: number;
  erro: boolean;
  erro_msg: string | null;
}

interface ResumoAgente {
  agente: string;
  chamadas: number;
  tokens_input: number;
  tokens_output: number;
  latencia_media: number;
  turns_medio: number;
  erros: number;
  custo_usd: number;
}

// Preços OpenAI/Anthropic por modelo
const PRECO_POR_AGENTE: Record<string, { input: number; output: number }> = {
  gabriela:    { input: 0.80,  output: 4.00  }, // Haiku 4.5
  sofia:       { input: 3.00,  output: 15.00 }, // Sonnet 4.6
  "dona-maria":{ input: 3.00,  output: 15.00 }, // Sonnet 4.6
};

function calcularCusto(agente: string, inputTok: number, outputTok: number): number {
  const p = PRECO_POR_AGENTE[agente] ?? { input: 1.0, output: 5.0 };
  return (inputTok / 1_000_000) * p.input + (outputTok / 1_000_000) * p.output;
}

function formatarDuracao(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatarCusto(usd: number): string {
  if (usd < 0.01) return `$${(usd * 100).toFixed(2)}¢`;
  return `$${usd.toFixed(4)}`;
}

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function BadgeAgente({ agente }: { agente: string }) {
  const cores: Record<string, string> = {
    gabriela:    "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
    sofia:       "bg-blue-100   text-blue-800   dark:bg-blue-900/40   dark:text-blue-300",
    "dona-maria":"bg-pink-100   text-pink-800   dark:bg-pink-900/40   dark:text-pink-300",
  };
  const labels: Record<string, string> = {
    gabriela:    "Gabriela",
    sofia:       "Sofia",
    "dona-maria":"Tia Maria",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cores[agente] ?? "bg-gray-100 text-gray-700"}`}>
      {labels[agente] ?? agente}
    </span>
  );
}

function KPICard({
  icon, label, value, sub, color, loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  loading?: boolean;
}) {
  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${color}`}>
            {icon}
          </div>
        </div>
        <div className="mt-3">
          {loading ? (
            <div className="h-7 w-16 bg-muted animate-pulse rounded" />
          ) : (
            <div className="text-2xl font-bold text-foreground">{value}</div>
          )}
          <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
          {sub && <div className="text-xs text-muted-foreground mt-0.5 opacity-70">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

export function MonitoramentoIA({ onVoltar }: MonitoramentoIAProps) {
  const [periodo, setPeriodo]         = useState<Periodo>("24h");
  const [logs, setLogs]               = useState<LogEntry[]>([]);
  const [carregando, setCarregando]   = useState(true);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const [filtroAgente, setFiltroAgente] = useState<string>("todos");
  const [paginaLog, setPaginaLog]     = useState(0);
  const LOG_POR_PAGINA = 15;

  const periodoHoras: Record<Periodo, number> = { "24h": 24, "7d": 168, "30d": 720 };

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const desde = new Date(Date.now() - periodoHoras[periodo] * 3600 * 1000).toISOString();
      const { data } = await supabase
        .from("agente_ia_log")
        .select("*")
        .gte("criado_em", desde)
        .order("criado_em", { ascending: false })
        .limit(500);
      setLogs((data as LogEntry[]) ?? []);
      setUltimaAtualizacao(new Date());
    } catch (err) {
      console.error("[MonitoramentoIA] erro:", err);
    } finally {
      setCarregando(false);
    }
  }, [periodo]);

  useEffect(() => { carregar(); }, [carregar]);

  // ── Derivações ─────────────────────────────────────────────────────────────

  const logsFiltrados = filtroAgente === "todos"
    ? logs
    : logs.filter(l => l.agente === filtroAgente);

  const totalChamadas    = logs.length;
  const totalErros       = logs.filter(l => l.erro).length;
  const taxaErro         = totalChamadas > 0 ? ((totalErros / totalChamadas) * 100).toFixed(1) : "0";
  const latenciaMedia    = logs.length > 0 ? Math.round(logs.reduce((s, l) => s + l.latencia_ms, 0) / logs.length) : 0;
  const totalInputTokens = logs.reduce((s, l) => s + l.input_tokens, 0);
  const totalOutputTokens= logs.reduce((s, l) => s + l.output_tokens, 0);
  const custTotalUSD     = logs.reduce((s, l) => s + calcularCusto(l.agente, l.input_tokens, l.output_tokens), 0);

  // Resumo por agente
  const agentesUnicos = [...new Set(logs.map(l => l.agente))];
  const resumoPorAgente: ResumoAgente[] = agentesUnicos.map(agente => {
    const subset = logs.filter(l => l.agente === agente);
    const erros  = subset.filter(l => l.erro).length;
    const inp    = subset.reduce((s, l) => s + l.input_tokens, 0);
    const out    = subset.reduce((s, l) => s + l.output_tokens, 0);
    return {
      agente,
      chamadas:       subset.length,
      tokens_input:   inp,
      tokens_output:  out,
      latencia_media: Math.round(subset.reduce((s, l) => s + l.latencia_ms, 0) / subset.length),
      turns_medio:    parseFloat((subset.reduce((s, l) => s + l.turns, 0) / subset.length).toFixed(1)),
      erros,
      custo_usd:      calcularCusto(agente, inp, out),
    };
  }).sort((a, b) => b.chamadas - a.chamadas);

  // Miniature sparkline: chamadas por hora (últimas 24h)
  const chamadosPorHora: number[] = Array(24).fill(0);
  if (periodo === "24h") {
    const agora = Date.now();
    logs.forEach(l => {
      const diff = agora - new Date(l.criado_em).getTime();
      const hora = Math.floor(diff / 3_600_000);
      if (hora >= 0 && hora < 24) chamadosPorHora[23 - hora]++;
    });
  }
  const maxHora = Math.max(...chamadosPorHora, 1);

  const logsPagina = logsFiltrados.slice(paginaLog * LOG_POR_PAGINA, (paginaLog + 1) * LOG_POR_PAGINA);
  const totalPaginas = Math.ceil(logsFiltrados.length / LOG_POR_PAGINA);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onVoltar} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Brain className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              Monitoramento de IA
            </h2>
            <p className="text-xs text-muted-foreground">
              {ultimaAtualizacao
                ? `Atualizado às ${formatarHora(ultimaAtualizacao.toISOString())}`
                : "Carregando..."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Seletor de período */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(["24h", "7d", "30d"] as Periodo[]).map(p => (
              <button
                key={p}
                onClick={() => { setPeriodo(p); setPaginaLog(0); }}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  periodo === p
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={carregar} disabled={carregando} className="gap-1.5 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${carregando ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard
          icon={<MessageSquare className="w-5 h-5 text-violet-600 dark:text-violet-400" />}
          label="Chamadas" value={totalChamadas}
          sub={`${periodo === "24h" ? "últimas 24h" : periodo === "7d" ? "últimos 7 dias" : "últimos 30 dias"}`}
          color="bg-violet-100 dark:bg-violet-900/40"
          loading={carregando}
        />
        <KPICard
          icon={<Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
          label="Latência média" value={carregando ? "—" : formatarDuracao(latenciaMedia)}
          sub="por chamada"
          color="bg-blue-100 dark:bg-blue-900/40"
          loading={carregando}
        />
        <KPICard
          icon={<Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
          label="Tokens totais"
          value={carregando ? "—" : `${((totalInputTokens + totalOutputTokens) / 1000).toFixed(1)}k`}
          sub={`↑${(totalInputTokens/1000).toFixed(1)}k ↓${(totalOutputTokens/1000).toFixed(1)}k`}
          color="bg-amber-100 dark:bg-amber-900/40"
          loading={carregando}
        />
        <KPICard
          icon={<DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
          label="Custo estimado" value={carregando ? "—" : formatarCusto(custTotalUSD)}
          sub="USD (preço Anthropic)"
          color="bg-emerald-100 dark:bg-emerald-900/40"
          loading={carregando}
        />
        <KPICard
          icon={totalErros > 0
            ? <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            : <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />}
          label="Taxa de erro"
          value={carregando ? "—" : `${taxaErro}%`}
          sub={totalErros > 0 ? `${totalErros} erros` : "Tudo ok"}
          color={totalErros > 0
            ? "bg-red-100 dark:bg-red-900/40"
            : "bg-green-100 dark:bg-green-900/40"}
          loading={carregando}
        />
      </div>

      {/* Sparkline (24h) + Resumo por agente */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Sparkline */}
        {periodo === "24h" && (
          <Card className="border-border lg:col-span-2">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-violet-500" />
                Chamadas por hora (24h)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {carregando ? (
                <div className="h-20 bg-muted animate-pulse rounded" />
              ) : (
                <div className="flex items-end gap-0.5 h-20">
                  {chamadosPorHora.map((v, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5">
                      <div
                        className="w-full rounded-t-sm bg-violet-400 dark:bg-violet-600 transition-all duration-500 min-h-[2px]"
                        style={{ height: `${Math.max(2, (v / maxHora) * 72)}px` }}
                        title={`${v} chamada${v !== 1 ? "s" : ""}`}
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between mt-1">
                <span className="text-xs text-muted-foreground">24h atrás</span>
                <span className="text-xs text-muted-foreground">agora</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resumo por agente */}
        <Card className={`border-border ${periodo === "24h" ? "lg:col-span-3" : "lg:col-span-5"}`}>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-500" />
              Resumo por agente
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {carregando ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
              </div>
            ) : resumoPorAgente.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhuma chamada no período
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left pb-2 text-muted-foreground font-medium">Agente</th>
                      <th className="text-right pb-2 text-muted-foreground font-medium">Chamadas</th>
                      <th className="text-right pb-2 text-muted-foreground font-medium hidden sm:table-cell">Latência</th>
                      <th className="text-right pb-2 text-muted-foreground font-medium hidden sm:table-cell">Turns</th>
                      <th className="text-right pb-2 text-muted-foreground font-medium">Tokens</th>
                      <th className="text-right pb-2 text-muted-foreground font-medium">Custo</th>
                      <th className="text-right pb-2 text-muted-foreground font-medium">Erros</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {resumoPorAgente.map(r => (
                      <tr key={r.agente} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5">
                          <BadgeAgente agente={r.agente} />
                        </td>
                        <td className="text-right py-2.5 font-medium text-foreground">{r.chamadas}</td>
                        <td className="text-right py-2.5 text-muted-foreground hidden sm:table-cell">
                          {formatarDuracao(r.latencia_media)}
                        </td>
                        <td className="text-right py-2.5 text-muted-foreground hidden sm:table-cell">
                          {r.turns_medio}x
                        </td>
                        <td className="text-right py-2.5 text-muted-foreground">
                          {((r.tokens_input + r.tokens_output) / 1000).toFixed(1)}k
                        </td>
                        <td className="text-right py-2.5 font-medium text-emerald-600 dark:text-emerald-400">
                          {formatarCusto(r.custo_usd)}
                        </td>
                        <td className="text-right py-2.5">
                          {r.erros > 0 ? (
                            <span className="text-red-600 dark:text-red-400 font-medium">{r.erros}</span>
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500 inline" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Log detalhado */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              Log de chamadas
              <Badge variant="secondary" className="text-xs">{logsFiltrados.length}</Badge>
            </CardTitle>
            {/* Filtro por agente */}
            <div className="flex gap-1">
              {["todos", ...agentesUnicos].map(a => (
                <button
                  key={a}
                  onClick={() => { setFiltroAgente(a); setPaginaLog(0); }}
                  className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                    filtroAgente === a
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {a === "todos" ? "Todos" : a === "dona-maria" ? "Tia Maria" : a.charAt(0).toUpperCase() + a.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {carregando ? (
            <div className="space-y-2">
              {[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}
            </div>
          ) : logsPagina.length === 0 ? (
            <div className="text-center py-10">
              <Brain className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-20" />
              <p className="text-sm text-muted-foreground">Nenhuma chamada no período selecionado</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left pb-2 text-muted-foreground font-medium">Data/Hora</th>
                      <th className="text-left pb-2 text-muted-foreground font-medium">Agente</th>
                      <th className="text-left pb-2 text-muted-foreground font-medium hidden md:table-cell">Contexto</th>
                      <th className="text-left pb-2 text-muted-foreground font-medium hidden lg:table-cell">Pergunta</th>
                      <th className="text-right pb-2 text-muted-foreground font-medium">Latência</th>
                      <th className="text-right pb-2 text-muted-foreground font-medium hidden sm:table-cell">Tokens</th>
                      <th className="text-right pb-2 text-muted-foreground font-medium hidden sm:table-cell">Turns</th>
                      <th className="text-center pb-2 text-muted-foreground font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {logsPagina.map(entry => (
                      <tr key={entry.id} className={`hover:bg-muted/30 transition-colors ${entry.erro ? "bg-red-50/30 dark:bg-red-900/10" : ""}`}>
                        <td className="py-2.5 text-muted-foreground whitespace-nowrap">
                          {formatarDataHora(entry.criado_em)}
                        </td>
                        <td className="py-2.5">
                          <BadgeAgente agente={entry.agente} />
                        </td>
                        <td className="py-2.5 text-muted-foreground hidden md:table-cell">
                          {entry.contexto || "—"}
                        </td>
                        <td className="py-2.5 text-foreground hidden lg:table-cell max-w-[200px]">
                          <span className="truncate block" title={entry.pergunta ?? ""}>
                            {entry.pergunta ? entry.pergunta.slice(0, 60) + (entry.pergunta.length > 60 ? "…" : "") : "—"}
                          </span>
                        </td>
                        <td className="py-2.5 text-right text-muted-foreground whitespace-nowrap">
                          {formatarDuracao(entry.latencia_ms)}
                        </td>
                        <td className="py-2.5 text-right text-muted-foreground hidden sm:table-cell">
                          {((entry.input_tokens + entry.output_tokens) / 1000).toFixed(1)}k
                        </td>
                        <td className="py-2.5 text-right text-muted-foreground hidden sm:table-cell">
                          {entry.turns}x
                        </td>
                        <td className="py-2.5 text-center">
                          {entry.erro ? (
                            <span title={entry.erro_msg ?? "Erro"}>
                              <XCircle className="w-4 h-4 text-red-500 inline" />
                            </span>
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-green-500 inline" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {totalPaginas > 1 && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    {paginaLog * LOG_POR_PAGINA + 1}–{Math.min((paginaLog + 1) * LOG_POR_PAGINA, logsFiltrados.length)} de {logsFiltrados.length}
                  </span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="text-xs h-7"
                      disabled={paginaLog === 0} onClick={() => setPaginaLog(p => p - 1)}>
                      Anterior
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-7"
                      disabled={paginaLog >= totalPaginas - 1} onClick={() => setPaginaLog(p => p + 1)}>
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Nota de preços */}
      <p className="text-xs text-muted-foreground text-center pb-2">
        Custo estimado com base nos preços públicos da Anthropic (Haiku 4.5: $0.80/$4.00 por MTok · Sonnet 4.6: $3/$15 por MTok).
        Valores em USD sem impostos.
      </p>
    </div>
  );
}

export default MonitoramentoIA;
