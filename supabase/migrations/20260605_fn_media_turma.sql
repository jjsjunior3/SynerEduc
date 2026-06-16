-- Retorna a média geral de todos os alunos de uma série/segmento.
-- SECURITY DEFINER: executa com permissões do owner, expõe apenas o agregado.
CREATE OR REPLACE FUNCTION public.get_media_turma(p_serie text, p_segmento text)
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT ROUND(AVG(n.media)::numeric, 1)
  FROM public.notas n
  JOIN public.users u ON u.id = n.user_id
  WHERE u.serie    = p_serie
    AND u.segmento = p_segmento
    AND u.tipo     = 'aluno'
    AND u.status   = 'ativo'
    AND n.media    IS NOT NULL
    AND n.media    > 0;
$$;

GRANT EXECUTE ON FUNCTION public.get_media_turma(text, text) TO authenticated;
