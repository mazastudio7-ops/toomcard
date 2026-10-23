-- 새 문의 앱 알림 (Web Push). 이메일 없이 휴대폰/PC 알림으로 바로 알린다. 여러 번 실행해도 안전하다.
--
-- 먼저 Vercel 환경변수 3개가 필요하다 (키 값은 채팅에 보내지 말고 Vercel 화면에 직접 입력):
--   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY  ← 터미널에서  npx web-push generate-vapid-keys  로 만든다
--   PUSH_SECRET                           ← 아무 긴 문자열 (아래 push_secret 과 같은 값)
-- 그다음 이 파일을 실행하고, 아래 두 줄을 SQL 편집기에서 직접 실행한다:
--   insert into public.tc_secrets (k, v) values ('push_url', 'https://toomcard.com/api/push') on conflict (k) do update set v = excluded.v;
--   insert into public.tc_secrets (k, v) values ('push_secret', '여기에_PUSH_SECRET과_같은_값') on conflict (k) do update set v = excluded.v;
-- 끄려면:  delete from public.tc_secrets where k = 'push_url';

create extension if not exists pg_net with schema extensions;
create table if not exists public.tc_secrets (k text primary key, v text not null);
alter table public.tc_secrets enable row level security;

-- 알림을 받는 기기들 (본인 것만 읽고 쓴다)
create table if not exists public.tc_push_subs (
  endpoint   text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  sub        jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.tc_push_subs enable row level security;
drop policy if exists "push subs own" on public.tc_push_subs;
create policy "push subs own" on public.tc_push_subs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 너무 자주 울리지 않게: 한 사람에게 1분에 한 번만 보내고, 그 사이 들어온 건수는 묶어서 "새 문의 N건"으로 보낸다
create table if not exists public.tc_push_state (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  last_sent timestamptz,
  pending   int not null default 0
);
alter table public.tc_push_state enable row level security;

create or replace function public.lead_push() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_url text; v_secret text; v_uid uuid := new.user_id; v_last timestamptz; v_pending int; v_subs jsonb;
begin
  select v into v_url from public.tc_secrets where k = 'push_url';
  select v into v_secret from public.tc_secrets where k = 'push_secret';
  if coalesce(v_url, '') = '' or coalesce(v_secret, '') = '' then return new; end if;
  if v_uid is null then
    select u.id into v_uid from public.tc_pod_claims c join auth.users u on lower(u.email) = lower(c.owner_email) where c.slug = new.target_slug limit 1;
  end if;
  if v_uid is null then return new; end if;

  insert into public.tc_push_state (user_id, pending) values (v_uid, 1)
    on conflict (user_id) do update set pending = public.tc_push_state.pending + 1
    returning last_sent, pending into v_last, v_pending;

  if v_last is null or now() - v_last >= interval '60 seconds' then
    select jsonb_agg(sub) into v_subs from public.tc_push_subs where user_id = v_uid;
    update public.tc_push_state set last_sent = now(), pending = 0 where user_id = v_uid;
    if v_subs is not null then
      perform net.http_post(url := v_url,
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
        body := jsonb_build_object('subs', v_subs, 'count', v_pending));
    end if;
  end if;
  return new;
exception when others then
  raise warning 'lead_push: %', sqlerrm;
  return new;
end $$;

drop trigger if exists lead_push on public.leads;
create trigger lead_push after insert on public.leads for each row execute function public.lead_push();
