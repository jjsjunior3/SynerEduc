import { describe, it, expect } from 'vitest';
import { calcularNota } from '@/utils/calculoNotas';

// ── EAD ────────────────────────────────────────────────────────────────────────
describe('calcularNota — EAD', () => {
  it('retorna null quando AV1 e AV2 estão ausentes', () => {
    const r = calcularNota({ av1: null, av2: null }, 'ead');
    expect(r.media).toBeNull();
    expect(r.mediaFinal).toBeNull();
    expect(r.situacao).toBeNull();
  });

  it('aprova aluno com média ≥ 7 sem recuperação', () => {
    const r = calcularNota({ av1: 8, av2: 9 }, 'ead');
    expect(r.media).toBe(8.5);
    expect(r.situacao).toBe('aprovado');
  });

  it('reprova aluno com média < 5', () => {
    const r = calcularNota({ av1: 3, av2: 4 }, 'ead');
    expect(r.media).toBe(3.5);
    expect(r.situacao).toBe('reprovado');
  });

  it('coloca em recuperação quando 5 ≤ média < 7', () => {
    // (5 + 7) / 2 = 6
    const r = calcularNota({ av1: 5, av2: 7 }, 'ead');
    expect(r.media).toBe(6);
    expect(r.situacao).toBe('recuperacao');
  });

  it('REC substitui a menor nota e aprova o aluno', () => {
    // AV1=5, AV2=8 → média 6.5 → recuperação
    // REC=9 > AV1(5) → nova AV1=9 → média final (9+8)/2 = 8.5 → aprovado
    const r = calcularNota({ av1: 5, av2: 8, recuperacao: 9 }, 'ead');
    expect(r.media).toBe(6.5);
    expect(r.mediaFinal).toBe(8.5);
    expect(r.situacao).toBe('aprovado');
  });

  it('REC abaixo da menor nota não altera o resultado', () => {
    // AV1=3, AV2=6, REC=2 (não melhora AV1)
    const r = calcularNota({ av1: 3, av2: 6, recuperacao: 2 }, 'ead');
    expect(r.mediaFinal).toBe(4.5);
    expect(r.situacao).toBe('reprovado');
  });

  it('REC exatamente igual à menor nota não substitui (sem benefício)', () => {
    // AV1=5, AV2=8, REC=5 → não substitui → (5+8)/2 = 6.5
    const r = calcularNota({ av1: 5, av2: 8, recuperacao: 5 }, 'ead');
    expect(r.mediaFinal).toBe(6.5);
  });
});

// ── Presencial ─────────────────────────────────────────────────────────────────
describe('calcularNota — Presencial', () => {
  it('aprova com média (AV1+AV2+AV3)/3 ≥ 7', () => {
    const r = calcularNota({ av1: 7, av2: 8, av3: 9 }, 'presencial');
    expect(r.media).toBeCloseTo(8, 1);
    expect(r.situacao).toBe('aprovado');
  });

  it('retorna null quando AV3 está ausente', () => {
    const r = calcularNota({ av1: 8, av2: 9 }, 'presencial');
    expect(r.media).toBeNull();
  });

  it('coloca em recuperação quando 5 ≤ média < 7', () => {
    const r = calcularNota({ av1: 6, av2: 6, av3: 6 }, 'presencial');
    expect(r.media).toBe(6);
    expect(r.situacao).toBe('recuperacao');
  });

  it('REC substitui a média do bimestre diretamente e aprova', () => {
    // AV1=4, AV2=7, AV3=8 → média=6.33, REC=9 → mediaFinal=9
    const r = calcularNota({ av1: 4, av2: 7, av3: 8, recuperacao: 9 }, 'presencial');
    expect(r.mediaFinal).toBeCloseTo(9, 2);
    expect(r.situacao).toBe('aprovado');
  });
});
