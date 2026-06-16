// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../supabase/supabaseClient";
import { Session, User } from "@supabase/supabase-js";

interface UsuarioPerfil {
  id: string;
  email: string;
  nome: string;
  tipo:
    | "administrador"
    | "admin_presencial"        // ← NOVO
    | "professor"
    | "aluno"
    | "responsavel"
    | "coordenador"
    | "professor_conteudista"
    | "gestor_geral"
    | "secretaria"
    | "financeiro"
    | "estoque";
  avatar?: string;
  serie?: string;
  segmento?: "ead" | "presencial";
  turno?: "matutino" | "vespertino" | "noturno";
  nivel?: "fundamental1" | "fundamental2" | "medio";
  status?: string;
  criado_em?: string;
  updated_at?: string;
}

interface AuthContextData {
  session: Session | null;
  usuario: UsuarioPerfil | null;
  loading: boolean;
  logout: () => Promise<void>;
  atualizarPerfil: (dadosAtualizados: Partial<UsuarioPerfil>) => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [usuario, setUsuario] = useState<UsuarioPerfil | null>(null);
  const [loading, setLoading] = useState(true);

  const buscarPerfil = useCallback(async (user: User) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        // Perfil não encontrado ou erro de rede — faz logout para limpar estado inválido
        console.warn('[Auth] Erro ao buscar perfil, forçando logout:', error.message);
        await supabase.auth.signOut();
        localStorage.removeItem('sb-' + import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token');
        setUsuario(null);
        setSession(null);
        setLoading(false);
        return;
      }

      if (data) {
        setUsuario({
          id: user.id,
          email: user.email || data.email || "",
          nome: data.nome || "",
          tipo: data.tipo || "aluno",
          avatar: data.avatar || undefined,
          serie: data.serie || undefined,
          segmento: data.segmento || "ead",
          turno: data.turno || undefined,
          nivel: data.nivel || undefined,
          status: data.status || undefined,
          criado_em: data.criado_em || undefined,
          updated_at: data.updated_at || undefined,
        });
      }
    } catch {
      // Erro inesperado (ex: offline) — limpa localStorage para evitar loop em próximo acesso
      try {
        await supabase.auth.signOut();
      } catch { /* ignora */ }
      setUsuario(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        buscarPerfil(session.user);
      } else {
        setLoading(false);
      }
    });

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
  }, [buscarPerfil]);

  const atualizarPerfil = useCallback((dadosAtualizados: Partial<UsuarioPerfil>) => {
    setUsuario(prev => prev ? { ...prev, ...dadosAtualizados } : null);
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUsuario(null);
      setSession(null);
      localStorage.clear();
      window.location.href = "/";
    } catch {
      window.location.href = "/";
    }
  }, []);

  return (
    <AuthContext.Provider value={{ session, usuario, loading, logout, atualizarPerfil }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
};