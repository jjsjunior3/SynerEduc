// src/hooks/useAlunosPendencias.ts
//
// FONTE PRINCIPAL: fichas_matricula
// Um aluno existe nesta tela se tem ficha OU se tem usuário no portal.
// Cruza com users para saber se tem acesso ao portal.
// Cruza com contratos para saber se tem contrato.
//
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export interface AlunoComPendencias {
  id: string;           // ficha_id (fonte primária) ou user_id se só tem portal
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

  const refetch = useCallback(() => setVersao(v => v + 1), []);

  useEffect(() => {
    if (!segmentoGestor) return;

    async function carregar() {
      setLoading(true);
      try {

        // ── 1. Fichas do segmento (fonte principal) ─────────────
        let qFichas = supabase
          .from('fichas_matricula')
          .select('id, aluno_id, nome_aluno, serie, segmento, turno, status_matricula, docs_pendentes, tem_acesso_portal')
          .ilike('segmento', segmentoGestor)
          .order('nome_aluno');

        if (busca.trim()) {
          qFichas = qFichas.ilike('nome_aluno', `%${busca.trim()}%`);
        }

        const { data: fichasData, error: fichasError } = await qFichas;
        if (fichasError) throw fichasError;
        const fichas = fichasData ?? [];

        // ── 2. Usuários do portal SEM ficha vinculada ───────────
        // (alunos cadastrados no portal mas sem ficha criada ainda)
        let qUsers = supabase
          .from('users')
          .select('id, nome, email, serie, segmento, turno, status')
          .eq('tipo', 'aluno')
          .eq('segmento', segmentoGestor)
          .order('nome');

        if (busca.trim()) {
          qUsers = qUsers.ilike('nome', `%${busca.trim()}%`);
        }

        const { data: usersData } = await qUsers;
        const users = usersData ?? [];

        // IDs de alunos que JÁ têm ficha vinculada
        const alunoIdsComFicha = new Set(
          fichas.filter(f => f.aluno_id).map(f => f.aluno_id as string)
        );

        // Usuários que não têm ficha — aparecem como "sem ficha"
        const usersSemFicha = users.filter(u => !alunoIdsComFicha.has(u.id));

        // ── 3. Contratos das fichas ──────────────────────────────
        const fichaIds = fichas.map(f => f.id);
        const { data: contratosData } = fichaIds.length > 0
          ? await supabase.from('contratos').select('ficha_id').in('ficha_id', fichaIds)
          : { data: [] };

        const fichasComContrato = new Set((contratosData ?? []).map(c => c.ficha_id));

        // IDs de users reais — só tipo='aluno' do segmento
        const userIdsReais = new Set(users.map(u => u.id));

        // ── 4. Montar lista unificada ────────────────────────────

        // 4a. Alunos COM ficha (independente de ter portal)
        const alunosDeFicha: AlunoComPendencias[] = fichas.map(f => {
          // Fonte de verdade: campo tem_acesso_portal da própria ficha
          // + aluno_id deve existir em users reais (alunos tipo='aluno')
          const userVinculado = f.aluno_id && userIdsReais.has(f.aluno_id)
            ? users.find(u => u.id === f.aluno_id)
            : null;

          // tem portal SOMENTE se a ficha marca como true E o user existe
          const temPortal = f.tem_acesso_portal === true && !!userVinculado;

          return {
            id:               f.id,
            nome:             f.nome_aluno,
            email:            userVinculado?.email ?? null,
            serie:            f.serie,
            segmento:         f.segmento,
            turno:            f.turno,
            status:           f.status_matricula,
            tem_ficha:        true,
            ficha_id:         f.id,
            tem_contrato:     fichasComContrato.has(f.id),
            docs_pendentes:   f.docs_pendentes ?? true,
            tem_acesso_portal: temPortal,
          };
        });

        // 4b. Usuários SEM ficha (existem no portal mas não têm ficha)
        const alunosSemFicha: AlunoComPendencias[] = usersSemFicha.map(u => ({
          id:               u.id,
          nome:             u.nome,
          email:            u.email,
          serie:            u.serie,
          segmento:         u.segmento,
          turno:            u.turno,
          status:           u.status,
          tem_ficha:        false,
          ficha_id:         null,
          tem_contrato:     false,
          docs_pendentes:   true,
          tem_acesso_portal: true,
        }));

        // Unir e ordenar por nome
        const todos: AlunoComPendencias[] = [
          ...alunosDeFicha,
          ...alunosSemFicha,
        ].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

        // ── 5. Resumo ────────────────────────────────────────────
        setResumo({
          sem_ficha:         todos.filter(a => !a.tem_ficha).length,
          sem_contrato:      todos.filter(a => !a.tem_contrato).length,
          docs_pendentes:    todos.filter(a => a.docs_pendentes).length,
          sem_acesso_portal: todos.filter(a => !a.tem_acesso_portal).length,
        });

        // ── 6. Filtro de pendência ───────────────────────────────
        let filtrados = todos;
        if (filtro === 'sem_ficha')         filtrados = todos.filter(a => !a.tem_ficha);
        if (filtro === 'sem_contrato')      filtrados = todos.filter(a => !a.tem_contrato);
        if (filtro === 'docs_pendentes')    filtrados = todos.filter(a => a.docs_pendentes);
        if (filtro === 'sem_acesso_portal') filtrados = todos.filter(a => !a.tem_acesso_portal);

        // ── 7. Paginação ─────────────────────────────────────────
        setTotal(filtrados.length);
        const from = (pagina - 1) * POR_PAGINA;
        setAlunos(filtrados.slice(from, from + POR_PAGINA));

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
    segmentoGestor,
    refetch,
    porPagina: POR_PAGINA,
    // compatibilidade — não usado mas evita quebrar destructuring no dashboard
    filtroSegmento: segmentoGestor,
    setFiltroSegmento: (_: string) => {},
  };
}