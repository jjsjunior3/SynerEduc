CREATE OR REPLACE FUNCTION fn_atualizar_media()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_segmento  text;
  v_menor     numeric;
  v_maior     numeric;
BEGIN
  v_segmento := COALESCE(NEW.segmento, 'ead');

  -- Calcula média bruta
  IF v_segmento = 'presencial' AND NEW.av3 IS NOT NULL THEN
    NEW.media := ROUND((COALESCE(NEW.av1, 0) + COALESCE(NEW.av2, 0) + COALESCE(NEW.av3, 0)) / 3, 2);
  ELSE
    NEW.media := ROUND((COALESCE(NEW.av1, 0) + COALESCE(NEW.av2, 0)) / 2, 2);
  END IF;

  -- Calcula média final (com recuperação)
  IF NEW.recuperacao IS NOT NULL AND NEW.recuperacao > 0 THEN
    IF v_segmento = 'presencial' THEN
      -- Presencial: REC substitui a média do bimestre diretamente
      NEW.media_final := NEW.recuperacao;
    ELSE
      -- EAD: REC substitui a menor entre AV1 e AV2
      v_menor := LEAST(COALESCE(NEW.av1, 0), COALESCE(NEW.av2, 0));
      v_maior := GREATEST(COALESCE(NEW.av1, 0), COALESCE(NEW.av2, 0));
      IF NEW.recuperacao > v_menor THEN
        NEW.media_final := ROUND((v_maior + NEW.recuperacao) / 2, 2);
      ELSE
        NEW.media_final := NEW.media;
      END IF;
    END IF;
  ELSE
    NEW.media_final := NEW.media;
  END IF;

  -- Status final
  NEW.status_final := CASE
    WHEN NEW.recuperacao IS NOT NULL AND NEW.recuperacao > 0 THEN
      CASE WHEN NEW.media_final >= 7 THEN 'aprovado' ELSE 'reprovado' END
    ELSE
      CASE
        WHEN NEW.media_final >= 7 THEN 'aprovado'
        WHEN NEW.media_final >= 5 THEN 'recuperacao'
        ELSE 'reprovado'
      END
  END;

  NEW.atualizado_em := NOW();
  RETURN NEW;
END;
$$;
