// src/hooks/usePresence.ts
import { useEffect, useRef } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { Usuario } from '../types/auth';

const HEARTBEAT_INTERVAL = 30_000; // 30 segundos
const SESSAO_TIMEOUT_MIN = 2;      // considera offline após 2min sem heartbeat

export function usePresence(usuario: Usuario | null) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const registradoRef = useRef(false);

  const registrarSessao = async () => {
    if (!usuario?.id) return;
    await supabase.from('sessoes_ativas').upsert({
      usuario_id: usuario.id,
      nome:       usuario.nome     || 'Usuário',
      tipo:       usuario.tipo     || 'aluno',
      segmento:   usuario.segmento || 'ead',
      last_seen:  new Date().toISOString(),
      entrou_em:  registradoRef.current ? undefined : new Date().toISOString(),
    }, { onConflict: 'usuario_id' });
    registradoRef.current = true;
  };

  const removerSessao = async () => {
    if (!usuario?.id) return;
    await supabase.from('sessoes_ativas').delete().eq('usuario_id', usuario.id);
    registradoRef.current = false;
  };

  useEffect(() => {
    if (!usuario?.id) return;

    // Registra imediatamente
    registrarSessao();

    // Heartbeat a cada 30s
    intervalRef.current = setInterval(registrarSessao, HEARTBEAT_INTERVAL);

    // Remove ao fechar a aba/janela
    const handleUnload = () => {
      removerSessao();
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener('beforeunload', handleUnload);
      removerSessao();
    };
  }, [usuario?.id]);
}

// ── Exporta função auxiliar para o dashboard admin ──
export async function contarOnline(): Promise<number> {
  const limite = new Date(Date.now() - SESSAO_TIMEOUT_MIN * 60_000).toISOString();
  const { count } = await supabase
    .from('sessoes_ativas')
    .select('*', { count: 'exact', head: true })
    .gte('last_seen', limite);
  return count ?? 0;
}

export async function listarOnline() {
  const limite = new Date(Date.now() - SESSAO_TIMEOUT_MIN * 60_000).toISOString();
  const { data } = await supabase
    .from('sessoes_ativas')
    .select('usuario_id, nome, tipo, segmento, entrou_em')
    .gte('last_seen', limite)
    .order('entrou_em', { ascending: false });
  return data ?? [];
}