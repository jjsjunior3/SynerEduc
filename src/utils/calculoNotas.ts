// src/utils/calculoNotas.ts

export type Segmento = 'ead' | 'presencial';

export interface DadosNota {
  av1?: number | null;
  av2?: number | null;
  av3?: number | null;        // usado apenas no presencial
  recuperacao?: number | null;
}

export interface ResultadoNota {
  media: number | null;       // média SEM recuperação (exibição intermediária)
  mediaFinal: number | null;  // média COM recuperação aplicada (situação real)
  situacao: 'aprovado' | 'recuperacao' | 'reprovado' | null;
}

// ── Situação SEM recuperação ──────────────────────────────────────────────────
// média ≥ 7 → aprovado | entre 5 e 6.9 → recuperação | < 5 → reprovado
function getSituacaoSemRec(media: number): 'aprovado' | 'recuperacao' | 'reprovado' {
  if (media >= 7.0) return 'aprovado';
  if (media >= 5.0) return 'recuperacao';
  return 'reprovado';
}

// ── Situação COM recuperação já aplicada ──────────────────────────────────────
// Após REC só existe aprovado ou reprovado — não há nova recuperação
function getSituacaoComRec(mediaFinal: number): 'aprovado' | 'reprovado' {
  return mediaFinal >= 7.0 ? 'aprovado' : 'reprovado';
}

// ── EAD: (AV1 + AV2) / 2 ─────────────────────────────────────────────────────
// Regras:
//   1. Média = (AV1 + AV2) / 2
//   2. Se média < 7 → aluno vai para recuperação
//   3. REC substitui a MENOR entre AV1 e AV2 (somente se REC > menor nota)
//   4. Média final = (nova_AV1 + nova_AV2) / 2
//   5. Situação pós-REC: ≥ 7 aprovado, < 7 reprovado (sem nova recuperação)
function calcularEAD(dados: DadosNota): ResultadoNota {
  const { av1, av2, recuperacao } = dados;

  // Sem AV1 e AV2 não há como calcular
  if (av1 == null || av2 == null) {
    return { media: null, mediaFinal: null, situacao: null };
  }

  // Média original (sem REC)
  const media = (av1 + av2) / 2;

  // Verifica se há REC para aplicar
  const temRec = recuperacao != null && recuperacao > 0;

  if (!temRec) {
    // Sem recuperação: situação normal (pode ser 'recuperacao' se 5 ≤ média < 7)
    return {
      media:      +media.toFixed(2),
      mediaFinal: +media.toFixed(2),
      situacao:   getSituacaoSemRec(media),
    };
  }

  // Com recuperação: substitui a menor nota SOMENTE se REC > menor nota
  let nota1 = av1;
  let nota2 = av2;
  const rec = recuperacao!;

  const menorNota = Math.min(nota1, nota2);

  if (rec > menorNota) {
    // Substitui a menor
    if (av1 <= av2) {
      nota1 = rec;
    } else {
      nota2 = rec;
    }
  }
  // Se REC ≤ menor nota, as notas originais permanecem (REC não ajudou)

  const mediaFinal = (nota1 + nota2) / 2;

  return {
    media:      +media.toFixed(2),     // média original para exibição
    mediaFinal: +mediaFinal.toFixed(2), // média com REC aplicada
    situacao:   getSituacaoComRec(mediaFinal),
  };
}

// ── Presencial: (AV1 + AV2 + AV3) / 3 ───────────────────────────────────────
// Regras:
//   1. Média = (AV1 + AV2 + AV3) / 3
//   2. REC substitui a média diretamente (media_final = REC)
//   3. Situação pós-REC: ≥ 7 aprovado, < 7 reprovado
function calcularPresencial(dados: DadosNota): ResultadoNota {
  const { av1, av2, av3, recuperacao } = dados;

  if (av1 == null || av2 == null || av3 == null) {
    return { media: null, mediaFinal: null, situacao: null };
  }

  const media = (av1 + av2 + av3) / 3;
  const temRec = recuperacao != null && recuperacao > 0;

  if (!temRec) {
    return {
      media:      +media.toFixed(2),
      mediaFinal: +media.toFixed(2),
      situacao:   getSituacaoSemRec(media),
    };
  }

  // REC substitui a média do bimestre diretamente
  const mediaFinal = recuperacao!;

  return {
    media:      +media.toFixed(2),
    mediaFinal: +mediaFinal.toFixed(2),
    situacao:   getSituacaoComRec(mediaFinal),
  };
}

// ── Exportação principal ──────────────────────────────────────────────────────
export function calcularNota(dados: DadosNota, segmento: Segmento): ResultadoNota {
  return segmento === 'presencial'
    ? calcularPresencial(dados)
    : calcularEAD(dados);
}