-- 아이디 체계 정리: 글자 칸(a/, b/) 없이 toomcard.com/아이디 하나로 간다 (인스타그램처럼).
--   · 아이디: 영문 소문자·숫자·점(.)만, 5~20자. 하이픈·밑줄은 새 아이디에 쓰지 않는다.
--   · 겹치면 숫자를 붙인 아이디를 추천한다 (화면에서).
--   · 브랜드·골드 아이디는 예약 목록(tc_reserved_slugs)에 두고 관리자만 쓴다.
--   · 이미 있는 a/아이디 카드는 toomcard.com/아이디 로 옮기고, 옛 주소는 자동으로 넘어간다.
-- 여러 번 실행해도 안전하다.

create table if not exists public.tc_reserved_slugs (slug text primary key, note text);
alter table public.tc_reserved_slugs enable row level security;
drop policy if exists "reserved read" on public.tc_reserved_slugs;
create policy "reserved read" on public.tc_reserved_slugs for select using (true);
insert into public.tc_reserved_slugs (slug, note) values
  ('toomcard','brand'),('toomus','brand'),('maza','brand'),('setupod','brand'),('ezenstar','brand'),('ezen','brand'),
  ('admin','system'),('api','system'),('dashboard','system'),('maker','system'),('team','system'),('login','system'),('card','system'),('cards','system'),
  ('assets','system'),('terms','system'),('privacy','system'),('manifest','system'),('find','system'),('page','system'),('star','system'),('stars','system'),
  ('insurance','gold'),('realestate','gold'),('lawyer','gold'),('doctor','gold'),('hospital','gold'),('pension','gold'),('hotel','gold'),('coffee','gold'),('beauty','gold'),('wedding','gold'),('korea','gold'),('seoul','gold'),('busan','gold')
on conflict (slug) do nothing;

-- 아이디 규칙 (삽입)
create or replace function public.tc_pod_slug_rule() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;            -- SQL 편집기 · 서버 작업
  if public.tc_is_admin() then return new; end if;           -- 관리자는 예약 아이디·짧은 아이디도 가능
  if exists (select 1 from public.pods p where p.slug = new.slug and p.user_id = auth.uid()) then return new; end if;   -- 자기 카드 수정
  if new.slug ~ '^[a-z]/[a-z0-9._-]{1,40}$' then return new; end if;        -- 예전 글자 주소는 계속 허용 (이미 받은 링크)
  if new.slug !~ '^[a-z0-9.]{5,20}$' or new.slug ~ '^\.' or new.slug ~ '\.$' or new.slug ~ '\.\.' then
    raise exception 'slug_namespace: id must be 5-20 chars of a-z 0-9 .' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.tc_reserved_slugs r where r.slug = new.slug) then
    raise exception 'slug_reserved' using errcode = 'check_violation';
  end if;
  return new;
end $$;
drop trigger if exists tc_pod_slug_rule on public.pods;
create trigger tc_pod_slug_rule before insert on public.pods for each row execute function public.tc_pod_slug_rule();

-- 아이디 바꾸기 (같은 규칙)
create or replace function public.tc_rename_pod(p_old text, p_new text) returns text
language plpgsql security definer set search_path = public as $$
declare v_new text := lower(trim(coalesce(p_new, '')));
begin
  if auth.uid() is null then raise exception 'login_required'; end if;
  if not exists (select 1 from public.pods where slug = p_old and user_id = auth.uid()) then raise exception 'not_owner'; end if;
  if v_new = '' or v_new = lower(p_old) then return p_old; end if;
  if not public.tc_is_admin() then
    if v_new !~ '^[a-z0-9.]{5,20}$' or v_new ~ '^\.' or v_new ~ '\.$' or v_new ~ '\.\.' then raise exception 'slug_namespace'; end if;
    if exists (select 1 from public.tc_reserved_slugs r where r.slug = v_new) then raise exception 'slug_reserved'; end if;
  end if;
  if exists (select 1 from public.pods where lower(slug) = v_new) then raise exception 'slug_taken'; end if;
  update public.pods set slug = v_new, updated_at = now(),
    components_json = case when components_json ? 'card'
      then jsonb_set(jsonb_set(components_json, '{card,slug}', to_jsonb(v_new), true), '{card,id}', to_jsonb(v_new), true)
      else components_json end
    where slug = p_old;
  update public.page_views set target_slug = v_new where target_slug = p_old;
  update public.profiles set slug = v_new where id = auth.uid() and slug = p_old;
  insert into public.tc_slug_alias (old_slug, new_slug) values (p_old, v_new) on conflict (old_slug) do update set new_slug = excluded.new_slug;
  update public.tc_slug_alias set new_slug = v_new where new_slug = p_old;   -- 예전 별칭도 최종 주소를 가리키게
  return v_new;
end $$;
grant execute on function public.tc_rename_pod(text, text) to authenticated;

-- 기존 a/아이디 카드를 맨 앞 주소로 옮긴다 (규칙에 맞고 비어 있을 때만)
do $$
declare m record; v_new text;
begin
  perform set_config('tc.bypass_slug_rule', 'on', true);
  for m in select slug from public.pods where slug ~ '^[a-z]/[a-z0-9._-]+$' loop
    v_new := split_part(m.slug, '/', 2);
    continue when v_new !~ '^[a-z0-9.]{5,20}$';
    continue when exists (select 1 from public.pods where lower(slug) = v_new);
    continue when exists (select 1 from public.tc_reserved_slugs where slug = v_new);
    update public.pods set slug = v_new,
      components_json = jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(components_json,
        '{slug}', to_jsonb(v_new), false), '{id}', to_jsonb(v_new), false),
        '{card,slug}', to_jsonb(v_new), false), '{card,id}', to_jsonb(v_new), false),
        '{vcard,url}', to_jsonb('https://toomcard.com/' || v_new), false), '{card,vcard,url}', to_jsonb('https://toomcard.com/' || v_new), false)
      where slug = m.slug;
    update public.page_views set target_slug = v_new where target_slug = m.slug;
    insert into public.tc_slug_alias (old_slug, new_slug) values (m.slug, v_new) on conflict (old_slug) do update set new_slug = excluded.new_slug;
    update public.tc_slug_alias set new_slug = v_new where new_slug = m.slug;
  end loop;
  perform set_config('tc.bypass_slug_rule', 'off', true);
end $$;
