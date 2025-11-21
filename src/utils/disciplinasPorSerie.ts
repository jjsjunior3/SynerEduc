import { SerieEscolar } from '../types/auth';
import { projectId, publicAnonKey } from './supabase/info';

export interface DisciplinaConfig {
  id: string;
  nome: string;
  professor: string;
  cor: string;
  icone: string;
  progresso: number;
  proximaAula?: string;
  serie: string;
  temConteudo: boolean;
  totalBimestres?: number;
  bimestresComConteudo?: number;
}

// Cache para evitar múltiplas requisições
let disciplinasCache: DisciplinaConfig[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export async function getDisciplinasPorSerie(serie: SerieEscolar): Promise<DisciplinaConfig[]> {
  try {
    console.log(`[DISCIPLINAS] Iniciando busca de disciplinas para série: "${serie}"`);
    
    // Validação de entrada
    if (!serie || typeof serie !== 'string' || serie.trim() === '') {
      console.warn('[DISCIPLINAS] Série inválida fornecida, usando padrão');
      serie = '3ª série - Ensino Médio' as SerieEscolar;
    }
    
    // Limpar cache para sempre buscar dados atualizados
    clearCache();
    
    // Buscar disciplinas do servidor
    console.log(`[DISCIPLINAS] Fazendo requisição para: https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/disciplinas`);
    
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c61d1ad0/disciplinas`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`[DISCIPLINAS] Status da resposta: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      console.error('[DISCIPLINAS] Erro na requisição:', response.status, response.statusText);
      
      // Log do body do erro para debug
      try {
        const errorText = await response.text();
        console.error('[DISCIPLINAS] Corpo do erro:', errorText);
      } catch (e) {
        console.error('[DISCIPLINAS] Não foi possível ler o corpo do erro:', e);
      }
      
      return gerarDisciplinasPadrao(serie);
    }

    const data = await response.json();
    console.log('[DISCIPLINAS] Dados recebidos da API:', data);
    console.log('[DISCIPLINAS] Estrutura da resposta:', {
      success: data.success,
      hasDisciplinas: !!data.disciplinas,
      hasDisciplinasPorSerie: !!data.disciplinasPorSerie,
      totalDisciplinas: data.totalDisciplinas,
      seriesDisponiveis: data.seriesDisponiveis
    });
    
    if (!data || (!data.disciplinas && !data.disciplinasPorSerie)) {
      console.warn('[DISCIPLINAS] Resposta da API não contém disciplinas, usando padrão');
      console.warn('[DISCIPLINAS] Estrutura da resposta:', Object.keys(data || {}));
      return gerarDisciplinasPadrao(serie);
    }
    
    // A nova API retorna disciplinasPorSerie, mas mantemos compatibilidade com disciplinas
    let disciplinas = [];
    
    if (data.disciplinasPorSerie) {
      console.log('[DISCIPLINAS] Usando disciplinasPorSerie da nova API');
      
      // Normalizar a série e buscar disciplinas específicas
      const serieNormalizada = normalizarSerie(serie);
      disciplinas = data.disciplinasPorSerie[serieNormalizada] || [];
      
      console.log(`[DISCIPLINAS] Encontradas ${disciplinas.length} disciplinas para série "${serieNormalizada}"`);
      
      // Se não encontrou para a série específica, tentar buscar na lista geral
      if (disciplinas.length === 0 && data.disciplinas) {
        console.log('[DISCIPLINAS] Fallback para lista geral de disciplinas');
        disciplinas = Array.isArray(data.disciplinas) ? data.disciplinas : [];
      }
    } else if (data.disciplinas) {
      console.log('[DISCIPLINAS] Usando lista geral de disciplinas (API antiga)');
      disciplinas = Array.isArray(data.disciplinas) ? data.disciplinas : [];
    }

    // Atualizar cache
    disciplinasCache = disciplinas;
    cacheTimestamp = Date.now();

    // Normalizar a série do usuário e filtrar
    const serieNormalizada = normalizarSerie(serie);
    console.log(`[DISCIPLINAS] Buscando disciplinas para série: "${serie}" -> normalizada: "${serieNormalizada}"`);
    
    // Se já recebemos disciplinas filtradas por série da nova API, não filtrar novamente
    if (data.disciplinasPorSerie) {
      console.log(`[DISCIPLINAS] Disciplinas já filtradas pela API, retornando ${disciplinas.length} disciplinas`);
      
      if (disciplinas.length === 0) {
        console.warn('[DISCIPLINAS] Nenhuma disciplina encontrada na série específica, usando padrão');
        return gerarDisciplinasPadrao(serie);
      }
      
      console.log(`[DISCIPLINAS] Disciplinas encontradas:`, disciplinas.map(d => `${d.nome} (${d.progresso}% - ${d.temConteudo ? 'com conteúdo' : 'sem conteúdo'})`));
      return disciplinas;
    }
    
    // Para compatibilidade com API antiga, filtrar por série
    const disciplinasFiltradas = disciplinas.filter((d: DisciplinaConfig) => {
      // Verificação de segurança para cada disciplina
      if (!d || typeof d !== 'object') {
        console.warn('[DISCIPLINAS] Disciplina inválida encontrada (null/undefined/not object):', d);
        return false;
      }
      
      // Verificar se tem propriedades essenciais
      if (!d.nome || !d.serie || !d.id) {
        console.warn('[DISCIPLINAS] Disciplina inválida encontrada (faltam propriedades essenciais):', {
          nome: d.nome,
          serie: d.serie,
          id: d.id,
          disciplina_completa: d
        });
        return false;
      }
      
      // Verificar se a série corresponde
      const match = d.serie === serieNormalizada;
      if (!match) {
        console.log('[DISCIPLINAS] Disciplina não corresponde à série:', {
          disciplina_serie: d.serie,
          serie_procurada: serieNormalizada,
          disciplina_nome: d.nome
        });
      }
      
      return match;
    });
    
    console.log(`[DISCIPLINAS] Encontradas ${disciplinasFiltradas.length} disciplinas para a série ${serieNormalizada}`);
    
    if (disciplinasFiltradas.length === 0) {
      console.warn('[DISCIPLINAS] Nenhuma disciplina encontrada, usando padrão');
      return gerarDisciplinasPadrao(serie);
    }
    
    console.log(`[DISCIPLINAS] Disciplinas encontradas:`, disciplinasFiltradas.map(d => `${d.nome} (${d.progresso}% - ${d.temConteudo ? 'com conteúdo' : 'sem conteúdo'})`));
    
    return disciplinasFiltradas;
  } catch (error) {
    console.error('[DISCIPLINAS] Erro ao buscar disciplinas:', error);
    
    // Log detalhado do erro para debugging
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('[DISCIPLINAS] Erro de rede - servidor pode estar indisponível');
    } else if (error instanceof SyntaxError) {
      console.error('[DISCIPLINAS] Erro de parsing JSON - resposta inválida do servidor');
    } else {
      console.error('[DISCIPLINAS] Erro desconhecido:', error.name, error.message);
    }
    
    console.warn('[DISCIPLINAS] Usando disciplinas padrão devido ao erro');
    return gerarDisciplinasPadrao(serie);
  }
}

// Função para normalizar a série (converter do formato frontend para backend)
function normalizarSerie(serie: SerieEscolar): string {
  // Converter formato frontend para formato backend
  const mapeamento: { [key: string]: string } = {
    '5º ano - Ensino Fundamental': '5º ano',
    '6º ano - Ensino Fundamental': '6º ano',
    '7º ano - Ensino Fundamental': '7º ano',
    '8º ano - Ensino Fundamental': '8º ano',
    '9º ano - Ensino Fundamental': '9º ano',
    '1ª série - Ensino Médio': '1ª série',
    '2ª série - Ensino Médio': '2ª série',
    '3ª série - Ensino Médio': '3ª série'
  };
  
  return mapeamento[serie] || serie;
}

// Função para gerar disciplinas padrão quando a API falha
function gerarDisciplinasPadrao(serie: SerieEscolar): DisciplinaConfig[] {
  console.warn(`[DISCIPLINAS] ⚠️  GERANDO DISCIPLINAS PADRÃO ⚠️`);
  console.warn(`[DISCIPLINAS] Série: ${serie}`);
  console.warn(`[DISCIPLINAS] Motivo: API indisponível ou sem conteúdo na série`);
  console.warn(`[DISCIPLINAS] Estas são disciplinas SIMULADAS para manter o sistema funcionando`);
  console.warn(`[DISCIPLINAS] SOLUÇÃO: Administradores podem criar conteúdo demo no painel administrativo`);
  
  const disciplinasPadrao: DisciplinaConfig[] = [
    {
      id: 'mat_' + serie.replace(/\s/g, '_'),
      nome: 'Matemática',
      professor: 'Prof. Maria Silva',
      cor: 'bg-blue-200',
      icone: '📐',
      progresso: 75,
      proximaAula: 'Segunda 08:00',
      serie: normalizarSerie(serie),
      temConteudo: true,
      totalBimestres: 4,
      bimestresComConteudo: 3
    },
    {
      id: 'port_' + serie.replace(/\s/g, '_'),
      nome: 'Português',
      professor: 'Prof. João Santos',
      cor: 'bg-green-200',
      icone: '📚',
      progresso: 80,
      proximaAula: 'Terça 10:00',
      serie: normalizarSerie(serie),
      temConteudo: true,
      totalBimestres: 4,
      bimestresComConteudo: 4
    },
    {
      id: 'hist_' + serie.replace(/\s/g, '_'),
      nome: 'História',
      professor: 'Prof. Ana Costa',
      cor: 'bg-yellow-200',
      icone: '🏛️',
      progresso: 60,
      proximaAula: 'Quarta 14:00',
      serie: normalizarSerie(serie),
      temConteudo: true,
      totalBimestres: 4,
      bimestresComConteudo: 2
    },
    {
      id: 'geo_' + serie.replace(/\s/g, '_'),
      nome: 'Geografia',
      professor: 'Prof. Carlos Lima',
      cor: 'bg-purple-200',
      icone: '🌍',
      progresso: 70,
      proximaAula: 'Quinta 16:00',
      serie: normalizarSerie(serie),
      temConteudo: true,
      totalBimestres: 4,
      bimestresComConteudo: 3
    },
    {
      id: 'bio_' + serie.replace(/\s/g, '_'),
      nome: 'Biologia',
      professor: 'Prof. Rita Oliveira',
      cor: 'bg-red-200',
      icone: '🧬',
      progresso: 85,
      proximaAula: 'Sexta 08:00',
      serie: normalizarSerie(serie),
      temConteudo: true,
      totalBimestres: 4,
      bimestresComConteudo: 4
    }
  ];

  console.log(`[DISCIPLINAS] ${disciplinasPadrao.length} disciplinas padrão geradas`);
  return disciplinasPadrao;
}

// Função para limpar cache (útil para refresh)
export function clearCache() {
  disciplinasCache = null;
  cacheTimestamp = 0;
}