---
title: "[BUG-B001] fn_atualizar_media: fórmula errada para segmento Presencial (ignora AV3)"
labels: bug, critical, backend, notas
---

## Descrição

O trigger `fn_atualizar_media` na tabela `notas` calcula a média usando apenas `(AV1 + AV2) / 2` para **todos** os alunos, independente do segmento. Alunos do Presencial têm 3 avaliações (AV1, AV2, AV3) e a fórmula correta é `(AV1 + AV2 + AV3) / 3`.

Além disso, a recuperação é aplicada incorretamente: o código atual define `media_final = recuperacao` diretamente, quando a regra correta é substituir apenas a **menor nota** e só se `REC > menor nota`.

## Código atual (problemático)

```sql
BEGIN
  NEW.media := ROUND((COALESCE(NEW.av1,0) + COALESCE(NEW.av2,0)) / 2, 2);
  -- ↑ ignora AV3 completamente

  IF NEW.recuperacao IS NOT NULL THEN
    NEW.media_final := NEW.recuperacao;  -- ← errado: não substitui menor nota
  ELSE
    NEW.media_final := NEW.media;
  END IF;
  ...
END;
```

## Impacto

- Médias de alunos presenciais armazenadas erradas no banco
- O front-end (`calcularNota` em `src/utils/calculoNotas.ts`) calcula certo, mas o banco discorda
- `vw_boletim` (view) retorna `media` e `media_final` do banco → exibe valor incorreto para Presencial
- Recuperação mal calculada para ambos os segmentos

## Correção — SQL a executar no Supabase Dashboard

```sql
CREATE OR REPLACE FUNCTION fn_atualizar_media()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_segmento text;
  v_menor    numeric;
  v_maior    numeric;
BEGIN
  v_segmento := COALESCE(NEW.segmento, 'ead');

  -- 1. Calcula média sem recuperação
  IF v_segmento = 'presencial' AND NEW.av3 IS NOT NULL THEN
    NEW.media := ROUND(
      (COALESCE(NEW.av1,0) + COALESCE(NEW.av2,0) + COALESCE(NEW.av3,0)) / 3, 2
    );
  ELSE
    NEW.media := ROUND(
      (COALESCE(NEW.av1,0) + COALESCE(NEW.av2,0)) / 2, 2
    );
  END IF;

  -- 2. Aplica recuperação (substitui a menor nota, só se REC > menor)
  IF NEW.recuperacao IS NOT NULL AND NEW.recuperacao > 0 THEN
    IF v_segmento = 'presencial' AND NEW.av3 IS NOT NULL THEN
      -- Presencial: menor das 3 notas
      v_menor := LEAST(COALESCE(NEW.av1,0), COALESCE(NEW.av2,0), COALESCE(NEW.av3,0));
      IF NEW.recuperacao > v_menor THEN
        -- Substitui a menor pelas notas ordenadas
        NEW.media_final := ROUND((
          GREATEST(COALESCE(NEW.av1,0), COALESCE(NEW.av2,0), COALESCE(NEW.av3,0)) +
          -- nota do meio
          (COALESCE(NEW.av1,0) + COALESCE(NEW.av2,0) + COALESCE(NEW.av3,0) - v_menor -
           GREATEST(COALESCE(NEW.av1,0), COALESCE(NEW.av2,0), COALESCE(NEW.av3,0))) +
          NEW.recuperacao
        ) / 3, 2);
      ELSE
        NEW.media_final := NEW.media;
      END IF;
    ELSE
      -- EAD: menor das 2 notas
      v_menor := LEAST(COALESCE(NEW.av1,0), COALESCE(NEW.av2,0));
      v_maior := GREATEST(COALESCE(NEW.av1,0), COALESCE(NEW.av2,0));
      IF NEW.recuperacao > v_menor THEN
        NEW.media_final := ROUND((v_maior + NEW.recuperacao) / 2, 2);
      ELSE
        NEW.media_final := NEW.media;
      END IF;
    END IF;
  ELSE
    NEW.media_final := NEW.media;
  END IF;

  -- 3. Situação final
  NEW.status_final := CASE
    WHEN NEW.recuperacao IS NOT NULL AND NEW.recuperacao > 0 THEN
      -- Após REC: só aprovado ou reprovado (sem nova recuperação)
      CASE WHEN NEW.media_final >= 7 THEN 'aprovado' ELSE 'reprovado' END
    ELSE
      -- Sem REC: aprovado / recuperacao / reprovado
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
```

## Risco de aplicação

🟡 **Médio** — A mudança afeta apenas notas salvas **após** a correção. Notas já existentes com média errada precisam ser recalculadas com um UPDATE posterior (opcional, mas recomendado fora do horário de pico):

```sql
-- Recalcular médias existentes (executar após substituir o trigger)
UPDATE notas SET atualizado_em = NOW()
WHERE segmento = 'presencial' AND av3 IS NOT NULL;
-- Isso dispara o trigger corrigido para todas as notas presenciais com AV3
```

## Recomendação de execução

Aplicar **fora do horário de maior uso** (após as 22h). O front continua exibindo correto independente, pois usa `calcularNota()` local.
