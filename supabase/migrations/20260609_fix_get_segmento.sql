-- Corrige get_segmento_usuario() para ler da tabela users em vez do JWT user_metadata
-- O JWT user_metadata pode nao conter segmento se o usuario foi criado antes desse campo existir,
-- causando retorno NULL e zerando todos os dados do coordenador no dashboard.

CREATE OR REPLACE FUNCTION public.get_segmento_usuario()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT segmento
  FROM public.users
  WHERE id = auth.uid()
  LIMIT 1;
$$;
