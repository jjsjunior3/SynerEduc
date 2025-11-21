// src/utils/dadosConteudoRealista.ts
// Utilitário para gerar dados realistas do sistema de conteúdo

export interface DadosEstatisticasReais {
  totalConteudos: number;
  conteudosPublicados: number;
  pendentesRevisao: number;
  downloadsTotais: number;
  visualizacoesSemana: number;
  disciplinasAtivas: number;
  seriesAtendidas: number;
  crescimentoSemanal: number;
  ultimaAtualizacao: string;
  detalhamento: {
    conteudosPorSerie: Record<string, number>;
    conteudosPorDisciplina: Record<string, number>;
    downloadsPorMes: number[];
    tendenciaPublicacao: "crescente" | "estavel" | "decrescente";
  };
}

// Tipos equivalentes aos usados no DashboardConteudista
interface DisciplinaConteudo {
  id: string;
  nome: string;
  cor: string;
  icone: string;
  bimestres: {
    id: string;
    numero: number;
    nome: string;
    status: "completo" | "incompleto" | "vazio";
  }[];
  professor?: string;
  totalConteudos: number;
  conteudosPublicados: number;
  ultimaAtualizacao: string;
}

interface SerieEscolarMock {
  id: string;
  nome: string;
  nivel: "fundamental" | "medio";
  disciplinas: DisciplinaConteudo[];
  totalAlunos: number;
  status: "ativa" | "inativa";
}

export class GeradorDadosConteudo {
  private baseData: Date;
  private seed: number;

  constructor() {
    this.baseData = new Date();
    this.seed = Date.now();
  }

  // -----------------------------
  // 🔢 Random com seed
  // -----------------------------
  private random(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }

  // -----------------------------
  // 🌱 Crescimento orgânico
  // -----------------------------
  private calcularCrescimentoOrganico(): number {
    const diasDesdeInicio = Math.floor(
      (this.baseData.getTime() - new Date("2024-01-01").getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const fatorTempo = Math.min(diasDesdeInicio / 365, 1);
    return 1 + fatorTempo * 0.5;
  }

  // -----------------------------
  // 📚 Sazonalidade escolar
  // -----------------------------
  private fatorSazonalidade(): number {
    const mes = this.baseData.getMonth(); // 0-11
    if ((mes >= 1 && mes <= 5) || (mes >= 7 && mes <= 10)) {
      return 1.2;
    }
    return 0.8;
  }

  // -----------------------------
  // ✅ NOVO: gerar séries simuladas
  // -----------------------------
  public gerarSeriesSimuladas(): SerieEscolarMock[] {
    const seriesNomes = [
      { nome: "5º ano - Ensino Fundamental", nivel: "fundamental" as const },
      { nome: "6º ano - Ensino Fundamental", nivel: "fundamental" as const },
      { nome: "7º ano - Ensino Fundamental", nivel: "fundamental" as const },
      { nome: "8º ano - Ensino Fundamental", nivel: "fundamental" as const },
      { nome: "9º ano - Ensino Fundamental", nivel: "fundamental" as const },
      { nome: "1ª série - Ensino Médio", nivel: "medio" as const },
      { nome: "2ª série - Ensino Médio", nivel: "medio" as const },
      { nome: "3ª série - Ensino Médio", nivel: "medio" as const },
    ];

    const disciplinasBase = [
      { nome: "Língua Portuguesa", cor: "#3B82F6", icone: "BookOpen" },
      { nome: "Matemática", cor: "#10B981", icone: "Calculator" },
      { nome: "Ciências", cor: "#8B5CF6", icone: "Flask" },
      { nome: "História", cor: "#F97316", icone: "Scroll" },
      { nome: "Geografia", cor: "#14B8A6", icone: "Globe" },
      { nome: "Inglês", cor: "#6366F1", icone: "Languages" },
    ];

    const bimestresBase = [
      { numero: 1, nome: "1º Bimestre" },
      { numero: 2, nome: "2º Bimestre" },
      { numero: 3, nome: "3º Bimestre" },
      { numero: 4, nome: "4º Bimestre" },
    ];

    const series: SerieEscolarMock[] = seriesNomes.map((serie, idxSerie) => {
      const totalAlunos = 30 + Math.floor(this.random() * 10) * 2; // 30–50

      const disciplinas: DisciplinaConteudo[] = disciplinasBase.map(
        (disciplina, idxDisc) => {
          const totalConteudos = 5 + Math.floor(this.random() * 15); // 5–20
          const conteudosPublicados = Math.floor(
            totalConteudos * (0.6 + this.random() * 0.4) // 60–100%
          );

          const bimestres = bimestresBase.map((b) => {
            const statusRand = this.random();
            let status: "completo" | "incompleto" | "vazio";
            if (statusRand > 0.7) status = "completo";
            else if (statusRand > 0.3) status = "incompleto";
            else status = "vazio";

            return {
              id: `${idxSerie}-${idxDisc}-${b.numero}`,
              numero: b.numero,
              nome: b.nome,
              status,
            };
          });

          return {
            id: `${idxSerie}-${idxDisc}`,
            nome: disciplina.nome,
            cor: disciplina.cor,
            icone: disciplina.icone,
            bimestres,
            professor: "Professor Conteudista",
            totalConteudos,
            conteudosPublicados,
            ultimaAtualizacao: new Date().toISOString(),
          };
        }
      );

      return {
        id: `serie-${idxSerie}`,
        nome: serie.nome,
        nivel: serie.nivel,
        disciplinas,
        totalAlunos,
        status: "ativa",
      };
    });

    return series;
  }

  // -----------------------------
  // Estatísticas baseadas em séries
  // -----------------------------
  public gerarEstatisticasReais(seriesData: any[]): DadosEstatisticasReais {
    const crescimento = this.calcularCrescimentoOrganico();
    const sazonalidade = this.fatorSazonalidade();

    let totalConteudos = 0;
    let conteudosPublicados = 0;
    let disciplinasAtivas = 0;
    let seriesAtivas = 0;
    const conteudosPorSerie: Record<string, number> = {};
    const conteudosPorDisciplina: Record<string, number> = {};

    seriesData.forEach((serie: any) => {
      if (serie.status === "ativa") {
        seriesAtivas++;
        conteudosPorSerie[serie.nome] = 0;
      }

      (serie.disciplinas || []).forEach((disciplina: any) => {
        if (disciplina.totalConteudos > 0) disciplinasAtivas++;
        totalConteudos += disciplina.totalConteudos;
        conteudosPublicados += disciplina.conteudosPublicados;

        conteudosPorSerie[serie.nome] =
          (conteudosPorSerie[serie.nome] || 0) +
          (disciplina.totalConteudos || 0);
        conteudosPorDisciplina[disciplina.nome] =
          (conteudosPorDisciplina[disciplina.nome] || 0) +
          (disciplina.totalConteudos || 0);
      });
    });

    const pendentesRevisao = totalConteudos - conteudosPublicados;

    const baseDownloadsPorConteudo = 45 + this.random() * 30;
    const downloadsTotais = Math.floor(
      conteudosPublicados *
        baseDownloadsPorConteudo *
        crescimento *
        sazonalidade
    );

    const percentualCrescimentoBase = 3 + this.random() * 4; // 3–7%
    const crescimentoSemanal = percentualCrescimentoBase / 100;
    const visualizacoesSemana = Math.floor(
      downloadsTotais * crescimentoSemanal
    );

    const downloadsPorMes = Array.from({ length: 12 }, (_, i) => {
      const mesBase = downloadsTotais / 12;
      const variacao = 1 + (this.random() - 0.5) * 0.4; // ±20%
      const crescimentoMensal = 1 + i * 0.02; // 2% ao mês
      return Math.floor(mesBase * variacao * crescimentoMensal);
    });

    const ultimosTresMeses = downloadsPorMes.slice(-3);
    const primeirosTresMeses = downloadsPorMes.slice(0, 3);
    const mediaRecente =
      ultimosTresMeses.reduce((a, b) => a + b, 0) / 3;
    const mediaAnterior =
      primeirosTresMeses.reduce((a, b) => a + b, 0) / 3;

    let tendenciaPublicacao: "crescente" | "estavel" | "decrescente";
    if (mediaRecente > mediaAnterior * 1.1) {
      tendenciaPublicacao = "crescente";
    } else if (mediaRecente < mediaAnterior * 0.9) {
      tendenciaPublicacao = "decrescente";
    } else {
      tendenciaPublicacao = "estavel";
    }

    return {
      totalConteudos,
      conteudosPublicados,
      pendentesRevisao,
      downloadsTotais,
      visualizacoesSemana,
      disciplinasAtivas,
      seriesAtendidas: seriesAtivas,
      crescimentoSemanal,
      ultimaAtualizacao: new Date().toLocaleString("pt-BR"),
      detalhamento: {
        conteudosPorSerie,
        conteudosPorDisciplina,
        downloadsPorMes,
        tendenciaPublicacao,
      },
    };
  }

  // -----------------------------
  // Pequena variação em tempo real
  // -----------------------------
  public simularVariacaoTempoReal(
    estatisticasBase: DadosEstatisticasReais
  ): DadosEstatisticasReais {
    const variacao = 1 + (this.random() - 0.5) * 0.02; // ±1%
    return {
      ...estatisticasBase,
      downloadsTotais: Math.floor(estatisticasBase.downloadsTotais * variacao),
      visualizacoesSemana: Math.floor(
        estatisticasBase.visualizacoesSemana * variacao
      ),
      ultimaAtualizacao: new Date().toLocaleString("pt-BR"),
    };
  }

  // Dados exemplo fixos (se precisar)
  public gerarDadosExemplo(): DadosEstatisticasReais {
    const agora = new Date();
    const horaAtual = agora.getHours();
    const fatorHorario =
      horaAtual >= 7 && horaAtual <= 17 ? 1.3 : 0.7;

    return {
      totalConteudos: 847,
      conteudosPublicados: 782,
      pendentesRevisao: 65,
      downloadsTotais: Math.floor(2485 * fatorHorario),
      visualizacoesSemana: Math.floor(156 * fatorHorario),
      disciplinasAtivas: 24,
      seriesAtendidas: 8,
      crescimentoSemanal: 0.047,
      ultimaAtualizacao: agora.toLocaleString("pt-BR"),
      detalhamento: {
        conteudosPorSerie: {
          "5º ano - Ensino Fundamental": 89,
          "6º ano - Ensino Fundamental": 142,
          "7º ano - Ensino Fundamental": 168,
          "8º ano - Ensino Fundamental": 156,
          "9º ano - Ensino Fundamental": 134,
          "1ª série - Ensino Médio": 98,
          "2ª série - Ensino Médio": 87,
          "3ª série - Ensino Médio": 65,
        },
        conteudosPorDisciplina: {
          Português: 156,
          Matemática: 142,
          Ciências: 89,
          História: 76,
          Geografia: 68,
          Física: 54,
          Química: 43,
          Biologia: 38,
          Inglês: 34,
          Arte: 28,
          "Educação Física": 22,
        },
        downloadsPorMes: [
          1890, 2120, 2340, 2180, 2450, 2280, 1950, 2380, 2520, 2660, 2485,
          2580,
        ],
        tendenciaPublicacao: "crescente",
      },
    };
  }
}

// Instância global usada no dashboard
export const geradorDados = new GeradorDadosConteudo();
