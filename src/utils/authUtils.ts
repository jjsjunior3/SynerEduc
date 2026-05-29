// src/utils/authUtils.ts
// Utilitários de perfil de usuário — sem chamadas ao Supabase, seguros para unit-test.

import type { TipoUsuario } from '@/types/auth';

export type { TipoUsuario };

const PERFIL_LABELS: Record<TipoUsuario, string> = {
  aluno:                 'Aluno',
  professor:             'Professor',
  professor_conteudista: 'Prof. Conteudista',
  coordenador:           'Coordenador',
  administrador:         'Administrador',
  admin_presencial:      'Admin Presencial',
  gestor_geral:          'Gestor Geral',
  secretaria:            'Secretaria',
  financeiro:            'Financeiro',
  estoque:               'Estoque',
  responsavel:           'Responsável',
};

/** Rótulo legível para exibição do tipo de usuário. */
export function perfilLabel(tipo: TipoUsuario): string {
  return PERFIL_LABELS[tipo] ?? tipo;
}

/** True para os papéis de super-admin (gerencia todas as escolas). */
export function isAdmin(tipo: TipoUsuario): boolean {
  return tipo === 'administrador' || tipo === 'gestor_geral';
}

/** True para qualquer variante de professor. */
export function isProfessor(tipo: TipoUsuario): boolean {
  return tipo === 'professor' || tipo === 'professor_conteudista';
}

/** True para coordenador ou qualquer papel administrativo de escola. */
export function isGestorOuAdmin(tipo: TipoUsuario): boolean {
  return (['coordenador', 'administrador', 'gestor_geral', 'admin_presencial'] as TipoUsuario[]).includes(tipo);
}

/** True para papéis com acesso ao módulo financeiro. */
export function canAccessFinanceiro(tipo: TipoUsuario): boolean {
  return (['administrador', 'gestor_geral', 'financeiro', 'secretaria'] as TipoUsuario[]).includes(tipo);
}

/** True para papéis com acesso à listagem e matrícula de alunos. */
export function canAccessAlunos(tipo: TipoUsuario): boolean {
  return (
    ['administrador', 'gestor_geral', 'coordenador', 'admin_presencial', 'secretaria'] as TipoUsuario[]
  ).includes(tipo);
}
