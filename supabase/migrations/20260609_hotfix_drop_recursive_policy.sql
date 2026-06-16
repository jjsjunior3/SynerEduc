-- HOTFIX CRÍTICO: Remove policies que causam recursão infinita na tabela users
-- "gestores le todos users" faz EXISTS (SELECT FROM public.users) dentro de
-- uma policy ON public.users → loop infinito → login quebrado para todos.

DROP POLICY IF EXISTS "gestores le todos users"  ON public.users;
DROP POLICY IF EXISTS "usuario le proprio perfil" ON public.users;
