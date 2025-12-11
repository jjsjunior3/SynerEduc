import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../supabase/supabaseClient";
import { Session, User } from "@supabase/supabase-js";

// ========================================
// INTERFACES
// ========================================
interface UsuarioPerfil {
  id: string;
  email: string;
  nome: string;
  tipo: "administrador" | "professor" | "aluno" | "responsavel" | "coordenador";
  avatar?: string;
  serie?: string;
  status?: string;
  criado_em?: string;
  updated_at?: string;
}

interface AuthContextData {
  session: Session | null;
  usuario: UsuarioPerfil | null;
  loading: boolean;
  logout: () => Promise<void>;
  atualizarPerfil: (dadosAtualizados: Partial<UsuarioPerfil>) => void; // ✅ Nova função
}

// ========================================
// CRIAÇÃO DO CONTEXTO
// ========================================
const AuthContext = createContext<AuthContextData>({} as AuthContextData);

// ========================================
// PROVIDER DO CONTEXTO
// ========================================
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [usuario, setUsuario] = useState<UsuarioPerfil | null>(null);
  const [loading, setLoading] = useState(true);

  // ========================================
  // FUNÇÃO PARA BUSCAR PERFIL DO USUÁRIO
  // ========================================
  const buscarPerfil = useCallback(async (user: User) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("❌ Erro ao buscar perfil:", error);
        setLoading(false);
        return;
      }

      if (data) {
        console.log("✅ Perfil carregado:", data);
        setUsuario({
          id: user.id,
          email: user.email || data.email || "",
          nome: data.nome || "",
          tipo: data.tipo || "aluno",
          avatar: data.avatar || undefined, // ✅ Corrigido: usando 'avatar' em vez de 'avatar_url'
          serie: data.serie || undefined,
          status: data.status || undefined,
          criado_em: data.criado_em || undefined,
          updated_at: data.updated_at || undefined,
        });
      }
    } catch (error) {
      console.error("💥 Erro fatal ao buscar perfil:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ========================================
  // EFEITO PARA GERENCIAR SESSÃO
  // ========================================
  useEffect(() => {
    // 1. Verificar sessão atual ao carregar
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("🔍 Verificando sessão inicial...", session ? "Sessão ativa" : "Sem sessão");
      setSession(session);
      if (session?.user) {
        buscarPerfil(session.user);
      } else {
        setLoading(false);
      }
    });

    // 2. Escutar mudanças na autenticação (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("🔄 Mudança de autenticação:", _event);
      setSession(session);
      if (session?.user) {
        buscarPerfil(session.user);
      } else {
        setUsuario(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [buscarPerfil]);

  // ========================================
  // FUNÇÃO PARA ATUALIZAR PERFIL GLOBALMENTE
  // ========================================
  const atualizarPerfil = useCallback((dadosAtualizados: Partial<UsuarioPerfil>) => {
    setUsuario(prev => prev ? { ...prev, ...dadosAtualizados } : null);
    console.log("✅ Perfil atualizado no contexto:", dadosAtualizados);
  }, []);

  // ========================================
  // FUNÇÃO LOGOUT
  // ========================================
  const logout = useCallback(async () => {
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
  }, []);

  return (
    <AuthContext.Provider value={{ session, usuario, loading, logout, atualizarPerfil }}>
      {children}
    </AuthContext.Provider>
  );
}

// ========================================
// HOOK PARA USAR O CONTEXTO
// ========================================
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
};
