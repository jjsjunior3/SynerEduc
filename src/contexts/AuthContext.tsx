import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useRef
} from 'react';
import { Usuario, AuthState, LoginCredentials } from '../types/auth';
import { supabase } from '../supabase/supabaseClient';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  atualizarUsuario: (usuarioAtualizado: Usuario) => void;
  configurationError: string | null;
  isCheckingSetup: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    usuario: null,
    isLoggedIn: false
  });
  const [configurationError, setConfigurationError] = useState<string | null>(
    null
  );
  const [isCheckingSetup, setIsCheckingSetup] = useState(false);
  const mountedRef = useRef(true);

  // ==========================================================
  // LOGIN via Supabase Auth + tabela users
  // ==========================================================
  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    try {
      setIsCheckingSetup(true);
      setConfigurationError(null);

      const identifier = credentials.email || credentials.nomeUsuario || '';
      const password = credentials.senha || credentials.password || '';

      // login no Supabase Auth
      const { data: sessionData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: identifier,
          password
        });

      if (signInError) {
        setConfigurationError(signInError.message);
        setIsCheckingSetup(false);
        return false;
      }

      if (!sessionData || !sessionData.user) {
        setConfigurationError('Sessão inválida retornada pelo Supabase.');
        setIsCheckingSetup(false);
        return false;
      }

      // buscar o usuário na tabela users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', identifier)
        .maybeSingle();

      if (userError) {
        setConfigurationError(userError.message);
        setIsCheckingSetup(false);
        return false;
      }

      if (!userData) {
        setConfigurationError('Usuário não encontrado na tabela users.');
        setIsCheckingSetup(false);
        return false;
      }

      setAuthState({ usuario: userData, isLoggedIn: true });
      localStorage.setItem('ava_user_session', JSON.stringify(userData));
      setConfigurationError(null);
      setIsCheckingSetup(false);
      return true;
    } catch (err: any) {
      console.error('Erro no login Supabase:', err);
      setConfigurationError(err.message || 'Erro inesperado no login.');
      setIsCheckingSetup(false);
      return false;
    }
  };

  // ==========================================================
  // LOGOUT
  // ==========================================================
  const logout = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Erro no logout:', err);
    } finally {
      setAuthState({ usuario: null, isLoggedIn: false });
      localStorage.removeItem('ava_user_session');
    }
  };

  // ==========================================================
  // ATUALIZAÇÃO DE USUÁRIO
  // ==========================================================
  const atualizarUsuario = (usuarioAtualizado: Usuario) => {
    setAuthState((prev) => ({ ...prev, usuario: usuarioAtualizado }));
    localStorage.setItem('ava_user_session', JSON.stringify(usuarioAtualizado));
  };

  // ==========================================================
  // RESTAURAR SESSÃO LOCAL
  // ==========================================================
  useEffect(() => {
    mountedRef.current = true;

    const savedSession = localStorage.getItem('ava_user_session');
    if (savedSession) {
      try {
        const usuario = JSON.parse(savedSession);
        setAuthState({ usuario, isLoggedIn: true });
        setConfigurationError(null);
      } catch (error) {
        console.error('Erro ao restaurar sessão local:', error);
        localStorage.removeItem('ava_user_session');
      }
    }

    return () => {
      mountedRef.current = false;
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        logout,
        atualizarUsuario,
        configurationError,
        isCheckingSetup
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
