// src/hooks/useAlunosPendencias.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export interface AlunoComPendencias {
  id: string;
  nome: string;
  email: string | null;
  serie: string | null;
  segmento: string | null;
  turno: string | null;
  status: string | null;
  // Pendências
  tem_ficha: boolean;
  ficha_id: string | null;
  tem_contrato: boolean;
  docs_pendentes: boolean;
  tem_acesso_portal: boolean;
}

export interface ResumoPendencias {
  sem_ficha: number;
  sem_contrato: number;
  docs_pendentes: number;
  sem_acesso_portal: number;
}

type FiltroPendencia =
  | 'todos'
  | 'sem_ficha'
  | 'sem_contrato'
  | 'docs_pendentes'
  | 'sem_acesso_portal';

const POR_PAGINA = 15;

export function useAlunosPendencias() {
  const { usuario } = useAuth();

  // Segmento fixo do gestor logado — nunca muda durante a sessão
  const segmentoGestor: string = usuario?.segmento ?? 'ead';

  const [alunos, setAlunos]   = useState<AlunoComPendencias[]>([]);
  const [resumo, setResumo]   = useState<ResumoPendencias>({
    sem_ficha: 0, sem_contrato: 0, docs_pendentes: 0, sem_acesso_portal: 0,
  });
  const [loading, setLoading] = useState(true);
  const [total, setTotal]     = useState(0);
  const [pagina, setPagina]   = useState(1);
  const [busca, setBusca]     = useState('');
  const [filtro, setFiltro]   = useState<FiltroPendencia>('todos');
  const [versao, setVersao]   = useState(0);

  // ── Nota: filtroSegmento é removido da interface pública ──
  // O gestor só vê seu próprio segmento — sem opção de trocar.

  const refetch = useCallback(() => setVersao(v => v + 1), []);

  useEffect(() => {
    if (!segmentoGestor) return;

    async function carregar() {
      setLoading(true);
      try {
        // 1. Buscar alunos APENAS do segmento do gestor
        let queryAlunos = supabase
          .from('users')
          .select('id, nome, email, serie, segmento, turno, status')
          .eq('tipo', 'aluno')
          .eq('segmento', segmentoGestor)   // ← filtro fixo
          .order('nome');

        if (busca.trim()) {
          queryAlunos = queryAlunos.ilike('nome', `%${busca.trim()}%`);
        }

        const { data: alunosData, error: alunosError } = await queryAlunos;
        if (alunosError) throw alunosError;

        const todosAlunos = alunosData ?? [];
        const ids = todosAlunos.map(a => a.id);

        if (ids.length === 0) {
          setAlunos([]);
          setTotal(0);
          setResumo({ sem_ficha: 0, sem_contrato: 0, docs_pendentes: 0, sem_acesso_portal: 0 });
          return;
        }

        // 2. Fichas vinculadas a esses alunos
        const { data: fichasData } = await supabase
          .from('fichas_matricula')
          .select('id, aluno_id, docs_pendentes')
          .in('aluno_id', ids);

        // 3. Fichas ativas SEM aluno_id, do segmento do gestor
        const { data: fichasSemPortal } = await supabase
          .from('fichas_matricula')
          .select('id')
          .is('aluno_id', null)
          .eq('status_matricula', 'ativa')
          .eq('segmento', segmentoGestor);   // ← só fichas do segmento

        // 4. Contratos
        const fichaIds = (fichasData ?? []).map(f => f.id);
        const { data: contratosData } = fichaIds.length > 0
          ? await supabase.from('contratos').select('ficha_id').in('ficha_id', fichaIds)
          : { data: [] };

        // 5. Montar mapa ficha por aluno
        const fichasPorAluno = new Map<string, { id: string; docs_pendentes: boolean }>();
        for (const f of fichasData ?? []) {
          if (f.aluno_id) {
            fichasPorAluno.set(f.aluno_id, { id: f.id, docs_pendentes: f.docs_pendentes });
          }
        }

        const fichasComContrato = new Set((contratosData ?? []).map(c => c.ficha_id));

        // 6. Combinar dados
        const alunosComStatus: AlunoComPendencias[] = todosAlunos.map(a => {
          const ficha        = fichasPorAluno.get(a.id);
          const tem_ficha    = !!ficha;
          const ficha_id     = ficha?.id ?? null;
          const tem_contrato = ficha_id ? fichasComContrato.has(ficha_id) : false;
          const docs_pendentes = ficha ? ficha.docs_pendentes : true;

          return {
            ...a,
            tem_ficha,
            ficha_id,
            tem_contrato,
            docs_pendentes: tem_ficha ? docs_pendentes : true,
            tem_acesso_portal: true, // existe em users = tem acesso
          };
        });

        // 7. Aplicar filtro de pendência
        let alunosFiltrados = alunosComStatus;
        if (filtro === 'sem_ficha')      alunosFiltrados = alunosComStatus.filter(a => !a.tem_ficha);
        if (filtro === 'sem_contrato')   alunosFiltrados = alunosComStatus.filter(a => !a.tem_contrato);
        if (filtro === 'docs_pendentes') alunosFiltrados = alunosComStatus.filter(a => a.docs_pendentes);

        // 8. Resumo
        setResumo({
          sem_ficha:         alunosComStatus.filter(a => !a.tem_ficha).length,
          sem_contrato:      alunosComStatus.filter(a => !a.tem_contrato).length,
          docs_pendentes:    alunosComStatus.filter(a => a.docs_pendentes).length,
          sem_acesso_portal: (fichasSemPortal ?? []).length,
        });

        // 9. Paginação client-side
        setTotal(alunosFiltrados.length);
        const from = (pagina - 1) * POR_PAGINA;
        setAlunos(alunosFiltrados.slice(from, from + POR_PAGINA));

      } catch (e: any) {
        console.error('Erro ao carregar alunos com pendências:', e.message);
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, [busca, filtro, pagina, versao, segmentoGestor]);

  useEffect(() => { setPagina(1); }, [busca, filtro]);

  return {
    alunos, resumo, loading, total,
    pagina, setPagina,
    busca, setBusca,
    filtro, setFiltro,
    segmentoGestor,          // exposto para o dashboard exibir o label correto
    refetch,
    porPagina: POR_PAGINA,
  };
}