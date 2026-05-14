export type TipoUsuario = 'aluno'
  | 'professor'
  | 'professor_conteudista'
  | 'coordenador'
  | 'administrador'
  | "admin_presencial"        
  | 'gestor_geral'    
  | 'secretaria'      
  | 'financeiro'    
  | 'estoque'         
  | 'responsavel';

export type Segmento = 'ead' | 'presencial';

export type Turno = 'matutino' | 'vespertino' | 'noturno';

export type Nivel = 'fundamental1' | 'fundamental2' | 'medio';

export type SerieEscolar = 
  | '5º ano - Ensino Fundamental'
  | '6º ano - Ensino Fundamental'
  | '7º ano - Ensino Fundamental'
  | '8º ano - Ensino Fundamental'
  | '9º ano - Ensino Fundamental'
  | '1ª série - Ensino Médio'
  | '2ª série - Ensino Médio'
  | '3ª série - Ensino Médio';

export interface Usuario {
  id: string;
  nome: string;
  nomeUsuario?: string;
  email: string;
  tipo: TipoUsuario;
  avatar?: string;
  // Segmento
  segmento?: Segmento;
  turno?: Turno;
  nivel?: Nivel;
  // Específico para alunos
  serie?: SerieEscolar;
  turma?: string;
  // Específico para professores
  disciplinas?: string[];
  turmas?: string[];
}

export interface AuthState {
  usuario: Usuario | null;
  isLoggedIn: boolean;
}

export interface LoginCredentials {
  email?: string;
  username?: string;
  password: string;
}