-- ─────────────────────────────────────────────────────────────
-- TOOMCARD 전용 Supabase 프로젝트: 기본 표
-- (예전에는 SETUPOD 프로젝트를 같이 썼다. 사이트 코드가 쓰는 표만 옮긴다.)
--
-- 적용 순서: 이 파일 → 20261023_star.sql → supabase/seed/20261023_import_old.sql
-- SQL Editor 에 붙여넣고 Run. 여러 번 실행해도 안전하다.
-- ─────────────────────────────────────────────────────────────

-- 1. 프로필 (로그인 사용자 1명당 1줄)
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  slug       text,
  name       text,
  handle     text,
  bio        text,
  theme      text default 'violet',
  tier       text default 'FREE',
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles public read" on public.profiles;
create policy "profiles public read" on public.profiles for select using (true);
drop policy if exists "profiles owner write" on public.profiles;
create policy "profiles owner write" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles owner update" on public.profiles;
create policy "profiles owner update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- 2. 카드 (pods) — 카드 페이지가 누구에게나 보여야 하므로 읽기는 공개.
--    전화·이메일 같은 비공개 항목은 스타 단계에서 tc_pod_private 로 분리한다.
create table if not exists public.pods (
  id              bigint generated always as identity,
  user_id         uuid references auth.users(id) on delete set null,
  slug            text not null unique,
  components_json jsonb not null default '{}'::jsonb,
  owner_email     text,                 -- 예전 프로젝트에서 옮긴 카드: 같은 이메일로 처음 로그인하면 주인이 된다
  is_team_member  boolean default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (id)
);
create index if not exists pods_user on public.pods (user_id);
alter table public.pods enable row level security;
drop policy if exists "pods public read" on public.pods;
create policy "pods public read" on public.pods for select using (true);
drop policy if exists "pods owner insert" on public.pods;
create policy "pods owner insert" on public.pods for insert with check (auth.uid() = user_id);
drop policy if exists "pods owner update" on public.pods;
create policy "pods owner update" on public.pods for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "pods owner delete" on public.pods;
create policy "pods owner delete" on public.pods for delete using (auth.uid() = user_id);

-- 3. 조회 기록
create table if not exists public.page_views (
  id          bigint generated always as identity primary key,
  target_slug text not null,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists page_views_slug_time on public.page_views (target_slug, created_at desc);
alter table public.page_views enable row level security;
drop policy if exists "views anyone insert" on public.page_views;
create policy "views anyone insert" on public.page_views for insert with check (true);
drop policy if exists "views owner read" on public.page_views;
create policy "views owner read" on public.page_views for select
  using (exists (select 1 from public.pods p where p.slug = page_views.target_slug and p.user_id = auth.uid()));

-- 4. 방문자가 남긴 연락처 (리드)
create table if not exists public.leads (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users(id) on delete set null,
  target_slug text,
  phone       text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
alter table public.leads enable row level security;
drop policy if exists "leads anyone insert" on public.leads;
create policy "leads anyone insert" on public.leads for insert with check (true);
drop policy if exists "leads owner read" on public.leads;
create policy "leads owner read" on public.leads for select using (auth.uid() = user_id);

-- 5. 로고 제작 주문 · 문의 (api/leads.js). 읽기는 서버(서비스 키)만.
create table if not exists public.partner_leads (
  id         bigint generated always as identity primary key,
  domain     text,
  email      text,
  phone      text,
  kakao_id   text,
  pod_id     text,
  gift_name  text,
  name       text,
  source     text,
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.partner_leads enable row level security;
drop policy if exists "partner leads anyone insert" on public.partner_leads;
create policy "partner leads anyone insert" on public.partner_leads for insert with check (true);

-- 6. 예전 프로젝트에서 옮긴 카드를 같은 이메일의 새 로그인에 연결
create or replace function public.tc_claim_pods()
returns int language plpgsql security definer set search_path = public as $$
declare n int; e text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null or e = '' then return 0; end if;
  update public.pods set user_id = auth.uid()
    where user_id is null and lower(owner_email) = e;
  get diagnostics n = row_count;
  if n > 0 then
    insert into public.profiles (id, slug, name)
      select auth.uid(), p.slug, p.components_json->'card'->>'name' from public.pods p
      where p.user_id = auth.uid() order by p.updated_at desc limit 1
      on conflict (id) do nothing;
  end if;
  return n;
end $$;
grant execute on function public.tc_claim_pods() to authenticated;
