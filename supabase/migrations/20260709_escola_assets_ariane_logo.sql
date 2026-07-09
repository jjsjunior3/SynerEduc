-- Onboarding Colégio Ariane: bucket dedicado para assets de marca (logo,
-- favicon, etc.) por escola, público (sem policy de listagem ampla, seguindo
-- a correção de segurança da mesma sessão -- getPublicUrl não depende de RLS
-- em bucket public:true).

insert into storage.buckets (id, name, public)
values ('escola-assets', 'escola-assets', true)
on conflict (id) do nothing;

-- Upload dos arquivos logo-ariane-light.png e logo-ariane-dark.png feito
-- manualmente pelo painel do Supabase (sem credencial de service role
-- disponível na sessão do agente). Fontes versionadas em
-- public/logo-ariane-{light,dark}.png.

update public.escola_config
set logo_url = 'https://dunfxnfqaaixwjxvlzny.supabase.co/storage/v1/object/public/escola-assets/logo-ariane-light.png'
where dominio = 'colegioariane.com.br';
