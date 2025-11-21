// src/components/DashboardFallback.tsx
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { LogOut, ArrowLeftCircle } from "lucide-react";
import type { Usuario } from "../types/auth";

interface DashboardFallbackProps {
  usuario?: Usuario;
  onBackToSite?: () => void;
  logout?: () => void;
  mensagem?: string;
}

/**
 * Tela segura que aparece quando um usuário tem um tipo de acesso
 * ainda não implementado, ou quando ocorre falha de inicialização.
 */
export default function DashboardFallback({
  usuario,
  onBackToSite,
  logout,
  mensagem,
}: DashboardFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 p-6">
      <Card className="max-w-lg w-full shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <ArrowLeftCircle className="mx-auto w-12 h-12 text-indigo-600 mb-3" />
          <CardTitle className="text-2xl font-bold text-gray-900">
            Painel não disponível
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6 text-center">
          <p className="text-gray-600">
            {mensagem ??
              "O tipo de usuário informado ainda não possui um painel configurado neste ambiente."}
          </p>

          {usuario && (
            <div className="p-3 bg-gray-50 rounded-lg border text-sm">
              <p className="text-gray-700 font-medium">
                Usuário: {usuario.nome}
              </p>
              <p className="text-gray-500">{usuario.tipo}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {onBackToSite && (
              <Button
                onClick={onBackToSite}
                variant="outline"
                className="px-6"
              >
                <ArrowLeftCircle className="w-4 h-4 mr-2" />
                Voltar ao site
              </Button>
            )}

            {logout && (
              <Button
                onClick={logout}
                variant="destructive"
                className="px-6 bg-gradient-to-r from-red-500 to-red-600 text-white"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Encerrar sessão
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
