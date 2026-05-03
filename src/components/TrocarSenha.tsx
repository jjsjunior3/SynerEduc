// src/components/TrocarSenha.tsx
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import {
  KeyRound, Eye, EyeOff, Loader2, AlertCircle, CheckCircle, ShieldCheck,
} from "lucide-react";
import { supabase } from "../supabase/supabaseClient";
import { toast } from "sonner";

interface TrocarSenhaProps {
  onSenhaTrocada: () => void; // callback: redireciona para o dashboard
}

export default function TrocarSenha({ onSenhaTrocada }: TrocarSenhaProps) {
  const [novaSenha, setNovaSenha]           = useState("");
  const [confirmar, setConfirmar]           = useState("");
  const [mostrarNova, setMostrarNova]       = useState(false);
  const [mostrarConf, setMostrarConf]       = useState(false);
  const [loading, setLoading]               = useState(false);
  const [erro, setErro]                     = useState("");

  // ── Validações visuais ────────────────────────────────────────────────────
  const temMinimo    = novaSenha.length >= 8;
  const temMaiuscula = /[A-Z]/.test(novaSenha);
  const temNumero    = /[0-9]/.test(novaSenha);
  const coincidem    = novaSenha === confirmar && confirmar.length > 0;
  const senhaValida  = temMinimo && temMaiuscula && temNumero && coincidem;

  const RegraItem = ({ ok, texto }: { ok: boolean; texto: string }) => (
    <li className={`flex items-center gap-2 text-xs transition-colors ${
      ok ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
    }`}>
      {ok
        ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
        : <span className="w-3.5 h-3.5 rounded-full border border-current flex-shrink-0" />}
      {texto}
    </li>
  );

  // ── Trocar senha ──────────────────────────────────────────────────────────
  const handleTrocar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senhaValida) return;
    setErro("");
    setLoading(true);

    try {
      // 1. Atualizar senha no Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({ password: novaSenha });
      if (authError) throw authError;

      // 2. Marcar senha_provisoria = false em public.users
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("users")
          .update({ senha_provisoria: false })
          .eq("id", user.id);
      }

      toast.success("Senha atualizada com sucesso! Bem-vindo(a)!");
      onSenhaTrocada();

    } catch (err: any) {
      console.error("[TrocarSenha]", err);
      setErro(err.message || "Erro ao atualizar a senha. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950">
      <div className="absolute inset-0 bg-black/30" />

      <Card className="w-full max-w-md relative z-10 shadow-2xl border border-border bg-card">
        <CardHeader className="text-center space-y-4 pb-2">
          {/* Ícone */}
          <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center mx-auto shadow-lg mt-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>

          <div>
            <CardTitle className="text-xl text-foreground">Primeiro Acesso</CardTitle>
            <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
              Por segurança, você precisa criar uma senha pessoal antes de continuar.
            </p>
          </div>

          {/* Banner informativo */}
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-left">
            <p className="text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <KeyRound className="w-3.5 h-3.5 flex-shrink-0" />
              Sua senha provisória será substituída pela nova que você criar agora.
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 pt-4">
          <form onSubmit={handleTrocar} className="space-y-4">

            {/* Nova senha */}
            <div className="space-y-1.5">
              <Label htmlFor="novaSenha" className="text-foreground font-medium">
                Nova Senha
              </Label>
              <div className="relative">
                <Input
                  id="novaSenha"
                  type={mostrarNova ? "text" : "password"}
                  value={novaSenha}
                  onChange={e => setNovaSenha(e.target.value)}
                  placeholder="Crie sua senha pessoal"
                  className="pr-10"
                  required
                  disabled={loading}
                  autoFocus
                />
                <Button type="button" variant="ghost" size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-muted-foreground hover:text-foreground"
                  onClick={() => setMostrarNova(p => !p)} disabled={loading}>
                  {mostrarNova ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>

              {/* Regras de senha */}
              {novaSenha.length > 0 && (
                <ul className="space-y-1 mt-2 pl-1">
                  <RegraItem ok={temMinimo}    texto="Mínimo 8 caracteres" />
                  <RegraItem ok={temMaiuscula} texto="Pelo menos uma letra maiúscula" />
                  <RegraItem ok={temNumero}    texto="Pelo menos um número" />
                </ul>
              )}
            </div>

            {/* Confirmar senha */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmar" className="text-foreground font-medium">
                Confirmar Nova Senha
              </Label>
              <div className="relative">
                <Input
                  id="confirmar"
                  type={mostrarConf ? "text" : "password"}
                  value={confirmar}
                  onChange={e => setConfirmar(e.target.value)}
                  placeholder="Repita sua nova senha"
                  className="pr-10"
                  required
                  disabled={loading}
                />
                <Button type="button" variant="ghost" size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-muted-foreground hover:text-foreground"
                  onClick={() => setMostrarConf(p => !p)} disabled={loading}>
                  {mostrarConf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>

              {confirmar.length > 0 && (
                <p className={`text-xs flex items-center gap-1 mt-1 ${
                  coincidem
                    ? "text-green-600 dark:text-green-400"
                    : "text-destructive"
                }`}>
                  {coincidem
                    ? <><CheckCircle className="w-3.5 h-3.5" /> Senhas coincidem</>
                    : <><AlertCircle className="w-3.5 h-3.5" /> Senhas não coincidem</>}
                </p>
              )}
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
              disabled={!senhaValida || loading}>
              {loading
                ? <><Loader2 className="mr-2 w-4 h-4 animate-spin" />Salvando...</>
                : <><KeyRound className="mr-2 w-4 h-4" />Criar Minha Senha</>}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            Problemas?{" "}
            <a href="tel:+559889255294" className="text-blue-500 hover:underline">
              (98) 98 8925-5294
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}