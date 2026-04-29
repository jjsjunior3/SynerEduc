// src/hooks/useSegmento.ts
import { useAuth } from '../contexts/AuthContext';

export function useSegmento() {
  const { usuario } = useAuth();

  const segmento = (usuario?.segmento ?? 'ead') as 'ead' | 'presencial';

  return {
    segmento,
    isEAD: segmento === 'ead',
    isPresencial: segmento === 'presencial',
    turno: usuario?.turno ?? null,
    nivel: usuario?.nivel ?? null,
  };
}