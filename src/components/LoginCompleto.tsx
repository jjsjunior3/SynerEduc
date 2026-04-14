// src/components/LoginCompleto.tsx
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import { useTheme } from "../contexts/ThemeContext";
import {
  BookOpen,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Phone,
  Sun,
  Moon,
} from "lucide-react";
import { Usuario, TipoUsuario } from "../types/auth";
import { supabase } from "../supabase/supabaseClient";

interface LoginCompletoProps {
  onLogin: (user: Usuario) => void;
  onBackToSite: () => void;
}

export default function LoginCompleto({ onLogin, onBackToSite }: LoginCompletoProps) {
  const { theme, toggleTheme } = useTheme();
  const [loginField, setLoginField] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginField,
        password: senha,
      });

      if (error) {
        setErro("Usuário ou senha incorretos.");
        return;
      }

      const user = data?.user;
      if (!user) {
        setErro("Usuário não retornado pelo servidor.");
        return;
      }

      const { data: perfil, error: perfilError } = await supabase
        .from("users")
        .select("nome, tipo, serie, avatar")
        .eq("id", user.id)
        .single();

      if (perfilError) {
        setErro("Não foi possível carregar seu perfil. Tente novamente.");
        return;
      }

      const tipoBanco = perfil?.tipo as TipoUsuario | undefined;
      const tipoNormalizado: TipoUsuario =
        tipoBanco === "admin" ? "administrador" : (tipoBanco || "aluno");

      const usuario: Usuario = {
        id: user.id,
        nome: perfil?.nome || user.email || "Usuário",
        email: user.email || "",
        tipo: tipoNormalizado,
        serie: perfil?.serie,
        avatar: perfil?.avatar,
      };

      localStorage.setItem("ava_user", JSON.stringify(usuario));
      onLogin(usuario);
    } catch {
      setErro("Ocorreu um erro inesperado durante o login.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    const phone = "5598988887777";
    const message = "Olá! Esqueci minha senha do Portal AVA. Podem me ajudar?";
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950">
      {/* Overlay sutil */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Toggle de tema — canto superior direito */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/20"
        aria-label="Alternar tema"
      >
        {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
      </button>

      <Card className="w-full max-w-md relative z-10 shadow-2xl border border-border bg-card backdrop-blur-sm">
        <CardHeader className="text-center space-y-4 pb-2">
          {/* Botão voltar */}
          <Button
            onClick={onBackToSite}
            variant="ghost"
            size="sm"
            className="absolute top-4 left-4 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar
          </Button>

          {/* Ícone */}
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center mx-auto shadow-lg mt-4">
            <BookOpen className="w-10 h-10 text-white" />
          </div>

          <div>
            <CardTitle className="text-2xl text-foreground">Portal AVA</CardTitle>
            <p className="text-muted-foreground text-sm mt-1">
              Colégio Conexão EAD Maranhense
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="loginField" className="text-foreground font-medium">
                Usuário
              </Label>
              <Input
                id="loginField"
                type="email"
                value={loginField}
                onChange={(e) => setLoginField(e.target.value)}
                placeholder="seu@email.com"
                className="mt-1"
                required
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="senha" className="text-foreground font-medium">
                Senha
              </Label>
              <div className="relative mt-1">
                <Input
                  id="senha"
                  type={showPassword ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Digite sua senha"
                  className="pr-10"
                  required
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {erro && (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{erro}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar no Portal"
              )}
            </Button>
          </form>

          <div className="space-y-3 pt-4 border-t border-border text-center">
            <Button
              type="button"
              variant="ghost"
              onClick={handleForgotPassword}
              className="w-full text-muted-foreground hover:text-blue-600 text-sm"
              disabled={loading}
            >
              <Phone className="mr-2 w-4 h-4" />
              Esqueci minha senha
            </Button>
            <p className="text-xs text-muted-foreground">
              Problemas para acessar?{" "}
              <a href="tel:+559889255294" className="text-blue-500 hover:underline">
                (98) 98 8925-5294
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}