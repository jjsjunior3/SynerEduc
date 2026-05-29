import { describe, it, expect } from 'vitest';
import {
  filterSeriesBySegmento,
  filterSeriesAtivas,
  sortSeriesByNome,
  getSeriesParaSegmento,
  serieNomeAbrev,
  type SerieItem,
} from '@/utils/serieUtils';

const MOCK: SerieItem[] = [
  { id: '1', nome: '9º ano - Ensino Fundamental', segmento: 'ead',        ativo: true  },
  { id: '2', nome: '8º ano - Ensino Fundamental', segmento: 'ead',        ativo: false },
  { id: '3', nome: '1ª série - Ensino Médio',     segmento: 'ead',        ativo: true  },
  { id: '4', nome: '5º ano - Ensino Fundamental', segmento: 'presencial', ativo: true  },
  { id: '5', nome: '6º ano - Ensino Fundamental', segmento: 'presencial', ativo: true  },
];

describe('filterSeriesBySegmento', () => {
  it('retorna somente séries EAD', () => {
    const res = filterSeriesBySegmento(MOCK, 'ead');
    expect(res).toHaveLength(3);
    res.forEach(s => expect(s.segmento).toBe('ead'));
  });

  it('retorna somente séries presenciais', () => {
    const res = filterSeriesBySegmento(MOCK, 'presencial');
    expect(res).toHaveLength(2);
    res.forEach(s => expect(s.segmento).toBe('presencial'));
  });

  it('retorna array vazio para segmento sem séries', () => {
    const res = filterSeriesBySegmento([], 'ead');
    expect(res).toHaveLength(0);
  });
});

describe('filterSeriesAtivas', () => {
  it('exclui séries inativas', () => {
    const res = filterSeriesAtivas(MOCK);
    expect(res.find(s => s.id === '2')).toBeUndefined();
  });

  it('retém a quantidade correta de séries ativas', () => {
    expect(filterSeriesAtivas(MOCK)).toHaveLength(4);
  });
});

describe('sortSeriesByNome', () => {
  it('ordena em ordem alfabética (pt-BR)', () => {
    const nomes = sortSeriesByNome(MOCK).map(s => s.nome);
    for (let i = 0; i < nomes.length - 1; i++) {
      expect(nomes[i].localeCompare(nomes[i + 1], 'pt-BR')).toBeLessThanOrEqual(0);
    }
  });

  it('não muta o array original', () => {
    const original = [...MOCK];
    sortSeriesByNome(MOCK);
    expect(MOCK.map(s => s.id)).toEqual(original.map(s => s.id));
  });
});

describe('getSeriesParaSegmento', () => {
  it('EAD retorna 2 séries (exclui inativa id=2)', () => {
    const res = getSeriesParaSegmento(MOCK, 'ead');
    expect(res).toHaveLength(2);
  });

  it('todas as retornadas são EAD e ativas', () => {
    const res = getSeriesParaSegmento(MOCK, 'ead');
    res.forEach(s => {
      expect(s.segmento).toBe('ead');
      expect(s.ativo).toBe(true);
    });
  });

  it('resultado está em ordem alfabética', () => {
    const nomes = getSeriesParaSegmento(MOCK, 'presencial').map(s => s.nome);
    for (let i = 0; i < nomes.length - 1; i++) {
      expect(nomes[i].localeCompare(nomes[i + 1], 'pt-BR')).toBeLessThanOrEqual(0);
    }
  });
});

describe('serieNomeAbrev', () => {
  it('abrevia nome do Fundamental corretamente', () => {
    expect(serieNomeAbrev('5º ano - Ensino Fundamental')).toBe('5ºano');
  });

  it('abrevia nome do Ensino Médio corretamente', () => {
    expect(serieNomeAbrev('1ª série - Ensino Médio')).toBe('1ªsérie');
  });

  it('trunca nomes sem padrão " - " nos 10 primeiros chars', () => {
    expect(serieNomeAbrev('Outro Curso Livre')).toBe('Outro Curs');
  });
});
