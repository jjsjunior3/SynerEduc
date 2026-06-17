// src/components/LoginCompleto.tsx
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import { useTheme } from "../contexts/ThemeContext";
import {
  Eye, EyeOff, Loader2, AlertCircle,
  ArrowLeft, Mail, Sun, Moon, KeyRound, CheckCircle, Send,
} from "lucide-react";
import { Usuario, TipoUsuario } from "../types/auth";
import { supabase } from "../supabase/supabaseClient";

interface LoginCompletoProps {
  onLogin: (user: Usuario, senhaProvisoria?: boolean) => void;
  onBackToSite: () => void;
  onPoliticaPrivacidade?: () => void;
}

type Tela = "login" | "recuperar" | "recuperar_enviado";

export default function LoginCompleto({ onLogin, onBackToSite, onPoliticaPrivacidade }: LoginCompletoProps) {
  const { theme, toggleTheme } = useTheme();

  const [tela, setTela] = useState<Tela>("login");

  // ── Login ─────────────────────────────────────────────────────────────────
  const [loginField, setLoginField] = useState("");
  const [senha, setSenha]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [erro, setErro]             = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // ── Recuperação de senha ──────────────────────────────────────────────────
  const [emailRecuperacao, setEmailRecuperacao] = useState("");
  const [loadingRecup, setLoadingRecup]         = useState(false);
  const [erroRecup, setErroRecup]               = useState("");

  // ── Login ─────────────────────────────────────────────────────────────────
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
        .select("nome, tipo, serie, avatar, segmento, status, senha_provisoria")
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
        id:       user.id,
        nome:     perfil?.nome    || user.email || "Usuário",
        email:    user.email      || "",
        tipo:     tipoNormalizado,
        serie:    perfil?.serie,
        avatar:   perfil?.avatar,
        segmento: perfil?.segmento,
        status:   perfil?.status,
      };

      localStorage.setItem("ava_user", JSON.stringify(usuario));
      onLogin(usuario, perfil?.senha_provisoria === true);

    } catch {
      setErro("Ocorreu um erro inesperado durante o login.");
    } finally {
      setLoading(false);
    }
  };

  // ── Recuperação de senha ──────────────────────────────────────────────────
  const handleRecuperarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingRecup(true);
    setErroRecup("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        emailRecuperacao.trim(),
        {
          redirectTo: `${window.location.origin}/?recuperar_senha=true`,
        }
      );

      if (error) throw error;
      setTela("recuperar_enviado");

    } catch (err: any) {
      console.error("[Recuperação]", err);
      setErroRecup(
        err.message?.includes("rate limit")
          ? "Aguarde 60 segundos antes de tentar novamente."
          : "Erro ao enviar o email. Verifique o endereço e tente novamente."
      );
    } finally {
      setLoadingRecup(false);
    }
  };

  // ─── Tela: Recuperação enviada ────────────────────────────────────────────
  if (tela === "recuperar_enviado") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950">
        <div className="absolute inset-0 bg-black/30" />
        <Card className="w-full max-w-md relative z-10 shadow-2xl border border-border bg-card">
          <CardContent className="pt-8 pb-8 text-center space-y-5">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Email enviado!</h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Enviamos um link de recuperação para{" "}
                <span className="font-medium text-foreground">{emailRecuperacao}</span>.
                <br />Verifique sua caixa de entrada e spam.
              </p>
            </div>
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-3 text-left">
              <p className="text-xs text-blue-800 dark:text-blue-300">
                O link expira em <strong>1 hora</strong>. Após clicar nele, você será
                redirecionado para criar sua nova senha.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => { setTela("login"); setEmailRecuperacao(""); }}
              className="w-full gap-2">
              <ArrowLeft className="w-4 h-4" /> Voltar ao login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Tela: Recuperar senha ────────────────────────────────────────────────
  if (tela === "recuperar") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950">
        <div className="absolute inset-0 bg-black/30" />

        <button
          onClick={toggleTheme}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/20"
          aria-label="Alternar tema">
          {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>

        <Card className="w-full max-w-md relative z-10 shadow-2xl border border-border bg-card">
          <CardHeader className="text-center space-y-4 pb-2">
            <Button
              onClick={() => { setTela("login"); setErroRecup(""); }}
              variant="ghost" size="sm"
              className="absolute top-4 left-4 text-muted-foreground hover:text-foreground gap-1">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>

            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center mx-auto shadow-lg mt-4">
              <KeyRound className="w-8 h-8 text-white" />
            </div>

            <div>
              <CardTitle className="text-xl text-foreground">Recuperar Senha</CardTitle>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Digite o email cadastrado pela secretaria.
                Enviaremos um link para você criar uma nova senha.
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 pt-4">
            <form onSubmit={handleRecuperarSenha} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="emailRecup" className="text-foreground font-medium">
                  Email de recuperação
                </Label>
                <Input
                  id="emailRecup"
                  type="email"
                  value={emailRecuperacao}
                  onChange={e => setEmailRecuperacao(e.target.value)}
                  placeholder="seu@conexao"
                  required
                  disabled={loadingRecup}
                  autoFocus
                />
              </div>

              {erroRecup && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{erroRecup}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-2"
                disabled={!emailRecuperacao.trim() || loadingRecup}>
                {loadingRecup
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Enviando...</>
                  : <><Send className="w-4 h-4" />Enviar link de recuperação</>}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Tela: Login principal ────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950">
      <div className="absolute inset-0 bg-black/30" />

      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/20"
        aria-label="Alternar tema">
        {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
      </button>

      <Card className="w-full max-w-md relative z-10 shadow-2xl border border-border bg-card backdrop-blur-sm">
        <CardHeader className="text-center space-y-4 pb-2">
          <Button
            onClick={onBackToSite} variant="ghost" size="sm"
            className="absolute top-4 left-4 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>

          {/* ── Logo da escola ── */}
          <div className="w-20 h-20 rounded-full overflow-hidden mx-auto shadow-lg mt-4 bg-white flex items-center justify-center">
            <img
              src="/logo-colegio-conexao.png"
              alt="Colégio Conexão"
              className="w-full h-full object-contain p-1"
              onError={e => {
                // fallback se o logo não carregar
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.classList.add(
                  'bg-gradient-to-br', 'from-blue-600', 'to-blue-700'
                );
              }}
            />
          </div>

          <div>
            <CardTitle className="text-2xl text-foreground">Colégio Conexão</CardTitle>
            <p className="text-muted-foreground text-sm mt-1">
              Sistema SynerEduc
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="loginField" className="text-foreground font-medium">
                Usuário:
              </Label>
              <Input
                id="loginField"
                type="email"
                value={loginField}
                onChange={e => setLoginField(e.target.value)}
                placeholder="seu@conexao"
                className="mt-1"
                required
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="senha" className="text-foreground font-medium">
                Senha:
              </Label>
              <div className="relative mt-1">
                <Input
                  id="senha"
                  type={showPassword ? "text" : "password"}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="Digite sua senha"
                  className="pr-10"
                  required
                  disabled={loading}
                />
                <Button type="button" variant="ghost" size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)} disabled={loading}>
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
              disabled={loading}>
              {loading
                ? <><Loader2 className="mr-2 w-4 h-4 animate-spin" />Entrando...</>
                : "Entrar no Portal"}
            </Button>
          </form>

          <div className="pt-4 border-t border-border text-center">
            <Button
              type="button" variant="ghost"
              onClick={() => { setTela("recuperar"); setErro(""); }}
              className="w-full text-muted-foreground hover:text-blue-600 text-sm gap-2"
              disabled={loading}>
              <Mail className="w-4 h-4" />
              Esqueci minha senha
            </Button>
          </div>
        </CardContent>

        {onPoliticaPrivacidade && (
          <div className="px-6 pb-4 text-center">
            <button
              onClick={onPoliticaPrivacidade}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">
              Política de Privacidade e Proteção de Dados (LGPD)
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}