import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabase/supabaseClient";
import { Session, User } from "@supabase/supabase-js";

interface UsuarioPerfil {
  id: string;
  email: string;
  nome: string;
  tipo: "administrador" | "professor" | "aluno" | "responsavel";
  avatar?: string;
  serie?: string;
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
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("❌ Erro ao buscar perfil:", error);
      }

      if (data) {
        console.log("✅ Perfil carregado:", data);
        setUsuario({
          id: user.id,
          email: user.email || "",
          nome: data.nome,
          tipo: data.tipo,
          avatar: data.avatar_url,
          serie: data.serie,
        });
      }
    } catch (error) {
      console.error("💥 Erro fatal ao buscar perfil:", error);
    } finally {
      setLoading(false);
    }
  }

  // ✅ FUNÇÃO LOGOUT (Versão Nativa - Mais Segura)
  async function logout() {
    try {
      console.log("🚪 Iniciando logout...");

      // 1. Fazer signOut no Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("❌ Erro no signOut:", error);
      }

      // 2. Limpar estados
      setUsuario(null);
      setSession(null);

      // 3. Limpar localStorage
      localStorage.clear();

      // 4. Redirecionar para login (Forçando recarregamento limpo)
      console.log("✅ Logout concluído! Redirecionando...");
      window.location.href = "/login";

    } catch (error) {
      console.error("💥 Erro fatal no logout:", error);
      // Forçar redirecionamento mesmo com erro
      window.location.href = "/login";
    }
  }

  return (
    <AuthContext.Provider value={{ session, usuario, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
