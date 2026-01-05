// src/components/Forum.tsx
/**
 * Componente placeholder para o Fórum, indicando que está em desenvolvimento.
 * Será substituído pela funcionalidade completa do fórum no futuro.
 */

import { Info } from 'lucide-react';
import { Card, CardContent } from './ui/card'; // Assumindo que você tem os componentes UI de shadcn/ui

interface ForumProps {
  // As props que o DisciplinaPage.tsx espera, mesmo que não sejam usadas agora
  onVoltar: () => void;
  disciplina: { id: string; nome: string; cor: string };
  serie: { id: string; nome: string };
  turma: { id: string; nome: string };
}

export function Forum({ onVoltar, disciplina, serie, turma }: ForumProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-md text-center shadow-lg dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="p-6 flex flex-col items-center justify-center">
          <Info className="w-12 h-12 text-blue-500 dark:text-blue-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Fórum em Desenvolvimento
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            A funcionalidade de Fórum para a disciplina de **{disciplina.nome}** está sendo construída e estará disponível em breve!
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Agradecemos a sua paciência.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
