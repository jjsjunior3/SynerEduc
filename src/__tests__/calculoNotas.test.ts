import { describe, it, expect } from 'vitest';
import { calcularNota } from '@/utils/calculoNotas';

// ── EAD ────────────────────────────────────────────────────────────────────────
describe('calcularNota — EAD', () => {

  // ── Casos básicos ────────────────────────────────────────────────────────────

  it('retorna null quando AV1 e AV2 estão ausentes', () => {
    const r = calcularNota({ av1: null, av2: null }, 'ead');
    expect(r.media).toBeNull();
    expect(r.mediaFinal).toBeNull();
    expect(r.situacao).toBeNull();
  });

  it('retorna null quando apenas AV1 está ausente', () => {
    const r = calcularNota({ av1: null, av2: 8 }, 'ead');
    expect(r.media).toBeNull();
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

  // ── Casos de borda — limites exatos ─────────────────────────────────────────

  it('média exatamente 7.0 → aprovado (limite inferior da aprovação)', () => {
    // (7 + 7) / 2 = 7.0 → deve aprovar, não colocar em recuperação
    const r = calcularNota({ av1: 7, av2: 7 }, 'ead');
    expect(r.media).toBe(7);
    expect(r.situacao).toBe('aprovado');
  });

  it('média exatamente 5.0 → recuperação (limite inferior da recuperação)', () => {
    // (4 + 6) / 2 = 5.0 → recuperação, não reprovado
    const r = calcularNota({ av1: 4, av2: 6 }, 'ead');
    expect(r.media).toBe(5);
    expect(r.situacao).toBe('recuperacao');
  });

  it('média 6.9 → recuperação (abaixo do limite de aprovação)', () => {
    // (6.8 + 7.0) / 2 = 6.9
    const r = calcularNota({ av1: 6.8, av2: 7 }, 'ead');
    expect(r.media).toBeCloseTo(6.9, 1);
    expect(r.situacao).toBe('recuperacao');
  });

  it('média 4.9 → reprovado (abaixo do limite de recuperação)', () => {
    // (4 + 5.8) / 2 = 4.9
    const r = calcularNota({ av1: 4, av2: 5.8 }, 'ead');
    expect(r.media).toBeCloseTo(4.9, 1);
    expect(r.situacao).toBe('reprovado');
  });

  // ── Nota zero — zero é nota válida, diferente de null ───────────────────────

  it('AV1 = 0 é nota válida e calcula normalmente', () => {
    // zero ≠ null — aluno recebeu nota zero
    const r = calcularNota({ av1: 0, av2: 0 }, 'ead');
    expect(r.media).toBe(0);
    expect(r.situacao).toBe('reprovado');
  });

  it('AV1 = 0, AV2 = 10 → média 5.0 → recuperação', () => {
    const r = calcularNota({ av1: 0, av2: 10 }, 'ead');
    expect(r.media).toBe(5);
    expect(r.situacao).toBe('recuperacao');
  });

  // ── REC — só substitui se for maior que a menor nota ────────────────────────

  it('REC substitui a menor nota e aprova o aluno', () => {
    // AV1=5, AV2=8 → média 6.5 → recuperação
    // REC=9 > AV1(5) → nova AV1=9 → média final (9+8)/2 = 8.5 → aprovado
    const r = calcularNota({ av1: 5, av2: 8, recuperacao: 9 }, 'ead');
    expect(r.media).toBe(6.5);
    expect(r.mediaFinal).toBe(8.5);
    expect(r.situacao).toBe('aprovado');
  });

  it('REC abaixo da menor nota não altera o resultado', () => {
    // AV1=3, AV2=6, REC=2 — REC(2) < AV1(3), não substitui
    const r = calcularNota({ av1: 3, av2: 6, recuperacao: 2 }, 'ead');
    expect(r.mediaFinal).toBe(4.5);
    expect(r.situacao).toBe('reprovado');
  });

  it('REC exatamente igual à menor nota não substitui — fase de recuperação encerrada → reprovado', () => {
    // AV1=5, AV2=8, REC=5 → REC não é maior que AV1 → media permanece 6.5
    // Como o professor já lançou o REC, a recuperação está encerrada → reprovado
    const r = calcularNota({ av1: 5, av2: 8, recuperacao: 5 }, 'ead');
    expect(r.mediaFinal).toBe(6.5);
    expect(r.situacao).toBe('reprovado');
  });

  it('REC = 0 não substitui nada (equivale a não ter feito recuperação)', () => {
    // AV1=5, AV2=6 → média 5.5 → recuperação
    // REC=0 não é maior que nenhuma nota → não altera resultado
    const r = calcularNota({ av1: 5, av2: 6, recuperacao: 0 }, 'ead');
    expect(r.mediaFinal).toBe(5.5);
    expect(r.situacao).toBe('recuperacao');
  });

  it('REC = null é tratado como ausente — sem substituição', () => {
    const r = calcularNota({ av1: 5, av2: 6, recuperacao: null }, 'ead');
    expect(r.mediaFinal).toBe(5.5);
    expect(r.situacao).toBe('recuperacao');
  });
});

// ── Presencial ─────────────────────────────────────────────────────────────────
describe('calcularNota — Presencial', () => {

  // ── Casos básicos ────────────────────────────────────────────────────────────

  it('retorna null quando AV3 está ausente', () => {
    const r = calcularNota({ av1: 8, av2: 9 }, 'presencial');
    expect(r.media).toBeNull();
    expect(r.situacao).toBeNull();
  });

  it('retorna null quando AV1 está ausente', () => {
    const r = calcularNota({ av1: null, av2: 8, av3: 9 }, 'presencial');
    expect(r.media).toBeNull();
  });

  it('aprova com média (AV1+AV2+AV3)/3 ≥ 7', () => {
    // (7 + 8 + 9) / 3 = 8.0
    const r = calcularNota({ av1: 7, av2: 8, av3: 9 }, 'presencial');
    expect(r.media).toBeCloseTo(8, 1);
    expect(r.situacao).toBe('aprovado');
  });

  it('reprova com média < 5', () => {
    const r = calcularNota({ av1: 2, av2: 3, av3: 4 }, 'presencial');
    expect(r.media).toBe(3);
    expect(r.situacao).toBe('reprovado');
  });

  it('coloca em recuperação quando 5 ≤ média < 7', () => {
    const r = calcularNota({ av1: 6, av2: 6, av3: 6 }, 'presencial');
    expect(r.media).toBe(6);
    expect(r.situacao).toBe('recuperacao');
  });

  // ── Casos de borda — limites exatos ─────────────────────────────────────────

  it('média exatamente 7.0 → aprovado', () => {
    // (7 + 7 + 7) / 3 = 7.0 → deve aprovar
    const r = calcularNota({ av1: 7, av2: 7, av3: 7 }, 'presencial');
    expect(r.media).toBe(7);
    expect(r.situacao).toBe('aprovado');
  });

  it('média exatamente 5.0 → recuperação', () => {
    const r = calcularNota({ av1: 5, av2: 5, av3: 5 }, 'presencial');
    expect(r.media).toBe(5);
    expect(r.situacao).toBe('recuperacao');
  });

  // ── Nota zero — zero é nota válida ───────────────────────────────────────────

  it('AV1 = AV2 = AV3 = 0 é válido → média 0 → reprovado', () => {
    const r = calcularNota({ av1: 0, av2: 0, av3: 0 }, 'presencial');
    expect(r.media).toBe(0);
    expect(r.situacao).toBe('reprovado');
  });

  it('AV1 = 0, AV2 = 10, AV3 = 5 → média 5.0 → recuperação', () => {
    // (0 + 10 + 5) / 3 = 5.0
    const r = calcularNota({ av1: 0, av2: 10, av3: 5 }, 'presencial');
    expect(r.media).toBe(5);
    expect(r.situacao).toBe('recuperacao');
  });

  // ── REC — substitui a média diretamente ─────────────────────────────────────

  it('REC substitui a média do bimestre diretamente e aprova', () => {
    // (4 + 7 + 8) / 3 = 6.33 → recuperação; REC=9 → mediaFinal=9 → aprovado
    const r = calcularNota({ av1: 4, av2: 7, av3: 8, recuperacao: 9 }, 'presencial');
    expect(r.mediaFinal).toBeCloseTo(9, 2);
    expect(r.situacao).toBe('aprovado');
  });

  it('REC abaixo de 7 → reprovado mesmo com recuperação feita', () => {
    // (4 + 4 + 4) / 3 = 4.0 → recuperação; REC=6 → mediaFinal=6 → reprovado
    const r = calcularNota({ av1: 4, av2: 4, av3: 4, recuperacao: 6 }, 'presencial');
    expect(r.mediaFinal).toBe(6);
    expect(r.situacao).toBe('reprovado');
  });

  it('REC = 0 não substitui — mantém a média original', () => {
    // (6 + 6 + 6) / 3 = 6.0 → recuperação; REC=0 → tratado como ausente → mantém 6.0
    const r = calcularNota({ av1: 6, av2: 6, av3: 6, recuperacao: 0 }, 'presencial');
    expect(r.mediaFinal).toBe(6);
    expect(r.situacao).toBe('recuperacao');
  });

  it('REC = null é tratado como ausente', () => {
    const r = calcularNota({ av1: 6, av2: 6, av3: 6, recuperacao: null }, 'presencial');
    expect(r.mediaFinal).toBe(6);
    expect(r.situacao).toBe('recuperacao');
  });
});
