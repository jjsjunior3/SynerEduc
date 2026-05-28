// src/components/FrequenciaProfessores.tsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  ArrowLeft, Save, Loader2, Users, FileText, Plus, X, Clock,
  CheckCircle, Edit2,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../supabase/supabaseClient';
import { Usuario } from '../types/auth';

interface FrequenciaProfessoresProps {
  onVoltar: () => void;
  usuario?: Usuario;
  segmentoForcado?: 'ead' | 'presencial';
}

type StatusPresenca = 'presente' | 'ausente' | 'falta_justificada';

interface RegistroFrequencia {
  professor_id: string;
  professor_nome: string;
  segmento: string;
  presente: StatusPresenca;
  aulas_fund: number;
  aulas_medio: number;
  aulas_fund_original: number;
  aulas_medio_original: number;
  disciplinas: string[];
  observacao: string;
  extra: boolean;
  editando: boolean;
  salvo: boolean;
  db_id?: string;
}

const STATUS_CONFIG: Record<StatusPresenca, { label: string; badge: string }> = {
  presente:          { label: 'Presente',      badge: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  ausente:           { label: 'Ausente',        badge: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  falta_justificada: { label: 'F. Justificada', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
};

function getDiaSemana(data: Date): string {
  const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  return dias[data.getDay()];
}

function dataParaISO(data: Date): string {
  const y = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, '0');
  const d = String(data.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatarData(data: Date): string {
  return data.toLocaleDateString('pt-BR');
}

export default function FrequenciaProfessores({
  onVoltar, usuario, segmentoForcado,
}: FrequenciaProfessoresProps) {
  const hoje = new Date();

  const [dataSelecionada, setDataSelecionada] = useState<Date>(hoje);
  const [segmento, setSegmento] = useState<'todos' | 'ead' | 'presencial'>(
    segmentoForcado ?? 'todos'
  );
  const [registros, setRegistros]   = useState<RegistroFrequencia[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [todosProf, setTodosProf]   = useState<{ id: string; nome: string; segmento: string }[]>([]);

  // Extras
  const [extraProfId, setExtraProfId]     = useState('');
  const [extraFund, setExtraFund]         = useState(0);
  const [extraMedio, setExtraMedio]       = useState(0);
  const [extraObs, setExtraObs]           = useState('');
  const [extraSegmento, setExtraSegmento] = useState<'ead' | 'presencial'>(segmentoForcado ?? 'ead');

  // PDF
  const [modalPDF, setModalPDF]     = useState(false);
  const [mesPDF, setMesPDF]         = useState(hoje.getMonth() + 1);
  const [anoPDF, setAnoPDF]         = useState(hoje.getFullYear());
  const [gerandoPDF, setGerandoPDF] = useState(false);

  const diaSemana     = getDiaSemana(dataSelecionada);
  const ehFimDeSemana = diaSemana === 'Sábado' || diaSemana === 'Domingo';

  // ── Totais ──
  const totais = useMemo(() => ({
    professores: registros.filter(r => !r.extra).length,
    presentes:   registros.filter(r => r.presente === 'presente').length,
    totalFund:   registros.reduce((s, r) => s + r.aulas_fund, 0),
    totalMedio:  registros.reduce((s, r) => s + r.aulas_medio, 0),
  }), [registros]);

  const registrosNormais = registros.filter(r => !r.extra);
  const registrosExtras  = registros.filter(r => r.extra);

  // ── Carrega todos os professores (usado na lista de extras) ──
  useEffect(() => {
    let q = supabase.from('users').select('id, nome, segmento')
      .in('tipo', ['professor', 'professor_conteudista'])
      .eq('status', 'ativo').order('nome');
    if (segmentoForcado) q = q.eq('segmento', segmentoForcado);
    q.then(({ data }) => setTodosProf((data || []).map((u: any) => ({
      id: u.id, nome: u.nome, segmento: u.segmento,
    }))));
  }, [segmentoForcado]);

  // ── Carrega frequência do dia usando grade_horaria como fonte permanente ──
  const carregarFrequencia = useCallback(async () => {
    if (ehFimDeSemana) { setRegistros([]); return; }
    setCarregando(true);
    try {
      const dataISO = dataParaISO(dataSelecionada);

      // 1. Busca grade do dia filtrando por segmento
      //    Cada linha = 1 aula (1 ordem na grade)
      //    nivel da série determina se é aula fundamental ou médio
      let qGrade = supabase
        .from('grade_horaria')
        .select(`
          professor_id,
          series!inner(id, nivel),
          professor:users!grade_horaria_professor_id_fkey(id, nome, segmento)
        `)
        .eq('dia_semana', diaSemana);

      if (segmentoForcado)           qGrade = qGrade.eq('segmento', segmentoForcado);
      else if (segmento !== 'todos') qGrade = qGrade.eq('segmento', segmento);

      const { data: gradeHoje, error: erroGrade } = await qGrade;
      if (erroGrade) throw erroGrade;

      // 2. Agrupa por professor contando aulas fund/médio
      const profMap = new Map<string, {
        professor_id:   string;
        professor_nome: string;
        segmento:       string;
        aulas_fund:     number;
        aulas_medio:    number;
      }>();

      (gradeHoje || []).forEach((row: any) => {
        const profId = row.professor_id;
        const nivel  = row.series?.nivel ?? 'fundamental';
        const prof   = row.professor;

        if (!profMap.has(profId)) {
          profMap.set(profId, {
            professor_id:   profId,
            professor_nome: prof?.nome ?? '—',
            segmento:       prof?.segmento ?? '',
            aulas_fund:     0,
            aulas_medio:    0,
          });
        }

        const entry = profMap.get(profId)!;
        if (nivel === 'medio') {
          entry.aulas_medio++;
        } else {
          entry.aulas_fund++;
        }
      });

      // 3. Disciplinas dos professores para exibição
      const profIds = Array.from(profMap.keys());
      let discPorProf: Record<string, string[]> = {};

      if (profIds.length > 0) {
        const { data: vinculos } = await supabase
          .from('professores_disciplinas_series')
          .select('professor_id, disciplina_id')
          .in('professor_id', profIds);

        const discIds = [...new Set((vinculos || []).map((v: any) => v.disciplina_id))];
        const { data: disciplinas } = await supabase
          .from('disciplinas').select('id, nome').in('id', discIds);

        const discNomePorId: Record<string, string> = {};
        (disciplinas || []).forEach((d: any) => { discNomePorId[d.id] = d.nome; });

        (vinculos || []).forEach((v: any) => {
          if (!discPorProf[v.professor_id]) discPorProf[v.professor_id] = [];
          const nome = discNomePorId[v.disciplina_id];
          if (nome && !discPorProf[v.professor_id].includes(nome)) {
            discPorProf[v.professor_id].push(nome);
          }
        });
      }

      // 4. Frequências já salvas do dia (evita perder lançamentos anteriores)
      let qFreq = supabase
        .from('frequencia_professor')
        .select('*').eq('data', dataISO).eq('extra', false);

      if (segmentoForcado)           qFreq = qFreq.eq('segmento', segmentoForcado);
      else if (segmento !== 'todos') qFreq = qFreq.eq('segmento', segmento);

      const { data: freqSalvas } = await qFreq;
      const freqPorProf: Record<string, any> = {};
      (freqSalvas || []).forEach((f: any) => { freqPorProf[f.professor_id] = f; });

      // 5. Monta lista mesclando grade + frequência salva
      const novos: RegistroFrequencia[] = Array.from(profMap.values()).map(p => {
        const salvo = freqPorProf[p.professor_id];
        return {
          professor_id:         p.professor_id,
          professor_nome:       p.professor_nome,
          segmento:             p.segmento,
          presente:             salvo?.presente ?? 'presente',
          aulas_fund:           salvo?.aulas_fund  ?? p.aulas_fund,
          aulas_medio:          salvo?.aulas_medio ?? p.aulas_medio,
          aulas_fund_original:  p.aulas_fund,
          aulas_medio_original: p.aulas_medio,
          disciplinas:          discPorProf[p.professor_id] ?? [],
          observacao:           salvo?.observacao ?? '',
          extra:                false,
          editando:             false,
          salvo:                !!salvo,
          db_id:                salvo?.id,
        };
      });

      // 6. Extras já salvos do dia
      const { data: extras } = await supabase
        .from('frequencia_professor')
        .select('*').eq('data', dataISO).eq('extra', true);

      const extrasRegistros: RegistroFrequencia[] = (extras || []).map((e: any) => ({
        professor_id:         e.professor_id,
        professor_nome:       profMap.get(e.professor_id)?.professor_nome
                              ?? todosProf.find(p => p.id === e.professor_id)?.nome
                              ?? 'Professor',
        segmento:             e.segmento,
        presente:             e.presente,
        aulas_fund:           e.aulas_fund,
        aulas_medio:          e.aulas_medio,
        aulas_fund_original:  0,
        aulas_medio_original: 0,
        disciplinas:          [],
        observacao:           e.observacao ?? '',
        extra:                true,
        editando:             false,
        salvo:                true,
        db_id:                e.id,
      }));

      setRegistros([...novos, ...extrasRegistros]);
    } catch (err: any) {
      toast.error(`Erro ao carregar frequência: ${err.message}`);
    } finally {
      setCarregando(false);
    }
  }, [dataSelecionada, diaSemana, ehFimDeSemana, segmento, segmentoForcado, todosProf]);

  useEffect(() => { carregarFrequencia(); }, [carregarFrequencia]);

  // ── Atualiza campo de um registro ──
  const atualizarRegistro = (profId: string, campo: keyof RegistroFrequencia, valor: any) => {
    setRegistros(prev => prev.map(r => {
      if (r.professor_id !== profId) return r;
      const atualizado = { ...r, [campo]: valor, salvo: false };
      if (campo === 'presente') {
        if (valor === 'ausente') {
          atualizado.aulas_fund  = 0;
          atualizado.aulas_medio = 0;
        } else if (r.aulas_fund === 0 && r.aulas_medio === 0) {
          atualizado.aulas_fund  = r.aulas_fund_original;
          atualizado.aulas_medio = r.aulas_medio_original;
        }
      }
      return atualizado;
    }));
  };

  // ── Salvar linha individual ──
  const salvarLinha = async (profId: string) => {
    const r = registros.find(x => x.professor_id === profId);
    if (!r) return;

    const dataISO = dataParaISO(dataSelecionada);
    const payload = {
      professor_id: profId,
      data:         dataISO,
      segmento:     r.segmento,
      presente:     r.presente,
      aulas_fund:   r.aulas_fund,
      aulas_medio:  r.aulas_medio,
      extra:        r.extra,
      observacao:   r.observacao || null,
      editado_em:   new Date().toISOString(),
      editado_por:  usuario?.id ?? null,
    };

    try {
      if (r.db_id) {
        await supabase.from('frequencia_professor').update(payload).eq('id', r.db_id);
      } else {
        const { data: inserted } = await supabase
          .from('frequencia_professor').insert(payload).select('id').single();
        setRegistros(prev => prev.map(x =>
          x.professor_id === profId ? { ...x, db_id: inserted?.id } : x
        ));
      }
      setRegistros(prev => prev.map(x =>
        x.professor_id === profId ? { ...x, salvo: true, editando: false } : x
      ));
      toast.success('Salvo!');
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  // ── Adicionar professor extra / substituto ──
  const adicionarExtra = async () => {
    if (!extraProfId) { toast.error('Selecione um professor'); return; }
    if (extraFund === 0 && extraMedio === 0) { toast.error('Informe a quantidade de aulas'); return; }

    const prof = todosProf.find(p => p.id === extraProfId);
    if (!prof) return;
    const seg = segmentoForcado ?? extraSegmento;

    try {
      const { data, error } = await supabase
        .from('frequencia_professor')
        .insert({
          professor_id: extraProfId,
          data:         dataParaISO(dataSelecionada),
          segmento:     seg,
          presente:     'presente',
          aulas_fund:   extraFund,
          aulas_medio:  extraMedio,
          extra:        true,
          observacao:   extraObs || null,
          editado_por:  usuario?.id ?? null,
        }).select('id').single();

      if (error) throw error;

      setRegistros(prev => [...prev, {
        professor_id: extraProfId, professor_nome: prof.nome,
        segmento: seg, presente: 'presente',
        aulas_fund: extraFund, aulas_medio: extraMedio,
        aulas_fund_original: 0, aulas_medio_original: 0,
        disciplinas: [], observacao: extraObs,
        extra: true, editando: false, salvo: true, db_id: data?.id,
      }]);

      setExtraProfId(''); setExtraFund(0); setExtraMedio(0); setExtraObs('');
      toast.success('Professor extra adicionado!');
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const removerExtra = async (profId: string, dbId?: string) => {
    if (dbId) await supabase.from('frequencia_professor').delete().eq('id', dbId);
    setRegistros(prev => prev.filter(r => !(r.professor_id === profId && r.extra)));
    toast.success('Removido!');
  };

  // ── Gerar PDF mensal ──
  const gerarPDF = async () => {
    setGerandoPDF(true);
    try {
      const dataInicio = `${anoPDF}-${String(mesPDF).padStart(2, '0')}-01`;
      const dataFim    = new Date(anoPDF, mesPDF, 0).toISOString().split('T')[0];

      let query = supabase.from('frequencia_professor').select('*')
        .gte('data', dataInicio).lte('data', dataFim).order('data');

      if (segmentoForcado)           query = query.eq('segmento', segmentoForcado);
      else if (segmento !== 'todos') query = query.eq('segmento', segmento);

      const { data: registrosMes } = await query;

      const porProf: Record<string, {
        nome: string; segmento: string;
        totalFund: number; totalMedio: number;
        faltas: number; faltasJust: number;
      }> = {};

      const profIds = [...new Set((registrosMes || []).map((r: any) => r.professor_id))];
      const { data: profs } = await supabase
        .from('users').select('id, nome, segmento').in('id', profIds);

      const profNome: Record<string, any> = {};
      (profs || []).forEach((p: any) => { profNome[p.id] = p; });

      (registrosMes || []).forEach((r: any) => {
        if (!porProf[r.professor_id]) {
          porProf[r.professor_id] = {
            nome:      profNome[r.professor_id]?.nome     ?? '—',
            segmento:  profNome[r.professor_id]?.segmento ?? r.segmento,
            totalFund: 0, totalMedio: 0, faltas: 0, faltasJust: 0,
          };
        }
        porProf[r.professor_id].totalFund  += r.aulas_fund  ?? 0;
        porProf[r.professor_id].totalMedio += r.aulas_medio ?? 0;
        if (r.presente === 'ausente')           porProf[r.professor_id].faltas++;
        if (r.presente === 'falta_justificada') porProf[r.professor_id].faltasJust++;
      });

      const nomeMes = new Date(anoPDF, mesPDF - 1)
        .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

      const gerarSecao = (titulo: string, subtitulo: string, seg: string) => {
        const lista = Object.values(porProf).filter(p => p.segmento === seg);
        if (!lista.length) return '';
        const totalFund  = lista.reduce((s, p) => s + p.totalFund, 0);
        const totalMedio = lista.reduce((s, p) => s + p.totalMedio, 0);
        const totalGeral = totalFund + totalMedio;
        return `
          <div style="page-break-before: ${seg === 'presencial' ? 'always' : 'auto'};">
            <div style="border-bottom: 3px solid #1e40af; padding-bottom: 12px; margin-bottom: 20px;">
              <h1 style="font-size:18px;font-weight:bold;margin:0;color:#1e293b;">${titulo}</h1>
              <p style="font-size:12px;color:#64748b;margin:4px 0 0;">${subtitulo}</p>
              <p style="font-size:12px;color:#64748b;margin:2px 0 0;">
                Relatório de Hora/Aula — ${nomeMes} · Gerado em: ${new Date().toLocaleDateString('pt-BR')}
              </p>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
              <thead>
                <tr style="background:#1e40af;color:white;">
                  <th style="padding:8px;text-align:left;">Professor</th>
                  <th style="padding:8px;text-align:center;">Aulas Fund.</th>
                  <th style="padding:8px;text-align:center;">Aulas Médio</th>
                  <th style="padding:8px;text-align:center;">Total Aulas</th>
                  <th style="padding:8px;text-align:center;">Faltas</th>
                  <th style="padding:8px;text-align:center;">F. Justificadas</th>
                </tr>
              </thead>
              <tbody>
                ${lista.map((p, i) => `
                  <tr style="background:${i % 2 === 0 ? '#f8fafc' : 'white'};">
                    <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${p.nome}</td>
                    <td style="padding:8px;text-align:center;border-bottom:1px solid #e2e8f0;">${p.totalFund}</td>
                    <td style="padding:8px;text-align:center;border-bottom:1px solid #e2e8f0;">${p.totalMedio}</td>
                    <td style="padding:8px;text-align:center;border-bottom:1px solid #e2e8f0;font-weight:bold;">${p.totalFund + p.totalMedio}</td>
                    <td style="padding:8px;text-align:center;border-bottom:1px solid #e2e8f0;color:#dc2626;">${p.faltas}</td>
                    <td style="padding:8px;text-align:center;border-bottom:1px solid #e2e8f0;color:#d97706;">${p.faltasJust}</td>
                  </tr>
                `).join('')}
                <tr style="background:#1e3a8a;color:white;font-weight:bold;">
                  <td style="padding:8px;">TOTAL GERAL</td>
                  <td style="padding:8px;text-align:center;">${totalFund}</td>
                  <td style="padding:8px;text-align:center;">${totalMedio}</td>
                  <td style="padding:8px;text-align:center;">${totalGeral}</td>
                  <td style="padding:8px;text-align:center;">${lista.reduce((s, p) => s + p.faltas, 0)}</td>
                  <td style="padding:8px;text-align:center;">${lista.reduce((s, p) => s + p.faltasJust, 0)}</td>
                </tr>
              </tbody>
            </table>
            <div style="margin-top:60px;display:flex;justify-content:center;">
              <div style="text-align:center;border-top:1px solid #1e293b;padding-top:8px;width:300px;">
                <p style="font-size:11px;color:#475569;">Assinatura e carimbo responsável</p>
              </div>
            </div>
          </div>
        `;
      };

      const mostrarEAD        = !segmentoForcado || segmentoForcado === 'ead';
      const mostrarPresencial = !segmentoForcado || segmentoForcado === 'presencial';

      const html = `
        <!DOCTYPE html><html><head><meta charset="UTF-8"/>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #1e293b; }
          @media print { body { margin: 20px; } }
        </style></head><body>
        ${mostrarEAD && (segmento === 'ead' || segmento === 'todos')
          ? gerarSecao('SynerTech', 'Instituto de Ensino — Segmento EAD', 'ead') : ''}
        ${mostrarPresencial && (segmento === 'presencial' || segmento === 'todos')
          ? gerarSecao('Colégio Conexão Maranhense', 'Ensino Presencial', 'presencial') : ''}
        <p style="margin-top:40px;font-size:10px;color:#94a3b8;text-align:center;">
          Documento gerado automaticamente pelo sistema AVA — ${new Date().toLocaleString('pt-BR')}
        </p>
        </body></html>
      `;

      const janela = window.open('', '_blank');
      if (janela) {
        janela.document.write(html);
        janela.document.close();
        janela.focus();
        setTimeout(() => janela.print(), 500);
      }
      setModalPDF(false);
    } catch (err: any) {
      toast.error(`Erro ao gerar PDF: ${err.message}`);
    } finally {
      setGerandoPDF(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onVoltar} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <div>
            <h2 className="text-xl font-bold text-foreground">Frequência de Professores</h2>
            <p className="text-xs text-muted-foreground">{formatarData(dataSelecionada)} · {diaSemana}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={() => setModalPDF(true)} variant="outline" size="sm" className="gap-2">
            <FileText className="w-4 h-4" /> Relatório PDF
          </Button>
        </div>
      </div>

      {/* Filtros + Totais */}
      <Card className="border-border">
        <CardContent className="pt-5 pb-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Data</Label>
              <input
                type="date"
                value={dataParaISO(dataSelecionada)}
                onChange={e => {
                  const [y, m, d] = e.target.value.split('-').map(Number);
                  setDataSelecionada(new Date(y, m - 1, d, 12, 0, 0));
                }}
                className="h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm"
              />
            </div>
            {!segmentoForcado && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Segmento</Label>
                <Select value={segmento} onValueChange={(v: any) => setSegmento(v)}>
                  <SelectTrigger className="w-40 h-9 bg-background border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="ead">EAD</SelectItem>
                    <SelectItem value="presencial">Presencial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex gap-3 ml-auto flex-wrap">
              {[
                { label: 'Professores', value: totais.professores, cor: 'text-blue-600 dark:text-blue-400' },
                { label: 'Presentes',   value: totais.presentes,   cor: 'text-green-600 dark:text-green-400' },
                { label: 'Aulas Fund.', value: totais.totalFund,   cor: 'text-violet-600 dark:text-violet-400' },
                { label: 'Aulas Médio', value: totais.totalMedio,  cor: 'text-orange-600 dark:text-orange-400' },
              ].map(t => (
                <div key={t.label} className="text-center px-3 py-1.5 rounded-lg bg-muted/50 border border-border min-w-[70px]">
                  <div className={`text-lg font-bold ${t.cor}`}>{t.value}</div>
                  <div className="text-xs text-muted-foreground">{t.label}</div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fim de semana */}
      {ehFimDeSemana && (
        <Card className="border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Não há aulas em {diaSemana}.</p>
          </CardContent>
        </Card>
      )}

      {/* Carregando */}
      {carregando && !ehFimDeSemana && (
        <Card className="border-border">
          <CardContent className="py-12 flex items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-muted-foreground">Carregando frequência...</span>
          </CardContent>
        </Card>
      )}

      {/* Tabela principal */}
      {!carregando && !ehFimDeSemana && (
        <Card className="border-border">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="flex items-center gap-2 text-foreground text-base">
              <Users className="w-4 h-4 text-primary" />
              Professores do dia — {diaSemana}
              <Badge variant="secondary" className="ml-1">{registrosNormais.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {registrosNormais.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Nenhum professor com aulas na grade para {diaSemana}.</p>
                <p className="text-sm mt-1 text-amber-600 dark:text-amber-400">
                  Configure a grade horária em "Agenda dos Professores → Configurar Grade".
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground">Professor</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground">Disciplinas</th>
                      <th className="py-3 px-4 text-center font-medium text-muted-foreground">Status</th>
                      <th className="py-3 px-4 text-center font-medium text-muted-foreground w-20">Fund.</th>
                      <th className="py-3 px-4 text-center font-medium text-muted-foreground w-20">Médio</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground">Observação</th>
                      <th className="py-3 px-4 text-center font-medium text-muted-foreground w-32">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrosNormais.map(r => (
                      <tr key={r.professor_id}
                        className={`border-b border-border last:border-0 transition-colors ${
                          r.salvo
                            ? 'bg-green-50/30 dark:bg-green-900/5'
                            : 'hover:bg-muted/20'
                        }`}>
                        <td className="py-3 px-4">
                          <div className="font-medium text-foreground">{r.professor_nome}</div>
                          <div className="text-xs text-muted-foreground capitalize">{r.segmento}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {r.disciplinas.slice(0, 2).map(d => (
                              <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>
                            ))}
                            {r.disciplinas.length > 2 && (
                              <Badge variant="outline" className="text-xs">+{r.disciplinas.length - 2}</Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Select
                            value={r.presente}
                            disabled={r.salvo && !r.editando}
                            onValueChange={v => atualizarRegistro(r.professor_id, 'presente', v as StatusPresenca)}>
                            <SelectTrigger className={`h-8 text-xs w-36 mx-auto border-0 ${STATUS_CONFIG[r.presente].badge} font-medium`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="presente">✅ Presente</SelectItem>
                              <SelectItem value="ausente">❌ Ausente</SelectItem>
                              <SelectItem value="falta_justificada">⚠️ F. Justificada</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Input
                            type="number" min={0} max={20}
                            value={r.aulas_fund}
                            disabled={(r.salvo && !r.editando) || r.presente === 'ausente'}
                            onChange={e => atualizarRegistro(r.professor_id, 'aulas_fund', Number(e.target.value))}
                            className="h-8 w-16 mx-auto text-center text-sm disabled:opacity-40"
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Input
                            type="number" min={0} max={20}
                            value={r.aulas_medio}
                            disabled={(r.salvo && !r.editando) || r.presente === 'ausente'}
                            onChange={e => atualizarRegistro(r.professor_id, 'aulas_medio', Number(e.target.value))}
                            className="h-8 w-16 mx-auto text-center text-sm disabled:opacity-40"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <Input
                            value={r.observacao}
                            disabled={r.salvo && !r.editando}
                            placeholder={r.presente === 'falta_justificada' ? 'Motivo...' : 'Opcional'}
                            onChange={e => atualizarRegistro(r.professor_id, 'observacao', e.target.value)}
                            className="h-8 text-sm disabled:opacity-40"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            {r.salvo && !r.editando ? (
                              <>
                                <Button size="sm"
                                  className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700 text-white gap-1 cursor-default"
                                  onClick={() => {}}>
                                  <CheckCircle className="w-3 h-3" /> Salvo
                                </Button>
                                <Button size="sm" variant="outline"
                                  className="h-7 px-2 text-xs gap-1"
                                  onClick={() => setRegistros(prev => prev.map(x =>
                                    x.professor_id === r.professor_id ? { ...x, editando: true, salvo: false } : x
                                  ))}>
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                              </>
                            ) : (
                              <Button size="sm"
                                className="h-7 px-2 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1"
                                onClick={() => salvarLinha(r.professor_id)}>
                                <Save className="w-3 h-3" /> Salvar
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Professores extras / substitutos */}
      {!ehFimDeSemana && (
        <Card className="border-border">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-base text-foreground flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" /> Professores Extras / Substitutos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end p-4 rounded-lg border border-border bg-muted/20">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs text-muted-foreground">Professor</Label>
                <Select value={extraProfId} onValueChange={setExtraProfId}>
                  <SelectTrigger className="h-9 bg-background border-border text-foreground text-sm">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {todosProf.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!segmentoForcado && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Segmento</Label>
                  <Select value={extraSegmento} onValueChange={(v: any) => setExtraSegmento(v)}>
                    <SelectTrigger className="h-9 bg-background border-border text-foreground text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ead">EAD</SelectItem>
                      <SelectItem value="presencial">Presencial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Aulas Fund.</Label>
                <Input type="number" min={0} value={extraFund}
                  onChange={e => setExtraFund(Number(e.target.value))} className="h-9 text-center" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Aulas Médio</Label>
                <Input type="number" min={0} value={extraMedio}
                  onChange={e => setExtraMedio(Number(e.target.value))} className="h-9 text-center" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Observação</Label>
                <Input value={extraObs} placeholder="Substituição..."
                  onChange={e => setExtraObs(e.target.value)} className="h-9 text-sm" />
              </div>
              <Button onClick={adicionarExtra} size="sm" className="gap-2 h-9">
                <Plus className="w-4 h-4" /> Adicionar
              </Button>
            </div>

            {registrosExtras.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="py-2 px-4 text-left font-medium text-muted-foreground">Professor</th>
                      <th className="py-2 px-4 text-center font-medium text-muted-foreground">Status</th>
                      <th className="py-2 px-4 text-center font-medium text-muted-foreground">Fund.</th>
                      <th className="py-2 px-4 text-center font-medium text-muted-foreground">Médio</th>
                      <th className="py-2 px-4 text-left font-medium text-muted-foreground">Obs.</th>
                      <th className="py-2 px-4 text-center font-medium text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrosExtras.map(r => (
                      <tr key={r.professor_id + '_extra'}
                        className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="py-2 px-4">
                          <div className="font-medium text-foreground text-sm">{r.professor_nome}</div>
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-0 text-xs mt-0.5">
                            Extra
                          </Badge>
                        </td>
                        <td className="py-2 px-4 text-center">
                          <Badge className={`text-xs ${STATUS_CONFIG[r.presente].badge}`}>
                            {STATUS_CONFIG[r.presente].label}
                          </Badge>
                        </td>
                        <td className="py-2 px-4 text-center text-foreground">{r.aulas_fund}</td>
                        <td className="py-2 px-4 text-center text-foreground">{r.aulas_medio}</td>
                        <td className="py-2 px-4 text-muted-foreground text-xs">{r.observacao || '—'}</td>
                        <td className="py-2 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <Badge className={`text-xs ${r.salvo
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                              : 'bg-muted text-muted-foreground'}`}>
                              {r.salvo ? '✅ Salvo' : 'Pendente'}
                            </Badge>
                            <Button variant="ghost" size="sm"
                              onClick={() => removerExtra(r.professor_id, r.db_id)}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive">
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal PDF */}
      {modalPDF && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-5">
            <div>
              <h3 className="font-semibold text-foreground text-lg">Relatório de Hora/Aula</h3>
              <p className="text-xs text-muted-foreground mt-1">Selecione o período para gerar o PDF</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Mês</Label>
                <Select value={String(mesPDF)} onValueChange={v => setMesPDF(Number(v))}>
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                      'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
                      .map((m, i) => <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Ano</Label>
                <Select value={String(anoPDF)} onValueChange={v => setAnoPDF(Number(v))}>
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027].map(a =>
                      <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
              <p className="text-xs text-amber-800 dark:text-amber-300">
                ⚠️ O relatório será aberto em nova aba para impressão/download como PDF.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setModalPDF(false)} className="flex-1">Cancelar</Button>
              <Button onClick={gerarPDF} disabled={gerandoPDF} className="flex-1 gap-2">
                {gerandoPDF
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Gerando...</>
                  : <><FileText className="w-4 h-4" />Gerar PDF</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
