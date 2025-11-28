import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabase/supabaseClient";
import { Session, User } from "@supabase/supabase-js";

// Interface atualizada para incluir 'serie'
interface UsuarioPerfil {
  id: string;
  email: string;
  nome: string;
  tipo: "administrador" | "professor" | "aluno" | "responsavel";
  avatar?: string;
  serie?: string; // <--- Adicionado aqui
}

interface AuthContextData {
  session: Session | null;
  usuario: UsuarioPerfil | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [usuario, setUsuario] = useState<UsuarioPerfil | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Verificar sessão atual ao carregar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        buscarPerfil(session.user);
      } else {
        setLoading(false);
      }
    });

    // 2. Escutar mudanças na autenticação (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        buscarPerfil(session.user);
      } else {
        setUsuario(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function buscarPerfil(user: User) {
    try {
      // AQUI ESTÁ A CORREÇÃO: Garantimos que buscamos a 'serie'
      const { data, error } = await supabase
        .from("users")
        .select("*") // Traz todas as colunas, incluindo 'serie'
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Erro ao buscar perfil:", error);
      }

      if (data) {
        setUsuario({
          id: user.id,
          email: user.email || "",
          nome: data.nome,
          tipo: data.tipo,
          avatar: data.avatar_url, // Ajuste conforme seu banco (avatar ou avatar_url)
          serie: data.serie, // <--- Agora a série é salva no estado global
        });
      }
    } catch (error) {
      console.error("Erro fatal ao buscar perfil:", error);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setUsuario(null);
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ session, usuario, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
