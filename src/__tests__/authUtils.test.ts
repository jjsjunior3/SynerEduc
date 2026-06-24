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

  it('retorna "Gestor Geral" para gestor_geral', () => {
    expect(perfilLabel('gestor_geral')).toBe('Gestor Geral');
  });

  it('retorna "Admin Presencial" para admin_presencial', () => {
    expect(perfilLabel('admin_presencial')).toBe('Admin Presencial');
  });

  it('retorna "Secretaria" para secretaria', () => {
    expect(perfilLabel('secretaria')).toBe('Secretaria');
  });

  it('retorna "Prof. Conteudista" para professor_conteudista', () => {
    expect(perfilLabel('professor_conteudista')).toBe('Prof. Conteudista');
  });

  it('retorna "Responsável" para responsavel', () => {
    expect(perfilLabel('responsavel')).toBe('Responsável');
  });
});

describe('isAdmin', () => {
  it('retorna true para administrador', () => {
    expect(isAdmin('administrador')).toBe(true);
  });

  it('retorna true para gestor_geral', () => {
    expect(isAdmin('gestor_geral')).toBe(true);
  });

  it('retorna false para admin_presencial', () => {
    // admin_presencial tem escopo limitado ao segmento presencial — não é super-admin
    expect(isAdmin('admin_presencial')).toBe(false);
  });

  it('retorna false para coordenador', () => {
    expect(isAdmin('coordenador')).toBe(false);
  });

  it('retorna false para professor', () => {
    expect(isAdmin('professor')).toBe(false);
  });

  it('retorna false para aluno', () => {
    expect(isAdmin('aluno')).toBe(false);
  });
});

describe('isProfessor', () => {
  it('retorna true para professor', () => {
    expect(isProfessor('professor')).toBe(true);
  });

  it('retorna true para professor_conteudista', () => {
    expect(isProfessor('professor_conteudista')).toBe(true);
  });

  it('retorna false para coordenador', () => {
    expect(isProfessor('coordenador')).toBe(false);
  });

  it('retorna false para aluno', () => {
    expect(isProfessor('aluno')).toBe(false);
  });

  it('retorna false para administrador', () => {
    expect(isProfessor('administrador')).toBe(false);
  });
});

describe('isGestorOuAdmin', () => {
  it('retorna true para coordenador', () => {
    expect(isGestorOuAdmin('coordenador')).toBe(true);
  });

  it('retorna true para administrador', () => {
    expect(isGestorOuAdmin('administrador')).toBe(true);
  });

  it('retorna true para gestor_geral', () => {
    expect(isGestorOuAdmin('gestor_geral')).toBe(true);
  });

  it('retorna true para admin_presencial', () => {
    expect(isGestorOuAdmin('admin_presencial')).toBe(true);
  });

  it('retorna false para professor', () => {
    expect(isGestorOuAdmin('professor')).toBe(false);
  });

  it('retorna false para aluno', () => {
    expect(isGestorOuAdmin('aluno')).toBe(false);
  });

  it('retorna false para secretaria', () => {
    expect(isGestorOuAdmin('secretaria')).toBe(false);
  });
});

describe('canAccessFinanceiro', () => {
  it('retorna true para financeiro', () => {
    expect(canAccessFinanceiro('financeiro')).toBe(true);
  });

  it('retorna true para administrador', () => {
    expect(canAccessFinanceiro('administrador')).toBe(true);
  });

  it('retorna true para gestor_geral', () => {
    expect(canAccessFinanceiro('gestor_geral')).toBe(true);
  });

  it('retorna true para secretaria', () => {
    expect(canAccessFinanceiro('secretaria')).toBe(true);
  });

  it('retorna false para professor', () => {
    expect(canAccessFinanceiro('professor')).toBe(false);
  });

  it('retorna false para coordenador', () => {
    expect(canAccessFinanceiro('coordenador')).toBe(false);
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

  it('retorna true para administrador', () => {
    expect(canAccessAlunos('administrador')).toBe(true);
  });

  it('retorna true para gestor_geral', () => {
    expect(canAccessAlunos('gestor_geral')).toBe(true);
  });

  it('retorna true para admin_presencial', () => {
    expect(canAccessAlunos('admin_presencial')).toBe(true);
  });

  it('retorna false para professor', () => {
    expect(canAccessAlunos('professor')).toBe(false);
  });

  it('retorna false para aluno', () => {
    expect(canAccessAlunos('aluno')).toBe(false);
  });

  it('retorna false para financeiro', () => {
    expect(canAccessAlunos('financeiro')).toBe(false);
  });
});
