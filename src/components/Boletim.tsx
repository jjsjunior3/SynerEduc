// src/components/Boletim.tsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Printer,
  TrendingUp,
  Loader2,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface UsuarioProps {
  id: string;
  nome: string;
  serie?: string;
}

interface DisciplinaData {
  id: string;
  nome: string;
  cor?: string;
}

interface TurmaProps {
  id: string;
  nome: string;
  serieId: string;
  serieNome: string;
  totalAlunos: number;
  disciplinas: DisciplinaData[];
}

interface BoletimProps {
  usuario: UsuarioProps | null;
  turma: TurmaProps | null;
}

interface NotaBimestre {
  av1: number | null;
  av2: number | null;
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
  ptsTotal: number | null;
  mediaFinal: number | null;
  recupFinal: number | null;
  situacao: 'Aprovado' | 'Reprovado' | 'Recuperação' | 'N/A';
}

export default function Boletim({ usuario, turma }: BoletimProps) {
  const [notasBoletim, setNotasBoletim] = useState<NotaDisciplina[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const buscarBoletim = useCallback(async () => {
    if (!usuario?.id || !turma?.serieNome || !turma?.disciplinas) {
      setErro('Informações do aluno, série ou disciplinas não disponíveis.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setErro(null);

    try {
      const { data: notasExistentes, error: notasError } = await supabase
        .from('notas')
        .select(`
          disciplina_id,
          bimestre,
          av1, av2, recuperacao, media, media_final, status_final,
          disciplinas(nome)
        `)
        .eq('user_id', usuario.id)
        .order('nome', { foreignTable: 'disciplinas', ascending: true })
        .order('bimestre', { ascending: true });

      if (notasError) throw notasError;

      const notasPorDisciplina: Record<string, NotaDisciplina> = {};
      turma.disciplinas.forEach(disc => {
        notasPorDisciplina[disc.id] = {
          disciplina_id: disc.id,
          disciplina_nome: disc.nome,
          bimestre1: { av1: null, av2: null, rec: null, med: null },
          bimestre2: { av1: null, av2: null, rec: null, med: null },
          bimestre3: { av1: null, av2: null, rec: null, med: null },
          bimestre4: { av1: null, av2: null, rec: null, med: null },
          ptsTotal: null,
          mediaFinal: null,
          recupFinal: null,
          situacao: 'N/A',
        };
      });

      (notasExistentes || []).forEach((nota: any) => {
        const disciplinaId = nota.disciplina_id;
        const bimestreNum = nota.bimestre;

        if (!notasPorDisciplina[disciplinaId]) {
          notasPorDisciplina[disciplinaId] = {
            disciplina_id: disciplinaId,
            disciplina_nome: nota.disciplinas?.nome || 'Disciplina Desconhecida',
            bimestre1: { av1: null, av2: null, rec: null, med: null },
            bimestre2: { av1: null, av2: null, rec: null, med: null },
            bimestre3: { av1: null, av2: null, rec: null, med: null },
            bimestre4: { av1: null, av2: null, rec: null, med: null },
            ptsTotal: null, mediaFinal: null, recupFinal: null, situacao: 'N/A',
          };
        }

        const notaBimestre: NotaBimestre = {
          av1: nota.av1, av2: nota.av2, rec: nota.recuperacao, med: nota.media,
        };

        switch (bimestreNum) {
          case 1: notasPorDisciplina[disciplinaId].bimestre1 = notaBimestre; break;
          case 2: notasPorDisciplina[disciplinaId].bimestre2 = notaBimestre; break;
          case 3: notasPorDisciplina[disciplinaId].bimestre3 = notaBimestre; break;
          case 4: notasPorDisciplina[disciplinaId].bimestre4 = notaBimestre; break;
        }

        if (nota.media_final !== null) notasPorDisciplina[disciplinaId].mediaFinal = nota.media_final;
        if (nota.status_final) {
          notasPorDisciplina[disciplinaId].situacao = (
            nota.status_final.charAt(0).toUpperCase() + nota.status_final.slice(1)
          ) as NotaDisciplina['situacao'];
        }
        notasPorDisciplina[disciplinaId].recupFinal = null;
      });

      Object.values(notasPorDisciplina).forEach(nd => {
        let somaMedias = 0;
        let bimestresComMedia = 0;
        [nd.bimestre1, nd.bimestre2, nd.bimestre3, nd.bimestre4].forEach(b => {
          if (b.med !== null) { somaMedias += b.med; bimestresComMedia++; }
        });
        nd.ptsTotal = somaMedias;
        if (bimestresComMedia > 0) {
          if (nd.mediaFinal === null) nd.mediaFinal = somaMedias / bimestresComMedia;
        } else {
          nd.mediaFinal = null;
        }
        if (nd.situacao === 'N/A' && nd.mediaFinal !== null) {
          if (nd.mediaFinal >= 7) nd.situacao = 'Aprovado';
          else if (nd.mediaFinal >= 5) nd.situacao = 'Recuperação';
          else nd.situacao = 'Reprovado';
        }
      });

      setNotasBoletim(
        Object.values(notasPorDisciplina).sort((a, b) => a.disciplina_nome.localeCompare(b.disciplina_nome))
      );
    } catch (err: any) {
      setErro(err.message || 'Erro ao carregar boletim.');
    } finally {
      setLoading(false);
    }
  }, [usuario?.id, turma?.serieNome, turma?.disciplinas]);

  useEffect(() => { buscarBoletim(); }, [buscarBoletim]);

  const getNotaColor = (nota: number | null) => {
    if (nota === null) return 'text-muted-foreground print:!text-gray-500';
    if (nota >= 9) return 'text-green-600 dark:text-green-400 print:!text-green-700 font-bold';
    if (nota >= 7) return 'text-green-600 dark:text-green-400 print:!text-green-700';
    if (nota >= 5) return 'text-yellow-600 dark:text-yellow-400 print:!text-yellow-700';
    return 'text-red-600 dark:text-red-400 print:!text-red-700';
  };

  const getSituacaoColor = (situacao: NotaDisciplina['situacao']) => {
    switch (situacao) {
      case 'Aprovado': return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 print:!bg-green-100 print:!text-green-800 print:!border-green-400';
      case 'Recuperação': return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20 print:!bg-yellow-100 print:!text-yellow-800 print:!border-yellow-400';
      case 'Reprovado': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 print:!bg-red-100 print:!text-red-800 print:!border-red-400';
      default: return 'bg-muted text-muted-foreground border-border print:!bg-gray-100 print:!text-gray-600 print:!border-gray-300';
    }
  };

  const handleImprimir = () => {
    const anoLetivo = new Date().getFullYear();
    const dataEmissao = new Date().toLocaleDateString('pt-BR');

    // Monta as linhas da tabela
    const linhasTabela = notasBoletim.map(nota => {
      const cel = (v: number | null, bold = false) =>
        v !== null
          ? `<td style="border:1px solid #ccc;padding:4px 6px;text-align:center;${bold ? 'font-weight:700;' : ''}">${v.toFixed(1)}</td>`
          : `<td style="border:1px solid #ccc;padding:4px 6px;text-align:center;color:#999">-</td>`;

      const corSituacao = nota.situacao === 'Aprovado'
        ? '#15803d' : nota.situacao === 'Reprovado'
        ? '#dc2626' : '#ca8a04';

      return `
        <tr>
          <td style="border:1px solid #ccc;padding:4px 8px;font-weight:600">${nota.disciplina_nome}</td>
          ${cel(nota.bimestre1.av1)}${cel(nota.bimestre1.av2)}
          ${nota.bimestre1.rec ? cel(nota.bimestre1.rec) : '<td style="border:1px solid #ccc;padding:4px 6px;text-align:center;color:#999">-</td>'}
          ${cel(nota.bimestre1.med, true)}
          ${cel(nota.bimestre2.av1)}${cel(nota.bimestre2.av2)}
          ${nota.bimestre2.rec ? cel(nota.bimestre2.rec) : '<td style="border:1px solid #ccc;padding:4px 6px;text-align:center;color:#999">-</td>'}
          ${cel(nota.bimestre2.med, true)}
          ${cel(nota.bimestre3.av1)}${cel(nota.bimestre3.av2)}
          ${nota.bimestre3.rec ? cel(nota.bimestre3.rec) : '<td style="border:1px solid #ccc;padding:4px 6px;text-align:center;color:#999">-</td>'}
          ${cel(nota.bimestre3.med, true)}
          ${cel(nota.bimestre4.av1)}${cel(nota.bimestre4.av2)}
          ${nota.bimestre4.rec ? cel(nota.bimestre4.rec) : '<td style="border:1px solid #ccc;padding:4px 6px;text-align:center;color:#999">-</td>'}
          ${cel(nota.bimestre4.med, true)}
          <td style="border:1px solid #ccc;padding:4px 6px;text-align:center;font-weight:700;color:#1d4ed8">${nota.ptsTotal !== null ? nota.ptsTotal.toFixed(1) : '-'}</td>
          <td style="border:1px solid #ccc;padding:4px 6px;text-align:center;font-weight:700;font-size:14px;color:${nota.mediaFinal !== null && nota.mediaFinal >= 7 ? '#15803d' : nota.mediaFinal !== null && nota.mediaFinal >= 5 ? '#ca8a04' : '#dc2626'}">${nota.mediaFinal !== null ? nota.mediaFinal.toFixed(1) : '-'}</td>
          <td style="border:1px solid #ccc;padding:4px 6px;text-align:center;color:#999">-</td>
          <td style="border:1px solid #ccc;padding:4px 6px;text-align:center;font-weight:600;color:${corSituacao}">${nota.situacao}</td>
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Boletim — ${usuario?.nome}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #000; background: #fff; padding: 20px; }
    @page { size: landscape; margin: 12mm; }

    /* Cabeçalho */
    .header { display: flex; align-items: center; gap: 16px; border-bottom: 2px solid #1d4ed8; padding-bottom: 12px; margin-bottom: 14px; }
    .header-logo { width: 56px; height: 56px; border-radius: 50%; background: #1d4ed8; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 900; font-size: 18px; flex-shrink: 0; }
    .header-text h1 { font-size: 18px; font-weight: 800; color: #1d4ed8; }
    .header-text p { font-size: 11px; color: #555; margin-top: 2px; }

    /* Título do boletim */
    .titulo { text-align: center; font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }

    /* Info do aluno */
    .info-aluno { display: flex; justify-content: space-between; background: #f0f4ff; border: 1px solid #c7d7fd; border-radius: 6px; padding: 8px 14px; margin-bottom: 14px; font-size: 11px; }
    .info-aluno span { font-weight: 700; }

    /* Tabela */
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { background: #e8edf8; border: 1px solid #ccc; padding: 4px 6px; text-align: center; font-weight: 700; }
    th.disciplina-header { text-align: left; padding-left: 8px; }
    .bim-1 { background: #dbeafe; }
    .bim-2 { background: #dcfce7; }
    .bim-3 { background: #fef9c3; }
    .bim-4 { background: #ede9fe; }
    tr:nth-child(even) td { background: #f9fafb; }

    /* Legenda */
    .legenda { margin-top: 12px; display: flex; gap: 40px; font-size: 10px; color: #444; border-top: 1px solid #ddd; padding-top: 10px; }
    .legenda ul { list-style: none; }
    .legenda li { margin-bottom: 3px; }

    /* Assinatura */
    .assinaturas { display: flex; justify-content: space-around; margin-top: 28px; }
    .assinatura { text-align: center; width: 200px; }
    .assinatura .linha { border-top: 1px solid #000; padding-top: 4px; font-size: 10px; font-weight: 600; }
  </style>
</head>
<body>

  <!-- Cabeçalho -->
  <div class="header">
    <div class="header-logo">CE</div>
    <div class="header-text">
      <h1>Colégio Conexão EAD</h1>
      <p>Sistema de Gestão Escolar — Boletim Oficial</p>
    </div>
  </div>

  <div class="titulo">Boletim Escolar — ${anoLetivo}</div>

  <!-- Info do aluno -->
  <div class="info-aluno">
    <div>Nome: <span>${usuario?.nome}</span></div>
    <div>Série: <span>${turma?.serieNome}</span></div>
    <div>Ano Letivo: <span>${anoLetivo}</span></div>
    <div>Data de Emissão: <span>${dataEmissao}</span></div>
  </div>

  <!-- Tabela de notas -->
  <table>
    <thead>
      <tr>
        <th rowspan="2" class="disciplina-header" style="width:13%">Disciplina</th>
        <th colspan="4" class="bim-1">1º Bimestre</th>
        <th colspan="4" class="bim-2">2º Bimestre</th>
        <th colspan="4" class="bim-3">3º Bimestre</th>
        <th colspan="4" class="bim-4">4º Bimestre</th>
        <th rowspan="2">Pts Total</th>
        <th rowspan="2">Média Final</th>
        <th rowspan="2">Recup Final</th>
        <th rowspan="2">Situação</th>
      </tr>
      <tr>
        <th>AV1</th><th>AV2</th><th>REC</th><th>MÉD</th>
        <th>AV1</th><th>AV2</th><th>REC</th><th>MÉD</th>
        <th>AV1</th><th>AV2</th><th>REC</th><th>MÉD</th>
        <th>AV1</th><th>AV2</th><th>REC</th><th>MÉD</th>
      </tr>
    </thead>
    <tbody>${linhasTabela}</tbody>
  </table>

  <!-- Legenda -->
  <div class="legenda">
    <div>
      <strong>Legenda:</strong>
      <ul>
        <li>AV1/AV2: Avaliações 1 e 2</li>
        <li>REC: Recuperação do Bimestre</li>
        <li>MÉD: Média do Bimestre (AV1 + AV2) ÷ 2</li>
        <li>Pts Total: Soma das médias dos 4 bimestres</li>
        <li>Média Final: Pts Total ÷ 4</li>
      </ul>
    </div>
    <div>
      <strong>Critérios de Aprovação:</strong>
      <ul>
        <li>✅ Média Final ≥ 7.0 → Aprovado</li>
        <li>⚠️ Média Final entre 5.0 e 6.9 → Recuperação</li>
        <li>❌ Média Final &lt; 5.0 → Reprovado</li>
      </ul>
    </div>
  </div>

  <!-- Assinaturas -->
  <div class="assinaturas">
    <div class="assinatura"><div class="linha">Coordenação Pedagógica</div></div>
    <div class="assinatura"><div class="linha">Direção Escolar</div></div>
  </div>

</body>
</html>`;

    const janela = window.open('', '_blank', 'width=1200,height=700');
    if (!janela) { toast.error('Popup bloqueado. Permita popups para este site.'); return; }
    janela.document.write(html);
    janela.document.close();
    janela.focus();
    setTimeout(() => { janela.print(); janela.close(); }, 500);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-foreground">
        <Loader2 className="animate-spin w-6 h-6 mr-2" />
        Carregando boletim...
      </div>
    );
  }

  if (erro) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/50">
        <CardContent className="p-6 flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 mt-1" />
          <div>
            <h3 className="font-semibold text-red-900 dark:text-red-400 mb-1">Erro ao carregar boletim</h3>
            <p className="text-sm text-red-700 dark:text-red-300 mb-3">{erro}</p>
            <Button variant="outline" onClick={buscarBoletim}>Tentar novamente</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 print:p-0 print:m-0 print:space-y-0">

      {/* Botão imprimir — alinhado à direita, oculto na impressão */}
      <div className="flex justify-end print:hidden">
        <Button onClick={handleImprimir} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Printer className="w-4 h-4 mr-2" />
          Imprimir Boletim
        </Button>
      </div>

      {/* Informações do Aluno — tela */}
      <Card className="print:hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" />
            Informações do Aluno
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Nome:</p>
              <p className="font-semibold text-foreground">{usuario?.nome}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Série:</p>
              <p className="font-semibold text-foreground">{turma?.serieNome}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Ano Letivo:</p>
              <p className="font-semibold text-foreground">{new Date().getFullYear()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Notas */}
      <Card className="print:shadow-none print:border-none print:bg-transparent">
        <CardHeader className="pb-3 print:hidden">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Notas por Disciplina
          </CardTitle>
        </CardHeader>
        <CardContent className="print:p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/50 print:!bg-gray-200">
                  <th rowSpan={2} className="border border-border print:!border-gray-400 px-3 py-2 text-left font-semibold text-foreground print:!text-black w-[20%]">Disciplina</th>
                  <th colSpan={4} className="border border-border print:!border-gray-400 px-2 py-1 text-center font-semibold text-foreground print:!text-black bg-blue-500/10 print:!bg-blue-100">1º Bimestre</th>
                  <th colSpan={4} className="border border-border print:!border-gray-400 px-2 py-1 text-center font-semibold text-foreground print:!text-black bg-green-500/10 print:!bg-green-100">2º Bimestre</th>
                  <th colSpan={4} className="border border-border print:!border-gray-400 px-2 py-1 text-center font-semibold text-foreground print:!text-black bg-yellow-500/10 print:!bg-yellow-100">3º Bimestre</th>
                  <th colSpan={4} className="border border-border print:!border-gray-400 px-2 py-1 text-center font-semibold text-foreground print:!text-black bg-purple-500/10 print:!bg-purple-100">4º Bimestre</th>
                  <th rowSpan={2} className="border border-border print:!border-gray-400 px-2 py-2 text-center font-semibold text-foreground print:!text-black">Pts Total</th>
                  <th rowSpan={2} className="border border-border print:!border-gray-400 px-2 py-2 text-center font-semibold text-foreground print:!text-black">Média Final</th>
                  <th rowSpan={2} className="border border-border print:!border-gray-400 px-2 py-2 text-center font-semibold text-foreground print:!text-black">Recup Final</th>
                  <th rowSpan={2} className="border border-border print:!border-gray-400 px-2 py-2 text-center font-semibold text-foreground print:!text-black">Situação</th>
                </tr>
                <tr className="bg-muted/30 print:!bg-gray-100 text-xs text-muted-foreground print:!text-gray-700">
                  {['AV1','AV2','REC','MÉD','AV1','AV2','REC','MÉD','AV1','AV2','REC','MÉD','AV1','AV2','REC','MÉD'].map((col, i) => (
                    <th key={i} className="border border-border print:!border-gray-400 px-2 py-1 text-center">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {notasBoletim.map((nota, idx) => (
                  <tr key={nota.disciplina_id || idx} className="hover:bg-muted/30 transition-colors print:hover:!bg-transparent group">
                    <td className="border border-border print:!border-gray-400 px-3 py-2 font-semibold sticky left-0 bg-card print:!bg-transparent group-hover:bg-muted/30 text-foreground print:!text-black z-10">
                      {nota.disciplina_nome}
                    </td>
                    {/* 1º Bimestre */}
                    <td className={`border border-border print:!border-gray-400 px-2 py-2 text-center ${getNotaColor(nota.bimestre1.av1)}`}>{nota.bimestre1.av1 !== null ? nota.bimestre1.av1.toFixed(1) : '-'}</td>
                    <td className={`border border-border print:!border-gray-400 px-2 py-2 text-center ${getNotaColor(nota.bimestre1.av2)}`}>{nota.bimestre1.av2 !== null ? nota.bimestre1.av2.toFixed(1) : '-'}</td>
                    <td className="border border-border print:!border-gray-400 px-2 py-2 text-center text-muted-foreground print:!text-gray-500">{nota.bimestre1.rec !== null && nota.bimestre1.rec > 0 ? nota.bimestre1.rec.toFixed(1) : '-'}</td>
                    <td className={`border border-border print:!border-gray-400 px-2 py-2 text-center font-bold ${getNotaColor(nota.bimestre1.med)}`}>{nota.bimestre1.med !== null ? nota.bimestre1.med.toFixed(1) : '-'}</td>
                    {/* 2º Bimestre */}
                    <td className={`border border-border print:!border-gray-400 px-2 py-2 text-center ${getNotaColor(nota.bimestre2.av1)}`}>{nota.bimestre2.av1 !== null ? nota.bimestre2.av1.toFixed(1) : '-'}</td>
                    <td className={`border border-border print:!border-gray-400 px-2 py-2 text-center ${getNotaColor(nota.bimestre2.av2)}`}>{nota.bimestre2.av2 !== null ? nota.bimestre2.av2.toFixed(1) : '-'}</td>
                    <td className="border border-border print:!border-gray-400 px-2 py-2 text-center text-muted-foreground print:!text-gray-500">{nota.bimestre2.rec !== null && nota.bimestre2.rec > 0 ? nota.bimestre2.rec.toFixed(1) : '-'}</td>
                    <td className={`border border-border print:!border-gray-400 px-2 py-2 text-center font-bold ${getNotaColor(nota.bimestre2.med)}`}>{nota.bimestre2.med !== null ? nota.bimestre2.med.toFixed(1) : '-'}</td>
                    {/* 3º Bimestre */}
                    <td className={`border border-border print:!border-gray-400 px-2 py-2 text-center ${getNotaColor(nota.bimestre3.av1)}`}>{nota.bimestre3.av1 !== null ? nota.bimestre3.av1.toFixed(1) : '-'}</td>
                    <td className={`border border-border print:!border-gray-400 px-2 py-2 text-center ${getNotaColor(nota.bimestre3.av2)}`}>{nota.bimestre3.av2 !== null ? nota.bimestre3.av2.toFixed(1) : '-'}</td>
                    <td className="border border-border print:!border-gray-400 px-2 py-2 text-center text-muted-foreground print:!text-gray-500">{nota.bimestre3.rec !== null && nota.bimestre3.rec > 0 ? nota.bimestre3.rec.toFixed(1) : '-'}</td>
                    <td className={`border border-border print:!border-gray-400 px-2 py-2 text-center font-bold ${getNotaColor(nota.bimestre3.med)}`}>{nota.bimestre3.med !== null ? nota.bimestre3.med.toFixed(1) : '-'}</td>
                    {/* 4º Bimestre */}
                    <td className={`border border-border print:!border-gray-400 px-2 py-2 text-center ${getNotaColor(nota.bimestre4.av1)}`}>{nota.bimestre4.av1 !== null ? nota.bimestre4.av1.toFixed(1) : '-'}</td>
                    <td className={`border border-border print:!border-gray-400 px-2 py-2 text-center ${getNotaColor(nota.bimestre4.av2)}`}>{nota.bimestre4.av2 !== null ? nota.bimestre4.av2.toFixed(1) : '-'}</td>
                    <td className="border border-border print:!border-gray-400 px-2 py-2 text-center text-muted-foreground print:!text-gray-500">{nota.bimestre4.rec !== null && nota.bimestre4.rec > 0 ? nota.bimestre4.rec.toFixed(1) : '-'}</td>
                    <td className={`border border-border print:!border-gray-400 px-2 py-2 text-center font-bold ${getNotaColor(nota.bimestre4.med)}`}>{nota.bimestre4.med !== null ? nota.bimestre4.med.toFixed(1) : '-'}</td>
                    {/* Totais */}
                    <td className="border border-border print:!border-gray-400 px-2 py-2 text-center font-bold text-primary print:!text-blue-800">{nota.ptsTotal !== null ? nota.ptsTotal.toFixed(1) : '-'}</td>
                    <td className={`border border-border print:!border-gray-400 px-2 py-2 text-center font-bold text-lg ${getNotaColor(nota.mediaFinal)}`}>{nota.mediaFinal !== null ? nota.mediaFinal.toFixed(1) : '-'}</td>
                    <td className="border border-border print:!border-gray-400 px-2 py-2 text-center text-muted-foreground print:!text-gray-500">{nota.recupFinal !== null && nota.recupFinal > 0 ? nota.recupFinal.toFixed(1) : '-'}</td>
                    <td className="border border-border print:!border-gray-400 px-2 py-2 text-center">
                      <Badge variant="outline" className={getSituacaoColor(nota.situacao)}>{nota.situacao}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Legenda */}
      <Card className="print:shadow-none print:border-none print:bg-transparent print:mt-4">
        <CardContent className="p-6 print:p-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-semibold text-foreground print:!text-black mb-3">Legenda:</h4>
              <ul className="space-y-2 text-muted-foreground print:!text-gray-800">
                <li><strong className="text-foreground print:!text-black">AV1/AV2:</strong> Avaliações 1 e 2</li>
                <li><strong className="text-foreground print:!text-black">REC:</strong> Recuperação do Bimestre</li>
                <li><strong className="text-foreground print:!text-black">MÉD:</strong> Média do Bimestre (AV1 + AV2) ÷ 2</li>
                <li><strong className="text-foreground print:!text-black">Pts Total:</strong> Soma das médias dos 4 bimestres</li>
                <li><strong className="text-foreground print:!text-black">Média Final:</strong> Pts Total ÷ 4</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground print:!text-black mb-3">Critérios de Aprovação:</h4>
              <ul className="space-y-3 text-muted-foreground print:!text-gray-800">
                <li className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span>Média Final ≥ 7.0: Aprovado</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span>Média Final menor que 7.0: Recuperação</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assinaturas e legenda — removidos da tela, vão no PDF gerado */}

    </div>
  );
}