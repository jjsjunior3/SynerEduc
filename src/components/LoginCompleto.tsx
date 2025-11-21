// src/components/LoginCompleto.tsx
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import {
  BookOpen,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Phone,
} from "lucide-react";
import { Usuario, TipoUsuario } from "../types/auth";
import { supabase } from "../supabase/supabaseClient";

interface LoginCompletoProps {
  onLogin: (user: Usuario) => void;
  onBackToSite: () => void;
}

export default function LoginCompleto({
  onLogin,
  onBackToSite,
}: LoginCompletoProps) {
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
      console.log("[Login] Tentando autenticar:", loginField);

      // 1. Autenticação no Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginField,
        password: senha,
      });

      if (error) {
        console.error("❌ Erro de login:", error.message);
        setErro("Usuário ou senha incorretos");
        return;
      }

      const user = data?.user;
      if (!user) {
        setErro("Usuário não retornado pelo servidor.");
        return;
      }

      console.log("[Login] Autenticado com sucesso:", user.id);

      // 2. Busca perfil na tabela `users`, campo `tipo`
      const { data: perfil, error: perfilError } = await supabase
        .from("users")
        .select("nome, tipo")
        .eq("id", user.id)
        .single();

      if (perfilError) {
        console.warn(
          "[Login] Não foi possível carregar perfil da tabela users:",
          perfilError.message
        );
      }

      console.log("[Login] Perfil carregado:", perfil);

      const tipoBanco = perfil?.tipo as TipoUsuario | undefined;
      const tipoNormalizado: TipoUsuario =
        tipoBanco === "admin" ? "administrador" : (tipoBanco || "aluno");

      const usuario: Usuario = {
        id: user.id,
        nome: perfil?.nome || user.email || "Usuário",
        email: user.email || "",
        tipo: tipoNormalizado,
      };

      // 3. Salva sessão e sobe pro App
      localStorage.setItem("ava_user", JSON.stringify(usuario));
      console.log("✅ Login completo:", usuario);
      onLogin(usuario);
    } catch (err: any) {
      console.error("💥 Erro inesperado durante o login:", err);
      setErro("Ocorreu um erro inesperado durante o login.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    const phone = "5598988887777";
    const message =
      "Olá! Esqueci minha senha do Portal AVA. Podem me ajudar?";
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20" />

      <Card className="w-full max-w-md relative z-10 shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <Button
            onClick={onBackToSite}
            variant="ghost"
            size="sm"
            className="absolute top-4 left-4 text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar
          </Button>

          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center mx-auto shadow-lg">
            <BookOpen className="w-10 h-10 text-white" />
          </div>

          <div>
            <CardTitle className="text-2xl text-blue-800">Portal AVA</CardTitle>
            <p className="text-gray-600">Colégio Conexão EAD Maranhense</p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="loginField" className="text-gray-700 font-medium">
                Email
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
              <Label htmlFor="senha" className="text-gray-700 font-medium">
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
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 h-4" />
                  ) : (
                    <Eye className="h-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {erro && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 h-4" />
                <AlertDescription>{erro}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 h-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar no Portal"
              )}
            </Button>
          </form>

          <div className="space-y-3 pt-4 border-t text-center">
            <Button
              type="button"
              variant="ghost"
              onClick={handleForgotPassword}
              className="w-full text-gray-600 hover:text-blue-600 text-sm"
              disabled={loading}
            >
              <Phone className="mr-2 h-4 h-4" />
              Esqueci minha senha
            </Button>
 <p className="text-xs text-gray-500">
              Problemas para acessar?{" "}
              <a href="tel:+5598988887777" className="text-blue-600 hover:underline">
                (98) 98888‑7777
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
