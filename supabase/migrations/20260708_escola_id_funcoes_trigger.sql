-- F1.1 Multi-tenant — get_escola_usuario() espelhando get_segmento_usuario() (mesmo
-- fallback em 4 camadas: user_metadata JWT -> app_metadata JWT -> auth.users raw_user_meta_data
-- -> auth.users raw_app_meta_data), e extensão de sync_user_metadata() para propagar
-- escola_id de public.users para o JWT junto com tipo e segmento.

create or replace function public.get_escola_usuario()
returns uuid
language plpgsql
stable security definer
set search_path to 'public', 'auth'
as $function$
declare
  v_escola_id uuid;
begin
  -- 1. Tenta user_metadata do JWT (rápido, sem query)
  v_escola_id := (auth.jwt() -> 'user_metadata' ->> 'escola_id')::uuid;
  if v_escola_id is not null then
    return v_escola_id;
  end if;

  -- 2. Tenta app_metadata do JWT
  v_escola_id := (auth.jwt() -> 'app_metadata' ->> 'escola_id')::uuid;
  if v_escola_id is not null then
    return v_escola_id;
  end if;

  -- 3. Lê direto de auth.users (sem RLS, sem recursão)
  select (raw_user_meta_data ->> 'escola_id')::uuid
  into   v_escola_id
  from   auth.users
  where  id = auth.uid();

  if v_escola_id is not null then
    return v_escola_id;
  end if;

  -- 4. Lê app_metadata de auth.users
  select (raw_app_meta_data ->> 'escola_id')::uuid
  into   v_escola_id
  from   auth.users
  where  id = auth.uid();

  return v_escola_id;  -- pode ser NULL se nunca foi preenchido
end;
$function$;

-- Estende o trigger existente (dispara em INSERT/UPDATE de public.users) para também
-- propagar escola_id, junto com tipo e segmento que já propagava.
create or replace function public.sync_user_metadata()
returns trigger
language plpgsql
security definer
as $function$
begin
  update auth.users
  set raw_user_meta_data = raw_user_meta_data ||
    jsonb_build_object(
      'tipo',      new.tipo,
      'segmento',  new.segmento,
      'escola_id', new.escola_id
    )
  where id = new.id;
  return new;
end;
$function$;

-- Backfill imediato: propaga escola_id de todos os usuários já existentes para o JWT
-- (o trigger só dispara em INSERT/UPDATE futuros; sem isso, sessões atuais ficariam
-- sem escola_id até a próxima atualização de perfil).
update auth.users au
set raw_user_meta_data = au.raw_user_meta_data ||
  jsonb_build_object('escola_id', pu.escola_id)
from public.users pu
where au.id = pu.id;
