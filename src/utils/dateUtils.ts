// src/utils/dateUtils.ts
// Utilitários de data puros — sem dependências de DOM, seguros para unit-test.

const DIAS_SEMANA_DB = [
  'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado',
] as const;

export type DiaSemanaDB = (typeof DIAS_SEMANA_DB)[number];

/**
 * Converte data ISO "YYYY-MM-DD" para "DD/MM/YYYY" (display local, sem shift de fuso).
 */
export function toLocalDateString(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Formato curto "DD/MM" a partir de data ISO "YYYY-MM-DD".
 */
export function formatarDataCurta(isoDate: string): string {
  const [, month, day] = isoDate.split('-');
  return `${day}/${month}`;
}

/**
 * Interpreta data ISO como noon UTC para evitar o bug "1 dia a menos" em UTC-3.
 */
export function parseLocalDate(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00Z`);
}

/**
 * Hoje em formato ISO "YYYY-MM-DD" (fuso local).
 */
export function getTodayISO(): string {
  const now = new Date();
  const year  = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day   = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Nome do dia da semana no formato do banco (ex.: "Segunda").
 */
export function getDiaSemanaDB(): DiaSemanaDB {
  return DIAS_SEMANA_DB[new Date().getDay()];
}

/**
 * True se a data ISO pertence ao mês e ano actuais.
 */
export function isDateInCurrentMonth(isoDate: string): boolean {
  const today = new Date();
  const [year, month] = isoDate.split('-').map(Number);
  return year === today.getFullYear() && month === today.getMonth() + 1;
}

/**
 * Primeiro dia do mês actual em ISO "YYYY-MM-DD".
 */
export function inicioMesAtual(): string {
  const today = new Date();
  const year  = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

/**
 * Último dia do mês actual em ISO "YYYY-MM-DD".
 */
export function fimMesAtual(): string {
  const today   = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const year  = lastDay.getFullYear();
  const month = String(lastDay.getMonth() + 1).padStart(2, '0');
  const day   = String(lastDay.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
