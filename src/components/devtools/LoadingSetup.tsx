import { Loader2 } from 'lucide-react';
import { Card, CardContent } from './ui/card';

export function LoadingSetup() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <div className="mb-4">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Iniciando Sistema AVA
          </h2>
          <p className="text-sm text-gray-600">
            Verificando configuração do servidor...
          </p>
          <div className="mt-4 text-xs text-gray-500">
            Aguarde alguns segundos
          </div>
        </CardContent>
      </Card>
    </div>
  );
}