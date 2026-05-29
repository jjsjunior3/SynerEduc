// src/utils/serieUtils.ts
// Utilitários de séries — filtragem e ordenação sem DOM, seguros para unit-test.

export interface SerieItem {
  id: string;
  nome: string;
  segmento: 'ead' | 'presencial';
  ativo: boolean;
}

/** Filtra séries pelo segmento. */
export function filterSeriesBySegmento(
  series: SerieItem[],
  segmento: 'ead' | 'presencial',
): SerieItem[] {
  return series.filter(s => s.segmento === segmento);
}

/** Mantém apenas séries ativas. */
export function filterSeriesAtivas(series: SerieItem[]): SerieItem[] {
  return series.filter(s => s.ativo);
}

/** Ordena série alfabeticamente pelo nome (locale pt-BR). */
export function sortSeriesByNome(series: SerieItem[]): SerieItem[] {
  return [...series].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

/**
 * Canônico: filtra por segmento → mantém ativas → ordena por nome.
 * Use este helper em qualquer lugar que precise listar séries para um segmento.
 */
export function getSeriesParaSegmento(
  series: SerieItem[],
  segmento: 'ead' | 'presencial',
): SerieItem[] {
  return sortSeriesByNome(filterSeriesAtivas(filterSeriesBySegmento(series, segmento)));
}

/**
 * Abreviação para espaços apertados.
 * "5º ano - Ensino Fundamental" → "5ºano"
 * "1ª série - Ensino Médio"     → "1ªsérie"
 * Outros nomes sem " - "        → primeiros 10 caracteres
 */
export function serieNomeAbrev(nome: string): string {
  const match = nome.match(/^(\S+\s+\S+)\s+-/);
  if (match) return match[1].replace(/\s+/g, '');
  return nome.slice(0, 10);
}
