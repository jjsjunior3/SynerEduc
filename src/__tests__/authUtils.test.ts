import { describe, it, expect } from 'vitest';
import {
  perfilLabel,
  isAdmin,
  isProfessor,
  isGestorOuAdmin,
  canAccessFinanceiro,
  canAccessAlunos,
} from '@/utils/authUtils';

describe('perfilLabel', () => {
  it('retorna "Administrador" para administrador', () => {
    expect(perfilLabel('administrador')).toBe('Administrador');
  });

  it('retorna "Professor" para professor', () => {
    expect(perfilLabel('professor')).toBe('Professor');
  });

  it('retorna "Aluno" para aluno', () => {
    expect(perfilLabel('aluno')).toBe('Aluno');
  });

  it('retorna "Coordenador" para coordenador', () => {
    expect(perfilLabel('coordenador')).toBe('Coordenador');
  });

  it('retorna "Financeiro" para financeiro', () => {
    expect(perfilLabel('financeiro')).toBe('Financeiro');
  });
});

describe('isAdmin', () => {
  it('retorna true para administrador', () => {
    expect(isAdmin('administrador')).toBe(true);
  });

  it('retorna true para gestor_geral', () => {
    expect(isAdmin('gestor_geral')).toBe(true);
  });

  it('retorna false para professor', () => {
    expect(isAdmin('professor')).toBe(false);
  });

  it('retorna false para coordenador', () => {
    expect(isAdmin('coordenador')).toBe(false);
  });
});

describe('isProfessor', () => {
  it('retorna true para professor', () => {
    expect(isProfessor('professor')).toBe(true);
  });

  it('retorna true para professor_conteudista', () => {
    expect(isProfessor('professor_conteudista')).toBe(true);
  });

  it('retorna false para aluno', () => {
    expect(isProfessor('aluno')).toBe(false);
  });

  it('retorna false para coordenador', () => {
    expect(isProfessor('coordenador')).toBe(false);
  });
});

describe('isGestorOuAdmin', () => {
  it('retorna true para coordenador', () => {
    expect(isGestorOuAdmin('coordenador')).toBe(true);
  });

  it('retorna true para administrador', () => {
    expect(isGestorOuAdmin('administrador')).toBe(true);
  });

  it('retorna false para aluno', () => {
    expect(isGestorOuAdmin('aluno')).toBe(false);
  });

  it('retorna false para professor', () => {
    expect(isGestorOuAdmin('professor')).toBe(false);
  });
});

describe('canAccessFinanceiro', () => {
  it('retorna true para financeiro', () => {
    expect(canAccessFinanceiro('financeiro')).toBe(true);
  });

  it('retorna true para administrador', () => {
    expect(canAccessFinanceiro('administrador')).toBe(true);
  });

  it('retorna false para professor', () => {
    expect(canAccessFinanceiro('professor')).toBe(false);
  });

  it('retorna false para aluno', () => {
    expect(canAccessFinanceiro('aluno')).toBe(false);
  });
});

describe('canAccessAlunos', () => {
  it('retorna true para coordenador', () => {
    expect(canAccessAlunos('coordenador')).toBe(true);
  });

  it('retorna true para secretaria', () => {
    expect(canAccessAlunos('secretaria')).toBe(true);
  });

  it('retorna false para estoque', () => {
    expect(canAccessAlunos('estoque')).toBe(false);
  });

  it('retorna false para professor', () => {
    expect(canAccessAlunos('professor')).toBe(false);
  });
});
