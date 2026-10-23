-- 기업 대시보드: 회사 · 회사 관리자 · 구성원 카드.
-- 구성원 카드 주소는 toomcard.com/<회사>/<이름> (두 단계). 회사 관리자는 이메일(구글 로그인)로 식별한다.
-- 구성원이 그 이메일로 로그인하면 기존 tc_claim_pods() 가 카드를 자동으로 연결해 준다.
-- 투머스 관리자(tc_admins)는 모든 회사를 관리할 수 있다. 여러 번 실행해도 안전하다.

-- 0) 회사 관리자가 만드는 카드는 주소 규칙(글자/이름)을 건너뛴다 (함수 안에서만 켜지는 표시)
create or replace function public.tc_pod_slug_rule() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if coalesce(current_setting('tc.bypass_slug_rule', true), '') = 'on' then return new; end if;
  if public.tc_is_admin() then return new; end if;
  if exists (select 1 from public.pods p where p.slug = new.slug and p.user_id = auth.uid()) then return new; end if;
  if new.slug !~ '^[a-z]/[a-z0-9_가-힣-]{1,40}$' then
    raise exception 'slug_namespace: free cards use a/name' using errcode = 'check_violation';
  end if;
  return new;
end $$;

-- 1) 표 (API 로는 직접 못 읽고, 아래 함수로만 다룬다)
create table if not exists public.tc_companies (
  slug        text primary key check (slug ~ '^[a-z0-9][a-z0-9-]{1,30}$'),
  name        text not null,
  brand_color text not null default '#3b1a6e',
  created_at  timestamptz not null default now()
);
create table if not exists public.tc_company_admins (
  company_slug text not null references public.tc_companies(slug) on delete cascade on update cascade,
  email        text not null,
  primary key (company_slug, email)
);
create table if not exists public.tc_company_members (
  company_slug text not null references public.tc_companies(slug) on delete cascade on update cascade,
  member_slug  text not null,
  email        text not null,
  name         text not null,
  role         text,
  created_at   timestamptz not null default now(),
  primary key (company_slug, member_slug)
);
alter table public.tc_companies enable row level security;
alter table public.tc_company_admins enable row level security;
alter table public.tc_company_members enable row level security;

-- 2) 권한 도우미
create or replace function public.tc_jwt_email() returns text
language sql stable as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

create or replace function public.tc_company_can(p_company text) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    public.tc_is_admin()
    or exists (select 1 from public.tc_company_admins a where a.company_slug = p_company and lower(a.email) = public.tc_jwt_email())
  );
$$;

-- 3) 내가 관리하는 회사들
create or replace function public.tc_company_my()
returns table (slug text, name text, brand_color text, is_platform_admin boolean)
language sql stable security definer set search_path = public as $$
  select c.slug, c.name, c.brand_color, public.tc_is_admin()
  from public.tc_companies c where public.tc_company_can(c.slug) order by c.name;
$$;

-- 4) 회사 만들기 (투머스 관리자만): 회사 관리자 이메일 1명 지정
create or replace function public.tc_company_create(p_slug text, p_name text, p_admin_email text, p_color text default '#3b1a6e')
returns text language plpgsql security definer set search_path = public as $$
declare v_slug text := lower(trim(p_slug));
begin
  if not public.tc_is_admin() then raise exception 'not_admin'; end if;
  if v_slug !~ '^[a-z0-9][a-z0-9-]{1,30}$' then raise exception 'bad_slug'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'name_required'; end if;
  if exists (select 1 from public.pods where split_part(slug, '/', 1) = v_slug and position('/' in slug) = 0) then raise exception 'slug_taken'; end if;
  insert into public.tc_companies (slug, name, brand_color) values (v_slug, trim(p_name), coalesce(nullif(p_color, ''), '#3b1a6e'));
  if coalesce(trim(p_admin_email), '') <> '' then
    insert into public.tc_company_admins (company_slug, email) values (v_slug, lower(trim(p_admin_email))) on conflict do nothing;
  end if;
  return v_slug;
end $$;

create or replace function public.tc_company_add_admin(p_company text, p_email text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.tc_company_can(p_company) then raise exception 'not_allowed'; end if;
  if position('@' in coalesce(p_email, '')) = 0 then raise exception 'bad_email'; end if;
  insert into public.tc_company_admins (company_slug, email) values (p_company, lower(trim(p_email))) on conflict do nothing;
end $$;

create or replace function public.tc_company_update(p_company text, p_name text, p_color text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.tc_company_can(p_company) then raise exception 'not_allowed'; end if;
  update public.tc_companies set name = coalesce(nullif(trim(p_name), ''), name), brand_color = coalesce(nullif(p_color, ''), brand_color) where slug = p_company;
end $$;

-- 5) 구성원 목록 (카드 연결 여부 · 조회수)
create or replace function public.tc_company_list(p_company text)
returns table (member_slug text, name text, role text, email text, pod_slug text, claimed boolean, views bigint, has_photo boolean, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.tc_company_can(p_company) then raise exception 'not_allowed'; end if;
  return query
    select m.member_slug, m.name, m.role, m.email, p.slug, (p.user_id is not null),
      (select count(*) from public.page_views v where v.target_slug = p.slug),
      coalesce(p.components_json -> 'card' -> 'front' -> 'bg' ->> 'type', '') = 'image',
      m.created_at
    from public.tc_company_members m
    left join public.pods p on p.slug = m.company_slug || '/' || m.member_slug
    where m.company_slug = p_company
    order by m.created_at;
end $$;

-- 6) 구성원 추가: 회사 이름·색이 들어간 기본 카드를 만들고, 그 이메일로 로그인하면 본인에게 연결된다
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
    'front', jsonb_build_object('bg', jsonb_build_object('type', 'color', 'color', c.brand_color, 'shade', 0, 'soft', true),
      'text', jsonb_build_object('layout', 'bottom-center', 'showLogo', false, 'tone', 'auto'), 'finish', 'metal', 'qr', 'off', 'look', 'clean', 'frame', 'full'),
    'emblem', jsonb_build_object('on', true, 'source', 'initials', 'text', '', 'material', 'gold', 'shape', 'coin', 'motion', 'sweep'),
    'socials', '[]'::jsonb, 'links', '[]'::jsonb, 'moatTags', '[]'::jsonb,
    'privacy', jsonb_build_object('phone', false, 'email', false), 'star', jsonb_build_object('on', false, 'tag', ''));
  perform set_config('tc.bypass_slug_rule', 'on', true);
  insert into public.pods (user_id, slug, components_json) values (v_uid, v_pod, v_card || jsonb_build_object('card', v_card));
  perform set_config('tc.bypass_slug_rule', 'off', true);
  if v_uid is null then
    insert into public.tc_pod_claims (slug, owner_email) values (v_pod, v_email) on conflict (slug) do update set owner_email = excluded.owner_email;
  end if;
  insert into public.tc_company_members (company_slug, member_slug, email, name, role) values (p_company, v_slug, v_email, trim(p_name), nullif(trim(p_role), ''));
  return v_pod;
end $$;

create or replace function public.tc_company_remove_member(p_company text, p_member_slug text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.tc_company_can(p_company) then raise exception 'not_allowed'; end if;
  delete from public.pods where slug = p_company || '/' || p_member_slug;
  delete from public.tc_company_members where company_slug = p_company and member_slug = p_member_slug;
end $$;

grant execute on function public.tc_company_my() to authenticated;
grant execute on function public.tc_company_create(text, text, text, text) to authenticated;
grant execute on function public.tc_company_add_admin(text, text) to authenticated;
grant execute on function public.tc_company_update(text, text, text) to authenticated;
grant execute on function public.tc_company_list(text) to authenticated;
grant execute on function public.tc_company_add_member(text, text, text, text, text) to authenticated;
grant execute on function public.tc_company_remove_member(text, text) to authenticated;
revoke execute on function public.tc_company_can(text) from anon;
