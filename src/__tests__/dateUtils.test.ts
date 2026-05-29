import { describe, it, expect } from 'vitest';
import {
  toLocalDateString,
  formatarDataCurta,
  parseLocalDate,
  getTodayISO,
  getDiaSemanaDB,
  isDateInCurrentMonth,
  inicioMesAtual,
  fimMesAtual,
} from '@/utils/dateUtils';

describe('toLocalDateString', () => {
  it('converte ISO para DD/MM/YYYY', () => {
    expect(toLocalDateString('2024-03-15')).toBe('15/03/2024');
  });

  it('preserva zeros à esquerda no dia e no mês', () => {
    expect(toLocalDateString('2024-01-05')).toBe('05/01/2024');
  });

  it('funciona com dezembro (mês 12)', () => {
    expect(toLocalDateString('2024-12-31')).toBe('31/12/2024');
  });
});

describe('formatarDataCurta', () => {
  it('retorna DD/MM a partir de data ISO', () => {
    expect(formatarDataCurta('2024-07-20')).toBe('20/07');
  });

  it('preserva zero à esquerda no dia', () => {
    expect(formatarDataCurta('2024-09-04')).toBe('04/09');
  });
});

describe('parseLocalDate', () => {
  it('retorna o ano correto (via UTC)', () => {
    expect(parseLocalDate('2025-06-15').getUTCFullYear()).toBe(2025);
  });

  it('retorna o mês correto — 0-indexed em UTC (junho = 5)', () => {
    expect(parseLocalDate('2025-06-15').getUTCMonth()).toBe(5);
  });

  it('retorna o dia correto sem shift UTC-3', () => {
    // Em UTC-3 a meia-noite UTC viraria dia anterior; noon UTC evita isso
    expect(parseLocalDate('2025-06-15').getUTCDate()).toBe(15);
  });
});

describe('getTodayISO', () => {
  it('retorna string no formato YYYY-MM-DD', () => {
    expect(getTodayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('retorna uma data válida (não NaN)', () => {
    expect(isNaN(Date.parse(getTodayISO()))).toBe(false);
  });
});

describe('getDiaSemanaDB', () => {
  it('retorna um dos 7 nomes válidos do banco', () => {
    const diasValidos = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    expect(diasValidos).toContain(getDiaSemanaDB());
  });
});

describe('isDateInCurrentMonth', () => {
  it('retorna true para hoje', () => {
    expect(isDateInCurrentMonth(getTodayISO())).toBe(true);
  });

  it('retorna false para data de outro século', () => {
    expect(isDateInCurrentMonth('2000-01-01')).toBe(false);
  });
});

describe('inicioMesAtual / fimMesAtual', () => {
  it('inicio termina em -01 (primeiro dia do mês)', () => {
    expect(inicioMesAtual()).toMatch(/-01$/);
  });

  it('fim é igual ou posterior ao inicio', () => {
    expect(fimMesAtual() >= inicioMesAtual()).toBe(true);
  });

  it('inicio e fim pertencem ao mesmo mês', () => {
    const inicio = inicioMesAtual();
    const fim    = fimMesAtual();
    expect(inicio.slice(0, 7)).toBe(fim.slice(0, 7)); // "YYYY-MM"
  });
});
