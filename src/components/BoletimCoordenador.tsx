// src/components/BoletimCoordenador.tsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useSegmento } from '../hooks/useSegmento';
import { calcularNota } from '../utils/calculoNotas';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Search, Loader2, Printer, TrendingUp, User,
  AlertTriangle, BookOpen, CheckCircle2, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

interface BoletimCoordenadorProps { onVoltar: () => void; }

interface AlunoOpcao { id: string; nome: string; serie: string; }

interface NotaBimestre {
  av1: number | null;
  av2: number | null;
  av3: number | null; // presencial
  rec: number | null;
  med: number | null;
}

interface NotaDisciplina {
  disciplina_id: string;
  disciplina_nome: string;
  bimestre1: NotaBimestre;
  bimestre2: NotaBimestre;
  bimestre3: NotaBimestre;
  bimestre4: NotaBimestre;
  ptsTotal: number;
  mediaFinal: number | null;
  situacao: 'Aprovado' | 'Recuperação' | 'Reprovado' | 'N/A';
}

function bimestrePreenchido(b: NotaBimestre, isPresencial: boolean): boolean {
  return isPresencial
    ? b.av1 !== null && b.av2 !== null && b.av3 !== null
    : b.av1 !== null && b.av2 !== null;
}

export default function BoletimCoordenador({ onVoltar }: BoletimCoordenadorProps) {
  const { segmento, isPresencial } = useSegmento();

  const [series, setSeries] = useState<string[]>([]);
  const [serieSelecionada, setSerieSelecionada] = useState('');
  const [alunosDaSerie, setAlunosDaSerie] = useState<AlunoOpcao[]>([]);
  const [carregandoAlunos, setCarregandoAlunos] = useState(false);
  const [busca, setBusca] = useState('');

  const [alunoSelecionado, setAlunoSelecionado] = useState<AlunoOpcao | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [notas, setNotas] = useState<NotaDisciplina[]>([]);
  const [imprimindo, setImprimindo] = useState(false);

  // Carregar séries — filtradas pelo segmento do coordenador
  useEffect(() => {
    async function carregarSeries() {
      try {
        let query = supabase
          .from('users')
          .select('serie')
          .eq('tipo', 'aluno')
          .not('serie', 'is', null);

        // Coordenador só vê séries do seu segmento
        query = query.eq('segmento', segmento);

        const { data } = await query;
        const unicas = Array.from(
          new Set((data || []).map((s: any) => s.serie).filter(Boolean))
        ).sort() as string[];
        setSeries(unicas);
      } catch { /* silencioso */ }
    }
    carregarSeries();
  }, [segmento]);

  // Carregar alunos quando série muda — filtrados pelo segmento
  useEffect(() => {
    if (!serieSelecionada) { setAlunosDaSerie([]); return; }
    setCarregandoAlunos(true);
    setAlunoSelecionado(null);
    setNotas([]);
    setBusca('');

    let query = supabase
      .from('users')
      .select('id, nome, serie')
      .eq('tipo', 'aluno')
      .eq('serie', serieSelecionada)
      .eq('segmento', segmento) // filtro por segmento
      .order('nome');

    query.then(({ data }) => {
      setAlunosDaSerie(data || []);
      setCarregandoAlunos(false);
    }).catch(() => setCarregandoAlunos(false));
  }, [serieSelecionada, segmento]);

  const alunosFiltrados = busca.trim().length > 0
    ? alunosDaSerie.filter(a => a.nome.toLowerCase().includes(busca.toLowerCase()))
    : alunosDaSerie;

  const carregarBoletim = useCallback(async (aluno: AlunoOpcao) => {
    setCarregando(true);
    setNotas([]);
    try {
      const { data: discData } = await supabase
        .from('disciplinas').select('id, nome').order('nome');

      const { data: notasData, error } = await supabase
        .from('notas')
        .select('disciplina_id, bimestre, av1, av2, av3, recuperacao, media, media_final, status_final, disciplinas(nome)')
        .eq('user_id', aluno.id)
        .order('bimestre', { ascending: true });

      if (error) throw error;

      const mapa: Record<string, NotaDisciplina> = {};

      (discData || []).forEach((d: any) => {
        mapa[d.id] = {
          disciplina_id: d.id,
          disciplina_nome: d.nome,
          bimestre1: { av1: null, av2: null, av3: null, rec: null, med: null },
          bimestre2: { av1: null, av2: null, av3: null, rec: null, med: null },
          bimestre3: { av1: null, av2: null, av3: null, rec: null, med: null },
          bimestre4: { av1: null, av2: null, av3: null, rec: null, med: null },
          ptsTotal: 0, mediaFinal: null, situacao: 'N/A',
        };
      });

      (notasData || []).forEach((n: any) => {
        const id = n.disciplina_id;
        if (!mapa[id]) {
          mapa[id] = {
            disciplina_id: id,
            disciplina_nome: n.disciplinas?.nome || 'Disciplina',
            bimestre1: { av1: null, av2: null, av3: null, rec: null, med: null },
            bimestre2: { av1: null, av2: null, av3: null, rec: null, med: null },
            bimestre3: { av1: null, av2: null, av3: null, rec: null, med: null },
            bimestre4: { av1: null, av2: null, av3: null, rec: null, med: null },
            ptsTotal: 0, mediaFinal: null, situacao: 'N/A',
          };
        }

        // Usa o utilitário centralizado para calcular a média do bimestre
        const resultado = calcularNota(
          { av1: n.av1, av2: n.av2, av3: n.av3, recuperacao: n.recuperacao },
          segmento
        );

        const bim: NotaBimestre = {
          av1: n.av1,
          av2: n.av2,
          av3: n.av3 ?? null,
          rec: n.recuperacao,
          med: resultado.mediaFinal,
        };

        switch (n.bimestre) {
          case 1: mapa[id].bimestre1 = bim; break;
          case 2: mapa[id].bimestre2 = bim; break;
          case 3: mapa[id].bimestre3 = bim; break;
          case 4: mapa[id].bimestre4 = bim; break;
        }
      });

      // Calcular totais
      Object.values(mapa).forEach(nd => {
        const bimestres = [nd.bimestre1, nd.bimestre2, nd.bimestre3, nd.bimestre4];

        let soma = 0;
        let countPreenchidos = 0;
        bimestres.forEach(b => {
          if (b.med !== null) { soma += b.med; countPreenchidos++; }
        });

        nd.ptsTotal = soma;

        // Média final e situação só quando todos os bimestres estiverem preenchidos
        const todos4Preenchidos = bimestres.every(b => bimestrePreenchido(b, isPresencial));

        if (todos4Preenchidos && countPreenchidos === 4) {
          nd.mediaFinal = soma / 4;
          if (nd.mediaFinal >= 7) nd.situacao = 'Aprovado';
          else if (nd.mediaFinal >= 5) nd.situacao = 'Recuperação';
          else nd.situacao = 'Reprovado';
        } else {
          nd.mediaFinal = null;
          nd.situacao = 'N/A';
        }
      });

      setNotas(
        Object.values(mapa)
          .filter(nd =>
            nd.bimestre1.av1 !== null || nd.bimestre2.av1 !== null ||
            nd.bimestre3.av1 !== null || nd.bimestre4.av1 !== null
          )
          .sort((a, b) => a.disciplina_nome.localeCompare(b.disciplina_nome))
      );
    } catch (err: any) {
      toast.error('Erro ao carregar boletim: ' + err.message);
    } finally {
      setCarregando(false);
    }
  }, [segmento, isPresencial]);

  const selecionarAluno = (aluno: AlunoOpcao) => {
    setAlunoSelecionado(aluno);
    setBusca('');
    carregarBoletim(aluno);
  };

  const getNotaColor = (v: number | null) => {
    if (v === null) return 'var(--muted-foreground)';
    if (v >= 7) return '#16a34a';
    if (v >= 5) return '#d97706';
    return '#dc2626';
  };

  const getSituacaoStyle = (s: string) => {
    if (s === 'Aprovado')    return { bg: 'rgba(22,163,74,0.15)',  text: '#16a34a', border: 'rgba(22,163,74,0.3)' };
    if (s === 'Recuperação') return { bg: 'rgba(217,119,6,0.15)',  text: '#d97706', border: 'rgba(217,119,6,0.3)' };
    if (s === 'Reprovado')   return { bg: 'rgba(220,38,38,0.15)',  text: '#dc2626', border: 'rgba(220,38,38,0.3)' };
    return { bg: 'rgba(100,116,139,0.15)', text: '#64748b', border: 'rgba(100,116,139,0.3)' };
  };

  // Colunas de bimestre condicionais
  const colunasBim = isPresencial
    ? ['AV1', 'AV2', 'AV3', 'REC', 'MÉD']
    : ['AV1', 'AV2', 'REC', 'MÉD'];
  const colSpanBim = colunasBim.length;

  const handleImprimir = async () => {
    if (!alunoSelecionado || notas.length === 0) return;
    setImprimindo(true);

    const anoLetivo = new Date().getFullYear();
    const dataEmissao = new Date().toLocaleDateString('pt-BR');

    let logoHtml = `<div style="width:50px;height:50px;border-radius:50%;background:#1d4ed8;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:16px;">CE</div>`;
    try {
      const resp = await fetch('/src/assets/logo-escola.png');
      const blob = await resp.blob();
      const base64 = await new Promise<string>((res, rej) => {
        const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(blob);
      });
      logoHtml = `<img src="${base64}" style="width:50px;height:50px;object-fit:contain;" />`;
    } catch { /* fallback */ }

    const celRec = (v: number | null) =>
      v !== null && v > 0
        ? `<td style="border:1px solid #ccc;padding:2px 4px;text-align:center;">${v.toFixed(1)}</td>`
        : `<td style="border:1px solid #ccc;padding:2px 4px;text-align:center;color:#aaa">-</td>`;

    const celBim = (b: NotaBimestre) => {
      const cel = (v: number | null, bold = false) =>
        v !== null
          ? `<td style="border:1px solid #ccc;padding:2px 4px;text-align:center;${bold ? 'font-weight:700;' : ''}">${v.toFixed(1)}</td>`
          : `<td style="border:1px solid #ccc;padding:2px 4px;text-align:center;color:#aaa">-</td>`;

      return isPresencial
        ? `${cel(b.av1)}${cel(b.av2)}${cel(b.av3)}${celRec(b.rec)}${cel(b.med, true)}`
        : `${cel(b.av1)}${cel(b.av2)}${celRec(b.rec)}${cel(b.med, true)}`;
    };

    const colsHeaderBim = isPresencial
      ? '<th>AV1</th><th>AV2</th><th>AV3</th><th>REC</th><th>MÉD</th>'
      : '<th>AV1</th><th>AV2</th><th>REC</th><th>MÉD</th>';

    const linhas = notas.map(nota => {
      const corSit = nota.situacao === 'Aprovado' ? '#15803d' : nota.situacao === 'Reprovado' ? '#dc2626' : nota.situacao === 'Recuperação' ? '#ca8a04' : '#aaa';
      const corMed = nota.mediaFinal !== null ? (nota.mediaFinal >= 7 ? '#15803d' : nota.mediaFinal >= 5 ? '#ca8a04' : '#dc2626') : '#aaa';

      return `<tr>
        <td style="border:1px solid #ccc;padding:2px 6px;font-weight:600">${nota.disciplina_nome}</td>
        ${celBim(nota.bimestre1)}${celBim(nota.bimestre2)}${celBim(nota.bimestre3)}${celBim(nota.bimestre4)}
        <td style="border:1px solid #ccc;padding:2px 4px;text-align:center;font-weight:700;color:#1d4ed8">${nota.ptsTotal.toFixed(1)}</td>
        <td style="border:1px solid #ccc;padding:2px 4px;text-align:center;font-weight:700;color:${corMed}">${nota.mediaFinal !== null ? nota.mediaFinal.toFixed(1) : '-'}</td>
        <td style="border:1px solid #ccc;padding:2px 4px;text-align:center;color:#aaa">-</td>
        <td style="border:1px solid #ccc;padding:2px 4px;text-align:center;font-weight:600;color:${corSit}">${nota.situacao !== 'N/A' ? nota.situacao : '-'}</td>
      </tr>`;
    }).join('');

    const legendaMed = isPresencial
      ? 'MÉD: (AV1+AV2+AV3)÷3'
      : 'MÉD: (AV1+AV2)÷2';

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
<title>Boletim — ${alunoSelecionado.nome}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:Arial,sans-serif;font-size:9px;color:#000;background:#fff;padding:10px 14px;}
  @page{size:landscape;margin:7mm 9mm;}
  .header{display:flex;align-items:center;gap:10px;border-bottom:2px solid #1d4ed8;padding-bottom:7px;margin-bottom:6px;}
  .header h1{font-size:13px;font-weight:800;color:#1d4ed8;}
  .header p{font-size:8px;color:#555;margin-top:1px;}
  .titulo{text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px;}
  .info{display:flex;justify-content:space-between;background:#f0f4ff;border:1px solid #c7d7fd;border-radius:4px;padding:4px 10px;margin-bottom:6px;font-size:9px;}
  .info span{font-weight:700;}
  table{width:100%;border-collapse:collapse;font-size:8px;}
  th{background:#e8edf8;border:1px solid #ccc;padding:2px 4px;text-align:center;font-weight:700;}
  th.disc{text-align:left;padding-left:6px;}
  .b1{background:#dbeafe;}.b2{background:#dcfce7;}.b3{background:#fef9c3;}.b4{background:#ede9fe;}
  tr:nth-child(even) td{background:#f9fafb;}
  .rodape{margin-top:6px;font-size:8px;color:#444;border-top:1px solid #ddd;padding-top:5px;}
  .assinaturas{display:flex;justify-content:space-around;margin-top:14px;}
  .assinatura{text-align:center;width:170px;}
  .assinatura .linha{border-top:1px solid #000;padding-top:3px;font-size:8px;font-weight:600;}
</style></head><body>
  <div class="header">
    ${logoHtml}
    <div>
      <h1>Colégio Conexão EAD Maranhense</h1>
      <p>Sistema de Gestão Escolar — Boletim Oficial${isPresencial ? ' · Segmento Presencial' : ''}</p>
    </div>
  </div>
  <div class="titulo">Boletim Escolar — ${anoLetivo}</div>
  <div class="info">
    <div>Nome: <span>${alunoSelecionado.nome}</span></div>
    <div>Série: <span>${alunoSelecionado.serie}</span></div>
    <div>Ano Letivo: <span>${anoLetivo}</span></div>
    <div>Emissão: <span>${dataEmissao}</span></div>
  </div>
  <table>
    <thead>
      <tr>
        <th rowspan="2" class="disc" style="width:12%">Disciplina</th>
        <th colspan="${colSpanBim}" class="b1">1º Bimestre</th>
        <th colspan="${colSpanBim}" class="b2">2º Bimestre</th>
        <th colspan="${colSpanBim}" class="b3">3º Bimestre</th>
        <th colspan="${colSpanBim}" class="b4">4º Bimestre</th>
        <th rowspan="2">Pts Total</th>
        <th rowspan="2">Média Final</th>
        <th rowspan="2">Recup</th>
        <th rowspan="2">Situação</th>
      </tr>
      <tr>
        ${colsHeaderBim}${colsHeaderBim}${colsHeaderBim}${colsHeaderBim}
      </tr>
    </thead>
    <tbody>${linhas}</tbody>
  </table>
  <div class="rodape">
    <strong>Legenda:</strong> AV1/AV2${isPresencial ? '/AV3' : ''}: Avaliações &nbsp;|&nbsp;
    REC: Recuperação &nbsp;|&nbsp; ${legendaMed} &nbsp;|&nbsp;
    Pts Total: soma das 4 médias &nbsp;|&nbsp; Média Final: Pts÷4
    &nbsp;&nbsp;
    <strong>Aprovação:</strong> ✅ ≥ 7.0 → Aprovado &nbsp;|&nbsp; ⚠️ 5.0–6.9 → Recuperação &nbsp;|&nbsp; ❌ &lt;5.0 → Reprovado
  </div>
  <div class="assinaturas">
    <div class="assinatura"><div class="linha">Coordenação Pedagógica</div></div>
    <div class="assinatura"><div class="linha">Direção Escolar</div></div>
  </div>
</body></html>`;

    const janela = window.open('', '_blank', 'width=1200,height=700');
    if (!janela) { toast.error('Popup bloqueado.'); setImprimindo(false); return; }
    janela.document.write(html);
    janela.document.close();
    janela.focus();
    setTimeout(() => { janela.print(); janela.close(); setImprimindo(false); }, 600);
  };

  const aprovados = notas.filter(n => n.situacao === 'Aprovado').length;
  const recuperacao = notas.filter(n => n.situacao === 'Recuperação').length;
  const reprovados = notas.filter(n => n.situacao === 'Reprovado').length;
  const mediasValidas = notas.filter(n => n.mediaFinal !== null).map(n => n.mediaFinal!);
  const mediaGeral = mediasValidas.length > 0 ? mediasValidas.reduce((a, b) => a + b, 0) / mediasValidas.length : null;

  // Renderiza células de um bimestre (condicional AV3)
  const renderCelBim = (b: NotaBimestre, rowBg: string) => {
    const cel = (v: number | null, bold = false) => (
      <td style={{
        padding: '8px 6px', textAlign: 'center',
        color: getNotaColor(v),
        fontWeight: bold ? 700 : v !== null ? 500 : 400,
        borderLeft: '1px solid var(--border)',
        backgroundColor: rowBg,
      }}>
        {v !== null ? v.toFixed(1) : <span style={{ opacity: 0.3 }}>-</span>}
      </td>
    );
    const rec = (
      <td style={{
        padding: '8px 6px', textAlign: 'center',
        color: b.rec !== null && b.rec > 0 ? '#3b82f6' : 'var(--muted-foreground)',
        borderLeft: '1px solid var(--border)',
        backgroundColor: rowBg,
      }}>
        {b.rec !== null && b.rec > 0 ? b.rec.toFixed(1) : <span style={{ opacity: 0.3 }}>-</span>}
      </td>
    );

    return isPresencial
      ? <>{cel(b.av1)}{cel(b.av2)}{cel(b.av3)}{rec}{cel(b.med, true)}</>
      : <>{cel(b.av1)}{cel(b.av2)}{rec}{cel(b.med, true)}</>;
  };

  return (
    <div className="space-y-6">

      {/* Filtros */}
      <Card>
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <User className="w-5 h-5 text-blue-600" />
            Selecionar Aluno
            {isPresencial && (
              <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full ml-1">
                Presencial
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-muted-foreground pb-2 text-xs">Série</Label>
              <Select value={serieSelecionada} onValueChange={v => { setSerieSelecionada(v); setAlunoSelecionado(null); setNotas([]); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a série" />
                </SelectTrigger>
                <SelectContent>
                  {series.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">
                Filtrar por nome {serieSelecionada && <span className="text-foreground font-medium">— {serieSelecionada}</span>}
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder={serieSelecionada ? '      Filtrar alunos...' : 'Selecione a série primeiro'}
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  disabled={!serieSelecionada}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de alunos */}
      {serieSelecionada && !alunoSelecionado && (
        <Card>
          <CardHeader className="border-b border-border pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base p-2 text-foreground">Alunos — {serieSelecionada}</CardTitle>
              <span className="text-xs text-muted-foreground">
                {alunosFiltrados.length} aluno{alunosFiltrados.length !== 1 ? 's' : ''}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {carregandoAlunos ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                <span className="text-muted-foreground text-sm">Carregando alunos...</span>
              </div>
            ) : alunosFiltrados.length === 0 ? (
              <div className="py-10 text-center">
                <User className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground text-sm">
                  {busca ? 'Nenhum aluno encontrado para esse filtro.' : 'Nenhum aluno nesta série.'}
                </p>
              </div>
            ) : (
              <div className="divide-y px-4 divide-border">
                {alunosFiltrados.map(aluno => (
                  <button
                    key={aluno.id}
                    onClick={() => selecionarAluno(aluno)}
                    className="w-full flex items-center justify-between px-2 py-4 hover:bg-muted/40 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 p-4 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {aluno.nome.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{aluno.nome}</p>
                        <p className="text-xs text-muted-foreground">{aluno.serie}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Header do aluno selecionado */}
      {alunoSelecionado && (
        <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0">
              {alunoSelecionado.nome.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-foreground">{alunoSelecionado.nome}</p>
              <p className="text-xs text-muted-foreground">{alunoSelecionado.serie}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm"
              onClick={() => { setAlunoSelecionado(null); setNotas([]); }}
              className="text-muted-foreground">
              ← Voltar à lista
            </Button>
            {notas.length > 0 && (
              <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                onClick={handleImprimir} disabled={imprimindo}>
                {imprimindo
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Gerando...</>
                  : <><Printer className="w-4 h-4" />Imprimir Boletim</>}
              </Button>
            )}
          </div>
        </div>
      )}

      {carregando && alunoSelecionado && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mr-3" />
          <span className="text-muted-foreground">Carregando boletim de {alunoSelecionado.nome}...</span>
        </div>
      )}

      {!carregando && alunoSelecionado && notas.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="text-foreground font-medium mb-1">Nenhuma nota lançada</p>
            <p className="text-muted-foreground text-sm">
              {alunoSelecionado.nome} ainda não possui notas registradas no sistema.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Boletim */}
      {!carregando && notas.length > 0 && alunoSelecionado && (
        <div className="space-y-5">

          {/* Cards de resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 pb-3 gap-3">
            {[
              { label: 'Média Geral', value: mediaGeral !== null ? mediaGeral.toFixed(1) : '—', bg: '#dbeafe', text: '#1e3a8a', iconBg: '#3b82f6', icon: TrendingUp },
              { label: 'Aprovados', value: aprovados, bg: '#dcfce7', text: '#14532d', iconBg: '#16a34a', icon: CheckCircle2 },
              { label: 'Recuperação', value: recuperacao, bg: '#fef9c3', text: '#713f12', iconBg: '#d97706', icon: AlertTriangle },
              { label: 'Reprovados', value: reprovados, bg: '#fee2e2', text: '#7f1d1d', iconBg: '#dc2626', icon: BookOpen },
            ].map(card => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="rounded-xl flex items-center justify-between"
                  style={{ backgroundColor: card.bg, padding: '1.25rem 1.5rem' }}>
                  <div>
                    <p className="text-xs font-semibold mb-1.5" style={{ color: card.text }}>{card.label}</p>
                    <p className="text-3xl font-bold" style={{ color: card.text }}>{card.value}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: card.iconBg }}>
                    <Icon style={{ width: 18, height: 18, color: '#fff' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tabela */}
          <Card>
            <CardHeader className="border-b border-border pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  Notas por Disciplina — {alunoSelecionado.nome}
                </CardTitle>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                  onClick={handleImprimir} disabled={imprimindo}>
                  {imprimindo
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Gerando...</>
                    : <><Printer className="w-4 h-4" />Imprimir</>}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th rowSpan={2} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, backgroundColor: 'var(--muted)', color: 'var(--foreground)', width: '14%' }}>
                        Disciplina
                      </th>
                      {[
                        { label: '1º Bimestre', color: '#3b82f6' },
                        { label: '2º Bimestre', color: '#16a34a' },
                        { label: '3º Bimestre', color: '#d97706' },
                        { label: '4º Bimestre', color: '#7c3aed' },
                      ].map(b => (
                        <th key={b.label} colSpan={colSpanBim} style={{
                          padding: '8px 6px', textAlign: 'center', fontWeight: 700, fontSize: 11,
                          borderLeft: '1px solid var(--border)',
                          backgroundColor: 'var(--muted)',
                          color: b.color,
                          borderBottom: `2px solid ${b.color}`,
                        }}>
                          {b.label}
                        </th>
                      ))}
                      {['Pts', 'Média', 'Situação'].map(h => (
                        <th key={h} rowSpan={2} style={{
                          padding: '10px 10px', textAlign: 'center', fontWeight: 600,
                          backgroundColor: 'var(--muted)', color: 'var(--foreground)',
                          borderLeft: '1px solid var(--border)',
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--muted)' }}>
                      {/* 4 bimestres × colunasBim */}
                      {[0, 1, 2, 3].flatMap(() =>
                        colunasBim.map((col, i) => (
                          <th key={`${col}-${i}`} style={{
                            padding: '5px 6px', textAlign: 'center', fontWeight: 500,
                            color: 'var(--muted-foreground)', fontSize: 10,
                            borderLeft: '1px solid var(--border)',
                          }}>
                            {col}
                          </th>
                        ))
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {notas.map((nota, idx) => {
                      const sitStyle = getSituacaoStyle(nota.situacao);
                      const rowBg = idx % 2 === 0 ? 'var(--card)' : 'var(--muted)';
                      const mediaColor = getNotaColor(nota.mediaFinal);

                      return (
                        <tr key={nota.disciplina_id || idx} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '8px 14px', fontWeight: 600, color: 'var(--foreground)', backgroundColor: rowBg }}>
                            {nota.disciplina_nome}
                          </td>
                          {renderCelBim(nota.bimestre1, rowBg)}
                          {renderCelBim(nota.bimestre2, rowBg)}
                          {renderCelBim(nota.bimestre3, rowBg)}
                          {renderCelBim(nota.bimestre4, rowBg)}
                          <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#3b82f6', borderLeft: '1px solid var(--border)', backgroundColor: rowBg }}>
                            {nota.ptsTotal.toFixed(1)}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: mediaColor, borderLeft: '1px solid var(--border)', backgroundColor: rowBg }}>
                            {nota.mediaFinal !== null ? nota.mediaFinal.toFixed(1) : <span style={{ opacity: 0.3 }}>-</span>}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', borderLeft: '1px solid var(--border)', backgroundColor: rowBg }}>
                            {nota.situacao !== 'N/A' ? (
                              <span style={{
                                fontSize: 11, fontWeight: 600, padding: '2px 8px',
                                borderRadius: 999, border: `1px solid ${sitStyle.border}`,
                                backgroundColor: sitStyle.bg, color: sitStyle.text,
                              }}>
                                {nota.situacao}
                              </span>
                            ) : (
                              <span style={{ opacity: 0.3 }}>-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-4 border-t border-border bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">AV1/AV2{isPresencial ? '/AV3' : ''}:</strong> Avaliações &nbsp;|&nbsp;
                  <strong className="text-foreground">REC:</strong> Recuperação &nbsp;|&nbsp;
                  <strong className="text-foreground">MÉD:</strong> {isPresencial ? '(AV1+AV2+AV3)÷3' : '(AV1+AV2)÷2'} &nbsp;|&nbsp;
                  <strong className="text-foreground">Pts:</strong> Soma das 4 médias &nbsp;|&nbsp;
                  <strong className="text-foreground">Média:</strong> Pts÷4 &nbsp;|&nbsp;
                  Aprovado ≥ 7.0 &nbsp;|&nbsp; Recuperação 5.0–6.9 &nbsp;|&nbsp; Reprovado &lt; 5.0
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!serieSelecionada && (
        <div className="text-center py-20">
          <BookOpen className="w-14 h-14 mx-auto mb-4 text-muted-foreground opacity-20" />
          <p className="text-foreground font-medium mb-1">Selecione uma série para começar</p>
          <p className="text-muted-foreground text-sm">Os alunos da série aparecerão para seleção.</p>
        </div>
      )}
    </div>
  );
}