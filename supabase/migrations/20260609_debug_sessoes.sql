-- Debug: tenta o upsert exato que o PostgREST faz, como role authenticated
-- Verifica se há alguma exception no processo

DO $$
DECLARE
  v_error TEXT;
BEGIN
  -- Simula o que o PostgREST faz
  INSERT INTO public.sessoes_ativas (usuario_id, nome, tipo, segmento, last_seen)
  VALUES (
    'ac9cb456-3cfa-4cdb-997d-b28deb7d0eb2'::uuid,
    'Teste Debug',
    'coordenador',
    'ead',
    now()
  )
  ON CONFLICT (usuario_id)
  DO UPDATE SET
    nome      = EXCLUDED.nome,
    tipo      = EXCLUDED.tipo,
    segmento  = EXCLUDED.segmento,
    last_seen = EXCLUDED.last_seen;

  RAISE NOTICE 'Upsert OK';
EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS v_error = MESSAGE_TEXT;
  RAISE NOTICE 'ERRO: %', v_error;
END;
$$;
