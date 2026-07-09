// src/hooks/useEscola.ts
import { useAuth } from '../contexts/AuthContext';

export function useEscola() {
  const { usuario } = useAuth();

  return {
    escolaId: usuario?.escolaId ?? null,
  };
}
