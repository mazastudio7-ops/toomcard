-- 미니홈 감성: 방명록 + TODAY/TOTAL. 여러 번 실행해도 안전하다.
--   · 방명록은 누구나 쓰지만, 카드 주인이 승인한 글만 공개된다 (스팸·악성 글 방지)
--   · 같은 기기에서 같은 페이지에 10분에 1개, 페이지당 하루 200개까지

create table if not exists public.tc_guestbook (
  id         bigint generated always as identity primary key,
  slug       text not null,
  name       text not null,
  body       text not null,
  device_id  text,
  status     text not null default 'pending' check (status in ('pending', 'approved', 'hidden')),
  created_at timestamptz not null default now()
);
create index if not exists tc_guestbook_slug_idx on public.tc_guestbook (slug, status, created_at desc);
alter table public.tc_guestbook enable row level security;

drop policy if exists "gb read approved" on public.tc_guestbook;
create policy "gb read approved" on public.tc_guestbook for select using (
  status = 'approved'
  or exists (select 1 from public.pods p where p.slug = tc_guestbook.slug and p.user_id = auth.uid())
);

-- 쓰기: 함수로만 (길이·속도 제한)
create or replace function public.tc_guestbook_write(p_slug text, p_name text, p_body text, p_device text)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_id bigint; n int;
begin
  if not exists (select 1 from public.pods where slug = p_slug) then raise exception 'no_card'; end if;
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_body), '') = '' then raise exception 'empty'; end if;
  select count(*) into n from public.tc_guestbook where slug = p_slug and device_id = p_device and created_at > now() - interval '10 minutes';
  if n >= 1 then raise exception 'gb_rate'; end if;
  select count(*) into n from public.tc_guestbook where slug = p_slug and created_at > now() - interval '1 day';
  if n >= 200 then raise exception 'gb_rate'; end if;
  insert into public.tc_guestbook (slug, name, body, device_id) values (p_slug, left(trim(p_name), 20), left(trim(p_body), 300), left(coalesce(p_device, ''), 64)) returning id into v_id;
  return v_id;
end $$;
grant execute on function public.tc_guestbook_write(text, text, text, text) to anon, authenticated;

-- 주인: 승인 / 숨기기
create or replace function public.tc_guestbook_set(p_id bigint, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare g public.tc_guestbook;
begin
  select * into g from public.tc_guestbook where id = p_id;
  if not found then raise exception 'not_found'; end if;
  if not (exists (select 1 from public.pods p where p.slug = g.slug and p.user_id = auth.uid()) or (position('/' in g.slug) > 0 and public.tc_company_can(split_part(g.slug, '/', 1)))) then raise exception 'not_allowed'; end if;
  if p_status not in ('approved', 'hidden', 'pending') then raise exception 'bad_status'; end if;
  update public.tc_guestbook set status = p_status where id = p_id;
end $$;
grant execute on function public.tc_guestbook_set(bigint, text) to authenticated;

-- TODAY / TOTAL (공개 숫자)
create or replace function public.tc_today_total(p_slug text, p_tz text default 'Asia/Seoul')
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'today', (select count(*) from public.page_views v where v.target_slug = p_slug
               and v.created_at >= (date_trunc('day', now() at time zone coalesce((select name from pg_timezone_names where name = p_tz), 'Asia/Seoul')) at time zone coalesce((select name from pg_timezone_names where name = p_tz), 'Asia/Seoul'))),
    'total', (select count(*) from public.page_views v where v.target_slug = p_slug)
  );
$$;
grant execute on function public.tc_today_total(text, text) to anon, authenticated;
