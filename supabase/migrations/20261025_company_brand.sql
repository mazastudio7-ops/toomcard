-- 회사 브랜드: 로고(logo_url)와 카드 앞면 이미지(plate_url)를 회사에 저장해 두면,
-- 새로 추가하는 구성원 카드가 그 로고와 앞면을 자동으로 쓴다. 주소는 /assets/… 또는 https://… 만 허용한다.
-- 20261025_company.sql 다음에 한 번 실행한다. 여러 번 실행해도 안전하다.

alter table public.tc_companies add column if not exists logo_url text;
alter table public.tc_companies add column if not exists plate_url text;

drop function if exists public.tc_company_my();
create or replace function public.tc_company_my()
returns table (slug text, name text, brand_color text, is_platform_admin boolean, logo_url text, plate_url text)
language sql stable security definer set search_path = public as $$
  select c.slug, c.name, c.brand_color, public.tc_is_admin(), c.logo_url, c.plate_url
  from public.tc_companies c where public.tc_company_can(c.slug) order by c.name;
$$;
grant execute on function public.tc_company_my() to authenticated;

drop function if exists public.tc_company_update(text, text, text);
create or replace function public.tc_company_update(p_company text, p_name text, p_color text, p_logo text default null, p_plate text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.tc_company_can(p_company) then raise exception 'not_allowed'; end if;
  if coalesce(p_logo, '') <> '' and p_logo !~ '^(/assets/|https://)[^ ]+$' then raise exception 'bad_url'; end if;
  if coalesce(p_plate, '') <> '' and p_plate !~ '^(/assets/|https://)[^ ]+$' then raise exception 'bad_url'; end if;
  update public.tc_companies set
    name = coalesce(nullif(trim(p_name), ''), name),
    brand_color = coalesce(nullif(p_color, ''), brand_color),
    logo_url = nullif(trim(coalesce(p_logo, '')), ''),
    plate_url = nullif(trim(coalesce(p_plate, '')), '')
  where slug = p_company;
end $$;
grant execute on function public.tc_company_update(text, text, text, text, text) to authenticated;

-- 구성원 추가: 회사 로고·앞면 이미지가 있으면 그것을 쓰고, 없으면 회사 색 + 이니셜 엠블럼
create or replace function public.tc_company_add_member(p_company text, p_name text, p_role text, p_email text, p_member_slug text)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare
  c public.tc_companies;
  v_slug text := lower(trim(coalesce(p_member_slug, '')));
  v_email text := lower(trim(coalesce(p_email, '')));
  v_pod text;
  v_uid uuid;
  v_card jsonb;
begin
  if not public.tc_company_can(p_company) then raise exception 'not_allowed'; end if;
  select * into c from public.tc_companies where slug = p_company;
  if not found then raise exception 'no_company'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'name_required'; end if;
  if position('@' in v_email) = 0 then raise exception 'bad_email'; end if;
  if v_slug !~ '^[a-z0-9_가-힣-]{1,40}$' then raise exception 'bad_slug'; end if;
  v_pod := p_company || '/' || v_slug;
  if exists (select 1 from public.pods where lower(slug) = lower(v_pod)) then raise exception 'slug_taken'; end if;
  select id into v_uid from auth.users where lower(email) = v_email limit 1;
  v_card := jsonb_build_object(
    'id', v_pod, 'slug', v_pod, 'kind', 'business', 'name', trim(p_name), 'role', coalesce(trim(p_role), ''), 'company', c.name,
    'email', v_email, 'phone', '', 'slogan', '', 'theme', 'obsidian', 'layout', 'plate',
    'vcard', jsonb_build_object('firstName', trim(p_name), 'lastName', '', 'formattedName', trim(p_name), 'org', c.name, 'title', coalesce(trim(p_role), ''), 'tel', '', 'email', v_email, 'url', ''),
    'front', jsonb_build_object(
      'bg', case when c.plate_url is not null then jsonb_build_object('type', 'image', 'src', c.plate_url, 'x', 50, 'y', 50, 'zoom', 1)
                 else jsonb_build_object('type', 'color', 'color', c.brand_color, 'shade', 0, 'soft', true) end,
      'text', jsonb_build_object('layout', case when c.plate_url is not null then 'none' else 'bottom-center' end, 'showLogo', false, 'tone', 'auto'),
      'finish', 'metal', 'qr', 'off', 'look', 'clean', 'frame', 'full'),
    'emblem', jsonb_build_object('on', c.logo_url is null, 'source', 'initials', 'text', '', 'material', 'gold', 'shape', 'coin', 'motion', 'sweep'),
    'socials', '[]'::jsonb, 'links', '[]'::jsonb, 'moatTags', '[]'::jsonb,
    'privacy', jsonb_build_object('phone', false, 'email', false), 'star', jsonb_build_object('on', false, 'tag', ''));
  if c.plate_url is not null then v_card := v_card || jsonb_build_object('plateCardImage', c.plate_url); end if;
  if c.logo_url is not null then v_card := v_card || jsonb_build_object('logo', jsonb_build_object('src', c.logo_url, 'alt', c.name || ' Logo'), 'avatar', c.logo_url); end if;
  perform set_config('tc.bypass_slug_rule', 'on', true);
  insert into public.pods (user_id, slug, components_json) values (v_uid, v_pod, v_card || jsonb_build_object('card', v_card));
  perform set_config('tc.bypass_slug_rule', 'off', true);
  if v_uid is null then
    insert into public.tc_pod_claims (slug, owner_email) values (v_pod, v_email) on conflict (slug) do update set owner_email = excluded.owner_email;
  end if;
  insert into public.tc_company_members (company_slug, member_slug, email, name, role) values (p_company, v_slug, v_email, trim(p_name), nullif(trim(p_role), ''));
  return v_pod;
end $$;
grant execute on function public.tc_company_add_member(text, text, text, text, text) to authenticated;

-- MAZA STUDIO 는 마자 플레이트와 MAZA 로고를 쓴다 (이미 만든 회사가 있을 때만 적용)
update public.tc_companies set logo_url = '/assets/logo_maza_mark.webp', plate_url = '/assets/maza_front_plate.jpg', brand_color = '#7c3aed' where slug = 'maza-studio';
