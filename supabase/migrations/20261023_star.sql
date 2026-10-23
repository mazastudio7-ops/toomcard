-- ─────────────────────────────────────────────────────────────
-- 스타(자랑 피드) 1단계: 좋아요 · 링크 클릭 · 신고 · 검토 · 비공개 항목
-- docs/STAR.md 의 4·5·5-1·5-2 절을 구현한다.
--
-- 적용: Supabase 대시보드 → SQL Editor → 이 파일 전체를 붙여넣고 Run.
-- 여러 번 실행해도 안전하도록 if not exists / or replace 로 썼다.
-- 기존 표(pods, profiles, page_views, leads)는 구조를 바꾸지 않는다.
-- ─────────────────────────────────────────────────────────────

create extension if not exists pgcrypto with schema extensions;

-- 0. 관리자 (스타 검토 화면을 쓸 수 있는 사람)
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
drop policy if exists "admins read self" on public.admins;
create policy "admins read self" on public.admins for select using (auth.uid() = user_id);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- 1. 비공개 항목 (전화 · 이메일 등) — pods 와 분리. 본인만 읽고 쓴다.
--    명함 링크(/slug?k=share_key)로 들어온 사람에게만 서버 함수가 내려준다.
create table if not exists public.pod_private (
  slug       text primary key references public.pods(slug) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  share_key  text not null default encode(extensions.gen_random_bytes(8), 'hex'),
  updated_at timestamptz not null default now()
);
alter table public.pod_private enable row level security;
drop policy if exists "owner manages private" on public.pod_private;
create policy "owner manages private" on public.pod_private
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.get_private_card(p_slug text, p_key text)
returns jsonb language sql stable security definer set search_path = public as $$
  select data from public.pod_private
  where slug = p_slug and share_key = p_key and length(coalesce(p_key, '')) >= 8;
$$;

-- 2. 좋아요 (로그인 없이, 기기당 카드 한 번)
create table if not exists public.star_likes (
  id         bigint generated always as identity primary key,
  slug       text not null references public.pods(slug) on delete cascade,
  device_id  text not null check (length(device_id) between 8 and 64),
  created_at timestamptz not null default now(),
  unique (slug, device_id)
);
create index if not exists star_likes_slug_time on public.star_likes (slug, created_at desc);
alter table public.star_likes enable row level security;
drop policy if exists "anyone likes" on public.star_likes;
create policy "anyone likes" on public.star_likes for insert with check (true);
-- 읽기 정책 없음: 숫자는 아래 함수로만 공개

-- 같은 기기가 1분에 30개 넘게 누르면 막는다
create or replace function public.star_like_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.star_likes
      where device_id = new.device_id and created_at > now() - interval '1 minute') >= 30 then
    raise exception 'too many likes';
  end if;
  return new;
end $$;
drop trigger if exists star_like_guard on public.star_likes;
create trigger star_like_guard before insert on public.star_likes
  for each row execute function public.star_like_guard();

create or replace function public.star_like_count(p_slug text)
returns bigint language sql stable security definer set search_path = public as $$
  select count(*) from public.star_likes where slug = p_slug;
$$;

create or replace function public.star_liked(p_slug text, p_device text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.star_likes where slug = p_slug and device_id = p_device);
$$;

-- 3. 링크 클릭 (내 홍보 성과)
create table if not exists public.link_clicks (
  id         bigint generated always as identity primary key,
  slug       text not null references public.pods(slug) on delete cascade,
  kind       text not null check (length(kind) between 1 and 32),
  source     text check (source in ('star', 'card')),
  created_at timestamptz not null default now()
);
create index if not exists link_clicks_slug_time on public.link_clicks (slug, created_at desc);
alter table public.link_clicks enable row level security;
drop policy if exists "anyone clicks" on public.link_clicks;
create policy "anyone clicks" on public.link_clicks for insert with check (true);
drop policy if exists "owner reads clicks" on public.link_clicks;
create policy "owner reads clicks" on public.link_clicks for select
  using (exists (select 1 from public.pods p where p.slug = link_clicks.slug and p.user_id = auth.uid()));

-- 4. 검토 상태 (본인은 바꿀 수 없다. 관리자와 트리거만 바꾼다)
create table if not exists public.star_review (
  slug        text primary key references public.pods(slug) on delete cascade,
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reason      text,
  flags       text[] not null default '{}',
  photo_hash  text,
  approved_once boolean not null default false,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);
alter table public.star_review enable row level security;
drop policy if exists "owner reads review" on public.star_review;
create policy "owner reads review" on public.star_review for select
  using (exists (select 1 from public.pods p where p.slug = star_review.slug and p.user_id = auth.uid()) or public.is_admin());
drop policy if exists "admin writes review" on public.star_review;
create policy "admin writes review" on public.star_review for update using (public.is_admin()) with check (public.is_admin());

-- 1차 자동 거르기 (규칙). 걸린 것은 flags 에 남아 관리자 화면 맨 위로 온다.
create or replace function public.star_rule_flags(c jsonb) returns text[]
language plpgsql immutable as $$
declare
  t text := lower(coalesce(c->>'name', '') || ' ' || coalesce(c->>'role', '') || ' ' || coalesce(c->>'company', '') || ' ' || coalesce(c->'star'->>'tag', ''));
  links text := lower(coalesce(c->'primaryAction'->>'url', '') || ' ' || coalesce((c->'socials')::text, '') || ' ' || coalesce((c->'links')::text, ''));
  f text[] := '{}';
begin
  if t ~ '(시발|씨발|병신|섹스|야동|성인|조건만남|토토|카지노|바카라|도박|마약|fuck|porn|xxx|casino|escort|nude|ficken|hure)' then f := array_append(f, 'words'); end if;
  if links ~ '(bit\.ly|tinyurl|t\.co/|goo\.gl|is\.gd|cutt\.ly|porn|xxx|casino|toto|bet365|onlyfans)' then f := array_append(f, 'links'); end if;
  if links ~ 'http://' then f := array_append(f, 'http'); end if;
  if coalesce(c->>'name', '') = '' then f := array_append(f, 'noname'); end if;
  if coalesce(c->'front'->'bg'->>'src', '') ~ '^/assets/' or coalesce(c->'front'->'bg'->>'type', '') <> 'image' then f := array_append(f, 'nophoto'); end if;
  return f;
end $$;

-- text[] 에서 몇 개를 뺀 나머지
create or replace function public.array_minus(a text[], b text[]) returns text[]
language sql immutable as $$ select coalesce(array_agg(x), '{}') from unnest(a) x where not x = any(b) $$;

-- pods 가 저장될 때: 스타를 켜면 검토 대기로, 사진이 바뀌면 다시 검토, 끄면 그대로 둔다(피드에서 빠짐)
create or replace function public.star_on_pod_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  c jsonb := new.components_json->'card';
  on_now boolean := false;
  h text := md5(coalesce(c->'front'->'bg'->>'src', ''));
  r public.star_review;
  today_count int;
begin
  on_now := lower(coalesce(c->'star'->>'on', '')) in ('true', 't', '1');
  if not on_now then return new; end if;
  select * into r from public.star_review where slug = new.slug;
  if not found then
    select count(*) into today_count from public.star_review sr join public.pods p on p.slug = sr.slug
      where p.user_id = new.user_id and sr.submitted_at > now() - interval '1 day';
    insert into public.star_review (slug, status, flags, photo_hash, reason)
      values (new.slug, 'pending', public.star_rule_flags(c) || case when today_count >= 3 then array['daily'] else '{}'::text[] end, h,
              case when today_count >= 3 then 'daily limit' end);
  elsif r.photo_hash is distinct from h then
    -- 사진이 바뀌면 다시 검토 (한 번 승인된 사람도)
    update public.star_review set status = 'pending', flags = public.star_rule_flags(c), photo_hash = h, submitted_at = now(), reason = null
      where slug = new.slug;
  elsif r.status = 'approved' then
    -- 사진은 그대로, 글자만 바뀜: 신뢰 사용자는 바로 반영하되 금지어가 생기면 다시 검토
    if coalesce(array_length(public.array_minus(public.star_rule_flags(c), array['nophoto']), 1), 0) > 0 then
      update public.star_review set status = 'pending', flags = public.star_rule_flags(c), submitted_at = now() where slug = new.slug;
    end if;
  elsif r.status = 'rejected' then
    update public.star_review set status = 'pending', flags = public.star_rule_flags(c), submitted_at = now(), reason = null where slug = new.slug;
  end if;
  return new;
exception when others then
  -- 스타 처리에 문제가 생겨도 카드 저장은 절대 막지 않는다
  raise warning 'star_on_pod_change: %', sqlerrm;
  return new;
end $$;
drop trigger if exists star_on_pod_change on public.pods;
create trigger star_on_pod_change after insert or update of components_json on public.pods
  for each row execute function public.star_on_pod_change();

-- 5. 신고 (3건이면 자동으로 피드에서 내림)
create table if not exists public.star_reports (
  id         bigint generated always as identity primary key,
  slug       text not null references public.pods(slug) on delete cascade,
  reason     text not null check (reason in ('photo', 'impersonation', 'spam')),
  device_id  text check (length(device_id) between 8 and 64),
  created_at timestamptz not null default now(),
  unique (slug, device_id)
);
alter table public.star_reports enable row level security;
drop policy if exists "anyone reports" on public.star_reports;
create policy "anyone reports" on public.star_reports for insert with check (true);
drop policy if exists "admin reads reports" on public.star_reports;
create policy "admin reads reports" on public.star_reports for select using (public.is_admin());

create or replace function public.star_report_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.star_reports where slug = new.slug) >= 3 then
    update public.star_review set status = 'pending', flags = array_append(flags, 'reported'), reason = 'reported'
      where slug = new.slug and status = 'approved';
  end if;
  return new;
end $$;
drop trigger if exists star_report_guard on public.star_reports;
create trigger star_report_guard after insert on public.star_reports
  for each row execute function public.star_report_guard();

-- 6. 피드 (승인되고 켜져 있는 카드만, 공개 항목만)
create or replace function public.star_public_card(c jsonb) returns jsonb
language sql immutable as $$
  select jsonb_build_object(
    'name',  c->>'name',
    'role',  c->>'role',
    'tag',   c->'star'->>'tag',
    'front', jsonb_build_object('bg', c->'front'->'bg', 'frame', c->'front'->>'frame', 'frameTone', c->'front'->>'frameTone')
  );
$$;

create or replace function public.star_feed(p_tag text default null, p_sort text default 'hot', p_limit int default 40, p_offset int default 0)
returns table (slug text, card jsonb, likes bigint, likes_week bigint, approved_at timestamptz)
language sql stable security definer set search_path = public as $$
  with base as (
    select p.slug, p.components_json->'card' as c, r.reviewed_at
    from public.pods p
    join public.star_review r on r.slug = p.slug and r.status = 'approved'
    where lower(coalesce(p.components_json->'card'->'star'->>'on', '')) in ('true', 't', '1')
      and (p_tag is null or p.components_json->'card'->'star'->>'tag' = p_tag)
  ), scored as (
    select b.slug, public.star_public_card(b.c) as card, b.reviewed_at,
      (select count(*) from public.star_likes l where l.slug = b.slug) as likes,
      (select count(*) from public.star_likes l where l.slug = b.slug and l.created_at > now() - interval '7 days') as likes_week
    from base b
  )
  select slug, card, likes, likes_week, reviewed_at from scored
  order by case when p_sort = 'new' then extract(epoch from reviewed_at) else likes_week * 1000000 + extract(epoch from reviewed_at) / 100000 end desc
  limit least(greatest(p_limit, 1), 60) offset greatest(p_offset, 0);
$$;

-- 이번 주 스타 (지난 7일 좋아요 상위)
create or replace function public.star_weekly(p_limit int default 3)
returns table (slug text, card jsonb, likes_week bigint)
language sql stable security definer set search_path = public as $$
  select slug, card, likes_week from public.star_feed(null, 'hot', least(p_limit, 10), 0) where likes_week > 0;
$$;

-- 7. 내 숫자 (대시보드)
create or replace function public.my_star_stats(p_slug text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare ok boolean;
begin
  select exists (select 1 from public.pods where slug = p_slug and user_id = auth.uid()) into ok;
  if not ok then return null; end if;
  return jsonb_build_object(
    'likes',       (select count(*) from public.star_likes where slug = p_slug),
    'likes_week',  (select count(*) from public.star_likes where slug = p_slug and created_at > now() - interval '7 days'),
    'clicks',      (select count(*) from public.link_clicks where slug = p_slug),
    'clicks_week', (select count(*) from public.link_clicks where slug = p_slug and created_at > now() - interval '7 days'),
    'review',      (select jsonb_build_object('status', status, 'reason', reason) from public.star_review where slug = p_slug)
  );
end $$;

-- 8. 관리자 검토 화면용
create or replace function public.admin_star_queue()
returns table (slug text, card jsonb, status text, flags text[], reason text, reports bigint, submitted_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not admin'; end if;
  return query
    select r.slug, p.components_json->'card', r.status, r.flags, r.reason,
      (select count(*) from public.star_reports s where s.slug = r.slug), r.submitted_at
    from public.star_review r join public.pods p on p.slug = r.slug
    where r.status = 'pending'
    order by (array_length(r.flags, 1) is not null) desc, r.submitted_at asc;
end $$;

create or replace function public.admin_star_decide(p_slug text, p_status text, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not admin'; end if;
  if p_status not in ('approved', 'rejected') then raise exception 'bad status'; end if;
  update public.star_review
    set status = p_status, reason = p_reason, reviewed_at = now(), reviewed_by = auth.uid(),
        approved_once = approved_once or p_status = 'approved',
        flags = case when p_status = 'approved' then '{}' else flags end
    where slug = p_slug;
  if p_status = 'approved' then delete from public.star_reports where slug = p_slug; end if;
end $$;

-- 실행 권한
grant execute on function public.get_private_card(text, text) to anon, authenticated;
grant execute on function public.star_like_count(text) to anon, authenticated;
grant execute on function public.star_liked(text, text) to anon, authenticated;
grant execute on function public.star_feed(text, text, int, int) to anon, authenticated;
grant execute on function public.star_weekly(int) to anon, authenticated;
grant execute on function public.my_star_stats(text) to authenticated;
grant execute on function public.admin_star_queue() to authenticated;
grant execute on function public.admin_star_decide(text, text, text) to authenticated;
grant execute on function public.is_admin() to authenticated;
revoke execute on function public.star_rule_flags(jsonb) from anon, authenticated;

-- 관리자 등록: 아래 줄의 이메일을 본인 Google 계정으로 바꿔 한 번 실행
-- insert into public.admins (user_id) select id from auth.users where email = 'YOUR_EMAIL@gmail.com' on conflict do nothing;
