// src/hooks/usePresence.ts
import { useEffect, useRef } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { Usuario } from '../types/auth';

export function usePresence(usuario: Usuario | null) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const iniciandoRef = useRef(false);

  useEffect(() => {
    if (!usuario?.id) return;

    // Evita criar canal duplicado (StrictMode monta 2x em dev)
    if (channelRef.current || iniciandoRef.current) return;
    iniciandoRef.current = true;

    const iniciar = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { iniciandoRef.current = false; return; }

        // Se já foi criado enquanto aguardava getUser, sai
        if (channelRef.current) { iniciandoRef.current = false; return; }

        const canal = supabase.channel('presenca_global', {
          config: {
            presence: { key: user.id },
          },
        });

        canal.subscribe(async (status) => {
          console.log('[usePresence] status:', status);
          if (status === 'SUBSCRIBED') {
            try {
              await canal.track({
                nome:      usuario.nome     || 'Usuário',
                tipo:      usuario.tipo     || 'aluno',
                segmento:  usuario.segmento || 'ead',
                entrou_em: new Date().toISOString(),
              });
              console.log('[usePresence] track enviado');
            } catch (e) {
              console.warn('[usePresence] erro no track:', e);
            }
          }
          if (status === 'CHANNEL_ERROR') {
            console.warn('[usePresence] CHANNEL_ERROR — verifique RLS policies do Realtime');
          }
        });

        channelRef.current = canal;
        iniciandoRef.current = false;
      } catch (e) {
        console.warn('[usePresence] erro ao criar canal:', e);
        iniciandoRef.current = false;
      }
    };

    iniciar();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      iniciandoRef.current = false;
    };
  }, [usuario?.id]);
}