export type TipoUsuario = 'aluno' | 'professor' | 'coordenador' | 'administrador' |'professor_conteudista';

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
  nomeUsuario?: string; // Nome de usuário para login
  email: string;
  tipo: TipoUsuario;
  avatar?: string;
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
  email?: string; // Email para login
  username?: string; // Nome de usuário para login (será convertido para nomeUsuario)
  password: string; // Senha (será convertido para senha)
}