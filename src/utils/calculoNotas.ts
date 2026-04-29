// src/utils/calculoNotas.ts

export type Segmento = 'ead' | 'presencial';

export interface DadosNota {
  av1?: number | null;
  av2?: number | null;
  av3?: number | null;
  recuperacao?: number | null;
}

export interface ResultadoNota {
  media: number | null;
  mediaFinal: number | null;
  situacao: 'aprovado' | 'recuperacao' | 'reprovado' | null;
}

function getSituacao(media: number): 'aprovado' | 'recuperacao' | 'reprovado' {
  if (media >= 7.0) return 'aprovado';
  if (media >= 5.0) return 'recuperacao';
  return 'reprovado';
}

// EAD: (AV1 + AV2) / 2 — REC substitui a menor nota
function calcularEAD(dados: DadosNota): ResultadoNota {
  const { av1, av2, recuperacao } = dados;
  if (av1 == null || av2 == null)
    return { media: null, mediaFinal: null, situacao: null };

  let nota1 = av1;
  let nota2 = av2;

  if (recuperacao != null && recuperacao > 0) {
    const menor = Math.min(nota1, nota2);
    if (recuperacao > menor) {
      if (nota1 <= nota2) {
        nota1 = recuperacao;
      } else {
        nota2 = recuperacao;
      }
    }
  }

  const media = (av1 + av2) / 2;
  const mediaFinal = (nota1 + nota2) / 2;

  return {
    media: +media.toFixed(1),
    mediaFinal: +mediaFinal.toFixed(1),
    situacao: getSituacao(mediaFinal),
  };
}

// Presencial: (AV1 + AV2 + AV3) / 3 — REC substitui a média diretamente
function calcularPresencial(dados: DadosNota): ResultadoNota {
  const { av1, av2, av3, recuperacao } = dados;
  if (av1 == null || av2 == null || av3 == null)
    return { media: null, mediaFinal: null, situacao: null };

  const media = (av1 + av2 + av3) / 3;
  const mediaFinal = recuperacao != null && recuperacao > media
    ? recuperacao
    : media;

  return {
    media: +media.toFixed(1),
    mediaFinal: +mediaFinal.toFixed(1),
    situacao: getSituacao(mediaFinal),
  };
}

export function calcularNota(dados: DadosNota, segmento: Segmento): ResultadoNota {
  return segmento === 'presencial'
    ? calcularPresencial(dados)
    : calcularEAD(dados);
}