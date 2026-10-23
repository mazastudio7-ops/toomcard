-- 이젠스타 신청이 들어오면 관리자 디스코드로 알린다. 여러 번 실행해도 안전하다.
--
-- 1) 디스코드 웹훅 주소는 비밀이라 이 파일에 쓰지 않는다. 아래 한 줄을 SQL 편집기에서 직접 실행해 넣는다 (주소는 채팅에 보내지 마세요):
--      insert into public.tc_secrets (k, v) values ('discord_star', '여기에_웹훅_주소') on conflict (k) do update set v = excluded.v;
-- 2) 알림을 끄려면:  delete from public.tc_secrets where k = 'discord_star';

create extension if not exists pg_net with schema extensions;

create table if not exists public.tc_secrets (
  k text primary key,
  v text not null
);
alter table public.tc_secrets enable row level security;   -- 정책 없음: API 로는 아무도 읽지 못한다

create or replace function public.star_notify_discord() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_url text;
  c jsonb;
  msg text;
begin
  if new.status <> 'pending' then return new; end if;
  select v into v_url from public.tc_secrets where k = 'discord_star';
  if v_url is null or v_url = '' then return new; end if;
  select p.components_json -> 'card' into c from public.pods p where p.slug = new.slug;
  msg := '**이젠스타 신청** ' || coalesce(c ->> 'name', new.slug) || ' (' || new.slug || ')'
    || E'\n분야: ' || coalesce(c -> 'star' ->> 'tag', '-')
    || case when coalesce(array_length(new.flags, 1), 0) > 0 then E'\n자동 점검: ' || array_to_string(new.flags, ', ') else '' end
    || E'\n카드: https://toomcard.com/' || new.slug
    || E'\n승인하러 가기: https://toomcard.com/admin/star';
  perform net.http_post(url := v_url, body := jsonb_build_object('content', msg));
  return new;
exception when others then
  raise warning 'star_notify_discord: %', sqlerrm;   -- 알림이 실패해도 신청 저장은 막지 않는다
  return new;
end $$;

drop trigger if exists star_notify_discord on public.star_review;
create trigger star_notify_discord after insert or update of status on public.star_review
  for each row when (new.status = 'pending')
  execute function public.star_notify_discord();
